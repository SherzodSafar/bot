const bot = require('../core/bot');
const { findOrCreateUser } = require('../models/User');

let miniAppUrl = null;

function isValidWebAppUrl(url) {
  return typeof url === 'string' && url.startsWith('https://');
}

async function setupMenuButton() {
  if (!isValidWebAppUrl(miniAppUrl)) return;
  try {
    await bot.setChatMenuButton({
      menu_button: JSON.stringify({
        type: 'web_app',
        text: '🍕 Buyurtma',
        web_app: { url: miniAppUrl },
      }),
    });
    console.log('✅ Telegram menyu tugmasi avtomatik sozlandi');
  } catch (err) {
    console.error('Menyu tugmasini sozlashda xato:', err.message);
  }
}

function registerBotHandlers(resolvedUrl) {
  miniAppUrl = resolvedUrl;

  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      await findOrCreateUser({
        telegramId: msg.from.id,
        firstName: msg.from.first_name,
        lastName: msg.from.last_name,
        username: msg.from.username,
      });

      if (!isValidWebAppUrl(miniAppUrl)) {
        await bot.sendMessage(
          chatId,
          "Bot ishga tushdi, lekin Mini App manzili hali sozlanmagan.\n\nKompyuteringizda `ngrok http 5173` ni ishga tushiring va serverni qayta yoqing."
        );
        return;
      }

      await bot.sendMessage(
        chatId,
        `Assalomu alaykum, ${msg.from.first_name}! 🍕\n\nPizza Delivery botiga xush kelibsiz. Issiqqina pizzalarni buyurtma qilish uchun pastdagi tugmani bosing.`,
        {
          reply_markup: {
            keyboard: [[{ text: '🍕 Buyurtma berish', web_app: { url: miniAppUrl } }]],
            resize_keyboard: true,
          },
        }
      );
    } catch (err) {
      console.error('/start xatosi:', err.message);
    }
  });

  console.log("✅ Bot handlerlari ro'yxatdan o'tkazildi");
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

module.exports = { registerBotHandlers, setupMenuButton, notifyOrderCreated };
