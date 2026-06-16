import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { useCartStore } from '../../store/cartStore';
import BottomSheet from '../../components/BottomSheet/BottomSheet';
import './ProductDetail.css';

function formatPrice(price) {
  return new Intl.NumberFormat('ru-KZ').format(price) + ' ₸';
}

const FABRIC_COLORS = {
  'Жаккард': '#8b6914',
  'Трикотаж': '#2d5a8e',
  'Velvet': '#6b3a7d',
  'Хлопок': '#4a7c59',
};

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedFabric, setSelectedFabric] = useState(null);
  const [extra10cm, setExtra10cm] = useState(false);
  const [showDesc, setShowDesc] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    api.products.get(id)
      .then((data) => {
        setProduct(data);
        if (data.sizes?.length) setSelectedSize(data.sizes[0]);
        if (data.fabricOptions?.length) setSelectedFabric(data.fabricOptions[0]);
      })
      .catch((err) => setError(err.message || 'Не удалось загрузить товар'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="pd-page">
        <div className="pd-image skeleton" />
        <div className="pd-body">
          <div className="skeleton" style={{ height: 28, borderRadius: 8, marginBottom: 12 }} />
          <div className="skeleton" style={{ height: 16, borderRadius: 8, width: '60%' }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pd-page">
        <div className="pd-body" style={{ padding: 24, textAlign: 'center', color: '#e94560' }}>
          {error}
        </div>
      </div>
    );
  }

  const currentPrice = selectedSize
    ? selectedSize.price + (extra10cm ? product.surcharge10cm : 0)
    : 0;

  const handleAddToCart = () => {
    if (!selectedSize) return;
    addItem({
      productId: product.id,
      name: product.name,
      series: product.series,
      size: `${selectedSize.width}×${selectedSize.height}`,
      fabric: selectedFabric,
      extra10cm,
      price: currentPrice,
    });
    setAdded(true);
    setTimeout(() => { navigate('/'); openCart(); }, 400);
  };

  return (
    <>
      <div className="pd-page page-enter">
        <div className="pd-image">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="pd-image-img" />
          ) : (
            <div className="pd-image-placeholder">
              <svg width="80" height="80" viewBox="0 0 48 48" fill="none">
                <rect x="4" y="18" width="40" height="20" rx="4" stroke="#444" strokeWidth="2" fill="none"/>
                <rect x="8" y="14" width="32" height="6" rx="2" stroke="#444" strokeWidth="2" fill="none"/>
                <line x1="4" y1="38" x2="10" y2="44" stroke="#444" strokeWidth="2" strokeLinecap="round"/>
                <line x1="44" y1="38" x2="38" y2="44" stroke="#444" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
          )}
          <button className="pd-back" onClick={() => navigate(-1)}>←</button>
          <button className="pd-close" onClick={() => navigate('/')}>✕</button>
        </div>

        <BottomSheet isOpen={true} onClose={() => navigate(-1)} noOverlay>
          <div className="pd-series">{product.series}</div>
          <h1 className="pd-name">{product.name}</h1>

          {product.specs && (
            <div className="pd-specs">
              {Object.entries(product.specs).map(([key, val]) => (
                <div key={key} className="pd-spec-tile">
                  <span className="pd-spec-label">
                    {key === 'hardness' ? 'жёсткость' : key === 'height' ? 'высота' : 'гарантия'}
                  </span>
                  <span className="pd-spec-val">{val}</span>
                </div>
              ))}
            </div>
          )}

          <button className="pd-desc-toggle" onClick={() => setShowDesc(!showDesc)}>
            подробнее {showDesc ? '↑' : '↓'}
          </button>
          {showDesc && <p className="pd-desc-long">{product.descriptionLong}</p>}

          <div className="pd-section">
            <div className="pd-section-title">размер</div>
            <div className="pd-sizes hide-scrollbar">
              {product.sizes.map((size) => (
                <button
                  key={`${size.width}x${size.height}`}
                  className={`pd-size-btn ${
                    selectedSize?.width === size.width && selectedSize?.height === size.height
                      ? 'pd-size-btn--active'
                      : ''
                  }`}
                  onClick={() => setSelectedSize(size)}
                >
                  {size.width}×{size.height}
                </button>
              ))}
            </div>
          </div>

          {product.fabricOptions?.length > 0 && (
            <div className="pd-section">
              <div className="pd-section-title">ткань</div>
              <div className="pd-fabrics hide-scrollbar">
                {product.fabricOptions.map((fabric) => (
                  <button
                    key={fabric}
                    className={`pd-fabric-btn ${selectedFabric === fabric ? 'pd-fabric-btn--active' : ''}`}
                    onClick={() => setSelectedFabric(fabric)}
                  >
                    <span className="pd-fabric-dot" style={{ background: FABRIC_COLORS[fabric] || '#555' }} />
                    {fabric}
                  </button>
                ))}
              </div>
            </div>
          )}

          {product.extra10cm && (
            <div className="pd-section">
              <div
                className={`pd-extra-toggle ${extra10cm ? 'pd-extra-toggle--active' : ''}`}
                onClick={() => setExtra10cm(!extra10cm)}
              >
                <div className="pd-extra-left">
                  <span className="pd-extra-label">+ 10 см высота</span>
                  <span className="pd-extra-price">+{formatPrice(product.surcharge10cm)}</span>
                </div>
                <div className={`pd-toggle ${extra10cm ? 'pd-toggle--on' : ''}`} />
              </div>
            </div>
          )}
        </BottomSheet>
      </div>

      <div className="pd-bottom">
        <div className="pd-bottom-size">
          {selectedSize ? `${selectedSize.width}×${selectedSize.height} см` : ''}
        </div>
        <button
          className={`price-btn ${added ? 'price-btn--added' : ''}`}
          onClick={handleAddToCart}
          disabled={!selectedSize}
        >
          {added ? '✓ добавлено' : `добавить в корзину · ${formatPrice(currentPrice)}`}
        </button>
      </div>
    </>
  );
}
