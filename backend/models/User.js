const mongoose = require('mongoose');

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
  // Set to true the moment a session gets FORCE_LOGOUT'd (either the AI's
  // own call, or our sustained-anomaly counter in behavior.js). While true,
  // /api/auth/login will not issue a normal session — the next login
  // attempt on this account must pass OTP email verification first. Cleared
  // automatically the moment that verification succeeds.
  requiresStepUp: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);