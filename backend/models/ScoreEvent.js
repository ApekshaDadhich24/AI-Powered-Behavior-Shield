const mongoose = require('mongoose');

const scoreEventSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  timestamp: { type: Date, default: Date.now },
  trustScore: Number,
  riskScore: Number,
  avgRiskScore: Number,
  decision: String,      // smoothed decision (CLEAR / STEP_UP_AUTH)
  rawVerdict: String,    // raw AI verdict before smoothing
  consecutiveBad: Number,
});

module.exports = mongoose.model('ScoreEvent', scoreEventSchema);