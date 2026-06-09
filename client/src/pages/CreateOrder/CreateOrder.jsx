import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';
import {
  SALES_POINTS, ORDER_TYPES, CLIENT_CATEGORIES, PAYMENT_TYPES, DELIVERY_TYPES,
  STATUS, STATUS_LABELS, formatPrice
} from '../../utils/constants';
import PhoneInput from '../../components/PhoneInput/PhoneInput';
import Receipt from '../../components/Receipt/Receipt';
import {
  ChevronRight, ChevronLeft, Plus, Trash2, Check, AlertTriangle, Loader2
} from 'lucide-react';
import './CreateOrder.css';

const STEPS = [
  'Точка продаж',
  'Тип операции',
  'Телефон клиента',
  'Категория клиента',
  'Матрасы',
  'Доставка и скидка',
  'Оплата',
  'Получение',
  'Подтверждение',
];

const initialItems = [{ modelId: '', size: '', extra10cm: false, quantity: 1, price: 0, surcharge: 0 }];

export default function CreateOrder() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [catalog, setCatalog] = useState(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    salesPoint: '',
    orderType: 'sale',
    customerPhone: '',
    clientCategory: 'regular',
    items: initialItems,
    deliveryFee: 0,
    discount: 0,
    paymentType: 'paid',
    paidAmount: 0,
    deliveryType: 'pickup',
    status: STATUS.PROGRESS,
    notes: '',
  });

  const [showReceipt, setShowReceipt] = useState(false);
  const [createdOrder, setCreatedOrder] = useState(null);

  useEffect(() => {
    api.catalog.get().then(setCatalog).catch(console.error);
  }, []);

  const updateForm = (fields) => setForm(prev => ({ ...prev, ...fields }));

  const handlePriceCalc = useCallback(async (itemIdx) => {
    const item = form.items[itemIdx];
    if (!item.modelId || !item.size) return;
    try {
      const result = await api.catalog.calculate({
        modelId: item.modelId,
        size: item.size,
        extra10cm: item.extra10cm,
      });
      const updated = [...form.items];
      updated[itemIdx] = { ...item, price: result.basePrice, surcharge: result.surcharge };
      updateForm({ items: updated });
    } catch (err) {
      console.error(err);
    }
  }, [form.items]);

  const addItem = () => {
    updateForm({ items: [...form.items, { modelId: '', size: '', extra10cm: false, quantity: 1, price: 0, surcharge: 0 }] });
  };

  const removeItem = (idx) => {
    if (form.items.length <= 1) return;
    const items = form.items.filter((_, i) => i !== idx);
    updateForm({ items });
  };

  const updateItem = (idx, fields) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], ...fields };
    updateForm({ items });
  };

  const totalAmount = form.items.reduce((sum, item) => sum + ((item.price + item.surcharge) * item.quantity), 0)
    + (form.deliveryFee || 0) - (form.discount || 0);

  const balance = totalAmount - (form.paidAmount || 0);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const orderData = {
        ...form,
        totalAmount,
        paidAmount: form.paidAmount || 0,
        balance,
      };
      const order = await api.orders.create(orderData);
      setCreatedOrder(order);
      setShowReceipt(true);
    } catch (err) {
      console.error(err);
      alert('Ошибка создания заказа: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const canNext = () => {
    switch (step) {
      case 0: return !!form.salesPoint;
      case 2: return form.customerPhone.length >= 10;
      case 4: return form.items.some(i => i.modelId && i.size);
      default: return true;
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="step-content">
            <h2>Точка продаж</h2>
            <p className="step-desc">Выберите точку продаж</p>
            <div className="point-buttons">
              {Object.entries(SALES_POINTS).map(([key, label]) => (
                <button
                  key={key}
                  className={`btn-option ${form.salesPoint === key ? 'selected' : ''}`}
                  onClick={() => updateForm({ salesPoint: key })}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        );

      case 1:
        return (
          <div className="step-content">
            <h2>Тип операции</h2>
            <p className="step-desc">Продажа или поставка?</p>
            <div className="point-buttons">
              {Object.entries(ORDER_TYPES).map(([key, label]) => (
                <button
                  key={key}
                  className={`btn-option ${form.orderType === key ? 'selected' : ''}`}
                  onClick={() => updateForm({ orderType: key })}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="step-content">
            <h2>Телефон клиента</h2>
            <p className="step-desc">Введите номер телефона клиента</p>
            <div className="form-field-wide">
              <label>Номер телефона</label>
              <PhoneInput
                value={form.customerPhone}
                onChange={(digits) => updateForm({ customerPhone: digits })}
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="step-content">
            <h2>Категория клиента</h2>
            <p className="step-desc">Выберите категорию клиента</p>
            <div className="point-buttons">
              {Object.entries(CLIENT_CATEGORIES).map(([key, label]) => (
                <button
                  key={key}
                  className={`btn-option ${form.clientCategory === key ? 'selected' : ''}`}
                  onClick={() => updateForm({ clientCategory: key })}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="step-content">
            <h2>Добавить матрасы</h2>
            <p className="step-desc">Выберите модели, размеры и количество</p>
            <div className="items-list">
              {form.items.map((item, idx) => (
                <div key={idx} className="item-card">
                  <div className="item-header">
                    <span className="item-title">Позиция {idx + 1}</span>
                    {form.items.length > 1 && (
                      <button className="btn-icon" onClick={() => removeItem(idx)}>
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  <div className="item-fields">
                    <div className="form-field">
                      <label>Модель</label>
                      <select
                        value={item.modelId}
                        onChange={e => {
                          updateItem(idx, { modelId: e.target.value, size: '', price: 0 });
                        }}
                      >
                        <option value="">Выберите модель</option>
                        {catalog && Object.entries(catalog.models).map(([id, model]) => (
                          <option key={id} value={id}>{model.name} ({model.series})</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-field">
                      <label>Размер (см)</label>
                      <select
                        value={item.size}
                        onChange={e => updateItem(idx, { size: e.target.value })}
                        onBlur={() => handlePriceCalc(idx)}
                      >
                        <option value="">Размер</option>
                        {catalog?.sizes.map(s => (
                          <option key={s} value={s}>{s}{catalog.sizeDisplay}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-field">
                      <label>+10 см</label>
                      <select
                        value={item.extra10cm ? 'yes' : 'no'}
                        onChange={e => updateItem(idx, { extra10cm: e.target.value === 'yes' })}
                        onBlur={() => handlePriceCalc(idx)}
                      >
                        <option value="no">Нет</option>
                        <option value="yes">Да</option>
                      </select>
                    </div>
                    <div className="form-field">
                      <label>Количество</label>
                      <div className="qty-control">
                        <button onClick={() => updateItem(idx, { quantity: Math.max(1, item.quantity - 1) })}>−</button>
                        <span>{item.quantity}</span>
                        <button onClick={() => updateItem(idx, { quantity: item.quantity + 1 })}>+</button>
                      </div>
                    </div>
                    <div className="form-field">
                      <label>Цена за шт.</label>
                      <div className="price-display">
                        {item.price > 0 ? formatPrice(item.price + item.surcharge) : '—'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button className="btn-secondary" onClick={addItem}>
              <Plus size={16} />
              Добавить ещё
            </button>
          </div>
        );

      case 5:
        return (
          <div className="step-content">
            <h2>Доставка и скидка</h2>
            <p className="step-desc">Укажите стоимость доставки и скидку</p>
            <div className="form-field-wide">
              <label>Стоимость доставки (KZT)</label>
              <input
                type="number"
                value={form.deliveryFee || ''}
                onChange={e => updateForm({ deliveryFee: Number(e.target.value) })}
                placeholder="0"
                min="0"
              />
            </div>
            <div className="form-field-wide">
              <label>Скидка (KZT)</label>
              <input
                type="number"
                value={form.discount || ''}
                onChange={e => updateForm({ discount: Number(e.target.value) })}
                placeholder="0"
                min="0"
              />
            </div>
            <div className="total-box">
              <div className="total-row">
                <span>Матрасы:</span>
                <span>{formatPrice(form.items.reduce((s, i) => s + (i.price + i.surcharge) * i.quantity, 0))}</span>
              </div>
              {form.deliveryFee > 0 && (
                <div className="total-row">
                  <span>Доставка:</span>
                  <span>{formatPrice(form.deliveryFee)}</span>
                </div>
              )}
              {form.discount > 0 && (
                <div className="total-row negative">
                  <span>Скидка:</span>
                  <span>−{formatPrice(form.discount)}</span>
                </div>
              )}
              <div className="total-row grand">
                <span>ИТОГО:</span>
                <span>{formatPrice(totalAmount)}</span>
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="step-content">
            <h2>Оплата</h2>
            <p className="step-desc">Статус оплаты</p>
            <div className="point-buttons">
              {Object.entries(PAYMENT_TYPES).map(([key, label]) => (
                <button
                  key={key}
                  className={`btn-option ${form.paymentType === key ? 'selected' : ''}`}
                  onClick={() => updateForm({ paymentType: key })}
                >
                  {label}
                </button>
              ))}
            </div>
            {form.paymentType !== 'paid' && (
              <div className="form-field-wide">
                <label>Внесённая сумма (KZT)</label>
                <input
                  type="number"
                  value={form.paidAmount || ''}
                  onChange={e => updateForm({ paidAmount: Number(e.target.value) })}
                  placeholder="0"
                  min="0"
                />
              </div>
            )}
            {form.paymentType === 'paid' && (
              <div style={{ display: 'none' }}>
                <input type="number" value={totalAmount} readOnly />
              </div>
            )}
            <div className="balance-box">
              <div className="balance-row">
                <span>Итого:</span>
                <span>{formatPrice(totalAmount)}</span>
              </div>
              <div className="balance-row">
                <span>Внесено:</span>
                <span>{formatPrice(form.paidAmount || 0)}</span>
              </div>
              <div className="balance-row debt">
                <span>{balance > 0 ? 'Долг:' : 'Сдача:'}</span>
                <span>{formatPrice(Math.abs(balance))}</span>
              </div>
            </div>
          </div>
        );

      case 7:
        return (
          <div className="step-content">
            <h2>Способ получения</h2>
            <p className="step-desc">Доставка или самовывоз?</p>
            <div className="point-buttons">
              {Object.entries(DELIVERY_TYPES).map(([key, label]) => (
                <button
                  key={key}
                  className={`btn-option ${form.deliveryType === key ? 'selected' : ''}`}
                  onClick={() => updateForm({ deliveryType: key })}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="form-field-wide">
              <label>Статус заказа</label>
              <select value={form.status} onChange={e => updateForm({ status: e.target.value })}>
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        );

      case 8:
        return (
          <div className="step-content">
            <h2>Подтверждение</h2>
            <p className="step-desc">Проверьте данные и создайте заказ</p>
            <div className="summary-card">
              <div className="summary-row">
                <span>Точка:</span>
                <span>{SALES_POINTS[form.salesPoint]}</span>
              </div>
              <div className="summary-row">
                <span>Телефон:</span>
                <span>+{form.customerPhone}</span>
              </div>
              <div className="summary-row">
                <span>Категория:</span>
                <span>{CLIENT_CATEGORIES[form.clientCategory]}</span>
              </div>
              <div className="summary-row">
                <span>Позиций:</span>
                <span>{form.items.filter(i => i.modelId).length}</span>
              </div>
              <div className="summary-row">
                <span>Получение:</span>
                <span>{DELIVERY_TYPES[form.deliveryType]}</span>
              </div>
              <div className="summary-divider" />
              <div className="summary-row grand">
                <span>ИТОГО:</span>
                <span>{formatPrice(totalAmount)}</span>
              </div>
            </div>
            {form.notes && (
              <div className="form-field-wide">
                <label>Заметки</label>
                <textarea
                  value={form.notes}
                  onChange={e => updateForm({ notes: e.target.value })}
                  rows={3}
                  placeholder="Дополнительные заметки..."
                />
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const paidValue = form.paymentType === 'paid' ? totalAmount : (form.paidAmount || 0);

  return (
    <div className="wizard-page">
      {/* Progress */}
      <div className="wizard-progress">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
        <div className="progress-label">
          Шаг {step + 1} из {STEPS.length}: {STEPS[step]}
        </div>
      </div>

      {/* Step Content */}
      <div className="wizard-body">
        {renderStep()}
      </div>

      {/* Navigation */}
      <div className="wizard-nav">
        <button
          className="btn-secondary"
          onClick={() => setStep(s => Math.max(0, s - 1))}
          disabled={step === 0}
        >
          <ChevronLeft size={16} />
          Назад
        </button>

        {step < STEPS.length - 1 ? (
          <button
            className="btn-primary"
            onClick={() => canNext() && setStep(s => s + 1)}
            disabled={!canNext()}
          >
            Далее
            <ChevronRight size={16} />
          </button>
        ) : (
          <button
            className="btn-primary btn-success"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="spin" />
                Создание...
              </>
            ) : (
              <>
                <Check size={18} />
                Создать заказ
              </>
            )}
          </button>
        )}
      </div>

      {/* Receipt Modal */}
      {showReceipt && createdOrder && (
        <Receipt
          order={{ ...createdOrder, paidAmount: paidValue, balance: totalAmount - paidValue }}
          onClose={() => navigate('/orders')}
        />
      )}
    </div>
  );
}
