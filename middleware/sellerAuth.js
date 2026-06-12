const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'ecommerce_jwt_secret_2024';
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, SECRET);
    
    // Check the actual database to get their latest role (in case they were just upgraded)
    const dbUser = await prisma.user.findUnique({
      where: { id: decoded.id }
    });

    if (!dbUser || dbUser.role !== 'seller') {
      return res.status(403).json({ error: 'Access denied. Seller role required.' });
    }

    req.user = dbUser; // attach the fresh user object
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
