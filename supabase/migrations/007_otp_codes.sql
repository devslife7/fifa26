ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;

-- Backfill emails from Supabase auth users
UPDATE profiles p SET email = u.email FROM auth.users u WHERE p.id = u.id;

CREATE TABLE otp_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  display_name TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_otp_codes_email_code ON otp_codes (email, code) WHERE used = FALSE;
