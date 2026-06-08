import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const mapToUI = (dbCard) => ({
  id: dbCard.id,
  name: dbCard.name,
  issuer: dbCard.issuer,
  limit: parseFloat(dbCard.credit_limit) || 0,
  balance: parseFloat(dbCard.current_balance) || 0,
  statementClose: dbCard.statement_due_date,
  cashback: parseFloat(dbCard.cashback_rate) || 0,
  apr: parseFloat(dbCard.apr) || 0
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
  if (userId) dbObj.user_id = userId;
  return dbObj;
};

export function useCreditCards(userId) {
  const [creditCards, setCreditCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) {
      setTimeout(() => {
        setCreditCards([]);
      }, 0);
      return;
    }

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
  }, [userId]);

  const add = async (newCard) => {
    if (!userId) return null;
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const optimisticItem = { ...newCard, id: tempId };

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

  return { creditCards, setCreditCards, loading, error, add, update, remove };
}

export default useCreditCards;
