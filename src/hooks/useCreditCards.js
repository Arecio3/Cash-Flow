import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useOnlineStatus } from './useOnlineStatus';

const mapToUI = (dbCard) => ({
  id: dbCard.id,
  name: dbCard.name,
  issuer: dbCard.issuer,
  limit: parseFloat(dbCard.credit_limit) || 0,
  balance: parseFloat(dbCard.current_balance) || 0,
  statementClose: dbCard.statement_due_date,
  cashback: parseFloat(dbCard.cashback_rate) || 0,
  apr: parseFloat(dbCard.apr) || 0,
  notes: dbCard.notes || ''
});

const mapToDB = (uiCard, userId) => {
  const dbObj = {};
  if (uiCard.name !== undefined) dbObj.name = uiCard.name;
  if (uiCard.issuer !== undefined) dbObj.issuer = uiCard.issuer;
  if (uiCard.limit !== undefined) dbObj.credit_limit = parseFloat(uiCard.limit) || 0;
  if (uiCard.balance !== undefined) dbObj.current_balance = parseFloat(uiCard.balance) || 0;
  if (uiCard.statementClose !== undefined) dbObj.statement_due_date = uiCard.statementClose;
  if (uiCard.cashback !== undefined) dbObj.cashback_rate = parseFloat(uiCard.cashback) || 0;
  if (uiCard.apr !== undefined) dbObj.apr = parseFloat(uiCard.apr) || 0;
  if (uiCard.notes !== undefined) dbObj.notes = uiCard.notes;
  if (userId) dbObj.user_id = userId;
  return dbObj;
};

export function useCreditCards(userId, onStatusChange) {
  const [creditCards, setCreditCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isOnline } = useOnlineStatus();

  useEffect(() => {
    if (!userId) {
      setTimeout(() => {
        setCreditCards([]);
      }, 0);
      return;
    }

    let channel = null;
    let txChannel = null;

    const fetchCards = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: dbError } = await supabase
          .from('credit_cards')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: true });

        if (dbError) throw dbError;
        setCreditCards((data || []).map(mapToUI));
      } catch (err) {
        console.error('Error fetching credit cards:', err);
        setError(err.message || 'Error fetching credit cards.');
      } finally {
        setLoading(false);
      }
    };

    fetchCards();

    // Subscribe to realtime database channel for card updates
    if (isOnline) {
      channel = supabase
        .channel(`realtime:credit_cards:${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'credit_cards',
            filter: `user_id=eq.${userId}`
          },
          (payload) => {
            const { eventType, new: newRow, old: oldRow } = payload;
            if (eventType === 'INSERT') {
              const uiCard = mapToUI(newRow);
              setCreditCards((prev) => {
                if (prev.some((c) => c.id === uiCard.id)) return prev;
                return [...prev, uiCard];
              });
            } else if (eventType === 'UPDATE') {
              const uiCard = mapToUI(newRow);
              setCreditCards((prev) =>
                prev.map((c) => (c.id === uiCard.id ? uiCard : c))
              );
            } else if (eventType === 'DELETE') {
              setCreditCards((prev) => prev.filter((c) => c.id !== oldRow.id));
            }
          }
        )
        .subscribe((status) => {
          if (onStatusChange) {
            onStatusChange(status === 'SUBSCRIBED' ? 'connected' : 'reconnecting');
          }
        });

      // Automatically update card balances in Supabase on new transactions
      txChannel = supabase
        .channel(`realtime:tx_for_card_balance:${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'transactions',
            filter: `user_id=eq.${userId}`
          },
          async (payload) => {
            const newTx = payload.new;
            if (newTx && newTx.linked_card_id) {
              const amount = parseFloat(newTx.amount) || 0;
              
              // Retrieve card
              const { data: card, error: cardErr } = await supabase
                .from('credit_cards')
                .select('current_balance, name')
                .eq('id', newTx.linked_card_id)
                .single();

              if (!cardErr && card) {
                const currentBalance = parseFloat(card.current_balance) || 0;
                let newBalance = currentBalance;
                
                if (newTx.type === 'expense') {
                  if (newTx.category === 'Credit Card') {
                    // It is a payoff: subtract payoff amount
                    newBalance = Math.max(0, currentBalance - amount);
                  } else {
                    // It is a card charge: add charge amount
                    newBalance = currentBalance + amount;
                  }
                }
                
                await supabase
                  .from('credit_cards')
                  .update({ current_balance: newBalance })
                  .eq('id', newTx.linked_card_id);
              }
            }
          }
        )
        .subscribe();
    } else {
      if (onStatusChange) {
        onStatusChange('reconnecting');
      }
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
      if (txChannel) {
        supabase.removeChannel(txChannel);
      }
    };
  }, [userId, isOnline, onStatusChange]);

  const add = async (newCard) => {
    if (!userId) return null;
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const optimisticItem = { ...newCard, id: tempId, notes: newCard.notes || '' };

    setCreditCards((prev) => [...prev, optimisticItem]);

    try {
      const dbPayload = mapToDB(newCard, userId);
      const { data, error: dbError } = await supabase
        .from('credit_cards')
        .insert(dbPayload)
        .select()
        .single();

      if (dbError) throw dbError;

      setCreditCards((prev) =>
        prev.map((c) => (c.id === tempId ? mapToUI(data) : c))
      );
      return mapToUI(data);
    } catch (err) {
      console.error('Error adding credit card:', err);
      setCreditCards((prev) => prev.filter((c) => c.id !== tempId));
      throw err;
    }
  };

  const update = async (id, updates) => {
    if (!userId) return;
    const previousState = [...creditCards];

    setCreditCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );

    try {
      const dbPayload = mapToDB(updates);
      const { error: dbError } = await supabase
        .from('credit_cards')
        .update(dbPayload)
        .eq('id', id);

      if (dbError) throw dbError;
    } catch (err) {
      console.error('Error updating credit card:', err);
      setCreditCards(previousState);
      throw err;
    }
  };

  const remove = async (id) => {
    if (!userId) return;
    const previousState = [...creditCards];

    setCreditCards((prev) => prev.filter((c) => c.id !== id));

    try {
      const { error: dbError } = await supabase
        .from('credit_cards')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;
    } catch (err) {
      console.error('Error deleting credit card:', err);
      setCreditCards(previousState);
      throw err;
    }
  };

  // --- Calculations for Exports ---
  const availableCreditPerCard = useMemo(() => {
    return creditCards.map(card => ({
      id: card.id,
      name: card.name,
      availableCredit: Math.max(0, card.limit - card.balance)
    }));
  }, [creditCards]);

  const totalAvailableCredit = useMemo(() => {
    return creditCards.reduce((sum, card) => sum + Math.max(0, card.limit - card.balance), 0);
  }, [creditCards]);

  const totalOwed = useMemo(() => {
    return creditCards.reduce((sum, card) => sum + card.balance, 0);
  }, [creditCards]);

  return {
    creditCards,
    setCreditCards,
    loading,
    error,
    add,
    update,
    remove,
    availableCreditPerCard,
    totalAvailableCredit,
    totalOwed
  };
}

export default useCreditCards;
