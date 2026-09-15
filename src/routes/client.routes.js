const express = require('express');
const { telegramAuth } = require('../middlewares/auth.middleware');
const {
  registerUser,
  getProducts,
  getProductCategories,
  createNewOrder,
  getMyOrders,
} = require('../controllers/cartController');

const router = express.Router();

router.use(telegramAuth);

router.post('/register', registerUser);
router.get('/products', getProducts);
router.get('/categories', getProductCategories);
router.post('/orders', createNewOrder);
router.get('/orders/my', getMyOrders);

module.exports = router;
