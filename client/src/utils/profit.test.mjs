import { test } from 'node:test';
import assert from 'node:assert/strict';
import { orderProfitRows, profitTotals } from './profit.mjs';

const orders = [
  {
    id: '2026-06-17-001', orderNumber: 'Madeniyet-001', createdAt: '2026-06-17T10:00:00Z',
    items: [
      { name: '500', size: '160×200', fabric: 'Стандарт', price: 30000, marketPrice: 37000, quantity: 2 },
      { name: '707', size: '80×200', fabric: 'Люкс', price: 35000, marketPrice: 42000, quantity: 1 },
    ],
  },
  {
    id: '2026-06-17-002', orderNumber: 'Madeniyet-002', createdAt: '2026-06-17T11:00:00Z',
    items: [
      { name: 'R-01', size: '200×200', fabric: 'Royal', price: 200000, marketPrice: 196000, quantity: 1 }, // продали выше рынка → маржа < 0
      { name: 'old', size: '90×200', price: 25000, quantity: 1 }, // нет marketPrice (старый заказ)
    ],
  },
];

test('orderProfitRows flattens items with margin', () => {
  const rows = orderProfitRows(orders);
  assert.equal(rows.length, 4);
  assert.equal(rows[0].margin, 7000);
  assert.equal(rows[0].lineMargin, 14000);
  assert.equal(rows[2].margin, -4000); // 196000 - 200000
  assert.equal(rows[3].hasMarket, false);
  assert.equal(rows[3].margin, null);
});

test('profitTotals sums revenue and margin, counts losses', () => {
  const rows = orderProfitRows(orders);
  const t = profitTotals(rows);
  // revenue = 30000*2 + 35000 + 200000 + 25000
  assert.equal(t.revenue, 60000 + 35000 + 200000 + 25000);
  // margin = 7000*2 + 7000 + (-4000) , старый заказ без рынка не считается
  assert.equal(t.margin, 14000 + 7000 - 4000);
  assert.equal(t.lossCount, 1);
});

test('handles empty input', () => {
  assert.deepEqual(orderProfitRows([]), []);
  assert.deepEqual(profitTotals([]), { revenue: 0, margin: 0, lossCount: 0 });
});
