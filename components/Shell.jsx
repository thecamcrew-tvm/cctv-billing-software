"use client";
import { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  FilePlus2,
  Files,
  Users,
  Package,
  ChartNoAxesCombined,
  CreditCard,
  Settings,
  LogOut,
  Search,
  Bell,
  ChevronDown,
  CalendarDays,
  Menu,
  X,
  Cctv,
  MapPin,
  ShieldCheck,
  ReceiptText,
} from "lucide-react";
import { useStore } from "@/lib/store";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "new-invoice", label: "New Invoice", icon: FilePlus2 },
  { id: "invoices", label: "Invoices", icon: Files },
  { id: "customers", label: "Customers", icon: Users },
  { id: "products", label: "Products", icon: Package },
  { id: "reports", label: "Reports", icon: ChartNoAxesCombined },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function Shell({ page, setPage, children }) {
  const { settings } = useStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const profileRef = useRef(null);
  const notificationsRef = useRef(null);

  const navigate = (nextPage) => {
    setPage(nextPage);
    setMobileOpen(false);
    setProfileOpen(false);
    setNotificationsOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const searchInvoices = (event) => {
    event?.preventDefault();
    // Existing Invoices component reads this key in its useEffect.
    sessionStorage.setItem("cam-crew-search", search.trim());
    navigate("invoices");
  };

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  useEffect(() => {
    function closeOnOutsideClick(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target)
      ) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, []);

  const sidebar = (
    <div className="flex h-full flex-col bg-[#033626] px-3 py-5 text-white">
      <div className="mb-8 px-2 text-center">
        <div className="relative inline-flex h-14 w-20 items-center justify-center">
          <div className="absolute h-10 w-16 -rotate-[22deg] rounded-[50%] border-l-[3px] border-t-[3px] border-[#d9b84c]" />
          <Cctv className="relative text-white" size={45} strokeWidth={1.7} />
        </div>
        <div className="mt-1 text-[18px] font-extrabold leading-tight">
          {settings?.company || "The Cam Crew_TVM"}
        </div>
        <div className="mt-1 text-[10px] text-[#d2e3d8]">
          {settings?.subtitle || "Automation & Security Surveillance"}
        </div>
        <div className="mx-auto mt-5 h-[2px] w-16 rounded-full bg-[#d6b448]" />
      </div>

      <nav aria-label="Main navigation" className="flex-1 space-y-1">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            aria-current={page === id ? "page" : undefined}
            onClick={() => navigate(id)}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-[13px] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d9b84c] ${
              page === id
                ? "bg-[#08754b] font-bold shadow-md"
                : "text-[#d9e9e0] hover:bg-white/10"
            }`}
          >
            <Icon size={19} strokeWidth={1.8} />
            {label}
          </button>
        ))}
      </nav>

      <div className="relative mt-7 min-h-[156px] overflow-hidden rounded-2xl border border-white/10 bg-[#084b36] p-4 pt-6">
        <Cctv
          size={132}
          strokeWidth={1}
          className="absolute -right-3 -top-2 -rotate-[18deg] opacity-20"
        />
        <div className="relative z-10 mt-8">
          <ShieldCheck size={23} className="text-[#d4b246]" />
          <p className="mt-2 text-xs font-bold">Securing Every Connection</p>
          <p className="mt-2 flex gap-2 text-[10px] leading-relaxed text-[#c6dfd2]">
            <MapPin size={18} className="shrink-0 text-[#dfb94f]" />
            <span>Pothencode &amp; Vizhinjam, Trivandrum, Kerala, India</span>
          </p>
        </div>
      </div>

      <div className="mt-4 border-t border-white/10 pt-3">
        <a
  href="/admin/logout"
  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-red-400 transition hover:bg-red-500/10"
>
  <LogOut size={19} />
  <span>Logout</span>
</a>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fafbf8]">
      <aside className="app-sidebar fixed inset-y-0 left-0 z-30 hidden w-[244px] lg:block">
        {sidebar}
      </aside>

      {mobileOpen && (
        <>
          <button
            type="button"
            aria-label="Close navigation"
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-[270px] lg:hidden">
            <button
              type="button"
              aria-label="Close menu"
              className="absolute right-3 top-3 z-10 rounded-lg p-2 text-white hover:bg-white/10"
              onClick={() => setMobileOpen(false)}
            >
              <X size={20} />
            </button>
            {sidebar}
          </aside>
        </>
      )}

      <div className="app-main lg:ml-[244px]">
        <header className="app-topbar sticky top-0 z-20 flex h-[70px] items-center justify-between gap-3 border-b border-[#e7ebe5] bg-white/95 px-4 backdrop-blur sm:gap-5 lg:px-8">
          <form onSubmit={searchInvoices} className="flex min-w-0 flex-1 items-center gap-3">
            <button
              type="button"
              aria-label="Open navigation"
              className="text-[#03482d] lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={22} />
            </button>
            <div className="relative max-w-[480px] flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#526157]"
              />
              <input
                className="field !h-10 !bg-[#f7f8f6] !pl-10"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search invoices and customers"
                aria-label="Search invoices"
              />
            </div>
            <button type="submit" className="btn btn-light hidden sm:inline-flex">
              Search
            </button>
          </form>

          <div className="flex shrink-0 items-center gap-3 sm:gap-4">
            <div className="relative" ref={notificationsRef}>
              <button
                type="button"
                title="Notifications"
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
                onClick={() => {
                  setNotificationsOpen((old) => !old);
                  setProfileOpen(false);
                }}
                className="relative flex items-center"
              >
                <Bell size={20} />
              </button>
              {notificationsOpen && (
                <div className="panel absolute right-0 top-9 w-[230px] p-4 text-xs shadow-xl">
                  No new notifications.
                </div>
              )}
            </div>

            <div className="hidden items-center gap-2 border-l pl-4 text-[12px] font-semibold md:flex">
              <CalendarDays size={18} />
              {new Date().toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </div>

            <div className="relative border-l pl-3 sm:pl-4" ref={profileRef}>
              <button
                type="button"
                aria-expanded={profileOpen}
                aria-label="Admin menu"
                className="flex items-center gap-2"
                onClick={() => {
                  setProfileOpen((old) => !old);
                  setNotificationsOpen(false);
                }}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#07533b] font-bold text-white">
                  A
                </span>
                <span className="hidden text-sm font-bold sm:block">Admin</span>
                <ChevronDown size={16} />
              </button>
              {profileOpen && (
                <div className="panel absolute right-0 top-12 w-44 p-2 shadow-xl">
                  <button
                    type="button"
                    className="block w-full rounded-lg p-3 text-left text-sm hover:bg-gray-50"
                    onClick={() => navigate("settings")}
                  >
                    Business settings
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg p-3 text-left text-sm hover:bg-gray-50"
                    onClick={() => {
                      setProfileOpen(false);
                      window.location.assign("/bill");
                    }}
                  >
                    <ReceiptText size={16} />
                    Bill editor
                  </button>
                  <div className="my-1 border-t border-gray-100" />
                  <a
                    href="/admin/logout"
                    className="flex w-full items-center gap-2 rounded-lg p-3 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
                  >
                    <LogOut size={16} />
                    Logout
                  </a>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="content-scroll mx-auto max-w-[1700px] px-4 py-7 sm:px-6 lg:px-7">
          {children}
        </main>
      </div>
    </div>
  );
}