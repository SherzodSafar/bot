require('dotenv').config();
const express = require('express');
const cors = require('cors');

const config = require('./config/default');
const { initDatabase } = require('./database/init');
const { resolveMiniAppUrl } = require('./core/ngrok');
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
  });
}

start().catch((err) => {
  console.error('\n❌ Ishga tushirishda xato:', err.message);
  console.error("\n.env faylidagi DATABASE_URL va BOT_TOKEN to'g'riligini tekshiring.\n");
  process.exit(1);
});
