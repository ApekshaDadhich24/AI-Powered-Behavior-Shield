const mongoose = require('mongoose');

const scoreEventSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  timestamp: { type: Date, default: Date.now },
  trustScore: Number,
  riskScore: Number,
  avgRiskScore: Number,
  decision: String,      
  rawVerdict: String,   
  consecutiveBad: Number,
});

module.exports = mongoose.model('ScoreEvent', scoreEventSchema);