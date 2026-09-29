const path = require('path');
const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');

dotenv.config({ path: path.join(__dirname, '.env') });

const authRoutes = require('./routes/auth');
const listingRoutes = require('./routes/listings');
const app = express();
const port = process.env.PORT || 5000;
const mongoUri = process.env.MONGODB_URI;
const defaultClientOrigins = 'http://localhost:5173,http://127.0.0.1:5173';
const allowedOrigins = new Set(
  (process.env.CLIENT_ORIGIN || defaultClientOrigins)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error('Origin not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

async function startServer() {
  if (!mongoUri) {
    console.error('MONGODB_URI is missing from backend/.env');
    process.exit(1);
  }
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is missing from backend/.env');
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
    console.log('MongoDB connected');
    app.listen(port, () => console.log(`Server listening on port ${port}`));
  } catch {
    console.error('MongoDB connection failed; check the URI, credentials, and Atlas network access');
    process.exit(1);
  }
}

startServer();