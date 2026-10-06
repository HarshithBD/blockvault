const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { requireAuth } = require('../middleware/auth');
const crypto = require('crypto');
require('dotenv').config();

const router = express.Router();
const supabaseUrl = process.env.SUPABASE_URL;
// We strictly use the Anon Key here because the prompt forbids Service Role key.
// All RLS policies must govern access.
const supabaseKey = process.env.SUPABASE_KEY;

// In-memory cache for download limits during hackathon demo (since we cannot query download_logs as the recipient)
const downloadCountsCache = {};

// Create Share
router.post('/', requireAuth, async (req, res) => {
  const { fileId, accessType, recipients, expiresAt, downloadLimit, password } = req.body;
  const userId = req.user.id;
  
  const userToken = req.headers.authorization.split(' ')[1];
  const userClient = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${userToken}` } }
  });

  try {
    // Verify user owns the file
    const { data: file, error: fileError } = await userClient
      .from('files')
      .select('*')
      .eq('id', fileId)
      .eq('owner_id', userId)
      .single();

    if (fileError || !file) {
      return res.status(404).json({ error: 'File not found or unauthorized' });
    }

    // Generate secure random token
    const token = crypto.randomBytes(32).toString('hex');
    const accessCode = crypto.randomBytes(8).toString('hex'); // For code sharing if needed
    
    // Hash password if provided
    let passwordHash = null;
    if (password) {
      passwordHash = crypto.createHash('sha256').update(password).digest('hex'); // For hackathon demo simplicity
    }

    // Insert Share
    const { data: share, error: shareError } = await userClient
      .from('file_shares')
      .insert({
        file_id: fileId,
        owner_id: userId,
        token,
        access_code: accessCode,
        expires_at: expiresAt || null,
        download_limit: downloadLimit || null,
        password_hash: passwordHash,
        status: 'active'
      })
      .select()
      .single();

    if (shareError) throw new Error(shareError.message);

    // If restricted, insert recipients
    if (accessType === 'restricted' && recipients && recipients.length > 0) {
      const recipientInserts = recipients.map(email => ({
        share_id: share.id,
        recipient_email: email
      }));
      const { error: recError } = await userClient.from('share_recipients').insert(recipientInserts);
      if (recError) throw new Error(recError.message);
    }

    // Log activity
    await userClient.from('activity_logs').insert({
      file_id: fileId,
      user_id: userId,
      action: 'share_created',
      details: { share_id: share.id, type: accessType }
    });

    res.status(201).json({ message: 'Share created successfully', share });
  } catch (error) {
    console.error('Share creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get My Shares
router.get('/', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const userToken = req.headers.authorization.split(' ')[1];
  const userClient = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${userToken}` } }
  });

  try {
    const { data, error } = await userClient
      .from('file_shares')
      .select('*, files(filename, size_bytes, file_type), share_recipients(recipient_email), download_logs(id, downloaded_at)')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    // Process status and download stats
    const processedShares = data.map(share => {
      let effectiveStatus = share.status;
      if (effectiveStatus === 'active' && share.expires_at && new Date(share.expires_at) < new Date()) {
        effectiveStatus = 'expired';
      }
      
      const downloads = share.download_logs || [];
      const downloads_count = downloads.length;
      const last_download = downloads_count > 0 
        ? downloads.reduce((latest, current) => new Date(current.downloaded_at) > new Date(latest.downloaded_at) ? current : latest).downloaded_at 
        : null;

      return {
        ...share,
        status: effectiveStatus,
        downloads_count,
        last_download
      };
    });

    res.json({ shares: processedShares });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch shares' });
  }
});

// Revoke Share
router.delete('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  const userToken = req.headers.authorization.split(' ')[1];
  const userClient = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${userToken}` } }
  });

  try {
    const { data: share, error: updateError } = await userClient
      .from('file_shares')
      .update({ status: 'revoked' })
      .eq('id', id)
      .eq('owner_id', userId)
      .select()
      .single();

    if (updateError || !share) {
      return res.status(404).json({ error: 'Share not found or unauthorized' });
    }

    // Log Activity
    await userClient.from('activity_logs').insert({
      file_id: share.file_id,
      user_id: userId,
      action: 'share_revoked',
      details: { share_id: share.id }
    });

    res.json({ message: 'Share revoked successfully', share });
  } catch (error) {
    console.error('Revoke error:', error);
    res.status(500).json({ error: 'Failed to revoke share' });
  }
});

// Get Share Info (Public/Recipient facing)
router.get('/access/:token', requireAuth, async (req, res) => {
  const { token } = req.params;
  
  const userToken = req.headers.authorization.split(' ')[1];
  const userClient = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${userToken}` } }
  });

  try {
    // Attempt to select the share.
    // If the RLS policies are correct, this will only return the share if:
    // 1. It is active
    // 2. It hasn't expired
    // 3. The user is a recipient OR it's a public share.
    const { data: share, error } = await userClient
      .from('file_shares')
      .select('id, token, expires_at, status, download_limit, password_hash, files(id, filename, size_bytes, file_type, owner_id), download_logs(id)')
      .eq('token', token)
      .single();

    if (error || !share) {
      return res.status(404).json({ error: 'Share not found, expired, or unauthorized.' });
    }
    
    // Additional backend validation just to be doubly secure
    if (share.status !== 'active') return res.status(403).json({ error: 'Share has been revoked.' });
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return res.status(403).json({ error: 'Share has expired.' });
    }

    const currentDownloads = downloadCountsCache[share.id] || 0;
    if (share.download_limit && currentDownloads >= share.download_limit) {
      return res.status(403).json({ error: 'Download limit reached.' });
    }

    // Password verification logic
    let isAuthenticated = true;
    if (share.password_hash) {
      const providedPassword = req.headers['x-share-password'];
      if (!providedPassword) {
        return res.status(401).json({ error: 'Password required.', requiresPassword: true });
      }
      const hashedProvided = crypto.createHash('sha256').update(providedPassword).digest('hex');
      if (hashedProvided !== share.password_hash) {
        return res.status(401).json({ error: 'Incorrect password.', requiresPassword: true });
      }
    }

    // Never return password hash!
    delete share.password_hash;
    share.downloads_count = currentDownloads;
    delete share.download_logs;

    // Log Activity
    await userClient.from('activity_logs').insert({
      file_id: share.files.id,
      user_id: req.user.id,
      action: 'share_accessed',
      details: { share_id: share.id }
    });

    res.json({ share });
  } catch (error) {
    console.error('Access error:', error);
    res.status(500).json({ error: 'Failed to access share' });
  }
});

// Download from Share
router.post('/access/:token/download', requireAuth, async (req, res) => {
  const { token } = req.params;
  const userId = req.user.id;
  
  const userToken = req.headers.authorization.split(' ')[1];
  const userClient = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${userToken}` } }
  });

  try {
    // Verify RLS allows seeing the share
    const { data: share, error } = await userClient
      .from('file_shares')
      .select('id, expires_at, status, password_hash, download_limit, files(id, storage_path, filename), download_logs(id)')
      .eq('token', token)
      .single();

    if (error || !share) return res.status(404).json({ error: 'Share not found or unauthorized.' });
    if (share.status !== 'active') return res.status(403).json({ error: 'Share revoked.' });
    if (share.expires_at && new Date(share.expires_at) < new Date()) return res.status(403).json({ error: 'Share expired.' });

    const currentDownloads = downloadCountsCache[share.id] || 0;
    if (share.download_limit && currentDownloads >= share.download_limit) {
      return res.status(403).json({ error: 'Download limit reached.' });
    }

    if (share.password_hash) {
      const providedPassword = req.headers['x-share-password'];
      if (!providedPassword) return res.status(401).json({ error: 'Password required.' });
      const hashedProvided = crypto.createHash('sha256').update(providedPassword).digest('hex');
      if (hashedProvided !== share.password_hash) return res.status(401).json({ error: 'Incorrect password.' });
    }

    // Generate signed URL
    const { data: signedData, error: signedError } = await userClient.storage
      .from('vault_storage')
      .createSignedUrl(share.files.storage_path, 60, {
        download: share.files.filename
      });

    if (signedError) throw new Error(signedError.message);

    // Update in-memory count
    downloadCountsCache[share.id] = (downloadCountsCache[share.id] || 0) + 1;

    // Update download count (Calculated from download_logs now, so we just insert the log)
    await userClient.from('download_logs').insert({
      file_id: share.files.id,
      share_id: share.id,
      user_id: userId,
      status: 'success'
    });

    // Log Activity
    await userClient.from('activity_logs').insert({
      file_id: share.files.id,
      user_id: userId,
      action: 'file_downloaded',
      details: { share_id: share.id }
    });

    res.json({ url: signedData.signedUrl });
  } catch (error) {
    console.error('Download share error:', error);
    res.status(500).json({ error: 'Failed to generate download link' });
  }
});

module.exports = router;
