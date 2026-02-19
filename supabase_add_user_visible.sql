-- เพิ่ม column user_visible ในตาราง packages
ALTER TABLE packages ADD COLUMN IF NOT EXISTS user_visible BOOLEAN DEFAULT true;
