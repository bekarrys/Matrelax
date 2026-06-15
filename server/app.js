require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
require('./utils/firebase');

const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

// Клиент — публичный магазин. Активные API: товары, заказы, оплата.
app.use('/api/products', require('./routes/products'));
app.use('/api/orders',   require('./routes/orders'));
app.use('/api/payment',  require('./routes/payment'));

// ── Менеджерский портал выведен из эксплуатации (декомиссия) ──
// Маршруты admin-orders, analytics, auth, employees, reports, catalog НЕ
// монтируются. Их обработчики и логика сохранены в routes/* и utils/*
// (полный снимок — ветка origin/legacy-admin-backup) для переиспользования.

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
