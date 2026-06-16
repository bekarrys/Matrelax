import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';
import { useCartStore } from '../../store/cartStore';
import { cartToOrderItems, cartTotal } from '../../utils/orderMapping.mjs';
import { SALES_POINTS, PAYMENT_METHODS, PAYMENT_TYPES, formatPrice, formatPhone } from '../../utils/constants';
import './Checkout.css';

export default function Checkout() {
  const navigate = useNavigate();
  const { items, clearCart } = useCartStore();
  const total = cartTotal(items);

  const [salesPoint, setSalesPoint] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentType, setPaymentType] = useState('paid');
  const [paidAmount, setPaidAmount] = useState('');
  const [deliveryType, setDeliveryType] = useState('pickup');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePhoneChange = (e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11));

  const paid = paymentType === 'paid' ? total : Number(paidAmount) || 0;
  const canSubmit = items.length > 0 && salesPoint && name.trim() && phone.length >= 10 && paymentMethod;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError('');
    try {
      const order = await api.adminOrders.create({
        salesPoint,
        customerName: name.trim(),
        customerPhone: phone,
        items: cartToOrderItems(items),
        totalAmount: total,
        paymentMethod,
        paymentType,
        paidAmount: paid,
        balance: total - paid,
        deliveryType,
        deliveryAddress: deliveryType === 'delivery' ? address : '',
        status: 'new',
      });
      clearCart();
      navigate(`/orders/${order.id}`);
    } catch (err) {
      setError(err.message || 'Ошибка оформления заказа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="checkout-page page-enter">
      <div className="checkout-header">
        <button className="checkout-back" onClick={() => navigate(-1)}>←</button>
        <h1>оформление</h1>
        <div style={{ width: 40 }} />
      </div>

      <div className="checkout-body">
        <div className="co-field">
          <label>точка продаж</label>
          <div className="co-toggle-row">
            {Object.entries(SALES_POINTS).map(([key, label]) => (
              <button
                key={key}
                className={`co-toggle-btn ${salesPoint === key ? 'co-toggle-btn--active' : ''}`}
                onClick={() => setSalesPoint(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="co-field">
          <label>имя клиента</label>
          <div className="co-input-wrap">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="имя" />
          </div>
        </div>

        <div className="co-field">
          <label>телефон</label>
          <div className="co-input-wrap">
            <input type="tel" value={formatPhone(phone)} onChange={handlePhoneChange} placeholder="+7 XXX XXX XX XX" inputMode="tel" />
          </div>
        </div>

        <div className="co-field">
          <label>способ оплаты</label>
          <div className="co-toggle-row">
            {Object.entries(PAYMENT_METHODS).map(([key, label]) => (
              <button
                key={key}
                className={`co-toggle-btn ${paymentMethod === key ? 'co-toggle-btn--active' : ''}`}
                onClick={() => setPaymentMethod(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="co-field">
          <label>статус оплаты</label>
          <div className="co-toggle-row">
            {Object.entries(PAYMENT_TYPES).map(([key, label]) => (
              <button
                key={key}
                className={`co-toggle-btn ${paymentType === key ? 'co-toggle-btn--active' : ''}`}
                onClick={() => setPaymentType(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {paymentType !== 'paid' && (
          <div className="co-field">
            <label>внесено (KZT)</label>
            <div className="co-input-wrap">
              <input type="number" min="0" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} placeholder="0" />
            </div>
          </div>
        )}

        <div className="co-field">
          <label>получение</label>
          <div className="co-toggle-row">
            {[['pickup', 'Самовывоз'], ['delivery', 'Доставка']].map(([key, label]) => (
              <button
                key={key}
                className={`co-toggle-btn ${deliveryType === key ? 'co-toggle-btn--active' : ''}`}
                onClick={() => setDeliveryType(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {deliveryType === 'delivery' && (
          <div className="co-field">
            <label>адрес доставки</label>
            <div className="co-input-wrap">
              <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="улица, дом, квартира" />
            </div>
          </div>
        )}

        <div className="co-summary">
          <div className="co-summary-title">состав заказа</div>
          {items.map((item) => (
            <div key={item.id} className="co-summary-row">
              <span>{item.name} {item.size} × {item.quantity}</span>
              <span>{formatPrice(item.price * item.quantity)}</span>
            </div>
          ))}
          <div className="co-summary-divider" />
          <div className="co-summary-total">
            <span>итого</span>
            <span>{formatPrice(total)}</span>
          </div>
          {paymentType !== 'paid' && (
            <div className="co-summary-row"><span>долг</span><span>{formatPrice(total - paid)}</span></div>
          )}
        </div>

        {error && <div className="co-error">{error}</div>}
      </div>

      <div className="checkout-footer">
        <button
          className="price-btn"
          onClick={handleSubmit}
          disabled={!canSubmit || loading}
          style={{ opacity: !canSubmit ? 0.5 : 1 }}
        >
          {loading ? 'создание...' : `создать заказ · ${formatPrice(total)}`}
        </button>
      </div>
    </div>
  );
}
