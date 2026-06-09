---
name: matrelax-deploy
description: >-
  Builds the Matrelax client and deploys to Firebase Hosting + Cloud Functions
  + Firestore Rules. Use this skill whenever the user asks to deploy, publish,
  or release the app. Requires Firebase CLI and Blaze plan.
---

# Matrelax — Deploy to Firebase

## Steps

1. **Check prerequisites**
   - Verify Firebase CLI is installed: `npx firebase-tools --version`
   - Verify user is logged in: `npx firebase-tools login --no-localhost`
   - Show current project: `npx firebase-tools use`

2. **Build the client**
   Run from the repo root:
   ```
   npm run build:client
   ```
   If the build fails, read the error output and fix it before continuing.

3. **Deploy**
   ```
   npx firebase-tools deploy --only hosting,firestore,functions --project matrelax
   ```

4. **Verify**
   After a successful deploy, report:
   - Hosting URL (shown in deploy output)
   - Function region: `asia-southeast1`
   - Any warnings or skipped services

## Common errors

| Error | Fix |
|---|---|
| `Must be on Blaze plan` | Upgrade at Firebase Console → Project settings → Billing |
| `ENOENT client/dist` | Run `npm run build:client` first |
| `ESLint errors in functions/` | Fix lint errors in `functions/index.js` |
| `functions/node_modules missing` | Run `cd functions && npm install` |

## What gets deployed
- **Hosting** → `client/dist/` → `https://matrelax.web.app`
- **Functions** → `functions/index.js` → wraps Express `server/app.js`
- **Firestore Rules** → `firestore.rules`
- **Firestore Indexes** → `firestore.indexes.json`

## Hosting rewrites
`/api/**` → Firebase Function `api` (Express)
`**` → `/index.html` (SPA fallback)
