const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendOtpEmail(toEmail, otpCode) {
  const { data, error } = await resend.emails.send({
    from: 'BehaviorShield <otp@mail.behaviorshield.dadhichapeksha.in>',
    to: toEmail,
    subject: 'Your BehaviorShield Verification Code',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
        <h2>Security Verification Required</h2>
        <p>We detected unusual behavioral patterns on your session. Enter this code to confirm it's you:</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 16px; background: #f4f4f4; text-align: center; border-radius: 8px;">
          ${otpCode}
        </div>
        <p style="color: #888; font-size: 13px;">This code expires in 5 minutes. If you didn't trigger this, secure your account immediately.</p>
      </div>
    `
  });

  if (error) throw new Error(`Resend error: ${error.message}`);
  return data;
}

module.exports = { sendOtpEmail };