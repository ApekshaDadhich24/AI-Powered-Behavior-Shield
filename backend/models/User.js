const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  // --- NEW: email, required for account-recovery and the upcoming
  // OTP step-up verification flow (Phase 3).
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  // --- END NEW ---
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
  }

  // --- NOTE: OTP fields (otpCode, otpExpiry, failedStepUpAttempts,
  // lockoutUntil) will be added here in Phase 3 once email delivery
  // is confirmed working. Not needed yet — keeping this phase focused. ---
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);