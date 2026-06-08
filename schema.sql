-- Supabase Database Schema for Cash Flow
-- Copy and paste this script into the Supabase SQL editor to initialize tables and Row Level Security policies.

-- Disable foreign key checks during dropped tables if needed
-- DROP TABLE IF EXISTS transactions;
-- DROP TABLE IF EXISTS bills;
-- DROP TABLE IF EXISTS credit_cards;
-- DROP TABLE IF EXISTS investment_goals;

-- 1. CREDIT CARDS TABLE
CREATE TABLE credit_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    issuer TEXT NOT NULL,
    credit_limit NUMERIC NOT NULL CHECK (credit_limit >= 0),
    current_balance NUMERIC NOT NULL DEFAULT 0 CHECK (current_balance >= 0),
    statement_due_date TEXT NOT NULL, -- e.g., "15th"
    apr NUMERIC DEFAULT 0,
    cashback_rate NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. BILLS TABLE
CREATE TABLE bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    category TEXT NOT NULL,
    assigned_card_id UUID REFERENCES credit_cards(id) ON DELETE SET NULL,
    due_date DATE NOT NULL,
    is_recurring BOOLEAN DEFAULT true NOT NULL,
    is_paid BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. TRANSACTIONS TABLE
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    category TEXT NOT NULL,
    date DATE NOT NULL,
    linked_card_id UUID REFERENCES credit_cards(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 4. INVESTMENT GOALS TABLE
CREATE TABLE investment_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    target_amount NUMERIC NOT NULL CHECK (target_amount >= 0),
    target_date DATE,
    monthly_target NUMERIC NOT NULL CHECK (monthly_target >= 0),
    current_amount NUMERIC DEFAULT 0 CHECK (current_amount >= 0),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_goals ENABLE ROW LEVEL SECURITY;

-- Policies for credit_cards
CREATE POLICY "Users can insert their own credit cards" 
    ON credit_cards FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own credit cards" 
    ON credit_cards FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own credit cards" 
    ON credit_cards FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own credit cards" 
    ON credit_cards FOR DELETE USING (auth.uid() = user_id);

-- Policies for bills
CREATE POLICY "Users can insert their own bills" 
    ON bills FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own bills" 
    ON bills FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own bills" 
    ON bills FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bills" 
    ON bills FOR DELETE USING (auth.uid() = user_id);

-- Policies for transactions
CREATE POLICY "Users can insert their own transactions" 
    ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own transactions" 
    ON transactions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions" 
    ON transactions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions" 
    ON transactions FOR DELETE USING (auth.uid() = user_id);

-- Policies for investment_goals
CREATE POLICY "Users can insert their own investment goals" 
    ON investment_goals FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own investment goals" 
    ON investment_goals FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own investment goals" 
    ON investment_goals FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own investment goals" 
    ON investment_goals FOR DELETE USING (auth.uid() = user_id);

-- Relational indexes to optimize performance for user_id filters
CREATE INDEX idx_credit_cards_user_id ON credit_cards(user_id);
CREATE INDEX idx_bills_user_id ON bills(user_id);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_investment_goals_user_id ON investment_goals(user_id);
