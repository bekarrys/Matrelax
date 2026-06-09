Check the health of the Matrelax development environment. Follow the matrelax-health skill:
1. Test API server: `curl -s http://localhost:3001/api/products | head -c 200`
2. Test client: `curl -s http://localhost:5173 | grep -o "<title>.*</title>"`
3. Test Firestore connection via Node
4. Check all required env vars in .env

Report a status table: API server ✓/✗, Client ✓/✗, Firestore ✓/✗, ENV vars ✓/✗.
If anything is broken, provide the exact command to fix it.
