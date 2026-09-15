require('dotenv').config();
const express = require('express');
const cors = require('cors');

const config = require('./config/default');
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

setupBotRoutes();

app.listen(config.port, () => {
  console.log(`✅ Server http://localhost:${config.port} manzilida ishga tushdi`);
});
