-- 1. Enable RLS on the storage.objects table
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 2. Allow authenticated users to upload files to their own folder within vault_storage
CREATE POLICY "Users can upload their own files" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'vault_storage' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Allow authenticated users to view/download their own files
CREATE POLICY "Users can view their own files" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'vault_storage' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Allow authenticated users to update their own files (if needed)
CREATE POLICY "Users can update their own files" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'vault_storage' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 5. Allow authenticated users to delete their own files
CREATE POLICY "Users can delete their own files" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'vault_storage' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
