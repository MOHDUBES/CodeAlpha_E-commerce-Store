const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const SECRET = process.env.JWT_SECRET || 'ecommerce_jwt_secret_2024';

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, isSeller } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'All fields required' });
    
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing)
      return res.status(400).json({ error: 'Email already registered' });
    
    const hashed = await bcrypt.hash(password, 10);
    const role = isSeller ? 'seller' : 'user';
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role }
    });
    
    const token = jwt.sign({ id: user.id, name, email, role }, SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name, email, role } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password required' });
    
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    
    const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update Profile
router.put('/profile', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, SECRET);

    const { name, email } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.id !== decoded.id) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: decoded.id },
      data: { name, email }
    });

    const newToken = jwt.sign({ id: updatedUser.id, email: updatedUser.email, name: updatedUser.name, role: updatedUser.role }, SECRET, { expiresIn: '7d' });
    res.json({ message: 'Profile updated successfully', token: newToken, user: { id: updatedUser.id, name: updatedUser.name, email: updatedUser.email, role: updatedUser.role } });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token or server error' });
  }
});

router.get('/profile', require('../middleware/auth'), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role, created_at: user.createdAt });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Forgot Password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'No account found with this email' });
    
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
    
    await prisma.resetToken.upsert({
      where: { email },
      update: { otp, expiry },
      create: { email, otp, expiry }
    });
    
    res.json({ success: true, otp, message: 'OTP generated! (In production this would be emailed)' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword)
      return res.status(400).json({ error: 'Email, OTP and new password are required' });
    if (newPassword.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    
    const tokenRecord = await prisma.resetToken.findUnique({ where: { email } });
    if (!tokenRecord || tokenRecord.otp !== otp || new Date() > tokenRecord.expiry) {
      return res.status(400).json({ error: 'Invalid or expired OTP. Please try again.' });
    }
    
    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { email },
      data: { password: hashed }
    });
    
    await prisma.resetToken.delete({ where: { email } });
    res.json({ success: true, message: 'Password reset successfully! Please login with your new password.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
