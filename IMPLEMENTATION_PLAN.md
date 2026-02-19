# Money Tracker - Supabase Migration

แอป Money Tracker ที่ย้ายจาก Google Apps Script มาใช้ Supabase เป็น database

## 🚀 Quick Start

### 1. ติดตั้ง Dependencies
```bash
npm install
```

### 2. สร้างตารางใน Supabase
ไปที่ Supabase Dashboard > SQL Editor แล้วรัน SQL ด้านล่าง

### 3. รันแอป
```bash
npm run dev
```

---

## 📊 Database Schema (Supabase SQL)

รัน SQL นี้ใน Supabase SQL Editor:

```sql
-- 1. Users Table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_logged_in BOOLEAN DEFAULT FALSE
);

-- 2. Transactions Table
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

-- 3. Categories Table
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  budget DECIMAL(12,2) DEFAULT 0,
  color TEXT,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Wallets Table
CREATE TABLE wallets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'other',
  initial_balance DECIMAL(12,2) DEFAULT 0,
  color TEXT,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE
);

-- 5. Savings Goals Table
CREATE TABLE savings_goals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  target_amount DECIMAL(12,2) DEFAULT 0,
  current_amount DECIMAL(12,2) DEFAULT 0,
  color TEXT,
  icon TEXT DEFAULT 'Star',
  user_id UUID REFERENCES users(id) ON DELETE CASCADE
);

-- 6. Settings Table
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  value TEXT,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(key, user_id)
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users (allow insert for signup)
CREATE POLICY "Allow public signup" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (true);

-- RLS Policies for transactions
CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT USING (true);
CREATE POLICY "Users can insert own transactions" ON transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own transactions" ON transactions FOR UPDATE USING (true);
CREATE POLICY "Users can delete own transactions" ON transactions FOR DELETE USING (true);

-- RLS Policies for categories
CREATE POLICY "Users can view own categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Users can insert own categories" ON categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own categories" ON categories FOR UPDATE USING (true);
CREATE POLICY "Users can delete own categories" ON categories FOR DELETE USING (true);

-- RLS Policies for wallets
CREATE POLICY "Users can view own wallets" ON wallets FOR SELECT USING (true);
CREATE POLICY "Users can insert own wallets" ON wallets FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own wallets" ON wallets FOR UPDATE USING (true);
CREATE POLICY "Users can delete own wallets" ON wallets FOR DELETE USING (true);

-- RLS Policies for savings_goals
CREATE POLICY "Users can view own goals" ON savings_goals FOR SELECT USING (true);
CREATE POLICY "Users can insert own goals" ON savings_goals FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own goals" ON savings_goals FOR UPDATE USING (true);
CREATE POLICY "Users can delete own goals" ON savings_goals FOR DELETE USING (true);

-- RLS Policies for settings
CREATE POLICY "Users can view own settings" ON settings FOR SELECT USING (true);
CREATE POLICY "Users can insert own settings" ON settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own settings" ON settings FOR UPDATE USING (true);
CREATE POLICY "Users can delete own settings" ON settings FOR DELETE USING (true);

-- Create indexes for better performance
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_categories_user_id ON categories(user_id);
CREATE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE INDEX idx_savings_goals_user_id ON savings_goals(user_id);
```

---

## 📁 Project Structure

```
src/
├── main.jsx                    # Entry point
├── App.jsx                     # Main app component
├── lib/
│   ├── supabase.js            # Supabase client
│   └── utils.js               # Utility functions
├── context/
│   ├── AuthContext.jsx        # Authentication state
│   ├── ThemeContext.jsx       # Theme (dark/light)
│   └── DataContext.jsx        # Data management
├── services/
│   └── geminiService.js       # Gemini AI integration
├── components/
│   ├── ui/                    # Reusable components
│   ├── auth/                  # Login/Signup
│   ├── dashboard/             # Dashboard screen
│   ├── transactions/          # Add/History screens
│   ├── savings/               # Savings goals
│   ├── settings/              # Settings & managers
│   └── profile/               # User profile
└── styles/
    └── index.css              # Tailwind + custom CSS
```

---

## ✨ Features

- ✅ Login/Signup with password hashing
- ✅ Dashboard with charts (Donut, Trend)
- ✅ Add/Edit/Delete transactions
- ✅ AI-powered input (Gemini)
- ✅ Voice input support
- ✅ Category management with budgets
- ✅ Multiple wallets
- ✅ Transfer between wallets
- ✅ Savings goals tracking
- ✅ CSV export
- ✅ Dark/Light theme

---

## 🔧 Environment Variables

ไฟล์ `.env` มีค่าต่อไปนี้:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `VITE_GEMINI_API_KEY` - Google Gemini API key
