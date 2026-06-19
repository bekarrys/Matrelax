require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const path = require('path');
const fs = require('fs');
const { db } = require('../utils/firebase');

const DATA_DIR = path.join(__dirname, '..', 'data');

async function importCollection(collectionName, docs) {
  const col = db.collection(collectionName);
  const batch = db.batch();
  docs.forEach((doc) => {
    const ref = col.doc(String(doc.id));
    batch.set(ref, doc);
  });
  await batch.commit();
  console.log(`  ✓ ${collectionName}: ${docs.length} docs`);
}

async function run() {
  console.log('🔥 Миграция MATRELAX → Firestore\n');

  // --- adminOrders (из registry.json) ---
  const registry = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'orders', 'registry.json'), 'utf-8'));
  const adminOrders = registry.orders.map((o) => ({ ...o, _source: 'admin' }));
  await importCollection('adminOrders', adminOrders);

  // --- shopOrders (из orders.json) ---
  const shopData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'orders.json'), 'utf-8'));
  const shopOrders = shopData.orders.map((o) => ({ ...o, _source: 'shop' }));
  await importCollection('shopOrders', shopOrders);

  // --- employees ---
  const empData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'staff', 'employees.json'), 'utf-8'));
  await importCollection('employees', empData.employees);

  // --- products ---
  const prodData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'products.json'), 'utf-8'));
  await importCollection('products', prodData.products);

  console.log('\n✅ Миграция завершена');
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Ошибка:', err.message);
  process.exit(1);
});
