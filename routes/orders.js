const express = require('express');
const router = express.Router();
const db = require('../database');

router.post('/', (req, res) => {
  const { name, email, address, city, payment_method, session_id, items } = req.body;
  const userId = req.headers['x-user-id'];
  if (!name || !email || !address || !city)
    return res.status(400).json({ error: 'All delivery details required' });
  if (!items || items.length === 0)
    return res.status(400).json({ error: 'Cart is empty' });

  // Validate products and calculate total
  let total = 0;
  for (const item of items) {
    const product = db.getProductById(item.product_id);
    if (!product) return res.status(400).json({ error: 'Product not found' });
    total += product.price * item.quantity;
  }

  const result = db.createOrder({ userId, total, name, email, address, city, payment_method, items, sessionId: session_id });
  res.json({ success: true, orderId: result.orderId, total: result.total, message: 'Order placed successfully!' });
});

router.get('/my', (req, res) => {
  const userId = req.headers['x-user-id'];
  const email = req.headers['x-user-email'];
  res.json(db.getOrdersByUser(userId, email));
});

router.get('/:id', (req, res) => {
  const order = db.getOrderById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

router.put('/:id/cancel', (req, res) => {
  const userId = req.headers['x-user-id'];
  const { reason } = req.body;
  if (!userId) return res.status(401).json({ error: 'Login required' });
  
  const success = db.cancelOrder(req.params.id, userId, reason);
  if (!success) return res.status(400).json({ error: 'Order cannot be cancelled or not found' });
  
  res.json({ success: true, message: 'Order cancelled successfully' });
});

module.exports = router;
