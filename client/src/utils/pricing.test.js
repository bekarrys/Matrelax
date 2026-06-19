import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getMinPrice, getPrice, priceMatrixIssues } from './pricing.js';

const product = {
  fabricOptions: ['Стандарт', 'Люкс'],
  sizes: [{ width: 80, height: 200 }, { width: 200, height: 200 }],
  prices: {
    'Стандарт': { '80x200': 23000, '200x200': 44000 },
    'Люкс': { '80x200': 30000, '200x200': 58000 },
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
