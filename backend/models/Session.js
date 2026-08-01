const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date, default: null },
  // 'normal' = user closed tab / logged out normally
  // 'force_logout' = AI flagged CRITICAL_ANOMALY and session was terminated
  // 'ai_unavailable' = Python AI backend was unreachable
  endReason: { type: String, enum: ['normal', 'force_logout', 'ai_unavailable'], default: null },
  frameCount: { type: Number, default: 0 },
  avgTrustScore: { type: Number, default: null },
  minTrustScore: { type: Number, default: null },
  // Frames where the smoothed decision was not CLEAR
  anomalyCount: { type: Number, default: 0 },
});

module.exports = mongoose.model('Session', sessionSchema);