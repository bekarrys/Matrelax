const express = require('express');
const { db } = require('../utils/firebase');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();
const COL = 'adminOrders';

// Статусы цеха: progress → ready → delivery → delivered
const ALLOWED_TRANSITIONS = {
  executor: { progress: 'ready' },
  manager: { progress: 'ready', ready: 'delivery', delivery: 'delivered' },
  admin: { progress: 'ready', ready: 'delivery', delivery: 'delivered' },
};

// GET /api/admin-orders
// executor видит только progress, остальные — все
router.get('/', verifyToken, requireRole('admin', 'manager', 'executor'), async (req, res) => {
  try {
    let query = db.collection(COL).orderBy('createdAt', 'desc');
    const snap = await query.get();
    let orders = snap.docs.map((d) => d.data());
    if (req.user.role === 'executor') {
      orders = orders.filter((o) => o.status === 'progress');
    }
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки заказов' });
  }
});

// GET /api/admin-orders/:id
router.get('/:id', verifyToken, requireRole('admin', 'manager', 'executor'), async (req, res) => {
  try {
    const snap = await db.collection(COL).doc(req.params.id).get();
    if (!snap.exists) return res.status(404).json({ error: 'Заказ не найден' });
    res.json(snap.data());
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки заказа' });
  }
});

// POST /api/admin-orders  (admin + manager)
router.post('/', verifyToken, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const now = new Date().toISOString();
    const date = now.split('T')[0];
    const snap = await db.collection(COL).count().get();
    const seq = String((snap.data().count || 0) + 1).padStart(3, '0');
    const point = (req.body.salesPoint || 'madeniyet').charAt(0).toUpperCase() +
                  (req.body.salesPoint || 'madeniyet').slice(1);
    const [y, m, d] = date.split('-');
    const orderNumber = `${point}-${d}${m}${y}-${seq}`;
    const id = `${date}-${seq}`;

    const order = {
      id,
      orderNumber,
      createdAt: now,
      updatedAt: now,
      status: 'progress',
      _source: 'admin',
      createdBy: req.user.uid,
      ...req.body,
      history: [{ action: 'created', by: req.user.email, timestamp: now }],
    };
    await db.collection(COL).doc(id).set(order);
    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка создания заказа' });
  }
});

// PUT /api/admin-orders/:id  (admin + manager)
router.put('/:id', verifyToken, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const ref = db.collection(COL).doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'Заказ не найден' });
    const now = new Date().toISOString();
    const updated = {
      ...snap.data(),
      ...req.body,
      id: req.params.id,
      updatedAt: now,
      history: [...(snap.data().history || []), { action: 'updated', by: req.user.email, timestamp: now }],
    };
    await ref.set(updated);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка обновления заказа' });
  }
});

// PATCH /api/admin-orders/:id/status
router.patch('/:id/status', verifyToken, requireRole('admin', 'manager', 'executor'), async (req, res) => {
  try {
    const ref = db.collection(COL).doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'Заказ не найден' });

    const current = snap.data().status;
    const { status: next } = req.body;
    const allowed = ALLOWED_TRANSITIONS[req.user.role] || {};

    if (allowed[current] !== next) {
      return res.status(403).json({
        error: `Роль ${req.user.role} не может перевести из "${current}" в "${next}"`,
      });
    }

    const now = new Date().toISOString();
    const history = [...(snap.data().history || []), { action: next, by: req.user.email, timestamp: now }];
    await ref.update({ status: next, updatedAt: now, history });
    res.json({ ...snap.data(), status: next, updatedAt: now, history });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка обновления статуса' });
  }
});

// DELETE /api/admin-orders/:id  (admin only)
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    await db.collection(COL).doc(req.params.id).delete();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка удаления заказа' });
  }
});

module.exports = router;
