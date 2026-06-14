/**
 * In-memory fake of the firebase-admin Firestore surface used by the routes.
 * Lets us unit-test the real Express handlers (transactions, lock, RBAC)
 * without real credentials or network. No production code depends on this.
 */

function makeFakeFirebase(seed = {}) {
  const store = {};
  for (const [col, docs] of Object.entries(seed)) {
    store[col] = new Map(docs.map((d) => [d.id, structuredClone(d)]));
  }
  const colMap = (name) => (store[name] || (store[name] = new Map()));

  function snapOf(colName, id) {
    const exists = colMap(colName).has(id);
    const data = exists ? structuredClone(colMap(colName).get(id)) : undefined;
    return { exists, id, data: () => data };
  }

  function docRef(colName, id) {
    return {
      _col: colName,
      _id: id,
      async get() { return snapOf(colName, id); },
      async set(data) { colMap(colName).set(id, structuredClone(data)); },
      async update(patch) {
        const cur = colMap(colName).get(id) || {};
        colMap(colName).set(id, { ...cur, ...structuredClone(patch) });
      },
      async delete() { colMap(colName).delete(id); },
    };
  }

  function collection(name) {
    const filters = [];
    let order = null;
    const handle = {
      doc: (id) => docRef(name, id),
      count: () => ({ get: async () => ({ data: () => ({ count: colMap(name).size }) }) }),
      where(field, op, val) { filters.push([field, op, val]); return handle; },
      orderBy(field, dir = 'asc') { order = [field, dir]; return handle; },
      async get() {
        let rows = [...colMap(name).values()];
        for (const [f, op, v] of filters) {
          rows = rows.filter((r) => {
            if (op === '>=') return r[f] >= v;
            if (op === '<') return r[f] < v;
            if (op === '<=') return r[f] <= v;
            if (op === '>') return r[f] > v;
            if (op === '==') return r[f] === v;
            return true;
          });
        }
        if (order) {
          const [f, dir] = order;
          rows.sort((a, b) => {
            const cmp = a[f] > b[f] ? 1 : a[f] < b[f] ? -1 : 0;
            return dir === 'desc' ? -cmp : cmp;
          });
        }
        return { docs: rows.map((r) => ({ id: r.id, data: () => structuredClone(r) })) };
      },
    };
    return handle;
  }

  async function runTransaction(fn) {
    const tx = {
      async get(ref) { return snapOf(ref._col, ref._id); },
      set(ref, data) { colMap(ref._col).set(ref._id, structuredClone(data)); },
      update(ref, patch) {
        const cur = colMap(ref._col).get(ref._id) || {};
        colMap(ref._col).set(ref._id, { ...cur, ...structuredClone(patch) });
      },
    };
    return fn(tx);
  }

  const db = { collection, runTransaction };
  // Fake auth: the "ID token" is a JSON string of the decoded claims.
  const admin = { auth: () => ({ verifyIdToken: async (t) => JSON.parse(t) }) };
  return { admin, db, store };
}

module.exports = { makeFakeFirebase };
