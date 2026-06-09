import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import ProductCard from '../../components/ProductCard/ProductCard';
import SeriesDropdown from '../../components/SeriesDropdown/SeriesDropdown';
import { useCartStore } from '../../store/cartStore';
import './Home.css';

const CATEGORIES = [
  { key: 'mattresses', label: 'матрасы' },
  { key: 'toppers', label: 'топперы' },
  { key: 'protectors', label: 'наматрасники' },
  { key: 'pillows', label: 'подушки' },
];

export default function Home() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('mattresses');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSeries, setSelectedSeries] = useState('all');
  const totalItems = useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0));
  const openCart = useCartStore((s) => s.openCart);

  useEffect(() => {
    setSelectedSeries('all');
    setLoading(true);
    setError('');
    api.products
      .list(activeCategory)
      .then((data) => { setProducts(data); setLoading(false); })
      .catch(() => { setError('Не удалось загрузить товары'); setLoading(false); });
  }, [activeCategory]);

  const sectionLabel = CATEGORIES.find((c) => c.key === activeCategory)?.label ?? '';

  const seriesList = [...new Set(products.map((p) => p.series).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'ru'));

  const visibleProducts = selectedSeries === 'all'
    ? products
    : products.filter((p) => p.series === selectedSeries);

  return (
    <div className="home-page">
      {/* Sticky header + tabs block */}
      <div className="home-sticky-top">
        <div className="home-header">
          <div className="home-logo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="9" width="20" height="10" rx="2" stroke="white" strokeWidth="1.5" fill="none"/>
              <rect x="4" y="7" width="16" height="4" rx="1" stroke="white" strokeWidth="1.5" fill="none"/>
            </svg>
            <span>matrelax</span>
          </div>
          <div className="home-cart-btn" onClick={openCart}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke="white" strokeWidth="1.5" fill="none"/>
              <line x1="3" y1="6" x2="21" y2="6" stroke="white" strokeWidth="1.5"/>
              <path d="M16 10a4 4 0 01-8 0" stroke="white" strokeWidth="1.5"/>
            </svg>
            {totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
          </div>
        </div>

        <div className="home-tabs hide-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              className={`home-tab ${activeCategory === cat.key ? 'home-tab--active' : ''}`}
              onClick={() => setActiveCategory(cat.key)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {!loading && seriesList.length > 1 && (
          <div className="home-series-filter">
            <SeriesDropdown
              series={seriesList}
              value={selectedSeries}
              onChange={setSelectedSeries}
            />
          </div>
        )}
      </div>

      {/* Hero */}
      <div className="home-hero">
        <div className="home-hero__content">
          <p className="home-hero__tag">сделано в казахстане</p>
          <h1 className="home-hero__title">твой идеальный сон начинается здесь</h1>
          <p className="home-hero__sub">матрасы и подушки от фабрики matrelax</p>
        </div>
      </div>

      {/* Products section */}
      <div className="home-section">
        <div className="home-section__title">{sectionLabel}</div>

        {error ? (
          <div className="home-error">
            <p>{error}</p>
            <button onClick={() => setActiveCategory(activeCategory)}>повторить</button>
          </div>
        ) : (
          <div className="home-scroll-row hide-scrollbar">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="product-card-skeleton skeleton" />
                ))
              : visibleProducts.map((product, i) => (
                  <ProductCard key={product.id} product={product} animIndex={i} />
                ))}
          </div>
        )}
      </div>
    </div>
  );
}
