import React from 'react';
import { SALES_POINTS, CLIENT_CATEGORIES } from '../../utils/constants';
import './Settings.css';

export default function Settings() {
  return (
    <div className="settings-page">
      <div className="page-header">
        <div>
          <h1>Настройки</h1>
          <p className="page-subtitle">Точки продаж, система и интеграции</p>
        </div>
      </div>

      {/* Catalog editing lives in Товары → редактор (ткань×размер). */}

      {/* Info Section */}
      <div className="settings-section">
        <h2>ℹ️ Информация о системе</h2>
        <div className="info-grid">
          <div className="info-item">
            <span>Версия</span>
            <span>1.0.0</span>
          </div>
          <div className="info-item">
            <span>Точки продаж</span>
            <span>{Object.values(SALES_POINTS).join(', ')}</span>
          </div>
          <div className="info-item">
            <span>Категории клиентов</span>
            <span>{Object.values(CLIENT_CATEGORIES).join(', ')}</span>
          </div>
        </div>
      </div>

      {/* Integrations Section */}
      <div className="settings-section">
        <h2>🔌 Интеграции</h2>
        <div className="integrations-grid">
          <div className="integration-card">
            <h4>Google Sheets</h4>
            <p>Синхронизация заказов и отчётов</p>
            <span className="integration-status pending">Настроить</span>
          </div>
          <div className="integration-card">
            <h4>WhatsApp API</h4>
            <p>Отправка квитанций клиентам</p>
            <span className="integration-status pending">Настроить</span>
          </div>
          <div className="integration-card">
            <h4>Gmail</h4>
            <p>Отправка отчётов директору</p>
            <span className="integration-status pending">Настроить</span>
          </div>
          <div className="integration-card">
            <h4>Telegram Bot</h4>
            <p>Уведомления для цеха</p>
            <span className="integration-status pending">Настроить</span>
          </div>
        </div>
      </div>
    </div>
  );
}
