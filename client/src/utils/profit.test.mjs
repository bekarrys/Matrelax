import { test } from 'node:test';
import assert from 'node:assert/strict';
import { orderProfitRows, profitTotals } from './profit.mjs';

const orders = [
  {
    id: '2026-06-17-001', orderNumber: 'Madeniyet-001', createdAt: '2026-06-17T10:00:00Z',
    items: [
      // продали по рыночной цене 37000, real = 30000 → доход = 7000
      { name: '500', size: '160×200', fabric: 'Стандарт', price: 37000, marketPrice: 37000, quantity: 2 },
      // продали по реальной цене 35000 (= 42000-7000) → доход = 0
      { name: '707', size: '80×200', fabric: 'Люкс', price: 35000, marketPrice: 42000, quantity: 1 },
    ],
  },
  {
    id: '2026-06-17-002', orderNumber: 'Madeniyet-002', createdAt: '2026-06-17T11:00:00Z',
    items: [
      // продали 185000, real = 196000-7000 = 189000 → доход = -4000 (убыток)
      { name: 'R-01', size: '200×200', fabric: 'Royal', price: 185000, marketPrice: 196000, quantity: 1 },
      // старый заказ без снапшота рыночной цены
      { name: 'old', size: '90×200', price: 25000, quantity: 1 },
    ],
  },
];

test('orderProfitRows computes realPrice and income', () => {
  const rows = orderProfitRows(orders);
  assert.equal(rows.length, 4);
  assert.equal(rows[0].realPrice, 30000);
  assert.equal(rows[0].income, 7000);
  assert.equal(rows[0].lineIncome, 14000);
  assert.equal(rows[1].income, 0);
  assert.equal(rows[2].realPrice, 189000);
  assert.equal(rows[2].income, -4000);
  assert.equal(rows[3].hasMarket, false);
  assert.equal(rows[3].income, null);
});

test('profitTotals sums revenue and income, counts losses (income <= 0)', () => {
  const rows = orderProfitRows(orders);
  const t = profitTotals(rows);
  // revenue = 37000*2 + 35000 + 185000 + 25000
  assert.equal(t.revenue, 74000 + 35000 + 185000 + 25000);
  // income = 7000*2 + 0 + (-4000); старый заказ не учитывается
  assert.equal(t.income, 14000 + 0 - 4000);
  // убыток (income <= 0): позиция 707 (income 0) и R-01 (income -4000) = 2
  assert.equal(t.lossCount, 2);
});

test('handles empty input', () => {
  assert.deepEqual(orderProfitRows([]), []);
  assert.deepEqual(profitTotals([]), { revenue: 0, income: 0, lossCount: 0 });
});
