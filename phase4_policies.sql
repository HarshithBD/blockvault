-- PHASE 4 DATABASE RLS POLICIES FOR SECURE SHARING
-- Do not drop existing owner policies (RLS is additive). 
-- These policies securely grant access to authorized recipients.

-- 1. FILE SHARES: Allow recipients (or anyone if no recipients exist for link sharing) to read active shares
CREATE POLICY "Recipients can view shared file_shares"
ON public.file_shares
FOR SELECT
TO authenticated
USING (
  status = 'active'
  AND (expires_at IS NULL OR expires_at > now())
  AND (
    NOT EXISTS (SELECT 1 FROM public.share_recipients WHERE share_id = id)
    OR
    EXISTS (
      SELECT 1 FROM public.share_recipients 
      WHERE share_id = id 
      AND recipient_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
    )
  )
);

-- 2. FILES: Allow recipients to read file metadata for active shares
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
      NOT EXISTS (SELECT 1 FROM public.share_recipients sr WHERE sr.share_id = fs.id)
      OR 
      EXISTS (
        SELECT 1 FROM public.share_recipients sr 
        WHERE sr.share_id = fs.id 
        AND sr.recipient_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
      )
    )
  )
);

-- 3. STORAGE.OBJECTS: Allow recipients to download the physical file securely
CREATE POLICY "Recipients can download shared files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'vault_storage' 
  AND EXISTS (
    SELECT 1 FROM public.files f
    JOIN public.file_shares fs ON f.id = fs.file_id
    WHERE f.storage_path = name
    AND fs.status = 'active'
    AND (fs.expires_at IS NULL OR fs.expires_at > now())
    AND (
      NOT EXISTS (SELECT 1 FROM public.share_recipients sr WHERE sr.share_id = fs.id)
      OR 
      EXISTS (
        SELECT 1 FROM public.share_recipients sr 
        WHERE sr.share_id = fs.id 
        AND sr.recipient_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
      )
    )
  )
);
