const express = require('express');
const router = express.Router();
const db = require('../database');
const requireAuth = require('../middleware/auth');

// Get Wishlist
router.get('/', requireAuth, (req, res) => {
  const wishlist = db.getWishlist(req.user.id);
  res.json({ wishlist });
});

// Toggle Wishlist item (Add/Remove)
router.post('/toggle', requireAuth, (req, res) => {
  const { productId } = req.body;
  if (!productId) return res.status(400).json({ error: 'Product ID required' });
  
  const result = db.toggleWishlist(req.user.id, productId);
  if (!result) return res.status(400).json({ error: 'Failed to update wishlist' });
  
  res.json({ 
    message: result.added ? 'Added to wishlist' : 'Removed from wishlist', 
    added: result.added, 
    wishlist: result.wishlist 
  });
});

module.exports = router;
