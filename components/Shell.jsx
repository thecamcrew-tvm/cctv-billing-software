"use client";
import { useCallback, useEffect, useRef, useState } from "react";
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
  Wrench,
} from "lucide-react";
import { useStore } from "@/lib/store";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "service", label: "Service", icon: Wrench },
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
  const [serviceRequests, setServiceRequests] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");
  const newServiceRequests = serviceRequests.filter((item) => (item.status || "new") === "new");

  const loadServiceNotifications = useCallback(async () => {
    setNotificationsLoading(true);
    try {
      const response = await fetch("/api/admin/client-requests", {
        credentials: "same-origin",
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || `Request failed (${response.status})`);
      }
      setServiceRequests(Array.isArray(data.requests) ? data.requests : []);
      setNotificationsError("");
    } catch (error) {
      setNotificationsError(error.message || "Could not load service notifications.");
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  // Load immediately, then poll while the admin dashboard is open.
  // No additional database permission is given to the browser.
  useEffect(() => {
    void loadServiceNotifications();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadServiceNotifications();
      }
    }, 45000);
    return () => window.clearInterval(interval);
  }, [loadServiceNotifications]);
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
    <div className="flex h-full flex-col bg-gradient-to-b from-[#071e49] via-[#0a2d65] to-[#04152f] px-3 py-5 text-white">
      <div className="mb-8 px-2 text-center">
        <div className="relative inline-flex h-14 w-20 items-center justify-center">
          <div className="absolute h-10 w-16 -rotate-[22deg] rounded-[50%] border-l-[3px] border-t-[3px] border-[#e4ad44]" />
          <Cctv className="relative text-[#f6f9ff] drop-shadow-[0_2px_8px_rgba(228,173,68,0.25)]" size={45} strokeWidth={1.7} />
        </div>
        <div className="mt-1 text-[18px] font-extrabold leading-tight">
          {settings?.company || "The Cam Crew_TVM"}
        </div>
        <div className="mt-1 text-[10px] text-[#c4d4ee]">
          {settings?.subtitle || "Automation & Security Surveillance"}
        </div>
        <div className="mx-auto mt-5 h-[2px] w-16 rounded-full bg-gradient-to-r from-[#c48720] via-[#ffd779] to-[#c48720]" />
      </div>

      <nav aria-label="Main navigation" className="flex-1 space-y-1">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            aria-current={page === id ? "page" : undefined}
            onClick={() => navigate(id)}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-[13px] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e4ad44] ${
              page === id
                ? "bg-gradient-to-r from-[#174c94] to-[#0b2d64] font-bold text-white shadow-[0_7px_20px_rgba(0,0,0,0.22)] ring-1 ring-[#e4ad44]/50"
                : "text-[#d5e2f5] hover:bg-white/10 hover:text-[#ffd779]"
            }`}
          >
            <Icon size={19} strokeWidth={1.8} />
            {label}
          </button>
        ))}
      </nav>

      <div className="relative mt-7 min-h-[156px] overflow-hidden rounded-2xl border border-[#e4ad44]/30 bg-gradient-to-br from-[#174c94]/75 to-[#071b43] p-4 pt-6">
        <Cctv
          size={132}
          strokeWidth={1}
          className="absolute -right-3 -top-2 -rotate-[18deg] opacity-20"
        />
        <div className="relative z-10 mt-8">
          <ShieldCheck size={23} className="text-[#f4c66b]" />
          <p className="mt-2 text-xs font-bold">Securing Every Connection</p>
          <p className="mt-2 flex gap-2 text-[10px] leading-relaxed text-[#c4d4ee]">
            <MapPin size={18} className="shrink-0 text-[#f4c66b]" />
            <span>Pothencode &amp; Vizhinjam, Trivandrum, Kerala, India</span>
          </p>
        </div>
      </div>

      <div className="mt-4 border-t border-white/10 pt-3">
        <a
          href="/admin/logout"
          onClick={() => setMobileOpen(false)}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-[#ffced2] transition hover:bg-red-500/15 hover:text-white"
        >
          <LogOut size={19} strokeWidth={1.8} />
          <span>Logout</span>
        </a>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f5f8fe] text-[#10294f]">
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
        <header className="app-topbar sticky top-0 z-20 flex h-[70px] items-center justify-between gap-3 border-b border-[#dfe7f4] bg-white/95 shadow-[0_2px_14px_rgba(7,30,73,0.05)] px-4 backdrop-blur sm:gap-5 lg:px-8">
          <form onSubmit={searchInvoices} className="flex min-w-0 flex-1 items-center gap-3">
            <button
              type="button"
              aria-label="Open navigation"
              className="text-[#071e49] lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={22} />
            </button>
            <div className="relative max-w-[480px] flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71829d]"
              />
              <input
                className="field !h-10 !border-[#dbe5f2] !bg-[#f5f8fe] !pl-10 !text-[#10294f] focus:!border-[#174c94] focus:!ring-2 focus:!ring-[#174c94]/15"
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
                title="Service notifications"
                aria-label={`Notifications: ${newServiceRequests.length} new service requests`}
                aria-expanded={notificationsOpen}
                onClick={() => {
                  setNotificationsOpen((old) => !old);
                  setProfileOpen(false);
                  void loadServiceNotifications();
                }}
                className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#e3eaf5] bg-[#f5f8fe] text-[#173967] transition hover:border-[#e4ad44] hover:bg-[#edf3fd]"
              >
                <Bell size={20} />
                {newServiceRequests.length > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
                    {newServiceRequests.length > 99 ? "99+" : newServiceRequests.length}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="panel absolute right-0 top-10 z-50 w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden border border-[#dce5f3] bg-white p-0 shadow-[0_24px_60px_rgba(7,30,73,0.18)] sm:w-[380px]">
                  <div className="flex items-center justify-between border-b border-[#e5ebf5] p-4">
                    <div>
                      <p className="text-sm font-bold text-[#10294f]">Client service messages</p>
                      <p className="mt-1 text-xs text-[#70829c]">
                        {newServiceRequests.length} new service request{newServiceRequests.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="text-xs font-semibold text-[#174c94] hover:text-[#b17b1d] hover:underline"
                      onClick={() => navigate("service")}
                    >
                      View all
                    </button>
                  </div>

                  {notificationsError && (
                    <div className="border-b border-red-100 bg-red-50 p-3 text-xs text-red-700">
                      {notificationsError}
                      <button
                        type="button"
                        className="ml-2 font-bold underline"
                        onClick={() => void loadServiceNotifications()}
                      >
                        Retry
                      </button>
                    </div>
                  )}

                  <div className="max-h-[340px] overflow-y-auto">
                    {notificationsLoading && serviceRequests.length === 0 ? (
                      <p className="p-5 text-center text-xs text-[#70829c]">Loading notifications...</p>
                    ) : newServiceRequests.length === 0 && !notificationsError ? (
                      <p className="p-5 text-center text-xs text-[#70829c]">No new service requests.</p>
                    ) : (
                      newServiceRequests.slice(0, 5).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => navigate("service")}
                          className="block w-full border-b border-[#e5ebf5] px-4 py-3 text-left hover:bg-[#f0f5fd]"
                        >
                          <span className="block text-xs font-bold text-[#10294f]">
                            {item.name || "Customer"} — {item.serviceType || "Service request"}
                          </span>
                          <span className="mt-1 block text-xs text-[#526681]">
                            {String(item.description || "New request received").slice(0, 120)}
                          </span>
                          <span className="mt-1 block text-[11px] text-[#8a9ab0]">
                            {item.createdAt && !Number.isNaN(Date.parse(item.createdAt))
                              ? new Date(item.createdAt).toLocaleString("en-IN", {
                                  day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                                })
                              : "Recently received"}
                          </span>
                        </button>
                      ))
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate("service")}
                    className="block w-full border-t border-[#e5ebf5] bg-[#f5f8fe] p-3 text-center text-xs font-semibold text-[#174c94] hover:bg-[#f0f5fd]"
                  >
                    Open Service Management
                  </button>
                </div>
              )}
            </div>

            <div className="hidden items-center gap-2 border-l border-[#e2eaf5] pl-4 text-[12px] font-semibold text-[#425b7e] md:flex">
              <CalendarDays size={18} />
              {new Date().toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </div>

            <div className="relative border-l border-[#e2eaf5] pl-3 sm:pl-4" ref={profileRef}>
              <button
                type="button"
                aria-expanded={profileOpen}
                aria-label="Admin menu"
                className="flex items-center gap-2 text-[#10294f]"
                onClick={() => {
                  setProfileOpen((old) => !old);
                  setNotificationsOpen(false);
                }}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#174c94] to-[#071e49] ring-2 ring-[#e4ad44]/60 font-bold text-white">
                  A
                </span>
                <span className="hidden text-sm font-bold sm:block">Admin</span>
                <ChevronDown size={16} />
              </button>
              {profileOpen && (
                <div className="panel absolute right-0 top-12 w-44 border border-[#dce5f3] bg-white p-2 shadow-[0_20px_45px_rgba(7,30,73,0.16)]">
                  <button
                    type="button"
                    className="block w-full rounded-lg p-3 text-left text-sm text-[#10294f] hover:bg-[#f0f5fd]"
                    onClick={() => navigate("settings")}
                  >
                    Business settings
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg p-3 text-left text-sm text-[#10294f] hover:bg-[#f0f5fd]"
                    onClick={() => {
                      setProfileOpen(false);
                      window.location.assign("/bill");
                    }}
                  >
                    <ReceiptText size={16} />
                    Bill editor
                  </button>
                  <div className="my-1 border-t border-[#e5ebf5]" />
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
