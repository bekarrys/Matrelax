import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getMinPrice } from '../../utils/pricing';
import './ProductCard.css';

function formatPrice(price) {
  return new Intl.NumberFormat('ru-KZ').format(price) + ' ₸';
}

export default function ProductCard({ product, index }) {
  const navigate = useNavigate();
  const minPrice = getMinPrice(product);

  return (
    <div
      className="product-card"
      style={{ '--i': index ?? 0 }}
      onClick={() => navigate(`/product/${product.id}`)}
    >
      <div className="product-card__image">
        {product.imageUrl
          ? <img src={product.imageUrl} alt={product.name} className="product-card__img" loading="lazy" />
          : <BedIcon />}
      </div>
      <div className="product-card__body">
        <div className="product-card__name">{product.name}</div>
        <div className="product-card__footer">
          <span className="product-card__price">от {formatPrice(minPrice)}</span>
          <span className="product-card__chevron">›</span>
        </div>
      </div>
    </div>
  );
}

function BedIcon() {
  return (
    <svg width="52" height="52" viewBox="0 0 48 48" fill="none">
      <rect x="4" y="18" width="40" height="20" rx="4" stroke="#444" strokeWidth="2" fill="none"/>
      <rect x="8" y="14" width="32" height="6" rx="2" stroke="#444" strokeWidth="2" fill="none"/>
      <line x1="4" y1="38" x2="10" y2="44" stroke="#444" strokeWidth="2" strokeLinecap="round"/>
      <line x1="44" y1="38" x2="38" y2="44" stroke="#444" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}
