import { supabase } from './supabase';

// Checks if any previous local budgeting data exists in localStorage
export const hasLocalData = () => {
  try {
    const cards = localStorage.getItem('cashflow_credit_cards');
    const bills = localStorage.getItem('cashflow_bills');
    const transactions = localStorage.getItem('cashflow_transactions');
    const goals = localStorage.getItem('cashflow_investment_goals');

    return (
      (cards && JSON.parse(cards).length > 0) ||
      (bills && JSON.parse(bills).length > 0) ||
      (transactions && JSON.parse(transactions).length > 0) ||
      (goals && JSON.parse(goals).length > 0)
    );
  } catch (e) {
    console.error('Error checking local data:', e);
    return false;
  }
};

// Migrates all local data into Supabase, mapping local string IDs to new DB UUIDs
export const migrateLocalData = async (userId) => {
  if (!userId) throw new Error('Cannot migrate data: No authenticated user ID.');

  const localCards = JSON.parse(localStorage.getItem('cashflow_credit_cards') || '[]');
  const localBills = JSON.parse(localStorage.getItem('cashflow_bills') || '[]');
  const localTx = JSON.parse(localStorage.getItem('cashflow_transactions') || '[]');
  const localGoals = JSON.parse(localStorage.getItem('cashflow_investment_goals') || '[]');

  const cardMap = {};

  // 1. Prepare Credit Cards (Map old text IDs to new crypto UUIDs)
  const cardsToInsert = localCards.map((c) => {
    const newCardId = crypto.randomUUID();
    cardMap[c.id] = newCardId;
    return {
      id: newCardId,
      user_id: userId,
      name: c.name,
      issuer: c.issuer,
      credit_limit: parseFloat(c.limit) || 0,
      current_balance: parseFloat(c.balance) || 0,
      statement_due_date: c.statementClose || '15th',
      apr: parseFloat(c.apr) || 0,
      cashback_rate: parseFloat(c.cashback) || 0
    };
  });

  // 2. Prepare Bills (Map assigned_card_id to cardMap key-values)
  const billsToInsert = localBills.map((b) => {
    const newBillId = crypto.randomUUID();
    return {
      id: newBillId,
      user_id: userId,
      name: b.name,
      amount: parseFloat(b.amount) || 0,
      category: b.category,
      assigned_card_id: cardMap[b.cardId] || null,
      due_date: b.date,
      is_recurring: b.recurring ?? true,
      is_paid: b.paid ?? false
    };
  });

  // 3. Prepare Transactions (Map linked_card_id to cardMap key-values)
  const txToInsert = localTx.map((t) => {
    const newTxId = crypto.randomUUID();
    return {
      id: newTxId,
      user_id: userId,
      description: t.description,
      amount: parseFloat(t.amount) || 0,
      type: t.type,
      category: t.category,
      date: t.date,
      linked_card_id: cardMap[t.cardId] || null
    };
  });

  // 4. Prepare Investment Goals
  const goalsToInsert = localGoals.map((g) => {
    const newGoalId = crypto.randomUUID();
    return {
      id: newGoalId,
      user_id: userId,
      name: g.name,
      target_amount: parseFloat(g.target) || 0,
      monthly_target: parseFloat(g.contribution) || 0,
      current_amount: parseFloat(g.invested) || 0
    };
  });

  // Execute inserts sequentially to preserve relations where credit cards must exist first
  if (cardsToInsert.length > 0) {
    const { error } = await supabase.from('credit_cards').insert(cardsToInsert);
    if (error) throw error;
  }
  if (billsToInsert.length > 0) {
    const { error } = await supabase.from('bills').insert(billsToInsert);
    if (error) throw error;
  }
  if (txToInsert.length > 0) {
    const { error } = await supabase.from('transactions').insert(txToInsert);
    if (error) throw error;
  }
  if (goalsToInsert.length > 0) {
    const { error } = await supabase.from('investment_goals').insert(goalsToInsert);
    if (error) throw error;
  }

  // Clean local storage cache after successful migrations
  localStorage.removeItem('cashflow_credit_cards');
  localStorage.removeItem('cashflow_bills');
  localStorage.removeItem('cashflow_transactions');
  localStorage.removeItem('cashflow_investment_goals');
  localStorage.removeItem('cashflow_paid_bills_log');
};
export default migrateLocalData;
