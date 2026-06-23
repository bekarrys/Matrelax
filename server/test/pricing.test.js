const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseSize, priceItem, priceOrderItems, orderTotal } = require('../utils/pricing');

const product = {
  id: '707',
  surcharge10cm: 7000,
  prices: { Стандарт: { '90x200': 30000, '100x200': 33000 } },
  marketPrices: { Стандарт: { '90x200': 37000, '100x200': 40000 } },
};

test('parseSize: разбирает × (U+00D7), x и кириллицу', () => {
  assert.deepEqual(parseSize('90×200'), { width: 90, height: 200 });
  assert.deepEqual(parseSize('90x200'), { width: 90, height: 200 });
  assert.deepEqual(parseSize('90х200'), { width: 90, height: 200 });
  assert.deepEqual(parseSize({ width: 90, height: 200 }), { width: 90, height: 200 });
});

test('priceItem: цена из матрицы по витринному размеру "90×200"', () => {
  const r = priceItem(product, 'Стандарт', '90×200', false);
  assert.equal(r.price, 30000);
  assert.equal(r.marketPrice, 37000);
  assert.equal(r.resolvedKey, '90x200');
});

test('priceItem: extra10cm добавляет surcharge10cm к обеим ценам', () => {
  const r = priceItem(product, 'Стандарт', '90×200', true);
  assert.equal(r.price, 37000);
  assert.equal(r.marketPrice, 44000);
});

test('priceItem: нестандартная ширина округляется вверх до ближайшего стандарта', () => {
  // матрица Стандарт: 90, 100
  assert.equal(priceItem(product, 'Стандарт', '85×200', false).price, 30000);   // 85→90
  assert.equal(priceItem(product, 'Стандарт', '95×200', false).price, 33000);   // 95→100
  assert.equal(priceItem(product, 'Стандарт', '95×200', false).resolvedKey, '100x200');
});

test('priceItem: ширина свыше максимума → цена максимума (cap)', () => {
  assert.equal(priceItem(product, 'Стандарт', '140×200', false).price, 33000);  // >100 → 100
});

test('priceItem: ткань вне матрицы → price 0', () => {
  assert.equal(priceItem(product, 'Премиум', '90×200', false).price, 0);
});

test('priceOrderItems: пересчитывает цену и количество, считает итог', () => {
  const { items, itemsTotal } = priceOrderItems(
    [{ modelId: '707', fabric: 'Стандарт', size: '90×200', quantity: 2, price: 1 }],
    { 707: product }
  );
  assert.equal(items[0].price, 30000);
  assert.equal(items[0].surcharge, 0);
  assert.equal(items[0].quantity, 2);
  assert.equal(itemsTotal, 60000);
});

test('priceOrderItems: игнорирует цену клиента (анти-тамперинг)', () => {
  const { itemsTotal } = priceOrderItems(
    [{ modelId: '707', fabric: 'Стандарт', size: '90×200', quantity: 1, price: 1 }],
    { 707: product }
  );
  assert.equal(itemsTotal, 30000);
});

test('priceOrderItems: товар не в каталоге → 400', () => {
  assert.throws(
    () => priceOrderItems([{ modelId: 'X', fabric: 'Стандарт', size: '90×200' }], {}),
    (e) => e.status === 400
  );
});

test('priceOrderItems: нет цены для ткань×размер → 400', () => {
  assert.throws(
    () => priceOrderItems([{ modelId: '707', fabric: 'Премиум', size: '90×200' }], { 707: product }),
    (e) => e.status === 400
  );
});

test('orderTotal: позиции + доставка − скидка, не отрицательный', () => {
  assert.equal(orderTotal(60000, 2000, 5000), 57000);
  assert.equal(orderTotal(10000, 0, 99999), 0);
});
