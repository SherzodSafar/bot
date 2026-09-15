require('dotenv').config();

module.exports = {
  port: process.env.PORT || 4000,
  databaseUrl: process.env.DATABASE_URL,
  botToken: process.env.BOT_TOKEN,
  miniAppUrl: process.env.MINIAPP_URL,
  adminApiKey: process.env.ADMIN_API_KEY || 'pizza_admin_2024',
};
