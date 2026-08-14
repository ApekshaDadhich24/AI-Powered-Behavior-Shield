const express = require('express');
const Session = require('../models/Session');
const ScoreEvent = require('../models/ScoreEvent');

const router = express.Router();


router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const sessions = await Session.find({ userId }).sort({ startedAt: -1 }).limit(50);
    res.json({ sessions });
  } catch (error) {
    res.status(500).json({ message: 'Failed to load sessions', error: error.message });
  }
});


router.get('/:sessionId/events', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const events = await ScoreEvent.find({ sessionId }).sort({ timestamp: 1 });
    res.json({ events });
  } catch (error) {
    res.status(500).json({ message: 'Failed to load session events', error: error.message });
  }
});

module.exports = router;