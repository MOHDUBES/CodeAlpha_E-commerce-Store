const express = require('express');
const path = require('path');
const app = require('./app');

// Explicitly handle root to serve Seller Dashboard
app.get('/', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(__dirname, 'public', 'seller-dashboard.html'));
});

// Serve static files (disabled default index serving)
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

// Serve HTML pages (you could selectively expose these if you want strict admin separation)
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));
app.get('/seller-dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'seller-dashboard.html')));

const PORT = process.env.SELLER_PORT || 3001;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`\n📦 Seller Dashboard Server is running!`);
    console.log(`  > Local: http://localhost:${PORT}/`);
    console.log();
  });
}

module.exports = app;
