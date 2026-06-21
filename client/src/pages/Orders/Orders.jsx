import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../utils/api';
import {
  STATUS, STATUS_ORDER, STATUS_LABELS, SALES_POINTS, formatPrice, formatDate,
} from '../../utils/constants';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import { Plus, Search, X } from 'lucide-react';
import './Orders.css';
import DatePickerField from '../../components/DatePickerField/DatePickerField';

// Бейдж оплаты выводится из сумм заказа.
function paymentInfo(o) {
  const total = o.totalAmount || 0;
  const paid = o.paidAmount || 0;
  if (total > 0 && paid >= total) return { label: 'Оплачен', kind: 'paid' };
  if (paid > 0) return { label: 'Частично', kind: 'advance' };
  return { label: 'Долг', kind: 'debt' };
}

// Компактный тег типа: модель первой позиции (+N, если позиций больше).
function typeTag(o) {
  const items = o.items || [];
  if (items.length === 0) return '—';
  const first = items[0].modelId || items[0].model || '—';
  return items.length > 1 ? `${first} +${items.length - 1}` : String(first);
}

export default function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [point, setPoint] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => { fetchOrders(); }, []);

  async function fetchOrders() {
    setLoading(true);
    setError('');
    try {
      const data = await api.adminOrders.list();
      setOrders(data.orders || []);
    } catch (err) {
      setError(err.message || 'Не удалось загрузить заказы');
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter && o.status !== statusFilter) return false;
      if (point && o.salesPoint !== point) return false;
      if (date && !o.createdAt?.startsWith(date)) return false;
      if (q) {
        const name = (o.customerName || '').toLowerCase();
        const phone = (o.customerPhone || '').toLowerCase();
        if (!name.includes(q) && !phone.includes(q)) return false;
      }
      return true;
    });
  }, [orders, search, statusFilter, point, date]);

  const totalRevenue = orders.reduce((s, o) => s + (o.totalAmount || 0), 0);
  const totalDebt = orders.reduce((s, o) => s + ((o.totalAmount || 0) - (o.paidAmount || 0)), 0);
  const hasFilters = search || statusFilter || point || date;

  return (
    <div className="orders-page">
      <div className="page-header">
        <div>
          <h1>История заказов</h1>
          <p className="page-subtitle">Управление заказами производства</p>
        </div>
        <Link to="/" className="btn-primary">
          <Plus size={16} />
          Каталог
        </Link>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-label">Всего заказов</span>
          <span className="stat-value">{orders.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Выручка</span>
          <span className="stat-value accent">{formatPrice(totalRevenue)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Долги</span>
          <span className="stat-value warning">{formatPrice(totalDebt)}</span>
        </div>
      </div>

      {/* Строка управления */}
      <div className="orders-controls">
        <div className="orders-search">
          <Search size={15} />
          <input
            type="text"
            placeholder="Поиск по имени или телефону"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="orders-search-clear" onClick={() => setSearch('')} aria-label="Очистить">
              <X size={14} />
            </button>
          )}
        </div>
        <div className="orders-controls-right">
          <select value={point} onChange={(e) => setPoint(e.target.value)}>
            <option value="">Все точки</option>
            {Object.entries(SALES_POINTS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <DatePickerField value={date} onChange={setDate} />
          {hasFilters && (
            <button
              className="btn-text"
              onClick={() => { setSearch(''); setStatusFilter(''); setPoint(''); setDate(''); }}
            >
              Сбросить
            </button>
          )}
        </div>
      </div>

      {/* Чипы статусов */}
      <div className="status-chips">
        <button
          className={`status-chip ${statusFilter === '' ? 'active' : ''}`}
          onClick={() => setStatusFilter('')}
        >
          Все
        </button>
        {STATUS_ORDER.map((s) => (
          <button
            key={s}
            className={`status-chip ${statusFilter === s ? 'active' : ''}`}
            onClick={() => setStatusFilter(s)}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {error && <div className="orders-error">{error}</div>}

      {/* Таблица */}
      <div className="orders-table-wrap">
        <table className="orders-table">
          <thead>
            <tr>
              <th>№ заказа</th>
              <th>Точка</th>
              <th>Клиент</th>
              <th>Телефон</th>
              <th>Тип</th>
              <th>Статус</th>
              <th>Оплата</th>
              <th className="num">Сумма</th>
              <th>Дата</th>
              <th aria-label="Открыть"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="skeleton-row">
                  {Array.from({ length: 10 }).map((__, j) => (
                    <td key={j}><span className="skeleton-cell" /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="orders-empty">Ничего не найдено</td>
              </tr>
            ) : (
              filtered.map((o) => {
                const pay = paymentInfo(o);
                return (
                  <tr key={o.id} className="orders-row" onClick={() => navigate(`/orders/${o.id}`)} tabIndex={0} role="button" onKeyDown={(e) => { if (e.target !== e.currentTarget) return; if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/orders/${o.id}`); } }}>
                    <td className="mono">{o.orderNumber || o.id}</td>
                    <td>{SALES_POINTS[o.salesPoint] || o.salesPoint || '—'}</td>
                    <td>{o.customerName || '—'}</td>
                    <td className="mono">{o.customerPhone || '—'}</td>
                    <td><span className="type-tag">{typeTag(o)}</span></td>
                    <td><StatusBadge status={o.status} /></td>
                    <td><span className={`pay-badge pay-${pay.kind}`}>{pay.label}</span></td>
                    <td className="num">{formatPrice(o.totalAmount)}</td>
                    <td>{formatDate(o.createdAt)}</td>
                    <td className="chevron">›</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
