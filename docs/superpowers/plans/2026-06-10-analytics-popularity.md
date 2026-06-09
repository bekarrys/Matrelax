# Analytics Popularity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Собирать события витрины (`product_view`, `series_filter`, `add_to_cart`) через серверный прокси и показывать «Топ серий/товаров» в staff-панели.

**Architecture:** Подход A — сырые события пишутся по одному документу в коллекцию `analyticsEvents` через Express + Firebase Admin SDK; отчёт «топ» считается на лету запросом по диапазону `day` и `reduce` в памяти (как `topModels` в [server/routes/reports.js](../../../server/routes/reports.js)). Клиент шлёт события fire-and-forget; прямого доступа к коллекции у клиента нет (Firestore default-deny).

**Tech Stack:** Node/Express (CommonJS), firebase-admin, express-rate-limit, node:test; React/Vite (zustand), lucide-react.

**Spec:** [docs/superpowers/specs/2026-06-10-analytics-popularity-design.md](../specs/2026-06-10-analytics-popularity-design.md)

**Перед началом:** создать ветку от `main`:
```bash
git checkout main && git pull origin main && git checkout -b feat/analytics-popularity
```

---

### Task 1: Валидатор события

**Files:**
- Create: `server/utils/validator.js`
- Test: `server/utils/validator.test.js`
- Modify: `server/package.json` (добавить `test` script)

- [ ] **Step 1: Добавить test-скрипт**

В `server/package.json` в блок `"scripts"` добавить:

```json
"test": "node --test"
```

- [ ] **Step 2: Написать падающий тест**

Создать `server/utils/validator.test.js`:

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateAnalyticsEvent } = require('./validator');

test('product_view: валиден с modelId', () => {
  const r = validateAnalyticsEvent({ type: 'product_view', modelId: 'm1' });
  assert.deepEqual(r, { ok: true, value: { type: 'product_view', modelId: 'm1' } });
});

test('product_view: принимает опциональную series', () => {
  const r = validateAnalyticsEvent({ type: 'product_view', modelId: 'm1', series: 'comfort' });
  assert.equal(r.ok, true);
  assert.equal(r.value.series, 'comfort');
});

test('series_filter: валиден с series', () => {
  const r = validateAnalyticsEvent({ type: 'series_filter', series: 'comfort' });
  assert.deepEqual(r, { ok: true, value: { type: 'series_filter', series: 'comfort' } });
});

test('add_to_cart: валиден с modelId+series', () => {
  const r = validateAnalyticsEvent({ type: 'add_to_cart', modelId: 'm1', series: 'comfort' });
  assert.equal(r.ok, true);
});

test('отклоняет неизвестный type', () => {
  assert.equal(validateAnalyticsEvent({ type: 'click', modelId: 'm1' }).ok, false);
});

test('product_view без modelId — ошибка', () => {
  assert.equal(validateAnalyticsEvent({ type: 'product_view' }).ok, false);
});

test('series_filter с modelId — ошибка', () => {
  assert.equal(validateAnalyticsEvent({ type: 'series_filter', series: 'c', modelId: 'm1' }).ok, false);
});

test('строка длиннее 100 — ошибка', () => {
  assert.equal(validateAnalyticsEvent({ type: 'product_view', modelId: 'x'.repeat(101) }).ok, false);
});

test('управляющие символы — ошибка', () => {
  assert.equal(validateAnalyticsEvent({ type: 'product_view', modelId: 'a' + String.fromCharCode(0) + 'b' }).ok, false);
});

test('пробелы разрешены (серия "Базовая коллекция")', () => {
  const r = validateAnalyticsEvent({ type: 'series_filter', series: 'Базовая коллекция' });
  assert.equal(r.ok, true);
  assert.equal(r.value.series, 'Базовая коллекция');
});

test('лишние поля отбрасываются', () => {
  const r = validateAnalyticsEvent({ type: 'product_view', modelId: 'm1', evil: 1, day: 'hack' });
  assert.deepEqual(Object.keys(r.value).sort(), ['modelId', 'type']);
});

test('не-объект — ошибка', () => {
  assert.equal(validateAnalyticsEvent(null).ok, false);
  assert.equal(validateAnalyticsEvent('x').ok, false);
});
```

- [ ] **Step 3: Запустить тест — убедиться, что падает**

Run: `cd server && npm test`
Expected: FAIL — `Cannot find module './validator'`.

- [ ] **Step 4: Реализовать валидатор**

Создать `server/utils/validator.js`:

```js
const TYPES = ['product_view', 'series_filter', 'add_to_cart'];
const MAX_LEN = 100;

// Непустая строка без управляющих символов (пробелы РАЗРЕШЕНЫ), длиной до MAX_LEN.
// Серия по умолчанию "Базовая коллекция" содержит пробел и обязана проходить.
function isCleanString(v) {
  return typeof v === 'string'
    && v.length > 0
    && v.length <= MAX_LEN
    && !/[\x00-\x1f\x7f]/.test(v);
}

// validateAnalyticsEvent(body) -> { ok:true, value } | { ok:false, error }
// value содержит ТОЛЬКО разрешённые поля (type, modelId?, series?).
function validateAnalyticsEvent(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'Тело должно быть объектом' };
  }
  const { type, modelId, series } = body;
  if (!TYPES.includes(type)) {
    return { ok: false, error: 'Недопустимый type' };
  }

  const value = { type };

  if (type === 'series_filter') {
    if (!isCleanString(series)) return { ok: false, error: 'series обязателен' };
    if (modelId !== undefined) return { ok: false, error: 'modelId недопустим для series_filter' };
    value.series = series;
  } else {
    // product_view | add_to_cart
    if (!isCleanString(modelId)) return { ok: false, error: 'modelId обязателен' };
    value.modelId = modelId;
    if (series !== undefined) {
      if (!isCleanString(series)) return { ok: false, error: 'series некорректен' };
      value.series = series;
    }
  }

  return { ok: true, value };
}

module.exports = { validateAnalyticsEvent };
```

- [ ] **Step 5: Запустить тест — убедиться, что проходит**

Run: `cd server && npm test`
Expected: PASS — все тесты validator зелёные.

- [ ] **Step 6: Commit**

```bash
git add server/utils/validator.js server/utils/validator.test.js server/package.json
git commit -m "feat: add analytics event validator"
```

---

### Task 2: Агрегация популярности (чистые функции)

**Files:**
- Create: `server/utils/popularityReport.js`
- Test: `server/utils/popularityReport.test.js`

- [ ] **Step 1: Написать падающий тест**

Создать `server/utils/popularityReport.test.js`:

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseDayRange, aggregatePopularity } = require('./popularityReport');

test('parseDayRange: день', () => {
  assert.deepEqual(parseDayRange('2026-06-10'), { from: '2026-06-10', to: '2026-06-11' });
});

test('parseDayRange: месяц', () => {
  assert.deepEqual(parseDayRange('2026-06'), { from: '2026-06-01', to: '2026-07-01' });
});

test('parseDayRange: декабрь перекатывается в следующий год', () => {
  assert.deepEqual(parseDayRange('2026-12'), { from: '2026-12-01', to: '2027-01-01' });
});

test('parseDayRange: год', () => {
  assert.deepEqual(parseDayRange('2026'), { from: '2026-01-01', to: '2027-01-01' });
});

test('parseDayRange: мусор — ошибка', () => {
  assert.throws(() => parseDayRange('июнь'), /Неверный формат/);
});

test('aggregatePopularity: считает топы и byType', () => {
  const events = [
    { type: 'product_view', modelId: 'm1', series: 'comfort' },
    { type: 'product_view', modelId: 'm1', series: 'comfort' },
    { type: 'product_view', modelId: 'm2', series: 'lux' },
    { type: 'series_filter', series: 'comfort' },
    { type: 'add_to_cart', modelId: 'm2', series: 'lux' },
  ];
  const r = aggregatePopularity(events);
  assert.deepEqual(r.topSeries, [['comfort', 3], ['lux', 2]]);
  assert.deepEqual(r.topProducts, [['m1', 2], ['m2', 2]]);
  assert.deepEqual(r.byType, { product_view: 3, series_filter: 1, add_to_cart: 1 });
});

test('aggregatePopularity: пустой ввод', () => {
  const r = aggregatePopularity([]);
  assert.deepEqual(r.topSeries, []);
  assert.deepEqual(r.topProducts, []);
  assert.deepEqual(r.byType, { product_view: 0, series_filter: 0, add_to_cart: 0 });
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `cd server && npm test`
Expected: FAIL — `Cannot find module './popularityReport'`.

- [ ] **Step 3: Реализовать агрегацию + запрос**

Создать `server/utils/popularityReport.js`:

```js
const { db } = require('./firebase');

const COL = 'analyticsEvents';
const TOP_N = 10;

// period -> { from, to } как даты 'YYYY-MM-DD' (полуинтервал [from, to)).
// Зеркалит parsePeriod из revenueReport.js, но для строкового поля `day`.
function parseDayRange(period) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(period)) {
    const d = new Date(period + 'T00:00:00.000Z');
    d.setUTCDate(d.getUTCDate() + 1);
    return { from: period, to: d.toISOString().slice(0, 10) };
  }
  if (/^\d{4}-\d{2}$/.test(period)) {
    const [y, m] = period.split('-').map(Number);
    const ny = m === 12 ? y + 1 : y;
    const nm = m === 12 ? 1 : m + 1;
    return { from: `${period}-01`, to: `${ny}-${String(nm).padStart(2, '0')}-01` };
  }
  if (/^\d{4}$/.test(period)) {
    return { from: `${period}-01-01`, to: `${Number(period) + 1}-01-01` };
  }
  throw new Error(
    `Неверный формат периода: "${period}". Ожидается YYYY-MM-DD, YYYY-MM или YYYY`
  );
}

function aggregatePopularity(events) {
  const series = {};
  const products = {};
  const byType = { product_view: 0, series_filter: 0, add_to_cart: 0 };

  for (const e of events) {
    if (byType[e.type] !== undefined) byType[e.type]++;
    if (e.series) series[e.series] = (series[e.series] || 0) + 1;
    if (e.modelId) products[e.modelId] = (products[e.modelId] || 0) + 1;
  }

  const top = (obj) =>
    Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, TOP_N);

  return { topSeries: top(series), topProducts: top(products), byType };
}

async function getPopularityReport(period) {
  const { from, to } = parseDayRange(period);
  // Range-запрос по одному полю `day` — одиночный индекс создаётся автоматически.
  const snap = await db
    .collection(COL)
    .where('day', '>=', from)
    .where('day', '<', to)
    .get();
  const events = snap.docs.map((d) => d.data());
  return { period, ...aggregatePopularity(events) };
}

module.exports = { parseDayRange, aggregatePopularity, getPopularityReport };
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `cd server && npm test`
Expected: PASS — validator + popularityReport тесты зелёные.

- [ ] **Step 5: Commit**

```bash
git add server/utils/popularityReport.js server/utils/popularityReport.test.js
git commit -m "feat: add popularity aggregation util"
```

---

### Task 3: POST /api/analytics/events + rate-limit

**Files:**
- Create: `server/routes/analytics.js`
- Modify: `server/app.js`
- Modify: `server/package.json` (зависимость express-rate-limit)

- [ ] **Step 1: Установить express-rate-limit**

Run: `cd server && npm install express-rate-limit`
Expected: пакет добавлен в `dependencies`.

- [ ] **Step 2: Создать роут**

Создать `server/routes/analytics.js`:

```js
const express = require('express');
const { randomUUID } = require('crypto');
const { db } = require('../utils/firebase');
const { validateAnalyticsEvent } = require('../utils/validator');

const router = express.Router();
const COL = 'analyticsEvents';

// POST /api/analytics/events — публичный, fire-and-forget с витрины
router.post('/events', async (req, res) => {
  const result = validateAnalyticsEvent(req.body);
  if (!result.ok) return res.status(400).json({ error: result.error });

  try {
    const createdAt = new Date().toISOString();
    const doc = {
      id: randomUUID(),
      type: result.value.type,
      modelId: result.value.modelId ?? null,
      series: result.value.series ?? null,
      createdAt,
      day: createdAt.slice(0, 10),
      source: 'shop',
    };
    await db.collection(COL).doc(doc.id).set(doc);
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('analytics write failed', err);
    res.status(500).json({ error: 'Ошибка записи события' });
  }
});

module.exports = router;
```

- [ ] **Step 3: Подключить лимитер ДО парсера и смонтировать роут**

В `server/app.js`:

1. После `const cors = require('cors');` добавить:
```js
const rateLimit = require('express-rate-limit');
```

2. Заменить блок
```js
app.use(cors({ origin: true }));
app.use(express.json());
```
на
```js
app.use(cors({ origin: true }));

// Rate-limit аналитики ДО express.json(): мусорные запросы ботов
// отсекаются раньше парсинга тела. Дефолт 60 req / 60 s на IP.
const analyticsLimiter = rateLimit({
  windowMs: Number(process.env.ANALYTICS_RATE_WINDOW_MS) || 60_000,
  max: Number(process.env.ANALYTICS_RATE_MAX) || 60,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/analytics', analyticsLimiter);

app.use(express.json());
```

3. После строки `app.use('/api/orders', require('./routes/orders'));` добавить:
```js
app.use('/api/analytics',    require('./routes/analytics'));
```

- [ ] **Step 4: Ручная проверка эндпоинта**

> Примечание (YAGNI): HTTP-слой проверяем вручную через curl, а не supertest+mock-db — вся логика (валидация) уже покрыта юнит-тестами в Task 1, обработчик тонкий. Это сознательное отклонение от строки спека «integration tests (mock db)».

Запустить сервер: `cd server && npm run dev`

Валидное событие → 201:
```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/analytics/events \
  -H "Content-Type: application/json" \
  -d '{"type":"product_view","modelId":"test-model","series":"comfort"}'
```
Expected: `201`

Невалидное → 400:
```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/analytics/events \
  -H "Content-Type: application/json" -d '{"type":"nope"}'
```
Expected: `400`

(Порт уточнить по `server/index.js`; в Firestore должна появиться запись в `analyticsEvents`.)

- [ ] **Step 5: Commit**

```bash
git add server/routes/analytics.js server/app.js server/package.json server/package-lock.json
git commit -m "feat: add public analytics events endpoint with rate limiting"
```

---

### Task 4: GET /api/reports/popularity/:period?

**Files:**
- Modify: `server/routes/reports.js`

- [ ] **Step 1: Добавить роут**

В `server/routes/reports.js`:

1. После `const { getRevenueReport } = require('../utils/revenueReport');` добавить:
```js
const { getPopularityReport } = require('../utils/popularityReport');
```

2. Перед `module.exports = router;` добавить:
```js
// GET /api/reports/popularity/:period?
// period: 'YYYY-MM-DD' | 'YYYY-MM' | 'YYYY' (по умолчанию текущий месяц)
router.get('/popularity/:period?', verifyToken, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const period = req.params.period || new Date().toISOString().slice(0, 7);
    res.json(await getPopularityReport(period));
  } catch (err) {
    const isBadPeriod = err.message.startsWith('Неверный формат');
    res.status(isBadPeriod ? 400 : 500).json({ error: err.message });
  }
});
```

- [ ] **Step 2: Ручная проверка**

При запущенном сервере (нужен ID-токен admin/manager в заголовке Authorization):
```bash
curl -s -X GET "http://localhost:3000/api/reports/popularity/$(date +%Y-%m)" \
  -H "Authorization: Bearer <ID_TOKEN>"
```
Expected: JSON `{ period, topSeries, topProducts, byType }`. Без токена → `401`. Период `2026-13` → `400`.

- [ ] **Step 3: Commit**

```bash
git add server/routes/reports.js
git commit -m "feat: add popularity report endpoint"
```

---

### Task 5: Firestore rules — блок analyticsEvents + тест

**Files:**
- Modify: `firestore.rules`
- Modify: `test-rules.mjs`

- [ ] **Step 1: Добавить документирующий блок правил**

В `firestore.rules` перед блоком `// CATCH-ALL` (`match /{document=**}`) вставить:

```
    // ───────────────────────────────────────────────────────────────
    //  ANALYTICS EVENTS  (сырые события витрины)
    //  Пишет и читает ТОЛЬКО сервер через Admin SDK (обходит правила).
    //  Клиенту доступ закрыт полностью (избыточно к catch-all, но явно).
    // ───────────────────────────────────────────────────────────────
    match /analyticsEvents/{eventId} {
      allow read, write: if false;
    }
```

- [ ] **Step 2: Добавить тест-кейс**

В `test-rules.mjs` перед блоком `// ─── Очистка` вставить:

```js
// ════════════════════════════════════════════════════════════════════════════
// ТЕСТ C — Менеджер пытается создать событие в analyticsEvents  → DENY
// ════════════════════════════════════════════════════════════════════════════
console.log(`${I} ${B('Тест C')} — Менеджер: POST в analyticsEvents (запрещено)`);
console.log(`   ${DIM('POST /analyticsEvents/test-analytics-event')}\n`);
const tC = await fsCreate(managerToken, 'analyticsEvents', 'test-analytics-event', {
  type: 'product_view', modelId: 'TEST',
});
report('Тест C — Менеджер: запись в analyticsEvents', tC, false);
```

(Очистка не нужна — запись отклоняется, документ не создаётся.)

- [ ] **Step 3: Прогнать тест правил**

Run: `node test-rules.mjs`
Expected: все кейсы PASS, включая «Тест C … DENY». Default-deny уже активен, поэтому тест проходит независимо от деплоя.

- [ ] **Step 4: Задеплоить правила (синхронизация файла с боевыми)**

Run: `npx -y firebase-tools@latest deploy --only firestore:rules`
Expected: `Deploy complete!`. (Требует доступ к проекту Firebase; функционально analyticsEvents уже закрыт catch-all'ом — деплой держит файл и боевые правила в синхроне.)

- [ ] **Step 5: Commit**

```bash
git add firestore.rules test-rules.mjs
git commit -m "feat: explicit deny rule and test for analyticsEvents collection"
```

---

### Task 6: Клиентский хелпер trackEvent

**Files:**
- Create: `client/src/utils/analytics.js`

- [ ] **Step 1: Создать хелпер**

Создать `client/src/utils/analytics.js`:

```js
import { API_URL } from './constants';

// Fire-and-forget трекинг. Никогда не бросает и не мешает витрине.
// Намеренно НЕ через api.request: тот при 401 редиректит на /login.
export function trackEvent(event) {
  try {
    fetch(`${API_URL}/analytics/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
      keepalive: true, // долетит даже при уходе со страницы
    }).catch(() => {});
  } catch {}
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/utils/analytics.js
git commit -m "feat: add client trackEvent helper"
```

---

### Task 7: Инструментирование витрины

**Files:**
- Modify: `client/src/pages/Home/Home.jsx`
- Modify: `client/src/pages/ProductDetail/ProductDetail.jsx`

- [ ] **Step 1: series_filter в Home.jsx**

1. После `import './Home.css';` добавить:
```js
import { trackEvent } from '../../utils/analytics';
```

2. Перед `const sectionLabel = ...` добавить обработчик:
```js
  const handleSeriesChange = (value) => {
    setSelectedSeries(value);
    if (value !== 'all') trackEvent({ type: 'series_filter', series: value });
  };
```
> Debounce из спека опущен: выбор серии — дискретный клик (не ввод текста), а сервер уже rate-limit'ит. Лишняя сложность не нужна.

3. Заменить
```jsx
              onChange={setSelectedSeries}
```
на
```jsx
              onChange={handleSeriesChange}
```

- [ ] **Step 2: product_view и add_to_cart в ProductDetail.jsx**

1. После `import './ProductDetail.css';` добавить:
```js
import { trackEvent } from '../../utils/analytics';
```

2. В `useEffect` заменить блок `.then((data) => { ... })` на:
```js
      .then((data) => {
        setProduct(data);
        if (data.sizes?.length) setSelectedSize(data.sizes[0]);
        if (data.fabricOptions?.length) setSelectedFabric(data.fabricOptions[0]);
        trackEvent({ type: 'product_view', modelId: data.id, series: data.series });
      })
```

3. В `handleAddToCart` сразу после `addItem({ ... });` добавить:
```js
    trackEvent({ type: 'add_to_cart', modelId: product.id, series: product.series });
```

- [ ] **Step 3: Проверка сборки клиента**

Run: `cd client && npm run build`
Expected: сборка без ошибок.

- [ ] **Step 4: Ручная проверка в браузере**

При запущенных сервере и клиенте: открыть витрину, выбрать серию, открыть товар, добавить в корзину. В DevTools → Network должны уйти `POST /api/analytics/events` со статусом 201; UX не должен меняться при остановленном бэкенде (события молча падают).

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/Home/Home.jsx client/src/pages/ProductDetail/ProductDetail.jsx
git commit -m "feat: instrument shop with analytics events"
```

---

### Task 8: Отчёт «Популярность» в staff-панели

**Files:**
- Modify: `client/src/utils/api.js`
- Modify: `client/src/pages/Reports/Reports.jsx`

- [ ] **Step 1: Добавить метод API**

В `client/src/utils/api.js` в объект `reports` (после строки `revenue: ...`) добавить:
```js
    popularity: (period) => request(`/reports/popularity${period ? `/${period}` : ''}`),
```

- [ ] **Step 2: Импорт иконки**

В `client/src/pages/Reports/Reports.jsx` заменить строку импорта lucide-react:
```js
import { BarChart3, Calendar, TrendingUp, Loader2, Download } from 'lucide-react';
```
на
```js
import { BarChart3, Calendar, TrendingUp, Loader2, Download, Flame } from 'lucide-react';
```

- [ ] **Step 3: Состояние и загрузка**

1. После `const [monthlyReport, setMonthlyReport] = useState(null);` добавить:
```js
  const [popularityReport, setPopularityReport] = useState(null);
```

2. После функции `fetchMonthly` добавить:
```js
  const fetchPopularity = async () => {
    setLoading(true);
    try {
      const data = await api.reports.popularity(selectedMonth);
      setPopularityReport(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
```

3. Заменить `handleGenerate` на:
```js
  const handleGenerate = () => {
    if (reportType === 'daily') fetchDaily();
    else if (reportType === 'popularity') fetchPopularity();
    else fetchMonthly();
  };
```

- [ ] **Step 4: Кнопка переключателя**

В блоке `report-type-toggle` после кнопки «За месяц» добавить:
```jsx
          <button
            className={`toggle-btn ${reportType === 'popularity' ? 'active' : ''}`}
            onClick={() => setReportType('popularity')}
          >
            <Flame size={16} />
            Популярность
          </button>
```

> Поле выбора периода для популярности — месячное: существующее условие
> `reportType === 'daily' ? (date) : (month)` уже отдаёт month-picker для
> popularity, менять не нужно.

- [ ] **Step 5: Рендер секции популярности**

Заменить открытие блока контента
```jsx
      {loading ? (
        <div className="loading-report">
          <Loader2 size={40} className="spin" />
          <p>Генерация отчёта...</p>
        </div>
      ) : currentReport ? (
```
на
```jsx
      {loading ? (
        <div className="loading-report">
          <Loader2 size={40} className="spin" />
          <p>Генерация отчёта...</p>
        </div>
      ) : reportType === 'popularity' ? (
        popularityReport ? (
          <div className="report-content">
            <div className="report-summary">
              <div className="summary-card">
                <span className="summary-label">Просмотры</span>
                <span className="summary-value">{popularityReport.byType.product_view}</span>
              </div>
              <div className="summary-card">
                <span className="summary-label">Фильтр серии</span>
                <span className="summary-value">{popularityReport.byType.series_filter}</span>
              </div>
              <div className="summary-card">
                <span className="summary-label">В корзину</span>
                <span className="summary-value">{popularityReport.byType.add_to_cart}</span>
              </div>
            </div>

            {popularityReport.topSeries.length > 0 && (
              <div className="report-section">
                <h3>Топ серий</h3>
                <div className="report-table">
                  {popularityReport.topSeries.map(([name, count], idx) => (
                    <div key={name} className="report-table-row">
                      <span><span className="top-rank">{idx + 1}</span>{name}</span>
                      <span>{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {popularityReport.topProducts.length > 0 && (
              <div className="report-section">
                <h3>Топ товаров</h3>
                <div className="report-table">
                  {popularityReport.topProducts.map(([modelId, count], idx) => (
                    <div key={modelId} className="report-table-row">
                      <span><span className="top-rank">{idx + 1}</span>{modelId}</span>
                      <span>{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="report-empty">
            <Flame size={48} />
            <p>Нажмите «Сформировать» для отчёта популярности</p>
          </div>
        )
      ) : currentReport ? (
```

(Существующие закрывающие `) : ( <div className="report-empty"> ... )}` для daily/monthly остаются без изменений.)

- [ ] **Step 6: Проверка сборки**

Run: `cd client && npm run build`
Expected: сборка без ошибок.

- [ ] **Step 7: Ручная проверка**

Залогиниться как admin/manager → Отчёты → «Популярность» → выбрать месяц → «Сформировать». Должны отрисоваться счётчики byType и таблицы топов (после того как в Task 7 накопились события).

- [ ] **Step 8: Commit**

```bash
git add client/src/utils/api.js client/src/pages/Reports/Reports.jsx
git commit -m "feat: add popularity section to reports page"
```

---

## Финал

- [ ] Прогнать серверные тесты: `cd server && npm test` — все зелёные.
- [ ] Прогнать правила: `node test-rules.mjs` — все зелёные.
- [ ] Собрать клиент: `cd client && npm run build` — без ошибок.
- [ ] Использовать superpowers:finishing-a-development-branch для merge/PR ветки `feat/analytics-popularity`.
