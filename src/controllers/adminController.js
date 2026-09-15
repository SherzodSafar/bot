const { getAllOrders, updateOrderStatus } = require('../models/Order');
const {
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../models/Product');

async function getOrders(req, res) {
  try {
    const orders = await getAllOrders();
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server xatosi' });
  }
}

async function changeOrderStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const order = await updateOrderStatus(id, status);
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server xatosi' });
  }
}

async function getProducts(req, res) {
  try {
    const products = await getAllProducts();
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server xatosi' });
  }
}

async function addProduct(req, res) {
  try {
    const { name, description, imageUrl, oldPrice, newPrice, category } = req.body;
    if (!name || !imageUrl || !newPrice || !category) {
      return res.status(400).json({ error: "Majburiy maydonlar to'ldirilmagan" });
    }
    const product = await createProduct({
      name,
      description,
      imageUrl,
      oldPrice: oldPrice ? Number(oldPrice) : null,
      newPrice: Number(newPrice),
      category,
    });
    res.status(201).json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server xatosi' });
  }
}

async function editProduct(req, res) {
  try {
    const { id } = req.params;
    const { name, description, imageUrl, oldPrice, newPrice, category } = req.body;
    const product = await updateProduct(id, {
      name,
      description,
      imageUrl,
      oldPrice: oldPrice ? Number(oldPrice) : null,
      newPrice: Number(newPrice),
      category,
    });
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server xatosi' });
  }
}

async function removeProduct(req, res) {
  try {
    const { id } = req.params;
    await deleteProduct(id);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server xatosi' });
  }
}

module.exports = {
  getOrders,
  changeOrderStatus,
  getProducts,
  addProduct,
  editProduct,
  removeProduct,
};
