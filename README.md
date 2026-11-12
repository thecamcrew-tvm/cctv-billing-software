# The Cam Crew_TVM — Billing Management Dashboard

A responsive Next.js/Tailwind desktop-first billing management web app designed for a CCTV, automation and security-surveillance company in Trivandrum, Kerala.

## Setup

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Open **http://localhost:3000**.

## Included screens

- Dashboard: KPI cards, sales overview line chart, payment analytics donut chart, recent invoices, quick actions
- New Invoice: choose customer, search products **by product number or product name**, add quantities and rates, auto-calculate GST, select payment status
- Invoices: searchable listing, invoice details, printable invoice and Save as PDF via browser print
- Customers: create, edit, search, delete; name, phone, address, PIN, GSTIN
- Products: create, edit, search, delete; item number, name, category, price, GST and stock
- Reports: invoice financial summaries and CSV export
- Payments: outstanding invoices and mark paid
- Settings: business identity, address, GSTIN, contact info, invoice prefix, footer note

## IMPORTANT: demo data and storage

This is a functional front-end **demo**. Data persists in **browser localStorage**, not in a central database, and resets when browser site data is cleared. The initial four invoice totals and KPI figures are illustrative and intentionally match the visual reference; some illustrative invoice line items do not reconcile to those seed totals. **Newly created invoices calculate totals from item quantities, rates and GST correctly.**

No authentication, shared multi-user access, server-side database, payment gateway, or cloud backups are included. Do not use with real private customer records or as a production billing system until adding secure backend storage, identity/access controls, GST-compliant invoice numbering and legal/tax review.

## Production next steps

Integrate Firebase Auth + Firestore (or SQL), add roles and server-side validation, atomic invoice sequence, backups, PDF invoice engine and audit logging. Replace sample company details and illustrations with the actual brand assets.
