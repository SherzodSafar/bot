require('dotenv').config();
const config = require('./config/default');

const missing = [];
if (!config.databaseUrl) missing.push('DATABASE_URL');
if (!config.botToken) missing.push('BOT_TOKEN');
if (config.isProduction && !config.adminApiKey) missing.push('ADMIN_API_KEY');

if (missing.length > 0) {
  console.error(`\n❌ Sozlamalarda ${missing.join(' va ')} topilmadi.\n`);
  console.error(
    config.isProduction
      ? '   Serverning Environment sozlamalariga ularni qo\'shing.\n'
      : '   Sozlash uchun quyidagini ishga tushiring:\n\n   npm run setup\n'
  );
  process.exit(1);
}

const express = require('express');
const cors = require('cors');

const { initDatabase } = require('./database/init');
const { resolveMiniAppUrl, closeTunnel } = require('./core/ngrok');
const clientRoutes = require('./routes/client.routes');
const adminRoutes = require('./routes/admin.routes');
const setupBotRoutes = require('./routes/bot.routes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Pizza Delivery API ishlayapti 🍕');
});

app.use('/api/client', clientRoutes);
app.use('/api/admin', adminRoutes);

async function start() {
  await initDatabase();

  const miniAppUrl = await resolveMiniAppUrl();
  await setupBotRoutes(miniAppUrl);

  app.listen(config.port, () => {
    console.log(`✅ Server http://localhost:${config.port} manzilida ishga tushdi`);
    console.log(`📊 Admin panel: http://localhost:5174`);
    if (miniAppUrl) {
      console.log(`📱 Mini App: ${miniAppUrl}`);
      console.log('\n👉 Telegramda botingizga /start yuboring\n');
    }
  });
}

async function shutdown() {
  await closeTunnel();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

start().catch((err) => {
  console.error('\n❌ Ishga tushirishda xato:', err.message);
  console.error("\n.env faylidagi DATABASE_URL va BOT_TOKEN to'g'riligini tekshiring.");
  console.error('Qaytadan sozlash uchun: npm run setup\n');
  process.exit(1);
});
