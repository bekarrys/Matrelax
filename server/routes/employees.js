const express = require('express');
const { db } = require('../utils/firebase');
const { requireRole } = require('../middleware/auth');

const router = express.Router();
const COL = 'employees';

// Весь роутер admin-only (роль проверена при монтировании в app.js). Менеджер
// ограничен витриной + историей заказов и сотрудников не видит. Создание,
// авансы и выработка — критичные финансовые операции, тоже только admin.
const adminOnly = requireRole('admin');

router.get('/', async (req, res) => {
  try {
    const snap = await db.collection(COL).get();
    res.json({ employees: snap.docs.map((d) => d.data()) });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка чтения сотрудников' });
  }
});

router.post('/', adminOnly, async (req, res) => {
  try {
    const id = Date.now().toString();
    const employee = { id, ...req.body, advances: [], worklog: [] };
    await db.collection(COL).doc(id).set(employee);
    res.status(201).json(employee);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка создания сотрудника' });
  }
});

router.post('/:id/advance', adminOnly, async (req, res) => {
  try {
    const ref = db.collection(COL).doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'Сотрудник не найден' });
    const advance = {
      id: Date.now().toString(),
      ...req.body,
      date: req.body.date || new Date().toISOString().split('T')[0],
    };
    const advances = [...(snap.data().advances || []), advance];
    await ref.update({ advances });
    res.json(advance);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка добавления аванса' });
  }
});

router.post('/:id/worklog', adminOnly, async (req, res) => {
  try {
    const ref = db.collection(COL).doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'Сотрудник не найден' });
    const entry = {
      id: Date.now().toString(),
      ...req.body,
      date: req.body.date || new Date().toISOString().split('T')[0],
    };
    const worklog = [...(snap.data().worklog || []), entry];
    await ref.update({ worklog });
    res.json(entry);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка записи производительности' });
  }
});

module.exports = router;
