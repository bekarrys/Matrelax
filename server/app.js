require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
require('./utils/firebase');

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { verifyToken, requireRole } = require('./middleware/auth');

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

app.use('/api/auth',         require('./routes/auth'));
app.use('/api/products',     require('./routes/products'));
app.use('/api/payment',      require('./routes/payment'));
app.use('/api/orders',       require('./routes/orders'));
// Менеджерский портал выведен из эксплуатации (декомиссия):
// маршруты /api/admin-orders и /api/analytics не монтируются. Их логика
// сохранена в routes/adminOrders.js, routes/analytics.js и utils/* для
// переиспользования в будущем объединённом портале (покрыта тестами).
app.use('/api/employees',    verifyToken, requireRole('admin', 'manager'), require('./routes/employees'));
app.use('/api/reports',      verifyToken, requireRole('admin', 'manager'), require('./routes/reports'));
app.use('/api/catalog',      verifyToken, requireRole('admin', 'manager'), require('./routes/catalog'));

app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString(), db: 'firestore' })
);

// --- Отдача собранного фронтенда (client/dist) ---
const clientDist = path.resolve(__dirname, '../client/dist');
app.use(express.static(clientDist));

// SPA-fallback: любой не-API GET отдаёт index.html (роутинг на стороне React)
app.get(/^\/(?!api\/).*/, (_req, res) =>
  res.sendFile(path.join(clientDist, 'index.html'))
);

module.exports = app;
