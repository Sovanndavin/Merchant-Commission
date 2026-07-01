# Merchant Commission Work Plan

This plan divides the prototype into parallel workstreams with clear handoff points.

## Workstreams

### 1. Commission Rules

Owner: backend/domain

Primary files:
- `lib/commission.ts`
- `lib/types.ts`

Tasks:
- Confirm rule priority order with product/business stakeholders.
- Add unit coverage for percentage, fixed amount, and amount-per-kg commission values.
- Test inactive rules, missing shops, monthly tier thresholds, and merchant defaults.
- Decide whether shop tiers should apply before or after merchant product/category rules.

Deliverable:
- Typed, tested commission calculation behavior that can be trusted by API and UI flows.

### 2. API And Data

Owner: backend/API

Primary files:
- `app/api/merchant-commissions/route.ts`
- `app/api/commission-preview/route.ts`
- `lib/data.ts`

Tasks:
- Add request validation for preview input.
- Standardize success and error response shapes.
- Add create/update routes for merchant, shop, tier, category, and product rules.
- Replace in-memory demo data with persistence when the storage decision is made.

Deliverable:
- Stable API contracts for listing, saving, and previewing commission setup.

### 3. Dashboard Decomposition

Owner: frontend

Primary files:
- `components/CommissionDashboard.tsx`
- `app/globals.css`

Tasks:
- Split the large dashboard component into focused components.
- Remove `// @ts-nocheck` after component boundaries and props are typed.
- Extract shared formatters, constants, and form helpers.
- Keep current behavior stable while refactoring.

Deliverable:
- Maintainable typed UI components with smaller files and clearer ownership.

### 4. Forms And Local State

Owner: frontend/product

Primary file:
- `components/CommissionDashboard.tsx`

Tasks:
- Centralize merchant, tier, category, product, and shop draft state.
- Add validation for required fields and numeric values.
- Add disabled/loading/error states around saves and preview refresh.
- Decide whether locally created rules should immediately affect preview calculation.

Deliverable:
- Predictable form behavior that matches the API contract.

### 5. Responsive UI QA

Owner: frontend/design QA

Primary file:
- `app/globals.css`

Tasks:
- Verify desktop, tablet, and mobile layouts.
- Check tables, forms, drawers, and toolbar wrapping.
- Reduce fragile styling while preserving the Red Ant visual identity.
- Confirm text does not overflow buttons, cards, or form controls.

Deliverable:
- Dashboard screens that remain usable across common viewports.

### 6. Verification

Owner: QA/full-stack

Primary commands:
- `npm run typecheck`
- `npm run build`

Tasks:
- Add unit tests around commission rules first.
- Add API route tests after request validation exists.
- Add dashboard smoke tests once the UI is decomposed.
- Track typecheck/build status on every handoff.

Deliverable:
- Repeatable checks for the critical commission and dashboard flows.

## Suggested Order

1. Start with commission rule tests and rule-order confirmation.
2. Add API validation and response consistency.
3. Decompose the dashboard without changing behavior.
4. Wire form validation and save flows to the finalized API.
5. Complete responsive QA and smoke testing.

## Parallel Handoffs

- API can begin validation while frontend decomposes the dashboard, as long as existing response shapes stay stable.
- Frontend form work should wait for the API contract or use a mocked adapter with the same shape.
- Responsive QA should happen after the dashboard split, otherwise CSS fixes may be duplicated.
- Verification should begin with `lib/commission.ts`; it has the smallest surface area and highest business risk.
