// Чистая логика анализа дохода. Без React — тестируется node:test.
//
// Бизнес-формула (утверждена):
//   MarketPrice — рыночная цена (снапшот из заказа, поле item.marketPrice).
//   RealPrice   = MarketPrice − MARKET_MARKUP (реальная/базовая цена).
//   SalePrice   — фактическая цена продажи в заказе (снапшот, item.price).
//   Доход       = SalePrice − RealPrice.
// Расчёт ведётся по marketPrice, сохранённому в момент оформления, поэтому
// старые отчёты не меняются при обновлении цен в каталоге.

export const MARKET_MARKUP = 7000;

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
      const realPrice = hasMarket ? market - MARKET_MARKUP : null;
      const income = hasMarket ? sale - realPrice : null;
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
        realPrice,
        income,
        hasMarket,
        lineRevenue: sale * qty,
        lineIncome: hasMarket ? income * qty : 0,
      });
    }
  }
  return rows;
}

export function profitTotals(rows = []) {
  let revenue = 0;
  let income = 0;
  let lossCount = 0;
  for (const r of rows) {
    revenue += r.lineRevenue;
    if (r.hasMarket) {
      income += r.lineIncome;
      if (r.income <= 0) lossCount += 1;
    }
  }
  return { revenue, income, lossCount };
}
