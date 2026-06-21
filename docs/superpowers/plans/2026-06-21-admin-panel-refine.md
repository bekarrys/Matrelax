# Admin Panel Refine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate visual drift in the Matrelax admin panel by unifying design tokens (one vocabulary + type/radius scales with paired line-heights), then migrating every admin page's CSS onto those tokens — same Premium Dark look.

**Architecture:** Token-first. Phase 1 lands the canonical scales in `globals.css` with deprecated aliases so nothing breaks. Phases 2–5 migrate page/component CSS onto canonical tokens, screen by screen. Phase 6 deletes aliases and proves zero raw hex / raw px font-size & radius remain.

**Tech Stack:** Plain CSS custom properties (no preprocessor), Vite build, per-page `.css` files. No test runner for CSS — verification is `npm run build` + `grep`.

---

## Reference: Token Substitution Map

Apply this exact mapping wherever the retired token or raw value appears in admin CSS. Used by Phases 2–6.

**Surfaces / color:**
| Retired / raw | Replace with |
|---|---|
| `--bg-primary` | `--bg` |
| `--bg-secondary` | `--surface` |
| `--bg-card` | `--surface` |
| `--bg-card-hover` | `--surface-2` |
| `--border-color` | `--border` |
| `--border-color-light` | `--border-strong` |
| `--text-muted` | `--text-tertiary` |

**Radius (raw px → token):**
| Raw | Replace with |
|---|---|
| `4px`, `6px`, `7px`, `8px` | `--radius-sm` |
| `10px`, `12px`, `13px` | `--radius-md` |
| `16px` | `--radius-lg` |
| `20px` | `--radius-xl` |
| `999px`, `50%` (pills only, not avatars) | `--radius-full` |
| `--border-radius` | `--radius-md` |
| `--border-radius-sm` | `--radius-sm` |
| `--border-radius-lg` | `--radius-xl` |

**Font-size (raw → token):**
| Raw | Replace with |
|---|---|
| `0.7rem`, `0.72rem`, `0.75rem`, `11px`, `12px` | `--text-xs` |
| `0.78rem`, `0.8rem`, `0.82rem`, `0.85rem`, `13px` | `--text-sm` |
| `0.875rem`, `0.9rem`, `14px` | `--text-base` |
| `0.95rem`, `15px` | `--text-md` |
| `1rem`, `1.0625rem`, `16px`, `17px` | `--text-lg` |
| `1.125rem`, `1.25rem`, `1.4rem`, `18px`, `20px` | `--text-xl` |
| `1.5rem`, `24px` | `--text-2xl` |

When a `font-size` is set, add the paired line-height if the element doesn't already set one: `--text-xs/sm/md` → `line-height: var(--lh-sm)`; `--text-base` → `--lh-base`; `--text-lg` → `--lh-lg`; `--text-xl` → `--lh-xl`; `--text-2xl` → `--lh-2xl`.

> Note: a few raw values normalize slightly (e.g. radius `10px → 8px`, font `0.9rem → 14px`). These micro-shifts are intended — they collapse near-duplicates onto the scale.

---

## Task 1: Foundation — token scales + deprecated aliases

**Files:**
- Modify: `client/src/styles/globals.css` (`:root` block, lines ~30–80)

- [ ] **Step 1: Add the type scale to `:root`**

Insert after the existing `--radius-*` lines (around line 33), before `--safe-bottom`:

```css
  /* ── Type scale (size + paired line-height) ── */
  --text-xs:   0.75rem;   /* 12px */
  --text-sm:   0.8125rem; /* 13px */
  --text-base: 0.875rem;  /* 14px */
  --text-md:   0.9375rem; /* 15px */
  --text-lg:   1.0625rem; /* 17px */
  --text-xl:   1.25rem;   /* 20px */
  --text-2xl:  1.5rem;    /* 24px */

  --lh-xs: 1.5; --lh-sm: 1.5; --lh-base: 1.6; --lh-md: 1.5;
  --lh-lg: 1.35; --lh-xl: 1.3; --lh-2xl: 1.2;
```

- [ ] **Step 2: Replace the radius tokens with a single canonical scale + aliases**

Find the existing radius lines:

```css
  --radius: 16px;
  --radius-sm: 10px;
  --radius-lg: 24px;
  --radius-full: 999px;
```

Replace with:

```css
  /* ── Radius scale (canonical) ── */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --radius-full: 999px;
  --radius:    var(--radius-lg);   /* DEPRECATED: use --radius-lg */
```

- [ ] **Step 3: Annotate the duplicate surface/border tokens as deprecated**

In the "Admin panel design system" block, change these lines to alias the canonical tokens and add deprecation notes:

```css
  --bg-primary:   var(--bg);            /* DEPRECATED: use --bg */
  --bg-secondary: var(--surface);       /* DEPRECATED: use --surface */
  --bg-card:      var(--surface);       /* DEPRECATED: use --surface */
  --bg-card-hover:var(--surface-2);     /* DEPRECATED: use --surface-2 */
  --border-color: var(--border);        /* DEPRECATED: use --border */
  --border-color-light: var(--border-strong); /* DEPRECATED: use --border-strong */
  --text-muted:   var(--text-tertiary); /* DEPRECATED: use --text-tertiary */
```

And in the radius-alias block:

```css
  --border-radius:    var(--radius-md); /* DEPRECATED: use --radius-md */
  --border-radius-sm:  var(--radius-sm);/* DEPRECATED: use --radius-sm */
  --border-radius-lg: var(--radius-xl); /* DEPRECATED: use --radius-xl */
```

- [ ] **Step 4: Build to verify nothing broke**

Run: `npm run build`
Expected: `✓ built` with no CSS errors.

- [ ] **Step 5: Visual smoke check**

Run: `npm run dev:client`, open the panel, confirm sidebar + Orders render unchanged (no missing colors/rounding). Stop dev server.

- [ ] **Step 6: Commit**

```bash
git add client/src/styles/globals.css
git commit -m "refactor(ui): add type/radius scales, deprecate duplicate tokens"
```

---

## Task 2: Shell — Layout + shared button/card styles

**Files:**
- Modify: `client/src/components/Layout/Layout.css`
- Modify: `client/src/styles/globals.css` (`.btn-*` rules, lines ~194–274)

- [ ] **Step 1: Migrate `Layout.css` per the substitution map**

Read `client/src/components/Layout/Layout.css`. Replace every retired surface/border token, raw radius, and raw font-size per the Reference map. Add paired line-heights to any rule that sets `font-size` and lacks `line-height`. Keep `50%` on avatar/circle elements (those are intentional circles, not pills).

- [ ] **Step 2: Migrate the shared `.btn-*`/`.price-btn` rules in `globals.css`**

In the button rules, replace raw `font-size` values (`15px`, `clamp(13px,4vw,17px)` keep the clamp but swap fixed bounds to tokens where literal) and confirm `border-radius: var(--radius-full)` is used (already is). Replace any `padding`/`font-size` raw values with tokens where a token exists.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: `✓ built`.

- [ ] **Step 4: Grep the touched files for leftover raw values**

Run: `grep -nE "font-size:\s*[0-9.]+(px|rem)|border-radius:\s*[0-9]+px|#[0-9a-fA-F]{3,6}" client/src/components/Layout/Layout.css`
Expected: no matches (empty output). `50%` on circles is allowed and won't match.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/Layout/Layout.css client/src/styles/globals.css
git commit -m "refactor(ui): migrate shell (sidebar/nav/buttons) onto canonical tokens"
```

---

## Task 3: Core workflow — Orders, OrderDetails, CreateOrder

**Files:**
- Modify: `client/src/pages/Orders/Orders.css`
- Modify: `client/src/pages/OrderDetails/OrderDetails.css`
- Modify: `client/src/pages/CreateOrder/CreateOrder.css` (if present; otherwise skip)

- [ ] **Step 1: Migrate each file per the substitution map**

For each file: replace retired tokens, raw radius, raw font-size; add paired line-heights where `font-size` is set without one.

- [ ] **Step 2: Apply table standards in `Orders.css`**

For the orders table: set one row height and cell padding `var(--space-3)` vertical / `var(--space-4)` horizontal; header cells use `font-size: var(--text-xs)` + `font-weight: 600` + `color: var(--text-tertiary)`. Ensure rows have `:hover { background: var(--surface-2); }` with `transition: var(--transition-base)`.

- [ ] **Step 3: Add focus-visible to interactive elements**

In each file, ensure clickable rows / buttons / filter controls have:

```css
.selector:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: `✓ built`.

- [ ] **Step 5: Grep touched files**

Run: `grep -nE "font-size:\s*[0-9.]+(px|rem)|border-radius:\s*[0-9]+px|#[0-9a-fA-F]{3,6}" client/src/pages/Orders/Orders.css client/src/pages/OrderDetails/OrderDetails.css`
Expected: no matches.

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/Orders client/src/pages/OrderDetails client/src/pages/CreateOrder
git commit -m "refactor(ui): migrate order workflow screens onto tokens + table standards"
```

---

## Task 4: Data screens — Dashboard, ProfitAnalysis, Reports, Employees

**Files:**
- Modify: `client/src/pages/AdminDashboard/AdminDashboard.css`
- Modify: `client/src/pages/ProfitAnalysis/ProfitAnalysis.css`
- Modify: `client/src/pages/Reports/Reports.css`
- Modify: `client/src/pages/Employees/Employees.css`

- [ ] **Step 1: Migrate each file per the substitution map** (retired tokens, raw radius, raw font-size + paired line-heights).

- [ ] **Step 2: Apply table standards in `Reports.css`** (same row-height / cell padding / header style as Task 3 Step 2).

- [ ] **Step 3: Reuse `.skeleton` for loading lists** — where these pages render a loading state with ad-hoc markup, ensure the loading placeholder uses `class="skeleton"`. If a page has no loading state, skip.

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: `✓ built`.

- [ ] **Step 5: Grep touched files**

Run: `grep -nE "font-size:\s*[0-9.]+(px|rem)|border-radius:\s*[0-9]+px|#[0-9a-fA-F]{3,6}" client/src/pages/AdminDashboard/AdminDashboard.css client/src/pages/ProfitAnalysis/ProfitAnalysis.css client/src/pages/Reports/Reports.css client/src/pages/Employees/Employees.css`
Expected: no matches.

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/AdminDashboard client/src/pages/ProfitAnalysis client/src/pages/Reports client/src/pages/Employees
git commit -m "refactor(ui): migrate data screens onto tokens + table/loading standards"
```

---

## Task 5: Rest — ProductList, ProductEditor, Settings, AccessDenied, Login

**Files:**
- Modify: `client/src/pages/ProductList/ProductList.css`
- Modify: `client/src/pages/ProductEditor/ProductEditor.css`
- Modify: `client/src/pages/Settings/Settings.css`
- Modify: `client/src/pages/Login/Login.css`
- Note: `AccessDenied` uses Tailwind utility classes inline (no `.css`) — confirm with `ls client/src/pages/AccessDenied`; if no `.css`, skip it.

- [ ] **Step 1: Migrate each file per the substitution map** (retired tokens, raw radius, raw font-size + paired line-heights).

- [ ] **Step 2: Add focus-visible to form inputs/buttons** in `Settings.css`, `ProductEditor.css`, `Login.css` (same focus-visible rule as Task 3 Step 3).

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: `✓ built`.

- [ ] **Step 4: Grep touched files**

Run: `grep -nE "font-size:\s*[0-9.]+(px|rem)|border-radius:\s*[0-9]+px|#[0-9a-fA-F]{3,6}" client/src/pages/ProductList/ProductList.css client/src/pages/ProductEditor/ProductEditor.css client/src/pages/Settings/Settings.css client/src/pages/Login/Login.css`
Expected: no matches.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/ProductList client/src/pages/ProductEditor client/src/pages/Settings client/src/pages/Login
git commit -m "refactor(ui): migrate remaining admin screens onto tokens"
```

---

## Task 6: Cleanup — delete aliases, fix typo + stray hex, prove zero drift

**Files:**
- Modify: `client/src/styles/globals.css`
- Modify: any admin CSS still referencing a deprecated alias (found by grep below)

- [ ] **Step 1: Find any remaining alias usages in admin CSS**

Run:
```bash
grep -rnE "var\(--(bg-primary|bg-secondary|bg-card|bg-card-hover|border-color|border-color-light|text-muted|border-radius|border-radius-sm|border-radius-lg|radius)\b" client/src/pages client/src/components
```
Expected eventually: empty. If matches appear, replace each with its canonical token (per the substitution map) in those files.

- [ ] **Step 2: Fix the `20px20px00` typo**

Run: `grep -rn "20px20px00" client/src`
For each hit, replace the malformed `border-radius` value with the intended `var(--radius-xl)`.

- [ ] **Step 3: Find and tokenize remaining hardcoded hex in admin CSS**

Run:
```bash
grep -rnE "#[0-9a-fA-F]{3,6}" client/src/pages client/src/components --include=*.css | grep -viE "var\(|gradient"
```
For each hit on an admin page/component, replace with the nearest existing color token (`--bg`, `--surface*`, `--text-*`, `--accent*`, `--status-*`, `--border*`). Leave storefront-only files (`Home`, `ProductDetail`, `Checkout`, `Cart`, `Executor`, `Workshop`, `BottomSheet`, `CartSheet`, `ProductCard`, `Receipt`) untouched if they are out of admin scope.

- [ ] **Step 4: Delete the deprecated aliases from `globals.css`**

Remove the lines annotated `/* DEPRECATED: ... */` added in Task 1 (the `--bg-primary`, `--bg-secondary`, `--bg-card`, `--bg-card-hover`, `--border-color`, `--border-color-light`, `--text-muted`, `--border-radius*`, and `--radius` alias). Keep only the canonical tokens.

- [ ] **Step 5: Build and confirm no breakage from alias removal**

Run: `npm run build`
Expected: `✓ built`. If build/runtime shows an undefined-var fallback, Step 1 missed a file — re-run Step 1's grep, fix, rebuild.

- [ ] **Step 6: Final drift proof**

Run:
```bash
grep -rnE "font-size:\s*[0-9.]+(px|rem)|border-radius:\s*[0-9]+px" client/src/pages/{Orders,OrderDetails,AdminDashboard,ProfitAnalysis,Reports,Employees,ProductList,ProductEditor,Settings,Login}/*.css client/src/components/Layout/*.css
```
Expected: empty.

- [ ] **Step 7: Visual smoke check**

Run `npm run dev:client`, click through Orders, OrderDetails, Dashboard, ProfitAnalysis, Reports, Employees, Products, Settings, Login. Confirm each looks the same as before (or tighter), nothing unstyled. Stop dev server.

- [ ] **Step 8: Commit**

```bash
git add client/src
git commit -m "refactor(ui): drop deprecated token aliases, tokenize stray hex, fix radius typo"
```

---

## Done When

- All 6 tasks committed.
- `npm run build` passes.
- Final grep (Task 6 Step 6) is empty — no raw px font-size/radius in migrated admin CSS.
- No deprecated-alias references remain in `pages/` or `components/`.
- Visual smoke check shows the panel unchanged in look, consistent in execution.
