# 🛏️ MATRELAX — Order Management System

> **Made in Kazakhstan** | Mattress Production & Sales Automation

Полнофункциональное веб-приложение для управления заказами матрасной компании **MATRELAX**.

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

Устанавливает зависимости:
- в корне (инструменты)
- в `client/`
- в `server/`

### 2) Инициализация структуры хранения данных

```bash
npm run init:folders
```

Создаёт директории для хранения JSON-данных на сервере.

### 3) Запуск (клиент + сервер)

```bash
npm run dev
```

Фронтенд и бэкенд стартуют параллельно.

- **Клиент:** http://localhost:3000
- **API:** http://localhost:3001/api

### UI (DrinKit-style)
Выполнены обновления интерфейса в стиле DrinKit:
- корзина: фиксированный bottom bar + выбор оплаты
- карточка товара: открытие как bottom sheet
- общий стиль: таблетки (999px), caps убран, активные элементы с белой рамкой, bottom sheet анимация `slide up 300ms ease`


---

## Как работает приложение (в двух частях)

### Клиент (`client/`)
- React 18 + Vite
- роутинг (React Router)
- хранение токена в `localStorage`
- страницы: логин, заказы, сотрудники, отчёты, настройки

### Сервер (`server/`)
- Express.js
- защита маршрутов JWT
- чтение/запись данных в JSON-файлы в `server/data/`

---

## Роли и авторизация

Доступ ко всем защищённым страницам фронтенда регулируется JWT.

- Логин/пароль администратора берутся из переменных окружения (если не заданы — используются значения по умолчанию).

**По умолчанию:****
- **Логин:** `admin`
- **Пароль:** `matrelax2026`

**Механика:}
- Клиент отправляет `POST /api/auth/login`.
- Сервер возвращает `token`.
- Токен передаётся заголовком `Authorization: Bearer <token>`.
- При `401` клиент очищает токен и редиректит на `/login`.

---

## API (основные эндпоинты)

### Публичные

- `POST /api/auth/login`
  - body: `{ login, password }`
  - returns: `{ success, token, login }`

- `GET /api/auth/verify`
  - protected на фронте, но в роуте возвращает данные (см. код)

- `GET /api/catalog`
  - возвращает каталог цен из `server/data/catalog/prices.json`

- `POST /api/catalog/calculate`
  - body: `{ modelId, size, extra10cm }`
  - returns: `{ basePrice, surcharge, totalPrice, series }`

### Защищённые (JWT)

Все ниже доступны только с валидным токеном:

- `GET /api/orders`
  - список заказов (registry.json)

- `GET /api/orders/:id`
  - детали конкретного заказа

- `POST /api/orders`
  - создание заказа
  - сервер генерирует `orderNumber` и `id`
  - сохраняет заказ в `orders/registry.json` и отдельным файлом `orders/<date>/<orderNumber>.json`

- `PUT /api/orders/:id`
  - обновление заказа (с историей действий)

- `DELETE /api/orders/:id`
  - удаление заказа из `registry.json`

- `GET /api/employees`
  - список сотрудников

- `POST /api/employees`
  - добавление сотрудника

- `POST /api/employees/:id/advance`
  - запись аванса сотруднику

- `POST /api/employees/:id/worklog`
  - запись рабочего лог-а сотруднику

- `GET /api/reports/daily/:date?`
  - суточный отчёт по дате (по умолчанию текущая дата)

- `GET /api/reports/monthly/:month?`
  - месячный отчёт по месяцу (по умолчанию текущий месяц)

- `GET /api/health`
  - health-check: `{ status: 'ok', timestamp }`

---

## Страницы фронтенда

| Страница | Описание |
|---|---|
| `/login` | Авторизация администратора |
| `/orders` | Kanban-доска заказов: **В работе → Готов → Доставка → Доставлен** |
| `/orders/new` | Мастер создания заказа (9 шагов) |
| `/orders/:id` | Детали заказа, редактирование, квитанция/выписка |
| `/employees` | Сотрудники, авансы, производительность |
| `/reports` | Суточные и месячные отчёты |
| `/settings` | Каталог цен и настройки/интеграции |

Все страницы кроме `/login` защищены (токен обязателен).

---

## Каталог и расчёт цен

Цены берутся из:

- `server/data/catalog/prices.json`

### Логика

- Для выбранной модели цена берётся по размеру (`sizes` содержит значения: 70–200 см).
- Если включена опция **extra10cm**, добавляется наценка для серии:
  - `catalog.series[model.series].surcharge10cm`

### Сущности

- **Серии:** `Royal`, `LUX`, `Elite`, `Premium`, `Ortoped`, `Polu-Orto`, `Euro`, `Toppers`, `Pillows`
- **Модели:** например `R1`, `L1`, `E1`, `701`, `400`, `500`, `504`, `700`, `Pillow1` и т.д.

---

## Хранение данных

Сервер использует JSON-файлы.

Инициализируемые директории (создаются скриптом `init:folders`):
- `server/data/orders/`
- `server/data/staff/`
- `server/data/finance/` *(в текущем коде не используется напрямую, но папка создаётся)*
- `server/data/catalog/`

Ключевые файлы:
- `server/data/orders/registry.json` — реестр заказов
- `server/data/orders/<date>/<orderNumber>.json` — отдельный файл заказа
- `server/data/staff/employees.json` — сотрудники, авансы и worklog

---

## Архитектура проекта

```
client/          → Vite + React 18 + React Router + компоненты UI
server/          → Express.js + JWT auth + JSON file storage
server/data/     → каталог цен, заказы, сотрудники, финансы
scripts/         → утилиты (инициализация папок)
```

---

## Команды и сценарии

| Команда | Описание |
|---|---|
| `npm run dev` | Запуск клиента и сервера параллельно |
| `npm run dev:client` | Только клиент (порт 3000) |
| `npm run dev:server` | Только сервер (порт 3001) |
| `npm run build` | Сборка клиента для продакшена |
| `npm run install:all` | Установка зависимостей в root/client/server |
| `npm run init:folders` | Создание структуры папок данных на сервере |

---

## Переменные окружения (.env)

Сервер использует:
- `ADMIN_LOGIN` — логин админа (по умолчанию `admin`)
- `ADMIN_PASSWORD` — пароль админа (по умолчанию `matrelax2026`)
- `JWT_SECRET` — секрет для подписи токена (по умолчанию `matrelax-secret-key-2026`)

Клиент (в Vite) использует:
- `VITE_API_URL` — базовый URL API (по умолчанию `'/api'`)

---

## Структура репозитория

- `.gitignore`
- `package.json` (root) — orchestrator команд
- `client/` — React приложение
- `server/` — Express API
- `scripts/` — init скрипты
- `server/data/` — каталог/заказы/сотрудники

---

*🛏️ MATRELAX — Sleep better, work smarter.*

