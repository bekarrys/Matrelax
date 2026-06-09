/**
 * Одноразовая миграция коллекции `products`:
 *   • проставляет series = "Базовая коллекция" документам без серии
 *   • проставляет isActive = true документам без флага активности
 *
 * Идемпотентно: повторный запуск ничего не сломает (трогает только пустые поля).
 *
 * Запуск из корня проекта:
 *   node server/scripts/migrateProductsSeries.js
 *
 * Использует те же креды, что и сервер (server/utils/firebase.js → .env).
 */
const { db } = require('../utils/firebase');

const DEFAULT_SERIES = 'Базовая коллекция';

async function migrate() {
  const snap = await db.collection('products').get();
  console.log(`Найдено товаров: ${snap.size}`);

  let updated = 0;
  let batch = db.batch();
  let pending = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const patch = {};
    if (data.series === undefined || data.series === null || data.series === '') {
      patch.series = DEFAULT_SERIES;
    }
    if (data.isActive === undefined || data.isActive === null) {
      patch.isActive = true;
    }
    if (Object.keys(patch).length === 0) continue;

    batch.update(doc.ref, patch);
    updated++;
    pending++;

    // Firestore: максимум 500 операций на батч
    if (pending === 450) {
      await batch.commit();
      batch = db.batch();
      pending = 0;
    }
  }

  if (pending > 0) await batch.commit();

  console.log(`Обновлено документов: ${updated}`);
  console.log('Миграция завершена.');
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Ошибка миграции:', err);
    process.exit(1);
  });
