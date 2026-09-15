const bot = require('../core/bot');
const config = require('../config/default');
const { findOrCreateUser } = require('../models/User');

function registerBotHandlers() {
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      await findOrCreateUser({
        telegramId: msg.from.id,
        firstName: msg.from.first_name,
        lastName: msg.from.last_name,
        username: msg.from.username,
      });

      await bot.sendMessage(
        chatId,
        `Assalomu alaykum, ${msg.from.first_name}! 🍕\n\nPizza Delivery botiga xush kelibsiz. Issiqqina pizzalarni buyurtma qilish uchun pastdagi tugmani bosing.`,
        {
          reply_markup: {
            keyboard: [
              [{ text: '🍕 Buyurtma berish', web_app: { url: config.miniAppUrl } }],
            ],
            resize_keyboard: true,
          },
        }
      );
    } catch (err) {
      console.error('/start xatosi:', err);
    }
  });

  console.log('Bot handlerlari ro\'yxatdan o\'tkazildi ✅');
}

async function notifyOrderCreated(telegramId) {
  try {
    await bot.sendMessage(
      telegramId,
      "Buyurtmangiz muvaffaqiyatli qabul qilindi! Kuryerimiz tez orada bog'lanadi 🍕"
    );
  } catch (err) {
    console.error('Xabar yuborishda xato:', err.message);
  }
}

module.exports = { registerBotHandlers, notifyOrderCreated };
