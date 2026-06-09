# Patch 3 — Cash Available & Credit Card Spending Calculation Fixes

This patch corrects how available cash and credit card exposure are calculated and displayed on the dashboard.

## The Core Problem

Previously, the app calculated available cash as:
```
Income - Total Expenses = Available Cash
```
This was incorrect because credit card purchases were being treated as immediate cash leaving the bank account. A credit card purchase increases the debt owed to the bank (`current_balance`) and reduces the remaining credit limit (`available_credit`), but it does **not** draw cash from the user's bank account until a payment (card payoff) transaction is logged.

## Corrected Calculation Logic

### 1. Available Cash
Cash available now correctly tracks cash leaving the user's bank account:
```
Cash Available = Income - Cash Expenses - Planned Card Payoffs
```
- **Income**: Monthly cash deposits/inflows.
- **Cash Expenses**: Debit or cash transactions (where `linked_card_id` is null).
- **Planned Card Payoffs**: Transactions logged under the `Credit Card` category.

### 2. Available Credit (Per Card & Total)
```
Credit Available = Credit Limit - Current Balance
```
- **Total Available Credit**: Sum of all available credits across all cards.
- **Total Owed**: Sum of all `current_balance` values across all cards.

### 3. True Liquid Position
This shows the true net liquid wealth of the user (cash on hand minus short-term credit card debts):
```
True Liquid Position = Cash Available - Total Credit Owed
```

---

## Edge Cases Handled

1. **Mutually Exclusive Inflow/Outflow Aggregation**: 
   Because card payoffs are logged as cash transactions (with `linked_card_id` set to `null` in the original app), a simple filter of `linked_card_id IS NULL` for cash expenses would double-count payoffs. We separated transactions cleanly:
   - **Cash Expenses**: Non-income transactions where `linked_card_id` is `null` and category is NOT `'Credit Card'`.
   - **Planned Payoffs**: Non-income transactions where category IS `'Credit Card'`.
   - **Card Charges**: Non-income transactions where `linked_card_id` is NOT `null`.

2. **Automatic Card Balance Updates on Transaction Insert**:
   - Updates `current_balance` in Supabase when a credit card transaction is added.
   - Updates `current_balance` in Supabase when a credit card payoff is logged.
   
3. **Database Consistency on Transaction Deletion**:
   If a user deletes a credit card charge or payment transaction, the hook automatically calculates the reversed amount and updates `current_balance` in Supabase accordingly.

4. **One-time Database Recalculation on Launch**:
   On app load, if `localStorage` does not have `calculationMigrated` set, it loops through the transaction history to recalculate all credit card balances from scratch and updates Supabase. This guarantees that any past calculation errors are completely corrected.

5. **Discretionary Remaining & Unpaid Cash Obligations**:
   The envelope budget discretionary remaining now subtracts both paid discretionary cash expenses and *unpaid* cash obligations (unpaid cash bills and investment targets whose transactions haven't been logged yet) from the cash available. This ensures the user does not spend cash that is already spoken for.

6. **Warning Banners**:
   - **Low Cash**: Triggered when available cash drops below the month's total obligations (sum of cash bills due + card minimum payments).
   - **High Debt**: Triggered when total credit card debt exceeds 20% of monthly income.
   - **No Payoff Dot**: An amber dot appears on cards that have charges this month but no planned payoff logged.
