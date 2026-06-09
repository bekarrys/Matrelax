---
name: matrelax-migrate
description: >-
  Migrates local JSON data files into Firestore. Use when seeding a fresh
  database, resetting data, or importing products/orders/staff from
  server/data/. Runs server/scripts/migrate.js via Node.
---

# Matrelax — Migrate Data to Firestore

Seeds Firestore from local JSON files in `server/data/`.

## What gets imported

| Collection | Source file |
|---|---|
| `products` | `server/data/products.json` |
| `shopOrders` | `server/data/orders.json` |
| `adminOrders` | `server/data/orders/registry.json` |
| `employees` | `server/data/staff/employees.json` |
| `catalog/prices` | `server/data/catalog/prices.json` |

## Steps

1. **Confirm intent** — ask the user whether they want a full seed or specific collections only.

2. **Check env** — ensure `.env` at repo root has `GOOGLE_APPLICATION_CREDENTIALS` or `FIREBASE_SERVICE_ACCOUNT_BASE64` set:
   ```
   cat .env | grep FIREBASE
   ```

3. **Run migration**
   ```
   node server/scripts/migrate.js
   ```

4. **Verify** — check that Firestore collections exist:
   ```
   npx firebase-tools firestore:databases:list --project matrelax
   ```

## Selective import

To seed only products (skip orders), edit `server/scripts/migrate.js` temporarily or run:
```js
// Run inline from Node REPL or a one-off script
require('dotenv').config();
const { db } = require('./server/utils/firebase');
const data = require('./server/data/products.json');
const batch = db.batch();
data.products.forEach(p => batch.set(db.collection('products').doc(p.id), p));
batch.commit().then(() => console.log('done'));
```

## Warning
Migrate uses `batch.set()` which **overwrites** existing documents. Safe for initial seed, but will erase manual edits made in Firestore Console.
