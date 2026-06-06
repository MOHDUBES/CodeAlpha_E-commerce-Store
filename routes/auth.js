const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');

const SECRET = process.env.JWT_SECRET || 'ecommerce_jwt_secret_2024';

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'All fields required' });
  if (db.getUserByEmail(email))
    return res.status(400).json({ error: 'Email already registered' });
  const hashed = await bcrypt.hash(password, 10);
  const result = db.createUser(name, email, hashed);
  const token = jwt.sign({ id: result.lastInsertRowid, name, email }, SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: result.lastInsertRowid, name, email } });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password required' });
  const user = db.getUserByEmail(email);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

// Update Profile
router.put('/profile', (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, SECRET);

    const { name, email } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });

    const result = db.updateProfile(decoded.id, name, email);
    if (!result) return res.status(404).json({ error: 'User not found' });
    if (result.error) return res.status(400).json({ error: result.error });

    // Issue a new token with updated details
    const newToken = jwt.sign({ id: result.id, email: result.email, name: result.name }, SECRET, { expiresIn: '7d' });
    
    res.json({ message: 'Profile updated successfully', token: newToken, user: { id: result.id, name: result.name, email: result.email } });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

router.get('/profile', require('../middleware/auth'), (req, res) => {
  const user = db.getUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ id: user.id, name: user.name, email: user.email, created_at: user.created_at });
});

// Forgot Password — generate 6-digit OTP
router.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });
  const user = db.getUserByEmail(email);
  if (!user) return res.status(404).json({ error: 'No account found with this email' });
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  db.createResetToken(email, otp);
  // In production: send via email. For demo: return OTP directly
  res.json({ success: true, otp, message: 'OTP generated! (In production this would be emailed)' });
});

// Reset Password — verify OTP + update password
router.post('/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword)
    return res.status(400).json({ error: 'Email, OTP and new password are required' });
  if (newPassword.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if (!db.verifyResetToken(email, otp))
    return res.status(400).json({ error: 'Invalid or expired OTP. Please try again.' });
  const hashed = await bcrypt.hash(newPassword, 10);
  db.updatePassword(email, hashed);
  db.deleteResetToken(email);
  res.json({ success: true, message: 'Password reset successfully! Please login with your new password.' });
});

module.exports = router;
