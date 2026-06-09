const app  = require('./app');
const { execSync } = require('child_process');
const PORT = process.env.PORT || 3001;

function killPort(port) {
  try {
    if (process.platform === 'win32') {
      const out = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
      const pids = new Set();
      out.split('\n').forEach((line) => {
        const parts = line.trim().split(/\s+/);
        if (parts[1] && parts[1].endsWith(`:${port}`)) {
          const pid = parts[parts.length - 1];
          if (pid && /^\d+$/.test(pid) && pid !== '0') pids.add(pid);
        }
      });
      pids.forEach((pid) => {
        try { execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' }); } catch {}
      });
    } else {
      execSync(`fuser -k ${port}/tcp`, { stdio: 'ignore' });
    }
  } catch {}
}

function startServer(retries = 1) {
  const server = app.listen(PORT, () => {
    console.log(`🛏️  MATRELAX Server → http://localhost:${PORT} [Firestore + Firebase Auth]`);
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && retries > 0) {
      console.log(`⚠️  Порт ${PORT} занят — освобождаю...`);
      killPort(PORT);
      setTimeout(() => startServer(retries - 1), 800);
    } else {
      console.error('Не удалось запустить сервер:', err.message);
      process.exit(1);
    }
  });
}

startServer();
