
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Pencil,
  Printer,
  Save,
  Trash2,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import "./bill.css";

const STORAGE_KEY = "cam-crew-billing-v1";
const LATEST_KEY = "cam-crew-latest-invoice";

const initialDetails = {
  invoiceNumber: "INV-2026-025",
  invoiceDate: "2026-10-22",
  customerId: "26-127",
  customerName: "Vettuthura",
  customerCompany: "",
  customerAddress: "",
  customerCity: "Trivandrum",
  customerState: "Kerala",
  customerPin: "",
  customerPhone: "",
  customerEmail: "",
  customerGstin: "",
  sellerName: "The Cam Crew_TVM",
  sellerSubtitle: "Automation & Security Surveillance",
  sellerAddress: "Pothencode & Vizhinjam, Trivandrum, Kerala",
  sellerPhone: "8891177850 / 8891177845",
  sellerEmail: "tvmeservices@gmail.com",
  sellerGstin: "",
  terms: "Due on Receipt",
  placeOfSupply: "Kerala",
  supplyType: "intra",
  irn: "",
  ackNo: "",
  ackDate: "",
  ewayNo: "",
  qrImage: "",
  bankAccountName: "",
  bankName: "",
  bankAccountNumber: "",
  bankIfsc: "",
  bankBranch: "",
  bankUpiId: "",
  declaration:
    "We declare that this invoice shows the actual price of the goods and/or services described and that all particulars are true and correct.",
};

const sampleLines = [
  { id: "demo-1", productNumber: "P-001", description: "HIKVISION BULLET DS-2CE16H0T-ITPFS 3.6MM.", hsnSac: "85258900", quantity: 3, rate: 1360, discount: 0, gst: 18 },
  { id: "demo-2", productNumber: "P-002", description: "HIKVISION BULLET DS-2CE10KF0T-PFS 3.6MM.", hsnSac: "85258900", quantity: 2, rate: 2330, discount: 139.80, gst: 18 },
  { id: "demo-3", productNumber: "P-003", description: "HIKVISION DVR 8CH IDS-7108HQHI-M1/T", hsnSac: "85219090", quantity: 1, rate: 5120, discount: 0, gst: 18 },
  { id: "demo-4", productNumber: "P-004", description: "PP ADAPTOR SMPS 12V 6A AD-22 IT PRODUCT 2/2", hsnSac: "85044030", quantity: 1, rate: 500, discount: 0, gst: 18 },
  { id: "demo-5", productNumber: "P-005", description: "SECURUS BNC CONNECTOR", hsnSac: "85299090", quantity: 20, rate: 17, discount: 0, gst: 18 },
  { id: "demo-6", productNumber: "P-006", description: "DC PIN SCREWTYPE SMART", hsnSac: "85444299", quantity: 20, rate: 5.5, discount: 0, gst: 18 },
  { id: "demo-7", productNumber: "P-007", description: "UNICORN 2U RACK 350 WALLMOUNT", hsnSac: "85381090", quantity: 1, rate: 850, discount: 0, gst: 18 },
  { id: "demo-8", productNumber: "P-008", description: "CYBER HDMI CABLE 3MTR", hsnSac: "85444220", quantity: 1, rate: 125, discount: 0, gst: 18 },
  { id: "demo-9", productNumber: "P-009", description: "CAMERA STAND 60-120CM (L TYPE EXT)", hsnSac: "85299090", quantity: 1, rate: 610, discount: 0, gst: 18 },
  { id: "demo-10", productNumber: "P-010", description: "HARD DISK KRYSTAA 500GB", hsnSac: "84717020", quantity: 1, rate: 1950, discount: 0, gst: 18 },
  { id: "demo-11", productNumber: "P-011", description: "RG59 COAXIAL CABLE HIKVISION", hsnSac: "85444999", quantity: 1, rate: 4450, discount: 667.5, gst: 18 },
];

const termsAndConditions = [
  "Goods once sold will not be taken back or exchanged unless there is a confirmed manufacturing defect.",
  "Full payment must be made prior to delivery of goods and/or commencement of services.",
  "Free service or Annual Maintenance Contract (AMC) is not included unless explicitly specified.",
  "All product warranties are subject to the manufacturer's terms and conditions.",
  "Any disputes shall be subject to the applicable local jurisdiction.",
  "Ownership of goods remains with the seller until full payment is received.",
  "Customer acceptance confirms agreement with the invoice details and applicable terms.",
];

function numeric(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function round2(number) {
  return Math.round((number + Number.EPSILON) * 100) / 100;
}

function money(number) {
  return numeric(number).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return value || "—";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function calculateRow(row, supplyType) {
  const quantity = Math.max(0, numeric(row.quantity));
  const rate = Math.max(0, numeric(row.rate));
  const gross = round2(quantity * rate);
  const discount = Math.min(gross, Math.max(0, numeric(row.discount)));
  const taxable = round2(gross - discount);
  const gstRate = Math.min(100, Math.max(0, numeric(row.gst)));
  const tax = round2((taxable * gstRate) / 100);
  const cgst = supplyType === "intra" ? round2(tax / 2) : 0;
  const sgst = supplyType === "intra" ? round2(tax - cgst) : 0;
  const igst = supplyType === "inter" ? tax : 0;

  return {
    ...row,
    gross,
    discount,
    taxable,
    gstRate,
    cgst,
    sgst,
    igst,
    tax,
    total: round2(taxable + tax),
  };
}

function amountsFromItems(items, supplyType) {
  return (items || []).reduce((sum, item) => {
    const row = calculateRow(
      {
        quantity: item.qty ?? item.quantity,
        rate: item.price ?? item.rate,
        discount: item.discount ?? 0,
        gst: item.gst ?? 0,
      },
      supplyType
    );
    return sum + row.total;
  }, 0);
}

const ones = [
  "Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven",
  "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen",
  "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];
const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function belowThousand(number) {
  const n = Math.floor(number);
  if (n < 20) return ones[n];
  if (n < 100) return `${tens[Math.floor(n / 10)]}${n % 10 ? ` ${ones[n % 10]}` : ""}`;
  return `${ones[Math.floor(n / 100)]} Hundred${n % 100 ? ` ${belowThousand(n % 100)}` : ""}`;
}

function indianNumberWords(number) {
  let n = Math.floor(Math.max(0, numeric(number)));
  if (n === 0) return "Zero";
  const units = [
    [10000000, "Crore"],
    [100000, "Lakh"],
    [1000, "Thousand"],
    [1, ""],
  ];
  const result = [];
  for (const [size, label] of units) {
    const part = Math.floor(n / size);
    if (part > 0) {
      result.push(`${belowThousand(part)}${label ? ` ${label}` : ""}`);
      n %= size;
    }
  }
  return result.join(" ");
}

function amountInWords(amount) {
  const rounded = round2(Math.max(0, numeric(amount)));
  let rupees = Math.floor(rounded);
  let paise = Math.round((rounded - rupees) * 100);
  if (paise === 100) {
    rupees += 1;
    paise = 0;
  }
  return `Rupees ${indianNumberWords(rupees)}${paise ? ` and ${indianNumberWords(paise)} Paise` : ""} Only`;
}

function FieldValue({ editing, value, onChange, placeholder = "", multiline = false, type = "text", className = "" }) {
  if (editing) {
    const common = {
      className: `gst-field ${className}`.trim(),
      value: value ?? "",
      onChange: (event) => onChange(event.target.value),
      placeholder,
      "aria-label": placeholder || "Invoice field",
    };
    return multiline ? <textarea {...common} rows={2} /> : <input {...common} type={type} />;
  }
  return <span className={`gst-value ${className}`.trim()}>{value || "—"}</span>;
}

function DetailRow({ label, children }) {
  return (
    <div className="gst-detail-row">
      <span className="gst-detail-label">{label}</span>
      <span className="gst-detail-separator">:</span>
      <div className="gst-detail-content">{children}</div>
    </div>
  );
}

/**
 * Product picker for Bill Edit.
 * Reads the same local catalogue schema as Admin Products:
 * { id, number, name, price, hsnSac, gst, stock, category }.
 * This component lives in this file so no extra component import is needed.
 */
function ProductCatalogSearch({ products = [], onSelect }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return products.filter((product) =>
      String(product.status ?? "active").toLowerCase() !== "inactive"
    ).slice(0, 10);

    return products
      .filter((product) => String(product.status ?? "active").toLowerCase() !== "inactive")
      .filter((product) => [
        product.number,
        product.productNumber,
        product.code,
        product.name,
        product.productName,
        product.hsnSac,
        product.hsn,
        product.category,
      ].some((value) => String(value ?? "").toLowerCase().includes(term)))
      .slice(0, 15);
  }, [products, query]);

  return (
    <div className="gst-catalog-picker no-print" style={{ position: "relative", marginBottom: 14 }}>
      <label htmlFor="bill-product-search" style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
        Add product by number or name
      </label>
      <input
        id="bill-product-search"
        type="search"
        autoComplete="off"
        className="gst-field"
        style={{ width: "100%" }}
        placeholder="Search product number, name or HSN/SAC"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
        aria-expanded={open}
        aria-controls="bill-product-search-results"
      />
      <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
        {products.length} product{products.length === 1 ? "" : "s"} in catalogue
      </div>
      {open && (
        <div
          id="bill-product-search-results"
          role="listbox"
          style={{
            position: "absolute",
            zIndex: 60,
            top: "100%",
            left: 0,
            right: 0,
            backgroundColor: "#fff",
            color: "#111827",
            border: "1px solid #cbd5e1",
            borderRadius: 8,
            maxHeight: 300,
            overflowY: "auto",
            boxShadow: "0 12px 24px rgba(0,0,0,.14)",
          }}
        >
          {products.length === 0 ? (
            <div style={{ padding: 12 }}>
              No products in the catalogue. Add products in Admin → Products first.
            </div>
          ) : matches.length === 0 ? (
            <div style={{ padding: 12 }}>No matching products found.</div>
          ) : matches.map((product, index) => {
            const code = String(product.number ?? product.productNumber ?? product.code ?? "");
            const name = String(product.name ?? product.productName ?? "Unnamed Product");
            const price = Number(product.price ?? product.sellingPrice ?? product.rate ?? 0);
            return (
              <button
                type="button"
                role="option"
                aria-selected={false}
                key={`${product.id ?? code}-${index}`}
                onClick={() => {
                  onSelect?.(product);
                  setQuery("");
                  setOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  width: "100%",
                  padding: "11px 12px",
                  borderBottom: "1px solid #e5e7eb",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <span style={{ minWidth: 0 }}>
                  <strong style={{ display: "block", fontSize: 12, color: "#075c3b" }}>{code}</strong>
                  <span style={{ display: "block", fontSize: 13 }}>{name}</span>
                  {product.hsnSac && (
                    <small style={{ color: "#64748b" }}>HSN/SAC: {product.hsnSac}</small>
                  )}
                </span>
                <strong style={{ whiteSpace: "nowrap" }}>
                  ₹{Number.isFinite(price) ? price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
                </strong>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function BillPage() {
  const [details, setDetails] = useState(initialDetails);
  const [lines, setLines] = useState(sampleLines);
  const [customers, setCustomers] = useState([]);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [loadedInvoiceId, setLoadedInvoiceId] = useState(null);
  const [adjustment, setAdjustment] = useState(0.51);
  const [roundToRupee, setRoundToRupee] = useState(true);
  const [productCatalog, setProductCatalog] = useState([]);
  // Payment fields come from the saved invoice. The bill page does not collect payments.
  const [paymentInfo, setPaymentInfo] = useState({
    status: "Pending",
    method: "",
    paidAmount: null,
    reference: "",
  });

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      const storedCustomers = Array.isArray(stored.customers) ? stored.customers : [];
      setCustomers(storedCustomers);
      const defaultBank = stored.settings || {};
      setDetails((old) => ({
        ...old,
        bankAccountName: String(defaultBank.bankAccountName || ""),
        bankName: String(defaultBank.bankName || ""),
        bankAccountNumber: String(defaultBank.bankAccountNumber || ""),
        bankIfsc: String(defaultBank.bankIfsc || ""),
        bankBranch: String(defaultBank.bankBranch || ""),
        bankUpiId: String(defaultBank.bankUpiId || ""),
      }));
      const invoiceId = new URLSearchParams(window.location.search).get("invoice");
      if (!invoiceId) return;

      let last = null;
      try {
        last = JSON.parse(sessionStorage.getItem(LATEST_KEY) || "null");
      } catch {
        last = null;
      }

      const savedInvoice = Array.isArray(stored.invoices)
        ? stored.invoices.find((invoice) => invoice.id === invoiceId)
        : null;
      const invoice = last?.id === invoiceId ? last : savedInvoice;

      if (!invoice) {
        setLines([]);
        setMessage(`Invoice ${invoiceId} was not found in this browser. Open it from your dashboard.`);
        return;
      }

      const customer = storedCustomers.find(
        (person) => String(person.id) === String(invoice.customerId)
      );
      const snapshot = invoice.customerSnapshot || {};
      const savedBank = invoice.bankDetails || {};
      const billMetadata = invoice.billMetadata || {};
      const settings = stored.settings || {};
      // Keep an issued invoice's bank snapshot intact. Legacy invoices without
      // bank information inherit the default configured in Settings.
      const hasSavedBankDetails = [
        'bankAccountName', 'bankName', 'bankAccountNumber',
        'bankIfsc', 'bankBranch', 'bankUpiId',
      ].some((key) => String(savedBank[key] || '').trim());
      const getInvoiceBankValue = (key) => String(
        hasSavedBankDetails ? (savedBank[key] ?? '') : (settings[key] ?? '')
      );
      const supplyType = billMetadata.supplyType === "inter" ? "inter" : "intra";
      const savedLines = (invoice.items || []).map((item, index) => ({
        id: `saved-${index}`,
        productNumber: item.number || "",
        description: item.name || "",
        hsnSac: item.hsnSac || "",
        quantity: numeric(item.qty),
        rate: numeric(item.price),
        discount: numeric(item.discount),
        gst: numeric(item.gst),
      }));

      // Support the current admin store and older invoice/payment shapes.
      // A null paid amount means there was no explicit paid-amount record.
      const invoicePayment = invoice.paymentDetails || invoice.payment || {};
      const storedPaidAmount =
        invoice.paidAmount ??
        invoice.amountPaid ??
        invoicePayment.paidAmount ??
        invoicePayment.amountPaid ??
        null;
      const numericPaidAmount =
        storedPaidAmount !== null &&
        storedPaidAmount !== "" &&
        Number.isFinite(Number(storedPaidAmount))
          ? Math.max(0, round2(Number(storedPaidAmount)))
          : null;

      setPaymentInfo({
        status: String(invoice.status || invoicePayment.status || "Pending"),
        method: String(invoice.method || invoicePayment.method || ""),
        paidAmount: numericPaidAmount,
        reference: String(
          invoice.transactionReference ||
          invoice.paymentReference ||
          invoicePayment.transactionReference ||
          invoicePayment.transactionId ||
          invoicePayment.reference ||
          ""
        ),
      });
      setLoadedInvoiceId(invoice.id);
      setLines(savedLines);
      setDetails((old) => ({
        ...old,
        invoiceNumber: invoice.id,
        invoiceDate: invoice.date || old.invoiceDate,
        customerId: String(invoice.customerId || ""),
        customerName: snapshot.customerName ?? customer?.name ?? invoice.customerName ?? "",
        customerCompany: snapshot.customerCompany ?? customer?.company ?? "",
        customerAddress: snapshot.customerAddress ?? customer?.address ?? "",
        customerCity: snapshot.customerCity ?? customer?.city ?? "Trivandrum",
        customerState: snapshot.customerState ?? customer?.state ?? "Kerala",
        customerPin: snapshot.customerPin ?? customer?.pin ?? "",
        customerPhone: snapshot.customerPhone ?? customer?.phone ?? "",
        customerEmail: snapshot.customerEmail ?? customer?.email ?? "",
        customerGstin: snapshot.customerGstin ?? customer?.gstin ?? "",
        sellerName: billMetadata.sellerName || settings.company || old.sellerName,
        sellerSubtitle: billMetadata.sellerSubtitle || settings.subtitle || old.sellerSubtitle,
        sellerAddress: billMetadata.sellerAddress || settings.address || old.sellerAddress,
        sellerPhone: billMetadata.sellerPhone || settings.phone || old.sellerPhone,
        sellerEmail: billMetadata.sellerEmail || settings.email || old.sellerEmail,
        sellerGstin: billMetadata.sellerGstin || settings.gstin || "",
        terms: billMetadata.terms || old.terms,
        placeOfSupply: billMetadata.placeOfSupply || old.placeOfSupply,
        supplyType,
        irn: billMetadata.irn || "",
        ackNo: billMetadata.ackNo || "",
        ackDate: billMetadata.ackDate || "",
        ewayNo: billMetadata.ewayNo || "",
        qrImage: billMetadata.qrImage || "",
        bankAccountName: getInvoiceBankValue("bankAccountName"),
        bankName: getInvoiceBankValue("bankName"),
        bankAccountNumber: getInvoiceBankValue("bankAccountNumber"),
        bankIfsc: getInvoiceBankValue("bankIfsc"),
        bankBranch: getInvoiceBankValue("bankBranch"),
        bankUpiId: getInvoiceBankValue("bankUpiId"),
        declaration: billMetadata.declaration || old.declaration,
      }));

      const calculatedTotal = amountsFromItems(savedLines.map((item) => ({
        qty: item.quantity,
        price: item.rate,
        discount: item.discount,
        gst: item.gst,
      })), supplyType);
      // Some demo/legacy invoices have totals different from their saved line items.
      // Preserve that difference transparently instead of silently changing the invoice.
      if (Number.isFinite(Number(billMetadata.adjustment)) && billMetadata.adjustment != null) {
        setAdjustment(round2(numeric(billMetadata.adjustment)));
        setRoundToRupee(Boolean(billMetadata.roundToRupee));
      } else {
        setAdjustment(round2(numeric(invoice.total) - calculatedTotal));
      }
    } catch (error) {
      console.error("Unable to load invoice", error);
      setMessage("Invoice data could not be loaded. Check your browser storage.");
    }
  }, []);

  function updateDetail(key, value) {
    setDetails((old) => ({ ...old, [key]: value }));
  }

  function chooseCustomer(id) {
    const customer = customers.find((person) => String(person.id) === String(id));
    if (!customer) return;
    setDetails((old) => ({
      ...old,
      customerId: String(customer.id),
      customerName: customer.name || "",
      customerCompany: customer.company || "",
      customerAddress: customer.address || "",
      customerCity: customer.city || "Trivandrum",
      customerState: customer.state || "Kerala",
      customerPin: customer.pin || "",
      customerPhone: customer.phone || "",
      customerEmail: customer.email || "",
      customerGstin: customer.gstin || "",
    }));
  }

  function updateLine(id, field, value) {
    setLines((old) => old.map((line) => line.id === id ? { ...line, [field]: value } : line));
    setAdjustment(0);
  }

  function removeLine(id) {
    setLines((old) => old.filter((line) => line.id !== id));
    setAdjustment(0);
  }
const addCatalogProduct = (product) => {
    if (!product) return;

    // Admin catalogue uses number / name / price / gst.
    const productNumber = String(product.number ?? product.productNumber ?? product.code ?? "");
    const description = String(product.name ?? product.productName ?? product.description ?? "");
    const hsnSac = String(product.hsnSac ?? product.hsn ?? "");
    const rate = numeric(product.price ?? product.sellingPrice ?? product.rate ?? 0);
    const gst = numeric(product.gst ?? product.gstPercentage ?? 0);
    const discount = numeric(product.discount ?? 0);

    if (!productNumber || !description) {
      setMessage("Selected product is missing its product number or name.");
      return;
    }

    setLines((previous) => {
      // Same product selected again: increase quantity rather than adding
      // an identical second row. Existing saved rows remain editable.
      const existing = previous.find((line) =>
        String(line.productNumber).toLowerCase() === productNumber.toLowerCase()
      );
      if (existing) {
        return previous.map((line) => line.id === existing.id
          ? { ...line, quantity: numeric(line.quantity) + 1 }
          : line);
      }
      return [...previous, {
        id: `catalog-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        productNumber,
        description,
        hsnSac,
        quantity: 1,
        rate,
        discount,
        gst,
      }];
    });
    setAdjustment(0);
    setMessage("");
  };
useEffect(() => {
    // IMPORTANT: The existing Admin Products page uses useStore() and saves
    // products inside localStorage under cam-crew-billing-v1.
    // Loading Firestore billingProducts here previously returned no matches.
    const loadProducts = () => {
      try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
        setProductCatalog(Array.isArray(stored.products) ? stored.products : []);
      } catch (error) {
        console.error("Failed to load Admin product catalogue:", error);
        setProductCatalog([]);
      }
    };

    loadProducts();
    // Refresh when returning from the Admin Products page or when another
    // browser tab updates the store.
    window.addEventListener("focus", loadProducts);
    window.addEventListener("storage", loadProducts);
    return () => {
      window.removeEventListener("focus", loadProducts);
      window.removeEventListener("storage", loadProducts);
    };
  }, []);
  const totals = useMemo(() => {
    const entries = lines.map((line) => calculateRow(line, details.supplyType));
    const sum = (key) => round2(entries.reduce((acc, row) => acc + numeric(row[key]), 0));
    const taxable = sum("taxable");
    const tax = sum("tax");
    const beforeRoundOff = round2(taxable + tax + numeric(adjustment));
    const roundOff = roundToRupee ? round2(Math.round(beforeRoundOff) - beforeRoundOff) : 0;
    const grandTotal = round2(beforeRoundOff + roundOff);

    const groups = new Map();
    for (const row of entries) {
      const key = `${String(row.hsnSac || "—").trim()}|${row.gstRate}`;
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          hsnSac: String(row.hsnSac || "—"),
          rate: row.gstRate,
          taxable: 0,
          cgst: 0,
          sgst: 0,
          igst: 0,
          tax: 0,
        });
      }
      const group = groups.get(key);
      for (const name of ["taxable", "cgst", "sgst", "igst", "tax"]) {
        group[name] = round2(group[name] + numeric(row[name]));
      }
    }
    
    return {
      entries,
      gross: sum("gross"),
      discount: sum("discount"),
      taxable,
      cgst: sum("cgst"),
      sgst: sum("sgst"),
      igst: sum("igst"),
      tax,
      adjustment: round2(numeric(adjustment)),
      roundOff,
      grandTotal,
      groups: [...groups.values()],
    };
  }, [lines, details.supplyType, adjustment, roundToRupee]);

  // The QR embeds a compact, readable payment summary so a normal phone QR
  // scanner can display the information without fetching browser-local data.
  // This is NOT a UPI payment request or a government-verified e-invoice QR.
  const paymentQrSummary = useMemo(() => {
    const status = String(paymentInfo.status || "Pending").trim();
    const isPaid = /^(paid|completed|success)$/i.test(status);
    const isUnpaid = /^(pending|unpaid|not paid)$/i.test(status);

    // The Admin app currently records Paid/Pending, not a numeric paid amount.
    // Derive the amount only for those two unambiguous cases.
    const paidAmount = paymentInfo.paidAmount !== null
      ? Math.min(totals.grandTotal, Math.max(0, numeric(paymentInfo.paidAmount)))
      : isPaid
        ? totals.grandTotal
        : isUnpaid
          ? 0
          : null;
    const balanceDue = paidAmount === null
      ? null
      : round2(Math.max(0, totals.grandTotal - paidAmount));
    const amountText = (amount) => amount === null ? "Not recorded" : `INR ${money(amount)}`;

    // Include the invoice's actual saved/edited product rows in the QR.
    // Keep each item compact to preserve QR capacity and scan readability.
    const productLines = totals.entries.length
      ? totals.entries.flatMap((row, index) => {
          const productNumber = String(row.productNumber || "No code").trim();
          const description = String(row.description || "Unnamed item")
            .replace(/\s+/g, " ").trim();
          const hsn = String(row.hsnSac || "").trim();
          const productLabel = `${index + 1}. ${productNumber} | ${description}${hsn ? ` | HSN ${hsn}` : ""}`;
          const productAmounts = `Qty ${numeric(row.quantity)} x INR ${money(row.rate)} | Discount INR ${money(row.discount)} | GST ${numeric(row.gstRate)}% | Amount INR ${money(row.total)}`;
          return [productLabel, productAmounts];
        })
      : ["No products recorded"];

    const detailsText = [
      "THE CAM CREW_TVM - INVOICE & PAYMENT DETAILS",
      `Invoice: ${String(details.invoiceNumber || "").trim()}`,
      `Date: ${formatDate(details.invoiceDate)}`,
      `Customer: ${String(details.customerName || "").trim() || "Not recorded"}`,
      `Status: ${loadedInvoiceId ? status : "SAMPLE / NOT ISSUED"}`,
      `Payment Method: ${paymentInfo.method || "Not recorded"}`,
      "PRODUCT DETAILS:",
      ...productLines,
      "PAYMENT SUMMARY:",
      `Gross: INR ${money(totals.gross)}`,
      `Discount: INR ${money(totals.discount)}`,
      `Taxable: INR ${money(totals.taxable)}`,
      `CGST: INR ${money(totals.cgst)}`,
      `SGST: INR ${money(totals.sgst)}`,
      `IGST: INR ${money(totals.igst)}`,
      ...(totals.adjustment ? [`Adjustment: INR ${money(totals.adjustment)}`] : []),
      ...(totals.roundOff ? [`Round Off: INR ${money(totals.roundOff)}`] : []),
      `Grand Total: INR ${money(totals.grandTotal)}`,
      `Amount Paid: ${amountText(paidAmount)}`,
      `Balance Due: ${amountText(balanceDue)}`,
      ...(paymentInfo.reference ? [`Payment Ref: ${paymentInfo.reference}`] : []),
      ...(details.bankName ? [`Bank: ${details.bankName}`] : []),
      ...(details.bankAccountName ? [`Account Name: ${details.bankAccountName}`] : []),
      ...(details.bankAccountNumber ? [`Account No: ${details.bankAccountNumber}`] : []),
      ...(details.bankIfsc ? [`IFSC: ${details.bankIfsc}`] : []),
      ...(details.bankBranch ? [`Branch: ${details.bankBranch}`] : []),
      ...(details.bankUpiId ? [`UPI ID: ${details.bankUpiId}`] : []),
      "Payment details supplied by issuer; not independently verified.",
    ];

    return detailsText.join("\n");
  }, [details, paymentInfo, totals, loadedInvoiceId]);

  function saveChanges() {
    if (!loadedInvoiceId) {
      setMessage("Create an invoice from Dashboard → New Invoice before saving here.");
      return;
    }
    if (!details.customerName.trim()) {
      setMessage("Enter the consignee/customer name before saving.");
      return;
    }
    if (!lines.length || lines.some((line) =>
      !String(line.description || "").trim() || numeric(line.quantity) <= 0 ||
      numeric(line.rate) < 0 || numeric(line.discount) < 0 ||
      numeric(line.discount) > numeric(line.quantity) * numeric(line.rate) ||
      numeric(line.gst) < 0 || numeric(line.gst) > 100
    )) {
      setMessage("Enter valid product descriptions, quantities, rates, discounts and GST rates.");
      return;
    }
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      const invoices = Array.isArray(saved.invoices) ? saved.invoices : [];
      const original = invoices.find((invoice) => invoice.id === loadedInvoiceId);
      if (!original) {
        setMessage("The invoice was not found in localStorage; it was not overwritten.");
        return;
      }
      const id = String(details.invoiceNumber || "").trim();
      if (!id) {
        setMessage("Invoice number is required.");
        return;
      }
      if (id !== loadedInvoiceId && invoices.some((invoice) => invoice.id === id)) {
        setMessage("Another invoice already uses that invoice number.");
        return;
      }
      const updated = {
        ...original,
        id,
        date: details.invoiceDate,
        customerId: details.customerId,
        customerName: details.customerName,
        total: totals.grandTotal,
        items: lines.map((line) => ({
          number: line.productNumber,
          name: line.description,
          hsnSac: line.hsnSac,
          qty: numeric(line.quantity),
          price: numeric(line.rate),
          discount: numeric(line.discount),
          gst: numeric(line.gst),
        })),
        customerSnapshot: {
          customerName: details.customerName,
          customerCompany: details.customerCompany,
          customerAddress: details.customerAddress,
          customerCity: details.customerCity,
          customerState: details.customerState,
          customerPin: details.customerPin,
          customerPhone: details.customerPhone,
          customerEmail: details.customerEmail,
          customerGstin: details.customerGstin,
        },
        bankDetails: {
          bankAccountName: details.bankAccountName,
          bankName: details.bankName,
          bankAccountNumber: details.bankAccountNumber,
          bankIfsc: details.bankIfsc,
          bankBranch: details.bankBranch,
          bankUpiId: details.bankUpiId,
        },
        billMetadata: {
          ...Object.fromEntries([
            "sellerName", "sellerSubtitle", "sellerAddress", "sellerPhone", "sellerEmail",
            "sellerGstin", "terms", "placeOfSupply", "supplyType", "irn", "ackNo",
            "ackDate", "ewayNo", "qrImage", "declaration",
          ].map((field) => [field, details[field]])),
          adjustment: totals.adjustment,
          roundToRupee,
        },
      };
      const updatedData = {
        ...saved,
        invoices: invoices.map((invoice) => invoice.id === loadedInvoiceId ? updated : invoice),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData));
      sessionStorage.setItem(LATEST_KEY, JSON.stringify(updated));
      setLoadedInvoiceId(id);
      window.history.replaceState(null, "", `/bill?invoice=${encodeURIComponent(id)}`);
      setMessage("Invoice changes saved to this browser.");
      setEditing(false);
    } catch (error) {
      console.error("Invoice save failed", error);
      setMessage("Could not save invoice. Check browser storage availability.");
    }
  }

  const input = (field, label, options = {}) => (
    <FieldValue
      editing={editing}
      value={details[field]}
      onChange={(value) => updateDetail(field, value)}
      placeholder={label}
      {...options}
    />
  );

  return (
    <div className="gst-invoice-app">
      <div className="gst-toolbar no-print">
        <div className="gst-toolbar-heading">
          <strong>The Cam Crew_TVM</strong>
          <span>Classic black &amp; white A4 tax invoice</span>
        </div>
        <div className="gst-toolbar-actions">
          <button type="button" className="gst-btn gst-btn-outline" onClick={() => window.location.assign("/admin/dashboard")}>
            <ArrowLeft size={15} /> Dashboard
          </button>
          <button type="button" className="gst-btn gst-btn-outline" onClick={() => setEditing((old) => !old)}>
            <Pencil size={15} /> {editing ? "Done Editing" : "Edit Invoice"}
          </button>
          {editing && loadedInvoiceId && (
            <button type="button" className="gst-btn gst-btn-outline" onClick={saveChanges}>
              <Save size={15} /> Save Changes
            </button>
          )}
          <button type="button" className="gst-btn gst-btn-primary" onClick={() => window.print()}>
            <Printer size={15} /> Print / Save PDF
          </button>
        </div>
      </div>

      {!loadedInvoiceId && !message && (
        <div className="gst-demo-note no-print">Sample invoice shown for layout preview only. Product details and prices are examples, not official tax records.</div>
      )}

      {message && (
        <div className="gst-message no-print" role="status">
          {message}
          <button type="button" onClick={() => setMessage("")} aria-label="Dismiss message">×</button>
        </div>
      )}

      {editing && (
        <div className="gst-editor no-print">
          <div className="gst-editor-control">
            <label htmlFor="gst-existing-customer">Existing customer</label>
            <select
              id="gst-existing-customer"
              className="gst-field"
              value={customers.some((customer) => String(customer.id) === details.customerId) ? details.customerId : ""}
              onChange={(event) => chooseCustomer(event.target.value)}
            >
              <option value="">Manual customer details</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>{customer.name} — {customer.phone || customer.id}</option>
              ))}
            </select>
          </div>
          <div className="gst-editor-control">
            <label htmlFor="gst-supply">Supply / Tax Type</label>
            <select
              id="gst-supply"
              className="gst-field"
              value={details.supplyType}
              onChange={(event) => updateDetail("supplyType", event.target.value)}
            >
              <option value="intra">Within state (CGST + SGST)</option>
              <option value="inter">Interstate (IGST)</option>
            </select>
          </div>
          <label className="gst-editor-check">
            <input type="checkbox" checked={roundToRupee} onChange={(event) => setRoundToRupee(event.target.checked)} />
            Round total to nearest ₹
          </label>
          <span className="gst-editor-note">The QR contains invoice and payment details, including the saved payment status. It is not a UPI payment QR or an official IRP-signed e-invoice QR.</span>
        </div>
      )}

      <main className="gst-invoice-sheet" id="invoice">
        <header className="gst-company-head">
          <div className="gst-company-brand">
            <div className="gst-small-kicker">TRADITIONAL GST BILL</div>
            <h1>
              {editing ? input("sellerName", "Company name") : (
                <>The Cam Cr<span className="gst-red">e</span>w_TVM</>
              )}
            </h1>
            <p className="gst-company-subtitle">{input("sellerSubtitle", "Business subtitle")}</p>
            <p>{input("sellerAddress", "Business address")}</p>
            <p>Phone: {input("sellerPhone", "Business phone")}</p>
            <p>Email: {input("sellerEmail", "Business email")}</p>
            <p><b>GSTIN:</b> {input("sellerGstin", "Registered business GSTIN")}</p>
          </div>
          <div className="gst-invoice-head-meta">
            <div className="gst-invoice-title">TAX INVOICE <small>(GST INVOICE)</small></div>
            <div className="gst-invoice-meta-grid">
              <div><b>Invoice No.</b>{input("invoiceNumber", "Invoice number")}</div>
              <div><b>Invoice Date</b>{editing ? input("invoiceDate", "Invoice date", { type: "date" }) : <span>{formatDate(details.invoiceDate)}</span>}</div>
              <div><b>Customer ID</b>{input("customerId", "Customer ID")}</div>
              <div><b>Terms</b>{input("terms", "Payment terms")}</div>
            </div>
          </div>
        </header>

        <section className="gst-ledger-section">
          <div className="gst-ledger-customer">
            <div className="gst-ledger-heading">CONSIGNEE / BILL TO</div>
            <div className="gst-ledger-body">
              <div className="gst-ledger-grid">
                {[
                  ["Customer Name", "customerName", "Customer name"],
                  ["Company", "customerCompany", "Company name"],
                  ["City", "customerCity", "City"],
                  ["State", "customerState", "State"],
                  ["PIN Code", "customerPin", "PIN code"],
                  ["Phone", "customerPhone", "Phone number"],
                ].map(([label, key, placeholder]) => (
                  <div className="gst-ledger-field" key={key}>
                    <span className="gst-ledger-label">{label}</span>
                    <span className="gst-ledger-colon">:</span>
                    <div className="gst-ledger-value">{input(key, placeholder)}</div>
                  </div>
                ))}
              </div>
              <div className="gst-ledger-field gst-ledger-full">
                <span className="gst-ledger-label">Address</span>
                <span className="gst-ledger-colon">:</span>
                <div className="gst-ledger-value">{input("customerAddress", "Street address", { multiline: true })}</div>
              </div>
              <div className="gst-ledger-field gst-ledger-full">
                <span className="gst-ledger-label">Place of Supply</span>
                <span className="gst-ledger-colon">:</span>
                <div className="gst-ledger-value">{input("placeOfSupply", "Place of supply")}</div>
              </div>
            </div>
          </div>
          <aside className="gst-ledger-qr">
            <div className="gst-ledger-heading gst-ledger-qr-heading">INVOICE DETAILS QR</div>
            <div className="gst-ledger-qr-content">
              {details.invoiceNumber?.trim() ? (
                <>
                  <QRCodeSVG
                    value={paymentQrSummary}
                    size={240}
                    bgColor="#ffffff"
                    fgColor="#000000"
                    marginSize={2}
                    level="L"
                    style={{ maxWidth: "100%", height: "auto" }}
                    aria-label={`Invoice products and payment details QR: ${details.invoiceNumber}`}
                  />
                  <span className="gst-ledger-qr-number">{details.invoiceNumber}</span>
                  <span className="gst-ledger-qr-caption">Scan: Products &amp; Payment</span>
                </>
              ) : (
                <div className="gst-ledger-placeholder">Enter Invoice Number</div>
              )}
            </div>
          </aside>
        </section>
<section className="gst-product-section">
          {/* Catalogue is loaded from the same local store as Admin Products. */}
          {editing && (
            <div className="gst-catalog-search no-print">
              <ProductCatalogSearch
                products={productCatalog}
                onSelect={(product) => {
                  addCatalogProduct(product);
                }}
              />
            </div>
          )}
          <div className="gst-products-scroll">
            <table className="gst-products-table">
              <colgroup>
                <col style={{ width: "5%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "29%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "9%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "13%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Sl#</th>
                  <th>Product No.</th>
                  <th>Description of Goods / Services</th>
                  <th>HSN/SAC</th>
                  <th>Quantity</th>
                  <th>Rate</th>
                  <th>Discount</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {totals.entries.map((row, index) => (
                  <tr key={row.id}>
                    <td className="gst-number">{index + 1}</td>
                    <td>
                      {editing ? (
                        <input
                          className="gst-field gst-product-number"
                          value={row.productNumber || ""}
                          onChange={(e) => updateLine(row.id, "productNumber", e.target.value)}
                          placeholder="PRD-000001"
                        />
                      ) : (
                        <span className="gst-code-text">{row.productNumber || "—"}</span>
                      )}
                    </td>
                    <td className="gst-description">
                      {editing ? (
                        <>
                          <textarea
                            className="gst-field"
                            value={row.description || ""}
                            onChange={(e) => updateLine(row.id, "description", e.target.value)}
                            rows={2}
                            placeholder="Product / Service"
                          />
                          <label className="gst-inline-tax no-print">
                            GST %
                            <input
                              className="gst-field"
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={row.gst ?? ""}
                              onChange={(e) => updateLine(row.id, "gst", e.target.value)}
                            />
                          </label>
                          <button
                            type="button"
                            className="gst-remove no-print"
                            onClick={() => removeLine(row.id)}
                          >
                            <Trash2 size={12} /> Remove
                          </button>
                        </>
                      ) : (
                        <strong>{row.description || "—"}</strong>
                      )}
                    </td>
                    <td>
                      {editing ? (
                        <input
                          className="gst-field"
                          value={row.hsnSac || ""}
                          onChange={(e) => updateLine(row.id, "hsnSac", e.target.value)}
                          placeholder="HSN/SAC"
                        />
                      ) : (row.hsnSac || "—")}
                    </td>
                    <td className="gst-num">
                      {editing ? (
                        <input className="gst-field" type="number" step="0.001" min="0"
                          value={row.quantity} onChange={(e) => updateLine(row.id, "quantity", e.target.value)} />
                      ) : numeric(row.quantity).toFixed(3)}
                    </td>
                    <td className="gst-num">
                      {editing ? (
                        <input className="gst-field" type="number" min="0" step="0.01"
                          value={row.rate} onChange={(e) => updateLine(row.id, "rate", e.target.value)} />
                      ) : money(row.rate)}
                    </td>
                    <td className="gst-num">
                      {editing ? (
                        <input className="gst-field" type="number" min="0" step="0.01"
                          value={row.discount} onChange={(e) => updateLine(row.id, "discount", e.target.value)} />
                      ) : money(row.discount)}
                    </td>
                    <td className="gst-num gst-row-amount">{money(row.taxable)}</td>
                  </tr>
                ))}
                {totals.entries.length < 8 &&
                  Array.from({ length: 8 - totals.entries.length }, (_, index) => (
                    <tr className="gst-blank-row" key={`empty-${index}`}>
                      {Array.from({ length: 8 }, (_, cell) => <td key={cell}>&nbsp;</td>)}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="gst-totals-area">
          <div className="gst-total-left">
            <div className="gst-total-label">AMOUNT IN WORDS</div>
            <strong>{amountInWords(totals.grandTotal)}</strong>
          </div>
          <div className="gst-total-right">
            <div><span>Gross Amount</span><strong>{money(totals.gross)}</strong></div>
            <div><span>Discount</span><strong>− {money(totals.discount)}</strong></div>
            <div><span>Taxable Amount</span><strong>{money(totals.taxable)}</strong></div>
            <div><span>CGST</span><strong>{money(totals.cgst)}</strong></div>
            <div><span>SGST</span><strong>{money(totals.sgst)}</strong></div>
            <div><span>IGST</span><strong>{money(totals.igst)}</strong></div>
            {(totals.adjustment !== 0 || editing) && (
              <div><span>Adjustment</span>{editing ? <input className="gst-field gst-adjust-field" type="number" step="0.01" value={adjustment} onChange={(event) => setAdjustment(event.target.value)} /> : <strong>{money(totals.adjustment)}</strong>}</div>
            )}
            <div><span>Round Off</span><strong>{money(totals.roundOff)}</strong></div>
            <div className="gst-grand-total"><span>TOTAL</span><strong>₹ {money(totals.grandTotal)}</strong></div>
          </div>
        </section>

        <section className="gst-hsn-area">
          <div className="gst-section-label">HSN/SAC TAX SUMMARY</div>
          <table className="gst-hsn-table">
            <thead>
              <tr>
                <th>HSN/SAC</th><th>GST %</th><th>Taxable Value</th>
                <th>CGST</th><th>SGST</th><th>IGST</th><th>Tax Amount</th>
              </tr>
            </thead>
            <tbody>
              {totals.groups.map((group) => (
                <tr key={group.key}>
                  <td>{group.hsnSac}</td><td>{group.rate.toFixed(2)}</td>
                  <td>{money(group.taxable)}</td><td>{money(group.cgst)}</td>
                  <td>{money(group.sgst)}</td><td>{money(group.igst)}</td><td>{money(group.tax)}</td>
                </tr>
              ))}
              <tr className="gst-hsn-total">
                <td colSpan={2}>TOTAL</td><td>{money(totals.taxable)}</td>
                <td>{money(totals.cgst)}</td><td>{money(totals.sgst)}</td>
                <td>{money(totals.igst)}</td><td>{money(totals.tax)}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="gst-bottom-area">
          <div className="gst-bottom-left">
            <div className="gst-section-label">BANK DETAILS</div>
            <div className="gst-bank-grid">
              <DetailRow label="ACCOUNT NAME">{input("bankAccountName", "Account holder name")}</DetailRow>
              <DetailRow label="BANK">{input("bankName", "Bank name")}</DetailRow>
              <DetailRow label="A/C NO.">{input("bankAccountNumber", "Account number")}</DetailRow>
              <DetailRow label="BRANCH">{input("bankBranch", "Branch")}</DetailRow>
              <DetailRow label="IFSC">{input("bankIfsc", "IFSC code")}</DetailRow>
              {(editing || details.bankUpiId) && (
                <DetailRow label="UPI ID">{input("bankUpiId", "UPI ID (optional)")}</DetailRow>
              )}
            </div>
            <div className="gst-declaration">
              <b>DECLARATION</b>
              {input("declaration", "Declaration", { multiline: true })}
            </div>
          </div>
          <div className="gst-signatory">
            <strong>FOR {details.sellerName || "THE CAM CREW_TVM"}</strong>
            <div className="gst-signature-space" />
            <span>Authorised Signatory</span>
          </div>
        </section>


        <section className="gst-conditions">
          <strong>TERMS AND CONDITIONS</strong>
          <ol>{termsAndConditions.map((term) => <li key={term}>{term}</li>)}</ol>
        </section>
        <footer className="gst-footer">Invoice QR contains a text snapshot of the product list and recorded payment information. It does not confirm receipt of funds, initiate a payment, or serve as an official IRP-signed GST e-invoice QR. Verify details before issuing.</footer>
      </main>
    </div>
  );
}
