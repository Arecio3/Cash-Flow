import { useMemo } from 'react';

/**
 * Custom hook to calculate envelope budget metrics.
 * 
 * - discretionaryRemaining is calculated from cashAvailable minus unpaid cash obligations.
 * - Credit card charges do not reduce the envelope until a payoff is planned.
 * - creditExposure shows total unpaid card charges.
 */
export function useBudgets({
  transactions = [],
  creditCards = [],
  bills = [],
  investmentGoals = [],
  cashAvailable = 0,
  currentYear = new Date().getFullYear(),
  currentMonth = new Date().getMonth()
}) {
  return useMemo(() => {
    // 1. Calculate discretionary cash spent so far this month
    const spentDiscretionaryCash = transactions.reduce((sum, tx) => {
      const txDateObj = new Date(tx.date + 'T00:00:00');
      if (txDateObj.getFullYear() === currentYear && txDateObj.getMonth() === currentMonth) {
        const cardId = tx.cardId || tx.linked_card_id;
        // Discretionary cash expenses: expense type, no credit card linked, category not 'Credit Card',
        // and not a bill or investment contribution.
        if (
          tx.type === 'expense' &&
          !cardId &&
          tx.category !== 'Credit Card' &&
          !tx.description.startsWith('Paid Bill:') &&
          !tx.description.startsWith('Auto-charged Bill:') &&
          !tx.description.startsWith('Invest Contribution:')
        ) {
          return sum + (parseFloat(tx.amount) || 0);
        }
      }
      return sum;
    }, 0);

    // 2. Calculate unpaid cash bills due this month
    const unpaidCashBills = bills.reduce((sum, b) => {
      const isCardBill = b.assigned_card_id || b.cardId;
      if (!isCardBill && !b.is_paid && !b.paid) {
        return sum + (parseFloat(b.amount) || 0);
      }
      return sum;
    }, 0);

    // 3. Calculate unpaid investment goal contributions this month
    const unpaidInvestments = investmentGoals.reduce((sum, goal) => {
      const hasLoggedTx = transactions.some((tx) => {
        const txDateObj = new Date(tx.date + 'T00:00:00');
        return (
          txDateObj.getFullYear() === currentYear &&
          txDateObj.getMonth() === currentMonth &&
          tx.type === 'expense' &&
          tx.description.startsWith(`Invest Contribution: ${goal.name}`)
        );
      });

      if (!hasLoggedTx) {
        return sum + (parseFloat(goal.contribution) || 0);
      }
      return sum;
    }, 0);

    // 4. Discretionary remaining is cashAvailable minus unpaid cash obligations
    const discretionaryRemaining = Math.max(0, cashAvailable - unpaidCashBills - unpaidInvestments);

    // 5. Total discretionary allocation (remaining + spent)
    const totalBudget = discretionaryRemaining + spentDiscretionaryCash;

    // 6. Remaining percent
    const percent = totalBudget > 0 ? (discretionaryRemaining / totalBudget) * 100 : 0;

    // 7. Credit exposure is the sum of balances on all credit cards
    const creditExposure = creditCards.reduce((sum, card) => {
      const balance = parseFloat(card.balance) || parseFloat(card.current_balance) || 0;
      return sum + balance;
    }, 0);

    return {
      total: totalBudget,
      spent: spentDiscretionaryCash,
      remaining: discretionaryRemaining,
      percent,
      creditExposure
    };
  }, [transactions, creditCards, bills, investmentGoals, cashAvailable, currentYear, currentMonth]);
}

export default useBudgets;
