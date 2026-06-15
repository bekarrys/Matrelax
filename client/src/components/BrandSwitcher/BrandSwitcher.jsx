import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShoppingBag, Package } from 'lucide-react';
import './BrandSwitcher.css';

// Пути публичной витрины — по ним определяем текущий контекст.
const STOREFRONT_PATHS = ['/shop', '/product', '/checkout', '/order'];

/**
 * BrandSwitcher — логотип «matrelax» как переключатель контекста
 * Магазин ⇄ Заказы (адаптация 21st BinaryContextSwitcher под React Router
 * и тёмную дизайн-систему проекта; без framer-motion/shadcn).
 */
export default function BrandSwitcher() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const inStorefront = STOREFRONT_PATHS.some((p) => pathname.startsWith(p));
  const target = inStorefront ? '/orders' : '/shop';
  const Icon = inStorefront ? ShoppingBag : Package;
  const sub = inStorefront ? 'Магазин' : 'Заказы';

  return (
    <button
      type="button"
      className="brand-switcher"
      onClick={() => navigate(target)}
      title={inStorefront ? 'Переключиться на заказы' : 'Переключиться на магазин'}
      aria-label={inStorefront ? 'Открыть управление заказами' : 'Открыть магазин'}
    >
      {/* key меняется при смене контекста → перезапуск анимации иконки */}
      <span className="brand-switcher__icon" key={inStorefront ? 'store' : 'orders'}>
        <Icon size={18} strokeWidth={2} />
      </span>
      <span className="brand-switcher__text">
        <span className="brand-switcher__name">matrelax</span>
        <span className="brand-switcher__sub">{sub}</span>
      </span>
    </button>
  );
}
