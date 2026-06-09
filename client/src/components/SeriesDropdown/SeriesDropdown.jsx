import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import './SeriesDropdown.css';

/**
 * Презентационный дропдаун выбора серии.
 * Не знает о товарах: получает список серий и текущее значение через props.
 *
 * @param {string[]} series   уникальные названия серий
 * @param {string}   value    выбранная серия или 'all' (= «Все»)
 * @param {(v:string)=>void} onChange
 */
export default function SeriesDropdown({ series, value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const label = value === 'all' ? 'Серия' : value;
  const select = (v) => { onChange(v); setOpen(false); };

  return (
    <div className="series-dropdown" ref={ref}>
      <button
        type="button"
        className="series-dropdown__btn"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {label}
        <ChevronDown size={14} className={`series-dropdown__chev ${open ? 'open' : ''}`} />
      </button>
      {open && (
        <div className="series-dropdown__menu" role="listbox">
          <button
            type="button"
            className={`series-dropdown__item ${value === 'all' ? 'active' : ''}`}
            onClick={() => select('all')}
          >
            Все
          </button>
          {series.map((s) => (
            <button
              key={s}
              type="button"
              className={`series-dropdown__item ${value === s ? 'active' : ''}`}
              onClick={() => select(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
