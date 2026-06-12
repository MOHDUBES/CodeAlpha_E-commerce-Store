const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const requireAuth = require('../middleware/auth');

router.get('/', requireAuth, async (req, res) => {
  try {
    const items = await prisma.wishlistItem.findMany({
      where: { userId: Number(req.user.id) },
      include: { product: true }
    });
    
    const wishlist = items.map(item => ({
      ...item.product,
      images: item.product.images ? JSON.parse(item.product.images) : [],
      features: item.product.features ? JSON.parse(item.product.features) : []
    }));
    
    res.json({ wishlist });
  } catch (err) {
    console.error('Wishlist Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/toggle', requireAuth, async (req, res) => {
  try {
    const { productId } = req.body;
    if (!productId) return res.status(400).json({ error: 'Product ID required' });
    
    const existing = await prisma.wishlistItem.findUnique({
      where: {
        userId_productId: {
          userId: Number(req.user.id),
          productId: Number(productId)
        }
      }
    });

    let added = false;
    if (existing) {
      await prisma.wishlistItem.delete({ where: { id: existing.id } });
    } else {
      await prisma.wishlistItem.create({
        data: { userId: Number(req.user.id), productId: Number(productId) }
      });
      added = true;
    }

    const items = await prisma.wishlistItem.findMany({
      where: { userId: Number(req.user.id) },
      include: { product: true }
    });
    
    const wishlist = items.map(item => ({
      ...item.product,
      images: item.product.images ? JSON.parse(item.product.images) : [],
      features: item.product.features ? JSON.parse(item.product.features) : []
    }));
    
    res.json({ 
      message: added ? 'Added to wishlist' : 'Removed from wishlist', 
      added, 
      wishlist 
    });
  } catch (err) {
    console.error('Wishlist Toggle Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
