# 🛏️ MATRELAX — Online Mattress Store

> **Made in Kazakhstan** | Mattress Production & Sales

Публичный интернет-магазин матрасной фабрики **MATRELAX**: витрина, корзина,
оформление и отслеживание заказа. Работает на Express-бэкенде с Cloud Firestore.

> **Важно (декомиссия портала менеджера).** Раньше приложение включало внутреннюю
> панель персонала (заказы/аналитика/сотрудники/каталог). Она **выведена из
> эксплуатации**: клиент стал чисто магазином, а серверные маршруты портала —
> размонтированы. Полный снимок панели сохранён на ветке
> **`origin/legacy-admin-backup`**, логика портала — в `server/routes/*` и
> `server/utils/*` (не подключена), на случай переиспользования.

---

## Содержание

- [Быстрый старт](#быстрый-старт)
- [Как устроено](#как-устроено)
- [API (активные эндпоинты)](#api-активные-эндпоинты)
- [Страницы магазина](#страницы-магазина)
- [Хранение данных](#хранение-данных)
- [Архитектура проекта](#архитектура-проекта)
- [Команды и сценарии](#команды-и-сценарии)
- [Переменные окружения (.env)](#переменные-окружения-env)
- [Декоммиссированный портал менеджера](#декоммиссированный-портал-менеджера)

---

## Быстрый старт

### 1) Установка
```bash
npm run install:all
```
Ставит зависимости в корне, `client/` и `server/`.

### 2) Настройка `.env`
В корне создайте `.env` с ключами Firebase (см. [Переменные окружения](#переменные-окружения-env)).
Без них сервер не подключится к Firestore.

### 3) Запуск (клиент + сервер)
```bash
npm run dev
```
- **Клиент (Vite dev):** http://localhost:5173
- **API:** http://localhost:3001/api

### Прод-сборка
```bash
npm run build       # собирает client/dist
npm run dev:server  # сервер раздаёт client/dist + SPA-fallback на :3001
```
В продакшене сам сервер отдаёт собранный фронт из `client/dist` (статика +
SPA-fallback: любой не-`/api` GET → `index.html`).

---

## Как устроено

### Клиент (`client/`) — только магазин
- React 18 + Vite (JavaScript/JSX), React Router v6
- Zustand для корзины (persist в `localStorage`)
- Tailwind (utilities) + кастомная CSS-дизайн-система (тёмная тема, токены в
  `styles/globals.css`), lucide-react
- Авторизация и панель **не используются** — приложение публичное.

### Сервер (`server/`)
- Express.js (порт **3001**), точка входа `index.js` (поднимает `app.js`,
  освобождает занятый порт)
- Firebase Admin SDK → Cloud Firestore
- Монтируются только магазинные маршруты: `products`, `orders`, `payment`.

---

## API (активные эндпоинты)

### Публичные
- `GET /api/products?activeOnly=1[&category=...]` — каталог активных товаров (`products`)
- `GET /api/products/:id` — карточка товара
- `POST /api/orders` — создание заказа магазина (`shopOrders`)
- `GET /api/orders/:id/public` — публичный статус заказа
- `POST /api/payment/initiate`, `GET /api/payment/status/:orderId` — оплата (Kaspi / Freedom)

### Цех (PIN)
- `GET /api/orders` / `PATCH /api/orders/:id/status` — заголовок `x-workshop-pin`
  (env `WORKSHOP_PIN`, по умолчанию `1234`)

### Сервисные
- `GET /api/health` → `{ status: 'ok', timestamp, db: 'firestore' }`

> Маршруты `admin-orders`, `analytics`, `auth`, `employees`, `reports`, `catalog`
> **размонтированы** (см. [декоммиссия](#декоммиссированный-портал-менеджера)).

---

## Страницы магазина

| Путь | Описание |
|---|---|
| `/` | Витрина: каталог матрасов и подушек |
| `/product/:id` | Карточка товара (bottom sheet) |
| `/checkout` | Оформление заказа |
| `/order/:id` | Статус заказа для покупателя |

Корзина — глобальный bottom-sheet (`CartSheet`), состояние в Zustand.
Любой другой путь редиректит на `/`.

---

## Хранение данных

Основное хранилище — **Cloud Firestore** (Firebase Admin SDK). Коллекции,
используемые магазином:
- `products` — каталог товаров
- `shopOrders` — заказы витрины

Локальные данные: `server/data/catalog/prices.json` — прайс (используется
сохранённой логикой расчёта цены каталога, сейчас не смонтирована).

> Коллекция `adminOrders` (заказы портала) и связанные данные сохраняются, но
> клиентом не используются.

---

## Архитектура проекта

```
client/src/
  App.jsx              → роутинг магазина (storefront-only)
  api/index.js         → клиент API магазина (products, orders, payment)
  store/cartStore.js   → Zustand-корзина
  pages/               → Home, ProductDetail, Checkout, OrderStatus
  components/          → CartSheet, BottomSheet, ProductCard, SeriesDropdown
  styles/globals.css   → дизайн-токены (тёмная тема)

server/
  index.js             → запуск (порт + освобождение порта)
  app.js               → Express, Firebase, монтаж магазинных маршрутов, раздача client/dist
  routes/              → products, orders, payment (активны) + портал (дормант)
  middleware/auth.js   → verifyToken / requireRole (для мутаций products)
  utils/firebase.js    → инициализация Admin SDK
  data/catalog/        → prices.json
  test/                → node:test для сохранённой логики портала (45 тестов)
```

---

## Команды и сценарии

| Команда | Описание |
|---|---|
| `npm run dev` | Клиент (Vite) + сервер параллельно |
| `npm run dev:client` | Только клиент |
| `npm run dev:server` | Только сервер (`:3001`, раздаёт `client/dist`) |
| `npm run build` | Сборка клиента (`client/dist`) |
| `npm run install:all` | Установка зависимостей в root/client/server |
| `npm test` *(в `server/`)* | Тесты сохранённой логики (`node:test`) |

---

## Переменные окружения (.env)

Сервер (Firebase Admin):
- `FIREBASE_PROJECT_ID` — ID проекта Firebase
- `FIREBASE_SERVICE_ACCOUNT_BASE64` *(или `GOOGLE_APPLICATION_CREDENTIALS` — путь к JSON)* — сервисный аккаунт
- `WORKSHOP_PIN` — PIN цеха (по умолчанию `1234`)
- `PORT` — порт сервера (по умолчанию `3001`)

Клиент (Vite):
- `VITE_API_URL` — базовый URL API (по умолчанию `'/api'`)

---

## Декоммиссированный портал менеджера

Внутренняя панель (заказы-CRM, аналитика, сотрудники, отчёты, каталог) выведена
из эксплуатации, чтобы клиентское приложение было **только магазином**:

- **Клиент:** страницы и инфраструктура панели удалены из роутинга (магазин на `/`).
- **Сервер:** маршруты `admin-orders`, `analytics`, `auth`, `employees`, `reports`,
  `catalog` не монтируются в `app.js`. Их обработчики и чистая логика
  (`utils/orderLogic.js`, `utils/analytics.js`) **сохранены** и покрыты тестами
  (`server/test/`, `npm test`) — для переиспользования в будущем объединённом портале.
- **Полный снимок** портала до удаления — ветка **`origin/legacy-admin-backup`**
  (откат: `git checkout legacy-admin-backup`).

---

*🛏️ MATRELAX — Sleep better.*
