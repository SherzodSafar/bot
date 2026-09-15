const config = require('../config/default');

const NGROK_API = 'http://127.0.0.1:4040/api/tunnels';

let activeListener = null;

async function detectRunningNgrok() {
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

async function startTunnel() {
  if (!config.ngrokAuthtoken) return null;

  try {
    const ngrok = require('@ngrok/ngrok');
    activeListener = await ngrok.forward({
      addr: Number(config.miniAppPort),
      authtoken: config.ngrokAuthtoken,
    });
    return activeListener.url();
  } catch (err) {
    console.error('ngrok tunnelini ochib bo\'lmadi:', err.message);
    return null;
  }
}

async function closeTunnel() {
  if (!activeListener) return;
  try {
    await activeListener.close();
  } catch {
    /* tunnel allaqachon yopilgan */
  }
  activeListener = null;
}

async function resolveMiniAppUrl() {
  const startedUrl = await startTunnel();
  if (startedUrl) {
    console.log(`🔗 ngrok avtomatik ishga tushdi: ${startedUrl}`);
    return startedUrl;
  }

  const runningUrl = await detectRunningNgrok();
  if (runningUrl) {
    console.log(`🔗 Ishlab turgan ngrok topildi: ${runningUrl}`);
    return runningUrl;
  }

  console.log('⚠️  ngrok topilmadi — .env dagi MINIAPP_URL ishlatiladi');
  return config.miniAppUrl;
}

module.exports = { resolveMiniAppUrl, closeTunnel };
