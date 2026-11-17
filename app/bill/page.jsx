"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Pencil,
  Plus,
  Printer,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { productPurchasePrice, maxAllowedLineDiscount, lineDiscountError, isServiceProduct } from "@/lib/billingDiscountLimit";
import "./bill.css";
import "./bill-split-edit.css";

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

// Show a discount as a percentage of the pre-GST gross amount.
// Four decimal places prevent a surprise change on mode switching.
function discountPercent(amount, gross) {
  const base = Math.max(0, numeric(gross));
  return base > 0 ? Number(((numeric(amount) / base) * 100).toFixed(4)) : 0;
}

function lineGrossAmount(line) {
  return round2(Math.max(0, numeric(line?.quantity)) * Math.max(0, numeric(line?.rate)));
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


// Product stock is read from the existing Admin Products catalogue.
// Missing stock values and Services are not treated as out-of-stock.
// This warning is visual only; it does not decrement stock or block billing.
function productStockWarning(product, quantity = 1) {
  if (!product || String(product.category || "").trim().toLowerCase().startsWith("service")) return null;
  const rawStock = product.stock;
  if (rawStock === null || rawStock === undefined || String(rawStock).trim() === "") return null;
  const available = Number(rawStock);
  if (!Number.isFinite(available) || available < 0) return null;
  if (available === 0) return "Out of Stock";
  if (Number(quantity) > available) return `Only ${available} in stock`;
  return null;
}

function ProductCatalogSearch({ products, onAdd }) {
  const [query, setQuery] = useState("");
  const [showMatches, setShowMatches] = useState(false);
  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    return products
      .filter((product) => String(product.status ?? "active").toLowerCase() !== "inactive")
      .filter((product) => !term || [
        product.number, product.productNumber, product.name,
        product.productName, product.hsnSac, product.category,
      ].some((part) => String(part ?? "").toLowerCase().includes(term)))
      .slice(0, 12);
  }, [products, query]);

  return (
    <div className="gst-compact-catalog-search">
      <label htmlFor="gst-compact-product-search"><Plus size={16} /> Add Product from Catalogue</label>
      <div className="gst-compact-catalog-input">
        <Search size={17} aria-hidden="true" />
        <input
          id="gst-compact-product-search"
          className="gst-field"
          type="search"
          autoComplete="off"
          placeholder="Search product number or name..."
          value={query}
          onChange={(event) => { setQuery(event.target.value); setShowMatches(true); }}
          onFocus={() => setShowMatches(true)}
          onKeyDown={(event) => { if (event.key === "Escape") setShowMatches(false); }}
          aria-expanded={showMatches}
          aria-controls="gst-compact-product-results"
        />
      </div>
      {showMatches && (
        <div id="gst-compact-product-results" className="gst-compact-catalog-results">
          {matches.length ? matches.map((product, index) => {
            const number = String(product.number ?? product.productNumber ?? product.code ?? "");
            const name = String(product.name ?? product.productName ?? "Unnamed product");
            const hasSalePrice = product.salePrice !== null && product.salePrice !== undefined && product.salePrice !== "";
            const rate = numeric(hasSalePrice ? product.salePrice : (product.price ?? product.rate ?? 0));
            const stockWarning = productStockWarning(product);
            return (
              <button
                type="button"
                className={`gst-compact-catalog-option${stockWarning ? " gst-stock-warning-option" : ""}`}
                title={stockWarning ? `${name}: ${stockWarning}` : undefined}
                key={`${product.id ?? number}-${index}`}
                onClick={() => {
                  if (onAdd(product)) {
                    setQuery("");
                    setShowMatches(false);
                  }
                }}
              >
                <span>
                  <strong>{number || "No product number"}</strong>
                  <small>{name}</small>
                  {stockWarning && <small className="gst-stock-warning-text">{stockWarning}</small>}
                </span>
                <b>₹{money(rate)}</b>
              </button>
            );
          }) : (
            <p className="gst-compact-catalog-empty">
              {products.length ? "No matching products." : "No products saved. Add products in Admin → Products first."}
            </p>
          )}
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
  const [billToCollapsed, setBillToCollapsed] = useState(true);
  const [productsCollapsed, setProductsCollapsed] = useState(true);
  // A missing key means minimized: existing and newly added products start compact.
  const [expandedProducts, setExpandedProducts] = useState({});
  const [productCatalog, setProductCatalog] = useState([]);
  // Drafts preserve what is being typed in the focused amount or % input.
  // The other field always reflects the saved numeric discount.
  const [totalDiscountDraft, setTotalDiscountDraft] = useState(null);
  const [lineDiscountDrafts, setLineDiscountDrafts] = useState({});
  const [discountError, setDiscountError] = useState("");
  const editBackupRef = useRef(null);
  const [message, setMessage] = useState("");
  const [loadedInvoiceId, setLoadedInvoiceId] = useState(null);
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
        purchasePrice: item.purchasePrice ?? null,
        isService: Boolean(item.isService),
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

    } catch (error) {
      console.error("Unable to load invoice", error);
      setMessage("Invoice data could not be loaded. Check your browser storage.");
    }
  }, []);


  useEffect(() => {
    const loadCatalog = () => {
      try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
        setProductCatalog(Array.isArray(stored.products) ? stored.products : []);
      } catch (error) {
        console.error("Unable to load product catalogue:", error);
        setProductCatalog([]);
      }
    };
    loadCatalog();
    window.addEventListener("focus", loadCatalog);
    window.addEventListener("storage", loadCatalog);
    const onVisibility = () => { if (!document.hidden) loadCatalog(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", loadCatalog);
      window.removeEventListener("storage", loadCatalog);
      document.removeEventListener("visibilitychange", onVisibility);
    };
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

  function catalogForLine(line) {
    const code = String(line?.productNumber ?? "").trim().toLowerCase();
    return productCatalog.find((product) => String(product.number ?? product.productNumber ?? product.code ?? "").trim().toLowerCase() === code);
  }

  function maxLineDiscount(line) {
    return maxAllowedLineDiscount(line, catalogForLine(line));
  }

  function updateLine(id, field, value) {
    const line = lines.find((entry) => entry.id === id);
    if (!line) return;
    const next = { ...line, [field]: value };
    const maximum = maxLineDiscount(next);
    if (field === "discount" && Number(value) > maximum) {
      next.discount = maximum;
      setMessage(`Maximum discount for ${line.description} is ₹${money(maximum)}; selling price cannot fall below purchase price.`);
    } else if ((field === "quantity" || field === "rate") && Number(next.discount) > maximum) {
      next.discount = maximum;
      setMessage(`Discount adjusted to ₹${money(maximum)} following the quantity or rate change.`);
    } else {
      setMessage("");
    }
    setLines((old) => old.map((entry) => entry.id === id ? next : entry));
    // Quantity changes can change the gross amount and therefore the percentage.
    setLineDiscountDrafts((previous) => {
      if (!previous[id]) return previous;
      const updated = { ...previous };
      delete updated[id];
      return updated;
    });
    setTotalDiscountDraft(null);
    setDiscountError("");
  }

  function addCatalogProduct(product) {
    if (!product) return false;
    const productNumber = String(product.number ?? product.productNumber ?? product.code ?? "").trim();
    const description = String(product.name ?? product.productName ?? product.description ?? "").trim();
    if (!productNumber || !description) {
      setMessage("Selected product needs a product number and name. Update it in Admin → Products.");
      return false;
    }
    const hasSalePrice = product.salePrice !== null && product.salePrice !== undefined && product.salePrice !== "";
    const rate = numeric(hasSalePrice ? product.salePrice : (product.price ?? product.sellingPrice ?? product.rate ?? 0));
    const existing = lines.find((line) =>
      String(line.productNumber).trim().toLowerCase() === productNumber.toLowerCase()
    );
    if (existing) {
      // Selecting the same catalogue item again increases its quantity by one.
      setLines((previous) => previous.map((line) =>
        line.id === existing.id ? { ...line, quantity: numeric(line.quantity) + 1 } : line
      ));
      setExpandedProducts((previous) => ({ ...previous, [existing.id]: false }));
      setLineDiscountDrafts((previous) => {
        const updated = { ...previous };
        delete updated[existing.id];
        return updated;
      });
    } else {
      const id = `catalog-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setLines((previous) => [...previous, {
        id,
        productNumber,
        description,
        hsnSac: String(product.hsnSac ?? product.hsn ?? ""),
        quantity: 1,
        rate,
        purchasePrice: productPurchasePrice(product),
        isService: isServiceProduct(product),
        discount: 0,
        gst: numeric(product.gst ?? product.gstPercentage ?? 0),
      }]);
      // The new row is minimized and shows only number + name.
      setExpandedProducts((previous) => ({ ...previous, [id]: false }));
    }
    setTotalDiscountDraft(null);
    setDiscountError("");
    setProductsCollapsed(false);
    const stockWarning = productStockWarning(product, existing ? numeric(existing.quantity) + 1 : 1);
    setMessage(stockWarning ? `${description}: ${stockWarning}. Highlighted in red.` : "");
    return true;
  }

  function stockWarningForLine(line) {
    const code = String(line.productNumber ?? "").trim().toLowerCase();
    if (!code) return null;
    const product = productCatalog.find((entry) =>
      String(entry.number ?? entry.productNumber ?? entry.code ?? "").trim().toLowerCase() === code
    );
    return productStockWarning(product, line.quantity);
  }

  function removeProduct(id) {
    setLines((previous) => previous.filter((line) => line.id !== id));
    setLineDiscountDrafts((previous) => {
      const updated = { ...previous };
      delete updated[id];
      return updated;
    });
    setExpandedProducts((previous) => {
      const next = { ...previous };
      delete next[id];
      return next;
    });
    setTotalDiscountDraft(null);
    setDiscountError("");
  }

  const totals = useMemo(() => {
    const entries = lines.map((line) => calculateRow(line, details.supplyType));
    const sum = (key) => round2(entries.reduce((acc, row) => acc + numeric(row[key]), 0));
    const taxable = sum("taxable");
    const tax = sum("tax");
    const grandTotal = round2(taxable + tax);

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
      grandTotal,
      groups: [...groups.values()],
    };
  }, [lines, details.supplyType]);

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

  // Two linked inputs: Amount (₹) and Percentage (%) always show together.
  // Percentage is computed from the gross amount BEFORE GST.
  // Apply the total discount in paise across products without breaching any
  // product's purchase-cost floor.
  function changeTotalDiscount(rawValue, field) {
    setTotalDiscountDraft({ field, value: rawValue });

    if (rawValue === "") {
      setLines((previous) => previous.map((line) => ({ ...line, discount: 0 })));
      setDiscountError("");
      return;
    }

    const requested = Number(rawValue);
    const limitPaise = lines.map((line) => Math.round(maxLineDiscount(line) * 100));
    const totalLimitPaise = limitPaise.reduce((sum, amount) => sum + amount, 0);
    const gross = totals.gross;
    const maximumPercent = discountPercent(totalLimitPaise / 100, gross);
    const requestedAmount = field === "percentage" ? gross * requested / 100 : requested;
    const requestedPaise = Math.round(requestedAmount * 100);

    if (
      !Number.isFinite(requested) || requested < 0 ||
      (field === "percentage" && (requested > 100 || (gross <= 0 && requested > 0))) ||
      !Number.isFinite(requestedPaise) || requestedPaise > totalLimitPaise
    ) {
      setDiscountError(
        `Maximum allowed invoice discount: ₹${money(totalLimitPaise / 100)} ` +
        `(${maximumPercent}% of the pre-GST amount). ` +
        "Discount cannot reduce any product below its purchase cost."
      );
      return; // Keep the previously applied discount until a valid value is entered.
    }
    setDiscountError("");

    if (totalLimitPaise === 0) {
      setLines((previous) => previous.map((line) => ({ ...line, discount: 0 })));
      return;
    }

    // Distribute proportionally based on available cost-safe discount capacity.
    // Largest-remainder rounding makes the allocated paise equal the exact total.
    const ideal = limitPaise.map((capacity) => requestedPaise * capacity / totalLimitPaise);
    const shares = ideal.map(Math.floor);
    let remainder = requestedPaise - shares.reduce((sum, amount) => sum + amount, 0);
    const priority = ideal
      .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
      .sort((a, b) => b.fraction - a.fraction);
    for (const { index } of priority) {
      if (remainder <= 0) break;
      if (shares[index] < limitPaise[index]) {
        shares[index] += 1;
        remainder--;
      }
    }

    setLines((previous) => previous.map((line, index) => ({
      ...line,
      discount: (shares[index] || 0) / 100,
    })));
    setLineDiscountDrafts({}); // A total discount updates all product discount inputs.
  }

  function changeLineDiscount(line, rawValue, field) {
    const gross = lineGrossAmount(line);
    const requested = rawValue === "" ? 0 : Number(rawValue);
    const converted = field === "percentage" ? gross * requested / 100 : requested;
    const amount = round2(converted);
    const maximum = maxLineDiscount(line);

    if (!Number.isFinite(requested) || requested < 0 ||
        (field === "percentage" && requested > 100) ||
        !Number.isFinite(amount)) {
      setMessage("Enter a valid non-negative discount percentage (0–100) or amount.");
      return;
    }

    // Existing updateLine clamps excessive discounts to their purchase-cost floor.
    updateLine(line.id, "discount", amount);
    if (amount <= maximum) {
      // Preserve decimals/empty values during typing without breaking linkage.
      setLineDiscountDrafts((previous) => ({
        ...previous,
        [line.id]: { field, value: rawValue },
      }));
    }
  }

  // Edit only Bill To and product rows; all other invoice fields stay read-only.
  function startSimpleEdit() {
    editBackupRef.current = {
      details: { ...details },
      lines: lines.map((line) => ({ ...line })),
    };
    setMessage("");
    setBillToCollapsed(true);
    setProductsCollapsed(true);
    setExpandedProducts({});
    setTotalDiscountDraft(null);
    setLineDiscountDrafts({});
    setDiscountError("");
    setEditing(true);
  }

  function cancelSimpleEdit() {
    const snapshot = editBackupRef.current;
    if (snapshot) {
      setDetails(snapshot.details);
      setLines(snapshot.lines);
    }
    editBackupRef.current = null;
    setEditing(false);
    setTotalDiscountDraft(null);
    setDiscountError("");
    setMessage("");
  }

  function saveChanges() {
    if (discountError) {
      setMessage(discountError);
      return;
    }
    if (!loadedInvoiceId) {
      setMessage("Create an invoice from Dashboard → New Invoice before saving here.");
      return;
    }
    if (!details.customerName.trim()) {
      setMessage("Enter the consignee/customer name before saving.");
      return;
    }
    if (!lines.length || lines.some((line) => {
      const quantity = Number(line.quantity);
      const rate = Number(line.rate);
      const discount = Number(line.discount);
      const gst = Number(line.gst);
      return !String(line.description || "").trim() ||
        !Number.isFinite(quantity) || quantity <= 0 ||
        !Number.isFinite(rate) || rate < 0 ||
        Boolean(lineDiscountError(line, catalogForLine(line))) ||
        !Number.isFinite(gst) || gst < 0 || gst > 100;
    })) {
      setMessage("Invalid discount: a product cannot be sold below its purchase price. Set Purchase Price in Products & Services if needed.");
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
      // Retain invoice ID, date, seller details, bank settings, payment and GST type.
      const updated = {
        ...original,
        customerId: details.customerId,
        customerName: details.customerName.trim(),
        total: totals.grandTotal,
        items: lines.map((line) => ({
          number: String(line.productNumber || "").trim(),
          name: String(line.description || "").trim(),
          hsnSac: String(line.hsnSac || "").trim(),
          qty: numeric(line.quantity),
          price: numeric(line.rate),
          purchasePrice: line.purchasePrice ?? productPurchasePrice(catalogForLine(line)),
          isService: Boolean(line.isService || isServiceProduct(catalogForLine(line))),
          discount: numeric(line.discount),
          gst: numeric(line.gst),
        })),
        customerSnapshot: {
          ...original.customerSnapshot,
          customerName: details.customerName.trim(),
          customerCompany: details.customerCompany,
          customerAddress: details.customerAddress,
          customerCity: details.customerCity,
          customerState: details.customerState,
          customerPin: details.customerPin,
          customerPhone: details.customerPhone,
          customerEmail: details.customerEmail,
          customerGstin: details.customerGstin,
        },
        billMetadata: {
          ...original.billMetadata,
          placeOfSupply: details.placeOfSupply,
          adjustment: 0,
          roundToRupee: false,
          manualRoundOff: null,
        },
      };
      const updatedData = {
        ...saved,
        invoices: invoices.map((invoice) => invoice.id === loadedInvoiceId ? updated : invoice),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData));
      sessionStorage.setItem(LATEST_KEY, JSON.stringify(updated));
      setMessage("Bill To, products and discounts saved successfully.");
      editBackupRef.current = null;
      setEditing(false);
      setTotalDiscountDraft(null);
      setDiscountError("");
    } catch (error) {
      console.error("Invoice save failed", error);
      setMessage("Could not save invoice. Check browser storage availability.");
    }
  }

  const input = (field, label, options = {}) => (
    <FieldValue
      editing={false}
      value={details[field]}
      onChange={(value) => updateDetail(field, value)}
      placeholder={label}
      {...options}
    />
  );

  return (
    <div className={`gst-invoice-app${editing ? " gst-split-edit-mode" : ""}`}>
      <div className="gst-toolbar no-print">
        <div className="gst-toolbar-heading">
          <strong>The Cam Crew_TVM</strong>
          <span>Classic black &amp; white A4 tax invoice</span>
        </div>
        
<div className="gst-toolbar-actions">
  <button
    type="button"
    className="gst-btn gst-btn-outline"
    onClick={() =>
      window.location.assign("/admin/dashboard?fromLogin=1")
    }
  >
    <ArrowLeft size={15} /> Dashboard
  </button>

          {!editing ? (
            <button type="button" className="gst-btn gst-btn-outline" onClick={startSimpleEdit}>
              <Pencil size={15} /> Edit Bill
            </button>
          ) : (
            <>
              <button type="button" className="gst-btn gst-btn-outline" onClick={cancelSimpleEdit}>
                Cancel
              </button>
              <button type="button" className="gst-btn gst-btn-outline" onClick={saveChanges} disabled={!loadedInvoiceId || Boolean(discountError)}>
                <Save size={15} /> Save Changes
              </button>
            </>
          )}
          <button type="button" className="gst-btn gst-btn-primary" onClick={() => window.print()}
            disabled={editing} title={editing ? "Save or cancel before printing" : "Print the invoice"}>
            <Printer size={15} /> Print / Save PDF
          </button>
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
      </div>

      

      <div className={`gst-bill-workspace${editing ? " is-editing" : ""}`}>
      {editing && (
        <section className="gst-simple-editor no-print" aria-label="Invoice editing form">
          <div className="gst-simple-editor-heading">
            <div>
              <span className="gst-simple-editor-kicker">EASY INVOICE EDITOR</span>
              <h2>Edit Invoice</h2>
              <p>Edit Bill To, add products and adjust discounts. The bill updates on the right.</p>
            </div>
          </div>

          <div className="gst-simple-editor-panel gst-simple-billto-panel">
            <div className="gst-simple-editor-panel-head gst-simple-billto-head">
              <span className="gst-simple-editor-step">01</span>
              <div className="gst-simple-panel-title">
                <h3>CONSIGNEE / BILL TO</h3>
                <p>{billToCollapsed ? "Customer details hidden — click Expand to edit." : "Choose a customer or edit the invoice contact details."}</p>
              </div>
              <button
                type="button"
                className="gst-simple-collapse-btn"
                onClick={() => setBillToCollapsed((previous) => !previous)}
                aria-expanded={!billToCollapsed}
                aria-controls="gst-billto-edit-fields"
                title={billToCollapsed ? "Expand Bill To details" : "Minimize Bill To details"}
              >
                {billToCollapsed ? <ChevronDown size={17} /> : <ChevronUp size={17} />}
                <span>{billToCollapsed ? "Expand" : "Minimize"}</span>
              </button>
            </div>
            {billToCollapsed && (
              <div className="gst-simple-billto-summary">
                <strong>{details.customerName?.trim() || "No customer name entered"}</strong>
                <span>{[details.customerPhone, details.customerCity, details.customerState].filter(Boolean).join(" · ") || "Expand to enter customer information"}</span>
              </div>
            )}
            <div id="gst-billto-edit-fields" hidden={billToCollapsed}>
            <div className="gst-simple-customer-select">
              <label htmlFor="gst-existing-customer">Select Existing Customer</label>
              <select
                id="gst-existing-customer"
                className="gst-field"
                value={customers.some((customer) => String(customer.id) === String(details.customerId)) ? details.customerId : ""}
                onChange={(event) => {
                  if (event.target.value) chooseCustomer(event.target.value);
                  else updateDetail("customerId", "");
                }}
              >
                <option value="">Manual customer details</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} — {customer.phone || customer.id}
                  </option>
                ))}
              </select>
            </div>
            <div className="gst-simple-fields">
              {[
                ["customerName", "Customer Name *"],
                ["customerCompany", "Company"],
                ["customerPhone", "Phone"],
                ["customerEmail", "Email"],
                ["customerCity", "City"],
                ["customerState", "State"],
                ["customerPin", "PIN Code"],
                ["customerGstin", "GSTIN"],
                ["placeOfSupply", "Place of Supply"],
              ].map(([key, label]) => (
                <label key={key} className="gst-simple-field">
                  <span>{label}</span>
                  <input
                    className="gst-field"
                    value={details[key] ?? ""}
                    onChange={(event) => updateDetail(key, event.target.value)}
                    required={key === "customerName"}
                    type={key === "customerEmail" ? "email" : key === "customerPhone" ? "tel" : "text"}
                    placeholder={label.replace(" *", "")}
                  />
                </label>
              ))}
              <label className="gst-simple-field gst-simple-wide">
                <span>Full Address</span>
                <textarea
                  className="gst-field"
                  rows={2}
                  value={details.customerAddress ?? ""}
                  onChange={(event) => updateDetail("customerAddress", event.target.value)}
                  placeholder="House name, street, locality..."
                />
              </label>
            </div>
            <p className="gst-simple-help">Customer changes apply to this invoice only; the saved customer catalogue is not modified.</p>
            </div>
          </div>

          {/* Products can be added from catalogue; individual rows minimize by default. */}
          <div className="gst-simple-editor-panel gst-simple-products-panel">
            <div className="gst-simple-editor-panel-head gst-simple-products-head">
              <span className="gst-simple-editor-step">02</span>
              <div className="gst-simple-panel-title">
                <h3>PRODUCTS</h3>
                <p>{productsCollapsed ? `${lines.length} product(s) — click Expand.` : "Add products and edit discounts."}</p>
              </div>
              <button
                type="button"
                className="gst-simple-collapse-btn"
                onClick={() => setProductsCollapsed((previous) => !previous)}
                aria-expanded={!productsCollapsed}
                aria-controls="gst-products-edit-fields"
              >
                {productsCollapsed ? <ChevronDown size={17} /> : <ChevronUp size={17} />}
                <span>{productsCollapsed ? "Expand" : "Minimize"}</span>
              </button>
            </div>
            {productsCollapsed && (
              <div className="gst-simple-products-summary">
                <strong>{lines.length} product{lines.length === 1 ? "" : "s"}</strong>
              </div>
            )}
            <div id="gst-products-edit-fields" hidden={productsCollapsed}>
              <ProductCatalogSearch products={productCatalog} onAdd={addCatalogProduct} />
              <div className="gst-simple-products-list">
                {lines.map((line) => {
                  const isExpanded = Boolean(expandedProducts[line.id]);
                  const stockWarning = stockWarningForLine(line);
                  const fieldId = `gst-product-details-${line.id}`;
                  return (
                    <div className={`gst-simple-product gst-compact-product${stockWarning ? " gst-stock-warning-row" : ""}`} key={line.id} title={stockWarning || undefined}>
                      <button
                        type="button"
                        className="gst-compact-product-head"
                        aria-expanded={isExpanded}
                        aria-controls={fieldId}
                        onClick={() => setExpandedProducts((previous) => ({ ...previous, [line.id]: !previous[line.id] }))}
                        title={isExpanded ? "Minimize product" : "Expand product"}
                      >
                        <span className="gst-compact-product-identity">
                          <strong>{line.productNumber || "—"}</strong>
                          <span>{line.description || "Unnamed product"}</span>
                        </span>
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                      {isExpanded && (
                        <div id={fieldId} className="gst-compact-product-expanded">
                          {stockWarning && <p role="status" className="gst-stock-warning-line">{stockWarning} — check stock before issuing this bill.</p>}
                          <div className="gst-simple-product-values">
                            <label className="gst-simple-readonly-value gst-simple-editable-quantity">
                              <span>Quantity</span>
                              <input
                                className="gst-field gst-quantity-input"
                                type="number"
                                inputMode="decimal"
                                min="0.001"
                                step="0.001"
                                required
                                value={line.quantity ?? ""}
                                onChange={(event) =>
                                  updateLine(line.id, "quantity", event.target.value)
                                }
                                aria-label={`Quantity for ${line.description || line.productNumber || "product"}`}
                              />
                            </label>
                            <div className="gst-simple-readonly-value">
                              <span>Rate</span><strong>₹{money(line.rate)}</strong>
                            </div>
                            <div className="gst-simple-readonly-value">
                              <span>HSN/SAC</span><strong>{line.hsnSac || "—"}</strong>
                            </div>
                            <div className="gst-simple-readonly-value">
                              <span>GST</span><strong>{numeric(line.gst)}%</strong>
                            </div>
                            <div className="gst-simple-field gst-simple-item-discount">
                              <span>Product Discount</span>
                              <div className="gst-linked-discount-fields">
                                <label htmlFor={`gst-discount-amount-${line.id}`}>
                                  <span>Discount Amount (₹)</span>
                                  <input
                                    id={`gst-discount-amount-${line.id}`}
                                    className="gst-field"
                                    type="number"
                                    inputMode="decimal"
                                    min="0"
                                    max={maxLineDiscount(line)}
                                    step="0.01"
                                    value={lineDiscountDrafts[line.id]?.field === "amount"
                                      ? lineDiscountDrafts[line.id].value
                                      : String(round2(line.discount))}
                                    onChange={(event) => changeLineDiscount(line, event.target.value, "amount")}
                                  />
                                </label>
                                <label htmlFor={`gst-discount-percent-${line.id}`}>
                                  <span>Discount Percentage (%)</span>
                                  <input
                                    id={`gst-discount-percent-${line.id}`}
                                    className="gst-field"
                                    type="number"
                                    inputMode="decimal"
                                    min="0"
                                    max={discountPercent(maxLineDiscount(line), lineGrossAmount(line))}
                                    step="any"
                                    disabled={lineGrossAmount(line) <= 0}
                                    value={lineDiscountDrafts[line.id]?.field === "percentage"
                                      ? lineDiscountDrafts[line.id].value
                                      : String(discountPercent(line.discount, lineGrossAmount(line)))}
                                    onChange={(event) => changeLineDiscount(line, event.target.value, "percentage")}
                                  />
                                </label>
                              </div>
                              <small className="gst-simple-discount-note">
                                Applied: ₹{money(line.discount)}. Maximum: ₹{money(maxLineDiscount(line))}
                                {` (${discountPercent(maxLineDiscount(line), lineGrossAmount(line))}% of product gross)`}
                              </small>
                            </div>
                          </div>
                          <div className="gst-compact-product-actions">
                            <span>Taxable ₹{money(calculateRow(line, details.supplyType).taxable)}</span>
                            <button type="button" className="gst-simple-remove" onClick={() => removeProduct(line.id)}>
                              <Trash2 size={14} /> Remove Product
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {!lines.length && <p className="gst-simple-no-products">No products recorded. Search above to add one.</p>}
              </div>
            </div>
          </div>

          {/* Discount remains editable even when Products is minimized. */}
          <div className="gst-simple-editor-panel gst-simple-adjustments-panel">
            <div className="gst-simple-editor-panel-head">
              <span className="gst-simple-editor-step">03</span>
              <div className="gst-simple-panel-title">
                <h3>DISCOUNT</h3>
                <p>Set the invoice discount; GST and total update automatically.</p>
              </div>
            </div>
            <div className="gst-simple-discount-box">
              <div className="gst-simple-discount-title">
                <strong>Total Invoice Discount</strong>
                <p>Distributed proportionally across the existing items so GST stays accurate.</p>
              </div>
              <div className="gst-linked-discount-fields gst-linked-total-discount-fields">
                <label className="gst-simple-field gst-simple-discount-input" htmlFor="gst-total-discount-amount">
                  <span>Total Discount Amount (₹)</span>
                  <input
                    id="gst-total-discount-amount"
                    className="gst-field"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max={round2(lines.reduce((sum, line) => sum + maxLineDiscount(line), 0))}
                    step="0.01"
                    disabled={!lines.length}
                    value={totalDiscountDraft?.field === "amount"
                      ? totalDiscountDraft.value : String(round2(totals.discount))}
                    onChange={(event) => changeTotalDiscount(event.target.value, "amount")}
                    aria-invalid={Boolean(discountError) && totalDiscountDraft?.field === "amount"}
                    aria-describedby="gst-total-discount-help"
                  />
                </label>
                <label className="gst-simple-field gst-simple-discount-input" htmlFor="gst-total-discount-percentage">
                  <span>Total Discount Percentage (%)</span>
                  <input
                    id="gst-total-discount-percentage"
                    className="gst-field"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max={discountPercent(lines.reduce((sum, line) => sum + maxLineDiscount(line), 0), totals.gross)}
                    step="any"
                    disabled={!lines.length || totals.gross <= 0}
                    value={totalDiscountDraft?.field === "percentage"
                      ? totalDiscountDraft.value : String(discountPercent(totals.discount, totals.gross))}
                    onChange={(event) => changeTotalDiscount(event.target.value, "percentage")}
                    aria-invalid={Boolean(discountError) && totalDiscountDraft?.field === "percentage"}
                    aria-describedby="gst-total-discount-help"
                  />
                </label>
              </div>
              <p id="gst-total-discount-help" className="gst-simple-discount-note">
                Maximum allowed: ₹{money(lines.reduce((sum, line) => sum + maxLineDiscount(line), 0))}
                {` (${discountPercent(lines.reduce((sum, line) => sum + maxLineDiscount(line), 0), totals.gross)}% of pre-GST gross). `}
                Discounts cannot reduce products below purchase price. Missing costs must be entered in Products &amp; Services.
              </p>
              {discountError && <p className="gst-simple-discount-error" role="alert">{discountError}</p>}
              <div className="gst-simple-discount-calculation">
                <span>Gross: ₹ {money(totals.gross)}</span>
                <span>Discount: − ₹ {money(totals.discount)}</span>
                <strong>Taxable: ₹ {money(totals.taxable)}</strong>
              </div>
            </div>
          </div>

          <div className="gst-simple-editor-footer">
            <div className="gst-simple-total-preview">Invoice Total: <strong>₹ {money(totals.grandTotal)}</strong></div>
            <div className="gst-simple-footer-actions">
              <button type="button" className="gst-simple-cancel-btn" onClick={cancelSimpleEdit}>Cancel</button>
              <button type="button" className="gst-simple-save-btn" onClick={saveChanges} disabled={!loadedInvoiceId || Boolean(discountError)}>
                <Save size={16} /> Save Bill Changes
              </button>
            </div>
          </div>
        </section>
      )}

      <section className={`gst-live-bill${editing ? " is-live-preview" : ""}`} aria-label="Live invoice preview">
        {editing && (
          <div className="gst-live-preview-head no-print">
            <div>
              <strong>Live Bill Preview</strong>
              <span>Updates automatically as you edit the left panel</span>
            </div>
            <span className="gst-live-status"><span /> LIVE</span>
          </div>
        )}
        <div className="gst-bill-paper-scale">
      <main className="gst-invoice-sheet" id="invoice">
        <header className="gst-company-head">
          <div className="gst-company-brand">
            <div className="gst-small-kicker">TRADITIONAL GST BILL</div>
            <h1>
              <>The Cam Cr<span className="gst-red">e</span>w_TVM</>
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
              <div><b>Invoice Date</b><span>{formatDate(details.invoiceDate)}</span></div>
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
          <div className="gst-products-scroll">
            <table className="gst-products-table">
              {/* Seven column widths = seven table headers. */}
              <colgroup>
                <col style={{ width: "5%" }} />
                <col style={{ width: "13%" }} />
                <col style={{ width: "34%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "14%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Sl#</th>
                  <th>Product No.</th>
                  <th>Description of Goods / Services</th>
                  <th>HSN/SAC</th>
                  <th>Quantity</th>
                  <th>Rate</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {totals.entries.map((row, index) => (
                  <tr key={row.id} className={editing && stockWarningForLine(row) ? "gst-stock-warning-preview" : undefined} title={editing ? (stockWarningForLine(row) || undefined) : undefined}>
                    <td className="gst-number">{index + 1}</td>
                    <td className="gst-number"><span className="gst-code-text">{row.productNumber || "—"}</span></td>
                    <td className="gst-description"><strong>{row.description || "—"}</strong></td>
                    <td className="gst-number">{row.hsnSac || "—"}</td>
                    <td className="gst-num">{numeric(row.quantity).toFixed(3)}</td>
                    <td className="gst-num">{money(row.rate)}</td>
                    <td className="gst-num gst-row-amount">{money(row.taxable)}</td>
                  </tr>
                ))}
                {totals.entries.length < 6 &&
                  Array.from({ length: 6 - totals.entries.length }, (_, index) => (
                    <tr className="gst-blank-row" key={`empty-${index}`}>
                      {Array.from({ length: 7 }, (_, cell) => <td key={cell}>&nbsp;</td>)}
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
              {Boolean(details.bankUpiId) && (
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
      </section>
      </div>
    </div>
  );
}
