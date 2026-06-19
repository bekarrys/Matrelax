# Tiered-Pricing Mattress Catalog — Design

**Date:** 2026-06-17
**Status:** Approved (pending spec review)

## Problem

The real Matrelax catalog (16 mattress models, source: `Cost.md`) prices each
model along **two dimensions**: the **ткань / tier** (Стандарт, Комфорт, Премиум,
Люкс) and the **размер** (80×200 … 200×200). Price = f(ткань, размер).

The current shop only supports a single price per size (`sizes: [{width, height,
price}]`); the existing "ткань" selector does **not** affect price. The storefront
is also seeded with 25 fake demo products (beds, pillows, toppers, protectors, and
old demo mattresses Elite/LUX/Royal/etc.) that must be replaced.

## Goal

Replace the demo catalog with the 16 real mattresses and make price depend on
**ткань × размер**, end-to-end (storefront, admin panel, server).

## Scope

- **In:** 16 mattresses only (category `mattresses`), tiered pricing, admin grid
  editor, server field whitelist + validation, seed script.
- **Out:** other categories (pillows/toppers/protectors/beds) — removed for now.
  No payment/order-flow changes. No new fabric "material" dimension (velour/
  jacquard) — data has none; structure stays extensible if added later.

## The 16 models

`500, 504, 702, 707, K-01, K-02, K-03, L-01, L-02, Z-00, Z-01, Z-02, Z-03,
R-01, R-02, R-03`

Series grouping (filter label; editable in panel later):

| Серия | Модели |
|---|---|
| Боннельные | 500, 504 |
| Беспружинные | 707 |
| Зима-Лето | 702, Z-00, Z-01, Z-02, Z-03 |
| Ортопедические | K-01, K-02, K-03, L-01, L-02 |
| Royal | R-01, R-02, R-03 |

## Data model (Firestore `products`)

Price is **no longer** a flat `price: number`. Each product carries a nested
price object keyed `prices[ткань][размер] = number`:

```json
{
  "id": "500",
  "name": "500",
  "series": "Боннельные",
  "category": "mattresses",
  "specs": {
    "type": "Боннельный, Полу-ортопед",
    "firmness": "Жесткий",
    "height": "20-24см",
    "load": "90кг",
    "warranty": "-",
    "serviceLife": "10 лет"
  },
  "composition": ["Кокосовая койра", "Термовойлок", "Пружинный Боннель"],
  "fabricOptions": ["Стандарт", "Комфорт", "Премиум", "Люкс"],
  "sizes": [
    { "width": 80,  "height": 200 },
    { "width": 90,  "height": 200 },
    { "width": 100, "height": 200 },
    { "width": 120, "height": 200 },
    { "width": 140, "height": 200 },
    { "width": 160, "height": 200 },
    { "width": 180, "height": 200 },
    { "width": 200, "height": 200 }
  ],
  "prices": {
    "Стандарт": { "80x200": 23000, "90x200": 25000, "100x200": 27000, "120x200": 30000, "140x200": 34000, "160x200": 37000, "180x200": 40000, "200x200": 44000 },
    "Комфорт":  { "80x200": 25000, "90x200": 27000, "100x200": 29000, "120x200": 33000, "140x200": 37000, "160x200": 40000, "180x200": 44000, "200x200": 48000 },
    "Премиум":  { "80x200": 29000, "90x200": 31000, "100x200": 34000, "120x200": 37000, "140x200": 42000, "160x200": 46000, "180x200": 50000, "200x200": 55000 },
    "Люкс":     { "80x200": 30000, "90x200": 33000, "100x200": 36000, "120x200": 40000, "140x200": 45000, "160x200": 49000, "180x200": 53000, "200x200": 58000 }
  },
  "extra10cm": true,
  "surcharge10cm": 7000,
  "imageUrl": "",
  "isActive": true,
  "inStock": true
}
```

Notes:
- **Keys:** ткань keys = display names (`Стандарт`…), size keys = `"{width}x{height}"`.
  `fabricOptions === Object.keys(prices)`.
- **Royal (R-01/02/03):** single ткань `"Royal"` → `prices: { "Royal": { ... } }`,
  `fabricOptions: ["Royal"]`. Per Cost.md all three R models share the same price set.
- **`sizes`** holds only the size list (no price); price lives in `prices`.
- **`+10см`:** `extra10cm: true`, `surcharge10cm: 7000` for all (from the 707 sheet;
  per-model override possible later). Surcharge is added on top of the matrix price
  regardless of ткань/размер.
- **B-2 tier** in Cost.md duplicates Премиум (header "C-3/B-2"); not stored separately.

## Behavior

### Storefront card — "от N ₸"
`minPrice = min(all leaf values of prices)`. Computed on the **frontend** from the
loaded product (fast, no extra server call). Replaces the current
`Math.min(...sizes.map(s => s.price))`.

### Product detail page
1. Select **ткань** (default: first in `fabricOptions`, i.e. Стандарт).
2. Select **размер** (default: first size).
3. `currentPrice = prices[fabric][sizeKey] + (extra10cm ? surcharge10cm : 0)`.
4. Custom size (свой размер): keeps the selected size's matrix price (current
   behavior preserved — custom dimensions reuse the chosen size's price).
5. Specs panel extended to render: тип, жёсткость, высота, нагрузка, гарантия,
   срок службы, состав (current panel only handles hardness/height/warranty).

### Cart / orders (snapshot)
Unchanged in mechanism. On "добавить в корзину", the resolved `currentPrice` is
written into `item.price` as a **fixed number** — an order is a price snapshot and
does not change if catalog prices change later. Cart already keys items by
`fabric`, so tiers de-duplicate correctly.

### Admin panel — product editor (grid)
Replace the flat "Размеры и цены" list with a **price grid**:
- Rows = ткани (`fabricOptions`), Columns = размеры (`sizes`), cells = price inputs.
- Manager edits cells directly; the editor serializes back to `prices[ткань][размер]`.
- Add/remove ткань (row) and add/remove размер (column) supported.

### Validation ("Валидация ткани")
- **Server:** when saving a `mattresses` product with `prices`, every
  `ткань × размер` cell present in `fabricOptions × sizes` must be a positive
  number. Reject save with a clear error if any cell is missing / 0 / null.
- **Admin UI:** highlight empty/zero cells and block "Сохранить" (and prevent
  setting `isActive: true`) until the grid is complete. Goal: never publish a
  product with a 0/null price.

## Files affected

- `server/routes/products.js` — add `prices`, `composition` to `ALLOWED_FIELDS`;
  add `validateProductTypes`/matrix validation (reject incomplete price grid).
- `server/scripts/` — new seed script: delete demo products, insert the 16 models
  parsed from the Cost.md data.
- `client/src/components/ProductCard/ProductCard.jsx` — minPrice from `prices`.
- `client/src/pages/ProductDetail/ProductDetail.jsx` — ткань-driven price, extended
  specs/composition rendering.
- `client/src/pages/ProductEditor/ProductEditor.jsx` — price grid editor + cell
  validation.
- Backward-compat helper: a small `getMinPrice(product)` / `getPrice(product,
  fabric, size)` util so card/detail share one price resolver and old `sizes[].price`
  products (if any survive) still render. (Demo products are deleted, so this is
  mainly defensive.)

## Images

Wire `imageUrl` for models with an existing badge asset
(`707, L-01, L-02, R-01, R-02, R-03, Z-00, Z-01, Z-02, Z-03`). Leave
`500, 504, 702, K-01, K-02, K-03` with empty `imageUrl` (placeholder icon shows);
owner adds logos later.

## Testing

- Server: validation rejects a product whose grid has a missing/0 cell; accepts a
  complete grid; `activeOnly=1` still filters hidden products.
- Frontend: card shows correct `от N ₸`; changing ткань updates price; adding to
  cart snapshots the resolved price.
- Seed: after running, exactly 16 active mattresses, 0 demo products remain.

## Open items / assumptions (confirm on review)

1. `+10см = 7000` for all models (from 707 sheet). Adjust per model if needed.
2. Series labels are a first pass; renamable in panel.
3. Demo products are **deleted** (not hidden), per "clean catalog" preference.
