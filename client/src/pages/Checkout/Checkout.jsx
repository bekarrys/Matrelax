import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { useCartStore } from '../../store/cartStore';
import BottomSheet from '../../components/BottomSheet/BottomSheet';
import './Checkout.css';

function formatPrice(price) {
  return new Intl.NumberFormat('ru-KZ').format(price) + ' ₸';
}

function formatPhone(raw) {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  const d = digits.startsWith('8') ? '7' + digits.slice(1) : digits;
  let result = '+7';
  if (d.length > 1) result += ' ' + d.slice(1, 4);
  if (d.length > 4) result += ' ' + d.slice(4, 7);
  if (d.length > 7) result += ' ' + d.slice(7, 9);
  if (d.length > 9) result += ' ' + d.slice(9, 11);
  return result;
}

const PAYMENT_METHODS = [
  { key: 'kaspi', label: 'Kaspi.kz', icon: '🟡' },
  { key: 'card', label: 'Visa / Mastercard', icon: '💳' },
  { key: 'freedom', label: 'Freedom Pay', icon: '🔵' },
];

const DELIVERY_TYPES = [
  { key: 'pickup', label: 'Самовывоз' },
  { key: 'delivery', label: 'Доставка' },
];

export default function Checkout() {
  const navigate = useNavigate();
  const { items, clearCart, paymentMethod: cartPaymentMethod, setPaymentMethod } = useCartStore();
  const totalPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [deliveryType, setDeliveryType] = useState('pickup');
  const [address, setAddress] = useState('');
  const [comment, setComment] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(cartPaymentMethod);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePhoneChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '');
    setPhone(raw.slice(0, 11));
  };

  const canSubmit = name.trim() && phone.length >= 10 && selectedPayment;

  const handlePay = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError('');
    try {
      const order = await api.orders.create({
        customerName: name,
        customerPhone: phone,
        deliveryType,
        address: deliveryType === 'delivery' ? address : '',
        comment,
        paymentMethod: selectedPayment,
        items: items.map((i) => ({
          productId: i.productId,
          name: i.name,
          size: i.size,
          fabric: i.fabric,
          extra10cm: i.extra10cm,
          price: i.price,
          quantity: i.quantity,
        })),
        totalAmount: totalPrice,
      });

      // Initiate payment
      await api.payment.initiate({
        orderId: order.id,
        method: selectedPayment,
        amount: totalPrice,
      });

      clearCart();
      navigate(`/order/${order.id}`);
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
        {/* Name */}
        <div className="co-field">
          <label>имя</label>
          <div className="co-input-wrap">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ваше имя"
              autoComplete="name"
            />
          </div>
        </div>

        {/* Phone */}
        <div className="co-field">
          <label>телефон</label>
          <div className="co-input-wrap">
            <input
              type="tel"
              value={formatPhone(phone)}
              onChange={handlePhoneChange}
              placeholder="+7 XXX XXX XX XX"
              inputMode="tel"
            />
          </div>
        </div>

        {/* Delivery */}
        <div className="co-field">
          <label>получение</label>
          <div className="co-toggle-row">
            {DELIVERY_TYPES.map((d) => (
              <button
                key={d.key}
                className={`co-toggle-btn ${deliveryType === d.key ? 'co-toggle-btn--active' : ''}`}
                onClick={() => setDeliveryType(d.key)}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {deliveryType === 'delivery' && (
          <div className="co-field">
            <label>адрес доставки</label>
            <div className="co-input-wrap">
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="улица, дом, квартира"
              />
            </div>
          </div>
        )}

        {/* Comment */}
        <div className="co-field">
          <label>комментарий <span className="co-optional">(необязательно)</span></label>
          <div className="co-input-wrap">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="пожелания к заказу..."
              rows={3}
            />
          </div>
        </div>

        {/* Payment selection */}
        <div className="co-field">
          <label>способ оплаты</label>
          <div
            className="co-payment-select"
            onClick={() => setShowPayment(true)}
          >
            {selectedPayment
              ? PAYMENT_METHODS.find((m) => m.key === selectedPayment)?.label
              : 'выбрать способ оплаты'}
            <span className="co-chevron">›</span>
          </div>
        </div>

        {/* Order summary */}
        <div className="co-summary">
          <div className="co-summary-title">состав заказа</div>
          {items.map((item) => (
            <div key={item.id} className="co-summary-row">
              <span>{item.name} {item.size} см × {item.quantity}</span>
              <span>{formatPrice(item.price * item.quantity)}</span>
            </div>
          ))}
          <div className="co-summary-divider" />
          <div className="co-summary-total">
            <span>итого</span>
            <span>{formatPrice(totalPrice)}</span>
          </div>
        </div>

        {error && <div className="co-error">{error}</div>}
      </div>

      {/* Pay button */}
      <div className="checkout-footer">
        <button
          className="price-btn"
          onClick={handlePay}
          disabled={!canSubmit || loading}
          style={{ opacity: !canSubmit ? 0.5 : 1 }}
        >
          {loading ? 'обработка...' : `оплатить ${formatPrice(totalPrice)}`}
        </button>
      </div>

      {/* Payment bottom sheet */}
      <BottomSheet
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        title="способ оплаты"
      >
        <div className="payment-methods">
          {PAYMENT_METHODS.map((method) => (
            <div
              key={method.key}
              className={`payment-method ${selectedPayment === method.key ? 'payment-method--active' : ''}`}
              onClick={() => { setSelectedPayment(method.key); setPaymentMethod(method.key); setShowPayment(false); }}
            >
              <span className="payment-icon">{method.icon}</span>
              <span className="payment-label">{method.label}</span>
              {selectedPayment === method.key && <span className="payment-check">✓</span>}
            </div>
          ))}
        </div>
      </BottomSheet>
    </div>
  );
}
