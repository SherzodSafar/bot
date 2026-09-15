const express = require('express');
const { adminAuth } = require('../middlewares/auth.middleware');
const {
  getOrders,
  changeOrderStatus,
  getProducts,
  addProduct,
  editProduct,
  removeProduct,
} = require('../controllers/adminController');

const router = express.Router();

router.use(adminAuth);

router.get('/orders', getOrders);
router.patch('/orders/:id/status', changeOrderStatus);

router.get('/products', getProducts);
router.post('/products', addProduct);
router.put('/products/:id', editProduct);
router.delete('/products/:id', removeProduct);

module.exports = router;
