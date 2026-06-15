import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { SALES_POINTS, CLIENT_CATEGORIES } from '../../utils/constants';
import { Settings as SettingsIcon, Save, Loader2 } from 'lucide-react';
import { RoleGuard } from '../../components/guards/RoleGuard';
import './Settings.css';

export default function Settings() {
  const [catalog, setCatalog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [prices, setPrices] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.catalog.get().then(data => {
      setCatalog(data);
      setPrices(data.models || {});
      setLoading(false);
    }).catch(console.error);
  }, []);

  const handlePriceChange = (modelId, size, value) => {
    setPrices(prev => ({
      ...prev,
      [modelId]: {
        ...prev[modelId],
        prices: {
          ...prev[modelId]?.prices,
          [size]: Number(value),
        }
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    // For Phase 1, prices are read-only from prices.json
    // In Phase 2, add API endpoint to update prices
    alert('В текущей версии каталог доступен только для чтения. Обновление цен — в следующей версии.');
    setSaving(false);
  };

  if (loading) return <div className="loading-screen"><Loader2 size={32} className="spin" /></div>;

  const seriesOrder = ['Royal', 'LUX', 'Elite', 'Premium', 'Ortoped', 'Polu-Orto', 'Euro', 'Toppers', 'Pillows'];

  return (
    <div className="settings-page">
      <div className="page-header">
        <div>
          <h1>Настройки</h1>
          <p className="page-subtitle">Управление каталогом, точками и системой</p>
        </div>
        <RoleGuard roles={['admin']}>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            <Save size={16} />
            Сохранить
          </button>
        </RoleGuard>
      </div>

      {/* Catalog Section */}
      <div className="settings-section">
        <h2>📋 Каталог цен</h2>
        <p className="section-desc">Цены указаны в KZT. Формат размера: ширина (×200 см)</p>

        {seriesOrder.map(series => {
          const seriesModels = Object.entries(prices).filter(([, m]) => m.series === series);
          if (seriesModels.length === 0) return null;
          const surcharge = catalog?.series[series]?.surcharge10cm || 0;

          return (
            <div key={series} className="series-block">
              <div className="series-header">
                <h3>{series}</h3>
                <span className="surcharge-badge">+10см: {surcharge.toLocaleString('ru-KZ')} KZT</span>
              </div>
              <div className="models-grid">
                {seriesModels.map(([id, model]) => (
                  <div key={id} className="model-card">
                    <h4>{model.name}</h4>
                    <div className="price-grid">
                      {catalog?.sizes?.map(size => (
                        <div key={size} className="price-input-cell">
                          <label>{size}</label>
                          <input
                            type="number"
                            value={model.prices?.[size] || ''}
                            onChange={e => handlePriceChange(id, size, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

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
          <div className="info-item">
            <span>Модели в каталоге</span>
            <span>{Object.keys(prices).length}</span>
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
