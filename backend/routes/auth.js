const bcrypt = require('bcryptjs');
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();
const sessionCookie = {
  httpOnly: true,
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

function publicUser(user) {
  return { id: user._id, name: user.name, email: user.email };
}

function startSession(res, user) {
  const token = jwt.sign({ sessionVersion: user.sessionVersion || 0 }, process.env.JWT_SECRET, {
    subject: user._id.toString(),
    expiresIn: '7d',
  });
  res.cookie('session', token, sessionCookie);
}

router.post('/register', async (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = req.body?.password;

  if (!name || name.length > 60 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Enter a valid name and email address.' });
  }
  if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password) > 72) {
    return res.status(400).json({ error: 'Password must be 8-72 bytes long.' });
  }

  try {
    const user = await User.create({
      name,
      email,
      passwordHash: await bcrypt.hash(password, 12),
    });
    startSession(res, user);
    res.status(201).json({ user: publicUser(user) });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'An account with that email already exists.' });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: 'Please provide valid account details.' });
    }
    console.error('Account registration failed');
    res.status(500).json({ error: 'Unable to create the account right now.' });
  }
});

router.post('/login', async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = req.body?.password;
  if (!email || typeof password !== 'string') {
    return res.status(400).json({ error: 'Enter your email and password.' });
  }

  try {
    const user = await User.findOne({ email }).select('+passwordHash +sessionVersion');
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Email or password is incorrect.' });
    }
    startSession(res, user);
    res.json({ user: publicUser(user) });
  } catch {
    console.error('Account login failed');
    res.status(500).json({ error: 'Unable to sign in right now.' });
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

router.post('/logout', requireAuth, async (req, res) => {
  try {
    await User.updateOne({ _id: req.user._id }, { $inc: { sessionVersion: 1 } });
    res.clearCookie('session', { ...sessionCookie, maxAge: undefined });
    res.json({ message: 'Signed out.' });
  } catch {
    res.status(500).json({ error: 'Unable to sign out right now.' });
  }
});

module.exports = router;