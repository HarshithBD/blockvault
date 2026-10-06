const express = require('express');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const { requireAuth } = require('../middleware/auth');
const crypto = require('crypto');
require('dotenv').config();

const router = express.Router();

// 50MB file size limit
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } 
});

const supabaseUrl = process.env.SUPABASE_URL;
// Fallback to Anon key if Service Role isn't provided. 
// If RLS applies to storage, the backend MUST use Service Role to bypass, 
// or pass the user's JWT into a new client instance.
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

// GET /api/files/stats - Get summary stats
router.get('/stats', requireAuth, async (req, res) => {
  const userToken = req.headers.authorization.split(' ')[1];
  const userClient = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${userToken}` } }
  });

  try {
    const { data: files } = await userClient.from('files').select('id').eq('owner_id', req.user.id).neq('status', 'deleted');
    const { data: shares } = await userClient.from('file_shares').select('id, status').eq('owner_id', req.user.id);
    const { data: downloads } = await userClient.from('download_logs').select('id, file_id, files!inner(owner_id)').eq('files.owner_id', req.user.id);

    const totalFiles = files ? files.length : 0;
    const totalShares = shares ? shares.length : 0;
    const activeShares = shares ? shares.filter(s => s.status === 'active').length : 0;
    const totalDownloads = downloads ? downloads.length : 0;

    res.json({ stats: { totalFiles, sharedFiles: totalShares, activeShares, totalDownloads } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/files - List files for user
router.get('/', requireAuth, async (req, res) => {
  const { q, type, sort, filter } = req.query;
  const userToken = req.headers.authorization.split(' ')[1];
  const userClient = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${userToken}` } }
  });

  try {
    let query = userClient
      .from('files')
      .select('*, file_shares(id, status, share_recipients(recipient_email)), download_logs(id)')
      .eq('owner_id', req.user.id)
      .neq('status', 'deleted');

    if (type) {
      if (type === 'pdf') query = query.ilike('file_type', '%pdf%');
      else if (type === 'image') query = query.ilike('file_type', '%image%');
      else if (type === 'video') query = query.ilike('file_type', '%video%');
      else if (type === 'document') query = query.ilike('file_type', '%word%').or('file_type.ilike.%document%');
    }

    // Default sorting
    let orderColumn = 'created_at';
    let ascending = false;
    if (sort === 'oldest') { ascending = true; }
    else if (sort === 'name-asc') { orderColumn = 'filename'; ascending = true; }
    else if (sort === 'name-desc') { orderColumn = 'filename'; ascending = false; }
    else if (sort === 'largest') { orderColumn = 'size_bytes'; ascending = false; }
    else if (sort === 'smallest') { orderColumn = 'size_bytes'; ascending = true; }

    query = query.order(orderColumn, { ascending });

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    let results = data;

    // Apply text search (filename OR recipient)
    if (q) {
      const lowerQ = q.toLowerCase();
      results = results.filter(f => {
        if (f.filename.toLowerCase().includes(lowerQ)) return true;
        if (f.file_type && f.file_type.toLowerCase().includes(lowerQ)) return true;
        
        // Search recipients
        if (f.file_shares) {
          return f.file_shares.some(share => 
            share.share_recipients && share.share_recipients.some(rec => rec.recipient_email.toLowerCase().includes(lowerQ))
          );
        }
        return false;
      });
    }

    // Apply share status filtering in memory
    if (filter === 'shared') {
      results = results.filter(f => f.file_shares && f.file_shares.length > 0);
    } else if (filter === 'active_shares') {
      results = results.filter(f => f.file_shares && f.file_shares.some(s => s.status === 'active'));
    } else if (filter === 'expired_shares') {
      results = results.filter(f => f.file_shares && f.file_shares.some(s => s.status === 'expired'));
    } else if (filter === 'revoked_shares') {
      results = results.filter(f => f.file_shares && f.file_shares.some(s => s.status === 'revoked'));
    }

    res.json({ files: results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/files/upload - Upload a file
router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const userId = req.user.id;
  const originalName = req.file.originalname;
  // Sanitize filename to prevent path traversal / weird characters
  const sanitizedName = originalName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  
  const fileId = crypto.randomUUID();
  const storagePath = `${userId}/${fileId}/${sanitizedName}`;

  // Use scoped client to enforce RLS if applicable
  const userToken = req.headers.authorization.split(' ')[1];
  const userClient = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${userToken}` } }
  });

  try {
    // 1. Upload to Storage
    const { data: storageData, error: storageError } = await userClient.storage
      .from('vault_storage')
      .upload(storagePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (storageError) throw new Error(`Storage upload failed: ${storageError.message}`);

    // 2. Insert into Database
    const { data: dbData, error: dbError } = await userClient
      .from('files')
      .insert({
        id: fileId,
        owner_id: userId,
        filename: sanitizedName,
        file_type: req.file.mimetype,
        size_bytes: req.file.size,
        storage_path: storagePath,
        status: 'active'
      })
      .select()
      .single();

    if (dbError) {
      // Cleanup orphaned file
      await userClient.storage.from('vault_storage').remove([storagePath]);
      throw new Error(`Database insert failed: ${dbError.message}`);
    }

    // 3. Log Activity
    await userClient.from('activity_logs').insert({
      file_id: fileId,
      user_id: userId,
      action: 'file_uploaded'
    });

    res.status(201).json({ message: 'File uploaded successfully', file: dbData });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/files/:id/download - Get a signed URL
router.get('/:id/download', requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const userToken = req.headers.authorization.split(' ')[1];
  const userClient = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${userToken}` } }
  });

  try {
    // 1. Verify ownership
    const { data: file, error: fileError } = await userClient
      .from('files')
      .select('*')
      .eq('id', id)
      .eq('owner_id', userId)
      .single();

    if (fileError || !file) {
      return res.status(404).json({ error: 'File not found or unauthorized' });
    }

    // 2. Generate Signed URL (valid for 60 seconds)
    const { data: signedData, error: signedError } = await userClient.storage
      .from('vault_storage')
      .createSignedUrl(file.storage_path, 60, {
        download: file.filename
      });

    if (signedError) throw new Error(signedError.message);

    // 3. Log Activity
    await userClient.from('activity_logs').insert({
      file_id: id,
      user_id: userId,
      action: 'file_downloaded'
    });

    res.json({ url: signedData.signedUrl });
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Failed to generate download link' });
  }
});

// DELETE /api/files/:id - Delete a file
router.delete('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  const userToken = req.headers.authorization.split(' ')[1];
  const userClient = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${userToken}` } }
  });

  try {
    // 1. Verify ownership
    const { data: file, error: fileError } = await userClient
      .from('files')
      .select('*')
      .eq('id', id)
      .eq('owner_id', userId)
      .single();

    if (fileError || !file) {
      return res.status(404).json({ error: 'File not found or unauthorized' });
    }

    // 2. Delete from Storage
    const { error: storageError } = await userClient.storage
      .from('vault_storage')
      .remove([file.storage_path]);

    if (storageError) console.error('Storage deletion failed:', storageError);

    // 3. Delete from DB
    const { error: dbError } = await userClient
      .from('files')
      .delete()
      .eq('id', id);

    if (dbError) throw new Error(dbError.message);

    // 4. Log Activity
    await userClient.from('activity_logs').insert({
      file_id: id,
      user_id: userId,
      action: 'file_deleted'
    });

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

module.exports = router;
