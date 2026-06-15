# Способ оплаты (paymentMethod) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить в заказ поле «способ оплаты» (`paymentMethod`: cash/card/kaspi/other), выбираемое при создании и редактируемое в карточке, с записью изменений в журнал.

**Architecture:** Одно опциональное поле заказа. Сервер уже сохраняет произвольные поля заказа и пишет полевые диффы в `history` через `computeFieldDiffs` (внутри Firestore-транзакции) — нужно лишь включить `paymentMethod`/`paymentType` в список отслеживаемых полей. Клиент добавляет выбор способа (плитки) в мастере создания и строку просмотра/правки в карточке.

**Tech Stack:** React 18 + Vite (JS/JSX), Express + firebase-admin, `node:test`. Источник истины — `docs/superpowers/specs/2026-06-16-payment-method-design.md`.

---

## Предпосылки и заметки по верификации

- Серверные тесты: `cd server && npm test` (Node `node:test`).
- Клиент: сборка `cd client && npm run build` (визуальная проверка вручную).
- Поле опционально: старые заказы без `paymentMethod` показываются как «—».
- Коммитим после каждой задачи. Работаем на текущей ветке `feat/orders-crm-analytics`.

## Карта файлов

- `server/utils/orderLogic.js` — добавить `paymentMethod`, `paymentType` в `TRACKED_FIELDS` (задача 1).
- `server/test/orderLogic.test.js` — тесты диффа (задача 1).
- `client/src/utils/constants.js` — `PAYMENT_METHODS` + `FIELD_LABELS.paymentMethod` (задача 2).
- `client/src/pages/CreateOrder/CreateOrder.jsx` — выбор способа в шаге «Оплата» + дефолт (задача 3).
- `client/src/pages/OrderDetails/OrderDetails.jsx` — просмотр + правка способа (задача 4).
- Финальная проверка сборки (задача 5).

---

## Task 1: Аудит способа/статуса оплаты (сервер, TDD)

**Files:**
- Modify: `server/utils/orderLogic.js` (массив `TRACKED_FIELDS`)
- Test: `server/test/orderLogic.test.js`

- [ ] **Step 1: Написать падающие тесты**

В конец `server/test/orderLogic.test.js` добавить:

```js
test('computeFieldDiffs: tracks paymentMethod change', () => {
  const diffs = computeFieldDiffs({ paymentMethod: 'cash' }, { paymentMethod: 'card' });
  assert.deepEqual(diffs, [{ field: 'paymentMethod', from: 'cash', to: 'card' }]);
});

test('computeFieldDiffs: tracks paymentType change', () => {
  const diffs = computeFieldDiffs({ paymentType: 'debt' }, { paymentType: 'paid' });
  assert.deepEqual(diffs, [{ field: 'paymentType', from: 'debt', to: 'paid' }]);
});

test('computeFieldDiffs: missing old paymentMethod reported as null', () => {
  const diffs = computeFieldDiffs({}, { paymentMethod: 'kaspi' });
  assert.deepEqual(diffs, [{ field: 'paymentMethod', from: null, to: 'kaspi' }]);
});
```

- [ ] **Step 2: Запустить — убедиться, что падают**

Run: `cd server && node --test test/orderLogic.test.js`
Expected: FAIL — 3 новых теста красные (поля ещё не отслеживаются, diffs пустые).

- [ ] **Step 3: Добавить поля в `TRACKED_FIELDS`**

В `server/utils/orderLogic.js` найти массив `TRACKED_FIELDS` и добавить два поля
(после `'notes'`):

```js
const TRACKED_FIELDS = [
  'customerName',
  'customerPhone',
  'notes',
  'paymentMethod',
  'paymentType',
  'salesPoint',
  'deliveryType',
  'deliveryAddress',
  'discount',
  'totalAmount',
  'paidAmount',
  'balance',
];
```

- [ ] **Step 4: Запустить — убедиться, что зелёные**

Run: `cd server && npm test`
Expected: PASS — все тесты зелёные (было 45 → стало 48).

- [ ] **Step 5: Commit**

```bash
git add server/utils/orderLogic.js server/test/orderLogic.test.js
git commit -m "feat(orders): audit paymentMethod/paymentType changes"
```

---

## Task 2: Константы способов оплаты (клиент)

**Files:**
- Modify: `client/src/utils/constants.js`

- [ ] **Step 1: Добавить словарь `PAYMENT_METHODS`**

В `client/src/utils/constants.js` рядом с существующим `PAYMENT_TYPES` добавить:

```js
export const PAYMENT_METHODS = {
  cash:  'Наличные',
  card:  'Карта (терминал)',
  kaspi: 'Kaspi QR / перевод',
  other: 'Другой банк / прочее',
};
```

- [ ] **Step 2: Добавить метку поля в `FIELD_LABELS`**

В объекте `FIELD_LABELS` добавить строку (рядом с `paidAmount`):

```js
  paymentMethod: 'Способ оплаты',
```

- [ ] **Step 3: Смоук-сборка**

Run: `cd client && npm run build`
Expected: сборка без ошибок.

- [ ] **Step 4: Commit**

```bash
git add client/src/utils/constants.js
git commit -m "feat(ui): add PAYMENT_METHODS + paymentMethod field label"
```

---

## Task 3: Выбор способа в мастере создания

**Files:**
- Modify: `client/src/pages/CreateOrder/CreateOrder.jsx`

- [ ] **Step 1: Импортировать `PAYMENT_METHODS`**

В импорте из `'../../utils/constants'` добавить `PAYMENT_METHODS` к существующему
списку (`SALES_POINTS, ORDER_TYPES, CLIENT_CATEGORIES, PAYMENT_TYPES, DELIVERY_TYPES, ...`):

```js
import {
  SALES_POINTS, ORDER_TYPES, CLIENT_CATEGORIES, PAYMENT_TYPES, PAYMENT_METHODS,
  DELIVERY_TYPES, STATUS, STATUS_LABELS, formatPrice
} from '../../utils/constants';
```

- [ ] **Step 2: Дефолт способа в начальном состоянии формы**

В `useState({ ... })` начального `form` добавить поле (рядом с `paymentType: 'paid'`):

```js
    paymentType: 'paid',
    paymentMethod: 'cash',
```

- [ ] **Step 3: Добавить плитки способа в шаг «Оплата» (case 6)**

В `renderStep()` в `case 6`, сразу ПОСЛЕ блока `point-buttons` с `PAYMENT_TYPES`
(перед условным блоком `form.paymentType !== 'paid'`), вставить:

```jsx
            <p className="step-desc" style={{ marginTop: 16 }}>Способ оплаты</p>
            <div className="point-buttons">
              {Object.entries(PAYMENT_METHODS).map(([key, label]) => (
                <button
                  key={key}
                  className={`btn-option ${form.paymentMethod === key ? 'selected' : ''}`}
                  onClick={() => updateForm({ paymentMethod: key })}
                >
                  {label}
                </button>
              ))}
            </div>
```

(Поле уже уходит на сервер: `handleSubmit` отправляет весь `form` через
`api.adminOrders.create`, поэтому `paymentMethod` сохранится автоматически.)

- [ ] **Step 4: Смоук-сборка**

Run: `cd client && npm run build`
Expected: без ошибок.

- [ ] **Step 5: Визуальная проверка (если запущен dev)**

Dev-сервер: http://localhost:5173 → войти → «Новый заказ» → шаг «Оплата» →
видны плитки «Наличные / Карта (терминал) / Kaspi QR / перевод / Другой банк /
прочее», выбор подсвечивается.

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/CreateOrder/CreateOrder.jsx
git commit -m "feat(ui): payment-method tiles in create-order payment step"
```

---

## Task 4: Просмотр и правка способа в карточке заказа

**Files:**
- Modify: `client/src/pages/OrderDetails/OrderDetails.jsx`

- [ ] **Step 1: Импортировать `PAYMENT_METHODS`**

В импорте из `'../../utils/constants'` добавить `PAYMENT_METHODS` к списку
(`SALES_POINTS, ORDER_TYPES, CLIENT_CATEGORIES, PAYMENT_TYPES, DELIVERY_TYPES, STATUS, ...`):

```js
import {
  SALES_POINTS, ORDER_TYPES, CLIENT_CATEGORIES, PAYMENT_TYPES, PAYMENT_METHODS,
  DELIVERY_TYPES, STATUS, STATUS_ORDER, STATUS_LABELS, FIELD_LABELS,
  formatPrice, formatDateTime,
} from '../../utils/constants';
```

- [ ] **Step 2: Показать/редактировать способ в блоке «Получение»**

В карточке «Получение» (там, где `DetailRow label="Оплата"` со статусом
`PAYMENT_TYPES[order.paymentType]`) добавить строку способа. Заменить блок оплаты
на:

```jsx
            <DetailRow label="Оплата" value={PAYMENT_TYPES[order.paymentType] || '—'} />
            {editMode ? (
              <EditRow label="Способ оплаты">
                <select
                  value={form.paymentMethod || 'cash'}
                  onChange={(e) => updateForm({ paymentMethod: e.target.value })}
                >
                  {Object.entries(PAYMENT_METHODS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </EditRow>
            ) : (
              <DetailRow label="Способ оплаты" value={PAYMENT_METHODS[order.paymentMethod] || '—'} />
            )}
```

(`EditRow`, `DetailRow`, `updateForm`, `form`, `editMode` уже существуют в файле.
Сохранение идёт через существующий `handleSave` → `api.adminOrders.update` → `PUT`
→ сервер пишет дифф в журнал. Журнал уже рендерит `edit`-записи через `FIELD_LABELS`,
а метка `paymentMethod` добавлена в задаче 2.)

- [ ] **Step 3: Смоук-сборка**

Run: `cd client && npm run build`
Expected: без ошибок.

- [ ] **Step 4: Визуальная проверка (если запущен dev)**

Открыть заказ → «Способ оплаты: …» виден. «Редактировать» → сменить способ →
«Сохранить» → в «История изменений» строка вида
«Способ оплаты: Наличные → Карта (терминал) · …».

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/OrderDetails/OrderDetails.jsx
git commit -m "feat(ui): show + edit payment method in order details"
```

---

## Task 5: Финальная проверка

**Files:** (без правок; при находках — точечные фиксы + доп. коммит)

- [ ] **Step 1: Серверные тесты**

Run: `cd server && npm test`
Expected: все зелёные (48 тестов).

- [ ] **Step 2: Полная сборка клиента**

Run: `cd client && npm run build`
Expected: без ошибок.

- [ ] **Step 3: Сквозная ручная проверка**

Создать заказ с выбранным способом → открыть карточку → способ виден → сменить
способ в правке → сохранить → запись в журнале читаема. Старый заказ без способа →
«—», без ошибок.

---

## Self-Review (выполнено при написании плана)

- **Покрытие спеки:** модель (T1 поле через аудит + T3/T4 запись), константы (T2),
  CreateOrder (T3), OrderDetails просмотр+правка (T4), аудит paymentMethod/paymentType
  (T1), тесты (T1, T5), краевой случай «—» (T4). Список заказов не трогаем (по спеке).
- **Плейсхолдеры:** нет — каждый шаг содержит конкретный код/команды.
- **Согласованность имён:** `paymentMethod`, `PAYMENT_METHODS`, `FIELD_LABELS.paymentMethod`,
  `TRACKED_FIELDS` — едины во всех задачах; значения `cash|card|kaspi|other` совпадают
  между константами клиента и тестами/диффами сервера.
