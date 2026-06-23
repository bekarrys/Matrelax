const express = require('express');
const { db } = require('../utils/firebase');
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  canTransition,
  canEditItems,
  hasItemChanges,
  computeFieldDiffs,
} = require('../utils/orderLogic');
const { priceOrderItems, orderTotal } = require('../utils/pricing');

const router = express.Router();
const COL = 'adminOrders';
const PRODUCTS_COL = 'products';

// Грузит товары для позиций заказа в карту { modelId: productDoc }.
// getDoc — db.collection(...).doc(id).get или tx.get(ref) (для транзакций).
async function loadProductsFor(items, getDoc) {
  const ids = [...new Set((items || []).map((i) => i.modelId).filter(Boolean))];
  const entries = await Promise.all(
    ids.map(async (id) => {
      const snap = await getDoc(db.collection(PRODUCTS_COL).doc(id));
      return [id, snap.exists ? snap.data() : null];
    })
  );
  return Object.fromEntries(entries.filter(([, p]) => p));
}

// Считает авторитетную сумму заказа из живого каталога (анти-тамперинг):
// цена позиций НЕ берётся с клиента. Возвращает { items, totalAmount }.
async function pricedOrder(body, getDoc) {
  const products = await loadProductsFor(body.items, getDoc);
  const { items, itemsTotal } = priceOrderItems(body.items, products);
  const totalAmount = orderTotal(itemsTotal, body.deliveryFee, body.discount);
  return { items, totalAmount };
}

// Поля, которые нельзя перезаписывать через PUT (управляются системой/отдельными ручками).
const PROTECTED_FIELDS = ['id', 'orderNumber', 'createdAt', 'createdBy', '_source', 'history', 'status'];

// Ошибка с HTTP-статусом для проброса из транзакции.
function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

// ─── GET /api/admin-orders ───────────────────────────────────────────────────
// executor видит только заказы в работе; остальные — все.
router.get('/', verifyToken, requireRole('admin', 'manager', 'executor'), async (req, res) => {
  try {
    const snap = await db.collection(COL).orderBy('createdAt', 'desc').get();
    let orders = snap.docs.map((d) => d.data());
    if (req.user.role === 'executor') {
      orders = orders.filter((o) => o.status === 'progress');
    }
    res.json({ orders });
  } catch {
    res.status(500).json({ error: 'Ошибка загрузки заказов' });
  }
});

// ─── GET /api/admin-orders/:id ───────────────────────────────────────────────
router.get('/:id', verifyToken, requireRole('admin', 'manager', 'executor'), async (req, res) => {
  try {
    const snap = await db.collection(COL).doc(req.params.id).get();
    if (!snap.exists) return res.status(404).json({ error: 'Заказ не найден' });
    res.json(snap.data());
  } catch {
    res.status(500).json({ error: 'Ошибка загрузки заказа' });
  }
});

// ─── POST /api/admin-orders  (admin + manager) ───────────────────────────────
router.post('/', verifyToken, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const now = new Date().toISOString();
    const date = now.split('T')[0];
    const snap = await db.collection(COL).count().get();
    const seq = String((snap.data().count || 0) + 1).padStart(3, '0');
    const rawPoint = req.body.salesPoint || 'madeniyet';
    const point = rawPoint.charAt(0).toUpperCase() + rawPoint.slice(1);
    const [y, m, d] = date.split('-');
    const orderNumber = `${point}-${d}${m}${y}-${seq}`;
    const id = `${date}-${seq}`;

    if (!Array.isArray(req.body.items) || req.body.items.length === 0) {
      throw httpError(400, 'Заказ без позиций');
    }
    // Сервер пересчитывает цены из каталога — не доверяем суммам клиента.
    const { items, totalAmount } = await pricedOrder(req.body, (ref) => ref.get());

    const order = {
      ...req.body,
      items,
      totalAmount,
      paidAmount: totalAmount,  // долг отменён: заказ всегда оплачен полностью
      balance: 0,
      id,
      orderNumber,
      createdAt: now,
      updatedAt: now,
      status: 'new',            // стартовый статус — «Новый» (правится свободно)
      itemsUnlocked: false,
      _source: 'admin',
      createdBy: req.user.uid,
      history: [{ at: now, by: req.user.email, action: 'created' }],
    };
    await db.collection(COL).doc(id).set(order);
    res.status(201).json(order);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: 'Ошибка создания заказа' });
  }
});

// ─── PUT /api/admin-orders/:id  (admin + manager) — атомарно ─────────────────
// Сравнивает поля, пишет детальные диффы, проверяет блокировку позиций.
router.put('/:id', verifyToken, requireRole('admin', 'manager'), async (req, res) => {
  const incoming = { ...req.body };
  for (const f of PROTECTED_FIELDS) delete incoming[f];

  try {
    const updated = await db.runTransaction(async (tx) => {
      const ref = db.collection(COL).doc(req.params.id);
      const snap = await tx.get(ref);
      if (!snap.exists) throw httpError(404, 'Заказ не найден');
      const order = snap.data();
      const now = new Date().toISOString();

      const itemsChanged = hasItemChanges(order.items, incoming.items);
      if (itemsChanged && !canEditItems(order)) {
        throw httpError(403, 'Позиции заблокированы: заказ в работе. Разблокируйте с указанием причины.');
      }

      // Если позиции переданы — пересчитываем цены из каталога (анти-тамперинг).
      // Все чтения (tx.get товаров) идут до записи tx.set ниже.
      if (Array.isArray(incoming.items)) {
        const products = await loadProductsFor(incoming.items, (ref2) => tx.get(ref2));
        const { items, itemsTotal } = priceOrderItems(incoming.items, products);
        const deliveryFee = incoming.deliveryFee ?? order.deliveryFee;
        const discount = incoming.discount ?? order.discount;
        incoming.items = items;
        incoming.totalAmount = orderTotal(itemsTotal, deliveryFee, discount);
        incoming.paidAmount = incoming.totalAmount;  // долг отменён
        incoming.balance = 0;
      }

      const diffs = computeFieldDiffs(order, incoming);
      const entries = diffs.map((d) => ({
        at: now, by: req.user.email, action: 'edit', field: d.field, from: d.from, to: d.to,
      }));

      const next = {
        ...order,
        ...incoming,
        id: req.params.id,
        updatedAt: now,
        history: [...(order.history || []), ...entries],
      };
      // Разовое разрешение на правку позиций сбрасывается после сохранения.
      if (itemsChanged) next.itemsUnlocked = false;

      tx.set(ref, next);
      return next;
    });
    res.json(updated);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: 'Ошибка обновления заказа' });
  }
});

// ─── PATCH /api/admin-orders/:id/status — атомарно ───────────────────────────
router.patch('/:id/status', verifyToken, requireRole('admin', 'manager', 'executor'), async (req, res) => {
  const { status: to } = req.body;
  try {
    const updated = await db.runTransaction(async (tx) => {
      const ref = db.collection(COL).doc(req.params.id);
      const snap = await tx.get(ref);
      if (!snap.exists) throw httpError(404, 'Заказ не найден');
      const order = snap.data();
      const from = order.status;

      if (!canTransition(req.user.role, from, to)) {
        throw httpError(403, `Роль ${req.user.role} не может перевести из "${from}" в "${to}"`);
      }

      const now = new Date().toISOString();
      const history = [...(order.history || []), { at: now, by: req.user.email, action: 'status', from, to }];
      tx.update(ref, { status: to, updatedAt: now, history });
      return { ...order, status: to, updatedAt: now, history };
    });
    res.json(updated);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: 'Ошибка обновления статуса' });
  }
});

// ─── PATCH /api/admin-orders/:id/unlock  (admin + manager) — атомарно ────────
// Разовое снятие блокировки позиций с обязательной причиной (пишется в лог).
router.patch('/:id/unlock', verifyToken, requireRole('admin', 'manager'), async (req, res) => {
  const reason = (req.body.reason || '').trim();
  if (!reason) return res.status(400).json({ error: 'Укажите причину разблокировки' });

  try {
    const updated = await db.runTransaction(async (tx) => {
      const ref = db.collection(COL).doc(req.params.id);
      const snap = await tx.get(ref);
      if (!snap.exists) throw httpError(404, 'Заказ не найден');
      const order = snap.data();
      const now = new Date().toISOString();
      const history = [...(order.history || []), { at: now, by: req.user.email, action: 'unlock', reason }];
      tx.update(ref, { itemsUnlocked: true, updatedAt: now, history });
      return { ...order, itemsUnlocked: true, updatedAt: now, history };
    });
    res.json(updated);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: 'Ошибка разблокировки' });
  }
});

// ─── DELETE /api/admin-orders/:id  (admin only) ──────────────────────────────
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    await db.collection(COL).doc(req.params.id).delete();
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Ошибка удаления заказа' });
  }
});

module.exports = router;
