const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.post('/', async (req, res) => {
  try {
    const { name, email, address, city, payment_method, session_id, items } = req.body;
    const userId = req.headers['x-user-id'];
    if (!name || !email || !address || !city)
      return res.status(400).json({ error: 'All delivery details required' });
    if (!items || items.length === 0)
      return res.status(400).json({ error: 'Cart is empty' });

    let total = 0;
    const validItems = [];
    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: Number(item.product_id) } });
      if (!product) return res.status(400).json({ error: 'Product not found' });
      total += product.price * Number(item.quantity);
      validItems.push({
        productId: product.id,
        quantity: Number(item.quantity),
        price: product.price
      });
    }

    const order = await prisma.order.create({
      data: {
        userId: userId ? Number(userId) : null,
        total,
        name,
        email,
        address,
        city,
        paymentMethod: payment_method || 'card',
        status: 'confirmed',
        items: {
          create: validItems
        }
      }
    });

    let cartWhere = {};
    if (userId) {
      cartWhere.userId = Number(userId);
    } else {
      cartWhere.sessionId = session_id || '';
    }
    await prisma.cartItem.deleteMany({ where: cartWhere });

    res.json({ success: true, orderId: order.id, total: order.total, message: 'Order placed successfully!' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/my', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const email = req.headers['x-user-email'];
    
    let where = {};
    if (userId) {
      where.userId = Number(userId);
    } else if (email) {
      where.email = email;
    } else {
      return res.json([]);
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: { product: true }
        }
      }
    });

    const formattedOrders = orders.map(o => ({
      ...o,
      items: o.items.map(oi => ({
        ...oi,
        name: oi.product?.name,
        image: oi.product?.image
      }))
    }));

    res.json(formattedOrders);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        items: {
          include: { product: true }
        }
      }
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    const formattedOrder = {
      ...order,
      items: order.items.map(oi => ({
        ...oi,
        name: oi.product?.name,
        image: oi.product?.image
      }))
    };
    res.json(formattedOrder);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id/cancel', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const { reason } = req.body;
    if (!userId) return res.status(401).json({ error: 'Login required' });
    
    const order = await prisma.order.findFirst({
      where: {
        id: Number(req.params.id),
        userId: Number(userId)
      }
    });

    if (!order || order.status === 'cancelled') {
      return res.status(400).json({ error: 'Order cannot be cancelled or not found' });
    }
    
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'cancelled',
        cancelReason: reason || 'Not specified'
      }
    });
    
    res.json({ success: true, message: 'Order cancelled successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
