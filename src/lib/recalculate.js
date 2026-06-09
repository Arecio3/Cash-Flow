import { supabase } from './supabase';

/**
 * Checks if a balance recalculation has been run. If not, recalculates
 * all credit card balances from transaction history and updates Supabase.
 */
export async function checkAndRecalculateBalances(userId, creditCards, addToast) {
  if (!userId || !creditCards || creditCards.length === 0) return;

  const flag = localStorage.getItem('calculationMigrated');
  if (flag) return;

  // Set flag to prevent double execution while processing
  localStorage.setItem('calculationMigrated', 'processing');

  try {
    // Fetch all transactions for this user
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId);

    if (txError) {
      localStorage.removeItem('calculationMigrated');
      throw txError;
    }

    for (const card of creditCards) {
      let balance = 0;
      
      transactions.forEach((tx) => {
        if (tx.linked_card_id === card.id && tx.type === 'expense') {
          const amount = parseFloat(tx.amount) || 0;
          if (tx.category === 'Credit Card') {
            // Logged payment: subtract from balance
            balance -= amount;
          } else {
            // CC Purchase: add to balance
            balance += amount;
          }
        }
      });

      const finalBalance = Math.max(0, balance);
      const currentVal = parseFloat(card.balance) || parseFloat(card.current_balance) || 0;

      if (finalBalance !== currentVal) {
        const { error: updateError } = await supabase
          .from('credit_cards')
          .update({ current_balance: finalBalance })
          .eq('id', card.id);

        if (updateError) {
          console.error(`Failed to update balance for card ${card.name}:`, updateError);
        }
      }
    }

    localStorage.setItem('calculationMigrated', 'true');
    addToast('Balances recalculated from transaction history');
  } catch (err) {
    console.error('Data migration recalculation failed:', err);
    localStorage.removeItem('calculationMigrated');
  }
}
export default checkAndRecalculateBalances;
