import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../utils/api';
import './Executor.css';

const STATUS_LABELS = {
  progress: 'В РАБОТЕ',
  ready: 'ГОТОВ',
  delivery: 'ДОСТАВКА',
  delivered: 'ДОСТАВЛЕН',
};

function formatPrice(n) {
  return new Intl.NumberFormat('ru-KZ').format(n) + ' ₸';
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }) +
    ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

export default function Executor() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const [pulse, setPulse] = useState(false);

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await api.adminOrders.list();
      setOrders(data.orders || []);
      setLastSync(new Date());
      setPulse(true);
      setTimeout(() => setPulse(false), 600);
    } catch {
      // Если 401 — разлогинить
      logout();
      navigate('/login');
    } finally {
      setLoading(false);
    }
  }, [logout, navigate]);

  useEffect(() => {
    fetchOrders();
    const iv = setInterval(() => fetchOrders(true), 15000);
    return () => clearInterval(iv);
  }, [fetchOrders]);

  const handleDone = async (order) => {
    setUpdating(order.id);
    try {
      // Исполнитель может только progress → ready
      await api.adminOrders.updateStatus(order.id, 'ready');
      setOrders((prev) => prev.filter((o) => o.id !== order.id));
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdating(null);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="exec-page">
      {/* Header */}
      <header className="exec-header">
        <div className="exec-header-left">
          <span className="exec-logo">🛏️</span>
          <div>
            <div className="exec-title">ЦЕХ</div>
            <div className="exec-sub">{user?.email}</div>
          </div>
        </div>
        <div className="exec-header-right">
          <div className={`exec-sync ${pulse ? 'exec-sync--pulse' : ''}`}>
            {lastSync
              ? lastSync.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
              : '—'}
          </div>
          <button className="exec-logout" onClick={handleLogout}>выйти</button>
        </div>
      </header>

      {/* Счётчик */}
      <div className="exec-counter">
        <span className="exec-counter-num">{orders.length}</span>
        <span className="exec-counter-label">заказ{orders.length === 1 ? '' : orders.length < 5 ? 'а' : 'ов'} в работе</span>
      </div>

      {/* Список */}
      <div className="exec-list">
        {loading ? (
          <div className="exec-loading">
            <div className="exec-spinner" />
          </div>
        ) : orders.length === 0 ? (
          <div className="exec-empty">
            <div className="exec-empty-icon">✓</div>
            <p>Все заказы выполнены</p>
            <p className="exec-empty-sub">Обновляется каждые 15 сек</p>
          </div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="exec-card">
              <div className="exec-card-top">
                <div className="exec-order-num">{order.orderNumber}</div>
                <div className={`exec-badge exec-badge--${order.status}`}>
                  {STATUS_LABELS[order.status] || order.status}
                </div>
              </div>

              <div className="exec-meta">
                <span>{formatTime(order.createdAt)}</span>
                {order.deliveryType === 'delivery' && <span className="exec-delivery-tag">🚚 доставка</span>}
                {order.notes && <span className="exec-notes">💬 {order.notes}</span>}
              </div>

              <div className="exec-items">
                {(order.items || []).map((item, i) => (
                  <div key={i} className="exec-item">
                    <div className="exec-item-name">
                      {item.modelId || item.name}
                      {item.extra10cm && <span className="exec-tag">+10см</span>}
                    </div>
                    <div className="exec-item-detail">
                      {item.size && <span>{item.size} см</span>}
                      {item.quantity > 1 && <span className="exec-qty">× {item.quantity}</span>}
                    </div>
                  </div>
                ))}
              </div>

              <div className="exec-card-footer">
                <div className="exec-total">{formatPrice(order.totalAmount)}</div>
                {order.status === 'progress' && (
                  <button
                    className="exec-done-btn"
                    onClick={() => handleDone(order)}
                    disabled={updating === order.id}
                  >
                    {updating === order.id ? (
                      <span className="exec-btn-spinner" />
                    ) : (
                      '✓ ГОТОВО'
                    )}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
