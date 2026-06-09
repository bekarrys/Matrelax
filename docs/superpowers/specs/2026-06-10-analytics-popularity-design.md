# Аналитика популярности серий/товаров — дизайн

Дата: 2026-06-10
Статус: Дизайн утверждён, готов к планированию реализации

## Цель

Дать staff-панели ответ на вопрос **«что популярно»**: какие серии чаще
фильтруют и какие товары чаще смотрят/кладут в корзину на витрине. Данные нужны
для решений по ассортименту и выкладке. Это **сигнал направления**, а не
биллинг-грейд точность.

Не входит в эту фазу (явно отложено как YAGNI): воронка конверсии,
session/анонимные ID, суточные агрегатные таблицы, плановый rollup-воркер,
дашборды с динамикой во времени.

## Архитектурное решение

**Подход A — сырые события + агрегация при чтении.**

Каждое событие пишется отдельным документом в коллекцию `analyticsEvents` через
серверный прокси (Express + Firebase Admin SDK). Отчёт «топ» считается на лету
запросом по диапазону дат и `reduce` в памяти — тот же приём, что уже
используется в [server/routes/reports.js](../../../server/routes/reports.js) для
`topModels`.

Отвергнутые альтернативы:
- **B (счётчики-инкременты):** теряем сырьё, нельзя нарезать задним числом.
- **C (сырьё + плановая агрегация / Firebase Scheduled Function):** масштабируемо,
  но преждевременно сложно для текущего трафика. Переход на C поверх уже
  накопленного сырья остаётся возможным в будущем.

Стек — реальный: **JavaScript Express (CommonJS)**, Firestore через
`firebase-admin`, без TypeScript и без `zod`. Валидация — **лёгкий ручной
валидатор** (схема события крошечная, новая зависимость не оправдана).

## Схема данных — коллекция `analyticsEvents`

Одно событие = один документ. Всё для агрегации лежит плоско на событии — без
join'ов с каталогом и без вложенных `metadata`.

```js
{
  id:        "uuid",                 // randomUUID()
  type:      "product_view",         // 'product_view' | 'series_filter' | 'add_to_cart'
  modelId:   "matrelax-comfort-180" | null,  // для product_view / add_to_cart
  series:    "comfort" | null,       // для series_filter; денормализован и на view/add_to_cart
  createdAt: "2026-06-10T12:34:56.789Z",     // ISO 8601, генерит сервер
  day:       "2026-06-10",           // 'YYYY-MM-DD', сервер выводит из createdAt
  source:    "shop"                  // обогащение
}
```

Обоснование:
- **`day` отдельным полем** → агрегация читает только окно
  (`where('day','>=',from).where('day','<=',to)`), а не всю коллекцию. Диапазон
  по одному полю не требует составного индекса.
- **`series` денормализован на `product_view`/`add_to_cart`** (когда серия товара
  известна) → «топ серий» считается одним проходом `acc[e.series]++`.
- **`modelId`/`series` — плоские поля верхнего уровня** → тривиальный `reduce`.
- **Нет `metadata: record(any)`** — провоцирует мусор; добавим явное поле, если
  понадобится новый разрез.
- **События неизменяемы, только append** — клиентского пути update/delete нет.

### Правила валидации

- `type` — обязателен, строго один из трёх значений.
- `product_view`, `add_to_cart` → `modelId` обязателен (непустая строка ≤ 100),
  `series` опционален (строка ≤ 100).
- `series_filter` → `series` обязателен (строка ≤ 100), `modelId` запрещён.
- `series` (когда присутствует) сверяется с известным списком серий; неизвестные
  отклоняются.
- Лишние поля отбрасываются; длины строк ограничены (анти-мусор).

## Безопасность

**Главный принцип: клиент никогда не обращается к `analyticsEvents` напрямую.**
Запись и чтение идут только через сервер на Admin SDK, который обходит Firestore
rules.

- В [firestore.rules](../../../firestore.rules) — явный **deny** на коллекцию
  `analyticsEvents` (нет клиентского read/write/update/delete). Из браузера в
  коллекцию ничего не записать и не прочитать даже с web-конфигом Firebase.

| Угроза | Защита |
|---|---|
| Сбросить/удалить чужие данные | Невозможно: клиенту недоступны write/delete (rules deny). Единственный публичный путь — POST, который только *создаёт* событие. |
| Накрутить статистику | Снижаем: (1) строгая схема-валидация; (2) per-IP rate-limit (best-effort); (3) сверка `series` с известным списком. |

**Known limitation:** публичный анонимный эндпоинт нельзя на 100% защитить от
спуфинга. Это осознанный компромисс для трафика витрины; аналитика трактуется как
сигнал направления. Будущие усиления при необходимости: подписанные токены,
hCaptcha, серверный вывод событий из навигации.

**Приватность:** в событии нет PII. IP используется только транзиентно для
rate-limit и **в документ не пишется**.

## Эндпоинты

### `POST /api/analytics/events` — публичный (без auth)

- Монтируется в [server/app.js](../../../server/app.js) без `verifyToken` (как
  `POST /api/orders`).
- Перед роутом — лёгкий **in-memory rate-limit middleware** (дефолт: 60 запросов
  за 60 с на IP, настраивается через env). При превышении → `429`.
- Тело → ручной валидатор. Ошибка валидации → `400 { error }` (никогда 500 на
  плохой ввод).
- Сервер обогащает `id`, `createdAt`, `day`, `source`; пишет в `analyticsEvents`
  через admin SDK.
- Ответ `201 { ok: true }` (данные не эхоим).

### `GET /api/reports/popularity/:period?` — admin/manager

- Встаёт под уже существующий `verifyToken + requireRole('admin','manager')` на
  `/api/reports`.
- `period`: `YYYY-MM-DD` | `YYYY-MM` | `YYYY` (как `reports/revenue`); по
  умолчанию текущий месяц.
- Запрашивает события по диапазону `day`, `reduce` в топы, сортировка, топ-N.
- Ответ:
  ```js
  {
    period,
    topSeries:   [["comfort", 42], ...],
    topProducts: [["matrelax-comfort-180", 17], ...],
    byType:      { product_view, series_filter, add_to_cart }
  }
  ```
- Плохой `period` → `400`, иначе `500`.

## Клиентский трекинг

Мини-хелпер `client/src/utils/analytics.js` — **намеренно не через `api.request`**
(тот при 401 редиректит на `/login` и цепляет токен; аналитика публична и не
должна мешать витрине):

```js
import { API_URL } from './constants';
export function trackEvent(event) {
  try {
    fetch(`${API_URL}/analytics/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
      keepalive: true,        // долетит при уходе со страницы
    }).catch(() => {});       // fire-and-forget
  } catch {}
}
```

Точки инструментирования:
- `series_filter` — [client/src/pages/Home/Home.jsx](../../../client/src/pages/Home/Home.jsx)
  при выборе серии в SeriesDropdown (небольшой debounce).
- `product_view` — [client/src/pages/ProductDetail/ProductDetail.jsx](../../../client/src/pages/ProductDetail/ProductDetail.jsx)
  на mount.
- `add_to_cart` — там, где реально добавляют в корзину
  (ProductCard/ProductDetail/cartStore).

Метод `api.reports.popularity(period)` добавляется в
[client/src/utils/api.js](../../../client/src/utils/api.js).

## Обработка ошибок

- POST: невалидное тело → `400 { error }`; сбой записи → `500` + `console.error`
  (клиент игнорирует, fire-and-forget).
- GET popularity: плохой `period` → `400`, иначе `500`.
- `trackEvent` никогда не бросает и не влияет на UX витрины.

## Инфраструктура / индексы

Фильтрация только по одному полю `day` (range) — составной индекс **не нужен**,
работает из коробки. [firestore.indexes.json](../../../firestore.indexes.json)
менять не требуется.

## Тестирование

- **Юнит — валидатор:** валидные/невалидные кейсы по каждому типу, отсутствующие
  поля, превышение длины, неизвестный тип, лишние поля, неизвестная серия.
- **Юнит — агрегация:** набор событий → ожидаемые `topSeries`/`topProducts`/`byType`.
- **Интеграция эндпоинтов:** POST валидный → 201 + запись (mock db); POST
  невалидный → 400; GET popularity → отсортированные топы.
- **Rules:** в [test-rules.mjs](../../../test-rules.mjs) — клиентский доступ к
  `analyticsEvents` запрещён.
- **Клиент:** `trackEvent` глотает ошибки и не бросает.

## Порядок реализации

1. **Backend**
   - Обновить `firestore.rules` (deny на `analyticsEvents`).
   - Создать `server/utils/validator.js` (валидатор события).
   - Создать `server/routes/analytics.js` (POST + rate-limit middleware), смонтировать в `app.js`.
   - Добавить `GET /api/reports/popularity/:period?` + утилиту агрегации.
2. **Инфраструктура**
   - Подтвердить, что индексы Firestore не нужны (фильтр только по `day`).
3. **Frontend**
   - `client/src/utils/analytics.js`.
   - Вызовы `trackEvent` в `Home.jsx`, `ProductDetail.jsx`, корзине.
   - `api.reports.popularity` в `api.js`.
4. **Reporting UI**
   - Секция «Популярность» на странице Reports.
