require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { db } = require('../utils/firebase');

async function run() {
  console.log('═══════════════════════════════════════════');
  console.log('  MATRELAX — АУДИТ ДАННЫХ (Firestore)');
  console.log('═══════════════════════════════════════════\n');

  // ── 1. Читаем adminOrders ────────────────────────────────
  const snap = await db.collection('adminOrders').get();
  const orders = snap.docs.map(d => d.data());

  console.log(`📦 Всего заказов в adminOrders: ${orders.length}\n`);

  // ── 2. Проверка аномалий ─────────────────────────────────
  console.log('─── Аномалии (paymentType vs paidAmount) ───');
  const anomalies = [];
  orders.forEach(o => {
    const isPaidType = o.paymentType === 'paid';
    const paidZero   = (o.paidAmount || 0) === 0;
    const hasBalance = (o.balance || 0) > 0;
    if (isPaidType && paidZero && hasBalance) {
      anomalies.push(o);
      console.log(`  ⚠️  ${o.orderNumber}`);
      console.log(`       paymentType : ${o.paymentType}`);
      console.log(`       paidAmount  : ${o.paidAmount}`);
      console.log(`       balance     : ${o.balance}`);
      console.log(`       status      : ${o.status}`);
    }
  });
  if (anomalies.length === 0) console.log('  ✓ Аномалий нет\n');
  else console.log(`\n  Найдено аномалий: ${anomalies.length}\n`);

  // ── 3. Детальная проверка #001 и #005 ───────────────────
  console.log('─── Детали заказов #001 и #005 ───');
  const targets = orders.filter(o =>
    o.orderNumber?.includes('001') || o.orderNumber?.includes('005')
  );
  targets.forEach(o => {
    console.log(`\n  ${o.orderNumber}`);
    console.log(`    id          : ${o.id}`);
    console.log(`    status      : ${o.status}`);
    console.log(`    paymentType : ${o.paymentType}`);
    console.log(`    paidAmount  : ${o.paidAmount}`);
    console.log(`    totalAmount : ${o.totalAmount}`);
    console.log(`    balance     : ${o.balance}`);
    console.log(`    _source     : ${o._source}`);
  });

  // ── 4. Сводка долгов ─────────────────────────────────────
  console.log('\n─── Сводка долгов из Firestore ───');
  let totalDebt = 0;
  let debtCount = 0;
  orders.forEach(o => {
    const bal = o.balance || 0;
    if (bal > 0) {
      debtCount++;
      totalDebt += bal;
      const flag = o.paymentType === 'paid' ? ' ⚠️  (paymentType=paid!)' : '';
      console.log(`  ${o.orderNumber.padEnd(26)} ${String(bal).padStart(9)} KZT  [${o.status}]${flag}`);
    }
  });
  console.log(`${''.padEnd(42,'─')}`);
  console.log(`  Итого долгов: ${debtCount} заказ(ов) = ${totalDebt.toLocaleString('ru')} KZT`);

  // ── 5. Сверка с debts.json ───────────────────────────────
  console.log('\n─── Сверка с debts.json ───');
  const fs = require('fs');
  const debtsPath = require('path').join(__dirname, '../data/finance/debts.json');
  try {
    const debtsFile = JSON.parse(fs.readFileSync(debtsPath, 'utf-8'));
    const fileTotal = debtsFile.totalDebt || 0;
    const firestoreTotal = totalDebt;
    console.log(`  debts.json totalDebt  : ${fileTotal.toLocaleString('ru')} KZT`);
    console.log(`  Firestore  реальный   : ${firestoreTotal.toLocaleString('ru')} KZT`);
    if (fileTotal === firestoreTotal) {
      console.log('  ✓ Суммы совпадают');
    } else {
      const diff = firestoreTotal - fileTotal;
      console.log(`  ⚠️  Расхождение: ${diff > 0 ? '+' : ''}${diff.toLocaleString('ru')} KZT`);
    }
  } catch {
    console.log('  ⚠️  debts.json не найден');
  }

  // ── 6. Коллекция users ───────────────────────────────────
  console.log('\n─── Пользователи Firebase Auth (Firestore) ───');
  const usersSnap = await db.collection('users').get();
  usersSnap.docs.forEach(d => {
    const u = d.data();
    console.log(`  ${u.role.padEnd(10)} ${u.email}`);
  });

  console.log('\n═══════════════════════════════════════════');
  console.log('  АУДИТ ЗАВЕРШЁН');
  console.log('═══════════════════════════════════════════');
  process.exit(0);
}

run().catch(err => { console.error('❌', err.message); process.exit(1); });
