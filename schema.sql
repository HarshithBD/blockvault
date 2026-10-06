-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  storage_used BIGINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger to create a profile automatically when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. FILES
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_type TEXT,
  size_bytes BIGINT NOT NULL,
  storage_path TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'deleted')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. FILE SHARES
CREATE TABLE file_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  access_code TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE,
  password_hash TEXT,
  download_limit INTEGER,
  downloads_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. SHARE RECIPIENTS
CREATE TABLE share_recipients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  share_id UUID NOT NULL REFERENCES file_shares(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (share_id, recipient_email)
);

-- 5. DOWNLOAD LOGS
CREATE TABLE download_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  share_id UUID REFERENCES file_shares(id) ON DELETE SET NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  status TEXT NOT NULL, -- 'success', 'blocked'
  ip_metadata TEXT
);

-- 6. ACTIVITY LOGS
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  details JSONB
);

-- 7. NOTIFICATIONS
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE download_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can only read and update their own profile
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Files: Owners can do full CRUD on their own files
CREATE POLICY "Users can view own files" ON files FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can insert own files" ON files FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update own files" ON files FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete own files" ON files FOR DELETE USING (auth.uid() = owner_id);

-- File Shares: Owners can manage their shares
CREATE POLICY "Users can view own shares" ON file_shares FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can insert own shares" ON file_shares FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update own shares" ON file_shares FOR UPDATE USING (auth.uid() = owner_id);

-- Share Recipients: Owners can manage recipients of their shares
CREATE POLICY "Users can manage recipients for own shares" ON share_recipients 
  USING (EXISTS (SELECT 1 FROM file_shares WHERE id = share_recipients.share_id AND owner_id = auth.uid()));

-- Download Logs: Owners can view download logs for their files
CREATE POLICY "Users can view download logs of their files" ON download_logs FOR SELECT 
  USING (EXISTS (SELECT 1 FROM files WHERE id = download_logs.file_id AND owner_id = auth.uid()));

-- Activity Logs: Owners can view activity logs for their files
CREATE POLICY "Users can view activity logs of their files" ON activity_logs FOR SELECT 
  USING (EXISTS (SELECT 1 FROM files WHERE id = activity_logs.file_id AND owner_id = auth.uid()));

-- Notifications: Users can view and update their own notifications
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================
CREATE INDEX idx_files_owner ON files(owner_id);
CREATE INDEX idx_file_shares_owner ON file_shares(owner_id);
CREATE INDEX idx_file_shares_token ON file_shares(token);
CREATE INDEX idx_share_recipients_share_id ON share_recipients(share_id);
CREATE INDEX idx_share_recipients_email ON share_recipients(recipient_email);
CREATE INDEX idx_activity_logs_file ON activity_logs(file_id);
