// Копирует server/ → functions/server/ перед деплоем функций.
// Firebase упаковывает ТОЛЬКО содержимое каталога functions/, поэтому
// require('./server/app') должен резолвиться внутри него, а не через ../server.
// Запускается автоматически как predeploy-хук (см. firebase.json).
const fs   = require('fs');
const path = require('path');

const SRC  = path.join(__dirname, '..', 'server');
const DEST = path.join(__dirname, '..', 'functions', 'server');

// Не тащим в деплой: зависимости (ставятся по functions/package.json), тесты,
// сид-скрипты с секретами, локальные дампы данных, логи и .env-файлы.
const EXCLUDE_DIRS = new Set(['node_modules', 'test', 'scripts', 'data', 'logs']);

fs.rmSync(DEST, { recursive: true, force: true });
fs.cpSync(SRC, DEST, {
  recursive: true,
  filter: (src) => {
    const base = path.basename(src);
    if (EXCLUDE_DIRS.has(base)) return false;
    if (base.startsWith('.env')) return false;
    if (base.endsWith('.test.js')) return false;
    // Никогда не тащим приватные ключи в деплой — Functions использует ADC
    if (base.endsWith('.pem')) return false;
    if (/serviceaccount/i.test(base) || base === 'firebase-service-account.json') return false;
    return true;
  },
});

console.log(`✓ Synced server → functions/server (excluded: ${[...EXCLUDE_DIRS].join(', ')})`);
