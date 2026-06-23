import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { useCartStore } from '../../store/cartStore';
import BottomSheet from '../../components/BottomSheet/BottomSheet';
import { getPrice, getMarketPrice, sizeKey, resolveSizeKey } from '../../utils/pricing';
import './ProductDetail.css';

const SPEC_LABELS = {
  type: 'тип', firmness: 'жёсткость', hardness: 'жёсткость',
  height: 'высота', load: 'нагрузка', warranty: 'гарантия', serviceLife: 'срок службы',
};

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
  const [customW, setCustomW] = useState('');
  const [customH, setCustomH] = useState('');
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
        if (data.sizes?.length) {
          setSelectedSize(data.sizes[0]);
          setCustomW(String(data.sizes[0].width));
          setCustomH(String(data.sizes[0].height));
        }
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

  // Размер из полей «свой размер» (fallback — выбранный пресет).
  const reqW = parseInt(customW, 10) || selectedSize?.width || 0;
  const reqH = parseInt(customH, 10) || selectedSize?.height || 0;
  // Цена считается по ближайшему стандарту (ширина округляется вверх) — как на сервере.
  const resolvedKey = selectedFabric && reqW && reqH
    ? resolveSizeKey(product, selectedFabric, reqW, reqH) : null;
  const basePrice = resolvedKey ? getPrice(product, selectedFabric, resolvedKey) : 0;
  const currentPrice = basePrice + (extra10cm && basePrice ? product.surcharge10cm : 0);

  const marketBase = resolvedKey ? getMarketPrice(product, selectedFabric, resolvedKey) : 0;
  const marketPrice = marketBase
    ? marketBase + (extra10cm ? product.surcharge10cm : 0)
    : null;

  // Подсказка показывается, когда введённый размер не совпал со стандартом.
  const resolvedW = resolvedKey ? parseInt(resolvedKey, 10) : null;
  const priceRounded = resolvedKey && resolvedKey !== sizeKey(reqW, reqH);

  const stepW = (d) => setCustomW(String(Math.max(1, (parseInt(customW, 10) || 0) + d)));
  const stepH = (d) => setCustomH(String(Math.max(1, (parseInt(customH, 10) || 0) + d)));

  const handleAddToCart = () => {
    if (!currentPrice) return;
    addItem({
      productId: product.id,
      name: product.name,
      series: product.series,
      image: product.imageUrl || '',
      size: `${reqW}×${reqH}`,   // реальный размер для цеха; цена — по стандарту
      fabric: selectedFabric,
      extra10cm,
      price: currentPrice,
      marketPrice,
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
              {Object.entries(product.specs).map(([specKey, val]) => (
                <div key={specKey} className="pd-spec-tile">
                  <span className="pd-spec-label">{SPEC_LABELS[specKey] || specKey}</span>
                  <span className="pd-spec-val">{val}</span>
                </div>
              ))}
            </div>
          )}

          <button className="pd-desc-toggle" onClick={() => setShowDesc(!showDesc)}>
            подробнее {showDesc ? '↑' : '↓'}
          </button>
          {showDesc && <p className="pd-desc-long">{product.descriptionLong}</p>}
          {showDesc && product.composition?.length > 0 && (
            <ul className="pd-composition">
              {product.composition.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          )}

          <div className="pd-section">
            <div className="pd-section-title">размер</div>
            <div className="pd-sizes hide-scrollbar">
              {product.sizes.map((size) => (
                <button
                  key={`${size.width}x${size.height}`}
                  className={`pd-size-btn ${
                    reqW === size.width && reqH === size.height
                      ? 'pd-size-btn--active'
                      : ''
                  }`}
                  onClick={() => { setSelectedSize(size); setCustomW(String(size.width)); setCustomH(String(size.height)); }}
                >
                  {size.width}×{size.height}
                </button>
              ))}
            </div>
          </div>

          <div className="pd-section">
            <div className="pd-section-title">свой размер (см)</div>
            <div className="pd-custom-size">
              <div className="pd-stepper">
                <button type="button" className="pd-step-btn" onClick={() => stepW(-10)} aria-label="ширина −10">−</button>
                <input
                  type="number" inputMode="numeric" min="1"
                  value={customW}
                  onChange={(e) => setCustomW(e.target.value)}
                  aria-label="ширина"
                />
                <button type="button" className="pd-step-btn" onClick={() => stepW(10)} aria-label="ширина +10">+</button>
              </div>
              <span className="pd-custom-x">×</span>
              <div className="pd-stepper">
                <button type="button" className="pd-step-btn" onClick={() => stepH(-10)} aria-label="длина −10">−</button>
                <input
                  type="number" inputMode="numeric" min="1"
                  value={customH}
                  onChange={(e) => setCustomH(e.target.value)}
                  aria-label="длина"
                />
                <button type="button" className="pd-step-btn" onClick={() => stepH(10)} aria-label="длина +10">+</button>
              </div>
            </div>
            {priceRounded && (
              <p className="pd-size-hint">Цена рассчитана по ближайшему стандартному размеру: {resolvedW} см</p>
            )}
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
          {reqW && reqH ? `${reqW}×${reqH} см` : ''}
        </div>
        <button
          className={`price-btn ${added ? 'price-btn--added' : ''}`}
          onClick={handleAddToCart}
          disabled={!currentPrice}
        >
          {added ? '✓ добавлено' : `добавить в корзину · ${formatPrice(currentPrice)}`}
        </button>
      </div>
    </>
  );
}
