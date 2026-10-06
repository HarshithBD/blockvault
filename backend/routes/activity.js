const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { requireAuth } = require('../middleware/auth');
require('dotenv').config();

const router = express.Router();
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// GET /api/activity
router.get('/', requireAuth, async (req, res) => {
  const userId = req.user.id;
  
  const userToken = req.headers.authorization.split(' ')[1];
  const userClient = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${userToken}` } }
  });

  try {
    // The RLS policy "Users can view activity logs of their files" restricts access.
    // However, we also explicitly filter by user's files or user's actions.
    const { data, error } = await userClient
      .from('activity_logs')
      .select('*, files(filename)')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw new Error(error.message);
    res.json({ activity: data });
  } catch (error) {
    console.error('Activity fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
});

module.exports = router;
