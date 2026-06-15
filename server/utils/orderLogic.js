/**
 * orderLogic.js — чистая (без I/O) доменная логика заказов adminOrders.
 *
 * Вынесено из маршрутов, чтобы покрыть unit-тестами рисковую логику:
 * переходы статусов, блокировку правок позиций и аудит изменений.
 * Маршруты (`routes/adminOrders.js`) используют эти функции внутри
 * Firestore-транзакций для атомарности.
 */

// Жизненный цикл статуса: new → progress → ready → delivery → delivered
const STATUS_FLOW = ['new', 'progress', 'ready', 'delivery', 'delivered'];

const ALLOWED_TRANSITIONS = {
  executor: { progress: 'ready' },
  manager:  { new: 'progress', progress: 'ready', ready: 'delivery', delivery: 'delivered' },
  admin:    { new: 'progress', progress: 'ready', ready: 'delivery', delivery: 'delivered' },
};

/** Разрешён ли переход статуса для роли (строго по одному шагу вперёд). */
function canTransition(role, from, to) {
  const allowed = ALLOWED_TRANSITIONS[role];
  return Boolean(allowed) && allowed[from] === to;
}

/**
 * Можно ли редактировать позиции заказа.
 * Блокировка выводится из статуса: свободно только при `new`, иначе нужен
 * разовый флаг `itemsUnlocked === true`.
 */
function canEditItems(order) {
  return order.status === 'new' || order.itemsUnlocked === true;
}

// Значимые для блокировки поля позиции (цена/прочее игнорируются).
function normalizeItem(it) {
  return {
    modelId:   it.modelId ?? null,
    size:      it.size ?? null,
    extra10cm: it.extra10cm ?? false,
    quantity:  it.quantity ?? 1,
  };
}

/**
 * Изменился ли состав позиций. `newItems === undefined` означает «не передано»
 * → изменений нет. Сравниваются только модель/размер/+10см/количество.
 */
function hasItemChanges(oldItems, newItems) {
  if (newItems === undefined) return false;
  const a = (oldItems || []).map(normalizeItem);
  const b = (newItems || []).map(normalizeItem);
  return JSON.stringify(a) !== JSON.stringify(b);
}

// Поля верхнего уровня, по которым ведём детальный аудит правок.
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

function valuesEqual(a, b) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

/**
 * Детальные диффы изменённых полей для истории заказа.
 * Только поля из TRACKED_FIELDS и только присутствующие во входящем теле.
 * Массив `items` сюда не входит — он обрабатывается отдельно (блокировка).
 */
function computeFieldDiffs(oldOrder, incoming) {
  const diffs = [];
  for (const field of TRACKED_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(incoming, field)) continue;
    const from = oldOrder[field];
    const to = incoming[field];
    if (!valuesEqual(from, to)) {
      diffs.push({ field, from: from ?? null, to: to ?? null });
    }
  }
  return diffs;
}

module.exports = {
  STATUS_FLOW,
  ALLOWED_TRANSITIONS,
  TRACKED_FIELDS,
  canTransition,
  canEditItems,
  hasItemChanges,
  computeFieldDiffs,
};
