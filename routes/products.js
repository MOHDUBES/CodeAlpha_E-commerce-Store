const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  try {
    const { search, category, sort } = req.query;
    let where = {};
    
    if (search) {
      where = {
        OR: [
          { name: { contains: search } },
          { description: { contains: search } }
        ]
      };
    }
    
    if (category && category !== 'All') {
      where.category = category;
    }
    
    let orderBy = {};
    if (sort === 'price_asc') orderBy = { price: 'asc' };
    else if (sort === 'price_desc') orderBy = { price: 'desc' };
    else if (sort === 'rating') orderBy = { rating: 'desc' };

    const products = await prisma.product.findMany({ where, orderBy });
    
    // Parse JSON strings back to arrays
    const formattedProducts = products.map(p => ({
      ...p,
      images: p.images ? JSON.parse(p.images) : [],
      features: p.features ? JSON.parse(p.features) : []
    }));
    
    res.json(formattedProducts);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/categories', async (req, res) => {
  try {
    const products = await prisma.product.findMany({ select: { category: true } });
    const cats = [...new Set(products.map(p => p.category))];
    res.json(['All', ...cats]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: Number(req.params.id) } });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    
    product.images = product.images ? JSON.parse(product.images) : [];
    product.features = product.features ? JSON.parse(product.features) : [];
    
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
