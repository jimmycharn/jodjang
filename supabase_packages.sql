-- ลบตารางเก่า (ถ้ามี)
DROP TABLE IF EXISTS user_subscriptions;
DROP TABLE IF EXISTS packages;

-- ตาราง packages (แพ็คเกจ)
CREATE TABLE packages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  price NUMERIC NOT NULL DEFAULT 0,
  duration_days INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  features JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  user_visible BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ตาราง user_subscriptions (การสมัครแพ็คเกจ)
CREATE TABLE user_subscriptions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL REFERENCES users(id),
  package_id TEXT NOT NULL REFERENCES packages(id),
  status TEXT NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  payment_amount NUMERIC DEFAULT 0,
  payment_method TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- เพิ่ม 3 แพ็คเกจเริ่มต้น
INSERT INTO packages (id, name, slug, price, duration_days, description, features, sort_order) VALUES
('pkg_free', 'ฟรี', 'free', 0, 0, 'แพ็คเกจเริ่มต้น', '{"voice": false, "max_wallets": 1, "wallet_edit": false, "csv_export": false, "transfer": false}', 1),
('pkg_monthly', 'รายเดือน', 'monthly', 60, 30, 'ใช้งานเต็มรูปแบบ 30 วัน', '{"voice": true, "max_wallets": 999, "wallet_edit": true, "csv_export": true, "transfer": true}', 2),
('pkg_yearly', 'รายปี', 'yearly', 365, 365, 'ใช้งานเต็มรูปแบบ 365 วัน ประหยัดกว่า!', '{"voice": true, "max_wallets": 999, "wallet_edit": true, "csv_export": true, "transfer": true}', 3);
