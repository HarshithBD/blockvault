-- ==============================================================================
-- PHASE 4 SECURITY POLICIES V3
-- ==============================================================================

-- 1. DROP the insecure V2 policies and functions
DROP POLICY IF EXISTS "Recipients can view shared file_shares" ON public.file_shares;
DROP POLICY IF EXISTS "Recipients can view shared files metadata" ON public.files;
DROP POLICY IF EXISTS "Users and Recipients can download shared files" ON storage.objects;
DROP POLICY IF EXISTS "Recipients can download shared files" ON storage.objects;

DROP FUNCTION IF EXISTS public.is_public_share(UUID);
DROP FUNCTION IF EXISTS public.is_share_recipient(UUID);

-- 2. CREATE safe, hardened SECURITY DEFINER function
-- Hardening: explicitly setting search_path = public to prevent injection.
-- This function only returns a boolean and exposes no sensitive data.
CREATE OR REPLACE FUNCTION public.is_share_recipient(share_uuid UUID)
RETURNS BOOLEAN 
SET search_path = public
SECURITY DEFINER 
AS $$
  SELECT EXISTS (
    SELECT 1 FROM share_recipients sr
    JOIN profiles p ON sr.recipient_email = p.email
    WHERE sr.share_id = share_uuid AND p.id = auth.uid()
  );
$$ LANGUAGE sql;

-- 3. FILE SHARES POLICY
-- Only explicit recipients can view the share metadata
CREATE POLICY "Recipients can view shared file_shares"
ON public.file_shares
FOR SELECT
TO authenticated
USING (
  status = 'active'
  AND (expires_at IS NULL OR expires_at > now())
  AND public.is_share_recipient(id)
);

-- 4. FILES METADATA POLICY
-- Only explicit recipients can view the file metadata for the share
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
    AND public.is_share_recipient(fs.id)
  )
);

-- 5. STORAGE OBJECTS POLICY
-- ONLY Owners and explicit recipients can download the physical file.
-- Completely prevents broad storage access.
CREATE POLICY "Users and Recipients can download shared files" 
ON storage.objects
FOR SELECT 
TO authenticated
USING (
  bucket_id = 'vault_storage' AND
  (
    -- Owner access (Phase 3 parity)
    (storage.foldername(name))[1] = (auth.uid())::text
    OR
    -- Restricted recipient access (Strict authorization)
    EXISTS (
      SELECT 1 FROM public.files f
      JOIN public.file_shares fs ON f.id = fs.file_id
      WHERE f.storage_path = name
      AND fs.status = 'active'
      AND (fs.expires_at IS NULL OR fs.expires_at > now())
      AND public.is_share_recipient(fs.id)
    )
  )
);
