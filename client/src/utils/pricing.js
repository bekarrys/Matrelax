// Pure price resolver shared by storefront card, product detail, cart, analytics.
// Model: prices[ткань][размер] (реальная цена продажи) and
//        marketPrices[ткань][размер] (рекомендованная рыночная цена).
// Legacy fallback for getMinPrice: sizes[].price.

export const sizeKey = (w, h) => `${w}x${h}`;

function asMatrix(m) {
  return m && typeof m === 'object' && !Array.isArray(m) ? m : {};
}

// Защитные геттеры матриц — никогда не кидают, всегда возвращают объект.
export function getPrices(product) {
  return asMatrix(product?.prices);
}
export function getMarketPrices(product) {
  return asMatrix(product?.marketPrices);
}

function cellFrom(matrix, fabric, size) {
  const v = matrix?.[fabric]?.[size];
  return typeof v === 'number' ? v : 0;
}

export function getPrice(product, fabric, size) {
  return cellFrom(getPrices(product), fabric, size);
}
export function getMarketPrice(product, fabric, size) {
  return cellFrom(getMarketPrices(product), fabric, size);
}

// Зеркало server/utils/pricing.js: нестандартная ширина округляется ВВЕРХ до
// ближайшего стандарта (78→80), свыше максимума — максимум. Высота точная.
// Клиент использует это для предпросмотра цены; сервер — источник правды.
export function resolveSizeKey(product, fabric, width, height) {
  const exact = sizeKey(width, height);
  const f = getPrices(product)[fabric];
  if (f && typeof f[exact] === 'number') return exact;
  const sizes = Object.keys(f || {})
    .map((k) => { const [w, h] = k.split('x').map(Number); return { w, h, key: k }; })
    .filter((s) => s.h === height)
    .sort((a, b) => a.w - b.w);
  if (!sizes.length) return exact;
  const up = sizes.find((s) => s.w >= width);
  return (up || sizes[sizes.length - 1]).key;
}

export function getMinPrice(product) {
  const matrix = getPrices(product);
  const vals = [];
  for (const fabric of Object.keys(matrix)) {
    for (const size of Object.keys(matrix[fabric] || {})) {
      const v = matrix[fabric][size];
      if (typeof v === 'number' && v > 0) vals.push(v);
    }
  }
  if (vals.length) return Math.min(...vals);
  // legacy fallback
  const legacy = (product?.sizes || [])
    .map((s) => s.price)
    .filter((p) => typeof p === 'number' && p > 0);
  return legacy.length ? Math.min(...legacy) : 0;
}

// Пересчёт позиции заказа из живого каталога. Наценка +10см складывается
// внутрь цены (конвенция витрины: surcharge хранится отдельно как 0).
// Возвращает { price, marketPrice } — обе с учётом +10см.
export function orderItemPrice(product, fabric, size, extra10cm) {
  const surcharge = extra10cm ? (Number(product?.surcharge10cm) || 0) : 0;
  const base = getPrice(product, fabric, size);
  const marketBase = getMarketPrice(product, fabric, size);
  return {
    price: base ? base + surcharge : 0,
    marketPrice: marketBase ? marketBase + surcharge : 0,
  };
}

// Returns [{fabric, size}] for every expected cell that is missing or <= 0.
// `field` selects which matrix to check: 'prices' (default) or 'marketPrices'.
export function priceMatrixIssues(product, field = 'prices') {
  const issues = [];
  const fabrics = product?.fabricOptions || [];
  const sizes = product?.sizes || [];
  const matrix = field === 'marketPrices' ? getMarketPrices(product) : getPrices(product);
  for (const fabric of fabrics) {
    for (const s of sizes) {
      const key = sizeKey(s.width, s.height);
      const v = matrix?.[fabric]?.[key];
      if (typeof v !== 'number' || v <= 0) issues.push({ fabric, size: key });
    }
  }
  return issues;
}
