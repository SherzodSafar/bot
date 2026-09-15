const prisma = require('../database/connection');

async function createOrder({ userId, items, totalPrice, location }) {
  return prisma.order.create({
    data: { userId, items, totalPrice, location },
  });
}

async function getOrdersByUser(userId) {
  return prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

async function getAllOrders() {
  return prisma.order.findMany({
    include: { user: true },
    orderBy: { createdAt: 'desc' },
  });
}

async function updateOrderStatus(id, status) {
  return prisma.order.update({
    where: { id: Number(id) },
    data: { status },
  });
}

module.exports = { createOrder, getOrdersByUser, getAllOrders, updateOrderStatus };
