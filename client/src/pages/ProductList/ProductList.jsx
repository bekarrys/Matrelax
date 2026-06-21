import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';
import { formatPrice } from '../../utils/constants';
import {
  Package, Plus, Pencil, Trash2, ChevronRight, Loader2,
} from 'lucide-react';
import './ProductList.css';

function priceRange(sizes = []) {
  const prices = sizes.map((s) => s.price).filter((p) => typeof p === 'number');
  if (prices.length === 0) return '—';
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? formatPrice(min) : `${formatPrice(min)} – ${formatPrice(max)}`;
}

export default function ProductList() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [openSeries, setOpenSeries] = useState(() => new Set());

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    try {
      const data = await api.products.listAll();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSeries = (series) =>
    setOpenSeries((prev) => {
      const next = new Set(prev);
      next.has(series) ? next.delete(series) : next.add(series);
      return next;
    });

  const handleCreate = async () => {
    setCreating(true);
    try {
      const created = await api.products.create({ name: 'Новый товар' });
      navigate(`/products/edit/${created.id}`);
    } catch (err) {
      alert('Ошибка создания: ' + err.message);
      setCreating(false);
    }
  };

  const handleDelete = async (e, product) => {
    e.stopPropagation();
    if (!confirm(`Удалить «${product.name}»? Это действие необратимо.`)) return;
    try {
      await api.products.delete(product.id);
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
    } catch (err) {
      alert('Ошибка удаления: ' + err.message);
    }
  };

  if (loading) {
    return <div className="loading-screen"><Loader2 size={32} className="spin" /></div>;
  }

  // Группировка по серии (данные уже отсортированы бэкендом)
  const groups = products.reduce((acc, p) => {
    const key = p.series || 'Без серии';
    (acc[key] = acc[key] || []).push(p);
    return acc;
  }, {});

  return (
    <div className="product-list-page">
      <div className="page-header">
        <div>
          <h1>Каталог</h1>
          <p className="page-subtitle">{products.length} товаров · {Object.keys(groups).length} серий</p>
        </div>
        <button className="btn-primary" onClick={handleCreate} disabled={creating}>
          {creating ? <Loader2 size={16} className="spin" /> : <Plus size={16} />}
          Создать товар
        </button>
      </div>

      {products.length === 0 ? (
        <div className="empty-state">
          <Package size={48} />
          <p>Каталог пуст</p>
          <button className="btn-primary" onClick={handleCreate} disabled={creating}>
            <Plus size={16} /> Добавить первый товар
          </button>
        </div>
      ) : (
        <div className="pl-series-list">
          {Object.entries(groups).map(([series, items]) => {
            const isOpen = openSeries.has(series);
            const activeCount = items.filter((p) => p.isActive !== false).length;
            return (
              <div key={series} className="pl-series">
                <button className="pl-series-head" onClick={() => toggleSeries(series)}>
                  <ChevronRight size={18} className={`pl-chevron ${isOpen ? 'open' : ''}`} />
                  <span className="pl-series-name">{series}</span>
                  <span className="pl-series-meta">{activeCount}/{items.length} активны</span>
                </button>

                {isOpen && (
                  <div className="pl-products">
                    {items.map((p) => {
                      const inactive = p.isActive === false;
                      return (
                        <div
                          key={p.id}
                          className={`pl-product ${inactive ? 'pl-product--inactive' : ''}`}
                          onClick={() => navigate(`/products/edit/${p.id}`)}
                        >
                          <div className="pl-product-main">
                            <span className="pl-product-name">{p.name}</span>
                            {inactive && <span className="pl-badge">Скрыт</span>}
                          </div>
                          <span className="pl-product-price">{priceRange(p.sizes)}</span>
                          <div className="pl-product-actions">
                            <button
                              className="pl-icon-btn"
                              onClick={(e) => { e.stopPropagation(); navigate(`/products/edit/${p.id}`); }}
                              title="Редактировать"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              className="pl-icon-btn pl-icon-btn--danger"
                              onClick={(e) => handleDelete(e, p)}
                              title="Удалить"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
