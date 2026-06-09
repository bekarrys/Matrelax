const express = require('express');
const { db } = require('../utils/firebase');
const { verifyToken, requireRole } = require('../middleware/auth');
const { getRevenueReport } = require('../utils/revenueReport');

const router = express.Router();
const COL = 'adminOrders';

async function getAllOrders() {
  const snap = await db.collection(COL).get();
  return snap.docs.map((d) => d.data());
}

router.get('/daily/:date?', async (req, res) => {
  try {
    const date = req.params.date || new Date().toISOString().split('T')[0];
    const orders = await getAllOrders();
    const dayOrders = orders.filter((o) => o.createdAt && o.createdAt.startsWith(date));
    const totalRevenue = dayOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
    const totalPaid = dayOrders.reduce((s, o) => s + (o.paidAmount || 0), 0);
    const totalDebt = dayOrders.reduce((s, o) => s + (o.balance || 0), 0);
    const byPoint = dayOrders.reduce((acc, o) => {
      acc[o.salesPoint] = (acc[o.salesPoint] || 0) + 1;
      return acc;
    }, {});
    res.json({ date, count: dayOrders.length, totalRevenue, totalPaid, totalDebt, byPoint, orders: dayOrders });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка генерации отчёта' });
  }
});

router.get('/monthly/:month?', async (req, res) => {
  try {
    const month = req.params.month || new Date().toISOString().slice(0, 7);
    const orders = await getAllOrders();
    const monthOrders = orders.filter((o) => o.createdAt && o.createdAt.startsWith(month));
    const totalRevenue = monthOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
    const totalPaid = monthOrders.reduce((s, o) => s + (o.paidAmount || 0), 0);
    const totalDebt = monthOrders.reduce((s, o) => s + (o.balance || 0), 0);
    const modelCount = {};
    monthOrders.forEach((o) => {
      (o.items || []).forEach((item) => {
        modelCount[item.modelId] = (modelCount[item.modelId] || 0) + (item.quantity || 1);
      });
    });
    const topModels = Object.entries(modelCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
    res.json({ month, count: monthOrders.length, totalRevenue, totalPaid, totalDebt, topModels, orders: monthOrders });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка генерации отчёта' });
  }
});

// GET /api/reports/debts — все заказы с ненулевым остатком (вместо debts.json)
router.get('/debts', async (req, res) => {
  try {
    const orders = await getAllOrders();
    const debts = orders.filter((o) => (o.balance || 0) > 0);
    const totalDebt = debts.reduce((s, o) => s + o.balance, 0);
    res.json({ debts, totalDebt });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки долгов' });
  }
});

// GET /api/reports/revenue/:period
// period: '2026-05-29' | '2026-05' | '2026'
// Права: только admin и manager (см. firestore.rules: debts/catalog — isAdminOrManager)
router.get('/revenue/:period', verifyToken, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const report = await getRevenueReport(req.params.period);
    res.json(report);
  } catch (err) {
    const isBadPeriod = err.message.startsWith('Неверный формат');
    res.status(isBadPeriod ? 400 : 500).json({ error: err.message });
  }
});

module.exports = router;
