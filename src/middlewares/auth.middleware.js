const crypto = require('crypto');
const config = require('../config/default');

function validateInitData(initData, botToken) {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return false;
  params.delete('hash');

  const pairs = [];
  for (const [key, value] of params.entries()) {
    pairs.push(`${key}=${value}`);
  }
  pairs.sort();
  const dataCheckString = pairs.join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  return computedHash === hash;
}

function telegramAuth(req, res, next) {
  const initData = req.headers['x-telegram-init-data'];
  if (!initData) {
    return res.status(401).json({ error: "Telegram initData topilmadi" });
  }
  if (!validateInitData(initData, config.botToken)) {
    return res.status(401).json({ error: "Noto'g'ri Telegram initData" });
  }
  const params = new URLSearchParams(initData);
  const userRaw = params.get('user');
  if (!userRaw) {
    return res.status(401).json({ error: 'Foydalanuvchi topilmadi' });
  }
  req.telegramUser = JSON.parse(userRaw);
  next();
}

function adminAuth(req, res, next) {
  const key = req.headers['x-admin-key'];
  if (key !== config.adminApiKey) {
    return res.status(401).json({ error: 'Ruxsat etilmagan' });
  }
  next();
}

module.exports = { telegramAuth, adminAuth, validateInitData };
