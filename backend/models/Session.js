const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date, default: null },
  endReason: { type: String, enum: ['normal', 'force_logout_ai', 'force_logout_sustained', 'ai_unavailable'], default: null },
  frameCount: { type: Number, default: 0 },
  avgTrustScore: { type: Number, default: null },
  minTrustScore: { type: Number, default: null },
  anomalyCount: { type: Number, default: 0 },
});

module.exports = mongoose.model('Session', sessionSchema);