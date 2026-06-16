import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../../store/cartStore';
import { api } from '../../api';
import './CartSheet.css';

function formatPrice(price) {
  return new Intl.NumberFormat('ru-KZ').format(price) + ' ₸';
}

function UpsellCard({ product, onAdd }) {
  const minPrice = product.sizes?.length
    ? Math.min(...product.sizes.map((s) => s.price))
    : 0;

  return (
    <div className="cs-upsell-card">
      <div className="cs-upsell-card__img" />
      <div className="cs-upsell-card__body">
        <div className="cs-upsell-card__name">{product.name}</div>
        <div className="cs-upsell-card__footer">
          <span className="cs-upsell-card__price">от {formatPrice(minPrice)}</span>
          <button className="cs-upsell-card__add" onClick={() => onAdd(product)}>+</button>
        </div>
      </div>
    </div>
  );
}

export default function CartSheet() {
  const navigate = useNavigate();
  const { isCartOpen, closeCart, items, addItem, removeItem, updateQuantity } =
    useCartStore();
  const totalPrice = useMemo(() => items.reduce((sum, i) => sum + i.price * i.quantity, 0), [items]);
  const [upsell, setUpsell] = useState([]);

  const SHOP_CATEGORIES = ['mattresses', 'toppers', 'protectors', 'pillows'];

  // Load products when sheet opens, only shop categories
  useEffect(() => {
    if (!isCartOpen) return;
    api.products.list()
      .then((list) => setUpsell(list.filter((p) => SHOP_CATEGORIES.includes(p.category))))
      .catch(() => {});
  }, [isCartOpen]);

  if (!isCartOpen) return null;

  const handleCheckout = () => {
    closeCart();
    navigate('/checkout');
  };

  const handleUpsellAdd = (product) => {
    if (!product.sizes?.length) return;
    const size = product.sizes[0];
    addItem({
      productId: product.id,
      name: product.name,
      series: product.series,
      size: `${size.width}×${size.height}`,
      fabric: product.fabricOptions?.[0] ?? null,
      extra10cm: false,
      price: size.price,
    });
  };

  return (
    <div className="cs-overlay" onClick={closeCart}>
      <div className="cs-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="cs-handle" />
        <div className="cs-header">
          <span className="cs-title">корзина</span>
          <button className="cs-close" onClick={closeCart}>✕</button>
        </div>

        {items.length === 0 ? (
          <>
            <div className="cs-empty">
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke="#444" strokeWidth="1.5" fill="none"/>
                <line x1="3" y1="6" x2="21" y2="6" stroke="#444" strokeWidth="1.5"/>
                <path d="M16 10a4 4 0 01-8 0" stroke="#444" strokeWidth="1.5"/>
              </svg>
              <p>корзина пуста</p>
            </div>
            {/* Show catalog even in empty cart */}
            {upsell.length > 0 && (
              <div className="cs-upsell">
                <div className="cs-upsell__title">добавить к заказу</div>
                <div className="cs-upsell__row hide-scrollbar">
                  {upsell.map((p) => (
                    <UpsellCard key={p.id ?? p.name} product={p} onAdd={handleUpsellAdd} />
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Scrollable body: items + upsell section */}
            <div className="cs-body">
              {items.map((item) => (
                <div key={item.id} className="cs-item">
                  <div className="cs-item__img">
                    <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
                      <rect x="4" y="18" width="40" height="20" rx="4" stroke="#555" strokeWidth="2" fill="none"/>
                      <rect x="8" y="14" width="32" height="6" rx="2" stroke="#555" strokeWidth="2" fill="none"/>
                    </svg>
                  </div>
                  <div className="cs-item__info">
                    <div className="cs-item__name">{item.name}</div>
                    <div className="cs-item__meta">
                      {item.size} см{item.fabric && ` · ${item.fabric}`}{item.extra10cm && ' · +10 см'}
                    </div>
                    <div className="cs-item__price">{formatPrice(item.price)}</div>
                  </div>
                  <div className="cs-item__controls">
                    <div className="cs-qty">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)}>−</button>
                      <span>{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                    </div>
                    <button className="cs-item__remove" onClick={() => removeItem(item.id)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <polyline points="3 6 5 6 21 6" stroke="#e94560" strokeWidth="1.5"/>
                        <path d="M19 6l-1 14H6L5 6" stroke="#e94560" strokeWidth="1.5" fill="none"/>
                        <path d="M10 11v6M14 11v6" stroke="#e94560" strokeWidth="1.5"/>
                        <path d="M9 6V4h6v2" stroke="#e94560" strokeWidth="1.5" fill="none"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}

              {/* "Добавить к заказу" — below cart items, inside scroll */}
              {upsell.length > 0 && (
                <div className="cs-upsell">
                  <div className="cs-upsell__title">добавить к заказу</div>
                  <div className="cs-upsell__row hide-scrollbar">
                    {upsell.map((p) => (
                      <UpsellCard key={p.id ?? p.name} product={p} onAdd={handleUpsellAdd} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Fixed footer */}
            <div className="cs-footer">
              <div className="cs-footer__main">
                <div className="cs-total">
                  <span>итого</span>
                  <span>{formatPrice(totalPrice)}</span>
                </div>
                <button className="price-btn cs-cta" onClick={handleCheckout}>
                  оформить заказ
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
