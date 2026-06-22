import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';
import { RoleGuard } from '../../components/guards/RoleGuard';
import {
  SALES_POINTS, ORDER_TYPES, CLIENT_CATEGORIES, PAYMENT_METHODS, DELIVERY_TYPES,
  STATUS, STATUS_ORDER, STATUS_LABELS, FIELD_LABELS,
  formatPrice, formatDateTime,
} from '../../utils/constants';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import Receipt from '../../components/Receipt/Receipt';
import { ArrowLeft, Save, X, Trash2, Lock, Unlock, Receipt as ReceiptIcon, ChevronRight } from 'lucide-react';
import { orderItemPrice, sizeKey } from '../../utils/pricing';
import './OrderDetails.css';

function recomputeTotals(f) {
  const itemsTotal = (f.items || []).reduce(
    (s, i) => s + ((i.price || 0) + (i.surcharge || 0)) * (i.quantity || 1), 0);
  const totalAmount = itemsTotal + (f.deliveryFee || 0) - (f.discount || 0);
  return { totalAmount };
}

function fmtVal(v) {
  if (v === null || v === undefined || v === '') return '—';
  return String(v);
}

function renderHistory(entry) {
  const who = entry.by || '';
  const when = formatDateTime(entry.at || entry.timestamp);
  switch (entry.action) {
    case 'created':
      return `Создан · ${who} · ${when}`;
    case 'status':
      return `Статус: ${STATUS_LABELS[entry.from] || entry.from} → ${STATUS_LABELS[entry.to] || entry.to} · ${who} · ${when}`;
    case 'edit':
      return `${FIELD_LABELS[entry.field] || entry.field}: ${fmtVal(entry.from)} → ${fmtVal(entry.to)} · ${who} · ${when}`;
    case 'unlock':
      return `🔓 Разблокировано для правок · причина: «${entry.reason}» · ${who} · ${when}`;
    case 'updated':
      return `Изменён · ${who} · ${when}`;
    default:
      return `${entry.action} · ${who} · ${when}`;
  }
}

export default function OrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [unlockReason, setUnlockReason] = useState('');
  const [unlockBusy, setUnlockBusy] = useState(false);

  useEffect(() => {
    fetchOrder();
    api.products.list().then((list) => setProducts(list || [])).catch(() => {});
  }, [id]);

  const findProduct = (modelId) => products.find((p) => p.id === modelId) || null;

  async function fetchOrder() {
    try {
      const data = await api.adminOrders.get(id);
      setOrder(data);
      setForm(data);
    } catch (err) {
      setError(err.message || 'Ошибка загрузки заказа');
    } finally {
      setLoading(false);
    }
  }

  const updateForm = (fields) => setForm((p) => ({ ...p, ...fields }));

  const itemsEditable = order && (order.status === STATUS.NEW || order.itemsUnlocked === true);

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const { totalAmount } = recomputeTotals(form);
      // Долг отменён: заказ всегда оплачен полностью.
      const updated = await api.adminOrders.update(id, { ...form, totalAmount, paidAmount: totalAmount, balance: 0 });
      setOrder(updated);
      setForm(updated);
      setEditMode(false);
    } catch (err) {
      setError(err.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  }

  // Меняет поля позиции и пересчитывает price/marketPrice из живого каталога.
  // Конвенция витрины: наценка +10см внутри price, surcharge = 0.
  function setItemField(idx, fields) {
    setForm((p) => {
      const items = p.items.map((it, i) => {
        if (i !== idx) return it;
        const merged = { ...it, ...fields };
        const product = products.find((pr) => pr.id === merged.modelId);
        if (product && merged.fabric && merged.size) {
          const key = String(merged.size).replace('×', 'x');
          const { price, marketPrice } = orderItemPrice(product, merged.fabric, key, merged.extra10cm);
          return { ...merged, price, marketPrice, surcharge: 0 };
        }
        return merged;
      });
      return { ...p, items };
    });
  }

  // Смена модели: подставляем название, первую ткань и первый размер по умолчанию.
  function changeItemModel(idx, modelId) {
    const product = findProduct(modelId);
    const fabric = product?.fabricOptions?.[0] ?? '';
    const first = product?.sizes?.[0];
    const size = first ? `${first.width}×${first.height}` : '';
    setItemField(idx, { modelId, name: product?.name || modelId, fabric, size });
  }

  async function handleAdvanceStatus() {
    const idx = STATUS_ORDER.indexOf(order.status);
    const next = STATUS_ORDER[idx + 1];
    if (!next) return;
    setError('');
    try {
      const updated = await api.adminOrders.updateStatus(id, next);
      setOrder(updated);
      setForm(updated);
    } catch (err) {
      setError(err.message || 'Не удалось сменить статус');
    }
  }

  async function handleUnlock() {
    const reason = unlockReason.trim();
    if (!reason) return;
    setUnlockBusy(true);
    setError('');
    try {
      const updated = await api.adminOrders.unlock(id, reason);
      setOrder(updated);
      setForm(updated);
      setUnlockOpen(false);
      setUnlockReason('');
      setEditMode(true);
    } catch (err) {
      setError(err.message || 'Не удалось разблокировать');
    } finally {
      setUnlockBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Удалить заказ? Это действие необратимо.')) return;
    try {
      await api.adminOrders.delete(id);
      navigate('/orders');
    } catch (err) {
      setError(err.message || 'Ошибка удаления');
    }
  }

  if (loading) return <div className="loading-screen">Загрузка...</div>;
  if (!order) return <div className="loading-screen">{error || 'Заказ не найден'}</div>;

  const src = editMode ? form : order;
  const totals = recomputeTotals(src);
  const nextStatus = STATUS_ORDER[STATUS_ORDER.indexOf(order.status) + 1];
  const totalItems = (src.items || []).reduce((s, i) => s + (i.quantity || 1), 0);

  return (
    <div className="order-details-page">
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate('/orders')}>
          <ArrowLeft size={18} /> Назад
        </button>
        <div className="page-header-info">
          <h1>{order.orderNumber}</h1>
          <StatusBadge status={order.status} />
        </div>
        <div className="page-actions">
          {!editMode ? (
            <>
              <button className="btn-ink" onClick={() => setShowReceipt(true)}>
                <ReceiptIcon size={16} /> Квитанция
              </button>
              <button className="btn-ink" onClick={() => { setForm(order); setEditMode(true); }}>
                Редактировать
              </button>
            </>
          ) : (
            <>
              <button className="btn-ink" onClick={() => { setForm(order); setEditMode(false); }}>
                <X size={16} /> Отмена
              </button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                <Save size={16} /> {saving ? 'Сохранение…' : 'Сохранить'}
              </button>
            </>
          )}
        </div>
      </div>

      {error && <div className="od-error">{error}</div>}

      <div className="order-details-grid">
        {/* Клиент / инфо */}
        <div className="detail-card">
          <h3>Клиент</h3>
          <div className="detail-rows">
            {editMode ? (
              <>
                <EditRow label="Имя">
                  <input type="text" value={form.customerName || ''} onChange={(e) => updateForm({ customerName: e.target.value })} />
                </EditRow>
                <EditRow label="Телефон">
                  <input type="text" value={form.customerPhone || ''} onChange={(e) => updateForm({ customerPhone: e.target.value })} />
                </EditRow>
              </>
            ) : (
              <>
                <DetailRow label="Имя" value={order.customerName || '—'} />
                <DetailRow label="Телефон" value={order.customerPhone ? `+${order.customerPhone}` : '—'} />
              </>
            )}
            <DetailRow label="Точка" value={SALES_POINTS[order.salesPoint] || order.salesPoint} />
            <DetailRow label="Тип" value={ORDER_TYPES[order.orderType] || '—'} />
            <DetailRow label="Категория" value={CLIENT_CATEGORIES[order.clientCategory] || '—'} />
            <DetailRow label="Создан" value={formatDateTime(order.createdAt)} />
            <DetailRow label="Обновлён" value={formatDateTime(order.updatedAt)} />
          </div>
        </div>

        {/* Позиции */}
        <div className="detail-card">
          <div className="detail-card-head">
            <h3>Позиции ({totalItems} шт.)</h3>
            {editMode && !itemsEditable && (
              <span className="lock-pill"><Lock size={13} /> Заблокировано (в работе)</span>
            )}
          </div>

          {editMode && !itemsEditable && (
            <button className="btn-ink btn-unlock" onClick={() => setUnlockOpen(true)}>
              <Unlock size={15} /> Разблокировать для правок
            </button>
          )}

          <div className="detail-items">
            {(src.items || []).map((item, idx) => {
              const editable = editMode && itemsEditable;
              if (editable) {
                const product = findProduct(item.modelId);
                const isLegacy = !!item.modelId && !product;
                return (
                  <div key={idx} className="detail-item edit">
                    <select value={isLegacy ? '__legacy__' : (item.modelId || '')} onChange={(e) => changeItemModel(idx, e.target.value)}>
                      <option value="">Модель</option>
                      {isLegacy && <option value="__legacy__" disabled>(старая модель: {item.name || item.modelId})</option>}
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <select value={item.fabric || ''} onChange={(e) => setItemField(idx, { fabric: e.target.value })} disabled={!product}>
                      <option value="">Ткань</option>
                      {(product?.fabricOptions || []).map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <select value={item.size || ''} onChange={(e) => setItemField(idx, { size: e.target.value })} disabled={!product}>
                      <option value="">Размер</option>
                      {(product?.sizes || []).map((s) => {
                        const label = `${s.width}×${s.height}`;
                        return <option key={label} value={label}>{label}</option>;
                      })}
                    </select>
                    <select value={item.extra10cm ? 'yes' : 'no'} onChange={(e) => setItemField(idx, { extra10cm: e.target.value === 'yes' })} disabled={!product}>
                      <option value="no">−10см</option>
                      <option value="yes">+10см</option>
                    </select>
                    <input type="number" min="1" value={item.quantity || 1} onChange={(e) => setItemField(idx, { quantity: Math.max(1, Number(e.target.value)) })} />
                  </div>
                );
              }
              const modelName = item.name || findProduct(item.modelId)?.name || item.modelId;
              const unit = (item.price || 0) + (item.surcharge || 0);
              return (
                <div key={idx} className="detail-item">
                  <div className="detail-item-name">{modelName}</div>
                  <div className="detail-item-meta">{item.size}{item.extra10cm ? ' +10см' : ''}</div>
                  <div className="detail-item-price">{formatPrice(unit)} × {item.quantity} = {formatPrice(unit * item.quantity)}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Финансы */}
        <div className="detail-card">
          <h3>Финансы</h3>
          <div className="detail-rows">
            {editMode ? (
              <EditRow label="Скидка"><input type="number" min="0" value={form.discount || 0} onChange={(e) => updateForm({ discount: Number(e.target.value) })} /></EditRow>
            ) : (
              <>
                <DetailRow label="Доставка" value={formatPrice(order.deliveryFee || 0)} />
                {order.discount > 0 && <DetailRow label="Скидка" value={`−${formatPrice(order.discount)}`} accent="negative" />}
              </>
            )}
            <DetailRow label="Итого" value={formatPrice(totals.totalAmount)} accent="grand" />
          </div>
        </div>

        {/* Получение */}
        <div className="detail-card">
          <h3>Получение</h3>
          <div className="detail-rows">
            {editMode ? (
              <EditRow label="Способ">
                <select value={form.deliveryType || 'pickup'} onChange={(e) => updateForm({ deliveryType: e.target.value })}>
                  {Object.entries(DELIVERY_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </EditRow>
            ) : (
              <DetailRow label="Способ" value={DELIVERY_TYPES[order.deliveryType] || '—'} />
            )}
            {editMode ? (
              <EditRow label="Способ оплаты">
                <select
                  value={form.paymentMethod || 'cash'}
                  onChange={(e) => updateForm({ paymentMethod: e.target.value })}
                >
                  {Object.entries(PAYMENT_METHODS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </EditRow>
            ) : (
              <DetailRow label="Способ оплаты" value={PAYMENT_METHODS[order.paymentMethod] || order.paymentMethod || '—'} />
            )}
            <EditRow label="Заметки">
              {editMode
                ? <textarea rows={2} value={form.notes || ''} onChange={(e) => updateForm({ notes: e.target.value })} />
                : <span>{order.notes || '—'}</span>}
            </EditRow>
          </div>
        </div>
      </div>

      {/* Управление статусом / удаление */}
      {!editMode && (
        <div className="order-actions-bar">
          {nextStatus && (
            <button className="btn-primary" onClick={handleAdvanceStatus}>
              {STATUS_LABELS[order.status]} <ChevronRight size={15} /> {STATUS_LABELS[nextStatus]}
            </button>
          )}
          <RoleGuard roles={['admin']}>
            <button className="btn-danger" onClick={handleDelete}>
              <Trash2 size={16} /> Удалить
            </button>
          </RoleGuard>
        </div>
      )}

      {/* История изменений */}
      {order.history && order.history.length > 0 && (
        <div className="detail-card history-card">
          <h3>История изменений</h3>
          <div className="history-list">
            {[...order.history].reverse().map((entry, idx) => (
              <div key={idx} className="history-item">{renderHistory(entry)}</div>
            ))}
          </div>
        </div>
      )}

      {/* Модалка разблокировки */}
      {unlockOpen && (
        <div className="od-modal-overlay" onClick={() => setUnlockOpen(false)}>
          <div className="od-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Разблокировать позиции</h3>
            <p className="od-modal-desc">Заказ в работе. Укажите причину правки — она попадёт в журнал.</p>
            <textarea
              rows={3}
              autoFocus
              placeholder="Напр.: клиент попросил изменить размер"
              value={unlockReason}
              onChange={(e) => setUnlockReason(e.target.value)}
            />
            <div className="od-modal-actions">
              <button className="btn-ink" onClick={() => setUnlockOpen(false)}>Отмена</button>
              <button className="btn-primary" onClick={handleUnlock} disabled={!unlockReason.trim() || unlockBusy}>
                {unlockBusy ? 'Разблокировка…' : 'Разблокировать'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showReceipt && <Receipt order={order} onClose={() => setShowReceipt(false)} />}
    </div>
  );
}

function DetailRow({ label, value, accent }) {
  const classes = ['detail-row'];
  if (accent) classes.push(accent);
  return (
    <div className={classes.join(' ')}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function EditRow({ label, children }) {
  return (
    <div className="detail-row edit-row">
      <span>{label}</span>
      <span className="edit-control">{children}</span>
    </div>
  );
}
