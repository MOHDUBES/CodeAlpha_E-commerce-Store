const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  try {
    const { session_id } = req.query;
    const userId = req.headers['x-user-id'];
    
    let where = {};
    if (userId) {
      where.userId = Number(userId);
    } else {
      where.sessionId = session_id || '';
    }

    const items = await prisma.cartItem.findMany({
      where,
      include: { product: true }
    });

    const formattedItems = items.map(c => ({
      id: c.id,
      quantity: c.quantity,
      product_id: c.product.id,
      name: c.product.name,
      price: c.product.price,
      image: c.product.image,
      stock: c.product.stock
    }));

    res.json(formattedItems);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/add', async (req, res) => {
  try {
    const { product_id, quantity = 1, session_id } = req.body;
    const userId = req.headers['x-user-id'];
    
    const product = await prisma.product.findUnique({ where: { id: Number(product_id) } });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    let where = { productId: Number(product_id) };
    if (userId) {
      where.userId = Number(userId);
    } else {
      where.sessionId = session_id || '';
    }

    const existing = await prisma.cartItem.findFirst({ where });
    if (existing) {
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + Number(quantity) }
      });
    } else {
      await prisma.cartItem.create({
        data: {
          userId: userId ? Number(userId) : null,
          sessionId: session_id || '',
          productId: Number(product_id),
          quantity: Number(quantity)
        }
      });
    }

    res.json({ success: true, message: 'Added to cart' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/update/:id', async (req, res) => {
  try {
    const qty = Number(req.body.quantity);
    if (qty <= 0) {
      await prisma.cartItem.delete({ where: { id: Number(req.params.id) } });
    } else {
      await prisma.cartItem.update({
        where: { id: Number(req.params.id) },
        data: { quantity: qty }
      });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/remove/:id', async (req, res) => {
  try {
    await prisma.cartItem.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/clear', async (req, res) => {
  try {
    const { session_id } = req.query;
    const userId = req.headers['x-user-id'];
    
    let where = {};
    if (userId) {
      where.userId = Number(userId);
    } else {
      where.sessionId = session_id || '';
    }
    
    await prisma.cartItem.deleteMany({ where });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
