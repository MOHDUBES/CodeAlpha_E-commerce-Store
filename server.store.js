const express = require('express');
const path = require('path');
const app = require('./app');

// Explicitly handle root to serve Store Front
app.get('/', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve static files (disabled default index serving)
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

// Serve HTML pages
app.get('/product', (req, res) => res.sendFile(path.join(__dirname, 'public', 'product.html')));
app.get('/cart', (req, res) => res.sendFile(path.join(__dirname, 'public', 'cart.html')));
app.get('/checkout', (req, res) => res.sendFile(path.join(__dirname, 'public', 'checkout.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));
app.get('/orders', (req, res) => res.sendFile(path.join(__dirname, 'public', 'orders.html')));
app.get('/forgot-password', (req, res) => res.sendFile(path.join(__dirname, 'public', 'forgot-password.html')));
app.get('/settings', (req, res) => res.sendFile(path.join(__dirname, 'public', 'settings.html')));
app.get('/wishlist', (req, res) => res.sendFile(path.join(__dirname, 'public', 'wishlist.html')));
app.get('/seller-dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'seller-dashboard.html')));

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`\n🛍️  Store Front Server is running!`);
    console.log(`  > Local: http://localhost:${PORT}/`);
    console.log();
  });
}

module.exports = app;
