const admin = require('firebase-admin');
const path  = require('path');

if (!admin.apps.length) {
  let credential;

  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    // Railway/Render: credentials переданы как base64-строка
    const json = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
    credential = admin.credential.cert(JSON.parse(json));
  } else {
    // Локальная разработка: читаем файл
    const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
      ? path.resolve(__dirname, '..', process.env.GOOGLE_APPLICATION_CREDENTIALS)
      : path.join(__dirname, '..', 'firebase-service-account.json');
    credential = admin.credential.cert(require(keyPath));
  }

  admin.initializeApp({
    credential,
    projectId: process.env.FIREBASE_PROJECT_ID || 'matrelax',
  });
}

const db = admin.firestore();
module.exports = { admin, db };
