const config = require('../config/default');

const NGROK_API = 'http://127.0.0.1:4040/api/tunnels';

async function detectNgrokUrl() {
  try {
    const res = await fetch(NGROK_API, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;

    const data = await res.json();
    const tunnels = (data.tunnels || []).filter((t) => t.public_url?.startsWith('https://'));
    if (tunnels.length === 0) return null;

    const miniAppTunnel = tunnels.find((t) => t.config?.addr?.endsWith(`:${config.miniAppPort}`));
    return (miniAppTunnel || tunnels[0]).public_url;
  } catch {
    return null;
  }
}

async function resolveMiniAppUrl() {
  const ngrokUrl = await detectNgrokUrl();
  if (ngrokUrl) {
    console.log(`🔗 ngrok tunneli topildi: ${ngrokUrl}`);
    return ngrokUrl;
  }

  console.log('⚠️  ngrok ishlamayapti — .env dagi MINIAPP_URL ishlatiladi');
  return config.miniAppUrl;
}

module.exports = { detectNgrokUrl, resolveMiniAppUrl };
