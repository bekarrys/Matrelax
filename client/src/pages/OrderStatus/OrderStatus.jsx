import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import './OrderStatus.css';

function formatPrice(price) {
  return new Intl.NumberFormat('ru-KZ').format(price) + ' ₸';
}

const STATUSES = [
  { key: 'pending_payment', label: 'оплата' },
  { key: 'paid',            label: 'оплачен' },
  { key: 'in_production',   label: 'в производстве' },
  { key: 'ready',           label: 'готов' },
  { key: 'delivered',       label: 'выдан' },
];

function getStatusIndex(status) {
  return STATUSES.findIndex((s) => s.key === status);
}

export default function OrderStatus() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [live, setLive] = useState(false); // true когда SSE подключён

  useEffect(() => {
    // Быстрый первый рендер через REST пока SSE устанавливается
    api.orders.getPublic(id)
      .then((data) => { setOrder(data); setLoading(false); })
      .catch(() => { setError('Заказ не найден'); setLoading(false); });

    // Открываем SSE-поток — далее сервер сам пушит изменения из Firestore
    const es = new EventSource(`/api/orders/${id}/stream`);

    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      setOrder(data);
      setLoading(false);
      setError('');
      setLive(true);
    };

    es.addEventListener('error', (e) => {
      if (e.data) {
        try { setError(JSON.parse(e.data).error); } catch {}
      }
      setLive(false);
      // EventSource автоматически переподключается
    });

    return () => es.close();
  }, [id]);

  if (loading) {
    return (
      <div className="os-page">
        <div className="os-loading">
          <div className="os-spinner" />
          <p>загрузка заказа...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="os-page">
        <div className="os-error">
          <p>{error}</p>
          <button className="btn-primary" onClick={() => navigate('/')}>на главную</button>
        </div>
      </div>
    );
  }

  const currentIdx = getStatusIndex(order.status);

  return (
    <div className="os-page page-enter">
      <div className="os-header">
        <button className="os-home" onClick={() => navigate('/')}>← на главную</button>
      </div>

      <div className="os-body">
        <div className="os-number-block">
          <div className="os-label">номер заказа</div>
          <div className="os-number">{order.orderNumber}</div>
        </div>

        {/* Status progress */}
        <div className="os-progress-block">
          <div className="os-progress-title">статус</div>
          <div className="os-steps">
            {STATUSES.map((status, idx) => (
              <div key={status.key} className="os-step-wrap">
                <div className={`os-step-circle ${idx <= currentIdx ? 'os-step-circle--done' : ''} ${idx === currentIdx ? 'os-step-circle--current' : ''}`}>
                  {idx < currentIdx ? '✓' : idx + 1}
                </div>
                <div className={`os-step-label ${idx === currentIdx ? 'os-step-label--current' : ''}`}>
                  {status.label}
                </div>
                {idx < STATUSES.length - 1 && (
                  <div className={`os-step-line ${idx < currentIdx ? 'os-step-line--done' : ''}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Order items */}
        <div className="os-card">
          <div className="os-card-title">состав заказа</div>
          {(order.items || []).map((item, idx) => (
            <div key={idx} className="os-item">
              <div className="os-item-name">{item.name}</div>
              <div className="os-item-meta">{item.size} см · {item.quantity} шт.</div>
              <div className="os-item-price">{formatPrice(item.price * item.quantity)}</div>
            </div>
          ))}
          <div className="os-divider" />
          <div className="os-total">
            <span>итого</span>
            <span>{formatPrice(order.totalAmount)}</span>
          </div>
        </div>

        <a href="tel:+77001234567" className="os-call-btn">
          📞 позвонить в магазин
        </a>

        {/* Live indicator */}
        <div className="os-live-badge">
          <span className={`os-live-dot ${live ? 'os-live-dot--on' : ''}`} />
          {live ? 'обновляется в реальном времени' : 'подключение...'}
        </div>
      </div>
    </div>
  );
}
