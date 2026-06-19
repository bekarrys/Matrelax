# Tiered-Pricing Mattress Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 25 demo products with 16 real mattresses whose price depends on **ткань × размер**, end-to-end (server validation, seed data, storefront, admin grid editor).

**Architecture:** Price moves from flat `sizes[].price` to a nested `prices[ткань][размер] = number` object on each product. A shared pure pricing util resolves min-price (card) and exact-price (detail/cart). Server whitelists + validates the matrix (no missing/zero cells). Admin editor renders an editable grid that serializes to the matrix. Cart keeps snapshotting the resolved number.

**Tech Stack:** Express + firebase-admin (CJS, `node --test`), React + Vite (ESM, zustand), Firestore.

**Spec:** `docs/superpowers/specs/2026-06-17-tiered-pricing-catalog-design.md`
**Source data:** `Cost.md` (16 models, authoritative). Fabric mapping: `C-1→Стандарт`, `C-2→Комфорт`, `C-3→Премиум`, `B-3→Люкс`. `B-2` is a Премиум duplicate — ignore. `R-01/02/03` use a single ткань `"Royal"`.

---

## File Structure

- Create `server/scripts/data/mattresses.js` — pure data module: array of 16 product objects.
- Create `server/scripts/seedCatalog.js` — deletes all demo products, inserts the 16.
- Modify `server/routes/products.js` — whitelist `prices`/`composition`; validate matrix.
- Create `server/test/products.test.js` — TDD for validation + `activeOnly`.
- Create `client/src/utils/pricing.js` — `getMinPrice`, `getPrice`, `priceMatrixIssues`.
- Create `client/src/utils/pricing.test.js` — node:test for the pure util.
- Modify `client/package.json` — add `test` script.
- Modify `client/src/components/ProductCard/ProductCard.jsx` — min-price via util.
- Modify `client/src/pages/ProductDetail/ProductDetail.jsx` — ткань-driven price, specs/composition.
- Modify `client/src/pages/ProductEditor/ProductEditor.jsx` — price grid + validation.

---

## Task 1: Pricing util (pure, TDD)

**Files:**
- Create: `client/src/utils/pricing.js`
- Test: `client/src/utils/pricing.test.js`
- Modify: `client/package.json`

- [ ] **Step 1: Add client test script**

In `client/package.json` `"scripts"`, add:

```json
"test": "node --test \"src/**/*.test.js\""
```

- [ ] **Step 2: Write the failing test**

`client/src/utils/pricing.test.js`:

```js
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
```

- [ ] **Step 3: Run test, verify it fails**

Run: `cd client && npm test`
Expected: FAIL — `Cannot find module './pricing.js'`.

- [ ] **Step 4: Implement the util**

`client/src/utils/pricing.js`:

```js
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
```

- [ ] **Step 5: Run test, verify it passes**

Run: `cd client && npm test`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add client/src/utils/pricing.js client/src/utils/pricing.test.js client/package.json
git commit -m "feat(pricing): pure ткань×размер price resolver + tests"
```

---

## Task 2: Server — whitelist + matrix validation (TDD)

**Files:**
- Modify: `server/routes/products.js`
- Test: `server/test/products.test.js`

- [ ] **Step 1: Write the failing test**

`server/test/products.test.js` (mirror the loader pattern from `server/test/adminOrders.test.js`):

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { makeFakeFirebase } = require('./helpers/fakeFirestore');

const FB_PATH = require.resolve('../utils/firebase');
const AUTH_PATH = require.resolve('../middleware/auth');
const ROUTER_PATH = require.resolve('../routes/products');

function loadRouter(seed) {
  const fake = makeFakeFirebase(seed);
  require.cache[FB_PATH] = { id: FB_PATH, filename: FB_PATH, loaded: true, exports: { admin: fake.admin, db: fake.db } };
  delete require.cache[AUTH_PATH];
  delete require.cache[ROUTER_PATH];
  return { router: require(ROUTER_PATH), store: fake.store };
}

async function withServer(router, fn) {
  const app = express();
  app.use(express.json());
  app.use('/api/products', router);
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  try { await fn(server.address().port); }
  finally { await new Promise((r) => server.close(r)); }
}

async function req(port, method, p, { user, body } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (user) headers.authorization = 'Bearer ' + JSON.stringify(user);
  const res = await fetch(`http://localhost:${port}${p}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

const ADMIN = { uid: 'a1', email: 'a@m.kz', role: 'admin' };

function goodMattress(over = {}) {
  return {
    id: '500', name: '500', series: 'Боннельные', category: 'mattresses',
    fabricOptions: ['Стандарт', 'Люкс'],
    sizes: [{ width: 80, height: 200 }, { width: 200, height: 200 }],
    prices: {
      'Стандарт': { '80x200': 23000, '200x200': 44000 },
      'Люкс': { '80x200': 30000, '200x200': 58000 },
    },
    composition: ['Кокос'], extra10cm: true, surcharge10cm: 7000, isActive: true,
    ...over,
  };
}

test('POST accepts complete matrix', async () => {
  const { router, store } = loadRouter({});
  await withServer(router, async (port) => {
    const r = await req(port, 'POST', '/api/products', { user: ADMIN, body: goodMattress() });
    assert.equal(r.status, 201);
    assert.equal(store.products.get('500').prices['Люкс']['200x200'], 58000);
  });
});

test('POST rejects matrix with missing/zero cell', async () => {
  const { router } = loadRouter({});
  await withServer(router, async (port) => {
    const bad = goodMattress({ prices: { 'Стандарт': { '80x200': 23000, '200x200': 44000 }, 'Люкс': { '80x200': 0, '200x200': 58000 } } });
    const r = await req(port, 'POST', '/api/products', { user: ADMIN, body: bad });
    assert.equal(r.status, 400);
    assert.match(r.json.error, /цен/i);
  });
});

test('GET activeOnly hides inactive', async () => {
  const { router } = loadRouter({ products: [
    goodMattress({ id: 'a', isActive: true }),
    goodMattress({ id: 'b', isActive: false }),
  ] });
  await withServer(router, async (port) => {
    const r = await req(port, 'GET', '/api/products?activeOnly=1');
    assert.equal(r.status, 200);
    assert.deepEqual(r.json.map((p) => p.id), ['a']);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `cd server && node --test test/products.test.js`
Expected: FAIL — "POST rejects matrix" fails (matrix not validated yet) and `prices`/`composition` get stripped.

- [ ] **Step 3: Implement whitelist + validation**

In `server/routes/products.js`:

Add to `ALLOWED_FIELDS` (after `'image',`):

```js
  'image', 'prices', 'composition',
```

Add a matrix validator and call it in both POST and PUT. After `validateProductTypes`, add:

```js
// Каждая ячейка ткань×размер должна быть положительным числом — иначе товар
// с ценой 0/null уедет на витрину. Проверяем только если матрица передана.
function validatePriceMatrix(fields) {
  if (fields.prices === undefined) return null;
  if (typeof fields.prices !== 'object' || fields.prices === null || Array.isArray(fields.prices)) {
    return 'Матрица цен должна быть объектом';
  }
  const fabrics = fields.fabricOptions;
  const sizes = fields.sizes;
  if (!Array.isArray(fabrics) || fabrics.length === 0) return 'Не заданы ткани для матрицы цен';
  if (!Array.isArray(sizes) || sizes.length === 0) return 'Не заданы размеры для матрицы цен';
  for (const fabric of fabrics) {
    const row = fields.prices[fabric];
    if (!row || typeof row !== 'object') return `Нет цен для ткани «${fabric}»`;
    for (const s of sizes) {
      const key = `${s.width}x${s.height}`;
      const v = row[key];
      if (typeof v !== 'number' || v <= 0) {
        return `Не заполнена цена: ткань «${fabric}», размер ${key}`;
      }
    }
  }
  return null;
}
```

In the POST handler, after `if (typeError) return res.status(400).json({ error: typeError });` add:

```js
    const priceError = validatePriceMatrix(fields);
    if (priceError) return res.status(400).json({ error: priceError });
```

Add the **same two lines** in the PUT handler after its `typeError` check.

- [ ] **Step 4: Run test, verify it passes**

Run: `cd server && node --test test/products.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Run full server suite (no regressions)**

Run: `cd server && npm test`
Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add server/routes/products.js server/test/products.test.js
git commit -m "feat(products): whitelist prices/composition + validate price matrix"
```

---

## Task 3: Seed data module (16 models)

**Files:**
- Create: `server/scripts/data/mattresses.js`
- Test: `server/test/seedData.test.js`

- [ ] **Step 1: Write the failing test**

`server/test/seedData.test.js`:

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const MATTRESSES = require('../scripts/data/mattresses');

test('exactly 16 models with unique ids', () => {
  assert.equal(MATTRESSES.length, 16);
  assert.equal(new Set(MATTRESSES.map((m) => m.id)).size, 16);
});

test('every cell of every matrix is a positive number', () => {
  for (const m of MATTRESSES) {
    for (const fabric of m.fabricOptions) {
      for (const s of m.sizes) {
        const v = m.prices[fabric][`${s.width}x${s.height}`];
        assert.ok(typeof v === 'number' && v > 0, `${m.id} ${fabric} ${s.width}x${s.height}`);
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
```

- [ ] **Step 2: Run test, verify it fails**

Run: `cd server && node --test test/seedData.test.js`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement the data module**

Create `server/scripts/data/mattresses.js`. Use this exact shape (model `500` shown in full as the template). Transcribe the remaining 15 models from `Cost.md` `MATRESSES_DB` using the fabric mapping (`C-1→Стандарт, C-2→Комфорт, C-3→Премиум, B-3→Люкс`); `R-01/02/03` get one `Royal` fabric from their `Royal` price set. Series per the spec table. Set `imageUrl` to `/products/<badge>.png` for `707, L-01, L-02, R-01, R-02, R-03, Z-00, Z-01, Z-02, Z-03`, else `''`. All: `category: 'mattresses'`, `extra10cm: true`, `surcharge10cm: 7000`, `isActive: true`, `inStock: true`.

```js
// Real Matrelax catalog — transcribed from Cost.md. Source of truth for seeding.
const SIZES = [80, 90, 100, 120, 140, 160, 180, 200].map((w) => ({ width: w, height: 200 }));
const FABRICS = ['Стандарт', 'Комфорт', 'Премиум', 'Люкс'];

// helper: build prices{} from 4 rows of 8 numbers (order = SIZES, FABRICS)
function matrix(rows) {
  const out = {};
  FABRICS.forEach((f, fi) => {
    out[f] = {};
    SIZES.forEach((s, si) => { out[f][`${s.width}x${s.height}`] = rows[fi][si]; });
  });
  return out;
}

const MATTRESSES = [
  {
    id: '500', name: '500', series: 'Боннельные', category: 'mattresses',
    specs: { type: 'Боннельный, Полу-ортопед', firmness: 'Жесткий', height: '20-24см', load: '90кг', warranty: '-', serviceLife: '10 лет' },
    composition: ['Кокосовая койра', 'Термовойлок', 'Пружинный Боннель'],
    fabricOptions: FABRICS, sizes: SIZES,
    prices: matrix([
      [23000, 25000, 27000, 30000, 34000, 37000, 40000, 44000], // Стандарт C-1
      [25000, 27000, 29000, 33000, 37000, 40000, 44000, 48000], // Комфорт  C-2
      [29000, 31000, 34000, 37000, 42000, 46000, 50000, 55000], // Премиум  C-3
      [30000, 33000, 36000, 40000, 45000, 49000, 53000, 58000], // Люкс     B-3
    ]),
    extra10cm: true, surcharge10cm: 7000, imageUrl: '', isActive: true, inStock: true,
  },
  // … 504, 702, 707, K-01, K-02, K-03, L-01, L-02, Z-00, Z-01, Z-02, Z-03 (same shape)
  // … R-01, R-02, R-03: fabricOptions:['Royal'], sizes:SIZES,
  //     prices: { Royal: { '80x200':96000, '90x200':105000, '100x200':113000,
  //               '120x200':131000, '140x200':149000, '160x200':167000,
  //               '180x200':185000, '200x200':203000 } }, imageUrl:'/products/R-0X.png'
];

module.exports = MATTRESSES;
```

(During implementation, fill all 16 from Cost.md. The test in Step 1 fails until every cell is present and positive — that is the completeness guard.)

- [ ] **Step 4: Run test, verify it passes**

Run: `cd server && node --test test/seedData.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add server/scripts/data/mattresses.js server/test/seedData.test.js
git commit -m "feat(catalog): 16-model mattress seed data module + completeness tests"
```

---

## Task 4: Seed script (delete demo, insert 16)

**Files:**
- Create: `server/scripts/seedCatalog.js`

- [ ] **Step 1: Implement the seed script**

`server/scripts/seedCatalog.js` (follows `migrateProductsSeries.js` conventions; real Firestore, batched):

```js
/**
 * Заменяет демо-каталог реальными 16 матрасами из scripts/data/mattresses.js.
 *   • удаляет ВСЕ документы коллекции products (демо-данные)
 *   • вставляет 16 матрасов
 * Запуск из корня: node server/scripts/seedCatalog.js
 * ВНИМАНИЕ: операция деструктивная (удаляет все товары).
 */
const { db } = require('../utils/firebase');
const MATTRESSES = require('./data/mattresses');

async function run() {
  const snap = await db.collection('products').get();
  console.log(`Удаляю демо-товаров: ${snap.size}`);
  let batch = db.batch(); let pending = 0;
  for (const doc of snap.docs) {
    batch.delete(doc.ref); pending++;
    if (pending === 450) { await batch.commit(); batch = db.batch(); pending = 0; }
  }
  if (pending > 0) await batch.commit();

  const now = new Date().toISOString();
  batch = db.batch(); pending = 0;
  for (const m of MATTRESSES) {
    batch.set(db.collection('products').doc(m.id), { ...m, createdAt: now, updatedAt: now });
    pending++;
    if (pending === 450) { await batch.commit(); batch = db.batch(); pending = 0; }
  }
  if (pending > 0) await batch.commit();
  console.log(`Вставлено матрасов: ${MATTRESSES.length}`);
}

run().then(() => process.exit(0)).catch((e) => { console.error('Ошибка сидинга:', e); process.exit(1); });
```

- [ ] **Step 2: Verify it loads without running (no real writes in test env)**

Run: `cd server && node -e "require('./scripts/data/mattresses'); console.log('data ok')"`
Expected: prints `data ok` (script itself is run against live DB only on explicit user go-ahead).

- [ ] **Step 3: Commit**

```bash
git add server/scripts/seedCatalog.js
git commit -m "feat(catalog): seed script to replace demo products with 16 mattresses"
```

> **Execution note:** Do NOT run `seedCatalog.js` against the live Firestore until the user explicitly approves — it deletes all existing products. (Elite E1 was already hidden earlier; the seed removes it along with the rest.)

---

## Task 5: Storefront card — min price via util

**Files:**
- Modify: `client/src/components/ProductCard/ProductCard.jsx`

- [ ] **Step 1: Update import + minPrice**

Replace line 11's `const minPrice = ...` and add an import at top:

```jsx
import { getMinPrice } from '../../utils/pricing';
```

```jsx
  const minPrice = getMinPrice(product);
```

- [ ] **Step 2: Build to verify no errors**

Run: `cd client && npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/ProductCard/ProductCard.jsx
git commit -m "feat(storefront): card min price from ткань×размер matrix"
```

---

## Task 6: Product detail — ткань-driven price + specs/composition

**Files:**
- Modify: `client/src/pages/ProductDetail/ProductDetail.jsx`

- [ ] **Step 1: Import util + sizeKey**

Add to imports:

```jsx
import { getPrice, getMinPrice, sizeKey } from '../../utils/pricing';
```

- [ ] **Step 2: Replace currentPrice computation**

Replace the `currentPrice` block (around line 74-76):

```jsx
  const key = selectedSize ? sizeKey(selectedSize.width, selectedSize.height) : null;
  const basePrice = selectedFabric && key ? getPrice(product, selectedFabric, key) : 0;
  const currentPrice = basePrice + (extra10cm && basePrice ? product.surcharge10cm : 0);
```

- [ ] **Step 3: Extend specs rendering to cover all keys**

Replace the specs label ternary (around line 119-126) with a label map so type/firmness/height/load/warranty/serviceLife render correctly:

```jsx
          {Object.entries(product.specs).map(([key, val]) => {
            const LABELS = { type: 'тип', firmness: 'жёсткость', hardness: 'жёсткость', height: 'высота', load: 'нагрузка', warranty: 'гарантия', serviceLife: 'срок службы' };
            return (
              <div key={key} className="pd-spec-tile">
                <span className="pd-spec-label">{LABELS[key] || key}</span>
                <span className="pd-spec-val">{val}</span>
              </div>
            );
          })}
```

- [ ] **Step 4: Render composition under description (if present)**

After the `{showDesc && <p ...>}` line (~133), add:

```jsx
          {showDesc && product.composition?.length > 0 && (
            <ul className="pd-composition">
              {product.composition.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          )}
```

- [ ] **Step 5: Verify fabric default & cart payload**

Confirm `selectedFabric` defaults from `data.fabricOptions[0]` (already in the existing `useEffect`). `handleAddToCart` already sends `fabric: selectedFabric` and `price: currentPrice` — no change needed (cart snapshot preserved).

- [ ] **Step 6: Build to verify**

Run: `cd client && npm run build`
Expected: build succeeds.

- [ ] **Step 7: Commit**

```bash
git add client/src/pages/ProductDetail/ProductDetail.jsx
git commit -m "feat(storefront): ткань-driven pricing + full specs/composition on detail"
```

---

## Task 7: Admin editor — price grid + validation

**Files:**
- Modify: `client/src/pages/ProductEditor/ProductEditor.jsx`

- [ ] **Step 1: Import util**

```jsx
import { getPrice, priceMatrixIssues, sizeKey } from '../../utils/pricing';
```

- [ ] **Step 2: Add grid state helpers**

Add helper setters near the existing `set`/`setSize` helpers:

```jsx
  const setCell = (fabric, key, value) =>
    setProduct((p) => ({
      ...p,
      prices: { ...(p.prices || {}), [fabric]: { ...((p.prices || {})[fabric] || {}), [key]: Number(value) } },
    }));
```

- [ ] **Step 3: Replace the "Размеры и цены" card with a grid**

Replace the existing sizes card (lines ~155-180) with a fabric×size grid. Rows = `product.fabricOptions`, columns = `product.sizes`. Each cell is a number input bound to `getPrice(product, fabric, sizeKey(s.width,s.height))` calling `setCell`. Keep the "Размеры" list editor for adding/removing sizes (sizes no longer hold price). Show invalid cells (from `priceMatrixIssues`) with a red border.

```jsx
      {/* Размеры */}
      <div className="pe-card">
        <div className="pe-card-head">
          <h3>Размеры</h3>
          <button className="btn-secondary btn-sm" onClick={addSize}><Plus size={14} /> Размер</button>
        </div>
        {(product.sizes || []).map((size, idx) => (
          <div key={idx} className="pe-size-row">
            <Field label="Ширина"><input type="number" value={size.width} onChange={(e) => setSize(idx, 'width', e.target.value)} /></Field>
            <Field label="Длина"><input type="number" value={size.height} onChange={(e) => setSize(idx, 'height', e.target.value)} /></Field>
            <button className="btn-icon-danger" onClick={() => removeSize(idx)} title="Удалить размер"><Trash2 size={16} /></button>
          </div>
        ))}
      </div>

      {/* Цены: ткань × размер */}
      <div className="pe-card">
        <h3>Цены (ткань × размер)</h3>
        <div className="pe-grid-scroll">
          <table className="pe-price-grid">
            <thead>
              <tr><th>Ткань \ Размер</th>{(product.sizes || []).map((s) => <th key={`${s.width}x${s.height}`}>{s.width}×{s.height}</th>)}</tr>
            </thead>
            <tbody>
              {(product.fabricOptions || []).map((fabric) => (
                <tr key={fabric}>
                  <td className="pe-grid-rowlabel">{fabric}</td>
                  {(product.sizes || []).map((s) => {
                    const key = sizeKey(s.width, s.height);
                    const bad = issues.some((i) => i.fabric === fabric && i.size === key);
                    return (
                      <td key={key}>
                        <input type="number" className={bad ? 'pe-cell-bad' : ''}
                          value={getPrice(product, fabric, key) || ''}
                          onChange={(e) => setCell(fabric, key, e.target.value)} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {issues.length > 0 && <p className="pe-error">Заполните все цены ({issues.length} пустых ячеек) — товар нельзя сохранить активным.</p>}
      </div>
```

- [ ] **Step 4: Compute issues + block save**

Before `return (`, add:

```jsx
  const issues = product ? priceMatrixIssues(product) : [];
```

In `handleSave`, before `setSaving(true)`, add a guard (only block when product is/östays active):

```jsx
    if (product.isActive !== false && priceMatrixIssues(product).length > 0) {
      setError('Заполните все цены в таблице перед сохранением активного товара');
      return;
    }
```

- [ ] **Step 5: Add minimal grid CSS**

In `client/src/pages/ProductEditor/ProductEditor.css`, append:

```css
.pe-grid-scroll { overflow-x: auto; }
.pe-price-grid { border-collapse: collapse; width: 100%; }
.pe-price-grid th, .pe-price-grid td { border: 1px solid var(--border, #2a2a2a); padding: 4px; text-align: center; }
.pe-price-grid input { width: 84px; }
.pe-grid-rowlabel { white-space: nowrap; font-weight: 600; }
.pe-cell-bad { outline: 2px solid #e94560; }
```

- [ ] **Step 6: Build to verify**

Run: `cd client && npm run build`
Expected: build succeeds.

- [ ] **Step 7: Commit**

```bash
git add client/src/pages/ProductEditor/ProductEditor.jsx client/src/pages/ProductEditor/ProductEditor.css
git commit -m "feat(panel): ткань×размер price grid editor with empty-cell validation"
```

---

## Task 8: Manual verification + go-live seed

**Files:** none (verification)

- [ ] **Step 1: Run all server tests**

Run: `cd server && npm test` → all PASS.

- [ ] **Step 2: Run client util tests + build**

Run: `cd client && npm test && npm run build` → PASS + build ok.

- [ ] **Step 3: Get explicit user approval, then seed live**

Confirm with user, then: `node server/scripts/seedCatalog.js`
Expected: "Удаляю демо-товаров: N", "Вставлено матрасов: 16".

- [ ] **Step 4: Smoke-test storefront**

Run dev (`cd client && npm run dev` + server), open shop:
- 16 mattresses across the series filter, each card shows "от N ₸".
- Detail: switch ткань → price changes; pick размер → price changes; +10см adds 7000.
- Add to cart → cart shows the snapshot price.
- Panel: open a product, the price grid shows; empty a cell → save blocked.

- [ ] **Step 5: Final commit (if any verification fixes)**

```bash
git add -A && git commit -m "chore(catalog): verification fixes for tiered pricing"
```

---

## Self-Review Notes

- **Spec coverage:** min-price on frontend (Task 1/5), nested matrix in DB (Task 2/3), grid editor (Task 7), cart snapshot preserved (Task 6 Step 5), ткань validation server+UI (Task 2/7). 16 models + delete demo (Task 3/4). +10см=7000, series labels, badge images (Task 3). All covered.
- **Legacy fallback:** `getMinPrice` keeps `sizes[].price` support so nothing crashes pre-seed; demo deletion in Task 4 removes legacy data anyway.
- **Destructive guard:** seed script is documented and gated on explicit user approval (Task 4 note, Task 8 Step 3).
