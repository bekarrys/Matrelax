# Order Editor → Live Catalog — Design

**Date:** 2026-06-20
**Status:** Approved

## Problem

The catalog is live (16 mattresses in Firestore `products`, dual price matrices
`prices`/`marketPrices`). But the order editor (`OrderDetails.jsx`) still reads the
retired demo catalog `server/data/catalog/prices.json` via `api.catalog.get` /
`api.catalog.calculate`, and order items have **no fabric (ткань)** dimension — yet
price now depends on ткань×размер. Editing an existing order would pull ghost demo
models and wrong prices, breaking the margin analytics built on snapshots.

## Goal

Order editor computes prices from the live `products` catalog using the same pure
pricing util as the storefront. Add ткань to order items. Retire the old catalog
system entirely (no dead code).

## Decisions (confirmed)

1. **Price source:** client-side. Editor loads `api.products.list()` and computes
   with the shared util (`getPrice`/`getMarketPrice`). No server calc endpoint —
   one formula, shared with storefront (DRY).
2. **Legacy orders:** defensive. Viewing shows stored snapshot unchanged. In edit,
   if `modelId` is not among the 16 products, the model select shows a disabled
   "(старая модель: X)" entry; manager must re-pick модель → ткань → размер to
   recompute. Until then the stored price/marketPrice stay.
3. **Cleanup scope:** remove the old catalog system fully — `api.catalog`, server
   `/catalog` route + `routes/catalog.js`, `server/data/catalog/prices.json`, the
   "Каталог цен" section in Settings, and the prices.json block in `scripts/migrate.js`.

## Design

### Pure helper (testable)
`client/src/utils/pricing.js` gains:
```
orderItemPrice(product, fabric, sizeKey, extra10cm) -> { price, marketPrice }
```
where `price = getPrice(product,fabric,sizeKey) + (extra10cm ? surcharge10cm : 0)`
and `marketPrice = getMarketPrice(...) + (extra10cm ? surcharge10cm : 0)`. Returns
`{ price: 0, marketPrice: 0 }` defensively when cells are missing.

### Order editor (`OrderDetails.jsx`)
- On mount: `api.products.list()` → `products` (replace `api.catalog.get()`).
- Editable item row dropdowns: **Модель** (products), **Ткань**
  (`product.fabricOptions`), **Размер** (`product.sizes`), **+10см**, **Кол-во**.
- On any change: recompute `price` + `marketPrice` via `orderItemPrice`, store on item.
- Item shape written (storefront convention — surcharge folded into price):
  `{ modelId, name, fabric, size: "Ш×В", extra10cm, quantity, price, marketPrice, surcharge: 0 }`.
- `size` stored as display string `"${w}×${h}"` (matches storefront); matrix lookup
  uses `sizeKey(w,h)` = `"${w}x${h}"`.
- Legacy: model not found → disabled "(старая модель: …)" option; fields keep stored
  values; recompute only after re-selection.
- Remove `recalcItem`/`api.catalog.calculate`.

### Settings (`Settings.jsx`)
Remove "Каталог цен" section and `api.catalog.get`. Keep info + integrations sections.
(Price editing lives in Товары → редактор.)

### Server cleanup
- `app.js`: remove the `/api/catalog` mount.
- Delete `server/routes/catalog.js` and `server/data/catalog/prices.json`.
- `scripts/migrate.js`: remove the catalog/prices.json import block (keep the rest).
- `fileHelpers.js` untouched (generic util).

## Consistency

Storefront-created and editor-edited order items use the **same** convention
(`price` incl. surcharge, `marketPrice` incl. surcharge, `surcharge: 0`), so
`recomputeTotals` and `profit.mjs` (Доход = price − (marketPrice − 7000)) behave
identically regardless of origin.

## Testing

- Unit: `orderItemPrice` (with/without +10см, missing cell) via node:test.
- Server suite stays green after `/catalog` removal.
- Manual: storefront order → edit ткань/размер in panel → price+marketPrice
  recompute → save → verify `/admin/profit-analysis` row.

## Files

- Modify: `client/src/utils/pricing.js` (+ test), `client/src/pages/OrderDetails/OrderDetails.jsx`,
  `client/src/pages/Settings/Settings.jsx`, `client/src/utils/api.js`, `server/app.js`,
  `server/scripts/migrate.js`.
- Delete: `server/routes/catalog.js`, `server/data/catalog/prices.json`.
