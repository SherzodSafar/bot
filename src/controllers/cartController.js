const { findOrCreateUser, getUserByTelegramId } = require('../models/User');
const { getAllProducts, getCategories } = require('../models/Product');
const { createOrder, getOrdersByUser } = require('../models/Order');
const { notifyOrderCreated } = require('./botController');

async function registerUser(req, res) {
  try {
    const { phone } = req.body;
    const user = await findOrCreateUser({
      telegramId: req.telegramUser.id,
      firstName: req.telegramUser.first_name,
      lastName: req.telegramUser.last_name,
      username: req.telegramUser.username,
      phone,
    });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server xatosi' });
  }
}

async function getProducts(req, res) {
  try {
    const { category } = req.query;
    const products = await getAllProducts(category);
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server xatosi' });
  }
}

async function getProductCategories(req, res) {
  try {
    const categories = await getCategories();
    res.json(categories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server xatosi' });
  }
}

async function createNewOrder(req, res) {
  try {
    const { items, totalPrice, location, phone } = req.body;

    if (!items || !items.length || !totalPrice) {
      return res.status(400).json({ error: "Savatcha bo'sh yoki ma'lumot noto'g'ri" });
    }

    const user = await findOrCreateUser({
      telegramId: req.telegramUser.id,
      firstName: req.telegramUser.first_name,
      lastName: req.telegramUser.last_name,
      username: req.telegramUser.username,
      phone,
    });

    const order = await createOrder({
      userId: user.id,
      items,
      totalPrice,
      location,
    });

    notifyOrderCreated(req.telegramUser.id);

    res.status(201).json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server xatosi' });
  }
}

async function getMyOrders(req, res) {
  try {
    const user = await getUserByTelegramId(req.telegramUser.id);
    if (!user) return res.json([]);
    const orders = await getOrdersByUser(user.id);
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server xatosi' });
  }
}

module.exports = {
  registerUser,
  getProducts,
  getProductCategories,
  createNewOrder,
  getMyOrders,
};
