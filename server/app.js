require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
require('./utils/firebase');

const express = require('express');
const cors    = require('cors');
const { verifyToken, requireRole } = require('./middleware/auth');

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

app.use('/api/auth',         require('./routes/auth'));
app.use('/api/products',     require('./routes/products'));
app.use('/api/payment',      require('./routes/payment'));
app.use('/api/orders',       require('./routes/orders'));
app.use('/api/admin-orders', require('./routes/adminOrders'));
app.use('/api/employees',    verifyToken, requireRole('admin', 'manager'), require('./routes/employees'));
app.use('/api/reports',      verifyToken, requireRole('admin', 'manager'), require('./routes/reports'));
app.use('/api/catalog',      verifyToken, requireRole('admin', 'manager'), require('./routes/catalog'));

app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString(), db: 'firestore' })
);

module.exports = app;
