const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function requireAuth(req, res, next) {
  const token = req.cookies?.session;
  if (!token) {
    return res.status(401).json({ error: 'Please sign in to continue.' });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  }

  const user = await User.findById(payload.sub).select('name email +sessionVersion');
  if (!user || payload.sessionVersion !== user.sessionVersion) {
    return res.status(401).json({ error: 'Please sign in to continue.' });
  }

  req.user = user;
  next();
}

module.exports = requireAuth;