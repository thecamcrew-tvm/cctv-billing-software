
"use client";

import { useState } from "react";
import { StoreProvider } from "@/lib/store";
import Shell from "@/components/Shell";

import {
  Dashboard,
  Invoices,
  InvoiceDetails,
  NewInvoice,
  Customers,
  Products,
  Payments,
  Reports,
  Settings,
} from "@/components/Pages";

function BillingDashboard() {
  const [page, setPage] = useState("dashboard");
  const [selectedInvoice, setSelectedInvoice] =
    useState(null);

  const go = (nextPage) => {
    setPage(nextPage);
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const view = (invoiceId) => {
    setSelectedInvoice(invoiceId);
    go("invoice-detail");
  };

  const pages = {
    dashboard: <Dashboard go={go} view={view} />,
    invoices: <Invoices go={go} view={view} />,
    "invoice-detail": (
      <InvoiceDetails
        id={selectedInvoice}
        go={go}
      />
    ),
    "new-invoice": (
      <NewInvoice go={go} view={view} />
    ),
    customers: <Customers />,
    products: <Products />,
    payments: <Payments view={view} />,
    reports: <Reports />,
    settings: <Settings />,
  };

  return (
    <Shell page={page} setPage={go}>
      {pages[page] || pages.dashboard}
    </Shell>
  );
}

export default function AdminDashboardPage() {
  return (
    <StoreProvider>
      <BillingDashboard />
    </StoreProvider>
  );
}
