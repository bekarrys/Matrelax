---
name: matrelax-health
description: >-
  Checks the health of the Matrelax development environment: verifies the API
  server is running, tests key endpoints, and reports any issues. Use when
  something seems broken or before starting a dev session.
---

# Matrelax — Health Check

Verifies that both the client dev server and the Express API are running correctly.

## Check API server

```
curl -s http://localhost:3001/api/products | head -c 200
```

Expected: JSON array of products. If you get `ECONNREFUSED`, the server is not running.

**Start the server:**
```
npm run dev:server
```

## Check client dev server

```
curl -s http://localhost:5173 | grep -o "<title>.*</title>"
```

Expected: `<title>MATRELAX</title>`. If empty, start the client:
```
npm run dev:client
```

## Start everything at once

```
npm run dev
```

This runs both servers via `concurrently`.

## Check Firestore connection

```
node -e "
require('dotenv').config();
const { db } = require('./server/utils/firebase');
db.collection('products').limit(1).get()
  .then(s => console.log('Firestore OK, product count probe:', s.size))
  .catch(e => console.error('Firestore ERROR:', e.message));
"
```

## Check environment variables

```
node -e "
const keys = ['FIREBASE_SERVICE_ACCOUNT_BASE64','JWT_SECRET','PORT'];
keys.forEach(k => console.log(k + ':', process.env[k] ? '✓ set' : '✗ MISSING'));
" 
```

Or just: `cat .env`

## Port conflicts

If port 3001 is already in use:
```
npx kill-port 3001
```
The server uses `kill-port` automatically on startup, but if that fails run it manually.

## Production health (Firebase Hosting)

```
curl -s https://matrelax.web.app/api/products | head -c 200
```

If this returns an HTML 404 or Firebase error page, the Functions deploy may have failed — run `/deploy` to redeploy.
