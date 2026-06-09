/**
 * Pure calculation functions for the budgeting app.
 * All calculations are based on filtered monthly/periodic data where applicable.
 */

/**
 * Calculates the available cash.
 * Cash expenses = transactions where type is expense AND linked_card_id is null (excluding payoffs to avoid double counting)
 * Planned card payoffs = sum of transactions tagged as credit card payments (category is 'Credit Card')
 * Returns: income - cashExpenses - plannedPayoffs
 */
export function calculateCashAvailable(income, transactions, creditCards, bills) {
  const cashExpenses = transactions.reduce((sum, tx) => {
    const cardId = tx.cardId || tx.linked_card_id;
    if (tx.type === 'expense' && !cardId && tx.category !== 'Credit Card') {
      return sum + (parseFloat(tx.amount) || 0);
    }
    return sum;
  }, 0);

  const plannedPayoffs = transactions.reduce((sum, tx) => {
    if (tx.type === 'expense' && tx.category === 'Credit Card') {
      return sum + (parseFloat(tx.amount) || 0);
    }
    return sum;
  }, 0);

  return income - cashExpenses - plannedPayoffs;
}

/**
 * Groups credit card transactions by card id and calculates monthly stats per card.
 */
export function calculateCreditExposure(transactions, creditCards, referenceDate = new Date()) {
  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth();

  const cardGroups = {};
  creditCards.forEach((card) => {
    const limit = parseFloat(card.limit) || parseFloat(card.credit_limit) || 0;
    const balance = parseFloat(card.balance) || parseFloat(card.current_balance) || 0;
    cardGroups[card.id] = {
      id: card.id,
      name: card.name,
      chargesThisMonth: 0,
      currentBalance: balance,
      creditLimit: limit,
      availableCredit: Math.max(0, limit - balance)
    };
  });

  transactions.forEach((tx) => {
    const cardId = tx.cardId || tx.linked_card_id;
    if (cardId && tx.type === 'expense') {
      const txDate = new Date(tx.date + 'T00:00:00');
      if (txDate.getFullYear() === currentYear && txDate.getMonth() === currentMonth) {
        if (cardGroups[cardId]) {
          cardGroups[cardId].chargesThisMonth += parseFloat(tx.amount) || 0;
        }
      }
    }
  });

  return Object.values(cardGroups);
}

/**
 * Sums available credit limits across all credit cards.
 */
export function calculateTotalAvailableCredit(creditCards) {
  return creditCards.reduce((sum, card) => {
    const limit = parseFloat(card.limit) || parseFloat(card.credit_limit) || 0;
    const balance = parseFloat(card.balance) || parseFloat(card.current_balance) || 0;
    return sum + Math.max(0, limit - balance);
  }, 0);
}

/**
 * Net worth impact: true liquid position (cash available minus total credit owed).
 */
export function calculateNetWorthImpact(cashAvailable, totalCreditOwed) {
  return cashAvailable - totalCreditOwed;
}

/**
 * Sums minimum payments across cards and bills.
 * Minimum payment on credit card is estimated as 2% of the balance or $25 (capped at card balance).
 */
export function calculateMonthlyObligations(creditCards, bills) {
  const minPayments = creditCards.reduce((sum, card) => {
    const balance = parseFloat(card.balance) || parseFloat(card.current_balance) || 0;
    const minPayment = balance > 0 ? Math.min(balance, Math.max(25, balance * 0.02)) : 0;
    return sum + minPayment;
  }, 0);

  const billsDue = bills.reduce((sum, bill) => {
    return sum + (parseFloat(bill.amount) || 0);
  }, 0);

  return {
    total: minPayments + billsDue,
    minPayments,
    billsDue
  };
}
