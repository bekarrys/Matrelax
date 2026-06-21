const express = require('express');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

const FIREBASE_REST_URL =
  'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword';

// POST /api/auth/login  { email, password }
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  // Имя без префикса FIREBASE_ — он зарезервирован в Secret Manager.
  const apiKey = process.env.WEB_API_KEY;

  if (!apiKey || apiKey === 'PASTE_YOUR_WEB_API_KEY_HERE') {
    return res.status(503).json({ error: 'WEB_API_KEY не настроен' });
  }

  try {
    const fbRes = await fetch(`${FIREBASE_REST_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });

    const fbData = await fbRes.json();
    if (!fbRes.ok) {
      const msg = fbData.error?.message || 'INVALID_CREDENTIALS';
      if (msg.includes('INVALID') || msg.includes('EMAIL')) {
        return res.status(401).json({ error: 'Неверный email или пароль' });
      }
      return res.status(401).json({ error: msg });
    }

    // Парсим JWT payload локально — роль уже в Custom Claims, verifyIdToken не нужен
    const payload = JSON.parse(Buffer.from(fbData.idToken.split('.')[1], 'base64url').toString());
    const role = payload.role || 'client';

    res.json({
      token: fbData.idToken,
      refreshToken: fbData.refreshToken,
      email: payload.email,
      displayName: fbData.displayName || '',
      role,
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Ошибка сервера при входе' });
  }
});

// GET /api/auth/verify  — проверяет текущий токен
router.get('/verify', verifyToken, (req, res) => {
  res.json({ valid: true, email: req.user.email, role: req.user.role, uid: req.user.uid });
});

// GET /api/auth/users  — список пользователей (только admin)
router.get('/users', verifyToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Только для администратора' });
  }
  try {
    const { db } = require('../utils/firebase');
    const snap = await db.collection('users').get();
    res.json(snap.docs.map((d) => d.data()));
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки пользователей' });
  }
});

module.exports = router;
