import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';
import { RoleGuard } from '../../components/guards/RoleGuard';
import {
  SALES_POINTS, ORDER_TYPES, CLIENT_CATEGORIES, PAYMENT_TYPES, DELIVERY_TYPES,
  STATUS, STATUS_LABELS, formatPrice, formatDate, formatDateTime
} from '../../utils/constants';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import Receipt from '../../components/Receipt/Receipt';
import { ArrowLeft, Save, X, Trash2, RotateCcw, Receipt as ReceiptIcon } from 'lucide-react';
import './OrderDetails.css';

export default function OrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(null);

  useEffect(() => {
    fetchOrder();
    api.catalog.get().then(setCatalog).catch(console.error);
  }, [id]);

  const fetchOrder = async () => {
    try {
      const data = await api.orders.get(id);
      setOrder(data);
      setForm(data);
    } catch (err) {
      console.error(err);
      alert('Ошибка загрузки заказа');
      navigate('/orders');
    } finally {
      setLoading(false);
    }
  };

  const updateForm = (fields) => setForm(prev => ({ ...prev, ...fields }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await api.orders.update(id, form);
      setOrder(updated);
      setEditMode(false);
    } catch (err) {
      alert('Ошибка сохранения: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCloseOrder = async () => {
    if (!confirm('Закрыть заказ?')) return;
    try {
      await api.orders.update(id, { status: STATUS.DELIVERED });
      fetchOrder();
    } catch (err) {
      alert('Ошибка: ' + err.message);
    }
  };

  const handleReopen = async () => {
    try {
      await api.orders.update(id, { status: STATUS.PROGRESS });
      fetchOrder();
    } catch (err) {
      alert('Ошибка: ' + err.message);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Удалить заказ? Это действие необратимо.')) return;
    try {
      await api.orders.delete(id);
      navigate('/orders');
    } catch (err) {
      alert('Ошибка: ' + err.message);
    }
  };

  if (loading) return <div className="loading-screen">Загрузка...</div>;
  if (!order) return <div className="loading-screen">Заказ не найден</div>;

  const totalItems = (order.items || []).reduce((sum, i) => sum + (i.quantity || 1), 0);

  return (
    <div className="order-details-page">
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate('/orders')}>
          <ArrowLeft size={18} />
          Назад
        </button>
        <div className="page-header-info">
          <h1>{order.orderNumber}</h1>
          <StatusBadge status={order.status} />
        </div>
        <div className="page-actions">
          {!editMode ? (
            <>
              <button className="btn-secondary" onClick={() => setShowReceipt(true)}>
                <ReceiptIcon size={16} />
                Квитанция
              </button>
              <button className="btn-secondary" onClick={() => setEditMode(true)}>
                <Save size={16} />
                Редактировать
              </button>
            </>
          ) : (
            <>
              <button className="btn-secondary" onClick={() => { setForm(order); setEditMode(false); }}>
                <X size={16} />
                Отмена
              </button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                <Save size={16} />
                Сохранить
              </button>
            </>
          )}
        </div>
      </div>

      <div className="order-details-grid">
        {/* Info Card */}
        <div className="detail-card">
          <h3>Информация</h3>
          <div className="detail-rows">
            <DetailRow label="Точка" value={SALES_POINTS[order.salesPoint]} />
            <DetailRow label="Тип" value={ORDER_TYPES[order.orderType]} />
            <DetailRow label="Телефон" value={`+${order.customerPhone}`} />
            <DetailRow label="Категория" value={CLIENT_CATEGORIES[order.clientCategory]} />
            <DetailRow label="Создан" value={formatDateTime(order.createdAt)} />
            <DetailRow label="Обновлён" value={formatDateTime(order.updatedAt)} />
          </div>
        </div>

        {/* Items Card */}
        <div className="detail-card">
          <h3>Позиции ({totalItems} шт.)</h3>
          <div className="detail-items">
            {(order.items || []).map((item, idx) => {
              const modelName = catalog?.models[item.modelId]?.name || item.modelId;
              const unitPrice = item.price + item.surcharge;
              return (
                <div key={idx} className="detail-item">
                  <div className="detail-item-name">{modelName}</div>
                  <div className="detail-item-meta">
                    {item.size}{catalog?.sizeDisplay}{item.extra10cm ? ' +10см' : ''}
                  </div>
                  <div className="detail-item-price">
                    {formatPrice(unitPrice)} × {item.quantity} = {formatPrice(unitPrice * item.quantity)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Finance Card */}
        <div className="detail-card">
          <h3>Финансы</h3>
          <div className="detail-rows">
            <DetailRow label="Доставка" value={formatPrice(order.deliveryFee || 0)} />
            {order.discount > 0 && <DetailRow label="Скидка" value={`-${formatPrice(order.discount)}`} accent="negative" />}
            <DetailRow label="Итого" value={formatPrice(order.totalAmount)} accent="grand" />
            <DetailRow label="Оплачено" value={formatPrice(order.paidAmount || 0)} accent="positive" />
            <DetailRow
              label={order.balance > 0 ? 'Долг' : 'Сдача'}
              value={formatPrice(Math.abs(order.balance || 0))}
              accent={order.balance > 0 ? 'warning' : 'positive'}
            />
          </div>
        </div>

        {/* Delivery Card */}
        <div className="detail-card">
          <h3>Получение</h3>
          <div className="detail-rows">
            <DetailRow label="Способ" value={DELIVERY_TYPES[order.deliveryType]} />
            <DetailRow label="Оплата" value={PAYMENT_TYPES[order.paymentType]} />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="order-actions-bar">
        {order.status !== STATUS.DELIVERED && (
          <button className="btn-warning" onClick={handleCloseOrder}>
            Закрыть заказ
          </button>
        )}
        {order.status === STATUS.DELIVERED && (
          <button className="btn-info" onClick={handleReopen}>
            <RotateCcw size={16} />
            Переоткрыть
          </button>
        )}
        <RoleGuard roles={['admin']}>
          <button className="btn-danger" onClick={handleDelete}>
            <Trash2 size={16} />
            Удалить
          </button>
        </RoleGuard>
      </div>

      {/* History */}
      {order.history && order.history.length > 0 && (
        <div className="detail-card history-card">
          <h3>История изменений</h3>
          <div className="history-list">
            {order.history.map((entry, idx) => (
              <div key={idx} className="history-item">
                <span className="history-action">{entry.action}</span>
                <span className="history-time">{formatDateTime(entry.timestamp)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && (
        <Receipt order={order} onClose={() => setShowReceipt(false)} />
      )}
    </div>
  );
}

function DetailRow({ label, value, accent }) {
  const classes = ['detail-row'];
  if (accent === 'grand') classes.push('grand');
  if (accent === 'negative') classes.push('negative');
  if (accent === 'positive') classes.push('positive');
  if (accent === 'warning') classes.push('warning');

  return (
    <div className={classes.join(' ')}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
