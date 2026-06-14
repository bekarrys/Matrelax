const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { makeFakeFirebase } = require('./helpers/fakeFirestore');
const { periodRange, summarize } = require('../utils/analytics');

// ─── Pure: periodRange ───────────────────────────────────────────────────────

test('periodRange day: single calendar day in UTC', () => {
  const { from, to } = periodRange('day', new Date('2026-06-15T13:30:00.000Z'));
  assert.equal(from, '2026-06-15T00:00:00.000Z');
  assert.equal(to, '2026-06-16T00:00:00.000Z');
});

test('periodRange week: Monday-start, 7-day span', () => {
  // 2026-06-15 is a Monday
  const { from, to } = periodRange('week', new Date('2026-06-17T09:00:00.000Z'));
  assert.equal(from, '2026-06-15T00:00:00.000Z');
  assert.equal(to, '2026-06-22T00:00:00.000Z');
});

test('periodRange month: calendar month bounds', () => {
  const { from, to } = periodRange('month', new Date('2026-06-15T13:30:00.000Z'));
  assert.equal(from, '2026-06-01T00:00:00.000Z');
  assert.equal(to, '2026-07-01T00:00:00.000Z');
});

test('periodRange: invalid period throws', () => {
  assert.throws(() => periodRange('year', new Date()), /Неверный период/);
});

// ─── Pure: summarize ─────────────────────────────────────────────────────────

test('summarize: empty set → zeroes', () => {
  assert.deepEqual(summarize([]), { orderCount: 0, revenue: 0, paid: 0, avgCheck: 0 });
});

test('summarize: revenue, count and rounded average check', () => {
  const s = summarize([
    { totalAmount: 40000, paidAmount: 40000 },
    { totalAmount: 25000, paidAmount: 0 },
    { totalAmount: 10000, paidAmount: 5000 },
  ]);
  assert.equal(s.orderCount, 3);
  assert.equal(s.revenue, 75000);
  assert.equal(s.paid, 45000);
  assert.equal(s.avgCheck, 25000); // 75000 / 3
});

test('summarize: tolerates missing amounts', () => {
  const s = summarize([{}, { totalAmount: 30000 }]);
  assert.equal(s.orderCount, 2);
  assert.equal(s.revenue, 30000);
  assert.equal(s.avgCheck, 15000);
});

// ─── Route: GET /summary (admin-only) ────────────────────────────────────────

const FB_PATH = require.resolve('../utils/firebase');
const AUTH_PATH = require.resolve('../middleware/auth');
const ROUTER_PATH = require.resolve('../routes/analytics');

function loadRouter(seed) {
  const fake = makeFakeFirebase(seed);
  require.cache[FB_PATH] = { id: FB_PATH, filename: FB_PATH, loaded: true, exports: { admin: fake.admin, db: fake.db } };
  delete require.cache[AUTH_PATH];
  delete require.cache[ROUTER_PATH];
  return require(ROUTER_PATH);
}

async function withServer(router, fn) {
  const app = express();
  app.use(express.json());
  app.use('/api/analytics', router);
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  try {
    await fn(server.address().port);
  } finally {
    await new Promise((r) => server.close(r));
  }
}

async function req(port, p, user) {
  const headers = {};
  if (user) headers.authorization = 'Bearer ' + JSON.stringify(user);
  const res = await fetch(`http://localhost:${port}${p}`, { headers });
  return { status: res.status, json: await res.json().catch(() => null) };
}

const ADMIN = { uid: 'a1', email: 'admin@x', role: 'admin' };
const MANAGER = { uid: 'm1', email: 'm@x', role: 'manager' };

function seedOrders() {
  return {
    adminOrders: [
      { id: 'now1', createdAt: new Date().toISOString(), totalAmount: 50000, paidAmount: 50000 },
      { id: 'old1', createdAt: '2020-01-01T00:00:00.000Z', totalAmount: 99999, paidAmount: 0 },
    ],
  };
}

test('GET /summary admin: aggregates only the current-day orders', async () => {
  const router = loadRouter(seedOrders());
  await withServer(router, async (port) => {
    const { status, json } = await req(port, '/api/analytics/summary?period=day', ADMIN);
    assert.equal(status, 200);
    assert.equal(json.orderCount, 1);
    assert.equal(json.revenue, 50000);
    assert.equal(json.avgCheck, 50000);
  });
});

test('GET /summary forbidden for manager (analytics is admin-only)', async () => {
  const router = loadRouter(seedOrders());
  await withServer(router, async (port) => {
    const { status } = await req(port, '/api/analytics/summary?period=day', MANAGER);
    assert.equal(status, 403);
  });
});

test('GET /summary unauthorized without token (401)', async () => {
  const router = loadRouter(seedOrders());
  await withServer(router, async (port) => {
    const { status } = await req(port, '/api/analytics/summary?period=day');
    assert.equal(status, 401);
  });
});

test('GET /summary invalid period → 400', async () => {
  const router = loadRouter(seedOrders());
  await withServer(router, async (port) => {
    const { status } = await req(port, '/api/analytics/summary?period=decade', ADMIN);
    assert.equal(status, 400);
  });
});
