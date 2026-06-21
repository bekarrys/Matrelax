import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';
import { ArrowLeft, Save, Plus, Trash2, Loader2 } from 'lucide-react';
import { getPrice, getMarketPrice, priceMatrixIssues, sizeKey } from '../../utils/pricing';
import './ProductEditor.css';

const EMPTY_SIZE = { width: '', height: 200 };
const MARKET_MARKUP = 7000;

export default function ProductEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [priceTab, setPriceTab] = useState('prices'); // 'prices' | 'marketPrices'

  useEffect(() => {
    api.products.get(id)
      .then(setProduct)
      .catch((e) => setError(e.message || 'Не удалось загрузить товар'))
      .finally(() => setLoading(false));
  }, [id]);

  // ── helpers ────────────────────────────────────────────────
  const set = (fields) => setProduct((p) => ({ ...p, ...fields }));
  const setSpec = (key, value) =>
    setProduct((p) => ({ ...p, specs: { ...(p.specs || {}), [key]: value } }));

  const setSize = (idx, field, value) =>
    setProduct((p) => {
      const sizes = [...(p.sizes || [])];
      sizes[idx] = { ...sizes[idx], [field]: field === 'width' || field === 'height' || field === 'price' ? Number(value) : value };
      return { ...p, sizes };
    });
  const addSize = () => setProduct((p) => ({ ...p, sizes: [...(p.sizes || []), { ...EMPTY_SIZE }] }));
  const removeSize = (idx) =>
    setProduct((p) => ({ ...p, sizes: (p.sizes || []).filter((_, i) => i !== idx) }));

  // Ячейка матрицы field[ткань][размер] (field = 'prices' | 'marketPrices')
  const setCell = (field, fabric, key, value) =>
    setProduct((p) => ({
      ...p,
      [field]: {
        ...(p[field] || {}),
        [fabric]: { ...((p[field] || {})[fabric] || {}), [key]: Number(value) },
      },
    }));

  // Автозаполнение: Рыночная = Реальная + 7000 по каждой ячейке.
  const autofillMarket = () =>
    setProduct((p) => {
      const market = {};
      for (const fabric of p.fabricOptions || []) {
        market[fabric] = {};
        for (const s of p.sizes || []) {
          const key = `${s.width}x${s.height}`;
          const sale = p.prices?.[fabric]?.[key];
          if (typeof sale === 'number' && sale > 0) market[fabric][key] = sale + MARKET_MARKUP;
        }
      }
      return { ...p, marketPrices: market };
    });

  const handleSave = async () => {
    if (!product.name?.trim()) {
      setError('Название товара обязательно');
      return;
    }
    if (product.isActive !== false) {
      const saleBad = priceMatrixIssues(product, 'prices').length;
      const marketBad = priceMatrixIssues(product, 'marketPrices').length;
      if (saleBad || marketBad) {
        setError('Заполните обе таблицы цен (продажи и рыночные) перед сохранением активного товара');
        return;
      }
    }
    setSaving(true);
    setError('');
    try {
      await api.products.update(id, product);
      navigate(-1);
    } catch (e) {
      setError(e.message || 'Ошибка сохранения (проверь права или сеть)');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading-screen"><Loader2 size={32} className="spin" /></div>;
  }
  if (!product) {
    return (
      <div className="product-editor">
        <button className="btn-back" onClick={() => navigate(-1)}><ArrowLeft size={18} /> Назад</button>
        <p className="pe-error">{error || 'Товар не найден'}</p>
      </div>
    );
  }

  const cellValue = (fabric, key) =>
    priceTab === 'marketPrices' ? getMarketPrice(product, fabric, key) : getPrice(product, fabric, key);
  const issues = priceMatrixIssues(product, priceTab);
  const saleIssuesCount = priceMatrixIssues(product, 'prices').length;
  const marketIssuesCount = priceMatrixIssues(product, 'marketPrices').length;

  return (
    <div className="product-editor">
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} /> Назад
        </button>
        <div className="page-header-info">
          <h1>{product.name || 'Без названия'}</h1>
          <span className="pe-id">ID: {product.id}</span>
        </div>
        <div className="page-actions">
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
            Сохранить
          </button>
        </div>
      </div>

      {error && <div className="pe-error">{error}</div>}

      {/* Основное */}
      <div className="pe-card">
        <h3>Основное</h3>
        <div className="pe-grid">
          <Field label="Название">
            <input value={product.name || ''} onChange={(e) => set({ name: e.target.value })} />
          </Field>
          <Field label="Серия">
            <input value={product.series || ''} onChange={(e) => set({ series: e.target.value })} />
          </Field>
          <Field label="Категория">
            <input value={product.category || ''} onChange={(e) => set({ category: e.target.value })} placeholder="mattresses" />
          </Field>
        </div>
        <Field label="Описание">
          <textarea
            rows={4}
            value={product.descriptionLong || ''}
            onChange={(e) => set({ descriptionLong: e.target.value })}
          />
        </Field>
        <Field label="Статус">
          <label className="pe-checkbox">
            <input
              type="checkbox"
              checked={product.isActive !== false}
              onChange={(e) => set({ isActive: e.target.checked })}
            />
            <span>Активен (виден в магазине и прайсе)</span>
          </label>
        </Field>
      </div>

      {/* Характеристики */}
      <div className="pe-card">
        <h3>Характеристики</h3>
        <div className="pe-grid">
          <Field label="Жёсткость">
            <input value={product.specs?.hardness || ''} onChange={(e) => setSpec('hardness', e.target.value)} />
          </Field>
          <Field label="Высота">
            <input value={product.specs?.height || ''} onChange={(e) => setSpec('height', e.target.value)} />
          </Field>
          <Field label="Гарантия">
            <input value={product.specs?.warranty || ''} onChange={(e) => setSpec('warranty', e.target.value)} />
          </Field>
        </div>
        <div className="pe-grid">
          <Field label="Ткани (через запятую)">
            <input
              value={(product.fabricOptions || []).join(', ')}
              onChange={(e) => set({ fabricOptions: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
              placeholder="Жаккард, Трикотаж, Velvet"
            />
          </Field>
          <Field label="Доплата за +10см (KZT)">
            <input type="number" value={product.surcharge10cm ?? ''} onChange={(e) => set({ surcharge10cm: Number(e.target.value) })} />
          </Field>
          <Field label="Опция +10см">
            <label className="pe-checkbox">
              <input type="checkbox" checked={!!product.extra10cm} onChange={(e) => set({ extra10cm: e.target.checked })} />
              <span>Доступна</span>
            </label>
          </Field>
        </div>
      </div>

      {/* Размеры */}
      <div className="pe-card">
        <div className="pe-card-head">
          <h3>Размеры</h3>
          <button className="btn-secondary btn-sm" onClick={addSize}>
            <Plus size={14} /> Добавить размер
          </button>
        </div>
        {(product.sizes || []).length === 0 && <p className="pe-muted">Размеры не заданы</p>}
        {(product.sizes || []).map((size, idx) => (
          <div key={idx} className="pe-size-row">
            <Field label="Ширина">
              <input type="number" value={size.width} onChange={(e) => setSize(idx, 'width', e.target.value)} />
            </Field>
            <Field label="Длина">
              <input type="number" value={size.height} onChange={(e) => setSize(idx, 'height', e.target.value)} />
            </Field>
            <button className="btn-icon-danger" onClick={() => removeSize(idx)} title="Удалить размер">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      {/* Цены: вкладки «Цены продажи» / «Рыночные цены» */}
      <div className="pe-card">
        <div className="pe-card-head">
          <h3>Цены (ткань × размер)</h3>
          {priceTab === 'marketPrices' && (
            <button className="btn-secondary btn-sm" onClick={autofillMarket} title="Скопировать цены продажи + 7000">
              Рыночная = Реальная + 7000
            </button>
          )}
        </div>

        <div className="pe-tabs">
          <button
            className={`pe-tab ${priceTab === 'prices' ? 'pe-tab--active' : ''}`}
            onClick={() => setPriceTab('prices')}
          >
            Цены продажи{saleIssuesCount > 0 ? ` (${saleIssuesCount})` : ''}
          </button>
          <button
            className={`pe-tab ${priceTab === 'marketPrices' ? 'pe-tab--active' : ''}`}
            onClick={() => setPriceTab('marketPrices')}
          >
            Рыночные цены{marketIssuesCount > 0 ? ` (${marketIssuesCount})` : ''}
          </button>
        </div>

        {(product.fabricOptions || []).length === 0 && <p className="pe-muted">Сначала задайте ткани выше</p>}
        {(product.sizes || []).length === 0 && <p className="pe-muted">Сначала задайте размеры</p>}
        {(product.fabricOptions || []).length > 0 && (product.sizes || []).length > 0 && (
          <div className="pe-grid-scroll">
            <table className="pe-price-grid">
              <thead>
                <tr>
                  <th>Ткань \ Размер</th>
                  {(product.sizes || []).map((s) => (
                    <th key={`${s.width}x${s.height}`}>{s.width}×{s.height}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(product.fabricOptions || []).map((fabric) => (
                  <tr key={fabric}>
                    <td className="pe-grid-rowlabel">{fabric}</td>
                    {(product.sizes || []).map((s) => {
                      const key = sizeKey(s.width, s.height);
                      const bad = issues.some((i) => i.fabric === fabric && i.size === key);
                      return (
                        <td key={key}>
                          <input
                            type="number"
                            className={bad ? 'pe-cell-bad' : ''}
                            value={cellValue(fabric, key) || ''}
                            onChange={(e) => setCell(priceTab, fabric, key, e.target.value)}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {issues.length > 0 && (
          <p className="pe-error">
            {priceTab === 'marketPrices' ? 'Рыночные цены' : 'Цены продажи'}: заполните все ячейки
            ({issues.length} пустых) — товар нельзя сохранить активным.
          </p>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="pe-field">
      <label>{label}</label>
      {children}
    </div>
  );
}
