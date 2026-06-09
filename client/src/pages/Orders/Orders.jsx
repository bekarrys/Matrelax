import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../utils/api';
import { STATUS, STATUS_LABELS } from '../../utils/constants';
import OrderCard from '../../components/OrderCard/OrderCard';
import { Plus, Filter, Loader2 } from 'lucide-react';
import './Orders.css';

const KANBAN_COLUMNS = [
  STATUS.PROGRESS,
  STATUS.READY,
  STATUS.DELIVERY,
  STATUS.DELIVERED,
];

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ point: '', date: '' });

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    try {
      const data = await api.orders.list();
      setOrders(data.orders || []);
    } catch (err) {
      console.error('Ошибка загрузки заказов:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    if (filter.point && order.salesPoint !== filter.point) return false;
    if (filter.date && !order.createdAt?.startsWith(filter.date)) return false;
    return true;
  });

  const totalOrders  = orders.length;
  const totalRevenue = orders.reduce((s, o) => s + (o.totalAmount  || 0), 0);
  const totalDebt    = orders.reduce((s, o) => s + ((o.totalAmount || 0) - (o.paidAmount || 0)), 0);

  return (
    <div className="orders-page">
      <div className="page-header">
        <div>
          <h1>Заказы</h1>
          <p className="page-subtitle">Управление заказами производства</p>
        </div>
        <Link to="/orders/new" className="btn-primary">
          <Plus size={16} />
          Новый заказ
        </Link>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-label">Всего заказов</span>
          <span className="stat-value">{totalOrders}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Выручка</span>
          <span className="stat-value accent">{totalRevenue.toLocaleString('ru-KZ')} ₸</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Долги</span>
          <span className="stat-value warning">{totalDebt.toLocaleString('ru-KZ')} ₸</span>
        </div>
      </div>

      <div className="filters-bar">
        <Filter size={15} />
        <select value={filter.point} onChange={e => setFilter(f => ({ ...f, point: e.target.value }))}>
          <option value="">Все точки</option>
          <option value="armada">Армада</option>
          <option value="madeniyet">Маденият</option>
        </select>
        <input
          type="date"
          value={filter.date}
          onChange={e => setFilter(f => ({ ...f, date: e.target.value }))}
        />
        {(filter.point || filter.date) && (
          <button className="btn-text" onClick={() => setFilter({ point: '', date: '' })}>
            Сбросить
          </button>
        )}
      </div>

      {loading ? (
        <div className="loading-kanban">
          <Loader2 size={28} className="spin" />
          <p>Загрузка заказов...</p>
        </div>
      ) : (
        <div className="kanban-board">
          {KANBAN_COLUMNS.map(column => {
            const columnOrders = filteredOrders.filter(o => o.status === column);
            return (
              <div key={column} className="kanban-column" data-status={column}>
                <div className="kanban-column-header">
                  <h3>{STATUS_LABELS[column]}</h3>
                  <span className="kanban-count">{columnOrders.length}</span>
                </div>
                <div className="kanban-items">
                  {columnOrders.length === 0 ? (
                    <div className="kanban-empty">Нет заказов</div>
                  ) : (
                    columnOrders.map(order => (
                      <OrderCard key={order.id} order={order} />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
