const crypto = require('crypto');

function generateOtp() {
  return crypto.randomInt(100000, 999999).toString();
}

function hashOtp(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

module.exports = { generateOtp, hashOtp };