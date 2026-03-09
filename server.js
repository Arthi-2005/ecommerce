const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const analyticsRoutes = require('./routes/analytics');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const wishlistRoutes = require('./routes/wishlist');
const investRoutes = require('./routes/invest');
const reviewRoutes = require('./routes/reviews');
const profileRoutes = require('./routes/profile');
const notificationRoutes = require('./routes/notifications');

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/invest', investRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/notifications', notificationRoutes);

// Home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Connect to MongoDB then start server
const { connect } = require('./db');
connect().catch(err => { console.warn('MongoDB not connected, using JSON DB:', err.message); });

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📊 Stock Analysis Dashboard ready!`);
  console.log(`🛒 E-Commerce Platform loaded with 800 products!`);
});



app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Keep-alive: ping self every 5 minutes to prevent sleep
const SITE_URL = process.env.RENDER_EXTERNAL_URL
  ? process.env.RENDER_EXTERNAL_URL
  : process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : null;
if (SITE_URL) {
  const https = require('https');
  const http = require('http');
  const requester = SITE_URL.startsWith('https') ? https : http;
  setInterval(() => {
    requester.get(`${SITE_URL}/api/health`, () => {}).on('error', () => {});
  }, 5 * 60 * 1000);
}
