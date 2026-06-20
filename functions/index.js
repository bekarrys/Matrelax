const { onRequest } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions');
const app = require('../server/app');

setGlobalOptions({ region: 'asia-southeast1', maxInstances: 10 });

// Секреты подтягиваются из Secret Manager в runtime (process.env.*).
// Задать: firebase functions:secrets:set WORKSHOP_PIN  (и FIREBASE_WEB_API_KEY)
exports.api = onRequest(
  { secrets: ['WORKSHOP_PIN', 'FIREBASE_WEB_API_KEY'] },
  app
);
