/**
 * Тест безопасности Firestore — MATRELAX
 *
 * Подход: Admin SDK создаёт custom token с нужной ролью в claims,
 * Firebase Auth обменивает его на реальный ID-токен,
 * Firestore REST API проверяет реальные правила и возвращает 200 или 403.
 *
 * Тестовые документы создаются и удаляются Admin SDK-ом.
 * Запуск: node test-rules.mjs
 */

import { createRequire } from 'module';
import { readFileSync }  from 'fs';

const require = createRequire(import.meta.url);
const admin   = require('./server/node_modules/firebase-admin');

// ─── Инициализация Admin SDK ─────────────────────────────────────────────────
const sa = JSON.parse(readFileSync('./server/firebase-service-account.json', 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db         = admin.firestore();
const PROJECT_ID = 'matrelax';
const WEB_KEY    = 'AIzaSyDTR-KyztP5nsuF65TTZpdriLmRsLc_TSY';

// ─── ANSI ────────────────────────────────────────────────────────────────────
const G   = '\x1b[32m✓\x1b[0m';
const R   = '\x1b[31m✗\x1b[0m';
const I   = '\x1b[33m→\x1b[0m';
const B   = s => `\x1b[1m${s}\x1b[0m`;
const DIM = s => `\x1b[2m${s}\x1b[0m`;

// ─── Получить ID-токен через custom token ────────────────────────────────────
async function getIdToken(uid, claims) {
  const customToken = await admin.auth().createCustomToken(uid, claims);
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${WEB_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    }
  );
  const json = await res.json();
  if (!json.idToken) throw new Error(`Не получили idToken: ${JSON.stringify(json)}`);
  return json.idToken;
}

// ─── Firestore REST: PATCH (update) ─────────────────────────────────────────
async function fsUpdate(idToken, collection, docId, fields) {
  const fieldMask = Object.keys(fields).map(f => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');
  const body = {
    fields: Object.fromEntries(
      Object.entries(fields).map(([k, v]) => [k, typeof v === 'number' ? { integerValue: v } : { stringValue: v }])
    ),
  };
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}/${docId}?${fieldMask}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.status;
}

// ─── Firestore REST: POST (create) ──────────────────────────────────────────
async function fsCreate(idToken, collection, docId, fields) {
  const body = {
    fields: Object.fromEntries(
      Object.entries(fields).map(([k, v]) => [k, typeof v === 'number' ? { integerValue: v } : { stringValue: v }])
    ),
  };
  // Используем PATCH с ?documentId= для создания конкретного документа
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}?documentId=${docId}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.status;
}

// ─── Вспомогательная: вывод результата ──────────────────────────────────────
let passed = 0, failed = 0;
function report(label, status, expectAllow) {
  const allowed = status === 200;
  const ok      = expectAllow ? allowed : !allowed;
  const got     = allowed ? '\x1b[32mALLOW\x1b[0m' : `\x1b[31mDENY\x1b[0m ${DIM(`(HTTP ${status})`)}`;
  const exp     = expectAllow ? '\x1b[32mALLOW\x1b[0m' : '\x1b[31mDENY\x1b[0m';

  console.log(`${ok ? G : R} ${B(label)}`);
  console.log(`   Получено: ${got}   Ожидалось: ${exp}`);
  console.log('');
  ok ? passed++ : failed++;
}

// ════════════════════════════════════════════════════════════════════════════
console.log('');
console.log(B('══════════════════════════════════════════════════'));
console.log(B('  ТЕСТ ПРАВИЛ FIRESTORE — MATRELAX'));
console.log(B('  Режим: реальный Firestore REST API + ID-токены'));
console.log(B('══════════════════════════════════════════════════'));
console.log('');

// ─── Подготовка: создаём тестовые документы через Admin SDK ─────────────────
console.log(`${I} Подготовка тестовых документов...`);
const TEST_ORDER_ID   = 'test-order-rules-check';
const TEST_PRODUCT_ID = 'test-product-rules-check';

await db.collection('shopOrders').doc(TEST_ORDER_ID).set({
  orderNumber: 'TEST-RULES-001', status: 'new',
  customerPhone: '77000000000',  totalAmount: 50000,
  createdAt: new Date().toISOString(),
});
await db.collection('products').doc(TEST_PRODUCT_ID).set({
  name: 'Тест-Матрас', modelId: 'TEST', category: 'mattress',
  prices: { '110': 88000, '120': 95000 },
});
console.log(`${G} Документы созданы\n`);

// ─── Получаем токены ─────────────────────────────────────────────────────────
console.log(`${I} Получаем ID-токены через Firebase Auth...`);
const managerToken = await getIdToken('test-manager-uid', { role: 'manager' });
const adminToken   = await getIdToken('test-admin-uid',   { role: 'admin'   });
console.log(`${G} Токены готовы\n`);
console.log(B('──────────────────────────────────────────────────'));
console.log('');

// ════════════════════════════════════════════════════════════════════════════
// ТЕСТ 1 — Менеджер обновляет статус заказа в shopOrders  → ALLOW
// ════════════════════════════════════════════════════════════════════════════
console.log(`${I} ${B('Тест 1')} — Менеджер: PATCH status в shopOrders`);
console.log(`   ${DIM(`PATCH /shopOrders/${TEST_ORDER_ID}  { status: "progress" }`)}\n`);
const t1 = await fsUpdate(managerToken, 'shopOrders', TEST_ORDER_ID, { status: 'progress' });
report('Тест 1 — Менеджер: обновление статуса заказа', t1, true);

// ════════════════════════════════════════════════════════════════════════════
// ТЕСТ 2 — Менеджер меняет цену в products  → DENY
// ════════════════════════════════════════════════════════════════════════════
console.log(`${I} ${B('Тест 2')} — Менеджер: PATCH цены в products`);
console.log(`   ${DIM(`PATCH /products/${TEST_PRODUCT_ID}  { "prices.110": 75000 }`)}\n`);
const t2 = await fsUpdate(managerToken, 'products', TEST_PRODUCT_ID, { 'prices.110': 75000 });
report('Тест 2 — Менеджер: изменение цены в products', t2, false);

// ════════════════════════════════════════════════════════════════════════════
// ТЕСТ 3 — Менеджер создаёт новый заказ в shopOrders  → ALLOW
// ════════════════════════════════════════════════════════════════════════════
const NEW_ORDER_ID = 'test-new-order-by-manager';
console.log(`${I} ${B('Тест 3')} — Менеджер: POST нового заказа в shopOrders`);
console.log(`   ${DIM(`POST /shopOrders/${NEW_ORDER_ID}`)}\n`);
const t3 = await fsCreate(managerToken, 'shopOrders', NEW_ORDER_ID, {
  orderNumber: 'MGR-TEST-777', status: 'new', totalAmount: 120000,
});
report('Тест 3 — Менеджер: создание нового заказа', t3, true);

// ════════════════════════════════════════════════════════════════════════════
// БОНУС A — Admin пытается создать заказ в shopOrders  → DENY
// ════════════════════════════════════════════════════════════════════════════
console.log(`${I} ${B('Бонус A')} — Admin: POST заказа в shopOrders (запрещено)`);
console.log(`   ${DIM('POST /shopOrders/__test_admin_create__')}\n`);
const tA = await fsCreate(adminToken, 'shopOrders', 'test-admin-create-attempt', {
  status: 'new', totalAmount: 9999,
});
report('Бонус A — Admin: создание заказа в shopOrders', tA, false);

// ════════════════════════════════════════════════════════════════════════════
// БОНУС B — Admin меняет цену в products  → ALLOW
// ════════════════════════════════════════════════════════════════════════════
console.log(`${I} ${B('Бонус B')} — Admin: PATCH поля name в products (разрешено)`);
console.log(`   ${DIM(`PATCH /products/${TEST_PRODUCT_ID}  { name: "Матрас 707A — новая цена" }`)}\n`);
const tB = await fsUpdate(adminToken, 'products', TEST_PRODUCT_ID, { name: 'Матрас 707A — новая цена' });
report('Бонус B — Admin: запись в products (write разрешён только Admin)', tB, true);

// ─── Очистка: удаляем тестовые документы ────────────────────────────────────
console.log(`${I} Очистка тестовых документов...`);
await db.collection('shopOrders').doc(TEST_ORDER_ID).delete();
await db.collection('shopOrders').doc(NEW_ORDER_ID).delete();
await db.collection('products').doc(TEST_PRODUCT_ID).delete();
console.log(`${G} Очищено\n`);

// ─── ИТОГ ────────────────────────────────────────────────────────────────────
console.log(B('══════════════════════════════════════════════════'));
console.log(`  ${failed === 0 ? G : R} Пройдено: ${passed}/${passed + failed}  |  Провалено: ${failed}`);
console.log(B('══════════════════════════════════════════════════'));
console.log('');

await admin.app().delete();
process.exit(failed > 0 ? 1 : 0);
