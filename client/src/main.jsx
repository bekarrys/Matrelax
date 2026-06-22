import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import { AuthProvider } from './context/AuthContext';
import App from './App';
import './styles/globals.css';
import './index.css';

// PWA service worker. registerType: 'autoUpdate' → новый бандл активируется и
// перезагружает страницу сам. Дополнительно опрашиваем обновления раз в час,
// чтобы долго открытая вкладка не залипала на старом коде после деплоя.
registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, reg) {
    if (reg) setInterval(() => reg.update(), 60 * 60 * 1000);
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
