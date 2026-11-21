# ShopLedger
## Stack
Node.js/CommonJS, Express 4, body-parser, vanilla HTML/CSS/JavaScript; JSON persistence.
## Module map
- server.js: static UI, API routers and printable invoice endpoint.
- config.js: port, shop details, HSN GST slabs, coupons and inventory settings.
- public/: index.html, css/style.css and js/app.js implement the browser UI.
- data/db.json: application business records; never use it in tests.
- routes/products.js: products and coupons.
- routes/orders.js: order listing, lookup, placement and cancellation.
- routes/customers.js: customer accounts and settlement recording.
- routes/reports.js: dashboard, reconciliation, pricing preview and keyed export.
- lib/coupons.js: coupon normalization, validation and discount calculation.
- lib/dates.js: local date formatting, comparison keys and fiscal years.
- lib/inventory.js: sellable stock, checks, deductions, releases and summary.
- lib/invoice.js: invoice figures and printable HTML; reuses pricing.
- lib/ledger.js: customer lookup, balances, credit charges and settlements.
- lib/orders.js: order creation, lookup, listing and cancellation.
- lib/pricing.js: subtotal, discounts and post-discount line GST totals.
- lib/reports.js: dashboard metrics and invoice reconciliation.
- lib/store.js: synchronous JSON read/write and audit entry insertion.
- lib/tax.js: explicit/HSN/default tax rates and CGST/SGST split.
## Commands
- Start: npm start (node server.js); default port 3000.
- Tests: node --test; npm test is currently a failing placeholder.
- Windows: use npm.cmd if the PowerShell npm shim is blocked.
## Rules
1. Write characterization tests before changing behavior; label odd results CURRENT BEHAVIOUR.
2. Change only modules covered by the current tickets; tests/docs are checkpoint deliverables.
3. Tests never read or write data/db.json or call store; use in-memory fixtures only.
4. Add no dependencies.
5. Make the smallest fix that works.
- Do not commit package-lock.json; do not commit or push unless asked.
## Current tickets
- Ticket 1: invoice/GST mismatch. Allowed: lib/invoice.js; lib/tax.js only if truly needed.
- Ticket 2: order history/date filters/Khata settlements. Allowed: lib/orders.js (list only),
  lib/dates.js, lib/ledger.js and routes/customers.js.
- This branch contains only its selected ticket fix; the other ticket remains separate.
- Ticket 3 (stock/cancellation) is outside the current scope.
