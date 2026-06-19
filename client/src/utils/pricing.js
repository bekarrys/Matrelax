// Pure price resolver shared by storefront card, product detail, and cart.
// New model: prices[ткань][размер] = number. Legacy fallback: sizes[].price.

export const sizeKey = (w, h) => `${w}x${h}`;

export function getPrice(product, fabric, size) {
  const cell = product?.prices?.[fabric]?.[size];
  return typeof cell === 'number' ? cell : 0;
}

export function getMinPrice(product) {
  const matrix = product?.prices;
  if (matrix && typeof matrix === 'object') {
    const vals = [];
    for (const fabric of Object.keys(matrix)) {
      for (const size of Object.keys(matrix[fabric] || {})) {
        const v = matrix[fabric][size];
        if (typeof v === 'number' && v > 0) vals.push(v);
      }
    }
    if (vals.length) return Math.min(...vals);
  }
  // legacy fallback
  const legacy = (product?.sizes || [])
    .map((s) => s.price)
    .filter((p) => typeof p === 'number' && p > 0);
  return legacy.length ? Math.min(...legacy) : 0;
}

// Returns [{fabric, size}] for every expected cell that is missing or <= 0.
export function priceMatrixIssues(product) {
  const issues = [];
  const fabrics = product?.fabricOptions || [];
  const sizes = product?.sizes || [];
  for (const fabric of fabrics) {
    for (const s of sizes) {
      const key = sizeKey(s.width, s.height);
      const v = product?.prices?.[fabric]?.[key];
      if (typeof v !== 'number' || v <= 0) issues.push({ fabric, size: key });
    }
  }
  return issues;
}
