import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cartToOrderItems, cartTotal } from './orderMapping.mjs';

test('cartToOrderItems maps cart entries to admin order items', () => {
  const items = [
    { productId: 'p1', name: 'Royal R1', size: '160×200', fabric: 'Жаккард', extra10cm: true, price: 90000, quantity: 2 },
  ];
  assert.deepEqual(cartToOrderItems(items), [
    { name: 'Royal R1', modelId: 'p1', size: '160×200', extra10cm: true, quantity: 2, price: 90000, surcharge: 0 },
  ]);
});

test('cartToOrderItems defaults quantity to 1 and extra10cm to false', () => {
  const out = cartToOrderItems([{ productId: 'p2', name: 'L1', size: '140×190', price: 50000 }]);
  assert.equal(out[0].quantity, 1);
  assert.equal(out[0].extra10cm, false);
});

test('cartToOrderItems on empty cart returns empty array', () => {
  assert.deepEqual(cartToOrderItems([]), []);
});

test('cartTotal sums price * quantity', () => {
  assert.equal(cartTotal([
    { price: 1000, quantity: 2 },
    { price: 500, quantity: 3 },
  ]), 3500);
});
