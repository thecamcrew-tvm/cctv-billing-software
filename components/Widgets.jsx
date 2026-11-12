
"use client";

import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { currency, shortCurrency, niceDate } from "@/lib/data";
import { useStore } from "@/lib/store";
import {
  ArrowUpRight,
  FileText,
  Wallet,
  Users,
  Package,
  ChartColumnIncreasing,
  ChartPie,
  ArrowRight,
  Eye,
  Files,
  Boxes,
  Search,
} from "lucide-react";

const GRAPH_RANGES = ["7 Days", "30 Days", "3 Months", "1 Year"];
const PAYMENT_COLORS = {
  Cash: "#036640",
  UPI: "#39a85b",
  "Bank Transfer": "#e1b84e",
  Others: "#c5c8c4",
};

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function isCancelled(invoice) {
  return ["cancelled", "canceled", "draft"].includes(
    String(invoice?.status || "").toLowerCase()
  );
}

function getInvoiceDate(invoice) {
  const value = invoice?.date ?? invoice?.createdAt;
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value?.toDate === "function") {
    return value.toDate();
  }
  if (typeof value?.seconds === "number") {
    return new Date(value.seconds * 1000);
  }
  if (typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const text = String(value).trim();
  const isoDate = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);
  if (isoDate && text.length === 10) {
    const date = new Date(+isoDate[1], +isoDate[2] - 1, +isoDate[3]);
    return date.getMonth() === +isoDate[2] - 1 && date.getDate() === +isoDate[3]
      ? date
      : null;
  }
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dayKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createGraphData(invoices, range) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (range === "1 Year") {
    const beginning = new Date(today.getFullYear(), today.getMonth() - 11, 1);
    const buckets = Array.from({ length: 12 }, (_, index) => {
      const date = new Date(beginning.getFullYear(), beginning.getMonth() + index, 1);
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        date: date.toLocaleDateString("en-IN", { month: "short" }),
        sales: 0,
      };
    });
    const byKey = new Map(buckets.map((entry) => [entry.key, entry]));
    invoices.forEach((invoice) => {
      if (isCancelled(invoice)) return;
      const date = getInvoiceDate(invoice);
      if (!date || date < beginning || date > new Date()) return;
      const item = byKey.get(`${date.getFullYear()}-${date.getMonth()}`);
      if (item) item.sales += asAmount(invoice.total);
    });
    return buckets;
  }

  // Calendar-day buckets for 7/30 days; consecutive 7-day buckets for 3 months.
  const weekly = range === "3 Months";
  const count = weekly ? 13 : range === "7 Days" ? 7 : 30;
  const start = new Date(today);
  start.setDate(start.getDate() - (weekly ? 90 : count - 1));
  const buckets = Array.from({ length: count }, (_, index) => {
    const date = new Date(start);
    date.setDate(date.getDate() + (weekly ? index * 7 : index));
    return {
      date: weekly
        ? date.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
        : date.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      sales: 0,
      key: dayKey(date),
    };
  });
  const dailyIndex = new Map(buckets.map((entry, index) => [entry.key, index]));
  invoices.forEach((invoice) => {
    if (isCancelled(invoice)) return;
    const date = getInvoiceDate(invoice);
    if (!date || date < start || date > new Date()) return;
    let index;
    if (weekly) {
      const invoiceDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      index = Math.floor((invoiceDay - start) / 86400000 / 7);
    } else {
      index = dailyIndex.get(dayKey(date));
    }
    if (index >= 0 && index < buckets.length) {
      buckets[index].sales += asAmount(invoice.total);
    }
  });
  return buckets;
}

function paymentCategory(method) {
  const label = String(method || "").trim().toLowerCase();
  if (label.includes("cash")) return "Cash";
  if (label.includes("upi") || label.includes("gpay") || label.includes("phonepe") || label.includes("paytm")) {
    return "UPI";
  }
  if (label.includes("bank") || label.includes("neft") || label.includes("imps") || label.includes("rtgs")) {
    return "Bank Transfer";
  }
  return "Others";
}

export function SalesGraph({ invoices }) {
  const store = useStore();
  const [range, setRange] = useState("30 Days");
  const records = asArray(invoices ?? store?.invoices);
  const points = useMemo(() => createGraphData(records, range), [records, range]);
  const total = points.reduce((sum, point) => sum + point.sales, 0);

  return (
    <div className="panel min-w-0 p-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ChartColumnIncreasing size={22} className="text-[#067447]" />
          <h2 className="card-heading">Sales Overview</h2>
        </div>
        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-[#e9ede8] p-1">
          {GRAPH_RANGES.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setRange(key)}
              aria-pressed={range === key}
              className={`rounded-md px-3 py-2 text-[11px] font-bold transition ${
                range === key ? "bg-[#076c44] text-white" : "text-[#6f7b72] hover:bg-gray-100"
              }`}
            >
              {key}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-3 flex items-baseline gap-2">
        <strong className="text-xl text-[#163d2b]">{currency(total)}</strong>
        <span className="text-xs text-[#718075]">Billed in the selected period</span>
      </div>
      <div className="h-[230px] w-full sm:h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 6, right: 13, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#39af70" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#39af70" stopOpacity={0.015} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#edf0eb" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#718075" }} tickLine={false} axisLine={false} minTickGap={12} />
            <YAxis tickFormatter={(value) => `${Math.round(value / 1000)}k`} tick={{ fontSize: 10, fill: "#718075" }} tickLine={false} axisLine={false} />
            <Tooltip formatter={(value) => [currency(asAmount(value)), "Billed"]} contentStyle={{ borderRadius: 12, border: "1px solid #dde9e0" }} />
            <Area type="monotone" dataKey="sales" stroke="#078047" strokeWidth={3} fill="url(#salesFill)" dot={false} activeDot={{ r: 5 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {!total && <p className="mt-2 text-center text-xs text-[#819287]">No billed invoices in this period.</p>}
    </div>
  );
}

export function PaymentAnalytics({ total, invoices }) {
  const store = useStore();
  const records = asArray(invoices ?? store?.invoices);
  const methods = useMemo(() => {
    const amounts = { Cash: 0, UPI: 0, "Bank Transfer": 0, Others: 0 };
    records.forEach((invoice) => {
      if (String(invoice?.status || "").toLowerCase() !== "paid") return;
      amounts[paymentCategory(invoice?.method)] += asAmount(invoice?.total);
    });
    const paidTotal = Object.values(amounts).reduce((sum, amount) => sum + amount, 0);
    return {
      paidTotal,
      items: Object.entries(amounts).map(([name, amount]) => ({
        name,
        value: amount,
        percent: paidTotal > 0 ? (amount / paidTotal) * 100 : 0,
        color: PAYMENT_COLORS[name],
      })),
    };
  }, [records]);
  const hasBreakdown = methods.paidTotal > 0;

  return (
    <div className="panel p-5">
      <div className="mb-5 flex items-center gap-2">
        <ChartPie size={22} className="text-[#057546]" />
        <h2 className="card-heading">Payment Analytics</h2>
      </div>
      <div className="flex flex-col items-center justify-center gap-3 sm:flex-row xl:flex-col 2xl:flex-row">
        <div className="relative h-[205px] w-[205px] shrink-0">
          {hasBreakdown ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={methods.items.filter((item) => item.value > 0)} dataKey="value" innerRadius={63} outerRadius={90} paddingAngle={1} stroke="none">
                  {methods.items.filter((item) => item.value > 0).map((item) => <Cell key={item.name} fill={item.color} />)}
                </Pie>
                <Tooltip formatter={(value) => currency(asAmount(value))} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="absolute inset-[20px] rounded-full border-[22px] border-[#edf1ec]" />
          )}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <strong className="text-lg tracking-tight">{shortCurrency(hasBreakdown ? methods.paidTotal : asAmount(total))}</strong>
            <span className="muted mt-1 text-xs">{hasBreakdown ? "Paid invoices" : "Total billed"}</span>
          </div>
        </div>
        <div className="w-full min-w-[160px]">
          {methods.items.map((item) => (
            <div key={item.name} className="flex items-center justify-between gap-5 border-b border-[#ebeee9] py-3 text-[12px] last:border-0">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm" style={{ background: item.color }} />
                {item.name}
              </div>
              <strong title={currency(item.value)}>{item.percent.toFixed(1)}%</strong>
            </div>
          ))}
          {!hasBreakdown && <p className="mt-2 text-xs text-[#819287]">No paid invoices to show a payment breakdown.</p>}
        </div>
      </div>
    </div>
  );
}

export function SummaryCards({ invoices = [], customers = [], products = [] }) {
  const allInvoices = asArray(invoices);
  const totalBilled = allInvoices.reduce(
    (sum, invoice) => sum + (isCancelled(invoice) ? 0 : asAmount(invoice?.total)),
    0
  );
  const cards = [
    { label: "Total Invoices", value: allInvoices.length, icon: FileText },
    { label: "Total Sales", value: totalBilled, icon: Wallet, money: true },
    { label: "Total Customers", value: asArray(customers).length, icon: Users },
    { label: "Total Products", value: asArray(products).length, icon: Package },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
      {cards.map(({ label, value, icon: Icon, money }, index) => (
        <div key={label} className="panel flex min-h-[104px] items-center gap-4 p-4">
          <div className={`icon-box !h-12 !w-12 shrink-0 ${index === 1 || index === 3 ? "!bg-[#faf5e8] !text-[#bd9319]" : ""}`}>
            <Icon size={25} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[12px] font-semibold text-[#495a50]">{label}</span>
            <div className="mt-2 truncate text-[25px] font-extrabold tracking-tight">
              {money ? shortCurrency(value) : value}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function RecentInvoices({ invoices = [], onView, onAll }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);

  const pageSize = 5;

  const filteredInvoices = [...(Array.isArray(invoices) ? invoices : [])]
    .filter((invoice) => {
      const query = search.trim().toLowerCase();

      const matchesSearch = [
        invoice.id,
        invoice.customerName,
        invoice.method,
      ].some((value) =>
        String(value ?? "").toLowerCase().includes(query)
      );

      const matchesStatus =
        statusFilter === "All" ||
        String(invoice.status || "").toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === "highest") {
        return Number(b.total || 0) - Number(a.total || 0);
      }

      if (sortBy === "lowest") {
        return Number(a.total || 0) - Number(b.total || 0);
      }

      const dateA = String(a.date || "");
      const dateB = String(b.date || "");

      const comparison = dateB.localeCompare(dateA);

      if (comparison !== 0) {
        return sortBy === "oldest" ? -comparison : comparison;
      }

      const idComparison = String(b.id || "").localeCompare(
        String(a.id || ""),
        undefined,
        { numeric: true }
      );

      return sortBy === "oldest"
        ? -idComparison
        : idComparison;
    });

  const totalPages = Math.max(
    1,
    Math.ceil(filteredInvoices.length / pageSize)
  );

  const currentPage = Math.min(page, totalPages);

  const visibleInvoices = filteredInvoices.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const paidCount = (Array.isArray(invoices) ? invoices : []).filter(
    (invoice) => String(invoice.status || "").toLowerCase() === "paid"
  ).length;

  const pendingCount = (Array.isArray(invoices) ? invoices : []).filter(
    (invoice) => String(invoice.status || "").toLowerCase() === "pending"
  ).length;

  const handleFilter = (value) => {
    setStatusFilter(value);
    setPage(1);
  };

  return (
    <div className="panel min-w-0 overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8eee9] p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e8f5ec] text-[#087547]">
            <FileText size={22} />
          </div>

          <div>
            <h2 className="text-[16px] font-bold text-[#173d2c]">
              Recent Invoices
            </h2>
            <p className="mt-1 text-xs text-[#839188]">
              View and manage recent billing activity
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onAll?.()}
          className="flex items-center gap-2 rounded-lg border border-[#dce9df] px-3 py-2 text-xs font-bold text-[#087347] transition hover:bg-[#edf8f0]"
        >
          View All Invoices
          <ArrowRight size={15} />
        </button>
      </div>

      {/* Statistics */}
      <div className="flex flex-wrap gap-3 px-5 pt-4">
        <div className="rounded-lg bg-[#f4f6f3] px-3 py-2 text-xs">
          <span className="text-[#718077]">Total </span>
          <strong className="ml-1 text-[#244437]">
            {(Array.isArray(invoices) ? invoices : []).length}
          </strong>
        </div>

        <div className="rounded-lg bg-[#edf8f0] px-3 py-2 text-xs">
          <span className="text-[#087747]">Paid </span>
          <strong className="ml-1 text-[#087747]">
            {paidCount}
          </strong>
        </div>

        <div className="rounded-lg bg-[#fff4e7] px-3 py-2 text-xs">
          <span className="text-[#b86b14]">Pending </span>
          <strong className="ml-1 text-[#b86b14]">
            {pendingCount}
          </strong>
        </div>
      </div>

      {/* Search and filters */}
      <div className="flex flex-wrap items-center gap-3 p-5">
        <div className="relative min-w-[180px] flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#89988e]"
          />

          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search invoice or customer..."
            className="w-full rounded-lg border border-[#e1e9e2] bg-white py-2.5 pl-10 pr-3 text-xs outline-none focus:border-[#0b8755]"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) => handleFilter(event.target.value)}
          className="rounded-lg border border-[#e1e9e2] bg-white px-3 py-2.5 text-xs text-[#40584a] outline-none focus:border-[#0b8755]"
        >
          <option value="All">All Status</option>
          <option value="Paid">Paid</option>
          <option value="Pending">Pending</option>
        </select>

        <select
          value={sortBy}
          onChange={(event) => {
            setSortBy(event.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-[#e1e9e2] bg-white px-3 py-2.5 text-xs text-[#40584a] outline-none focus:border-[#0b8755]"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="highest">Highest Amount</option>
          <option value="lowest">Lowest Amount</option>
        </select>
      </div>

      {/* Invoice table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left">
          <thead className="bg-[#f7f9f6]">
            <tr>
              {[
                "Invoice Number",
                "Customer",
                "Date",
                "Amount",
                "Payment",
                "Status",
                "Action",
              ].map((heading) => (
                <th
                  key={heading}
                  className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-[#718378]"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-[#eef1ed]">
            {visibleInvoices.map((invoice) => (
              <tr
                key={invoice.id}
                className="transition-colors hover:bg-[#f8fbf8]"
              >
                <td className="whitespace-nowrap px-4 py-4">
                  <span className="text-xs font-bold text-[#087446]">
                    {invoice.id}
                  </span>
                </td>

                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e6f2ea] text-xs font-bold text-[#087347]">
                      {String(invoice.customerName || "?")
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <span className="text-xs font-semibold text-[#30463a]">
                      {invoice.customerName || "Unknown Customer"}
                    </span>
                  </div>
                </td>

                <td className="whitespace-nowrap px-4 py-4 text-xs text-[#66756b]">
                  {invoice.date ? niceDate(invoice.date) : "—"}
                </td>

                <td className="whitespace-nowrap px-4 py-4 text-xs font-bold text-[#253c30]">
                  {currency(Number(invoice.total || 0))}
                </td>

                <td className="whitespace-nowrap px-4 py-4 text-xs text-[#66756b]">
                  {invoice.method || "—"}
                </td>

                <td className="px-4 py-4">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${
                      String(invoice.status || "").toLowerCase() === "paid"
                        ? "bg-[#e5f6eb] text-[#087846]"
                        : String(invoice.status || "").toLowerCase() === "pending"
                          ? "bg-[#fff0de] text-[#bd7017]"
                          : "bg-[#f0f1f0] text-[#65736a]"
                    }`}
                  >
                    {invoice.status || "Unknown"}
                  </span>
                </td>

                <td className="px-4 py-4">
                  <button
                    type="button"
                    onClick={() => onView?.(invoice.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#dbe9df] px-3 py-2 text-xs font-bold text-[#087446] transition hover:bg-[#eaf6ee]"
                  >
                    <Eye size={14} />
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {visibleInvoices.length === 0 && (
          <div className="px-5 py-12 text-center">
            <FileText
              size={30}
              className="mx-auto text-[#abb9af]"
            />

            <h3 className="mt-3 text-sm font-semibold text-[#43594a]">
              No invoices found
            </h3>

            <p className="mt-1 text-xs text-[#88978c]">
              Try another search or payment status.
            </p>

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("All");
                setPage(1);
              }}
              className="mt-4 text-xs font-bold text-[#087747]"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Pagination */}
      {filteredInvoices.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e8eee9] px-5 py-4">
          <p className="text-xs text-[#7a897e]">
            Showing{" "}
            <strong>
              {(currentPage - 1) * pageSize + 1}
              {"–"}
              {Math.min(
                currentPage * pageSize,
                filteredInvoices.length
              )}
            </strong>{" "}
            of {filteredInvoices.length} invoices
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
              className="rounded-lg border border-[#dfe9e0] px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>

            <span className="text-xs font-semibold text-[#526c59]">
              {currentPage} / {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setPage(currentPage + 1)}
              className="rounded-lg border border-[#dfe9e0] px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
export function QuickActions({go}){const actions=[['Create New Invoice',FileText,'new-invoice'],['View All Invoices',Files,'invoices'],['View Reports',ChartColumnIncreasing,'reports'],['Manage Products',Boxes,'products']];return <div className="panel p-5"><div className="flex items-center gap-2 mb-5"><ArrowUpRight size={22} className="text-[#066d43]"/><h2 className="card-heading">Quick Actions</h2></div><div className="grid grid-cols-2 gap-3">{actions.map(([name,Icon,id])=><button key={id} onClick={()=>go(id)} className="flex items-center text-left justify-between gap-2 border border-[#e4ebe3] hover:border-[#0d8a56] rounded-xl p-3 min-h-[81px]"><div className="icon-box !w-10 !h-10 shrink-0"><Icon size={21}/></div><strong className="flex-1 text-[12px] leading-5">{name}</strong><ArrowRight size={15} className="text-[#075c3b] shrink-0"/></button>)}</div></div>}
