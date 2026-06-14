# Premium Dark Design System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Поднять тёмную тему MATRELAX до «премиум»: слои поверхностей, благородный индиго-акцент + золотой нюанс, тени-свечения, hover-глубина, выраженный бренд — на обеих поверхностях (витрина + панель).

**Architecture:** Центр тяжести — CSS-токены в `client/src/styles/globals.css`. Большинство компонентов уже ссылаются на `var(--…)`, поэтому правка токенов даёт каскадный эффект. Далее — точечная глубина в ключевых компонентах и реконсиляция захардкоженных/светлых стилей в токены.

**Tech Stack:** React 18 + Vite, обычный CSS (по файлу на компонент), Tailwind (utilities, preflight off), шрифт Golos Text. Без новых зависимостей. Источник истины — спека `docs/superpowers/specs/2026-06-15-premium-dark-design-system.md`.

---

## Предпосылки и заметки по верификации

- Фронтенд-тестов нет (по решению спеки) — верификация **визуальная**.
- Перед задачами визуальной проверки должен быть запущен dev-сервер: `npm run dev`
  (клиент на http://localhost:3000). Если товары не грузятся (нет бэка/данных) —
  это нормально; проверяем сам визуальный слой (фон, карточки-скелетоны, hero,
  кнопки, бренд), а скриншоты делаем доступных страниц.
- Смоук-проверка сборки CSS: `npm run build` (из корня) должен завершаться без ошибок.
- Скриншоты — через Playwright MCP (`browser_navigate` → `browser_take_screenshot`).
- Коммитим после каждой задачи.

## Карта файлов

- `client/src/styles/globals.css` — **источник токенов** + общие `.btn-*`, skeleton,
  keyframes. Правится в задачах 1, 2.
- `client/src/components/ProductCard/ProductCard.css` — карточка товара (задача 3).
- `client/src/pages/Home/Home.css` — hero, табы, корзина, skeleton-размер (задача 4).
- `client/src/components/Layout/Layout.css` — sidebar/мобильная шапка, бренд (задача 5).
- Захардкоженные цвета в тёмных компонентах: `Executor.css`, `BottomNav.css`,
  `SeriesDropdown.css`, `OrderDetails.css`, `CreateOrder.css`, `OrderStatus.css`,
  `ProductDetail.css`, `Login.css` (задача 6).
- Светлые админ-страницы: `ProductList.css`, `ProductEditor.css` (задача 7).
- Финальная сверка обеих поверхностей (задача 8).

---

## Task 1: Обновить ядро токенов (палитра, акцент, золото, тени)

**Files:**
- Modify: `client/src/styles/globals.css:1-65` (блок `:root`)

- [ ] **Step 1: Заменить core-палитру в `:root`**

Заменить строки токенов в начале `:root` (текущие значения `--bg … --transition-base`).
Найти и заменить блок «Core palette» (строки ~3-19) на:

```css
  /* ── Core palette (Premium Dark) ── */
  --bg: #0B0B0E;
  --surface: #141418;
  --surface-2: #1C1C22;
  --surface-3: #26262E;
  --text-primary: #F4F4F5;
  --text-secondary: #9A9AA2;
  --text-tertiary: #5C5C66;
  --accent: #6D6BF6;
  --accent-hover: #5A57F2;
  --accent-red: #e94560;
  --accent-glow: rgba(109,107,246,0.35);
  --accent-tint: rgba(109,107,246,0.12);
  --gold: #D4B483;
  --gold-tint: rgba(212,180,131,0.12);
  --border: rgba(255, 255, 255, 0.07);
  --border-strong: rgba(255, 255, 255, 0.14);
  --radius: 16px;
  --radius-sm: 10px;
  --radius-lg: 24px;
  --radius-full: 999px;
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --safe-top: env(safe-area-inset-top, 0px);
```

- [ ] **Step 2: Синхронизировать алиасы «Admin panel» и тени**

В блоке «Admin panel design system» (строки ~22-32) заменить значения, чтобы
панель совпадала с новой палитрой:

```css
  --bg-primary:   #0B0B0E;
  --bg-secondary: #111114;
  --bg-card:      #141418;
  --bg-card-hover:#1C1C22;
  --bg-overlay:   rgba(0, 0, 0, 0.75);
  --border-color: rgba(255, 255, 255, 0.07);
  --border-color-light: rgba(255, 255, 255, 0.14);
  --text-muted:   #5C5C66;
  --primary-light: #9A98FA;
  --primary-bg:   rgba(109, 107, 246, 0.14);
```

В блоке «Shadows» (строки ~54-56) заменить на тёплую глубину + свечение:

```css
  --shadow-sm: 0 2px 12px rgba(0,0,0,0.45);
  --shadow-md: 0 8px 32px rgba(0,0,0,0.55);
  --shadow-glow: 0 4px 24px var(--accent-glow);
```

- [ ] **Step 3: Обновить цвет skeleton под новую поверхность**

Заменить `@keyframes skeleton-pulse` (строки ~120-124):

```css
@keyframes skeleton-pulse {
  0%   { background-color: #16161B; }
  50%  { background-color: #20202733; }
  100% { background-color: #16161B; }
}
```
(второй стоп — `#202027` с альфой через 8-значный hex; если не поддерживается —
использовать `#202027`).

- [ ] **Step 4: Смоук-сборка**

Run: `npm run build`
Expected: сборка завершается без ошибок (`client/dist` обновлён).

- [ ] **Step 5: Визуальная проверка фона/слоёв**

Запустить `npm run dev` (если не запущен). Через Playwright:
`browser_navigate` → `http://localhost:3000` → `browser_take_screenshot`.
Expected: фон не плоско-чёрный; hero/карточки-скелетоны видимо отличаются от фона
ступенью поверхности.

- [ ] **Step 6: Commit**

```bash
git add client/src/styles/globals.css
git commit -m "feat(ui): premium dark core tokens — surfaces, indigo accent, gold, glow shadows"
```

---

## Task 2: Обновить общие кнопки (свечение + .btn-ink)

**Files:**
- Modify: `client/src/styles/globals.css:167-224` (блок «Common button styles»)

- [ ] **Step 1: Добавить свечение primary и переименовать secondary → ink**

Заменить `.btn-primary` (строки ~168-187) добавив тень-свечение и hover:

```css
.btn-primary {
  background: var(--accent);
  color: #fff;
  border-radius: var(--radius-full);
  padding: 14px 24px;
  font-size: 15px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 52px;
  touch-action: manipulation;
  box-shadow: var(--shadow-glow);
  transition: transform 0.1s, background 0.15s, box-shadow 0.15s;
}
.btn-primary:hover { background: var(--accent-hover); }
.btn-primary:active {
  transform: scale(0.97);
  background: var(--accent-hover);
  box-shadow: 0 2px 12px var(--accent-glow);
}
```

- [ ] **Step 2: Добавить `.btn-ink` рядом с `.btn-secondary`**

Сразу после блока `.btn-secondary` (после строки ~202) добавить алиас-вариант
(оставляем `.btn-secondary` для совместимости, но даём чистый «ink»):

```css
.btn-ink {
  background: var(--surface-2);
  color: var(--text-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-full);
  padding: 14px 24px;
  font-size: 15px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 52px;
  touch-action: manipulation;
  transition: transform 0.1s, background 0.15s, border-color 0.15s;
}
.btn-ink:hover { background: var(--surface-3); border-color: var(--border-strong); }
.btn-ink:active { transform: scale(0.97); }
```

- [ ] **Step 3: Свечение для `.price-btn`**

В `.price-btn` (строки ~204-220) добавить `box-shadow: var(--shadow-glow);` после
строки `touch-action: manipulation;`.

- [ ] **Step 4: Смоук-сборка**

Run: `npm run build`
Expected: без ошибок.

- [ ] **Step 5: Визуальная проверка кнопок**

Playwright: `browser_navigate` → `http://localhost:3000/login` →
`browser_take_screenshot`.
Expected: кнопка «Войти» индиго со свечением, без градиента; press/hover плавные.

- [ ] **Step 6: Commit**

```bash
git add client/src/styles/globals.css
git commit -m "feat(ui): solid glowing buttons + .btn-ink variant"
```

---

## Task 3: Поднять карточку товара (глубина, hover-lift, золотая цена, stagger)

**Files:**
- Modify: `client/src/components/ProductCard/ProductCard.css` (весь файл)
- Modify: `client/src/components/ProductCard/ProductCard.jsx` (добавить inline `--i` для stagger)

- [ ] **Step 1: Переписать `.product-card` с глубиной и hover**

Заменить `.product-card` и `:active` (строки 1-16) на:

```css
.product-card {
  flex-shrink: 0;
  width: 148px;
  background: var(--surface);
  border-radius: var(--radius);
  overflow: hidden;
  cursor: pointer;
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
  animation: cardAppear 0.35s ease both;
  animation-delay: calc(var(--i, 0) * 50ms);
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
  display: flex;
  flex-direction: column;
}
.product-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
  border-color: var(--border-strong);
}
.product-card:active { transform: scale(0.96); }
```

- [ ] **Step 2: Градиентный плейсхолдер изображения**

Заменить `.product-card__image` (строки 18-27) на:

```css
.product-card__image {
  width: 100%;
  aspect-ratio: 1 / 1;
  background: linear-gradient(135deg, var(--surface-2) 0%, var(--surface-3) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--text-tertiary);
}
```

- [ ] **Step 3: Золотая цена**

Заменить `.product-card__price` (строки 56-60) на:

```css
.product-card__price {
  font-size: 13px;
  font-weight: 700;
  color: var(--gold);
}
```

- [ ] **Step 4: Прокинуть индекс stagger в `ProductCard.jsx`**

Открыть `client/src/components/ProductCard/ProductCard.jsx`. На корневом элементе
`.product-card` добавить проп `index` → inline-стиль `--i`. Если у компонента есть
проп `index` (передаётся из списка) — добавить к корневому div:

```jsx
<div className="product-card" style={{ '--i': index ?? 0 }} onClick={...}>
```
Если проп `index` не передаётся из родителя, добавить его: в `Home.jsx`/списке,
где рендерятся `ProductCard`, передать `index={i}` из `.map((p, i) => ...)`.
(Шаг ручной: открыть `ProductCard.jsx`, добавить `index` в деструктуризацию пропсов
и в `style`; затем места использования.)

- [ ] **Step 5: Смоук-сборка**

Run: `npm run build`
Expected: без ошибок.

- [ ] **Step 6: Визуальная проверка карточек**

Playwright: `browser_navigate` → `http://localhost:3000` → `browser_take_screenshot`.
Expected: карточки с тенью, цена золотом; при наличии данных — каскадный вход;
hover (через `browser_hover` по карточке) даёт подъём.

- [ ] **Step 7: Commit**

```bash
git add client/src/components/ProductCard/ProductCard.css client/src/components/ProductCard/ProductCard.jsx client/src/pages/Home/Home.jsx
git commit -m "feat(ui): elevate product card — depth, hover-lift, gold price, stagger"
```

---

## Task 4: Поднять hero и шапку главной

**Files:**
- Modify: `client/src/pages/Home/Home.css`

- [ ] **Step 1: Углубить hero (многоступенчатый градиент, больший радиус)**

Заменить `.home-hero` и `.home-hero::after` (строки 92-111) на:

```css
.home-hero {
  margin: 16px 16px 0;
  background:
    radial-gradient(120% 120% at 100% 0%, var(--accent-tint) 0%, transparent 55%),
    linear-gradient(160deg, var(--surface-2) 0%, var(--surface) 100%);
  border-radius: var(--radius-lg);
  padding: 32px 22px;
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  position: relative;
}
.home-hero::after {
  content: '';
  position: absolute;
  top: -40px;
  right: -40px;
  width: 160px;
  height: 160px;
  background: radial-gradient(circle, var(--accent-glow) 0%, transparent 70%);
  pointer-events: none;
}
```

- [ ] **Step 2: Усилить контраст подзаголовка hero**

Заменить `.home-hero__sub` (строки 125-128) на:

```css
.home-hero__sub {
  font-size: 13px;
  color: var(--text-secondary);
  max-width: 260px;
}
.home-hero__title {
  font-size: 24px;
}
```
(второй селектор переопределяет размер заголовка — добавить ниже `.home-hero__title`
из строк 118-124, не удаляя исходный; либо отредактировать `font-size` в исходном
`.home-hero__title` на `24px`.)

- [ ] **Step 3: Поправить размер skeleton карточки под новую высоту**

`.product-card-skeleton` (строки 150-155): фон уже идёт от класса `.skeleton`
(globals). Убедиться, что `height: 230px` сохранён; добавить
`background: var(--surface);` не нужно — `.skeleton` управляет. Изменений может не
требоваться; оставить как есть, если высота карточки не изменилась.

- [ ] **Step 4: Смоук-сборка**

Run: `npm run build`
Expected: без ошибок.

- [ ] **Step 5: Визуальная проверка hero**

Playwright: `browser_navigate` → `http://localhost:3000` → `browser_take_screenshot`.
Expected: hero с заметной глубиной градиента и свечением, крупный заголовок,
читаемый подзаголовок.

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/Home/Home.css
git commit -m "feat(ui): deepen home hero — layered gradient, glow, stronger contrast"
```

---

## Task 5: Бренд в шапке панели (Layout) + индикатор роли

**Files:**
- Modify: `client/src/components/Layout/Layout.css`
- Modify: `client/src/components/Layout/Layout.jsx` (текст роли уже рендерится —
  проверить и при необходимости добавить разделитель)

- [ ] **Step 1: Усилить логотип сайдбара**

Заменить `.sidebar-logo` (строки 25-34) на:

```css
.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text-primary);
  font-weight: 800;
  font-size: 1rem;
  letter-spacing: 0.06em;
  text-decoration: none;
}
.sidebar-logo svg { color: var(--accent); flex-shrink: 0; }
.sidebar-logo .brand-accent { color: var(--accent); }
```

- [ ] **Step 2: Активный пункт навигации — добавить левый акцент-маркер**

Заменить `.nav-item.active` (строки 78-81) на:

```css
.nav-item.active {
  background: var(--primary-bg);
  color: var(--primary-light);
  box-shadow: inset 3px 0 0 var(--accent);
}
```

- [ ] **Step 3: Роль пользователя — акцентный тон**

Заменить `.sidebar-user-role` (строки 116-121) на:

```css
.sidebar-user-role {
  font-size: 0.65rem;
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
}
```

- [ ] **Step 4: Заменить хардкод `#fca5a5` на токен в logout**

В `.logout-btn:hover` (строка ~130) и `.logout-mobile:hover` (строка ~263)
заменить `color: #fca5a5;` на `color: var(--accent-red);`.

- [ ] **Step 5: Смоук-сборка**

Run: `npm run build`
Expected: без ошибок.

- [ ] **Step 6: Визуальная проверка панели**

Войти на `http://localhost:3000/login`, затем перейти на `/orders` (или любую
страницу панели). Playwright `browser_take_screenshot`.
Expected: бренд MATRELAX с акцентным глифом, активный пункт с левым маркером,
роль акцентным тоном. (Если вход требует учётки — пропустить визуальную часть,
оставить смоук-сборку.)

- [ ] **Step 7: Commit**

```bash
git add client/src/components/Layout/Layout.css client/src/components/Layout/Layout.jsx
git commit -m "feat(ui): brand + role emphasis in panel sidebar"
```

---

## Task 6: Аудит захардкоженных цветов в тёмных компонентах → токены

**Files:**
- Modify: `client/src/pages/Executor/Executor.css`
- Modify: `client/src/components/BottomNav/BottomNav.css`
- Modify: `client/src/components/SeriesDropdown/SeriesDropdown.css`
- Modify: `client/src/pages/Login/Login.css`
- Modify: `client/src/pages/OrderDetails/OrderDetails.css`
- Modify: `client/src/pages/CreateOrder/CreateOrder.css`

- [ ] **Step 1: BottomNav — заменить серый на токен**

`BottomNav.css:25` — `color: #666;` → `color: var(--text-tertiary);`
(`#fff` на строке 48 оставить — это активный белый на акценте.)

- [ ] **Step 2: SeriesDropdown — фон/границы на токены**

- `SeriesDropdown.css:31` — `background: #1a1a1f;` → `background: var(--surface-2);`
- `SeriesDropdown.css:44` — `color: #ddd;` → `color: var(--text-secondary);`
(строки 11 и 51 `#fff` оставить.)

- [ ] **Step 3: Login — хардкод ошибки на токен**

`Login.css:97` — `color: #fca5a5;` → `color: var(--accent-red);`

- [ ] **Step 4: OrderDetails / CreateOrder — статусные хардкоды на токены**

- `OrderDetails.css:96` и `:166` — `#fca5a5` → `var(--accent-red)`
- `OrderDetails.css:144` — `#fbbf24` → `var(--status-progress)`
- `CreateOrder.css:148` — `#ef4444` → `var(--accent-red)`
- `CreateOrder.css:213` — `#fbbf24` → `var(--status-progress)`
- `CreateOrder.css:236` — `#fca5a5` → `var(--accent-red)`

- [ ] **Step 5: Executor — статус-бейджи на статусные токены**

В `Executor.css` заменить локальные hex на токены статусов:
- `.exec-badge--progress` (строка 151): `color: #eab308;` → `color: var(--status-progress);`,
  фон → `background: var(--status-progress-bg);`
- `.exec-badge--ready` (строка 152): `color: #22c55e;` → `color: var(--status-ready);`,
  фон → `background: var(--status-ready-bg);`
- `.exec-badge--delivery` (строка 153): `color: #3b82f6;` → `color: var(--status-delivery);`,
  фон → `background: var(--status-delivery-bg);`
- `.exec-badge--delivered` (строка 154): `color: #818cf8;` → `color: var(--status-delivered);`,
  фон → `background: var(--status-delivered-bg);`
- Строки 51/114 `#22c55e` → `var(--status-ready)`; 168 `#3b82f6` → `var(--status-delivery)`;
  198 `#eab308` → `var(--status-progress)`.
- Кнопка готовности (229-230): `background: #22c55e; color: #000;` оставить как
  явный «успех-CTA» ИЛИ заменить фон на `var(--status-ready)`. Выбрать
  `background: var(--status-ready);`, `color: #0B0B0E;`.

- [ ] **Step 6: Смоук-сборка**

Run: `npm run build`
Expected: без ошибок.

- [ ] **Step 7: Визуальная проверка цеха**

Playwright: открыть страницу исполнителя (если доступна по PIN-маршруту/`/workshop`),
`browser_take_screenshot`. Expected: бейджи статусов в единой палитре.

- [ ] **Step 8: Commit**

```bash
git add client/src/pages/Executor/Executor.css client/src/components/BottomNav/BottomNav.css client/src/components/SeriesDropdown/SeriesDropdown.css client/src/pages/Login/Login.css client/src/pages/OrderDetails/OrderDetails.css client/src/pages/CreateOrder/CreateOrder.css
git commit -m "refactor(ui): replace hardcoded colors with design tokens in dark components"
```

---

## Task 7: Привести светлые админ-страницы каталога к тёмным токенам

**Files:**
- Modify: `client/src/pages/ProductList/ProductList.css`
- Modify: `client/src/pages/ProductEditor/ProductEditor.css`

- [ ] **Step 1: ProductList — перевести светлые поверхности на токены**

Заменить светлые хардкоды на токены:
- `.page-subtitle` (16): `color: #888;` → `color: var(--text-secondary);`
- (25) `border: 1px solid #eee;` → `border: 1px solid var(--border);`
- (28) `background: #fff;` → `background: var(--surface);`
- (37) `background: #fafafa;` → `background: var(--surface-2);`
- (44) `.pl-series-head:hover { background: #f3f3f5; }` → `background: var(--surface-3);`
- (46) `.pl-chevron … color: #888;` → `color: var(--text-secondary);`
- (50) `.pl-series-meta … color: #999;` → `color: var(--text-tertiary);`
- (62) `border-top: 1px solid #f3f3f3;` → `border-top: 1px solid var(--border);`
- (65) `.pl-product:hover { background: #f9fafb; }` → `background: var(--surface-2);`
- (69) `background: #fcfcfc;` → `background: var(--surface);`
- Текстовые цвета без явного значения наследуют `--text-primary` от body —
  проверить, что текст на тёмном читаем; при необходимости задать
  `color: var(--text-primary);` на основном контейнере страницы.

- [ ] **Step 2: ProductEditor — перевести светлый модал/поля на токены**

- (27) `color: #888;` → `color: var(--text-secondary);`
- (35) `border: 1px solid #e2e2e2;` → `border: 1px solid var(--border);`
- (43) `background: #fff;` → `background: var(--surface);`
- (44) `border: 1px solid #eee;` → `border: 1px solid var(--border);`
- (78) `color: #666;` → `color: var(--text-secondary);`
- (84) `border: 1px solid #ddd;` → `border: 1px solid var(--border-strong);`
- (96) `border-color: #6366f1;` → `border-color: var(--accent);`
- (115) `border-top: 1px solid #f2f2f2;` → `border-top: 1px solid var(--border);`
- Danger-кнопки (119-138): `#fef2f2/#dc2626/#fecaca/#fee2e2/#b91c1c` → использовать
  `background: var(--status-progress-bg);` нельзя (это amber) — для danger
  применить: `background: rgba(233,69,96,0.12); color: var(--accent-red);
  border: 1px solid rgba(233,69,96,0.3);`; hover `background: rgba(233,69,96,0.18);`.
- (146) `color: #999;` → `color: var(--text-tertiary);`
- Поля ввода с белым фоном — задать `background: var(--surface-2); color: var(--text-primary);`
  для `input`/`textarea`/`select` внутри редактора, если они визуально остаются белыми.

- [ ] **Step 3: Смоук-сборка**

Run: `npm run build`
Expected: без ошибок.

- [ ] **Step 4: Визуальная проверка каталога админа**

Войти и открыть страницу каталога (`/settings` или маршрут списка товаров).
Playwright `browser_take_screenshot`.
Expected: каталог в тёмной теме, без белых блоков; поля и модал читаемы.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/ProductList/ProductList.css client/src/pages/ProductEditor/ProductEditor.css
git commit -m "fix(ui): bring light admin catalog pages into dark token system"
```

---

## Task 8: Финальная визуальная сверка обеих поверхностей

**Files:** (без правок кода; при находках — точечные фиксы и доп. коммит)

- [ ] **Step 1: Полная сборка**

Run: `npm run build`
Expected: без ошибок.

- [ ] **Step 2: Скриншоты витрины**

Playwright: `http://localhost:3000` (главная), `/cart`, карточка товара —
`browser_take_screenshot` каждой. Сверить с критериями готовности спеки:
слои фона, тени/hover карточек, золотая цена, hero-глубина, плотные кнопки.

- [ ] **Step 3: Скриншоты панели**

Войти; `/orders`, `/employees`, `/reports`, каталог — `browser_take_screenshot`.
Сверить: бренд в шапке, активный пункт с маркером, статус-чипы в единой палитре,
никаких белых блоков.

- [ ] **Step 4: Проверка остаточного хардкода**

Run (Grep по проекту): искать оставшиеся старые значения `#2563eb`, `#888888`,
`#1a1a1a`, `#0a0a0a` в `client/src/**/*.css` (кроме `globals.css` определений).
Expected: критичных совпадений нет; найденное — заменить на токены и закоммитить.

- [ ] **Step 5: Финальный коммит сверки (если были фиксы)**

```bash
git add -A
git commit -m "polish(ui): final premium-dark pass across shop and panel"
```

---

## Self-Review (выполнено при написании плана)

- **Покрытие спеки:** токены (T1), кнопки без градиента + свечение (T2), глубина
  карточек/hover/золото/stagger (T3), hero-глубина (T4), бренд/роль (T5), аудит
  хардкода (T6), реконсиляция светлых страниц = «обе поверхности» (T7), критерии
  готовности (T8). Шрифт Golos и отказ от framer-motion соблюдены (новых
  зависимостей нет).
- **Плейсхолдеры:** все шаги содержат конкретный CSS/команды; «ручные» шаги (T3.4,
  T7) описывают точные правки с путями и значениями.
- **Согласованность типов/имён:** токены (`--accent`, `--accent-glow`, `--gold`,
  `--shadow-glow`, `--radius-lg`), классы (`.btn-ink`) определены в T1/T2 и
  используются согласованно в T3-T7.
