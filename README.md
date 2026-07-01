# Merchant Commission

React + Vite prototype for Red Ant merchant commission management.

## Features

- Merchant commission overview list
- Merchant main commission setup
- Monthly tier commission rules
- Shop-level commission overrides
- Category and product commission rules
- Order commission preview calculator
- Client-side commission data and preview calculation

## Work Plan

See `WORKPLAN.md` for the divided implementation streams, owners, handoffs, and suggested build order.

See `MERCHANT_COMMISSION_TEMPLATE.md` for the React screen/component breakdown based on the merchant commission template.

## Run

```bash
npm install
npm run dev
```

Open the local Vite URL shown in the terminal, usually `http://127.0.0.1:5173`.

## Public Hosting

This app is configured for GitHub Pages. After pushing to the `main` branch and enabling GitHub Pages with **GitHub Actions** as the source, the public URL will be:

```text
https://sovanndavin.github.io/Merchant-Commission/
```

The deploy workflow builds the app with the correct `/Merchant-Commission/` base path for GitHub Pages.
