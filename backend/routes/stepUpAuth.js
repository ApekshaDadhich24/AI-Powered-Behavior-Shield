const express = require('express');
const router = express.Router();
const Otp = require('../models/Otp');
const User = require('../models/User');
const { generateOtp, hashOtp } = require('../utils/otp');
const { sendOtpEmail } = require('../utils/mailer');


router.post('/step-up/request', async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const code = generateOtp();
    await Otp.deleteMany({ userId });
    await Otp.create({
      userId,
      codeHash: hashOtp(code),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    });

    await sendOtpEmail(user.email, code);
    res.json({ success: true, message: 'OTP sent' });
  } catch (err) {
    console.error('OTP request error:', err);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});


router.post('/step-up/verify', async (req, res) => {
  try {
    const { userId, code } = req.body;
    const otpDoc = await Otp.findOne({ userId }).sort({ createdAt: -1 });

    if (!otpDoc) return res.status(400).json({ error: 'No OTP found, request a new one' });
    if (otpDoc.expiresAt < new Date()) return res.status(400).json({ error: 'OTP expired' });
    if (otpDoc.attempts >= 5) return res.status(429).json({ error: 'Too many attempts' });

    if (hashOtp(code) !== otpDoc.codeHash) {
      otpDoc.attempts += 1;
      await otpDoc.save();
      return res.status(400).json({ error: 'Invalid code' });
    }

    await Otp.deleteOne({ _id: otpDoc._id });

    const user = await User.findByIdAndUpdate(
      userId,
      { requiresStepUp: false },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Verified',
      userId: user._id,
      username: user.username,
      is_enrolled: user.is_enrolled,
    });
  } catch (err) {
    console.error('OTP verify error:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

module.exports = router;