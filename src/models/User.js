const prisma = require('../database/connection');

async function findOrCreateUser({ telegramId, firstName, lastName, username, phone }) {
  const existing = await prisma.user.findUnique({ where: { telegramId: String(telegramId) } });
  if (existing) {
    return prisma.user.update({
      where: { telegramId: String(telegramId) },
      data: {
        firstName: firstName ?? existing.firstName,
        lastName: lastName ?? existing.lastName,
        username: username ?? existing.username,
        phone: phone ?? existing.phone,
      },
    });
  }
  return prisma.user.create({
    data: {
      telegramId: String(telegramId),
      firstName,
      lastName,
      username,
      phone,
    },
  });
}

async function updateUserPhone(telegramId, phone) {
  return prisma.user.update({
    where: { telegramId: String(telegramId) },
    data: { phone },
  });
}

async function getUserByTelegramId(telegramId) {
  return prisma.user.findUnique({ where: { telegramId: String(telegramId) } });
}

module.exports = { findOrCreateUser, updateUserPhone, getUserByTelegramId };
