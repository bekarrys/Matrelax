import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import './Workshop.css';

function formatPrice(price) {
  return new Intl.NumberFormat('ru-KZ').format(price) + ' ₸';
}

const STATUS_TRANSITIONS = {
  paid: { label: 'взять в работу', next: 'in_production' },
  in_production: { label: 'готов', next: 'ready' },
  ready: { label: 'выдан', next: 'delivered' },
};

const STATUS_LABELS = {
  pending_payment: 'ожидает оплаты',
  paid: 'оплачен',
  in_production: 'в производстве',
  ready: 'готов',
  delivered: 'выдан',
};

export default function Workshop() {
  const [pin, setPin] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authenticated) {
      fetchOrders();
      const interval = setInterval(fetchOrders, 15000);
      return () => clearInterval(interval);
    }
  }, [authenticated]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await api.orders.list(pin);
      setOrders(data.filter((o) => o.status !== 'delivered'));
    } catch {
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const handlePinDigit = (digit) => {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setPinError(false);
    if (newPin.length === 4) {
      checkPin(newPin);
    }
  };

  const checkPin = async (p) => {
    try {
      await api.orders.list(p);
      setAuthenticated(true);
    } catch {
      setPinError(true);
      setTimeout(() => { setPin(''); setPinError(false); }, 1000);
    }
  };

  const handleStatusChange = async (order) => {
    const transition = STATUS_TRANSITIONS[order.status];
    if (!transition) return;
    try {
      await api.orders.updateStatus(order.id, transition.next, pin);
      fetchOrders();
    } catch (err) {
      alert('Ошибка: ' + err.message);
    }
  };

  if (!authenticated) {
    return (
      <div className="ws-pin-page">
        <div className="ws-pin-card">
          <div className="ws-pin-logo">🛏️</div>
          <h1 className="ws-pin-title">цех MATRELAX</h1>
          <p className="ws-pin-sub">введите PIN-код</p>

          <div className="ws-pin-dots">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={`ws-pin-dot ${i < pin.length ? 'ws-pin-dot--filled' : ''} ${pinError ? 'ws-pin-dot--error' : ''}`} />
            ))}
          </div>

          <div className="ws-keypad">
            {[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map((key, idx) => (
              <button
                key={idx}
                className={`ws-key ${key === '' ? 'ws-key--empty' : ''}`}
                onClick={() => {
                  if (key === '⌫') setPin((p) => p.slice(0, -1));
                  else if (key !== '') handlePinDigit(String(key));
                }}
                disabled={key === ''}
              >
                {key}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ws-page page-enter">
      <div className="ws-header">
        <h1>цех</h1>
        <div className="ws-header-right">
          {loading && <div className="ws-loading-dot" />}
          <button className="ws-logout" onClick={() => { setAuthenticated(false); setPin(''); }}>
            выйти
          </button>
        </div>
      </div>

      <div className="ws-orders">
        {orders.length === 0 ? (
          <div className="ws-empty">
            <p>нет активных заказов</p>
            <p className="ws-empty-sub">обновляется каждые 15 сек</p>
          </div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="ws-order-card">
              <div className="ws-order-header">
                <div className="ws-order-number">{order.orderNumber}</div>
                <div className={`ws-status-badge ws-status-${order.status}`}>
                  {STATUS_LABELS[order.status]}
                </div>
              </div>

              <div className="ws-order-info">
                <div className="ws-info-row">
                  <span>клиент:</span>
                  <span>{order.customerName || '—'}</span>
                </div>
                <div className="ws-info-row">
                  <span>получение:</span>
                  <span>{order.deliveryType === 'delivery' ? '🚚 доставка' : '🏠 самовывоз'}</span>
                </div>
              </div>

              <div className="ws-order-items">
                {(order.items || []).map((item, idx) => (
                  <div key={idx} className="ws-item">
                    <span className="ws-item-name">{item.name}</span>
                    <span className="ws-item-meta">{item.size} см{item.extra10cm ? ' +10см' : ''}{item.fabric ? ` · ${item.fabric}` : ''}</span>
                    <span className="ws-item-qty">× {item.quantity}</span>
                  </div>
                ))}
              </div>

              <div className="ws-order-footer">
                <div className="ws-order-total">{formatPrice(order.totalAmount)}</div>
                {STATUS_TRANSITIONS[order.status] && (
                  <button
                    className="ws-action-btn"
                    onClick={() => handleStatusChange(order)}
                  >
                    {STATUS_TRANSITIONS[order.status].label}
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
