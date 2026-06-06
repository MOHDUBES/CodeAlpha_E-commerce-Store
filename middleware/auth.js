const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'ecommerce_jwt_secret_2024';

module.exports = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1] || req.headers['x-token'];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};
