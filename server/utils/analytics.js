/**
 * analytics.js — чистая агрегация для админ-дашборда: «День | Неделя | Месяц».
 *
 * Метрики: выручка (сумма totalAmount), количество заказов, средний чек.
 * Границы периодов считаются в UTC, чтобы совпадать с ISO-строками createdAt.
 */

function startOfDayUTC(d) {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

/**
 * Границы периода [from, to) в ISO для запроса по createdAt.
 *   day   — календарный день, содержащий `now`
 *   week  — неделя с понедельника (ISO), содержащая `now`
 *   month — календарный месяц, содержащий `now`
 */
function periodRange(period, now = new Date()) {
  const today = startOfDayUTC(now);

  if (period === 'day') {
    const to = new Date(today);
    to.setUTCDate(to.getUTCDate() + 1);
    return { from: today.toISOString(), to: to.toISOString(), label: today.toISOString().slice(0, 10) };
  }

  if (period === 'week') {
    const mondayOffset = (today.getUTCDay() + 6) % 7; // Пн=0 … Вс=6
    const from = new Date(today);
    from.setUTCDate(from.getUTCDate() - mondayOffset);
    const to = new Date(from);
    to.setUTCDate(to.getUTCDate() + 7);
    return {
      from: from.toISOString(),
      to: to.toISOString(),
      label: `${from.toISOString().slice(0, 10)} — ${new Date(to.getTime() - 86400000).toISOString().slice(0, 10)}`,
    };
  }

  if (period === 'month') {
    const from = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
    const to = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1));
    return { from: from.toISOString(), to: to.toISOString(), label: from.toISOString().slice(0, 7) };
  }

  throw new Error(`Неверный период: "${period}". Ожидается day|week|month`);
}

/** Сводка по набору заказов. */
function summarize(orders) {
  const orderCount = orders.length;
  const revenue = orders.reduce((s, o) => s + (o.totalAmount || 0), 0);
  const paid = orders.reduce((s, o) => s + (o.paidAmount || 0), 0);
  const avgCheck = orderCount ? Math.round(revenue / orderCount) : 0;
  return { orderCount, revenue, paid, avgCheck };
}

module.exports = { startOfDayUTC, periodRange, summarize };
