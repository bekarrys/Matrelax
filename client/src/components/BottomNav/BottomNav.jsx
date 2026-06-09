import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCartStore } from '../../store/cartStore';
import './BottomNav.css';

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const totalItems = useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0));

  return (
    <nav className="bottom-nav">
      <button
        className={`bn-item ${pathname === '/' ? 'bn-item--active' : ''}`}
        onClick={() => navigate('/')}
      >
        <CatalogIcon active={pathname === '/'} />
        <span>каталог</span>
      </button>

      <button
        className={`bn-item ${pathname === '/cart' ? 'bn-item--active' : ''}`}
        onClick={() => navigate('/cart')}
      >
        <div className="bn-cart-wrap">
          <CartIcon active={pathname === '/cart'} />
          {totalItems > 0 && <span className="bn-badge">{totalItems}</span>}
        </div>
        <span>корзина</span>
      </button>
    </nav>
  );
}

function CatalogIcon({ active }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="7" height="7" rx="1.5"
        stroke={active ? 'white' : '#666'} strokeWidth="1.5"
        fill={active ? 'white' : 'none'} fillOpacity={active ? 0.15 : 0}
      />
      <rect x="14" y="3" width="7" height="7" rx="1.5"
        stroke={active ? 'white' : '#666'} strokeWidth="1.5"
        fill={active ? 'white' : 'none'} fillOpacity={active ? 0.15 : 0}
      />
      <rect x="3" y="14" width="7" height="7" rx="1.5"
        stroke={active ? 'white' : '#666'} strokeWidth="1.5"
        fill={active ? 'white' : 'none'} fillOpacity={active ? 0.15 : 0}
      />
      <rect x="14" y="14" width="7" height="7" rx="1.5"
        stroke={active ? 'white' : '#666'} strokeWidth="1.5"
        fill={active ? 'white' : 'none'} fillOpacity={active ? 0.15 : 0}
      />
    </svg>
  );
}

function CartIcon({ active }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"
        stroke={active ? 'white' : '#666'} strokeWidth="1.5" fill="none"
      />
      <line x1="3" y1="6" x2="21" y2="6"
        stroke={active ? 'white' : '#666'} strokeWidth="1.5"
      />
      <path d="M16 10a4 4 0 01-8 0"
        stroke={active ? 'white' : '#666'} strokeWidth="1.5"
      />
    </svg>
  );
}
