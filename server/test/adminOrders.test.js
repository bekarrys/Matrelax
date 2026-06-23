const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { makeFakeFirebase } = require('./helpers/fakeFirestore');

const FB_PATH = require.resolve('../utils/firebase');
const AUTH_PATH = require.resolve('../middleware/auth');
const ROUTER_PATH = require.resolve('../routes/adminOrders');

// Load the real router with a fake Firestore injected via require cache.
function loadRouter(seed) {
  const fake = makeFakeFirebase(seed);
  require.cache[FB_PATH] = { id: FB_PATH, filename: FB_PATH, loaded: true, exports: { admin: fake.admin, db: fake.db } };
  delete require.cache[AUTH_PATH];
  delete require.cache[ROUTER_PATH];
  const router = require(ROUTER_PATH);
  return { router, store: fake.store };
}

async function withServer(router, fn) {
  const app = express();
  app.use(express.json());
  app.use('/api/admin-orders', router);
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  try {
    await fn(server.address().port);
  } finally {
    await new Promise((r) => server.close(r));
  }
}

// user is a plain claims object; fake verifyIdToken just JSON-parses the token.
async function req(port, method, p, { user, body } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (user) headers.authorization = 'Bearer ' + JSON.stringify(user);
  const res = await fetch(`http://localhost:${port}${p}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

const MANAGER = { uid: 'm1', email: 'manager@matrelax.kz', role: 'manager' };
const ADMIN = { uid: 'a1', email: 'admin@matrelax.kz', role: 'admin' };
const EXECUTOR = { uid: 'e1', email: 'exec@matrelax.kz', role: 'executor' };

// Товар каталога — сервер берёт цену отсюда (анти-тамперинг), не с клиента.
const PRODUCT_R1 = {
  id: 'R1',
  surcharge10cm: 7000,
  prices: { Стандарт: { '160x200': 40000, '180x200': 45000, '200x200': 50000 } },
  marketPrices: { Стандарт: { '160x200': 47000, '180x200': 52000, '200x200': 57000 } },
};
const item = (over = {}) => ({ modelId: 'R1', fabric: 'Стандарт', size: '160x200', extra10cm: false, quantity: 1, ...over });

function orderSeed(over = {}) {
  return {
    id: '2026-06-15-001',
    orderNumber: 'Madeniyet-15062026-001',
    status: 'new',
    customerName: 'Иван',
    customerPhone: '+77001112233',
    items: [item({ price: 40000 })],
    totalAmount: 40000,
    paidAmount: 40000,
    balance: 0,
    createdAt: '2026-06-15T10:00:00.000Z',
    updatedAt: '2026-06-15T10:00:00.000Z',
    history: [{ at: '2026-06-15T10:00:00.000Z', by: 'manager@matrelax.kz', action: 'created' }],
    ...over,
  };
}

// ─── POST ────────────────────────────────────────────────────────────────────

test('POST creates an order with status "new" and a created log entry', async () => {
  const { router } = loadRouter({ products: [PRODUCT_R1] });
  await withServer(router, async (port) => {
    const { status, json } = await req(port, 'POST', '/api/admin-orders', {
      user: MANAGER,
      body: { customerName: 'Пётр', salesPoint: 'madeniyet', items: [item({ quantity: 2, price: 1 })] },
    });
    assert.equal(status, 201);
    assert.equal(json.status, 'new');
    assert.equal(json.customerName, 'Пётр');
    assert.equal(json.itemsUnlocked, false);
    // Цена пересчитана сервером, клиентский price:1 проигнорирован.
    assert.equal(json.items[0].price, 40000);
    assert.equal(json.totalAmount, 80000);
    assert.equal(json.paidAmount, 80000);
    assert.equal(json.balance, 0);
    assert.ok(json.history.some((h) => h.action === 'created'));
  });
});

test('POST without items → 400', async () => {
  const { router } = loadRouter({ products: [PRODUCT_R1] });
  await withServer(router, async (port) => {
    const { status } = await req(port, 'POST', '/api/admin-orders', {
      user: MANAGER,
      body: { customerName: 'Пётр', items: [] },
    });
    assert.equal(status, 400);
  });
});

test('POST forbidden for executor (403)', async () => {
  const { router } = loadRouter({});
  await withServer(router, async (port) => {
    const { status } = await req(port, 'POST', '/api/admin-orders', { user: EXECUTOR, body: {} });
    assert.equal(status, 403);
  });
});

// ─── PUT: item lock ──────────────────────────────────────────────────────────

test('PUT editing items while status "new" succeeds', async () => {
  const { router } = loadRouter({ adminOrders: [orderSeed()], products: [PRODUCT_R1] });
  await withServer(router, async (port) => {
    const { status, json } = await req(port, 'PUT', '/api/admin-orders/2026-06-15-001', {
      user: MANAGER,
      body: { items: [item({ size: '180x200', quantity: 2 })] },
    });
    assert.equal(status, 200);
    assert.equal(json.items[0].size, '180x200');
    assert.equal(json.items[0].price, 45000);  // пересчитано сервером
    assert.equal(json.totalAmount, 90000);
  });
});

test('PUT editing items while status "progress" without unlock → 403', async () => {
  const { router } = loadRouter({ adminOrders: [orderSeed({ status: 'progress' })] });
  await withServer(router, async (port) => {
    const { status } = await req(port, 'PUT', '/api/admin-orders/2026-06-15-001', {
      user: MANAGER,
      body: { items: [{ modelId: 'R1', size: 200, extra10cm: false, quantity: 1 }] },
    });
    assert.equal(status, 403);
  });
});

test('PUT editing free fields while "progress" succeeds without unlock, with edit diff', async () => {
  const { router } = loadRouter({ adminOrders: [orderSeed({ status: 'progress' })] });
  await withServer(router, async (port) => {
    const { status, json } = await req(port, 'PUT', '/api/admin-orders/2026-06-15-001', {
      user: MANAGER,
      body: { customerName: 'Сергей' },
    });
    assert.equal(status, 200);
    assert.equal(json.customerName, 'Сергей');
    const edit = json.history.find((h) => h.action === 'edit' && h.field === 'customerName');
    assert.ok(edit, 'expected an edit diff for customerName');
    assert.equal(edit.from, 'Иван');
    assert.equal(edit.to, 'Сергей');
  });
});

// ─── PATCH /unlock ───────────────────────────────────────────────────────────

test('PATCH /unlock with reason sets itemsUnlocked and logs unlock', async () => {
  const { router } = loadRouter({ adminOrders: [orderSeed({ status: 'progress' })] });
  await withServer(router, async (port) => {
    const { status, json } = await req(port, 'PATCH', '/api/admin-orders/2026-06-15-001/unlock', {
      user: MANAGER,
      body: { reason: 'Клиент попросил сменить размер' },
    });
    assert.equal(status, 200);
    assert.equal(json.itemsUnlocked, true);
    const log = json.history.find((h) => h.action === 'unlock');
    assert.ok(log);
    assert.equal(log.reason, 'Клиент попросил сменить размер');
  });
});

test('PATCH /unlock with empty reason → 400', async () => {
  const { router } = loadRouter({ adminOrders: [orderSeed({ status: 'progress' })] });
  await withServer(router, async (port) => {
    const { status } = await req(port, 'PATCH', '/api/admin-orders/2026-06-15-001/unlock', {
      user: MANAGER,
      body: { reason: '   ' },
    });
    assert.equal(status, 400);
  });
});

test('after unlock, PUT item edit succeeds and resets itemsUnlocked to false', async () => {
  const { router } = loadRouter({ adminOrders: [orderSeed({ status: 'progress', itemsUnlocked: true })], products: [PRODUCT_R1] });
  await withServer(router, async (port) => {
    const { status, json } = await req(port, 'PUT', '/api/admin-orders/2026-06-15-001', {
      user: MANAGER,
      body: { items: [item({ size: '200x200', quantity: 1 })] },
    });
    assert.equal(status, 200);
    assert.equal(json.items[0].size, '200x200');
    assert.equal(json.itemsUnlocked, false);
  });
});

// ─── PATCH /status ───────────────────────────────────────────────────────────

test('PATCH /status moves new → progress for manager', async () => {
  const { router } = loadRouter({ adminOrders: [orderSeed()] });
  await withServer(router, async (port) => {
    const { status, json } = await req(port, 'PATCH', '/api/admin-orders/2026-06-15-001/status', {
      user: MANAGER,
      body: { status: 'progress' },
    });
    assert.equal(status, 200);
    assert.equal(json.status, 'progress');
    assert.ok(json.history.some((h) => h.action === 'status' && h.from === 'new' && h.to === 'progress'));
  });
});

test('PATCH /status rejects illegal jump new → ready (403)', async () => {
  const { router } = loadRouter({ adminOrders: [orderSeed()] });
  await withServer(router, async (port) => {
    const { status } = await req(port, 'PATCH', '/api/admin-orders/2026-06-15-001/status', {
      user: MANAGER,
      body: { status: 'ready' },
    });
    assert.equal(status, 403);
  });
});

// ─── RBAC ────────────────────────────────────────────────────────────────────

test('DELETE forbidden for manager (403)', async () => {
  const { router } = loadRouter({ adminOrders: [orderSeed()] });
  await withServer(router, async (port) => {
    const { status } = await req(port, 'DELETE', '/api/admin-orders/2026-06-15-001', { user: MANAGER });
    assert.equal(status, 403);
  });
});

test('DELETE allowed for admin', async () => {
  const { router, store } = loadRouter({ adminOrders: [orderSeed()] });
  await withServer(router, async (port) => {
    const { status } = await req(port, 'DELETE', '/api/admin-orders/2026-06-15-001', { user: ADMIN });
    assert.equal(status, 200);
    assert.equal(store.adminOrders.has('2026-06-15-001'), false);
  });
});
