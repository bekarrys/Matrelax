/**
 * Заменяет демо-каталог реальными 16 матрасами из scripts/data/mattresses.js.
 *   • удаляет ВСЕ документы коллекции products (демо-данные)
 *   • вставляет 16 матрасов
 *
 * Запуск из корня: node server/scripts/seedCatalog.js
 * ВНИМАНИЕ: операция деструктивная (удаляет все товары). Запускать только
 * после явного согласия владельца.
 *
 * Использует те же креды, что и сервер (server/utils/firebase.js → .env).
 */
const { db } = require('../utils/firebase');
const MATTRESSES = require('./data/mattresses');

async function run() {
  const snap = await db.collection('products').get();
  console.log(`Удаляю демо-товаров: ${snap.size}`);
  let batch = db.batch();
  let pending = 0;
  for (const doc of snap.docs) {
    batch.delete(doc.ref);
    pending++;
    if (pending === 450) { await batch.commit(); batch = db.batch(); pending = 0; }
  }
  if (pending > 0) await batch.commit();

  const now = new Date().toISOString();
  batch = db.batch();
  pending = 0;
  for (const m of MATTRESSES) {
    batch.set(db.collection('products').doc(m.id), { ...m, createdAt: now, updatedAt: now });
    pending++;
    if (pending === 450) { await batch.commit(); batch = db.batch(); pending = 0; }
  }
  if (pending > 0) await batch.commit();

  console.log(`Вставлено матрасов: ${MATTRESSES.length}`);
  console.log('Сидинг завершён.');
}

run()
  .then(() => process.exit(0))
  .catch((err) => { console.error('Ошибка сидинга:', err); process.exit(1); });
