const config = require('../config/default');

// Render'ning bepul tarifida servis 15 daqiqa harakatsizlikdan keyin uxlaydi va
// bot xabarlarga javob bermay qoladi. O'ziga so'rov yuborib turish uni yoqiq saqlaydi.
const PING_INTERVAL_MS = 10 * 60 * 1000;

function startKeepAlive() {
  const url = process.env.RENDER_EXTERNAL_URL;
  if (!config.isProduction || !url) return;

  const timer = setInterval(() => {
    fetch(url).catch(() => {});
  }, PING_INTERVAL_MS);
  timer.unref();

  console.log("🔄 Servis uyg'oq saqlanadi (har 10 daqiqada)");
}

module.exports = { startKeepAlive };
