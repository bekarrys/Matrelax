# Public Series Filter — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Покупатель на витрине может отфильтровать товары выбранной категории по серии через компактный дропдаун, фильтрация — на клиенте, без изменений бэкенда.

**Architecture:** Новый презентационный компонент `SeriesDropdown` (кнопка + выпадающий список, закрытие по клику вне). `Home.jsx` держит состояние выбранной серии, выводит уникальные серии из уже загруженных товаров, фильтрует список в памяти и сбрасывает выбор при смене категории. Бэкенд и публичный API-модуль не меняются.

**Tech Stack:** React 18, react-router, lucide-react, Vite. CSS — обычные `.css`-файлы рядом с компонентом (как везде в проекте).

**Примечание о тестировании:** В проекте нет тест-раннера. Верификация — `npm run build` (компиляция) + Playwright/ручная проверка поведения, как при проверке админ-каталога. Установка юнит-раннера в объём Phase 1 не входит.

---

### Task 1: Компонент SeriesDropdown

**Files:**
- Create: `client/src/components/SeriesDropdown/SeriesDropdown.jsx`
- Create: `client/src/components/SeriesDropdown/SeriesDropdown.css`

- [ ] **Step 1: Создать компонент**

Создать `client/src/components/SeriesDropdown/SeriesDropdown.jsx`:

```jsx
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
```

- [ ] **Step 2: Создать стили**

Создать `client/src/components/SeriesDropdown/SeriesDropdown.css` (тёмная тема витрины):

```css
.series-dropdown {
  position: relative;
  display: inline-block;
}

.series-dropdown__btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 999px;
  padding: 8px 14px;
  font-size: 0.85rem;
  cursor: pointer;
  white-space: nowrap;
}

.series-dropdown__chev { transition: transform 0.15s ease; }
.series-dropdown__chev.open { transform: rotate(180deg); }

.series-dropdown__menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 20;
  min-width: 160px;
  max-height: 260px;
  overflow-y: auto;
  background: #1a1a1f;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  padding: 6px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
}

.series-dropdown__item {
  display: block;
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  color: #ddd;
  padding: 9px 12px;
  border-radius: 8px;
  font-size: 0.85rem;
  cursor: pointer;
}
.series-dropdown__item:hover { background: rgba(255, 255, 255, 0.07); }
.series-dropdown__item.active { background: rgba(255, 255, 255, 0.12); color: #fff; }
```

- [ ] **Step 3: Проверить компиляцию**

Run: `cd client && npm run build`
Expected: `✓ built in ...` без ошибок (Rollup не должен ругаться на импорт/JSX).

- [ ] **Step 4: Commit**

```bash
git add client/src/components/SeriesDropdown/
git commit -m "feat: add SeriesDropdown presentational component"
```

---

### Task 2: Интеграция фильтра в Home

**Files:**
- Modify: `client/src/pages/Home/Home.jsx`

Текущее состояние Home (для ориентира): импорты вверху; состояние `activeCategory`, `products`, `loading`, `error`; `useEffect` грузит товары при смене `activeCategory`; разметка — `home-sticky-top` (логотип + `home-tabs` с кнопками категорий), затем `home-section` со списком `products.map(...)`.

- [ ] **Step 1: Добавить импорт компонента**

Добавить к импортам в начале `client/src/pages/Home/Home.jsx` (после строки импорта ProductCard):

```jsx
import SeriesDropdown from '../../components/SeriesDropdown/SeriesDropdown';
```

- [ ] **Step 2: Добавить состояние выбранной серии**

Рядом с другими `useState` в компоненте `Home` (после `const [error, setError] = useState('');`):

```jsx
const [selectedSeries, setSelectedSeries] = useState('all');
```

- [ ] **Step 3: Сбрасывать серию при смене категории**

В существующем `useEffect`, который грузит товары по `activeCategory`, добавить сброс серии первой строкой тела эффекта (до `setLoading(true)`):

```jsx
setSelectedSeries('all');
```

Так при переключении категории фильтр всегда возвращается в «Все» (серии в категориях разные).

- [ ] **Step 4: Вывести список серий и отфильтрованные товары**

Перед `return (` (после `const sectionLabel = ...`) добавить:

```jsx
const seriesList = [...new Set(products.map((p) => p.series).filter(Boolean))]
  .sort((a, b) => a.localeCompare(b, 'ru'));

const visibleProducts = selectedSeries === 'all'
  ? products
  : products.filter((p) => p.series === selectedSeries);
```

- [ ] **Step 5: Отрендерить дропдаун (только если серий больше одной)**

Внутри `home-sticky-top`, сразу после блока `home-tabs` (закрывающий `</div>` ряда вкладок категорий), добавить:

```jsx
{!loading && seriesList.length > 1 && (
  <div className="home-series-filter">
    <SeriesDropdown
      series={seriesList}
      value={selectedSeries}
      onChange={setSelectedSeries}
    />
  </div>
)}
```

- [ ] **Step 6: Рендерить отфильтрованный список**

В блоке списка товаров заменить итерацию по `products` на `visibleProducts`. Найти:

```jsx
              : products.map((product, i) => (
                  <ProductCard key={product.id} product={product} animIndex={i} />
                ))}
```

Заменить на:

```jsx
              : visibleProducts.map((product, i) => (
                  <ProductCard key={product.id} product={product} animIndex={i} />
                ))}
```

- [ ] **Step 7: Добавить выравнивание фильтра в Home.css**

Добавить в конец `client/src/pages/Home/Home.css`:

```css
.home-series-filter {
  display: flex;
  justify-content: flex-end;
  padding: 8px 16px 4px;
}
```

- [ ] **Step 8: Проверить компиляцию**

Run: `cd client && npm run build`
Expected: `✓ built in ...` без ошибок.

- [ ] **Step 9: Commit**

```bash
git add client/src/pages/Home/Home.jsx client/src/pages/Home/Home.css
git commit -m "feat: filter shop products by series on Home"
```

---

### Task 3: Сквозная проверка поведения (Playwright)

**Files:** нет изменений кода — только верификация.

- [ ] **Step 1: Запустить дев-серверы**

Запустить в фоне из корня проекта:
```
npm run dev:server
npm run dev:client
```
Дождаться `http://localhost:3001` (бэк) и `http://localhost:5173` (фронт).

- [ ] **Step 2: Проверить дефолт и наличие дропдауна**

Через Playwright: `browser_navigate` на `http://localhost:5173/`, затем `browser_snapshot`.
Expected: на вкладке «матрасы» виден фильтр «Серия ▾» (т.к. у матрасов несколько серий: Royal, LUX, Elite, …); показаны все товары категории.

- [ ] **Step 3: Проверить фильтрацию по серии**

Через Playwright: кликнуть «Серия ▾», выбрать `LUX`, снять `browser_snapshot`.
Expected: в списке только товары серии LUX (L1, L2); кнопка дропдауна показывает «LUX»; 0 ошибок в консоли (`browser_console_messages level=error`).

- [ ] **Step 4: Проверить сброс при смене категории**

Через Playwright: кликнуть вкладку «подушки» (или другую категорию), снять `browser_snapshot`.
Expected: фильтр серии сброшен в «Серия» (`all`), показаны все товары новой категории.

- [ ] **Step 5: Проверить скрытие дропдауна для категории с ≤1 серией**

Через Playwright: переключиться на категорию, где одна серия (например «наматрасники»/`protectors`, если там одна серия), снять `browser_snapshot`.
Expected: фильтр «Серия ▾» НЕ отображается.
(Если во всех непустых категориях >1 серии — зафиксировать это как наблюдение; поведение скрытия всё равно проверено логикой `seriesList.length > 1`.)

- [ ] **Step 6: Остановить дев-серверы и закрыть браузер**

Остановить фоновые задачи серверов; `browser_close`.

- [ ] **Step 7: Commit (если потребовались правки по итогам проверки)**

Если шаги выявили баги и код менялся:
```bash
git add -A
git commit -m "fix: address series filter issues found in verification"
```
Если правок не было — коммит не нужен.

---

## Готово
После Task 3 Phase 1 завершена. Phase 2 (аналитика по товарам) — отдельный цикл брейншторма (начиная с риска `modelId`), затем свой план.
