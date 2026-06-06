const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/', (req, res) => {
  const { session_id } = req.query;
  const userId = req.headers['x-user-id'];
  res.json(db.getCartItems(userId, session_id));
});

router.post('/add', (req, res) => {
  const { product_id, quantity = 1, session_id } = req.body;
  const userId = req.headers['x-user-id'];
  const product = db.getProductById(product_id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  db.addToCart(userId, session_id, product_id, quantity);
  res.json({ success: true, message: 'Added to cart' });
});

router.put('/update/:id', (req, res) => {
  db.updateCartItem(req.params.id, req.body.quantity);
  res.json({ success: true });
});

router.delete('/remove/:id', (req, res) => {
  db.removeCartItem(req.params.id);
  res.json({ success: true });
});

router.delete('/clear', (req, res) => {
  const { session_id } = req.query;
  const userId = req.headers['x-user-id'];
  db.clearCart(userId, session_id);
  res.json({ success: true });
});

module.exports = router;
