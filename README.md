# 🛏️ MATRELAX — Order Management System

> **Made in Kazakhstan** | Mattress Production & Sales Automation

Полнофункциональное веб-приложение для управления заказами матрасной компании **MATRELAX**.
Состоит из публичного интернет-магазина и внутренней панели персонала, работающих на
общем Express-бэкенде с Firebase Authentication и Cloud Firestore.

---

## Содержание

- [Быстрый старт](#быстрый-старт)
- [Как работает приложение (в двух частях)](#как-работает-приложение-в-двух-частях)
- [Роли и авторизация](#роли-и-авторизация)
- [API (основные эндпоинты)](#api-основные-эндпоинты)
- [Страницы фронтенда](#страницы-фронтенда)
- [Каталог и расчёт цен](#каталог-и-расчёт-цен)
- [Хранение данных](#хранение-данных)
- [Архитектура проекта](#архитектура-проекта)
- [Команды и сценарии](#команды-и-сценарии)
- [Переменные окружения (.env)](#переменные-окружения-env)
- [Структура репозитория](#структура-репозитория)

---

## Быстрый старт

### 1) Установка

```bash
npm run install:all
```

Устанавливает зависимости в корне, в `client/` и в `server/`.

### 2) Настройка `.env`

В корне проекта создайте файл `.env` с ключами Firebase (см. раздел
[Переменные окружения](#переменные-окружения-env)). Без них сервер не подключится
к Firestore, а вход вернёт `503`.

### 3) Запуск (клиент + сервер)

```bash
npm run dev
```

Фронтенд и бэкенд стартуют параллельно.

- **Клиент:** http://localhost:3000
- **API:** http://localhost:3001/api

### Прод-сборка

```bash
npm run build         # собирает client/dist
npm run dev:server    # сервер раздаёт client/dist + SPA-fallback
```

В продакшене сервер сам отдаёт собранный фронтенд из `client/dist`: статика
плюс SPA-fallback (любой не-`/api` GET-запрос возвращает `index.html`).

### UI (DrinKit-style)
Обновления интерфейса витрины в стиле DrinKit:
- корзина: фиксированный bottom bar + выбор оплаты
- карточка товара: открытие как bottom sheet
- общий стиль: таблетки (999px), caps убран, активные элементы с белой рамкой,
  анимация bottom sheet `slide up 300ms ease`

---

## Как работает приложение (в двух частях)

### Клиент (`client/`)
- React 18 + Vite, React Router v6
- Zustand для корзины (persist в `localStorage`)
- Tailwind CSS, lucide-react, recharts
- хранение токена Firebase в `localStorage`
- **публичная витрина:** главная, карточка товара, корзина, оформление, статус заказа
- **панель персонала:** заказы, создание заказа, детали, сотрудники, отчёты, настройки

### Сервер (`server/`)
- Express.js (порт 3001)
- Firebase Admin SDK — Firestore + проверка ID-токенов
- защита маршрутов через middleware `verifyToken` + `requireRole`

---

## Роли и авторизация

Аутентификация персонала построена на **Firebase Authentication** (email/password).
Сервер логинит пользователя через Firebase REST (`signInWithPassword`) и возвращает
ID-токен; роль хранится в **Custom Claims** токена (`role`).

| Роль | Доступ |
|------|--------|
| `admin` | Полный доступ: заказы, сотрудники, отчёты, каталог, пользователи |
| `manager` | Заказы, сотрудники, отчёты, каталог |
| `executor` | Цех: видит заказы в работе, переводит `progress → ready` (вход по PIN) |
| Публичный | Витрина, корзина, оформление, статус заказа |

**Механика:**
- Клиент отправляет `POST /api/auth/login` с `{ email, password }`.
- Сервер возвращает `{ token, refreshToken, email, displayName, role }`.
- Токен передаётся заголовком `Authorization: Bearer <token>`.
- Защищённые маршруты проверяют токен (`verifyToken`) и роль (`requireRole`).
- Исполнитель цеха использует PIN-заголовок `x-workshop-pin` (env `WORKSHOP_PIN`,
  по умолчанию `1234`) — отдельный аккаунт Firebase не нужен.

---

## API (основные эндпоинты)

### Публичные

- `POST /api/auth/login` — body `{ email, password }` → `{ token, refreshToken, email, displayName, role }`
- `GET /api/auth/verify` — проверка токена → `{ valid, email, role, uid }`
- `GET /api/products` — публичный каталог товаров (Firestore `products`)
- `POST /api/payment` — вебхуки оплаты (Kaspi / Freedom)

### PIN-защищённые (цех)

- `GET /api/orders` — заказы магазина для цеха (заголовок `x-workshop-pin`)
- `PATCH /api/orders/:id` — смена статуса заказа

### Firebase-защищённые (ID-токен + роль)

- `GET/POST/PUT/DELETE /api/admin-orders` — заказы персонала (Firestore `adminOrders`)
- `GET/POST /api/employees`, `POST /api/employees/:id/advance`, `POST /api/employees/:id/worklog`
- `GET /api/reports/daily/:date?`, `GET /api/reports/monthly/:month?`
- `GET /api/catalog`, `POST /api/catalog/calculate`
- `GET /api/auth/users` — список пользователей (только `admin`)

### Сервисные

- `GET /api/health` → `{ status: 'ok', timestamp, db: 'firestore' }`

---

## Страницы фронтенда

| Страница | Описание |
|---|---|
| `/` | Витрина: каталог матрасов и подушек |
| `/product/:id` | Карточка товара (bottom sheet) |
| `/cart`, `/checkout` | Корзина и оформление заказа |
| `/order-status/:id` | Статус заказа для покупателя |
| `/login` | Авторизация персонала (Firebase) |
| `/orders` | Доска заказов: **В работе → Готов → Доставка → Доставлен** |
| `/orders/new` | Мастер создания заказа |
| `/orders/:id` | Детали заказа, редактирование, квитанция |
| `/employees` | Сотрудники, авансы, производительность |
| `/reports` | Суточные и месячные отчёты |
| `/settings` | Каталог цен и настройки |

Страницы панели персонала защищены ролью; витрина доступна без авторизации.

---

## Каталог и расчёт цен

Цены берутся из `server/data/catalog/prices.json`.

### Логика

- Для выбранной модели цена берётся по размеру (`sizes`: 70–200 см).
- При опции **extra10cm** добавляется наценка серии: `catalog.series[model.series].surcharge10cm`.
- Эндпоинт `POST /api/catalog/calculate` принимает `{ modelId, size, extra10cm }`
  и возвращает `{ basePrice, surcharge, totalPrice, series }`.

### Сущности

- **Серии:** `Royal`, `LUX`, `Elite`, `Premium`, `Ortoped`, `Polu-Orto`, `Euro`, `Toppers`, `Pillows`
- **Модели:** например `R1`, `L1`, `E1`, `701`, `400`, `500`, `504`, `700`, `Pillow1` и т.д.

---

## Хранение данных

Основное хранилище — **Cloud Firestore** (через Firebase Admin SDK).

Коллекции:
- `adminOrders` — заказы персонала
- `shopOrders` — заказы витрины
- `products` — публичный каталог товаров
- `employees` — сотрудники, авансы, worklog
- `users` — пользователи и роли

Локальные JSON-файлы (`server/data/`) используются для каталога цен и как
legacy-данные:
- `server/data/catalog/prices.json` — прайс матрасов
- `server/data/staff/employees.json`, `server/data/orders/registry.json` — legacy

---

## Архитектура проекта

```
client/          → Vite + React 18 + React Router + Zustand + Tailwind
server/          → Express.js + Firebase Admin (Firestore + Auth)
server/routes/   → auth, products, payment, orders, adminOrders, employees, reports, catalog
server/data/     → каталог цен (prices.json) + legacy JSON
docs/            → спеки и планы (design specs / implementation plans)
```

---

## Команды и сценарии

| Команда | Описание |
|---|---|
| `npm run dev` | Запуск клиента и сервера параллельно |
| `npm run dev:client` | Только клиент (порт 3000) |
| `npm run dev:server` | Только сервер (порт 3001, раздаёт `client/dist` в прод) |
| `npm run build` | Сборка клиента (`client/dist`) |
| `npm run build:client` | Алиас сборки клиента |
| `npm run deploy` | lint + сборка + `firebase deploy` (hosting, firestore, functions) |
| `npm run install:all` | Установка зависимостей в root/client/server |

---

## Переменные окружения (.env)

Сервер (Firebase Admin):
- `FIREBASE_PROJECT_ID` — ID проекта Firebase
- `FIREBASE_SERVICE_ACCOUNT_BASE` *(или `GOOGLE_APPLICATION_CREDENTIALS`)* — сервисный аккаунт
- `FIREBASE_WEB_API_KEY` — Web API Key для входа через Firebase REST
- `WORKSHOP_PIN` — PIN исполнителя цеха (по умолчанию `1234`)
- `PORT` — порт сервера (по умолчанию `3001`)

Клиент (Vite):
- `VITE_API_URL` — базовый URL API (по умолчанию `'/api'`)

---

## Структура репозитория

- `.gitignore`
- `package.json` (root) — orchestrator команд
- `client/` — React-приложение (витрина + панель)
- `server/` — Express API + Firebase Admin
- `server/data/` — каталог цен и legacy JSON
- `docs/` — спеки и планы

---

*🛏️ MATRELAX — Sleep better, work smarter.*
