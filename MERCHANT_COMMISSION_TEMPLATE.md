# Merchant Commission Template Breakdown

This template is based on the provided Merchants screen reference. It divides the React work needed for a Merchant Commission feature.

## Screen Goal

Build a merchant commission workspace where users can:
- Browse merchants by onboarding status.
- Filter, search, paginate, and export merchant records.
- View or create commission setup for a merchant.

## Main Status Tabs

Tabs shown in the reference:
- All
- Lead
- Menu Processing
- Onboarding
- Go-Live
- Offboarding

Suggested meaning:
- `All`: every merchant account.
- `Lead`: merchants created but not submitted to menu processing.
- `Menu Processing`: menu checking and setup in progress.
- `Onboarding`: merchant setup is complete but not live yet.
- `Go-Live`: active merchants selling on the platform.
- `Offboarding`: deactivated or terminated merchants.

React component:
- `MerchantStatusTabs.tsx`

Props:
- `activeStatus`
- `countsByStatus`
- `onStatusChange`

## Toolbar And Filters

Controls from the reference:
- Add New
- Search
- Status filter
- Page size selector
- Refresh
- Date filter
- Export

React components:
- `MerchantCommissionToolbar.tsx`
- `MerchantDateFilter.tsx`
- `MerchantSearchInput.tsx`
- `MerchantPageSizeSelect.tsx`

Notes:
- Limit the default page size to 300 or less.
- Use date filtering when users need a wider merchant range.
- Keep export tied to the current filters.

## Merchant Table

Columns from the reference:
- Number
- Logo
- Store ID
- Store Status
- Active
- Open Hour
- Close Hour
- Store Name EN
- Store Name KH
- Store Phone
- Email
- Contact Person

React component:
- `MerchantCommissionTable.tsx`

Types:
- `MerchantCommissionRow`

Expected actions:
- Click row to open merchant commission profile.
- Show status badges for open/closed/active.
- Support pagination.

## Commission Types

The template should support these commission methods:
- Percentage
- Tier Commission
- By Products
- By Category
- Amount for e-commerce or fixed amount cases

React components:
- `CommissionTypeSelector.tsx`
- `MerchantDefaultCommissionForm.tsx`
- `TierCommissionEditor.tsx`
- `CategoryCommissionRules.tsx`
- `ProductCommissionRules.tsx`

## Suggested File Structure

```txt
components/
  commission/
    MerchantCommissionPage.tsx
    MerchantStatusTabs.tsx
    MerchantCommissionToolbar.tsx
    MerchantCommissionTable.tsx
    MerchantDateFilter.tsx
    CommissionTypeSelector.tsx
    MerchantDefaultCommissionForm.tsx
    TierCommissionEditor.tsx
    CategoryCommissionRules.tsx
    ProductCommissionRules.tsx
```

## Work Division

### 1. Merchant List UI

Build:
- Status tabs
- Toolbar
- Search/filter controls
- Table
- Pagination

Primary components:
- `MerchantCommissionPage.tsx`
- `MerchantStatusTabs.tsx`
- `MerchantCommissionToolbar.tsx`
- `MerchantCommissionTable.tsx`

### 2. Commission Setup UI

Build:
- Default commission form
- Tier editor
- Category rules
- Product rules
- Fixed amount/e-commerce amount support

Primary components:
- `MerchantDefaultCommissionForm.tsx`
- `TierCommissionEditor.tsx`
- `CategoryCommissionRules.tsx`
- `ProductCommissionRules.tsx`

### 3. API Integration

Build:
- Merchant list endpoint integration
- Commission save endpoint integration

Primary files:
- `app/api/merchant-commissions/route.ts`
- `app/api/commission-preview/route.ts`

### 4. QA And Responsive Testing

Check:
- Desktop table readability.
- Mobile toolbar wrapping.
- Tabs fit on smaller widths.
- Filter and page-size controls do not overlap.

## Build Order

1. Create shared types for merchant rows and commission rules.
2. Build the merchant list shell from the screenshot.
3. Add tabs, search, filter, pagination, and export controls.
4. Build commission setup forms.
5. Connect APIs and verify responsive behavior.
