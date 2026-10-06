-- ==============================================================================
-- PHASE 4 SECURITY POLICIES V4 (HARDENED & SPOOF-PROOF)
-- ==============================================================================

-- 1. DROP previous insecure attempts
DROP POLICY IF EXISTS "Recipients can view shared file_shares" ON public.file_shares;
DROP POLICY IF EXISTS "Recipients can view shared files metadata" ON public.files;
DROP POLICY IF EXISTS "Users and Recipients can download shared files" ON storage.objects;
DROP POLICY IF EXISTS "Recipients can download shared files" ON storage.objects;

DROP FUNCTION IF EXISTS public.is_public_share(UUID);
DROP FUNCTION IF EXISTS public.is_share_recipient(UUID);

-- 2. CREATE hardened SECURITY DEFINER function
-- Enforces search_path to prevent injection. Exposes no sensitive data.
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
-- Recipients can view share metadata for active shares they are explicitly listed in.
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
-- Recipients can view file metadata IF the file is securely linked to an active share.
-- SECURITY FIX: Enforces fs.owner_id = files.owner_id to prevent Share Target Spoofing.
CREATE POLICY "Recipients can view shared files metadata"
ON public.files
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.file_shares fs
    WHERE fs.file_id = files.id
    AND fs.owner_id = files.owner_id 
    AND fs.status = 'active'
    AND (fs.expires_at IS NULL OR fs.expires_at > now())
    AND public.is_share_recipient(fs.id)
  )
);

-- 5. STORAGE OBJECTS POLICY
-- Owners and explicitly authorized recipients can download the physical file.
-- SECURITY FIX 1: fs.owner_id = f.owner_id blocks Share Target Spoofing.
-- SECURITY FIX 2: f.owner_id::text = (storage.foldername(name))[1] blocks Path Spoofing.
CREATE POLICY "Users and Recipients can download shared files" 
ON storage.objects
FOR SELECT 
TO authenticated
USING (
  bucket_id = 'vault_storage' AND
  (
    -- Existing Phase 3 parity: Owner access
    (storage.foldername(name))[1] = (auth.uid())::text
    OR
    -- Strict Recipient access
    EXISTS (
      SELECT 1 FROM public.files f
      JOIN public.file_shares fs ON f.id = fs.file_id
      WHERE f.storage_path = name
      AND f.owner_id::text = (storage.foldername(name))[1] 
      AND fs.owner_id = f.owner_id 
      AND fs.status = 'active'
      AND (fs.expires_at IS NULL OR fs.expires_at > now())
      AND public.is_share_recipient(fs.id)
    )
  )
);
