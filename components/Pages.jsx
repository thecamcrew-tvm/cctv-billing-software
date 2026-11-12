'use client';
import { useState, useMemo, useEffect, useRef, useId } from 'react';
import { useStore } from '@/lib/store';
import { currency, shortCurrency, niceDate, isoToday } from '@/lib/data';
import { SummaryCards, SalesGraph, PaymentAnalytics, RecentInvoices, QuickActions } from './Widgets';
import { Plus, Search, Eye, Trash2, Printer, ArrowLeft, Save, Check, Download, FileText, Users, Package, Wallet, Receipt, ChartNoAxesCombined, Settings as SettingsIcon, RotateCcw, Edit2, CalendarDays, X } from 'lucide-react';
// Open the same bill design used after saving a new invoice.
function openBillInvoice(invoiceId) {
  if (!invoiceId) {
    alert('Invoice number is missing.');
    return;
  }

  window.location.assign(`/bill?invoice=${encodeURIComponent(invoiceId)}`);
}

const blankCustomer = { name: '', company: '', phone: '', email: '', address: '', city: '', state: 'Kerala', pin: '', gstin: '' };
const blankProduct = { number: '', name: '', category: 'CCTV Cameras', hsnSac: '', price: '', gst: 18, stock: '' };

// Same per-line calculation used by the classic GST bill.
function invoiceLineTotals(item) {
  const qty = Number(item.qty) || 0;
  const rate = Number(item.price) || 0;
  const gross = Math.round((qty * rate + Number.EPSILON) * 100) / 100;
  const discount = Math.min(gross, Math.max(0, Number(item.discount) || 0));
  const taxable = Math.round((gross - discount + Number.EPSILON) * 100) / 100;
  const tax = Math.round((taxable * (Number(item.gst) || 0) / 100 + Number.EPSILON) * 100) / 100;
  return { gross, discount, taxable, tax, total: Math.round((taxable + tax + Number.EPSILON) * 100) / 100 };
}

const Field = ({ title, children }) =>
  <div>
    <label className="label">{title}</label>{children}
  </div>
  ;
const Top = ({ title, subtitle, action }) =>
  <div className="mb-6 flex items-start sm:items-center justify-between gap-4 flex-wrap">
    <div>
      <h1 className="page-title">{title}</h1>{subtitle && <p className="text-[13px] muted mt-1">{subtitle}</p>}
    </div>
    {action}
  </div>
  ;
const Empty = ({ text }) =>
  <div className="py-14 text-center muted text-sm">{text}
  </div>
  ;
const Button = ({
  children,
  onClick,
  kind = "primary",
  block = false,
  className = "",
  type = "button",
  ...props
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`
        btn
        btn-${kind}
        ${block ? "w-full" : ""}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
};
/**
 * Search existing customers by name, company, phone or GSTIN.
 * Calls the existing selectCustomer(id) function in NewInvoice.
 */
function SearchableCustomerSelect({ customers = [], selectedCustomer, onSelect }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapperRef = useRef(null);
  const listId = useId();

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    return customers
      .filter((customer) =>
        [customer.name, customer.company, customer.phone, customer.gstin, customer.email]
          .some((value) => String(value ?? '').toLowerCase().includes(term))
      )
      .slice(0, 40);
  }, [customers, query]);

  useEffect(() => {
    if (!open) return;
    function closeOnOutsideClick(event) {
      if (!wrapperRef.current?.contains(event.target)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, [open]);

  function choose(customer) {
    onSelect(String(customer.id));
    setQuery('');
    setActiveIndex(0);
    setOpen(false);
  }

  const selectedLabel = selectedCustomer
    ? `${selectedCustomer.name}${selectedCustomer.phone ? ` — ${selectedCustomer.phone}` : ''}`
    : '';

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <Search
        size={17}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#819288]"
      />
      <input
        type="text"
        className="field !pl-10 !pr-10"
        placeholder="Search customer name, phone, company..."
        value={open ? query : selectedLabel}
        autoComplete="off"
        role="combobox"
        aria-label="Search and select customer"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && matches.length ? `${listId}-option-${Math.min(activeIndex, matches.length - 1)}` : undefined}
        onFocus={() => {
          setQuery('');
          setActiveIndex(0);
          setOpen(true);
        }}
        onChange={(event) => {
          const value = event.target.value;
          setQuery(value);
          setActiveIndex(0);
          setOpen(true);
          // Prevent saving an invoice with an old selection after typing a new name.
          if (selectedCustomer) onSelect('');
        }}
        onKeyDown={(event) => {
          if (!open) return;
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActiveIndex((previous) => Math.min(previous + 1, Math.max(0, matches.length - 1)));
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveIndex((previous) => Math.max(0, previous - 1));
          } else if (event.key === 'Enter' && matches.length) {
            event.preventDefault();
            choose(matches[Math.min(activeIndex, matches.length - 1)]);
          } else if (event.key === 'Escape') {
            setOpen(false);
            setQuery('');
            event.currentTarget.blur();
          }
        }}
      />
      {selectedCustomer && !open && (
        <button
          type="button"
          onClick={() => {
            onSelect('');
            setQuery('');
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-500 hover:bg-gray-100"
          aria-label="Clear selected customer"
          title="Clear selection"
        >
          <X size={16} />
        </button>
      )}
      {open && (
        <div
          id={listId}
          role="listbox"
          aria-label="Matching customers"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border border-[#d9e8dd] bg-white p-1 shadow-xl"
        >
          {matches.length ? (
            matches.map((customer, index) => (
              <button
                key={customer.id}
                id={`${listId}-option-${index}`}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(customer)}
                className={`block w-full rounded-lg px-3 py-2.5 text-left transition-colors ${
                  index === activeIndex ? 'bg-[#eaf7ed]' : 'hover:bg-[#f2f8f3]'
                }`}
              >
                <span className="block text-sm font-semibold text-[#165035]">{customer.name}</span>
                <span className="mt-0.5 block text-xs text-[#68796d]">
                  {[customer.phone, customer.company, customer.gstin ? `GSTIN: ${customer.gstin}` : '']
                    .filter(Boolean).join(' · ') || 'Customer'}
                </span>
              </button>
            ))
          ) : (
            <p className="px-3 py-4 text-center text-sm text-gray-500">
              No customers found. Use Add Customer to create a new record.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function Dashboard({ go, view }) {
  const { invoices, customers, products } = useStore();
  return <>
    <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
      <div className="border-l-4 border-[#cdaa34] pl-5">
        <h1 className="text-[29px] md:text-[34px] font-bold tracking-tight text-[#063e2b]">Welcome Back, Admin!</h1>
        <p className="text-[13px] muted mt-1">Here's your business overview for today.</p>
      </div>
      <span className="flex gap-2 items-center bg-white border border-[#eee9da] rounded-xl px-4 py-3 shadow-sm text-xs font-semibold"><CalendarDays size={18} className="text-[#087747]" />{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</span>
    </div>
    <SummaryCards invoices={invoices} customers={customers} products={products} />
    <div className="grid grid-cols-1 xl:grid-cols-[1.65fr_1fr] gap-5 mt-5"><SalesGraph /><PaymentAnalytics total={invoices.length === 4 ? 125430 : invoices.reduce((s, i) => s + i.total, 0)} />
    </div>
    <div className="grid grid-cols-1 xl:grid-cols-[1.65fr_1fr] gap-5 mt-5"><RecentInvoices invoices={invoices} onView={openBillInvoice} onAll={() => go('invoices')} /><QuickActions go={go} />
    </div>
  </>;
}
export function Invoices({ go, view }) {
  const { invoices, customers, update } = useStore();
  const [query, setQuery] = useState(''), [status, setStatus] = useState('All');
  useEffect(() => {
    const q = sessionStorage.getItem('cam-crew-search');
    if (q) {
      setQuery(q);
      sessionStorage.removeItem('cam-crew-search');
    }
  }, []);
  const filtered = invoices.filter(x => (status === 'All' || status === x.status) && [x.id, x.customerName, x.method].join(' ').toLowerCase().includes(query.toLowerCase())).sort((a, b) => b.date.localeCompare(a.date));
  function remove(id) {
    if (confirm(`Delete invoice ${id}?`)) update('invoices', a => a.filter(x => x.id !== id));
  }
  return <><Top title="Invoices" subtitle="Manage, search, print and track customer invoices." action={<Button onClick={() => go('new-invoice')}><Plus size={17} />New Invoice</Button>} />
    <div className="panel p-4">
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]"><Search size={17} className="absolute left-3 top-3 text-[#809084]" /><input className="field !pl-10" placeholder="Search invoice number or customer" value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        <select className="field max-w-[160px]" value={status} onChange={e => setStatus(e.target.value)}>
          <option>All</option>
          <option>Paid</option>
          <option>Pending</option></select>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>{['Invoice #', 'Customer', 'Date', 'Amount', 'Status', 'Payment', 'Actions'].map(s => <th key={s}>{s}</th>)}
            </tr>
          </thead>
          <tbody>{filtered.map(x =>
            <tr key={x.id}>
              <td className="text-[#04764a] font-bold">{x.id}</td>
              <td>{x.customerName}</td>
              <td>{niceDate(x.date)}</td>
              <td className="font-semibold">{currency(x.total)}</td>
              <td>
                <span className={`badge ${x.status === 'Paid' ? 'badge-paid' : 'badge-pending'}`}>{x.status}</span></td>
              <td>{x.method || '—'}</td>
              <td>
                <div className="flex gap-2">
                  <button title="View" onClick={() => openBillInvoice(x.id)} className="btn btn-outline !p-2"><Eye size={15} /></button>
                  <button title="Delete" onClick={() => remove(x.id)} className="btn btn-danger !p-2"><Trash2 size={15} /></button>
                </div>
              </td>
            </tr>
          )}
          </tbody>
        </table>
      </div>
      {!filtered.length && <Empty text="No matching invoices found." />}
    </div>
  </>;
}
export function InvoiceDetails({ id, go }) {
  const { invoices, customers, settings, update } = useStore();
  const invoice = invoices.find(x => x.id === id);
  if (!invoice) return (
  <div>
    <p>Invoice not found.</p>
    <Button onClick={() => go('invoices')}>Back</Button>
  </div>
  );
  const customer = customers.find(c => c.id === invoice.customerId);
  const subtotal = invoice.items.reduce((s, i) => s + invoiceLineTotals(i).gross, 0);
  const discount = invoice.items.reduce((s, i) => s + invoiceLineTotals(i).discount, 0);
  const tax = invoice.items.reduce((s, i) => s + invoiceLineTotals(i).tax, 0);
  const taxable = subtotal - discount;
  const payable = Number(invoice.total);
  function markPaid() {
    update('invoices', a => a.map(x => x.id === id ? { ...x, status: 'Paid', method: x.method || 'UPI' } : x));
  }
  return <><Top title="Invoice Details" subtitle={invoice.id} action={
    <div className="flex gap-2 flex-wrap no-print">
      <Button kind="outline" onClick={() => go('invoices')}><ArrowLeft size={16} />Back</Button>{invoice.status !== 'Paid' && <Button kind="light" onClick={markPaid}><Check size={16} />Mark Paid</Button>}
      <Button onClick={() => window.print()}><Printer size={16} />Print / Save PDF</Button>
    </div>
  } />
    <div className="panel invoice-paper max-w-4xl mx-auto p-7 sm:p-11">
      <div className="flex justify-between gap-6 items-start border-b pb-7">
        <div>
          <div className="flex items-center gap-3">
            <div className="bg-[#03462f] text-white p-3 rounded-xl"><Receipt size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-[#063d2c]">{settings.company}</h2>
              <p className="text-xs muted">{settings.subtitle}</p>
            </div>
          </div>
          <p className="text-xs text-[#627367] mt-5 max-w-sm leading-6">{settings.address}<br />{settings.phone}{settings.email ? ` | ${settings.email}` : ''}{settings.gstin ? <><br />GSTIN: {settings.gstin}</> : null}</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-extrabold tracking-wider text-[#0a5438]">INVOICE</div>
          <p className="text-sm font-bold mt-3">{invoice.id}</p>
          <p className="text-xs muted mt-1">Date: {niceDate(invoice.date)}</p>
          <span className={`badge mt-3 ${invoice.status === 'Paid' ? 'badge-paid' : 'badge-pending'}`}>{invoice.status}</span>
        </div>
      </div>
      <div className="my-8 grid sm:grid-cols-2 gap-6">
        <div>
          <h3 className="text-xs uppercase tracking-widest text-[#7a897f] font-bold mb-2">Bill To</h3>
          <h4 className="font-bold text-lg">{invoice.customerName}</h4>
          <p className="text-sm muted mt-1 leading-6">{customer?.address}<br />{customer?.pin}<br />{customer?.phone}<br />{customer?.gstin && `GSTIN: ${customer.gstin}`}</p>
        </div>
        <div className="sm:text-right">
          <h3 className="text-xs uppercase tracking-widest text-[#7a897f] font-bold mb-2">Payment Method</h3>
          <p className="font-semibold">{invoice.method || 'Payment pending'}</p>
        </div>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Sl#</th>
              <th>Description of Goods / Services</th>
              <th>HSN/SAC</th>
              <th>Quantity</th>
              <th>Rate</th>
              <th>Discount</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, index) => (
              <tr key={`${item.number}-${index}`}>
                <td>{index + 1}</td>
                <td>
                  <strong>{item.name || '—'}</strong>
                  {item.number && <span className="block text-xs muted">#{item.number}</span>}
                </td>
                <td>{item.hsnSac || '—'}</td>
                <td>{Number(item.qty || 0).toFixed(3)}</td>
                <td>{currency(item.price)}</td>
                <td>{currency(item.discount || 0)}</td>
                <td className="font-semibold">{currency(invoiceLineTotals(item).taxable)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end mt-7">
        <div className="w-full sm:w-72 space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="muted">Subtotal</span>
            <strong>{currency(subtotal)}</strong>
          </div>
          <div className="flex justify-between">
            <span className="muted">Discount</span>
            <strong>− {currency(discount)}</strong>
          </div>
          <div className="flex justify-between">
            <span className="muted">Taxable Amount</span>
            <strong>{currency(taxable)}</strong>
          </div>
          <div className="flex justify-between">
            <span className="muted">GST</span>
            <strong>{currency(tax)}</strong>
          </div>
          {Math.abs(payable - taxable - tax) > .01 &&
            <div className="flex justify-between">
              <span className="muted">Adjustment</span>
              <strong>{currency(payable - taxable - tax)}</strong>
            </div>
          }
          <div className="flex justify-between border-t pt-4 text-lg text-[#076a43]">
            <strong>Total</strong>
            <strong>{currency(payable)}</strong>
          </div>
        </div>
      </div>
      <div className="border-t mt-10 pt-5 text-xs muted leading-6">
        <p>{settings.notes}</p>
        <p className="mt-3">This invoice is generated by The Cam Crew_TVM billing management system.</p>
      </div>
    </div>
  </>;
}
export function NewInvoice({ go, view }) {
  const { products, customers, invoices, update, settings } = useStore();

  const [customerId, setCustomerId] = useState('');
  const [date, setDate] = useState(isoToday());
  const [status, setStatus] = useState('Pending');
  const [method, setMethod] = useState('UPI');
  const [supplyType, setSupplyType] = useState('intra');
  const [placeOfSupply, setPlaceOfSupply] = useState('Kerala');
  const [productQuery, setProductQuery] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ ...blankCustomer });
  const [newCustomerError, setNewCustomerError] = useState('');

  const selectedCustomer = customers.find(
    (customer) => String(customer.id) === String(customerId)
  );

  const invoiceNumber = useMemo(() => {
    const year = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.slice(0, 4) : new Date().getFullYear();
    const prefix = String(settings?.invoicePrefix || 'INV').trim() || 'INV';
    const prefixWithYear = `${prefix}-${year}-`;
    const numbers = invoices
      .map((invoice) => String(invoice.id || ''))
      .filter((id) => id.startsWith(prefixWithYear))
      .map((id) => Number(id.slice(prefixWithYear.length)))
      .filter((value) => Number.isInteger(value) && value >= 0);
    const nextNumber = Math.max(24, ...numbers) + 1;
    return `${prefixWithYear}${String(nextNumber).padStart(3, '0')}`;
  }, [date, invoices, settings?.invoicePrefix]);

  const filteredProducts = useMemo(() => {
    const query = productQuery.trim().toLowerCase();
    if (!query) return products.slice(0, 8);
    return products
      .filter((product) =>
        `${product.number || ''} ${product.name || ''} ${product.hsnSac || ''}`
          .toLowerCase()
          .includes(query)
      )
      .slice(0, 10);
  }, [products, productQuery]);

  const rows = useMemo(() => items.map(invoiceLineTotals), [items]);
  const subtotal = rows.reduce((sum, row) => sum + row.gross, 0);
  const discount = rows.reduce((sum, row) => sum + row.discount, 0);
  const taxable = rows.reduce((sum, row) => sum + row.taxable, 0);
  const gst = rows.reduce((sum, row) => sum + row.tax, 0);
  const cgst = rows.reduce((sum, row) => sum + Math.round((row.tax / 2 + Number.EPSILON) * 100) / 100, 0);
  const sgst = gst - cgst;
  const grandTotal = Math.round((taxable + gst + Number.EPSILON) * 100) / 100;
  const totalQty = items.reduce((sum, row) => sum + (Number(row.qty) || 0), 0);

  function selectCustomer(nextId) {
    setCustomerId(nextId);
    const customer = customers.find((entry) => String(entry.id) === String(nextId));
    if (customer) setPlaceOfSupply(customer.state || 'Kerala');
  }

  function openAddCustomer() {
    setNewCustomer({ ...blankCustomer });
    setNewCustomerError('');
    setAddCustomerOpen(true);
  }

  function saveNewCustomer(event) {
    event.preventDefault();
    const entry = Object.fromEntries(
      Object.keys(blankCustomer).map((key) => [key, String(newCustomer[key] ?? '').trim()])
    );

    if (!entry.name) {
      setNewCustomerError('Customer name is required.');
      return;
    }
    if (entry.phone && !/^[+0-9 ()-]{7,20}$/.test(entry.phone)) {
      setNewCustomerError('Enter a valid phone number, or leave it blank.');
      return;
    }
    if (entry.pin && !/^\d{6}$/.test(entry.pin)) {
      setNewCustomerError('PIN code should contain 6 digits.');
      return;
    }
    if (entry.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entry.email)) {
      setNewCustomerError('Enter a valid email address, or leave it blank.');
      return;
    }
    entry.gstin = entry.gstin.toUpperCase();
    if (entry.gstin && !/^[0-9A-Z]{15}$/.test(entry.gstin)) {
      setNewCustomerError('GSTIN should contain 15 letters/numbers, or be left blank.');
      return;
    }

    // Match an existing record rather than duplicating the same name and phone.
    const existing = entry.phone && customers.find((customer) =>
      String(customer.name || '').trim().toLowerCase() === entry.name.toLowerCase() &&
      String(customer.phone || '').replace(/\s+/g, '') === entry.phone.replace(/\s+/g, '')
    );
    if (existing) {
      selectCustomer(String(existing.id));
      setAddCustomerOpen(false);
      return;
    }

    const customer = {
      ...entry,
      id: `C${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
    };

    try {
      update('customers', (previous) => [...previous, customer]);
      setCustomerId(customer.id);
      setPlaceOfSupply(customer.state || 'Kerala');
      setAddCustomerOpen(false);
      setNewCustomer({ ...blankCustomer });
      setNewCustomerError('');
    } catch (error) {
      console.error('Unable to add customer:', error);
      setNewCustomerError('Could not save the customer. Please try again.');
    }
  }

  function addProduct(product) {
    if (!product || !String(product.number || '').trim() || !String(product.name || '').trim()) {
      alert('This catalogue product is missing a product number or name. Please update it in Products & Services.');
      return;
    }
    setItems((previous) => {
      const existingIndex = previous.findIndex(
        (line) => line.number && line.number === product.number
      );
      if (existingIndex >= 0) {
        return previous.map((line, index) =>
          index === existingIndex ? { ...line, qty: Number(line.qty || 0) + 1 } : line
        );
      }
      return [
        ...previous,
        {
          _rowId: `product-${Date.now()}-${Math.random()}`,
          number: String(product.number || ''),
          name: String(product.name || ''),
          hsnSac: String(product.hsnSac || ''),
          qty: 1,
          price: Number(product.price) || 0,
          discount: 0,
          gst: Number(product.gst) || 0,
        },
      ];
    });
    setProductQuery('');
    setShowOptions(false);
  }

  function changeItem(rowId, key, value) {
    setItems((previous) =>
      previous.map((item) =>
        item._rowId === rowId ? { ...item, [key]: value } : item
      )
    );
  }

  function removeItem(rowId) {
    setItems((previous) => previous.filter((item) => item._rowId !== rowId));
  }

  function saveInvoice() {
    if (saving) return;
    if (!selectedCustomer) return alert('Please select a customer.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return alert('Enter a valid invoice date.');
    if (!items.length) return alert('Select at least one product from the catalogue.');
    if (!String(placeOfSupply).trim()) return alert('Enter the place of supply.');
    if (
      items.some((item) => {
        const quantity = Number(item.qty);
        const rate = Number(item.price);
        const lineDiscount = Number(item.discount);
        const taxRate = Number(item.gst);
        return (
          !String(item.name || '').trim() ||
          !Number.isFinite(quantity) || quantity <= 0 ||
          !Number.isFinite(rate) || rate < 0 ||
          !Number.isFinite(lineDiscount) || lineDiscount < 0 ||
          lineDiscount > quantity * rate ||
          !Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100
        );
      })
    ) {
      return alert('Check each item: description, quantity, rate, discount and GST rate must be valid.');
    }
    if (invoices.some((invoice) => invoice.id === invoiceNumber)) {
      return alert('This invoice number already exists. Refresh and try again.');
    }

    const normalizedItems = items.map(({ _rowId, ...item }) => ({
      ...item,
      number: String(item.number || '').trim(),
      name: String(item.name || '').trim(),
      hsnSac: String(item.hsnSac || '').trim(),
      qty: Number(item.qty),
      price: Number(item.price),
      discount: Number(item.discount || 0),
      gst: Number(item.gst),
    }));

    const invoiceData = {
      id: invoiceNumber,
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      date,
      status,
      method: status === 'Paid' ? method : '',
      notes: notes.trim(),
      total: Number(
        normalizedItems.reduce((sum, line) => sum + invoiceLineTotals(line).total, 0).toFixed(2)
      ),
      items: normalizedItems,
      bankDetails: {
        bankAccountName: String(settings?.bankAccountName || '').trim(),
        bankName: String(settings?.bankName || '').trim(),
        bankAccountNumber: String(settings?.bankAccountNumber || '').trim(),
        bankIfsc: String(settings?.bankIfsc || '').trim().toUpperCase(),
        bankBranch: String(settings?.bankBranch || '').trim(),
        bankUpiId: String(settings?.bankUpiId || '').trim(),
      },
      customerSnapshot: {
        customerName: selectedCustomer.name || '',
        customerCompany: selectedCustomer.company || '',
        customerAddress: selectedCustomer.address || '',
        customerCity: selectedCustomer.city || '',
        customerState: selectedCustomer.state || 'Kerala',
        customerPin: selectedCustomer.pin || '',
        customerPhone: selectedCustomer.phone || '',
        customerEmail: selectedCustomer.email || '',
        customerGstin: selectedCustomer.gstin || '',
      },
      billMetadata: {
        placeOfSupply: placeOfSupply.trim(),
        supplyType,
        terms: 'Due on Receipt',
        roundToRupee: false,
        adjustment: 0,
      },
    };

    setSaving(true);
    try {
      try {
        sessionStorage.setItem('cam-crew-latest-invoice', JSON.stringify(invoiceData));
      } catch (error) {
        console.warn('Unable to cache the invoice preview.', error);
      }
      update('invoices', (previous) => [invoiceData, ...previous]);
      window.location.assign(`/bill?invoice=${encodeURIComponent(invoiceNumber)}`);
    } catch (error) {
      console.error('Could not save the invoice.', error);
      alert('Unable to save this invoice. Please try again.');
      setSaving(false);
    }
  }

  return (
    <>
      <Top
        title="Create New Invoice"
        subtitle="Prepare a GST invoice with item discounts, HSN/SAC, and automatic tax calculations."
        action={
          <Button kind="outline" onClick={() => go('invoices')}>
            <ArrowLeft size={16} /> All Invoices
          </Button>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.8fr)_minmax(290px,0.8fr)] gap-5 items-start">
        <div className="space-y-5 min-w-0">
          {/* Invoice and customer details */}
          <section className="panel relative z-20 overflow-visible">
            <div className="flex items-center justify-between gap-3 border-b border-[#e8ede8] px-5 sm:px-6 py-4 bg-[#fbfdfb]">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#e9f5ed] text-[#08633c]">
                  <FileText size={18} />
                </span>
                <div>
                  <h2 className="card-heading">Invoice Information</h2>
                  <p className="text-xs muted mt-1">Customer, issue date and tax type</p>
                </div>
              </div>
              <span className="rounded-md border border-[#d8e9da] bg-white px-3 py-2 text-xs font-bold text-[#075a37]">
                {invoiceNumber}
              </span>
            </div>

            <div className="p-5 sm:p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field title="Customer *">
                  <div className="flex flex-wrap items-start gap-2">
                    <div className="min-w-[170px] flex-1">
                      <SearchableCustomerSelect
                        customers={customers}
                        selectedCustomer={selectedCustomer}
                        onSelect={selectCustomer}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={openAddCustomer}
                      className="btn btn-outline shrink-0 !px-3"
                      title="Add a new customer without leaving this invoice"
                    >
                      <Plus size={16} /> Add Customer
                    </button>
                  </div>
                </Field>
                <Field title="Invoice Date *">
                  <input className="field" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
                </Field>
                <Field title="Place of Supply *">
                  <input
                    className="field"
                    value={placeOfSupply}
                    onChange={(event) => setPlaceOfSupply(event.target.value)}
                    placeholder="e.g. Kerala"
                  />
                </Field>
                <Field title="GST Type">
                  <select className="field" value={supplyType} onChange={(event) => setSupplyType(event.target.value)}>
                    <option value="intra">Within State (CGST + SGST)</option>
                    <option value="inter">Interstate (IGST)</option>
                  </select>
                </Field>
                <Field title="Payment Status">
                  <select className="field" value={status} onChange={(event) => setStatus(event.target.value)}>
                    <option value="Pending">Pending</option>
                    <option value="Paid">Paid</option>
                  </select>
                </Field>
                <Field title="Payment Method">
                  <select
                    className="field"
                    disabled={status !== 'Paid'}
                    value={method}
                    onChange={(event) => setMethod(event.target.value)}
                  >
                    {['UPI', 'Cash', 'Bank Transfer', 'Others'].map((value) => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                </Field>
              </div>

              {selectedCustomer ? (
                <div className="rounded-xl border border-[#dce9df] bg-[#f8fbf8] p-4">
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide font-bold text-[#6d8371] mb-2">
                    <Users size={14} /> Bill To
                  </div>
                  <div className="text-sm font-bold text-[#164d34]">{selectedCustomer.name}</div>
                  <div className="mt-1 text-xs leading-5 text-[#576c5c]">
                    {[selectedCustomer.company, selectedCustomer.address, selectedCustomer.city, selectedCustomer.state, selectedCustomer.pin].filter(Boolean).join(', ') || 'No address provided'}
                    {selectedCustomer.phone && <span className="block">Phone: {selectedCustomer.phone}</span>}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-[#d4e1d6] bg-[#f9fbf9] px-4 py-4 text-xs text-[#6c7d6f]">
                  Select a customer to show their billing information here.
                </div>
              )}
            </div>
          </section>

          {/* Search and editable seven-column GST table */}
          <section className="panel overflow-visible">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8ede8] px-5 sm:px-6 py-4 bg-[#fbfdfb]">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#e9f5ed] text-[#08633c]">
                  <Package size={18} />
                </span>
                <div>
                  <h2 className="card-heading">Products &amp; Services</h2>
                  <p className="text-xs muted mt-1">HSN/SAC, discounts and GST per item</p>
                </div>
              </div>
              <span className="text-xs font-semibold text-[#587262]">{items.length} line item{items.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row items-end gap-3">
                <div className="relative w-full flex-1 min-w-0">
                  <label className="label">Search by Product Number, Name or HSN/SAC</label>
                  <Search size={18} className="absolute top-[35px] left-3 text-[#758579]" />
                  <input
                    type="text"
                    className="field !pl-10"
                    value={productQuery}
                    onChange={(event) => {
                      setProductQuery(event.target.value);
                      setShowOptions(true);
                    }}
                    onFocus={() => setShowOptions(true)}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') setShowOptions(false);
                    }}
                    placeholder="Search CCTV-001, Camera, or 85258900"
                  />
                  {showOptions && (
                    <div className="absolute top-full left-0 right-0 z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border border-[#dce9df] bg-white shadow-xl">
                      {filteredProducts.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          className="flex w-full items-center justify-between gap-3 border-b border-[#edf2ee] px-4 py-3 text-left hover:bg-[#f2f9f4] last:border-0"
                          onClick={() => addProduct(product)}
                        >
                          <span className="min-w-0">
                            <span className="block text-xs font-bold text-[#075c3b]">{product.number}</span>
                            <span className="block text-sm text-[#273b2e]">{product.name}</span>
                            {product.hsnSac && <span className="block text-[11px] muted">HSN/SAC: {product.hsnSac}</span>}
                          </span>
                          <span className="shrink-0 text-sm font-bold">{currency(product.price)}</span>
                        </button>
                      ))}
                      {!filteredProducts.length && (
                        <div className="px-4 py-3 text-sm muted">No matching products found. Add products through the Products & Services catalogue first.</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {items.length ? (
                <div className="table-wrap mt-5 overflow-x-auto">
                  <table className="data-table min-w-[880px]">
                    <thead>
                      <tr>
                        <th>Sl#</th>
                        <th>Description of Goods / Services</th>
                        <th>HSN/SAC</th>
                        <th>Quantity</th>
                        <th>Rate</th>
                        <th>Discount (₹)</th>
                        <th>Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => {
                        const amounts = rows[index];
                        return (
                          <tr key={item._rowId}>
                            <td className="text-center align-top font-semibold">{index + 1}</td>
                            <td className="align-top">
                              <div className="min-w-[195px] space-y-2">
                                <input
                                  className="field !p-2 !text-xs"
                                  value={item.number}
                                  readOnly
                                  title="Product number is selected from the catalogue"
                                  aria-label="Product number"
                                />
                                <textarea
                                  className="field !p-2 !text-xs"
                                  rows={2}
                                  value={item.name}
                                  readOnly
                                  title="Product name is selected from the catalogue"
                                  aria-label="Item description"
                                />
                                <div className="flex items-center justify-between gap-2">
                                  <label className="flex items-center gap-2 text-[11px] muted">
                                    GST %
                                    <input
                                      type="number"
                                      className="field !w-20 !p-1.5 !text-xs"
                                      min="0"
                                      max="100"
                                      step="0.01"
                                      value={item.gst}
                                      onChange={(event) => changeItem(item._rowId, 'gst', event.target.value)}
                                      aria-label="GST percent"
                                    />
                                  </label>
                                  <button
                                    type="button"
                                    className="inline-flex items-center gap-1 text-[11px] text-red-600 hover:text-red-800"
                                    onClick={() => removeItem(item._rowId)}
                                  >
                                    <Trash2 size={13} /> Remove
                                  </button>
                                </div>
                              </div>
                            </td>
                            <td className="align-top">
                              <input
                                className="field !p-2 !text-xs !min-w-[85px]"
                                value={item.hsnSac}
                                readOnly
                                title="HSN/SAC is selected from the catalogue"
                                aria-label="HSN/SAC"
                              />
                            </td>
                            <td className="align-top">
                              <input
                                className="field !p-2 !text-xs !min-w-[70px]"
                                type="number"
                                min="0.001"
                                step="0.001"
                                value={item.qty}
                                onChange={(event) => changeItem(item._rowId, 'qty', event.target.value)}
                                aria-label="Quantity"
                              />
                            </td>
                            <td className="align-top">
                              <input
                                className="field !p-2 !text-xs !min-w-[95px]"
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.price}
                                onChange={(event) => changeItem(item._rowId, 'price', event.target.value)}
                                aria-label="Rate"
                              />
                            </td>
                            <td className="align-top">
                              <input
                                className="field !p-2 !text-xs !min-w-[90px]"
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.discount}
                                onChange={(event) => changeItem(item._rowId, 'discount', event.target.value)}
                                aria-label="Line discount in rupees"
                              />
                            </td>
                            <td className="align-top text-right whitespace-nowrap">
                              <strong className="text-[#095e3d]">{currency(amounts.taxable)}</strong>
                              <span className="block mt-1 text-[11px] muted">GST: {currency(amounts.tax)}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="mt-5 rounded-xl border-2 border-dashed border-[#e0e9e1] bg-[#fbfdfb] px-5 py-10 text-center">
                  <Package size={30} className="mx-auto mb-3 text-[#89a18e]" />
                  <p className="text-sm font-semibold text-[#345e42]">No products added</p>
                  <p className="mt-1 text-xs muted">Search by product number or name above, then select a catalogue product to add it.</p>
                </div>
              )}
            </div>
          </section>

          <section className="panel p-5 sm:p-6">
            <Field title="Invoice Notes (optional)">
              <textarea
                className="field"
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Special instructions, delivery details, or notes..."
              />
            </Field>
          </section>
        </div>

        {/* Sticky invoice summary */}
        <aside className="panel overflow-hidden xl:sticky xl:top-24">
          <div className="border-b border-[#e5ebe4] bg-[#f8fbf8] p-5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#698674]">Invoice Summary</p>
            <h2 className="mt-1 text-lg font-extrabold text-[#06482e]">{invoiceNumber}</h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex justify-between gap-3 text-sm">
              <span className="muted">Line Items</span>
              <strong>{items.length}</strong>
            </div>
            <div className="flex justify-between gap-3 text-sm">
              <span className="muted">Total Quantity</span>
              <strong>{totalQty.toLocaleString('en-IN', { maximumFractionDigits: 3 })}</strong>
            </div>
            <div className="border-t border-[#e8ede8] pt-4 space-y-3">
              <div className="flex justify-between gap-3 text-sm">
                <span className="muted">Subtotal</span>
                <strong>{currency(subtotal)}</strong>
              </div>
              <div className="flex justify-between gap-3 text-sm">
                <span className="muted">Discount</span>
                <strong className="text-[#a33a32]">− {currency(discount)}</strong>
              </div>
              <div className="flex justify-between gap-3 text-sm">
                <span className="muted">Taxable Value</span>
                <strong>{currency(taxable)}</strong>
              </div>
              {supplyType === 'intra' ? (
                <>
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="muted">CGST</span>
                    <strong>{currency(cgst)}</strong>
                  </div>
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="muted">SGST</span>
                    <strong>{currency(sgst)}</strong>
                  </div>
                </>
              ) : (
                <div className="flex justify-between gap-3 text-sm">
                  <span className="muted">IGST</span>
                  <strong>{currency(gst)}</strong>
                </div>
              )}
            </div>
            <div className="rounded-xl bg-[#06482e] px-4 py-4 text-white">
              <span className="block text-xs text-white/80">Grand Total (incl. GST)</span>
              <strong className="mt-1 block text-2xl font-extrabold">{currency(grandTotal)}</strong>
            </div>
            <Button onClick={saveInvoice} disabled={saving} block={true}>
              <Save size={17} /> {saving ? 'Saving Invoice...' : 'Save & View Invoice'}
            </Button>
            <button
              type="button"
              className="btn btn-outline w-full"
              onClick={() => go('invoices')}
              disabled={saving}
            >
              <ArrowLeft size={16} /> Back to Invoices
            </button>
            <p className="text-[11px] leading-5 muted">
              Invoices are stored in this browser. Saved invoices open in the classic A4 GST bill design.
            </p>
          </div>
        </aside>
      </div>

      {addCustomerOpen && (
        <Modal title="Add New Customer" onClose={() => setAddCustomerOpen(false)}>
          <p className="mb-5 text-xs text-[#687c6e]">
            Save the customer here and they will be selected automatically for this invoice.
          </p>
          <form onSubmit={saveNewCustomer} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              ['name', 'Customer Name *'],
              ['company', 'Company Name'],
              ['phone', 'Phone Number'],
              ['email', 'Email Address'],
              ['address', 'Address'],
              ['city', 'City'],
              ['state', 'State'],
              ['pin', 'PIN Code'],
              ['gstin', 'GSTIN (Optional)'],
            ].map(([key, title]) => (
              <div key={key} className={key === 'address' ? 'sm:col-span-2' : ''}>
                <Field title={title}>
                  <input
                    className="field"
                    required={key === 'name'}
                    autoFocus={key === 'name'}
                    type={key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'}
                    inputMode={key === 'phone' || key === 'pin' ? 'numeric' : 'text'}
                    maxLength={key === 'gstin' ? 15 : key === 'pin' ? 6 : 160}
                    value={newCustomer[key] ?? ''}
                    onChange={(event) => {
                      const value = key === 'gstin' ? event.target.value.toUpperCase() : event.target.value;
                      setNewCustomer((previous) => ({ ...previous, [key]: value }));
                      if (newCustomerError) setNewCustomerError('');
                    }}
                    placeholder={title.replace(' *', '')}
                  />
                </Field>
              </div>
            ))}
            {newCustomerError && (
              <p role="alert" className="sm:col-span-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {newCustomerError}
              </p>
            )}
            <div className="sm:col-span-2 flex flex-wrap justify-end gap-3 border-t pt-4">
              <button type="button" className="btn btn-outline" onClick={() => setAddCustomerOpen(false)}>
                Cancel
              </button>
              <Button type="submit">
                <Save size={16} /> Save &amp; Select Customer
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

export function Customers() {
  const { customers, update } = useStore();
  const [query, setQuery] = useState(''), [edit, setEdit] = useState(null), [form, setForm] = useState(blankCustomer), [open, setOpen] = useState(false);
  const filtered = customers.filter(c => Object.values(c).join(' ').toLowerCase().includes(query.toLowerCase()));
  function begin(c) {
    setEdit(c?.id || null);
    setForm(c ? { ...c } : blankCustomer);
    setOpen(true);
  }
  function save(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    const entry = { ...form, id: edit || `C${Date.now()}` };
    update('customers', a => edit ? a.map(x => x.id === edit ? entry : x) : [...a, entry]);
    setOpen(false);
  }
  function remove(id) {
    if (confirm('Delete this customer?')) update('customers', a => a.filter(x => x.id !== id));
  }
  return <><Top title="Customers" subtitle="Keep customer contact, address, PIN and GST details organized." action={<Button onClick={() => begin()}><Plus size={17} />Add Customer</Button>} />
    <div className="panel p-4">
      <div className="relative mb-4 max-w-lg"><Search size={17} className="absolute top-3 left-3 muted" /><input value={query} onChange={e => setQuery(e.target.value)} className="field !pl-10" placeholder="Search customers by name, phone or GSTIN" />
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>{['Customer', 'Phone', 'Address', 'PIN', 'GSTIN', 'Actions'].map(x => <th key={x}>{x}</th>)}
            </tr>
          </thead>
          <tbody>{filtered.map(c =>
            <tr key={c.id}>
              <td>
                <b>{c.name}</b>
                <div className="text-xs muted">{c.email}
                </div>
              </td>
              <td>{c.phone || '—'}</td>
              <td>{c.address || '—'}</td>
              <td>{c.pin || '—'}</td>
              <td>{c.gstin || '—'}</td>
              <td>
                <div className="flex gap-2">
                  <button className="btn btn-outline !p-2" onClick={() => begin(c)}><Edit2 size={15} /></button>
                  <button className="btn btn-danger !p-2" onClick={() => remove(c.id)}><Trash2 size={15} /></button>
                </div>
              </td>
            </tr>
          )}
          </tbody>
        </table>
      </div>
      {!filtered.length && <Empty text="No customers match your search." />}
    </div>
    {open && <Modal title={edit ? 'Edit Customer' : 'Add Customer'} onClose={() => setOpen(false)}>
      <form onSubmit={save} className="grid sm:grid-cols-2 gap-4">{[['name', 'Customer Name *'], ['company', 'Company'], ['city', 'City'], ['state', 'State'], ['phone', 'Phone Number'], ['email', 'Email Address'], ['pin', 'PIN Code'], ['gstin', 'GSTIN'], ['address', 'Address']].map(([k, label]) =>
        <div key={k} className={k === 'address' ? 'sm:col-span-2' : ''}>
          <Field title={label}><input required={k === 'name'} className="field" value={form[k] || ''} onChange={e => setForm(a => ({ ...a, [k]: e.target.value }))} /></Field>
        </div>
      )}
        <div className="sm:col-span-2 flex justify-end">
          <Button submit={true} type="submit"><Save size={16} />Save Customer</Button>
        </div>
      </form>
    </Modal>}</>;
}
export function Products() {
  const { products, update } = useStore();
  const [query, setQuery] = useState(''), [edit, setEdit] = useState(null), [form, setForm] = useState(blankProduct), [open, setOpen] = useState(false);
  const filtered = products.filter(p => Object.values(p).join(' ').toLowerCase().includes(query.toLowerCase()));
  function begin(p) {
    setEdit(p?.id || null);
    setForm(p ? { ...p } : blankProduct);
    setOpen(true);
  }
  function save(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.number.trim()) return;
    const same = products.some(p => p.number.trim().toLowerCase() === form.number.trim().toLowerCase() && p.id !== edit);
    if (same) return alert('A product with this number already exists.');
    const entry = { ...form, id: edit || `P${Date.now()}`, price: Number(form.price), gst: Number(form.gst), stock: Number(form.stock) };
    update('products', a => edit ? a.map(x => x.id === edit ? entry : x) : [...a, entry]);
    setOpen(false);
  }
  function remove(id) {
    if (confirm('Delete this product?')) update('products', a => a.filter(x => x.id !== id));
  }
  return <><Top title="Products & Services" subtitle="Manage catalog numbers, product names, rates, GST and stock." action={<Button onClick={() => begin()}><Plus size={17} />Add Product</Button>} />
    <div className="panel p-4">
      <div className="relative mb-4 max-w-lg"><Search size={17} className="absolute top-3 left-3 muted" /><input value={query} onChange={e => setQuery(e.target.value)} className="field !pl-10" placeholder="Search product number or name" />
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>{['Product No.', 'Product / Service', 'HSN/SAC', 'Category', 'Rate', 'GST', 'Stock', 'Actions'].map(x => <th key={x}>{x}</th>)}
            </tr>
          </thead>
          <tbody>{filtered.map(p =>
            <tr key={p.id}>
              <td className="font-bold text-[#057647]">{p.number}</td>
              <td className="font-semibold">{p.name}</td>
              <td>{p.hsnSac || '—'}</td>
              <td>{p.category}</td>
              <td>{currency(p.price)}</td>
              <td>{p.gst}%</td>
              <td>{p.category === 'Service' ? '—' : p.stock}</td>
              <td>
                <div className="flex gap-2">
                  <button className="btn btn-outline !p-2" onClick={() => begin(p)}><Edit2 size={15} /></button>
                  <button className="btn btn-danger !p-2" onClick={() => remove(p.id)}><Trash2 size={15} /></button>
                </div>
              </td>
            </tr>
          )}
          </tbody>
        </table>
      </div>
      {!filtered.length && <Empty text="No products match your search." />}
    </div>
    {open && <Modal title={edit ? 'Edit Product' : 'Add Product'} onClose={() => setOpen(false)}>
      <form onSubmit={save} className="grid sm:grid-cols-2 gap-4">{[['number', 'Product Number *'], ['name', 'Product Name *'], ['hsnSac', 'HSN/SAC'], ['category', 'Category'], ['price', 'Unit Rate (₹)'], ['gst', 'GST Rate (%)'], ['stock', 'Available Stock']].map(([k, label]) =>
        <div key={k}>
          <Field title={label}><input required={['number', 'name'].includes(k)} className="field" type={['price', 'gst', 'stock'].includes(k) ? 'number' : 'text'} min={['price', 'gst', 'stock'].includes(k) ? 0 : undefined} value={form[k] ?? ''} onChange={e => setForm(a => ({ ...a, [k]: e.target.value }))} /></Field>
        </div>
      )}
        <div className="sm:col-span-2 flex justify-end">
          <button type="submit" className="btn btn-primary"><Save size={16} />Save Product</button>
        </div>
      </form>
    </Modal>}</>;
}
export function Payments({ view }) {
  const { invoices, update } = useStore();
  const [method, setMethod] = useState('UPI');
  const pending = invoices.filter(x => x.status !== 'Paid'), paid = invoices.filter(x => x.status === 'Paid');
  function mark(id) {
    update('invoices', a => a.map(x => x.id === id ? { ...x, status: 'Paid', method } : x));
  }
  return <><Top title="Payments" subtitle="Track paid and outstanding customer invoices." />
    <div className="grid sm:grid-cols-3 gap-4 mb-5"><Metric label="Collected" value={currency(paid.reduce((s, x) => s + x.total, 0))} Icon={Wallet} /><Metric label="Outstanding" value={currency(pending.reduce((s, x) => s + x.total, 0))} Icon={Receipt} /><Metric label="Paid Invoices" value={paid.length} Icon={FileText} />
    </div>
    <div className="panel p-5">
      <div className="flex flex-wrap gap-3 justify-between items-center mb-4">
        <h2 className="card-heading">Outstanding Payments</h2>
        <div className="flex gap-2 items-center text-xs">
          <span className="muted">Payment method:</span>
          <select className="field !w-auto" value={method} onChange={e => setMethod(e.target.value)}>{['UPI', 'Cash', 'Bank Transfer', 'Others'].map(x => <option key={x}>{x}</option>)}</select>
        </div>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Issue Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>{pending.map(x =>
            <tr key={x.id}>
              <td className="font-bold text-[#067548]">{x.id}</td>
              <td>{x.customerName}</td>
              <td>{currency(x.total)}</td>
              <td>{niceDate(x.date)}</td>
              <td>
                <div className="flex gap-2">
                  <Button kind="light" onClick={() => mark(x.id)}><Check size={14} />Mark Paid</Button>
                  <button className="btn btn-outline !p-2" onClick={() => openBillInvoice(x.id)}><Eye size={16} /></button>
                </div>
              </td>
            </tr>
          )}
          </tbody>
        </table>
      </div>
      {!pending.length && <Empty text="All invoices have been paid." />}
    </div>
  </>;
}
function Metric({ label, value, Icon }) {
  return (
  <div className="panel p-5 flex items-center gap-4">
    <div className="icon-box"><Icon />
    </div>
    <div>
      <div className="text-xs muted">{label}
      </div>
      <div className="text-xl font-extrabold mt-1">{value}
      </div>
    </div>
  </div>
  );
}
export function Reports() {
  const { invoices, products, customers } = useStore();
  const paid = invoices.filter(x => x.status === 'Paid'), pending = invoices.filter(x => x.status === 'Pending');
  const methods = ['Cash', 'UPI', 'Bank Transfer', 'Others'];
  function exportCSV() {
    const rows = [['Invoice Number', 'Customer', 'Date', 'Total', 'Status', 'Payment Method'], ...invoices.map(x => [x.id, x.customerName, x.date, x.total, x.status, x.method])];
    const csv = rows.map(r => r.map(x => '"' + String(x ?? '').replaceAll('"', '""') + '"').join(',')).join('\r\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' }), url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cam-crew-invoices.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
  return <><Top title="Reports & Analytics" subtitle="Review revenue, outstanding amounts and invoice activity." action={<Button onClick={exportCSV}><Download size={16} />Export CSV</Button>} />
    <div className="grid sm:grid-cols-3 gap-4 mb-5"><Metric label="Total Invoiced" value={currency(invoices.reduce((s, x) => s + x.total, 0))} Icon={Receipt} /><Metric label="Paid Revenue" value={currency(paid.reduce((s, x) => s + x.total, 0))} Icon={Wallet} /><Metric label="Outstanding" value={currency(pending.reduce((s, x) => s + x.total, 0))} Icon={ChartNoAxesCombined} />
    </div>
    <div className="grid lg:grid-cols-2 gap-5"><SalesGraph />
      <div className="panel p-6">
        <h2 className="card-heading mb-5">Business Summary</h2>
        <div className="space-y-5 text-sm">{[['Total Customers', customers.length], ['Product Catalog', products.length], ['Total Invoices', invoices.length], ['Paid Invoices', paid.length], ['Pending Invoices', pending.length], ...methods.map(m => [`${m} payments`, paid.filter(i => i.method === m).length])].map(([label, v]) =>
          <div key={label} className="flex justify-between border-b pb-3">
            <span className="muted">{label}</span>
            <strong>{v}</strong>
          </div>
        )}
        </div>
      </div>
    </div>
  </>;
}
export function Settings() {
  const { settings, update, reset } = useStore();
  const [form, setForm] = useState(() => ({ ...(settings || {}) }));
  const [message, setMessage] = useState('');

  useEffect(() => {
    setForm({ ...(settings || {}) });
  }, [settings]);

  const setField = (key, value) => {
    setMessage('');
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const bankFields = [
    ['bankAccountName', 'Account Holder Name', 'Name as registered with the bank'],
    ['bankName', 'Bank Name', 'e.g. State Bank of India'],
    ['bankAccountNumber', 'Account Number', 'Enter the bank account number'],
    ['bankIfsc', 'IFSC Code', 'e.g. SBIN0001234'],
    ['bankBranch', 'Branch', 'Branch name'],
    ['bankUpiId', 'UPI ID (optional)', 'e.g. business@upi'],
  ];

  function save(event) {
    event.preventDefault();

    const bankAccountNumber = String(form.bankAccountNumber || '').trim();
    const bankIfsc = String(form.bankIfsc || '').replace(/\s+/g, '').toUpperCase();

    // Account numbers are stored as strings so leading zeroes are preserved.
    if (bankAccountNumber && !/^\d{6,25}$/.test(bankAccountNumber)) {
      setMessage('Please enter a valid bank account number (6–25 digits).');
      return;
    }
    if (bankIfsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankIfsc)) {
      setMessage('Please enter a valid 11-character Indian IFSC code.');
      return;
    }

    const nextSettings = {
      ...(settings || {}),
      ...form,
      bankAccountName: String(form.bankAccountName || '').trim(),
      bankName: String(form.bankName || '').trim(),
      bankAccountNumber,
      bankIfsc,
      bankBranch: String(form.bankBranch || '').trim(),
      bankUpiId: String(form.bankUpiId || '').trim(),
    };

    try {
      update('settings', nextSettings);
      setForm(nextSettings);
      setMessage('Business settings and default bank details saved successfully.');
    } catch (error) {
      console.error('Unable to save business settings:', error);
      setMessage('Unable to save settings. Please check browser storage and try again.');
    }
  }

  return (
    <>
      <Top
        title="Settings"
        subtitle="Save business and default bank details for future invoices."
      />

      <form onSubmit={save} className="max-w-4xl space-y-5">
        <section className="panel p-5 sm:p-6">
          <h2 className="card-heading mb-1">Business Information</h2>
          <p className="muted mb-5 text-xs">Used on your invoice header and seller details.</p>

          <div className="grid gap-5 sm:grid-cols-2">
            {[
              ['company', 'Company Name'],
              ['subtitle', 'Business Subtitle'],
              ['phone', 'Contact Number'],
              ['email', 'Business Email'],
              ['gstin', 'Company GSTIN'],
              ['invoicePrefix', 'Invoice Prefix'],
            ].map(([key, title]) => (
              <Field key={key} title={title}>
                <input
                  className="field"
                  value={form[key] || ''}
                  onChange={(event) => setField(key, event.target.value)}
                />
              </Field>
            ))}

            <div className="sm:col-span-2">
              <Field title="Business Address">
                <textarea
                  className="field"
                  rows={3}
                  value={form.address || ''}
                  onChange={(event) => setField('address', event.target.value)}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field title="Default Invoice Footer Notes">
                <textarea
                  className="field"
                  rows={3}
                  value={form.notes || ''}
                  onChange={(event) => setField('notes', event.target.value)}
                />
              </Field>
            </div>
          </div>
        </section>

        <section className="panel p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="card-heading">Permanent Bank Details</h2>
              <p className="muted mt-1 text-xs">
                Save once; these details will automatically fill new invoices.
              </p>
            </div>
            <span className="rounded-full bg-[#e8f5ec] px-3 py-1 text-[11px] font-bold text-[#087747]">
              Default for invoices
            </span>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {bankFields.map(([key, title, placeholder]) => (
              <Field key={key} title={title}>
                <input
                  className="field"
                  type="text"
                  inputMode={key === 'bankAccountNumber' ? 'numeric' : 'text'}
                  autoComplete="off"
                  value={form[key] || ''}
                  onChange={(event) =>
                    setField(
                      key,
                      key === 'bankIfsc'
                        ? event.target.value.toUpperCase()
                        : event.target.value
                    )
                  }
                  placeholder={placeholder}
                  maxLength={key === 'bankAccountNumber' ? 25 : key === 'bankIfsc' ? 11 : 120}
                />
              </Field>
            ))}
          </div>
          <p className="muted mt-4 text-xs leading-5">
            Bank details are saved with each newly created invoice so already-issued
            invoices retain their original bank information when defaults change.
          </p>
        </section>

        {message && (
          <p
            role="status"
            className={`rounded-lg px-4 py-3 text-sm ${
              message.startsWith('Business settings')
                ? 'bg-[#eaf7ed] text-[#087747]'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {message}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button type="submit" className="btn btn-primary">
            <Save size={16} /> Save Business & Bank Details
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => {
              if (window.confirm('Reset ALL locally saved invoices, customers, products, bank details and settings to demo data?')) {
                reset();
                setMessage('');
              }
            }}
          >
            <RotateCcw size={16} /> Reset Data
          </button>
        </div>
      </form>

      <p className="muted mt-5 max-w-3xl text-xs leading-6">
        Bank details are saved in this browser's localStorage, like the rest of the current
        billing data. They remain after refresh or logout, but they will not automatically
        appear on other devices and can be lost if browser data is cleared. For truly
        permanent, shared storage and backups, connect the app to a database.
      </p>
    </>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 bg-[#10261c]/55 z-50 flex items-center justify-center p-4"
      onMouseDown={onClose}
    >
      <div
        className="bg-white shadow-2xl rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="card-heading">{title}</h2>

          <button
            type="button"
            className="btn btn-outline !p-2"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}