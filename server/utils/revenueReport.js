/**
 * getRevenueReport(period) — отчёт по выручке из коллекции shopOrders.
 *
 * Принимает период в виде строки:
 *   '2026-05-29' → день
 *   '2026-05'    → месяц
 *   '2026'       → год
 *
 * "Оплаченный заказ" — paidAmount >= totalAmount > 0.
 * Функция работает через Admin SDK: Firestore Security Rules обходятся
 * на серверной стороне. Ограничение доступа — на уровне HTTP-роутера
 * (verifyToken + requireRole).
 */

const { db } = require('./firebase');

const COL = 'shopOrders';

// ─── Разбор периода ──────────────────────────────────────────────────────────

function parsePeriod(period) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(period)) {
    const d = new Date(period + 'T00:00:00.000Z');
    d.setUTCDate(d.getUTCDate() + 1);
    return {
      type:  'day',
      label: period,
      from:  period + 'T00:00:00.000Z',
      to:    d.toISOString().split('T')[0] + 'T00:00:00.000Z',
    };
  }

  if (/^\d{4}-\d{2}$/.test(period)) {
    const [y, m] = period.split('-').map(Number);
    const nextY  = m === 12 ? y + 1 : y;
    const nextM  = m === 12 ? 1     : m + 1;
    return {
      type:  'month',
      label: period,
      from:  `${period}-01T00:00:00.000Z`,
      to:    `${nextY}-${String(nextM).padStart(2, '0')}-01T00:00:00.000Z`,
    };
  }

  if (/^\d{4}$/.test(period)) {
    return {
      type:  'year',
      label: period,
      from:  `${period}-01-01T00:00:00.000Z`,
      to:    `${Number(period) + 1}-01-01T00:00:00.000Z`,
    };
  }

  throw new Error(
    `Неверный формат периода: "${period}". Ожидается YYYY-MM-DD, YYYY-MM или YYYY`
  );
}

// ─── Разбивка по подпериодам ─────────────────────────────────────────────────

function buildBreakdown(orders, type) {
  const map = {};

  for (const o of orders) {
    let key;
    if (type === 'day')   key = o.createdAt.slice(0, 10); // час не нужен
    if (type === 'month') key = o.createdAt.slice(0, 10); // по дням внутри месяца
    if (type === 'year')  key = o.createdAt.slice(0, 7);  // по месяцам внутри года

    if (!map[key]) map[key] = { period: key, totalRevenue: 0, paidCount: 0, totalOrders: 0 };
    map[key].totalOrders++;

    const paid = (o.paidAmount ?? 0) >= (o.totalAmount ?? 0) && (o.totalAmount ?? 0) > 0;
    if (paid) {
      map[key].totalRevenue += o.totalAmount;
      map[key].paidCount++;
    }
  }

  return Object.values(map).sort((a, b) => a.period.localeCompare(b.period));
}

// ─── Основная функция ────────────────────────────────────────────────────────

async function getRevenueReport(period) {
  const { type, label, from, to } = parsePeriod(period);

  // Firestore range-запрос: тянем только документы нужного периода,
  // а не всю коллекцию. Требует индекс по createdAt (одиночный, создаётся автоматически).
  const snap = await db
    .collection(COL)
    .where('createdAt', '>=', from)
    .where('createdAt', '<',  to)
    .orderBy('createdAt', 'asc')
    .get();

  const orders = snap.docs.map(d => d.data());

  let totalRevenue = 0;
  let paidCount    = 0;
  let unpaidCount  = 0;

  for (const order of orders) {
    const total  = order.totalAmount ?? 0;
    const paid   = order.paidAmount  ?? 0;
    const isPaid = paid >= total && total > 0;

    if (isPaid) {
      totalRevenue += total;
      paidCount++;
    } else {
      unpaidCount++;
    }
  }

  return {
    period:      { type, value: label },
    totalOrders: orders.length,
    paidCount,
    unpaidCount,
    totalRevenue,
    breakdown:   buildBreakdown(orders, type),
  };
}

module.exports = { getRevenueReport };
