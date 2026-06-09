Seed Firestore with Matrelax data from local JSON files. Follow the matrelax-migrate skill:
1. Confirm which collections to import (default: all — products, shopOrders, adminOrders, employees)
2. Check that FIREBASE env vars are set in .env
3. Run `node server/scripts/migrate.js`
4. Report how many documents were written to each collection

Warn the user that this OVERWRITES existing Firestore documents.
