Build the Matrelax client and deploy to Firebase. Follow the matrelax-deploy skill steps exactly:
1. Check Firebase CLI is installed and user is authenticated
2. Run `npm run build:client` from repo root
3. Run `npx firebase-tools deploy --only hosting,firestore,functions --project matrelax`
4. Report the Hosting URL and any warnings

If the deploy fails with "Must be on Blaze plan", explain that attaching a billing account is required but the free tier is 2M invocations/month — no charges for a small shop.
