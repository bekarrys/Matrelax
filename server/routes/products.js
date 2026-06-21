const express = require('express');
const { randomUUID } = require('crypto');
const { db } = require('../utils/firebase');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();
const COL = 'products';

const adminOnly = [verifyToken, requireRole('admin')];

// Белый список полей товара — не даём писать в Firestore произвольный мусор
const ALLOWED_FIELDS = [
  'name', 'series', 'category', 'descriptionLong',
  'specs', 'sizes', 'fabricOptions', 'extra10cm', 'surcharge10cm', 'image',
  'isActive', 'prices', 'marketPrices', 'composition', 'inStock', 'imageUrl',
];

const DEFAULT_SERIES = 'Базовая коллекция';

function pickProductFields(body = {}) {
  const out = {};
  for (const key of ALLOWED_FIELDS) {
    if (body[key] !== undefined) out[key] = body[key];
  }
  return out;
}

// Валидация типов критичных полей. Возвращает строку с ошибкой или null.
function validateProductTypes(fields) {
  if (fields.series !== undefined && typeof fields.series !== 'string') {
    return 'Серия должна быть строкой';
  }
  if (fields.isActive !== undefined && typeof fields.isActive !== 'boolean') {
    return 'Поле isActive должно быть true/false';
  }
  if (fields.sizes !== undefined && !Array.isArray(fields.sizes)) {
    return 'Размеры должны быть массивом';
  }
  if (fields.fabricOptions !== undefined && !Array.isArray(fields.fabricOptions)) {
    return 'Ткани должны быть массивом';
  }
  return null;
}

// Каждая ячейка ткань×размер должна быть положительным числом — иначе товар
// с ценой 0/null уедет на витрину. Проверяем только если матрица передана.
function validateMatrix(matrix, fabrics, sizes, label) {
  if (matrix === undefined) return null;
  if (typeof matrix !== 'object' || matrix === null || Array.isArray(matrix)) {
    return `${label}: матрица должна быть объектом`;
  }
  if (!Array.isArray(fabrics) || fabrics.length === 0) return `${label}: не заданы ткани`;
  if (!Array.isArray(sizes) || sizes.length === 0) return `${label}: не заданы размеры`;
  for (const fabric of fabrics) {
    const row = matrix[fabric];
    if (!row || typeof row !== 'object') return `${label}: нет цен для ткани «${fabric}»`;
    for (const s of sizes) {
      const key = `${s.width}x${s.height}`;
      const v = row[key];
      if (typeof v !== 'number' || v <= 0) {
        return `${label}: не заполнена цена, ткань «${fabric}», размер ${key}`;
      }
    }
  }
  return null;
}

function validatePriceMatrix(fields) {
  return (
    validateMatrix(fields.prices, fields.fabricOptions, fields.sizes, 'Цены продажи') ||
    validateMatrix(fields.marketPrices, fields.fabricOptions, fields.sizes, 'Рыночные цены')
  );
}

// GET /api/products?category=mattresses
router.get('/', async (req, res) => {
  try {
    let query = db.collection(COL);
    if (req.query.category) {
      query = query.where('category', '==', req.query.category);
    }
    const snap = await query.get();
    let products = snap.docs.map((d) => d.data());

    // ?activeOnly=1 — публичный магазин не показывает скрытые товары (isActive === false)
    const publicShop = req.query.activeOnly === '1' || req.query.activeOnly === 'true';
    if (publicShop) {
      products = products.filter((p) => p.isActive !== false);
    }

    // Публичную витрину кэшируем на CDN Firebase Hosting: каталог меняется редко,
    // запрос отдаётся с edge без холодного старта функции. SWR обновляет в фоне.
    // Админские запросы (без activeOnly) не кэшируем — нужна свежесть после правок.
    res.set('Cache-Control', publicShop
      ? 'public, max-age=60, s-maxage=300, stale-while-revalidate=600'
      : 'no-store');

    // Сортировка на бэке: сначала по серии, внутри серии — по имени.
    // Делаем в памяти, чтобы не требовать составной индекс Firestore при фильтре по category.
    products.sort((a, b) =>
        (a.series || '').localeCompare(b.series || '', 'ru') ||
        (a.name || '').localeCompare(b.name || '', 'ru')
      );
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки каталога' });
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const snap = await db.collection(COL).doc(req.params.id).get();
    if (!snap.exists) return res.status(404).json({ error: 'Товар не найден' });
    res.json(snap.data());
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки товара' });
  }
});

// POST /api/products — создание товара (admin only)
router.post('/', ...adminOnly, async (req, res) => {
  try {
    const fields = pickProductFields(req.body);
    if (!fields.name || typeof fields.name !== 'string') {
      return res.status(400).json({ error: 'Название товара обязательно' });
    }
    const typeError = validateProductTypes(fields);
    if (typeError) return res.status(400).json({ error: typeError });

    const priceError = validatePriceMatrix(fields);
    if (priceError) return res.status(400).json({ error: priceError });

    // Дефолты, чтобы новые записи всегда имели серию и флаг активности
    if (fields.series === undefined) fields.series = DEFAULT_SERIES;
    if (fields.isActive === undefined) fields.isActive = true;

    const id = req.body.id || randomUUID();
    const now = new Date().toISOString();
    const product = { id, createdAt: now, updatedAt: now, ...fields };
    await db.collection(COL).doc(id).set(product);
    res.status(201).json(product);
  } catch (err) {
    console.error('Product create error:', err.message);
    res.status(500).json({ error: 'Ошибка создания товара' });
  }
});

// PUT /api/products/:id — обновление (admin only)
router.put('/:id', ...adminOnly, async (req, res) => {
  try {
    const ref = db.collection(COL).doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'Товар не найден' });

    const fields = pickProductFields(req.body);
    if (fields.name !== undefined && (!fields.name || typeof fields.name !== 'string')) {
      return res.status(400).json({ error: 'Название не может быть пустым' });
    }
    const typeError = validateProductTypes(fields);
    if (typeError) return res.status(400).json({ error: typeError });

    const priceError = validatePriceMatrix(fields);
    if (priceError) return res.status(400).json({ error: priceError });

    const updated = { ...fields, updatedAt: new Date().toISOString() };
    await ref.update(updated);
    res.json({ ...snap.data(), ...updated });
  } catch (err) {
    console.error('Product update error:', err.message);
    res.status(500).json({ error: 'Ошибка обновления товара' });
  }
});

// DELETE /api/products/:id — удаление (admin only)
router.delete('/:id', ...adminOnly, async (req, res) => {
  try {
    const ref = db.collection(COL).doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'Товар не найден' });
    await ref.delete();
    res.json({ ok: true });
  } catch (err) {
    console.error('Product delete error:', err.message);
    res.status(500).json({ error: 'Ошибка удаления товара' });
  }
});

module.exports = router;
