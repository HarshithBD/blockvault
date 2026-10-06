-- DROP the cyclic policies from the previous attempt
DROP POLICY IF EXISTS "Recipients can view shared file_shares" ON public.file_shares;
DROP POLICY IF EXISTS "Recipients can view shared files metadata" ON public.files;
DROP POLICY IF EXISTS "Recipients can download shared files" ON storage.objects;
DROP POLICY IF EXISTS "Users and Recipients can download shared files" ON storage.objects;

-- Create SECURITY DEFINER functions to bypass RLS internally and prevent INFINITE RECURSION
-- These functions run with elevated privileges ONLY for these specific read-only checks.

CREATE OR REPLACE FUNCTION public.is_share_recipient(share_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.share_recipients sr
    JOIN public.profiles p ON sr.recipient_email = p.email
    WHERE sr.share_id = share_uuid AND p.id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_public_share(share_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.share_recipients WHERE share_id = share_uuid
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 1. FILE SHARES: Allow recipients to read active shares (Cycle-Free)
CREATE POLICY "Recipients can view shared file_shares"
ON public.file_shares
FOR SELECT
TO authenticated
USING (
  status = 'active'
  AND (expires_at IS NULL OR expires_at > now())
  AND (
    public.is_public_share(id)
    OR
    public.is_share_recipient(id)
  )
);

-- 2. FILES: Allow recipients to read file metadata for active shares (Cycle-Free)
CREATE POLICY "Recipients can view shared files metadata"
ON public.files
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.file_shares fs
    WHERE fs.file_id = files.id
    AND fs.status = 'active'
    AND (fs.expires_at IS NULL OR fs.expires_at > now())
    AND (
      public.is_public_share(fs.id)
      OR 
      public.is_share_recipient(fs.id)
    )
  )
);

-- 3. STORAGE.OBJECTS: Allow recipients to download the physical file securely (Cycle-Free)
CREATE POLICY "Users and Recipients can download shared files" 
ON storage.objects
FOR SELECT 
TO authenticated
USING (
  bucket_id = 'vault_storage' AND
  (
    -- Owner check
    (storage.foldername(name))[1] = (auth.uid())::text
    OR
    -- Share check
    EXISTS (
      SELECT 1 FROM public.files f
      JOIN public.file_shares fs ON f.id = fs.file_id
      WHERE f.storage_path = name
      AND fs.status = 'active'
      AND (fs.expires_at IS NULL OR fs.expires_at > now())
      AND (
        public.is_public_share(fs.id)
        OR 
        public.is_share_recipient(fs.id)
      )
    )
  )
);
