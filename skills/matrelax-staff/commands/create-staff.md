Create or reset Matrelax staff users in Firebase Auth. Follow the matrelax-staff skill:
1. Ask if user wants default accounts (admin, manager, executor) or a custom user
2. For default: run `node server/scripts/create-users.js`
3. For custom: ask for email, displayName, role — then run the inline script from the skill guide
4. Confirm created users by listing them with `admin.auth().listUsers()`

Default accounts: admin@matrelax.kz / matrelax2026, manager@matrelax.kz / manager2026, executor@matrelax.kz / executor2026
