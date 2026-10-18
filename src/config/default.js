require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

module.exports = {
  isProduction,
  port: process.env.PORT || 4000,
  miniAppPort: process.env.MINIAPP_PORT || 5173,
  databaseUrl: process.env.DATABASE_URL,
  botToken: process.env.BOT_TOKEN,
  miniAppUrl: process.env.MINIAPP_URL,
  ngrokAuthtoken: process.env.NGROK_AUTHTOKEN,
  // Bulutda (Render) bot webhook orqali ishlaydi: Telegram xabari uxlab qolgan
  // serverni o'zi uyg'otadi, shuning uchun serverni doim yoqiq ushlash shart emas.
  publicUrl: process.env.RENDER_EXTERNAL_URL || process.env.PUBLIC_URL,
  useWebhook: isProduction && !!(process.env.RENDER_EXTERNAL_URL || process.env.PUBLIC_URL),
  adminApiKey: process.env.ADMIN_API_KEY || (isProduction ? '' : 'pizza_admin_2024'),
};
