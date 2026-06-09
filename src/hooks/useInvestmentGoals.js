import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useOnlineStatus } from './useOnlineStatus';

const mapToUI = (dbGoal) => ({
  id: dbGoal.id,
  name: dbGoal.name,
  target: parseFloat(dbGoal.target_amount) || 0,
  contribution: parseFloat(dbGoal.monthly_target) || 0,
  invested: parseFloat(dbGoal.current_amount) || 0
});

const mapToDB = (uiGoal, userId) => {
  const dbObj = {};
  if (uiGoal.name !== undefined) dbObj.name = uiGoal.name;
  if (uiGoal.target !== undefined) dbObj.target_amount = parseFloat(uiGoal.target) || 0;
  if (uiGoal.contribution !== undefined) dbObj.monthly_target = parseFloat(uiGoal.contribution) || 0;
  if (uiGoal.invested !== undefined) dbObj.current_amount = parseFloat(uiGoal.invested) || 0;
  if (userId) dbObj.user_id = userId;
  return dbObj;
};

export function useInvestmentGoals(userId, onStatusChange) {
  const [investmentGoals, setInvestmentGoals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isOnline } = useOnlineStatus();

  useEffect(() => {
    if (!userId) {
      setTimeout(() => {
        setInvestmentGoals([]);
      }, 0);
      return;
    }

    let channel = null;

    const fetchGoals = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: dbError } = await supabase
          .from('investment_goals')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: true });

        if (dbError) throw dbError;
        setInvestmentGoals((data || []).map(mapToUI));
      } catch (err) {
        console.error('Error fetching investment goals:', err);
        setError(err.message || 'Error fetching investment goals.');
      } finally {
        setLoading(false);
      }
    };

    fetchGoals();

    if (isOnline) {
      channel = supabase
        .channel(`realtime:investment_goals:${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'investment_goals',
            filter: `user_id=eq.${userId}`
          },
          (payload) => {
            const { eventType, new: newRow, old: oldRow } = payload;
            if (eventType === 'INSERT') {
              const uiGoal = mapToUI(newRow);
              setInvestmentGoals((prev) => {
                if (prev.some((g) => g.id === uiGoal.id)) return prev;
                return [...prev, uiGoal];
              });
            } else if (eventType === 'UPDATE') {
              const uiGoal = mapToUI(newRow);
              setInvestmentGoals((prev) =>
                prev.map((g) => (g.id === uiGoal.id ? uiGoal : g))
              );
            } else if (eventType === 'DELETE') {
              setInvestmentGoals((prev) => prev.filter((g) => g.id !== oldRow.id));
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

  const add = async (newGoal) => {
    if (!userId) return null;
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const optimisticItem = { ...newGoal, id: tempId };

    setInvestmentGoals((prev) => [...prev, optimisticItem]);

    try {
      const dbPayload = mapToDB(newGoal, userId);
      const { data, error: dbError } = await supabase
        .from('investment_goals')
        .insert(dbPayload)
        .select()
        .single();

      if (dbError) throw dbError;

      setInvestmentGoals((prev) =>
        prev.map((g) => (g.id === tempId ? mapToUI(data) : g))
      );
      return mapToUI(data);
    } catch (err) {
      console.error('Error adding investment goal:', err);
      setInvestmentGoals((prev) => prev.filter((g) => g.id !== tempId));
      throw err;
    }
  };

  const update = async (id, updates) => {
    if (!userId) return;
    const previousState = [...investmentGoals];

    setInvestmentGoals((prev) =>
      prev.map((g) => (g.id === id ? { ...g, ...updates } : g))
    );

    try {
      const dbPayload = mapToDB(updates);
      const { error: dbError } = await supabase
        .from('investment_goals')
        .update(dbPayload)
        .eq('id', id);

      if (dbError) throw dbError;
    } catch (err) {
      console.error('Error updating investment goal:', err);
      setInvestmentGoals(previousState);
      throw err;
    }
  };

  const remove = async (id) => {
    if (!userId) return;
    const previousState = [...investmentGoals];

    setInvestmentGoals((prev) => prev.filter((g) => g.id !== id));

    try {
      const { error: dbError } = await supabase
        .from('investment_goals')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;
    } catch (err) {
      console.error('Error deleting investment goal:', err);
      setInvestmentGoals(previousState);
      throw err;
    }
  };

  return { investmentGoals, setInvestmentGoals, loading, error, add, update, remove };
}

export default useInvestmentGoals;
