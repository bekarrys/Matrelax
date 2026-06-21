# Admin Panel Refine — Design Spec

**Date:** 2026-06-21
**Goal:** Make the Matrelax admin panel *impeccable* by killing visual drift at the design-token layer, then migrating every page onto it. Same "Premium Dark" look — no new visual language. Surgical, low-risk consistency pass.

## Problem

The panel already has a strong Premium Dark system (indigo `#6D6BF6` accent, gold secondary, dark surfaces, Golos Text, glass/glow, skeletons, page transitions). But consistency has drifted. Audit found four root causes:

1. **Two competing token vocabularies** in `client/src/styles/globals.css`:
   - `--bg` vs `--bg-primary`, `--surface` vs `--bg-card`
   - `--border` vs `--border-color`, `--border-strong` vs `--border-color-light`
   - `--radius*` vs `--border-radius*`
   Page CSS picks from either set at random → drift.
2. **No type scale.** ~25 distinct `font-size` values across page CSS, mixing `rem` and `px`, with near-duplicates (`0.8rem` / `13px` / `0.85rem`).
3. **Radius spread.** Token usage mixed with hardcoded `8/10/12/7/6/4/2px`, plus a typo `20px20px00`.
4. **11 hardcoded hex colors** in page CSS bypassing variables.

Secondary: inconsistent focus/hover states, uneven table row height/cell padding.

## Token Model

### Canonical names (collapse duplicates)

Keep one canonical token per concept. Retired names stay as **aliases** during migration so nothing breaks, each annotated `/* DEPRECATED: use --canonical instead */`, deleted in the cleanup phase.

| Canonical (keep) | Retire → alias to canonical |
|---|---|
| `--bg`, `--surface`, `--surface-2`, `--surface-3` | `--bg-primary`, `--bg-secondary`, `--bg-card`, `--bg-card-hover` |
| `--border`, `--border-strong` | `--border-color`, `--border-color-light` |
| `--radius-sm/md/lg/xl/full` | `--border-radius`, `--border-radius-sm`, `--border-radius-lg`, hardcoded px |
| `--text-primary/secondary/tertiary` | `--text-muted` → `--text-tertiary` |

Status colors (`--status-*`), spacing (`--space-1..12`), shadows, accent/gold tokens are already clean — keep as-is.

### New scales

**Type scale** (rem under the hood @ 16px root; line-heights paired — looser for body, tighter for headings):

| Token | Size | Line-height |
|---|---|---|
| `--text-xs` | 12px | 1.5 |
| `--text-sm` | 13px | 1.5 |
| `--text-base` | 14px | 1.6 |
| `--text-md` | 15px | 1.5 |
| `--text-lg` | 17px | 1.35 |
| `--text-xl` | 20px | 1.3 |
| `--text-2xl` | 24px | 1.2 |

**Radius scale:** `--radius-sm` 8px · `--radius-md` 12px · `--radius-lg` 16px · `--radius-xl` 20px · `--radius-full` 999px.

**Spacing:** existing `--space-1..12` unchanged.

### Forward rule

No raw `px` for font-size or radius, and no raw hex for color, in page/component CSS. Tokens only. Enforced by grep in verification.

## Migration Phases

Each phase is its own commit; the app stays shippable between phases.

1. **Foundation** — add type/radius scales + paired line-heights to `globals.css`; annotate deprecated aliases. Zero visual change.
2. **Shell** — `Layout` sidebar/nav/header + shared `.btn-*` and card styles onto canonical tokens.
3. **Core workflow** — `Orders`, `OrderDetails`, `CreateOrder`.
4. **Data screens** — `AdminDashboard`, `ProfitAnalysis`, `Reports`, `Employees`.
5. **Rest** — `ProductList`, `ProductEditor`, `Settings`, `AccessDenied`, `Login`.
6. **Cleanup** — delete deprecated aliases; fix `20px20px00` typo and the 11 hardcoded hex; final grep proves zero raw px/hex in touched CSS.

Note: storefront/client pages (`Home`, `ProductDetail`, `Checkout`, `Cart`, `Executor`/`Workshop`) are out of scope — admin surface only. Shared components touched in Phase 2 may incidentally improve them.

## Standards Applied During Sweep

- **Focus:** every interactive element gets a visible `:focus-visible` ring (`--accent`, 2px). Currently inconsistent/missing.
- **Hover:** unify to `--surface-2`/`--surface-3` background shift + `--transition-base`.
- **Tables** (Orders, Reports): one row height, one cell padding (`--space-3` vertical / `--space-4` horizontal), consistent header weight.
- **Empty / loading:** reuse existing `.skeleton` wherever a list loads.

## Verification

Per phase:
- `npm run build` passes.
- Grep shows no *new* raw `px` font-size/radius or raw hex in touched files.

Final (after cleanup):
- Zero deprecated-alias references remain in page CSS.
- Grep across `pages/` + `components/` admin CSS: no raw hex, no raw px font-size/radius.

## Out of Scope (YAGNI)

- No new visual language, no palette change, no layout restructure.
- No Tailwind migration (per-page CSS stays).
- No storefront/client-facing pages.
- No component-library adoption.
