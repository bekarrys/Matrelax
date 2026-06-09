const express = require('express');
const { randomUUID } = require('crypto');
const { db } = require('../utils/firebase');

const router = express.Router();
const COL = 'shopOrders';

function generateOrderNumber() {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  const rand = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  return `MR-${dd}${mm}${yyyy}-${rand}`;
}

// POST /api/orders
router.post('/', async (req, res) => {
  try {
    const now = new Date().toISOString();
    const id = randomUUID(); // криптографически случайный, не угадываемый
    const order = {
      id,
      orderNumber: generateOrderNumber(),
      createdAt: now,
      updatedAt: now,
      status: 'pending_payment',
      _source: 'shop',
      ...req.body,
      history: [{ action: 'created', timestamp: now }],
    };
    await db.collection(COL).doc(id).set(order);
    res.status(201).json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка создания заказа' });
  }
});

// GET /api/orders/:id/stream — SSE real-time status (public, no auth)
router.get('/:id/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // отключаем буферизацию nginx/proxy
  res.flushHeaders();

  // Heartbeat каждые 25s — не даёт прокси закрыть idle-соединение
  const heartbeat = setInterval(() => res.write(': ping\n\n'), 25000);

  const unsubscribe = db.collection(COL).doc(req.params.id)
    .onSnapshot(
      (snap) => {
        if (!snap.exists) {
          res.write(`event: error\ndata: ${JSON.stringify({ error: 'Заказ не найден' })}\n\n`);
          return;
        }
        const { customerPhone, ...publicOrder } = snap.data();
        res.write(`data: ${JSON.stringify(publicOrder)}\n\n`);
      },
      (err) => {
        res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`);
      }
    );

  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
});

// GET /api/orders/:id/public
router.get('/:id/public', async (req, res) => {
  try {
    const snap = await db.collection(COL).doc(req.params.id).get();
    if (!snap.exists) return res.status(404).json({ error: 'Заказ не найден' });
    const { customerPhone, ...publicOrder } = snap.data();
    res.json(publicOrder);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки заказа' });
  }
});

// PATCH /api/orders/:id/status
router.patch('/:id/status', async (req, res) => {
  const pin = req.headers['x-workshop-pin'];
  if (pin !== (process.env.WORKSHOP_PIN || '1234')) {
    return res.status(403).json({ error: 'Неверный PIN' });
  }
  try {
    const ref = db.collection(COL).doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'Заказ не найден' });
    const now = new Date().toISOString();
    const history = [...(snap.data().history || []), { action: req.body.status, timestamp: now }];
    await ref.update({ status: req.body.status, updatedAt: now, history });
    res.json({ ...snap.data(), status: req.body.status, updatedAt: now, history });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка обновления статуса' });
  }
});

// GET /api/orders
router.get('/', async (req, res) => {
  const pin = req.headers['x-workshop-pin'];
  if (pin !== (process.env.WORKSHOP_PIN || '1234')) {
    return res.status(403).json({ error: 'Неверный PIN' });
  }
  try {
    const snap = await db.collection(COL).orderBy('createdAt', 'desc').get();
    res.json(snap.docs.map((d) => d.data()));
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки заказов' });
  }
});

module.exports = router;
