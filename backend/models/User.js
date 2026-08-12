const mongoose = require('mongoose');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  behavioral_baseline: {
    type: Object,
    default: null
  },
  is_enrolled: {
    type: Boolean,
    default: false
  },
  requiresStepUp: {
    type: Boolean,
    default: false
  },
  // --- NEW: Profile tab fields ---
  avatarBase64: {
    type: String,
    default: null
  },
  // Set while an email-change is in progress; cleared once OTP verifies.
  pendingEmail: {
    type: String,
    default: null
  },
  alertPreferences: {
    emailOnForceLogout: { type: Boolean, default: true },
    emailOnStepUp: { type: Boolean, default: true }
  },
  // Mock "developer" API key for the Behavior-as-a-Service demo panel.
  apiKey: {
    type: String,
    default: () => `bs_live_${crypto.randomBytes(16).toString('hex')}`
  }
  // --- END NEW ---
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);