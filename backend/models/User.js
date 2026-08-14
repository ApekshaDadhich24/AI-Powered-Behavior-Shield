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
 
  avatarBase64: {
    type: String,
    default: null
  },
  
  pendingEmail: {
    type: String,
    default: null
  },
  alertPreferences: {
    emailOnForceLogout: { type: Boolean, default: true },
    emailOnStepUp: { type: Boolean, default: true }
  },
  
  apiKey: {
    type: String,
    default: () => `bs_live_${crypto.randomBytes(16).toString('hex')}`
  },
  
  passwordChangedAt: {
    type: Date,
    default: null
  }
 
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);