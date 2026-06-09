import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useOnlineStatus } from './useOnlineStatus';

const mapToUI = (dbBill) => ({
  id: dbBill.id,
  name: dbBill.name,
  amount: parseFloat(dbBill.amount) || 0,
  category: dbBill.category,
  cardId: dbBill.assigned_card_id,
  date: dbBill.due_date,
  recurring: dbBill.is_recurring,
  paid: dbBill.is_paid
});

const mapToDB = (uiBill, userId) => {
  const dbObj = {};
  if (uiBill.name !== undefined) dbObj.name = uiBill.name;
  if (uiBill.amount !== undefined) dbObj.amount = parseFloat(uiBill.amount) || 0;
  if (uiBill.category !== undefined) dbObj.category = uiBill.category;
  if (uiBill.cardId !== undefined) dbObj.assigned_card_id = uiBill.cardId || null;
  if (uiBill.date !== undefined) dbObj.due_date = uiBill.date;
  if (uiBill.recurring !== undefined) dbObj.is_recurring = uiBill.recurring;
  if (uiBill.paid !== undefined) dbObj.is_paid = uiBill.paid;
  if (userId) dbObj.user_id = userId;
  return dbObj;
};

export function useBills(userId, onStatusChange) {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isOnline } = useOnlineStatus();

  useEffect(() => {
    if (!userId) {
      setTimeout(() => {
        setBills([]);
      }, 0);
      return;
    }

    let channel = null;

    const fetchBills = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: dbError } = await supabase
          .from('bills')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: true });

        if (dbError) throw dbError;
        setBills((data || []).map(mapToUI));
      } catch (err) {
        console.error('Error fetching bills:', err);
        setError(err.message || 'Error fetching bills.');
      } finally {
        setLoading(false);
      }
    };

    fetchBills();

    if (isOnline) {
      channel = supabase
        .channel(`realtime:bills:${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'bills',
            filter: `user_id=eq.${userId}`
          },
          (payload) => {
            const { eventType, new: newRow, old: oldRow } = payload;
            if (eventType === 'INSERT') {
              const uiBill = mapToUI(newRow);
              setBills((prev) => {
                if (prev.some((b) => b.id === uiBill.id)) return prev;
                return [...prev, uiBill];
              });
            } else if (eventType === 'UPDATE') {
              const uiBill = mapToUI(newRow);
              setBills((prev) =>
                prev.map((b) => (b.id === uiBill.id ? uiBill : b))
              );
            } else if (eventType === 'DELETE') {
              setBills((prev) => prev.filter((b) => b.id !== oldRow.id));
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

  const add = async (newBill) => {
    if (!userId) return null;
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const optimisticItem = { ...newBill, id: tempId };

    setBills((prev) => [...prev, optimisticItem]);

    try {
      const dbPayload = mapToDB(newBill, userId);
      const { data, error: dbError } = await supabase
        .from('bills')
        .insert(dbPayload)
        .select()
        .single();

      if (dbError) throw dbError;

      setBills((prev) =>
        prev.map((b) => (b.id === tempId ? mapToUI(data) : b))
      );
      return mapToUI(data);
    } catch (err) {
      console.error('Error adding bill:', err);
      setBills((prev) => prev.filter((b) => b.id !== tempId));
      throw err;
    }
  };

  const update = async (id, updates) => {
    if (!userId) return;
    const previousState = [...bills];

    setBills((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...updates } : b))
    );

    try {
      const dbPayload = mapToDB(updates);
      const { error: dbError } = await supabase
        .from('bills')
        .update(dbPayload)
        .eq('id', id);

      if (dbError) throw dbError;
    } catch (err) {
      console.error('Error updating bill:', err);
      setBills(previousState);
      throw err;
    }
  };

  const remove = async (id) => {
    if (!userId) return;
    const previousState = [...bills];

    setBills((prev) => prev.filter((b) => b.id !== id));

    try {
      const { error: dbError } = await supabase
        .from('bills')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;
    } catch (err) {
      console.error('Error deleting bill:', err);
      setBills(previousState);
      throw err;
    }
  };

  return { bills, setBills, loading, error, add, update, remove };
}

export default useBills;
