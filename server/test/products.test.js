const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { makeFakeFirebase } = require('./helpers/fakeFirestore');

const FB_PATH = require.resolve('../utils/firebase');
const AUTH_PATH = require.resolve('../middleware/auth');
const ROUTER_PATH = require.resolve('../routes/products');

function loadRouter(seed) {
  const fake = makeFakeFirebase(seed);
  require.cache[FB_PATH] = { id: FB_PATH, filename: FB_PATH, loaded: true, exports: { admin: fake.admin, db: fake.db } };
  delete require.cache[AUTH_PATH];
  delete require.cache[ROUTER_PATH];
  return { router: require(ROUTER_PATH), store: fake.store };
}

async function withServer(router, fn) {
  const app = express();
  app.use(express.json());
  app.use('/api/products', router);
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  try { await fn(server.address().port); }
  finally { await new Promise((r) => server.close(r)); }
}

async function req(port, method, p, { user, body } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (user) headers.authorization = 'Bearer ' + JSON.stringify(user);
  const res = await fetch(`http://localhost:${port}${p}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

const ADMIN = { uid: 'a1', email: 'a@m.kz', role: 'admin' };

function goodMattress(over = {}) {
  return {
    id: '500', name: '500', series: 'Боннельные', category: 'mattresses',
    fabricOptions: ['Стандарт', 'Люкс'],
    sizes: [{ width: 80, height: 200 }, { width: 200, height: 200 }],
    prices: {
      'Стандарт': { '80x200': 23000, '200x200': 44000 },
      'Люкс': { '80x200': 30000, '200x200': 58000 },
    },
    composition: ['Кокос'], extra10cm: true, surcharge10cm: 7000, isActive: true,
    ...over,
  };
}

test('POST accepts complete matrix', async () => {
  const { router, store } = loadRouter({});
  await withServer(router, async (port) => {
    const r = await req(port, 'POST', '/api/products', { user: ADMIN, body: goodMattress() });
    assert.equal(r.status, 201);
    assert.equal(store.products.get('500').prices['Люкс']['200x200'], 58000);
  });
});

test('POST rejects matrix with missing/zero cell', async () => {
  const { router } = loadRouter({});
  await withServer(router, async (port) => {
    const bad = goodMattress({ prices: { 'Стандарт': { '80x200': 23000, '200x200': 44000 }, 'Люкс': { '80x200': 0, '200x200': 58000 } } });
    const r = await req(port, 'POST', '/api/products', { user: ADMIN, body: bad });
    assert.equal(r.status, 400);
    assert.match(r.json.error, /цен/i);
  });
});

test('GET activeOnly hides inactive', async () => {
  const { router } = loadRouter({ products: [
    goodMattress({ id: 'a', isActive: true }),
    goodMattress({ id: 'b', isActive: false }),
  ] });
  await withServer(router, async (port) => {
    const r = await req(port, 'GET', '/api/products?activeOnly=1');
    assert.equal(r.status, 200);
    assert.deepEqual(r.json.map((p) => p.id), ['a']);
  });
});
