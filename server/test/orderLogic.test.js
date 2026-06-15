const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  canTransition,
  canEditItems,
  hasItemChanges,
  computeFieldDiffs,
} = require('../utils/orderLogic');

// ─── Status transitions ──────────────────────────────────────────────────────

test('canTransition: manager can move new → progress', () => {
  assert.equal(canTransition('manager', 'new', 'progress'), true);
});

test('canTransition: admin can move new → progress', () => {
  assert.equal(canTransition('admin', 'new', 'progress'), true);
});

test('canTransition: executor cannot move new → progress', () => {
  assert.equal(canTransition('executor', 'new', 'progress'), false);
});

test('canTransition: executor can move progress → ready only', () => {
  assert.equal(canTransition('executor', 'progress', 'ready'), true);
  assert.equal(canTransition('executor', 'ready', 'delivery'), false);
});

test('canTransition: manager can move delivery → delivered', () => {
  assert.equal(canTransition('manager', 'delivery', 'delivered'), true);
});

test('canTransition: rejects skipping a step (new → ready)', () => {
  assert.equal(canTransition('manager', 'new', 'ready'), false);
});

test('canTransition: unknown role is rejected', () => {
  assert.equal(canTransition('client', 'new', 'progress'), false);
  assert.equal(canTransition(undefined, 'new', 'progress'), false);
});

// ─── Item-edit lock ──────────────────────────────────────────────────────────

test('canEditItems: status new is always editable', () => {
  assert.equal(canEditItems({ status: 'new' }), true);
});

test('canEditItems: status progress without unlock is locked', () => {
  assert.equal(canEditItems({ status: 'progress' }), false);
  assert.equal(canEditItems({ status: 'progress', itemsUnlocked: false }), false);
});

test('canEditItems: status progress with itemsUnlocked is editable', () => {
  assert.equal(canEditItems({ status: 'progress', itemsUnlocked: true }), true);
});

test('canEditItems: status ready is locked by default', () => {
  assert.equal(canEditItems({ status: 'ready' }), false);
});

// ─── Item change detection ───────────────────────────────────────────────────

test('hasItemChanges: identical items → false', () => {
  const items = [{ modelId: 'R1', size: 160, extra10cm: false, quantity: 2 }];
  assert.equal(hasItemChanges(items, [{ modelId: 'R1', size: 160, extra10cm: false, quantity: 2 }]), false);
});

test('hasItemChanges: undefined newItems (not provided) → false', () => {
  assert.equal(hasItemChanges([{ modelId: 'R1', size: 160 }], undefined), false);
});

test('hasItemChanges: changed quantity → true', () => {
  const oldI = [{ modelId: 'R1', size: 160, quantity: 1 }];
  const newI = [{ modelId: 'R1', size: 160, quantity: 3 }];
  assert.equal(hasItemChanges(oldI, newI), true);
});

test('hasItemChanges: changed size → true', () => {
  assert.equal(
    hasItemChanges([{ modelId: 'R1', size: 160 }], [{ modelId: 'R1', size: 180 }]),
    true,
  );
});

test('hasItemChanges: added item → true', () => {
  assert.equal(
    hasItemChanges([{ modelId: 'R1', size: 160 }], [{ modelId: 'R1', size: 160 }, { modelId: 'L1', size: 140 }]),
    true,
  );
});

test('hasItemChanges: ignores irrelevant per-item fields (price)', () => {
  const oldI = [{ modelId: 'R1', size: 160, quantity: 1, price: 40000 }];
  const newI = [{ modelId: 'R1', size: 160, quantity: 1, price: 99999 }];
  assert.equal(hasItemChanges(oldI, newI), false);
});

// ─── Field diff audit ────────────────────────────────────────────────────────

test('computeFieldDiffs: detects a changed tracked field', () => {
  const diffs = computeFieldDiffs(
    { customerName: 'Иван', customerPhone: '+7700' },
    { customerName: 'Пётр' },
  );
  assert.deepEqual(diffs, [{ field: 'customerName', from: 'Иван', to: 'Пётр' }]);
});

test('computeFieldDiffs: unchanged provided field yields no diff', () => {
  const diffs = computeFieldDiffs({ customerName: 'Иван' }, { customerName: 'Иван' });
  assert.deepEqual(diffs, []);
});

test('computeFieldDiffs: field absent from incoming is ignored', () => {
  const diffs = computeFieldDiffs({ customerName: 'Иван', notes: 'x' }, { notes: 'x' });
  assert.deepEqual(diffs, []);
});

test('computeFieldDiffs: missing old value reported as null', () => {
  const diffs = computeFieldDiffs({}, { customerName: 'Пётр' });
  assert.deepEqual(diffs, [{ field: 'customerName', from: null, to: 'Пётр' }]);
});

test('computeFieldDiffs: does not track item array (handled separately)', () => {
  const diffs = computeFieldDiffs(
    { items: [{ modelId: 'R1' }] },
    { items: [{ modelId: 'L1' }] },
  );
  assert.deepEqual(diffs, []);
});

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
