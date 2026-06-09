const { onRequest } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions');
const app = require('../server/app');

setGlobalOptions({ region: 'asia-southeast1', maxInstances: 10 });

exports.api = onRequest(app);
