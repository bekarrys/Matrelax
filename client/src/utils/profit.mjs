// Чистая логика анализа маржи. Без React — тестируется node:test.
// Маржа = Рыночная цена (снапшот на момент продажи) − Цена продажи.
// «Потерянная прибыль при скидках»: насколько ниже рынка продали.

function num(v) {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

// Разворачивает заказы в плоский список строк по позициям.
export function orderProfitRows(orders = []) {
  const rows = [];
  for (const order of orders) {
    for (const item of order.items || []) {
      const qty = num(item.quantity) ?? 1;
      const sale = num(item.price) ?? 0;
      const market = num(item.marketPrice); // null если снапшота нет (старые заказы)
      const hasMarket = market !== null;
      const margin = hasMarket ? market - sale : null;
      rows.push({
        orderId: order.id,
        orderNumber: order.orderNumber || order.id,
        date: order.createdAt || null,
        name: item.name || item.modelId || '—',
        size: item.size || '',
        fabric: item.fabric || '',
        quantity: qty,
        sale,
        market,
        hasMarket,
        margin,
        lineRevenue: sale * qty,
        lineMargin: hasMarket ? margin * qty : 0,
      });
    }
  }
  return rows;
}

export function profitTotals(rows = []) {
  let revenue = 0;
  let margin = 0;
  let lossCount = 0;
  for (const r of rows) {
    revenue += r.lineRevenue;
    if (r.hasMarket) {
      margin += r.lineMargin;
      if (r.margin < 0) lossCount += 1;
    }
  }
  return { revenue, margin, lossCount };
}
