import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../../store/cartStore';
import BottomSheet from '../../components/BottomSheet/BottomSheet';
import { PAYMENT_METHODS } from './paymentMethods';
import './Cart.css';

function formatPrice(price) {
  return new Intl.NumberFormat('ru-KZ').format(price) + ' ₸';
}

export default function Cart() {
  const navigate = useNavigate();
  const { items, removeItem, updateQuantity, paymentMethod, setPaymentMethod } = useCartStore();
  const totalPrice = useMemo(() => items.reduce((sum, i) => sum + i.price * i.quantity, 0), [items]);

  const [showPayment, setShowPayment] = useState(false);

  return (
    <>
      {/* Animated page wrapper — position:fixed children must NOT live here */}
      <div className="cart-page page-enter">
        <div className="cart-header">
          <button className="cart-back" onClick={() => navigate(-1)}>←</button>
          <h1 className="cart-title">корзина</h1>
          <div style={{ width: 40 }} />
        </div>

        {items.length === 0 ? (
          <div className="cart-empty">
            <div className="cart-empty-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke="#444" strokeWidth="1.5" fill="none"/>
                <line x1="3" y1="6" x2="21" y2="6" stroke="#444" strokeWidth="1.5"/>
                <path d="M16 10a4 4 0 01-8 0" stroke="#444" strokeWidth="1.5"/>
              </svg>
            </div>
            <p>корзина пуста</p>
            <button className="btn-primary" onClick={() => navigate('/')}>выбрать товар</button>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {items.map((item) => (
                <div key={item.id} className="cart-item">
                  <div className="cart-item__image">
                    <svg width="32" height="32" viewBox="0 0 48 48" fill="none">
                      <rect x="4" y="18" width="40" height="20" rx="4" stroke="#555" strokeWidth="2" fill="none"/>
                      <rect x="8" y="14" width="32" height="6" rx="2" stroke="#555" strokeWidth="2" fill="none"/>
                    </svg>
                  </div>
                  <div className="cart-item__info">
                    <div className="cart-item__name">{item.name}</div>
                    <div className="cart-item__meta">
                      {item.size} см
                      {item.fabric && ` · ${item.fabric}`}
                      {item.extra10cm && ' · +10 см'}
                    </div>
                    <div className="cart-item__price">{formatPrice(item.price)}</div>
                  </div>
                  <div className="cart-item__controls">
                    <div className="qty-ctrl">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)}>−</button>
                      <span>{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                    </div>
                    <button className="cart-item__remove" onClick={() => removeItem(item.id)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <polyline points="3 6 5 6 21 6" stroke="#e94560" strokeWidth="1.5"/>
                        <path d="M19 6l-1 14H6L5 6" stroke="#e94560" strokeWidth="1.5" fill="none"/>
                        <path d="M10 11v6M14 11v6" stroke="#e94560" strokeWidth="1.5"/>
                        <path d="M9 6V4h6v2" stroke="#e94560" strokeWidth="1.5" fill="none"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {/* Spacer so items don't hide behind the fixed bar */}
            <div className="cart-bottom-spacer" />
          </>
        )}
      </div>

      {/* Fixed bottom bar — lives OUTSIDE the transformed parent so position:fixed hits viewport */}
      {items.length > 0 && (
        <>
          <div className="cart-fixed-bottom">
            <div className="cart-fixed-bottom__payment">
              <button
                className="cart-payment-select"
                onClick={() => setShowPayment(true)}
              >
                <span>
                  {paymentMethod
                    ? PAYMENT_METHODS.find((m) => m.key === paymentMethod)?.label
                    : 'способ оплаты'}
                </span>
                <span className="cart-chevron">›</span>
              </button>
            </div>

            <div className="cart-fixed-bottom__main">
              <div className="cart-fixed-bottom__total">
                <span>итого</span>
                <span>{formatPrice(totalPrice)}</span>
              </div>
              <button
                className="cart-fixed-bottom__cta price-btn"
                onClick={() => navigate('/checkout')}
              >
                оформить заказ
              </button>
            </div>
          </div>

          <BottomSheet
            isOpen={showPayment}
            onClose={() => setShowPayment(false)}
            title="способ оплаты"
          >
            <div className="payment-methods">
              {PAYMENT_METHODS.map((method) => (
                <div
                  key={method.key}
                  className={`payment-method ${paymentMethod === method.key ? 'payment-method--active' : ''}`}
                  onClick={() => {
                    setPaymentMethod(method.key);
                    setShowPayment(false);
                  }}
                >
                  <span className="payment-icon">{method.icon}</span>
                  <span className="payment-label">{method.label}</span>
                  {paymentMethod === method.key && <span className="payment-check">✓</span>}
                </div>
              ))}
            </div>
          </BottomSheet>
        </>
      )}
    </>
  );
}
