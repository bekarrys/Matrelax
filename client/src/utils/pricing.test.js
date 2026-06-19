import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getMinPrice, getPrice, getMarketPrice, getPrices, getMarketPrices, priceMatrixIssues, orderItemPrice } from './pricing.js';

const product = {
  fabricOptions: ['Стандарт', 'Люкс'],
  sizes: [{ width: 80, height: 200 }, { width: 200, height: 200 }],
  prices: {
    'Стандарт': { '80x200': 23000, '200x200': 44000 },
    'Люкс': { '80x200': 30000, '200x200': 58000 },
  },
  marketPrices: {
    'Стандарт': { '80x200': 30000, '200x200': 51000 },
    'Люкс': { '80x200': 37000, '200x200': 65000 },
  },
};

test('getMinPrice returns cheapest leaf', () => {
  assert.equal(getMinPrice(product), 23000);
});

test('getPrice resolves fabric+size', () => {
  assert.equal(getPrice(product, 'Люкс', '200x200'), 58000);
});

test('getPrice returns 0 for missing cell', () => {
  assert.equal(getPrice(product, 'Люкс', '999x999'), 0);
});

test('priceMatrixIssues empty when complete', () => {
  assert.deepEqual(priceMatrixIssues(product), []);
});

test('priceMatrixIssues flags missing/zero cell', () => {
  const bad = { ...product, prices: { ...product.prices, 'Люкс': { '80x200': 0, '200x200': 58000 } } };
  assert.deepEqual(priceMatrixIssues(bad), [{ fabric: 'Люкс', size: '80x200' }]);
});

test('getMinPrice handles legacy sizes[].price fallback', () => {
  const legacy = { sizes: [{ width: 80, height: 200, price: 15000 }] };
  assert.equal(getMinPrice(legacy), 15000);
});

test('getMarketPrice resolves market matrix', () => {
  assert.equal(getMarketPrice(product, 'Люкс', '200x200'), 65000);
});

test('getMinPrice uses sale prices, not market', () => {
  assert.equal(getMinPrice(product), 23000);
});

test('getPrices / getMarketPrices are defensive on bad input', () => {
  assert.deepEqual(getPrices({}), {});
  assert.deepEqual(getMarketPrices({ marketPrices: null }), {});
  assert.deepEqual(getPrices({ prices: [] }), {});
});

test('orderItemPrice without +10см', () => {
  const p = { ...product, surcharge10cm: 7000 };
  assert.deepEqual(orderItemPrice(p, 'Стандарт', '80x200', false), { price: 23000, marketPrice: 30000 });
});

test('orderItemPrice with +10см folds surcharge into both', () => {
  const p = { ...product, surcharge10cm: 7000 };
  assert.deepEqual(orderItemPrice(p, 'Люкс', '200x200', true), { price: 65000, marketPrice: 72000 });
});

test('orderItemPrice on missing cell returns zeros', () => {
  const p = { ...product, surcharge10cm: 7000 };
  assert.deepEqual(orderItemPrice(p, 'Люкс', '999x999', true), { price: 0, marketPrice: 0 });
});

test('priceMatrixIssues checks marketPrices when asked', () => {
  const bad = { ...product, marketPrices: { ...product.marketPrices, 'Люкс': { '80x200': 0, '200x200': 65000 } } };
  assert.deepEqual(priceMatrixIssues(bad, 'marketPrices'), [{ fabric: 'Люкс', size: '80x200' }]);
  assert.deepEqual(priceMatrixIssues(bad, 'prices'), []);
});
