require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { requireAuth } = require('./middleware/auth');
const filesRouter = require('./routes/files');
const sharesRouter = require('./routes/shares');
const activityRouter = require('./routes/activity');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok', message: 'BLOCKVAULT API is running.' }));
app.get('/api/me', requireAuth, (req, res) => res.json({ message: 'Success! You are authenticated.', userId: req.user.id }));
app.get('/api/admin-only', requireAuth, (req, res) => res.status(403).json({ error: 'Forbidden' }));

// Phase 3 & 4 Routers
app.use('/api/files', filesRouter);
app.use('/api/shares', sharesRouter);
app.use('/api/activity', activityRouter);

app.listen(port, () => {
  console.log(`BLOCKVAULT API listening on port ${port}`);
});
