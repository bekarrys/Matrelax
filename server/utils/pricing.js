// Серверный пересчёт цен заказа — единственный источник правды по деньгам.
// Цена НИКОГДА не берётся с клиента: сервер считает её из матрицы товара
// (prices[ткань][размер]) + surcharge10cm, чтобы клиент не мог подменить сумму.
// Чистый модуль без зависимостей — тестируется node:test.

const sizeKey = (w, h) => `${w}x${h}`;

function priceError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

function asMatrix(m) {
  return m && typeof m === 'object' && !Array.isArray(m) ? m : {};
}
const getPrices = (p) => asMatrix(p && p.prices);
const getMarketPrices = (p) => asMatrix(p && p.marketPrices);

function cell(matrix, fabric, size) {
  const v = matrix && matrix[fabric] && matrix[fabric][size];
  return typeof v === 'number' ? v : 0;
}

// Размер приходит строкой витрины ("90×200"), ключ матрицы — "90x200".
// Разделитель может быть x (лат.), × (U+00D7) или х (кир.). Парсим в {width,height}.
function parseSize(size) {
  if (size && typeof size === 'object') {
    return { width: Number(size.width) || 0, height: Number(size.height) || 0 };
  }
  const [w, h] = String(size || '').split(/[x×х]/i).map((s) => parseInt(s, 10));
  return { width: w || 0, height: h || 0 };
}

// Доступные размеры ткани в матрице (той же высоты), отсортированы по ширине.
function standardSizes(product, fabric, height) {
  const f = getPrices(product)[fabric] || {};
  return Object.keys(f)
    .map((k) => { const [w, h] = k.split('x').map(Number); return { w, h, key: k }; })
    .filter((s) => s.h === height)
    .sort((a, b) => a.w - b.w);
}

// Подбирает ключ матрицы для запрошенного размера. Точное совпадение → оно.
// Иначе округляет ШИРИНУ ВВЕРХ до ближайшего стандарта (защита маржи: 78→80),
// свыше максимума — максимум. Высота сопоставляется точно (матрица = ×200).
// Нет стандартов той же высоты → возвращает точный ключ (цены не будет → 400).
function resolveSizeKey(product, fabric, width, height) {
  const exact = sizeKey(width, height);
  const f = getPrices(product)[fabric];
  if (f && typeof f[exact] === 'number') return exact;
  const sizes = standardSizes(product, fabric, height);
  if (!sizes.length) return exact;
  const up = sizes.find((s) => s.w >= width);
  return (up || sizes[sizes.length - 1]).key;
}

// Цена одной позиции из матрицы товара. Нестандартная ширина округляется до
// ближайшего стандарта (resolveSizeKey). extra10cm добавляет surcharge10cm.
// Возвращает { price, marketPrice, resolvedKey } — цены с учётом наценки.
function priceItem(product, fabric, size, extra10cm) {
  const { width, height } = parseSize(size);
  const key = resolveSizeKey(product, fabric, width, height);
  const surcharge = extra10cm ? (Number(product && product.surcharge10cm) || 0) : 0;
  const base = cell(getPrices(product), fabric, key);
  const marketBase = cell(getMarketPrices(product), fabric, key);
  return {
    price: base ? base + surcharge : 0,
    marketPrice: marketBase ? marketBase + surcharge : 0,
    resolvedKey: key,
  };
}

// Пересчёт всех позиций заказа из живого каталога.
// items — массив позиций; products — карта { modelId: productDoc }.
// Бросает 400, если товара нет в каталоге или для пары ткань×размер нет цены.
// Возвращает { items: [...пересчитанные], itemsTotal }.
function priceOrderItems(items, products) {
  const list = Array.isArray(items) ? items : [];
  const recomputed = list.map((it) => {
    const product = products[it.modelId];
    if (!product) {
      throw priceError(400, `Товар не найден в каталоге: ${it.modelId}`);
    }
    const { price, marketPrice } = priceItem(product, it.fabric, it.size, it.extra10cm);
    if (!price) {
      throw priceError(400, `Нет цены для ${it.modelId} · ${it.fabric} · ${it.size}`);
    }
    const quantity = Math.max(1, Math.trunc(Number(it.quantity) || 1));
    // surcharge10cm уже внутри price (конвенция витрины), отдельное поле = 0.
    return { ...it, price, marketPrice, surcharge: 0, quantity };
  });
  const itemsTotal = recomputed.reduce((s, i) => s + i.price * i.quantity, 0);
  return { items: recomputed, itemsTotal };
}

// Итог заказа: позиции + доставка − скидка (никогда не отрицательный).
function orderTotal(itemsTotal, deliveryFee, discount) {
  const total = itemsTotal + (Number(deliveryFee) || 0) - (Number(discount) || 0);
  return Math.max(0, total);
}

module.exports = { sizeKey, parseSize, resolveSizeKey, priceItem, priceOrderItems, orderTotal };
