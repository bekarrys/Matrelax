# Витрина как POS-рабочее место менеджера — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Сделать витрину рабочим местом менеджера под логином: каталог→корзина→POS-оформление создаёт `adminOrder`, «История заказов» — центр правок; старый мастер и публичный клиентский поток удалены.

**Architecture:** Витрина-маршруты (`/`, `/product/:id`, `/checkout`) гейтятся новым `ManagerRoute` (auth-редирект, без сайдбара). `Checkout` переписывается под POS и вызывает authed `api.adminOrders.create` через чистый маппинг `cartToOrderItems`. Панель (`/orders`, `/orders/:id`) и сайдбар (`Layout`) остаются; пункт «Новый заказ» → «Каталог» (акцентный) ведёт на `/`.

**Tech Stack:** React 18 + Vite (JSX/ESM), React Router v6, Zustand cart, Express+firebase-admin. Тесты — `node:test`. Спека: `docs/superpowers/specs/2026-06-16-storefront-as-manager-pos-design.md`.

---

## Предпосылки и верификация

- Клиент: `cd client && npm run build` — без ошибок (основная проверка).
- Маппинг корзины: `node --test client/src/utils/orderMapping.test.mjs` (ESM-юнит).
- Сервер: `cd server && npm test` — прежние 48 зелёные (создание заказа уже покрыто).
- Коммитим после каждой задачи. Ветка `feat/orders-crm-analytics`.

## Карта файлов

- Create: `client/src/utils/orderMapping.mjs` — чистый `cartToOrderItems` (Task 1).
- Create: `client/src/utils/orderMapping.test.mjs` — node:test (Task 1).
- Modify: `client/src/App.jsx` — `ManagerRoute`, новый роутинг, удаление публичных путей (Task 2).
- Modify: `client/src/pages/Checkout/Checkout.jsx` (+ `.css` при необходимости) — POS (Task 3).
- Modify: `client/src/components/Layout/Layout.jsx` — пункт «Каталог» (Task 4).
- Modify: `client/src/pages/OrderDetails/OrderDetails.jsx` — имя позиции из снимка (Task 4).
- Delete: `client/src/pages/CreateOrder/**`, `client/src/pages/OrderStatus/**` (Task 5).
- Финальная проверка (Task 6).

---

## Task 1: Чистый маппинг корзины → позиции заказа (TDD)

**Files:**
- Create: `client/src/utils/orderMapping.mjs`
- Create: `client/src/utils/orderMapping.test.mjs`

- [ ] **Step 1: Написать падающий тест**

Создать `client/src/utils/orderMapping.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cartToOrderItems, cartTotal } from './orderMapping.mjs';

test('cartToOrderItems maps cart entries to admin order items', () => {
  const items = [
    { productId: 'p1', name: 'Royal R1', size: '160×200', fabric: 'Жаккард', extra10cm: true, price: 90000, quantity: 2 },
  ];
  assert.deepEqual(cartToOrderItems(items), [
    { name: 'Royal R1', modelId: 'p1', size: '160×200', extra10cm: true, quantity: 2, price: 90000, surcharge: 0 },
  ]);
});

test('cartToOrderItems defaults quantity to 1 and extra10cm to false', () => {
  const out = cartToOrderItems([{ productId: 'p2', name: 'L1', size: '140×190', price: 50000 }]);
  assert.equal(out[0].quantity, 1);
  assert.equal(out[0].extra10cm, false);
});

test('cartToOrderItems on empty cart returns empty array', () => {
  assert.deepEqual(cartToOrderItems([]), []);
});

test('cartTotal sums price * quantity', () => {
  assert.equal(cartTotal([
    { price: 1000, quantity: 2 },
    { price: 500, quantity: 3 },
  ]), 3500);
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `node --test client/src/utils/orderMapping.test.mjs`
Expected: FAIL — `Cannot find module './orderMapping.mjs'`.

- [ ] **Step 3: Реализовать модуль**

Создать `client/src/utils/orderMapping.mjs`:
```js
// Чистый маппинг корзины витрины → позиции заказа adminOrders.
// Без зависимостей от React — тестируется node:test.

export function cartToOrderItems(items = []) {
  return items.map((i) => ({
    name: i.name,
    modelId: i.productId,
    size: i.size,
    extra10cm: i.extra10cm ?? false,
    quantity: i.quantity ?? 1,
    price: i.price ?? 0,
    surcharge: 0,
  }));
}

export function cartTotal(items = []) {
  return items.reduce((sum, i) => sum + (i.price ?? 0) * (i.quantity ?? 1), 0);
}
```

- [ ] **Step 4: Запустить — зелёный**

Run: `node --test client/src/utils/orderMapping.test.mjs`
Expected: PASS (4 теста).

- [ ] **Step 5: Commit**

```bash
git add client/src/utils/orderMapping.mjs client/src/utils/orderMapping.test.mjs
git commit -m "feat(pos): add tested cart→order item mapping"
```

---

## Task 2: Auth-гейт витрины + чистка роутинга (`App.jsx`)

**Files:**
- Modify: `client/src/App.jsx` (полная замена содержимого)

- [ ] **Step 1: Переписать `App.jsx`**

Заменить весь файл `client/src/App.jsx` на:
```jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Витрина (рабочее место менеджера, под логином)
import Home from './pages/Home/Home';
import ProductDetail from './pages/ProductDetail/ProductDetail';
import Checkout from './pages/Checkout/Checkout';
import CartSheet from './components/CartSheet/CartSheet';

// Авторизация
import Login from './pages/Login/Login';

// Управление заказами (таблица + карточка) в Layout
import Layout from './components/Layout/Layout';
import Orders from './pages/Orders/Orders';
import OrderDetails from './pages/OrderDetails/OrderDetails';
import Employees from './pages/Employees/Employees';
import Reports from './pages/Reports/Reports';
import Settings from './pages/Settings/Settings';

// Только для администратора
import AdminRoute from './components/AdminRoute/AdminRoute';
import AdminDashboard from './pages/AdminDashboard/AdminDashboard';
import ProductEditor from './pages/ProductEditor/ProductEditor';
import ProductList from './pages/ProductList/ProductList';

// Экран исполнителя
import Executor from './pages/Executor/Executor';

function LoadingScreen() {
  return <div className="loading-screen">Загрузка...</div>;
}

// Доступ к витрине/панели — только admin/manager. Без сайдбара (витрина со своей шапкой).
function ManagerRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'executor') return <Navigate to="/executor" replace />;
  if (user.role !== 'admin' && user.role !== 'manager') return <Navigate to="/login" replace />;
  return children;
}

// Управление заказами — admin/manager в Layout (сайдбар).
function StaffRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'executor') return <Navigate to="/executor" replace />;
  if (user.role !== 'admin' && user.role !== 'manager') return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function ExecutorRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'executor') return <Navigate to="/" replace />;
  return children;
}

function LoginRoute() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) {
    return user.role === 'executor' ? <Navigate to="/executor" replace /> : <Navigate to="/" replace />;
  }
  return <Login />;
}

export default function App() {
  return (
    <>
      <CartSheet />
      <Routes>
        {/* Витрина (под логином) */}
        <Route path="/" element={<ManagerRoute><Home /></ManagerRoute>} />
        <Route path="/product/:id" element={<ManagerRoute><ProductDetail /></ManagerRoute>} />
        <Route path="/checkout" element={<ManagerRoute><Checkout /></ManagerRoute>} />

        {/* Авторизация */}
        <Route path="/login" element={<LoginRoute />} />

        {/* Исполнитель */}
        <Route path="/executor" element={<ExecutorRoute><Executor /></ExecutorRoute>} />

        {/* Управление заказами */}
        <Route path="/orders" element={<StaffRoute><Orders /></StaffRoute>} />
        <Route path="/orders/:id" element={<StaffRoute><OrderDetails /></StaffRoute>} />
        <Route path="/employees" element={<StaffRoute><Employees /></StaffRoute>} />
        <Route path="/reports" element={<StaffRoute><Reports /></StaffRoute>} />
        <Route path="/settings" element={<StaffRoute><Settings /></StaffRoute>} />

        {/* Только администратор */}
        <Route path="/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/products" element={<StaffRoute><AdminRoute><ProductList /></AdminRoute></StaffRoute>} />
        <Route path="/products/edit/:id" element={<StaffRoute><AdminRoute><ProductEditor /></AdminRoute></StaffRoute>} />

        {/* Любой другой путь → корень (витрина/логин) */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
```
Это удаляет маршруты `/shop`, `/cart`, `/order/:id`, `/orders/new` и импорты `OrderStatus`, `CreateOrder` (файлы удалим в Task 5).

- [ ] **Step 2: Смоук-сборка**

Run: `cd client && npm run build`
Expected: без ошибок (Home/ProductDetail/Checkout ещё существуют; CreateOrder/OrderStatus больше не импортируются).

- [ ] **Step 3: Commit**

```bash
git add client/src/App.jsx
git commit -m "feat(pos): gate storefront behind ManagerRoute; storefront at / ; drop public routes"
```

---

## Task 3: POS-оформление (`Checkout.jsx`)

**Files:**
- Modify: `client/src/pages/Checkout/Checkout.jsx` (полная замена)

- [ ] **Step 1: Переписать `Checkout.jsx` под POS + adminOrders**

Заменить весь файл `client/src/pages/Checkout/Checkout.jsx` на:
```jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';
import { useCartStore } from '../../store/cartStore';
import { cartToOrderItems, cartTotal } from '../../utils/orderMapping.mjs';
import { SALES_POINTS, PAYMENT_METHODS, PAYMENT_TYPES, formatPrice, formatPhone } from '../../utils/constants';
import './Checkout.css';

export default function Checkout() {
  const navigate = useNavigate();
  const { items, clearCart } = useCartStore();
  const total = cartTotal(items);

  const [salesPoint, setSalesPoint] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentType, setPaymentType] = useState('paid');
  const [paidAmount, setPaidAmount] = useState('');
  const [deliveryType, setDeliveryType] = useState('pickup');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePhoneChange = (e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11));

  const paid = paymentType === 'paid' ? total : Number(paidAmount) || 0;
  const canSubmit = items.length > 0 && salesPoint && name.trim() && phone.length >= 10 && paymentMethod;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError('');
    try {
      const order = await api.adminOrders.create({
        salesPoint,
        customerName: name.trim(),
        customerPhone: phone,
        items: cartToOrderItems(items),
        totalAmount: total,
        paymentMethod,
        paymentType,
        paidAmount: paid,
        balance: total - paid,
        deliveryType,
        deliveryAddress: deliveryType === 'delivery' ? address : '',
        status: 'new',
      });
      clearCart();
      navigate(`/orders/${order.id}`);
    } catch (err) {
      setError(err.message || 'Ошибка оформления заказа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="checkout-page page-enter">
      <div className="checkout-header">
        <button className="checkout-back" onClick={() => navigate(-1)}>←</button>
        <h1>оформление</h1>
        <div style={{ width: 40 }} />
      </div>

      <div className="checkout-body">
        <div className="co-field">
          <label>точка продаж</label>
          <div className="co-toggle-row">
            {Object.entries(SALES_POINTS).map(([key, label]) => (
              <button
                key={key}
                className={`co-toggle-btn ${salesPoint === key ? 'co-toggle-btn--active' : ''}`}
                onClick={() => setSalesPoint(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="co-field">
          <label>имя клиента</label>
          <div className="co-input-wrap">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="имя" />
          </div>
        </div>

        <div className="co-field">
          <label>телефон</label>
          <div className="co-input-wrap">
            <input type="tel" value={formatPhone(phone)} onChange={handlePhoneChange} placeholder="+7 XXX XXX XX XX" inputMode="tel" />
          </div>
        </div>

        <div className="co-field">
          <label>способ оплаты</label>
          <div className="co-toggle-row">
            {Object.entries(PAYMENT_METHODS).map(([key, label]) => (
              <button
                key={key}
                className={`co-toggle-btn ${paymentMethod === key ? 'co-toggle-btn--active' : ''}`}
                onClick={() => setPaymentMethod(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="co-field">
          <label>статус оплаты</label>
          <div className="co-toggle-row">
            {Object.entries(PAYMENT_TYPES).map(([key, label]) => (
              <button
                key={key}
                className={`co-toggle-btn ${paymentType === key ? 'co-toggle-btn--active' : ''}`}
                onClick={() => setPaymentType(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {paymentType !== 'paid' && (
          <div className="co-field">
            <label>внесено (KZT)</label>
            <div className="co-input-wrap">
              <input type="number" min="0" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} placeholder="0" />
            </div>
          </div>
        )}

        <div className="co-field">
          <label>получение</label>
          <div className="co-toggle-row">
            {[['pickup', 'Самовывоз'], ['delivery', 'Доставка']].map(([key, label]) => (
              <button
                key={key}
                className={`co-toggle-btn ${deliveryType === key ? 'co-toggle-btn--active' : ''}`}
                onClick={() => setDeliveryType(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {deliveryType === 'delivery' && (
          <div className="co-field">
            <label>адрес доставки</label>
            <div className="co-input-wrap">
              <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="улица, дом, квартира" />
            </div>
          </div>
        )}

        <div className="co-summary">
          <div className="co-summary-title">состав заказа</div>
          {items.map((item) => (
            <div key={item.id} className="co-summary-row">
              <span>{item.name} {item.size} × {item.quantity}</span>
              <span>{formatPrice(item.price * item.quantity)}</span>
            </div>
          ))}
          <div className="co-summary-divider" />
          <div className="co-summary-total">
            <span>итого</span>
            <span>{formatPrice(total)}</span>
          </div>
          {paymentType !== 'paid' && (
            <div className="co-summary-row"><span>долг</span><span>{formatPrice(total - paid)}</span></div>
          )}
        </div>

        {error && <div className="co-error">{error}</div>}
      </div>

      <div className="checkout-footer">
        <button
          className="price-btn"
          onClick={handleSubmit}
          disabled={!canSubmit || loading}
          style={{ opacity: !canSubmit ? 0.5 : 1 }}
        >
          {loading ? 'создание...' : `создать заказ · ${formatPrice(total)}`}
        </button>
      </div>
    </div>
  );
}
```
Примечания: `formatPhone` и `formatPrice` уже экспортируются из `utils/constants.js`. `SALES_POINTS`, `PAYMENT_METHODS`, `PAYMENT_TYPES` тоже. Authed-клиент — `utils/api.js`. Старый `BottomSheet`-выбор оплаты и `api.payment.initiate` удалены.

- [ ] **Step 2: Смоук-сборка**

Run: `cd client && npm run build`
Expected: без ошибок.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/Checkout/Checkout.jsx
git commit -m "feat(pos): rewrite checkout as POS → adminOrders.create (sales point, offline payment)"
```

---

## Task 4: Навигация «Каталог» + имя позиции в карточке

**Files:**
- Modify: `client/src/components/Layout/Layout.jsx`
- Modify: `client/src/pages/OrderDetails/OrderDetails.jsx`

- [ ] **Step 1: Пункт «Каталог» (акцентный) в сайдбаре**

В `client/src/components/Layout/Layout.jsx`, в массиве `ALL_NAV`, заменить первый
элемент (бывший «Новый заказ» с `path: '/orders/new'`) на:
```js
  { path: '/',           icon: Plus,            label: 'Каталог',     roles: ['admin', 'manager'], accent: true },
```
И в функции `navActive(path, pathname)` заменить ветки для `/orders/new` и `/orders`
так, чтобы «Каталог» подсвечивался только на корне, а «Все заказы» — на `/orders*`:
```js
function navActive(path, pathname) {
  if (path === '/') return pathname === '/';
  return pathname.startsWith(path);
}
```
(Класс `.nav-item--accent` уже существует в `Layout.css` — пункт останется выделенным.)

- [ ] **Step 2: Имя позиции из снимка в `OrderDetails`**

В `client/src/pages/OrderDetails/OrderDetails.jsx`, в режиме просмотра позиций, найти
строку, формирующую имя модели:
```jsx
const modelName = catalog?.models[item.modelId]?.name || item.modelId;
```
заменить на (приоритет — снимок имени из POS):
```jsx
const modelName = item.name || catalog?.models[item.modelId]?.name || item.modelId;
```

- [ ] **Step 3: Смоук-сборка**

Run: `cd client && npm run build`
Expected: без ошибок.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/Layout/Layout.jsx client/src/pages/OrderDetails/OrderDetails.jsx
git commit -m "feat(pos): sidebar Каталог (accent) → / ; show POS item name in order details"
```

---

## Task 5: Удаление старого потока

**Files:**
- Delete: `client/src/pages/CreateOrder/` (CreateOrder.jsx, CreateOrder.css)
- Delete: `client/src/pages/OrderStatus/` (OrderStatus.jsx, OrderStatus.css)

- [ ] **Step 1: Проверить отсутствие импортов**

Run (Grep по `client/src`): искать `CreateOrder` и `OrderStatus`.
Expected: ссылок не осталось (App.jsx уже не импортирует их после Task 2). Если
найдётся ссылка — удалить её перед удалением файлов.

- [ ] **Step 2: Удалить файлы**

```bash
cd client/src && git rm -r pages/CreateOrder pages/OrderStatus
```

- [ ] **Step 3: Смоук-сборка**

Run: `cd client && npm run build`
Expected: без ошибок (ничего не ссылается на удалённые файлы).

- [ ] **Step 4: Commit**

```bash
git commit -m "chore(pos): remove old create-order wizard and customer order-status pages"
```

---

## Task 6: Финальная проверка

**Files:** (без правок; при находках — точечный фикс + доп. коммит)

- [ ] **Step 1: Юнит маппинга**

Run: `node --test client/src/utils/orderMapping.test.mjs`
Expected: 4 теста зелёные.

- [ ] **Step 2: Серверные тесты**

Run: `cd server && npm test`
Expected: 48 зелёные.

- [ ] **Step 3: Сборка клиента**

Run: `cd client && npm run build`
Expected: без ошибок.

- [ ] **Step 4: Сквозная ручная проверка**

Логин (manager/admin) → попадаешь на витрину `/` → открыть товар → «добавить в
корзину» → корзина → «оформление» → выбрать точку/способ/статус → «создать заказ» →
переход в карточку `/orders/:id`, статус «Новый», имя товара читаемо → «История
заказов» (сайдбар «Каталог» ведёт назад на витрину) → правка/разблокировка работает.
Неавторизованный на `/` → редирект на `/login`.

---

## Self-Review (выполнено при написании плана)

- **Покрытие спеки:** auth-гейт витрины (T2 `ManagerRoute`), POS-оформление→adminOrders
  (T3 + маппинг T1), таблица История + правка (без изменений, ссылается из навигации),
  имя позиции из снимка (T4), «Каталог» акцентный (T4), удаление мастера/публичного
  потока и маршрутов (T2 роуты + T5 файлы). Серверные `orders`/`payment` оставлены
  смонтированными (по спеке).
- **Плейсхолдеры:** нет — у каждого шага конкретный код/команды.
- **Согласованность имён:** `cartToOrderItems`/`cartTotal` (T1) используются в T3;
  поля заказа (`salesPoint`,`paymentMethod`,`paymentType`,`paidAmount`,`balance`,
  `deliveryType`,`deliveryAddress`,`status:'new'`,`items`) совпадают с сервером
  (`POST /api/admin-orders`); `ManagerRoute`/`StaffRoute` — admin/manager only.
- **Краевые случаи:** пустая корзина → кнопка disabled; ошибка create → корзину не
  чистим (T3).
