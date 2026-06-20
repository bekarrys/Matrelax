const { onRequest } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions');
// server/ копируется сюда predeploy-хуком (scripts/sync-server-to-functions.js),
// т.к. Firebase упаковывает только содержимое functions/. Локально хук тоже
// можно запустить вручную: node scripts/sync-server-to-functions.js
const app = require('./server/app');

setGlobalOptions({ region: 'asia-southeast1', maxInstances: 10 });

// Секреты подтягиваются из Secret Manager в runtime (process.env.*).
// Задать: firebase functions:secrets:set WORKSHOP_PIN  (и FIREBASE_WEB_API_KEY)
exports.api = onRequest(
  {
    secrets: ['WORKSHOP_PIN', 'FIREBASE_WEB_API_KEY'],
    timeoutSeconds: 120,   // запас на cold start (init Firebase Admin)
    memory: '512MiB',      // больше памяти → быстрее холодный старт
  },
  app
);
