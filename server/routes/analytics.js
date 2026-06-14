const express = require('express');
const { db } = require('../utils/firebase');
const { verifyToken, requireRole } = require('../middleware/auth');
const { periodRange, summarize } = require('../utils/analytics');

const router = express.Router();
const COL = 'adminOrders';

// GET /api/analytics/summary?period=day|week|month
// Доступ: только администратор (менеджеру аналитика недоступна).
router.get('/summary', verifyToken, requireRole('admin'), async (req, res) => {
  const period = req.query.period || 'day';
  try {
    const { from, to, label } = periodRange(period);
    const snap = await db
      .collection(COL)
      .where('createdAt', '>=', from)
      .where('createdAt', '<', to)
      .get();
    const orders = snap.docs.map((d) => d.data());
    res.json({ period, label, ...summarize(orders) });
  } catch (err) {
    const badPeriod = err.message.startsWith('Неверный период');
    res.status(badPeriod ? 400 : 500).json({ error: err.message });
  }
});

module.exports = router;
