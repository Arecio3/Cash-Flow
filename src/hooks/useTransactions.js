import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useOnlineStatus } from './useOnlineStatus';

const mapToUI = (dbTx) => ({
  id: dbTx.id,
  description: dbTx.description,
  amount: parseFloat(dbTx.amount) || 0,
  type: dbTx.type,
  category: dbTx.category,
  date: dbTx.date,
  cardId: dbTx.linked_card_id
});

const mapToDB = (uiTx, userId) => {
  const dbObj = {};
  if (uiTx.description !== undefined) dbObj.description = uiTx.description;
  if (uiTx.amount !== undefined) dbObj.amount = parseFloat(uiTx.amount) || 0;
  if (uiTx.type !== undefined) dbObj.type = uiTx.type;
  if (uiTx.category !== undefined) dbObj.category = uiTx.category;
  if (uiTx.date !== undefined) dbObj.date = uiTx.date;
  if (uiTx.cardId !== undefined) dbObj.linked_card_id = uiTx.cardId || null;
  if (userId) dbObj.user_id = userId;
  return dbObj;
};

export function useTransactions(userId, onStatusChange) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isOnline } = useOnlineStatus();

  useEffect(() => {
    if (!userId) {
      setTimeout(() => {
        setTransactions([]);
      }, 0);
      return;
    }

    let channel = null;

    const fetchTransactions = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: dbError } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (dbError) throw dbError;
        setTransactions((data || []).map(mapToUI));
      } catch (err) {
        console.error('Error fetching transactions:', err);
        setError(err.message || 'Error fetching transactions.');
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();

    if (isOnline) {
      channel = supabase
        .channel(`realtime:transactions:${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'transactions',
            filter: `user_id=eq.${userId}`
          },
          (payload) => {
            const { eventType, new: newRow, old: oldRow } = payload;
            if (eventType === 'INSERT') {
              const uiTx = mapToUI(newRow);
              setTransactions((prev) => {
                if (prev.some((t) => t.id === uiTx.id)) return prev;
                return [uiTx, ...prev];
              });
            } else if (eventType === 'UPDATE') {
              const uiTx = mapToUI(newRow);
              setTransactions((prev) =>
                prev.map((t) => (t.id === uiTx.id ? uiTx : t))
              );
            } else if (eventType === 'DELETE') {
              setTransactions((prev) => prev.filter((t) => t.id !== oldRow.id));
            }
          }
        )
        .subscribe((status) => {
          if (onStatusChange) {
            onStatusChange(status === 'SUBSCRIBED' ? 'connected' : 'reconnecting');
          }
        });
    } else {
      if (onStatusChange) {
        onStatusChange('reconnecting');
      }
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [userId, isOnline, onStatusChange]);

  const add = async (newTx) => {
    if (!userId) return null;
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const optimisticItem = { ...newTx, id: tempId };

    setTransactions((prev) => [optimisticItem, ...prev]);

    try {
      const dbPayload = mapToDB(newTx, userId);
      const { data, error: dbError } = await supabase
        .from('transactions')
        .insert(dbPayload)
        .select()
        .single();

      if (dbError) throw dbError;

      setTransactions((prev) =>
        prev.map((t) => (t.id === tempId ? mapToUI(data) : t))
      );
      return mapToUI(data);
    } catch (err) {
      console.error('Error adding transaction:', err);
      setTransactions((prev) => prev.filter((t) => t.id !== tempId));
      throw err;
    }
  };

  const update = async (id, updates) => {
    if (!userId) return;
    const previousState = [...transactions];

    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );

    try {
      const dbPayload = mapToDB(updates);
      const { error: dbError } = await supabase
        .from('transactions')
        .update(dbPayload)
        .eq('id', id);

      if (dbError) throw dbError;
    } catch (err) {
      console.error('Error updating transaction:', err);
      setTransactions(previousState);
      throw err;
    }
  };

  const remove = async (id) => {
    if (!userId) return;
    const previousState = [...transactions];

    setTransactions((prev) => prev.filter((t) => t.id !== id));

    try {
      const { error: dbError } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;
    } catch (err) {
      console.error('Error deleting transaction:', err);
      setTransactions(previousState);
      throw err;
    }
  };

  return { transactions, setTransactions, loading, error, add, update, remove };
}

export default useTransactions;
