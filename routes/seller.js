const express = require('express');
const router = express.Router();
const sellerAuth = require('../middleware/sellerAuth');
const multer = require('multer');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Configure multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../public/uploads/'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});

router.use(sellerAuth);

async function getSellerOrdersData(sellerId) {
  // Find products belonging to seller
  const products = await prisma.product.findMany({
    where: { sellerId: Number(sellerId) },
    select: { id: true }
  });
  const productIds = products.map(p => p.id);
  if (productIds.length === 0) return [];

  // Find order items for these products
  const orderItems = await prisma.orderItem.findMany({
    where: { productId: { in: productIds } },
    select: { orderId: true }
  });
  const orderIds = [...new Set(orderItems.map(oi => oi.orderId))];

  // Find orders that are not hidden by this seller
  const orders = await prisma.order.findMany({
    where: { id: { in: orderIds } },
    include: {
      items: {
        where: { productId: { in: productIds } },
        include: { product: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return orders.filter(o => {
    let hiddenBy = [];
    try { hiddenBy = o.hiddenBySeller ? JSON.parse(o.hiddenBySeller) : []; } catch(e){}
    return !hiddenBy.includes(Number(sellerId));
  }).map(o => ({
    ...o,
    items: o.items.map(oi => ({
      ...oi,
      name: oi.product.name,
      image: oi.product.image
    }))
  }));
}

router.get('/profile', async (req, res) => {
  try {
    const seller = await prisma.user.findUnique({
      where: { id: Number(req.user.id) },
      select: {
        id: true,
        name: true,
        email: true,
        storeName: true,
        profileImage: true,
        storeStatus: true
      }
    });
    res.json(seller);
  } catch (err) {
    console.error('Profile Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/dashboard', async (req, res) => {
  try {
    const sellerId = Number(req.user.id);
    
    const products = await prisma.product.findMany({ where: { sellerId } });
    const orders = await getSellerOrdersData(sellerId);
    
    // DEBUG LOG TO FILE
    const fs = require('fs');
    fs.appendFileSync('seller_debug.log', `[LIVE REQUEST] Time: ${new Date().toISOString()} | SellerID: ${sellerId} | Products Found: ${products.length}\n`);
    
    // Product metrics
    const totalProducts = products.length;
    const activeListings = products.filter(p => p.isActive && p.stock > 0).length;
    const inactiveListings = products.filter(p => !p.isActive).length;
    const outOfStock = products.filter(p => p.stock <= 0).length;

    // Order metrics
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.status === 'confirmed' || o.status === 'pending').length;
    const completedOrders = orders.filter(o => o.status === 'delivered').length;
    const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;

    // Revenue metrics
    let totalRevenue = 0;
    let monthlyRevenue = 0;
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    orders.forEach(o => {
      if (o.status !== 'cancelled') {
        o.items.forEach(item => {
          totalRevenue += (item.price * item.quantity);
          const orderDate = new Date(o.createdAt);
          if (orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear) {
            monthlyRevenue += (item.price * item.quantity);
          }
        });
      }
    });

    res.json({
      totalProducts,
      activeListings,
      inactiveListings,
      outOfStock,
      totalOrders,
      pendingOrders,
      completedOrders,
      cancelledOrders,
      totalRevenue,
      monthlyRevenue
    });
  } catch (err) {
    console.error('Dashboard Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/orders', async (req, res) => {
  try {
    const orders = await getSellerOrdersData(Number(req.user.id));
    res.json(orders);
  } catch (err) {
    console.error('Orders Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/products', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { sellerId: Number(req.user.id) }
    });
    const formatted = products.map(p => ({
      ...p,
      images: p.images ? JSON.parse(p.images) : [],
      features: p.features ? JSON.parse(p.features) : []
    }));
    res.json(formatted);
  } catch (err) {
    console.error('Products Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/products', upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, category, stock, features, sku, brand } = req.body;
    if (!name || !price || !category) {
      return res.status(400).json({ error: 'Name, price, and category are required' });
    }

    let imagePath = '/images/product-placeholder.jpg';
    if (req.file) {
      imagePath = '/uploads/' + req.file.filename;
    }

    let parsedFeatures = [];
    try {
      if (features) parsedFeatures = JSON.parse(features);
    } catch (e) {
      parsedFeatures = Array.isArray(features) ? features : (features ? [features] : []);
    }

    const newProduct = await prisma.product.create({
      data: {
        sellerId: Number(req.user.id),
        name,
        description: description || '',
        price: Number(price),
        category,
        stock: Number(stock) || 0,
        image: imagePath,
        images: JSON.stringify(req.file ? [imagePath] : []),
        features: JSON.stringify(parsedFeatures),
        sku: sku || null,
        brand: brand || null,
        isActive: true
      }
    });
    
    newProduct.images = JSON.parse(newProduct.images);
    newProduct.features = JSON.parse(newProduct.features);
    res.status(201).json(newProduct);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/products/:id', upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, category, stock, features, sku, brand, isActive } = req.body;
    
    let parsedFeatures = [];
    try {
      if (features) parsedFeatures = JSON.parse(features);
    } catch (e) {
      parsedFeatures = Array.isArray(features) ? features : (features ? [features] : []);
    }

    const product = await prisma.product.findFirst({
      where: { id: Number(req.params.id), sellerId: Number(req.user.id) }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found or unauthorized' });
    }

    const updateData = {
      name,
      description: description || '',
      price: Number(price),
      category,
      stock: Number(stock) || 0,
      features: JSON.stringify(parsedFeatures),
      sku: sku !== undefined ? sku : product.sku,
      brand: brand !== undefined ? brand : product.brand,
    };
    if (isActive !== undefined) {
      updateData.isActive = isActive === 'true' || isActive === true;
    }

    if (req.file) {
      updateData.image = '/uploads/' + req.file.filename;
      let existingImgs = [];
      try { existingImgs = JSON.parse(product.images); } catch(e){}
      updateData.images = JSON.stringify([...existingImgs, updateData.image]);
    }

    const updatedProduct = await prisma.product.update({
      where: { id: product.id },
      data: updateData
    });
    
    updatedProduct.images = JSON.parse(updatedProduct.images);
    updatedProduct.features = JSON.parse(updatedProduct.features);
    res.json(updatedProduct);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/products/:id', async (req, res) => {
  try {
    const product = await prisma.product.findFirst({
      where: { id: Number(req.params.id), sellerId: Number(req.user.id) }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found or unauthorized' });
    }
    
    await prisma.product.delete({ where: { id: product.id } });
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/orders/:id/status', async (req, res) => {
  try {
    const { status, paymentStatus, deliveryStatus } = req.body;
    
    const updateData = {};
    if (status) updateData.status = status;
    if (paymentStatus) updateData.paymentStatus = paymentStatus;
    if (deliveryStatus) updateData.deliveryStatus = deliveryStatus;
    
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No status provided to update' });
    }
    
    await prisma.order.update({
      where: { id: Number(req.params.id) },
      data: updateData
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/orders/:id', async (req, res) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: Number(req.params.id) } });
    if (order) {
      let hiddenBy = [];
      try { hiddenBy = order.hiddenBySeller ? JSON.parse(order.hiddenBySeller) : []; } catch(e){}
      
      if (!hiddenBy.includes(Number(req.user.id))) {
        hiddenBy.push(Number(req.user.id));
        await prisma.order.update({
          where: { id: order.id },
          data: { hiddenBySeller: JSON.stringify(hiddenBy) }
        });
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
