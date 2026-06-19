const { test } = require('node:test');
const assert = require('node:assert/strict');
const MATTRESSES = require('../scripts/data/mattresses');

test('exactly 16 models with unique ids', () => {
  assert.equal(MATTRESSES.length, 16);
  assert.equal(new Set(MATTRESSES.map((m) => m.id)).size, 16);
});

test('every cell of both matrices is a positive number', () => {
  for (const m of MATTRESSES) {
    for (const fabric of m.fabricOptions) {
      for (const s of m.sizes) {
        const key = `${s.width}x${s.height}`;
        const sale = m.prices[fabric][key];
        const market = m.marketPrices[fabric][key];
        assert.ok(typeof sale === 'number' && sale > 0, `sale ${m.id} ${fabric} ${key}`);
        assert.ok(typeof market === 'number' && market > 0, `market ${m.id} ${fabric} ${key}`);
      }
    }
  }
});

test('sale price = market price − 7000 for every cell', () => {
  for (const m of MATTRESSES) {
    for (const fabric of m.fabricOptions) {
      for (const s of m.sizes) {
        const key = `${s.width}x${s.height}`;
        assert.equal(m.marketPrices[fabric][key] - m.prices[fabric][key], 7000, `${m.id} ${fabric} ${key}`);
      }
    }
  }
});

test('Royal models use single Royal fabric', () => {
  for (const id of ['R-01', 'R-02', 'R-03']) {
    const m = MATTRESSES.find((x) => x.id === id);
    assert.deepEqual(m.fabricOptions, ['Royal']);
  }
});

test('non-Royal models use the 4 ткань tiers', () => {
  for (const m of MATTRESSES.filter((x) => !x.id.startsWith('R-'))) {
    assert.deepEqual(m.fabricOptions, ['Стандарт', 'Комфорт', 'Премиум', 'Люкс']);
  }
});
