---
name: matrelax-staff
description: >-
  Creates or updates Matrelax staff users in Firebase Auth and Firestore.
  Use when adding a new employee, resetting credentials, or setting up roles
  (admin, manager, executor). Runs server/scripts/create-users.js.
---

# Matrelax — Staff User Management

## Roles

| Role | Access |
|---|---|
| `admin` | Full access: orders, products, employees, reports, settings |
| `manager` | Orders + products read/write, no employee management |
| `executor` | Orders read + status updates only (цех) |
| `client` | Public shop only (auto-assigned on first login) |

## Default staff accounts (from create-users.js)

| Email | Password | Role |
|---|---|---|
| admin@matrelax.kz | matrelax2026 | admin |
| manager@matrelax.kz | manager2026 | manager |
| executor@matrelax.kz | executor2026 | executor |

## Create / reset default users

```
node server/scripts/create-users.js
```

The script uses `createOrUpdate` — safe to re-run, it will update existing users instead of failing.

## Add a custom user

To create a new staff member not in the default list, either:

**Option A** — edit `server/scripts/create-users.js`, add to the `USERS` array, re-run.

**Option B** — run inline:
```js
require('dotenv').config();
const { admin, db } = require('./server/utils/firebase');

async function addUser() {
  const user = await admin.auth().createUser({
    email: 'newperson@matrelax.kz',
    password: 'pass2026',
    displayName: 'Имя Фамилия',
  });
  await db.collection('users').doc(user.uid).set({ role: 'manager' });
  console.log('Created:', user.uid);
}
addUser();
```

## Check current users

```
node -e "
require('dotenv').config();
const { admin } = require('./server/utils/firebase');
admin.auth().listUsers().then(r => r.users.forEach(u => console.log(u.email, u.uid)));
"
```

## Firestore role lookup

The server reads `users/{uid}.role` from Firestore on every authenticated request. Changing the role in Firestore takes effect immediately — no redeploy needed.
