const TelegramBot = require('node-telegram-bot-api');
const config = require('../config/default');

const bot = new TelegramBot(config.botToken, { polling: true });

bot.on('polling_error', (err) => {
  console.error('Bot polling xatosi:', err.message);
});

module.exports = bot;
