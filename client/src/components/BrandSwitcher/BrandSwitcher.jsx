import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShoppingBag, Package } from 'lucide-react';
import './BrandSwitcher.css';

// Пути публичной витрины — по ним определяем текущий контекст.
const STOREFRONT_PATHS = ['/product', '/checkout'];

/**
 * BrandSwitcher — логотип «matrelax» как переключатель контекста
 * Магазин ⇄ Заказы (адаптация 21st BinaryContextSwitcher под React Router
 * и тёмную дизайн-систему проекта; без framer-motion/shadcn).
 */
export default function BrandSwitcher() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const inStorefront = pathname === '/' || STOREFRONT_PATHS.some((p) => pathname.startsWith(p));
  const target = inStorefront ? '/orders' : '/';
  const Icon = inStorefront ? ShoppingBag : Package;
  const sub = inStorefront ? 'Магазин' : 'Заказы';
  const tooltip = inStorefront ? 'История заказов →' : 'Витрина →';

  return (
    <button
      type="button"
      className="brand-switcher"
      onClick={() => navigate(target)}
      aria-label={inStorefront ? 'Открыть историю заказов' : 'Открыть витрину'}
    >
      {/* key меняется при смене контекста → перезапуск анимации иконки */}
      <span className="brand-switcher__icon" key={inStorefront ? 'store' : 'orders'}>
        <Icon size={18} strokeWidth={2} />
      </span>
      <span className="brand-switcher__text">
        <span className="brand-switcher__name">matrelax</span>
        <span className="brand-switcher__sub">{sub}</span>
      </span>
      {/* Подсказка-тултип при наведении (адаптация SocialTooltip) */}
      <span className="brand-switcher__tooltip">{tooltip}</span>
    </button>
  );
}
