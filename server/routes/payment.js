const express = require('express');
const { db } = require('../utils/firebase');

const router = express.Router();
const COL = 'shopOrders';

async function updateOrderStatus(orderId, status) {
  const ref = db.collection(COL).doc(orderId);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const now = new Date().toISOString();
  const history = [...(snap.data().history || []), { action: status, timestamp: now }];
  await ref.update({ status, updatedAt: now, history });
  return { ...snap.data(), status, updatedAt: now, history };
}

// POST /api/payment/initiate
router.post('/initiate', (req, res) => {
  const { orderId, method, amount } = req.body;

  if (method === 'kaspi') {
    return res.json({
      method: 'kaspi',
      redirectUrl: `kaspi://pay?amount=${amount}&order=${orderId}`,
      qrUrl: null,
      orderId,
    });
  }
  if (method === 'freedom') {
    return res.json({
      method: 'freedom',
      redirectUrl: `https://3dsec.freedompay.kz/pay?order=${orderId}&amount=${amount}`,
      orderId,
    });
  }
  if (method === 'card') {
    return res.json({
      method: 'card',
      iframeUrl: `https://3dsec.freedompay.kz/pay/form?order=${orderId}&amount=${amount}`,
      orderId,
    });
  }

  res.status(400).json({ error: 'Неизвестный метод оплаты' });
});

// POST /api/payment/kaspi/callback
router.post('/kaspi/callback', async (req, res) => {
  const { orderId, status } = req.body;
  if (status === 'SUCCESS' && orderId) {
    const order = await updateOrderStatus(orderId, 'paid');
    if (!order) return res.status(404).json({ error: 'Заказ не найден' });
  }
  res.json({ ok: true });
});

// POST /api/payment/freedom/callback
router.post('/freedom/callback', async (req, res) => {
  const { order_id, result } = req.body;
  if (result === 'ok' && order_id) {
    await updateOrderStatus(order_id, 'paid');
  }
  res.json({ ok: true });
});

// GET /api/payment/status/:orderId
router.get('/status/:orderId', async (req, res) => {
  try {
    const snap = await db.collection(COL).doc(req.params.orderId).get();
    if (!snap.exists) return res.status(404).json({ error: 'Заказ не найден' });
    const { id, status, updatedAt } = snap.data();
    res.json({ orderId: id, status, updatedAt });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка проверки статуса' });
  }
});

module.exports = router;
