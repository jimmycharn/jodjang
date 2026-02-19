-- Money Tracker - Supabase Database Schema
-- รัน SQL นี้ใน Supabase SQL Editor เพื่อสร้างตารางทั้งหมด

-- ============================================
-- 1. TABLES
-- ============================================

-- 1.1 Users Table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_logged_in BOOLEAN DEFAULT FALSE
);

-- 1.2 Transactions Table
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category_id TEXT,
  amount DECIMAL(12,2) NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  wallet_id TEXT
);

-- 1.3 Categories Table
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  budget DECIMAL(12,2) DEFAULT 0,
  color TEXT,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE
);

-- 1.4 Wallets Table
CREATE TABLE wallets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'other',
  initial_balance DECIMAL(12,2) DEFAULT 0,
  color TEXT,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE
);

-- 1.5 Savings Goals Table
CREATE TABLE savings_goals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  target_amount DECIMAL(12,2) DEFAULT 0,
  current_amount DECIMAL(12,2) DEFAULT 0,
  color TEXT,
  icon TEXT DEFAULT 'Star',
  user_id UUID REFERENCES users(id) ON DELETE CASCADE
);

-- 1.6 Settings Table
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  value TEXT,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(key, user_id)
);

-- ============================================
-- 2. ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. RLS POLICIES
-- ============================================

-- Users policies
CREATE POLICY "Allow public signup" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (true);

-- Transactions policies
CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT USING (true);
CREATE POLICY "Users can insert own transactions" ON transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own transactions" ON transactions FOR UPDATE USING (true);
CREATE POLICY "Users can delete own transactions" ON transactions FOR DELETE USING (true);

-- Categories policies
CREATE POLICY "Users can view own categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Users can insert own categories" ON categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own categories" ON categories FOR UPDATE USING (true);
CREATE POLICY "Users can delete own categories" ON categories FOR DELETE USING (true);

-- Wallets policies
CREATE POLICY "Users can view own wallets" ON wallets FOR SELECT USING (true);
CREATE POLICY "Users can insert own wallets" ON wallets FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own wallets" ON wallets FOR UPDATE USING (true);
CREATE POLICY "Users can delete own wallets" ON wallets FOR DELETE USING (true);

-- Savings Goals policies
CREATE POLICY "Users can view own goals" ON savings_goals FOR SELECT USING (true);
CREATE POLICY "Users can insert own goals" ON savings_goals FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own goals" ON savings_goals FOR UPDATE USING (true);
CREATE POLICY "Users can delete own goals" ON savings_goals FOR DELETE USING (true);

-- Settings policies
CREATE POLICY "Users can view own settings" ON settings FOR SELECT USING (true);
CREATE POLICY "Users can insert own settings" ON settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own settings" ON settings FOR UPDATE USING (true);
CREATE POLICY "Users can delete own settings" ON settings FOR DELETE USING (true);

-- ============================================
-- 4. INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_categories_user_id ON categories(user_id);
CREATE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE INDEX idx_savings_goals_user_id ON savings_goals(user_id);
