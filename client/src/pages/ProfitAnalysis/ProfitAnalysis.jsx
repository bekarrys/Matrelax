import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { formatPrice, formatDate } from '../../utils/constants';
import { TrendingDown, Loader2 } from 'lucide-react';
import { orderProfitRows, profitTotals } from '../../utils/profit.mjs';
import './ProfitAnalysis.css';

export default function ProfitAnalysis() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.adminOrders.list()
      .then((data) => setOrders(data.orders || []))
      .catch((e) => setError(e.message || 'Не удалось загрузить заказы'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="loading-screen"><Loader2 size={32} className="spin" /></div>;
  }

  const rows = orderProfitRows(orders);
  const totals = profitTotals(rows);

  return (
    <div className="profit-page">
      <div className="page-header">
        <div className="page-header-info">
          <h1>Анализ маржи</h1>
          <span className="pa-sub">Маржа = Рыночная цена − Цена продажи (потерянная прибыль при скидках)</span>
        </div>
      </div>

      {error && <div className="pa-error">{error}</div>}

      {/* Итоги */}
      <div className="pa-totals">
        <div className="pa-total-card">
          <span className="pa-total-label">Общая выручка</span>
          <span className="pa-total-val">{formatPrice(totals.revenue)}</span>
        </div>
        <div className="pa-total-card">
          <span className="pa-total-label">Общая маржа</span>
          <span className={`pa-total-val ${totals.margin < 0 ? 'pa-neg' : ''}`}>{formatPrice(totals.margin)}</span>
        </div>
        <div className="pa-total-card">
          <span className="pa-total-label">Продаж ниже рынка</span>
          <span className={`pa-total-val ${totals.lossCount > 0 ? 'pa-neg' : ''}`}>
            <TrendingDown size={16} /> {totals.lossCount}
          </span>
        </div>
      </div>

      {/* Таблица */}
      {rows.length === 0 ? (
        <p className="pa-muted">Нет проданных заказов.</p>
      ) : (
        <div className="pa-grid-scroll">
          <table className="pa-table">
            <thead>
              <tr>
                <th>Заказ</th>
                <th>Дата</th>
                <th>Товар</th>
                <th>Размер</th>
                <th>Ткань</th>
                <th>Кол-во</th>
                <th>Цена продажи</th>
                <th>Рыночная</th>
                <th>Маржа</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.orderId}-${i}`} className={r.hasMarket && r.margin < 0 ? 'pa-row-loss' : ''}>
                  <td>{r.orderNumber}</td>
                  <td>{r.date ? formatDate(r.date) : '—'}</td>
                  <td>{r.name}</td>
                  <td>{r.size}</td>
                  <td>{r.fabric || '—'}</td>
                  <td>{r.quantity}</td>
                  <td>{formatPrice(r.sale)}</td>
                  <td>{r.hasMarket ? formatPrice(r.market) : '—'}</td>
                  <td className={r.hasMarket && r.margin < 0 ? 'pa-neg' : ''}>
                    {r.hasMarket ? formatPrice(r.margin) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
