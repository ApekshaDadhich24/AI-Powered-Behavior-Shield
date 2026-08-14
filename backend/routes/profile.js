const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const router = express.Router();
const User = require('../models/User');
const Otp = require('../models/Otp');
const { generateOtp, hashOtp } = require('../utils/otp');
const { sendOtpEmail } = require('../utils/mailer');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_AVATAR_BASE64_LEN = 300_000; 
function publicProfile(user) {
  return {
    userId: user._id,
    username: user.username,
    email: user.email,
    pendingEmail: user.pendingEmail,
    avatarBase64: user.avatarBase64,
    is_enrolled: user.is_enrolled,
    createdAt: user.createdAt,
    alertPreferences: user.alertPreferences,
    apiKey: user.apiKey,
    passwordChangedAt: user.passwordChangedAt,
  };
}


router.get('/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.apiKey) {
      user.apiKey = `bs_live_${crypto.randomBytes(16).toString('hex')}`;
      await user.save();
    }

    res.json(publicProfile(user));
  } catch (err) {
    res.status(500).json({ error: 'Failed to load profile' });
  }
});


router.put('/:userId/avatar', async (req, res) => {
  try {
    const { avatarBase64 } = req.body;
    if (avatarBase64 && avatarBase64.length > MAX_AVATAR_BASE64_LEN) {
      return res.status(400).json({ error: 'Image too large after compression' });
    }
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { avatarBase64: avatarBase64 || null },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, avatarBase64: user.avatarBase64 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update avatar' });
  }
});


router.put('/:userId/preferences', async (req, res) => {
  try {
    const { alertPreferences } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { alertPreferences },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, alertPreferences: user.alertPreferences });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});


router.post('/:userId/change-email/request', async (req, res) => {
  try {
    const { newEmail } = req.body;
    if (!newEmail || !EMAIL_REGEX.test(newEmail.trim())) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }
    const normalized = newEmail.toLowerCase().trim();

    const existing = await User.findOne({ email: normalized });
    if (existing) return res.status(400).json({ error: 'An account with this email already exists' });

    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.pendingEmail = normalized;
    await user.save();

    const code = generateOtp();
    await Otp.deleteMany({ userId: user._id });
    await Otp.create({
      userId: user._id,
      codeHash: hashOtp(code),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    });

    await sendOtpEmail(normalized, code);
    res.json({ success: true, message: 'Verification code sent to new email' });
  } catch (err) {
    console.error('Change-email request error:', err);
    res.status(500).json({ error: 'Failed to send verification code' });
  }
});


router.post('/:userId/change-email/verify', async (req, res) => {
  try {
    const { code } = req.body;
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.pendingEmail) return res.status(400).json({ error: 'No email change in progress' });

    const otpDoc = await Otp.findOne({ userId: user._id }).sort({ createdAt: -1 });
    if (!otpDoc) return res.status(400).json({ error: 'No code found, request a new one' });
    if (otpDoc.expiresAt < new Date()) return res.status(400).json({ error: 'Code expired' });
    if (otpDoc.attempts >= 5) return res.status(429).json({ error: 'Too many attempts' });

    if (hashOtp(code) !== otpDoc.codeHash) {
      otpDoc.attempts += 1;
      await otpDoc.save();
      return res.status(400).json({ error: 'Invalid code' });
    }

    await Otp.deleteOne({ _id: otpDoc._id });

    user.email = user.pendingEmail;
    user.pendingEmail = null;
    await user.save();

    res.json({ success: true, email: user.email });
  } catch (err) {
    console.error('Change-email verify error:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
});


router.post('/:userId/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const isSame = await bcrypt.compare(newPassword, user.password);
    if (isSame) {
      return res.status(400).json({ error: 'New password must be different from current password' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.passwordChangedAt = new Date();
    await user.save();

    res.json({ success: true, message: 'Password updated', passwordChangedAt: user.passwordChangedAt });
  } catch (err) {
    console.error('Change-password error:', err);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

router.post('/:userId/force-relogin', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { requiresStepUp: true },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to force re-login' });
  }
});


router.post('/:userId/regenerate-key', async (req, res) => {
  try {
    const newKey = `bs_live_${crypto.randomBytes(16).toString('hex')}`;
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { apiKey: newKey },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, apiKey: user.apiKey });
  } catch (err) {
    res.status(500).json({ error: 'Failed to regenerate key' });
  }
});

module.exports = router;