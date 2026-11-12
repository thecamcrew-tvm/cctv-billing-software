"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

// Firestore is the source of truth. LocalStorage is a read-only compatibility
// mirror for older print workflows, not the authoritative database.
const LOCAL_KEY = "cam-crew-billing-v1";
const StoreContext = createContext(null);

const DEFAULT_SETTINGS = {
  company: "The Cam Crew_TVM",
  subtitle: "Automation & Security Surveillance",
  address: "Pothencode & Vizhinjam, Trivandrum, Kerala",
  phone: "",
  email: "",
  gstin: "",
  invoicePrefix: "INV",
  notes: "",
  bankAccountName: "",
  bankName: "",
  bankAccountNumber: "",
  bankIfsc: "",
  bankBranch: "",
  bankUpiId: "",
};

const INITIAL = { invoices: [], customers: [], products: [], settings: DEFAULT_SETTINGS };
const SECTIONS = new Set(["invoices", "customers", "products", "settings"]);
const isObject = (value) => value && typeof value === "object" && !Array.isArray(value);

function normalize(value) {
  return {
    invoices: Array.isArray(value?.invoices) ? value.invoices : [],
    customers: Array.isArray(value?.customers) ? value.customers : [],
    products: Array.isArray(value?.products) ? value.products : [],
    settings: { ...DEFAULT_SETTINGS, ...(isObject(value?.settings) ? value.settings : {}) },
  };
}

function readOldData() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(LOCAL_KEY) || "null");
    return isObject(saved) ? normalize(saved) : null;
  } catch {
    return null;
  }
}

function mirror(state) {
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("Local compatibility cache unavailable:", error);
  }
}

function hasAnyData(state) {
  return Boolean(state.invoices.length || state.customers.length || state.products.length ||
    Object.entries(state.settings || {}).some(([key, value]) =>
      (key.startsWith("bank") || key === "gstin") && String(value ?? "").trim()
    ));
}

async function requestJson(path, init) {
  const response = await fetch(path, {
    credentials: "same-origin",
    cache: "no-store",
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error || `Server error: ${response.status}`);
  }
  return result;
}

function diffRecords(previous, next) {
  if (!Array.isArray(next)) throw new Error("Expected an array of records.");
  const oldMap = new Map(previous.map((item) => [String(item.id), item]));
  const nextMap = new Map(next.map((item) => [String(item.id), item]));
  const operations = [];
  for (const [id, record] of nextMap) {
    if (!record || !record.id) throw new Error("Every record must have an ID.");
    const before = oldMap.get(id);
    if (!before) operations.push({ type: "create", id, value: record });
    else if (JSON.stringify(before) !== JSON.stringify(record)) {
      operations.push({ type: "set", id, value: record });
    }
  }
  for (const id of oldMap.keys()) {
    if (!nextMap.has(id)) operations.push({ type: "delete", id });
  }
  return operations;
}

export function StoreProvider({ children }) {
  const [state, setState] = useState(INITIAL);
  const stateRef = useRef(INITIAL);
  const queue = useRef(Promise.resolve());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [migration, setMigration] = useState(null);
  const [migrating, setMigrating] = useState(false);
  const [ready, setReady] = useState(false);

  const publish = useCallback((value) => {
    const normalized = normalize(value);
    stateRef.current = normalized;
    setState(normalized);
    mirror(normalized);
  }, []);

  const load = useCallback(async ({ initial = false } = {}) => {
    if (initial) setLoading(true);
    try {
      const old = initial ? readOldData() : null;
      const { state: fetched } = await requestJson("/api/billing/state");
      const fresh = normalize(fetched);

      if (initial && !hasAnyData(fresh) && old && hasAnyData(old)) {
        // Do not automatically overwrite Firestore with a stale browser.
        // Explicit user action is needed before any legacy data is uploaded.
        setMigration(old);
        stateRef.current = fresh;
        setState(fresh);
      } else {
        publish(fresh);
      }
      setError("");
      setReady(true);
      return true;
    } catch (cause) {
      console.error("Firebase billing load failed:", cause);
      setError(cause.message || "Unable to read Firebase data.");
      return false;
    } finally {
      if (initial) setLoading(false);
    }
  }, [publish]);

  useEffect(() => {
    load({ initial: true });
  }, [load]);

  const refresh = useCallback(() => {
    if (!ready || migration) return Promise.resolve(false);
    // Don't overwrite a recently saved record while its write is pending.
    return queue.current.then(() => load());
  }, [load, ready, migration]);

  useEffect(() => {
    if (!ready || migration) return undefined;
    const onFocus = () => { refresh(); };
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 30000);
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [ready, migration, refresh]);

  const update = useCallback((section, updater) => {
    if (!SECTIONS.has(section)) return Promise.resolve(false);
    if (!ready || migration) {
      setError("Complete Firebase setup/import before modifying data.");
      return Promise.resolve(false);
    }

    const job = queue.current.then(async () => {
      const previous = stateRef.current;
      const nextValue = typeof updater === "function" ? updater(previous[section]) : updater;
      const nextState = { ...previous, [section]: nextValue };
      let payload;

      if (section === "settings") {
        payload = { section, value: nextValue };
      } else {
        const operations = diffRecords(previous[section], nextValue);
        if (!operations.length) return true;
        payload = { section, operations };
      }

      await requestJson("/api/billing/state", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      publish(nextState);
      setError("");
      return true;
    }).catch((cause) => {
      console.error("Firebase billing write failed:", cause);
      setError(cause.message || "Unable to save to Firebase.");
      return false;
    });
    queue.current = job.then(() => undefined);
    return job;
  }, [publish, ready, migration]);

  const importLegacy = useCallback(async () => {
    if (!migration) return;
    setMigrating(true);
    try {
      await requestJson("/api/billing/import", {
        method: "POST",
        body: JSON.stringify({ state: migration }),
      });
      setMigration(null);
      setReady(true);
      await load();
    } catch (cause) {
      setError(cause.message);
      window.alert(cause.message);
    } finally {
      setMigrating(false);
    }
  }, [migration, load]);

  const skipLegacy = () => {
    setMigration(null);
    publish(stateRef.current);
  };

  const reset = () => {
    setError("Cloud reset is intentionally disabled to protect billing records. Delete individual records from their pages.");
    return Promise.resolve(false);
  };

  if (loading) {
    return <div style={{ padding: 48, textAlign: "center" }}>Connecting to Firebase billing database...</div>;
  }
  if (!ready) {
    return (
      <div style={{ padding: 48, maxWidth: 520, margin: "auto", textAlign: "center" }}>
        <h2 style={{ fontWeight: 700 }}>Firebase connection unavailable</h2>
        <p>{error || "Unable to load the billing database."}</p>
        <button className="btn btn-primary" type="button" onClick={() => load({ initial: true })}>Retry connection</button>
      </div>
    );
  }

  return (
    <StoreContext.Provider value={{ ...state, update, reset, refresh, loading, error }}>
      {migration && (
        <div style={{ position: "fixed", inset: 0, background: "#051d11bb", zIndex: 9999, display: "grid", placeItems: "center", padding: 18 }}>
          <div style={{ background: "white", color: "#163e2a", borderRadius: 18, padding: 26, maxWidth: 560, width: "100%" }}>
            <h2 style={{ fontWeight: 800, fontSize: 20 }}>Existing browser billing data found</h2>
            <p style={{ marginTop: 10 }}>Firebase has no billing records yet. This browser contains {migration.invoices.length} invoices, {migration.customers.length} customers, and {migration.products.length} products.</p>
            <p style={{ marginTop: 10 }}>Import this browser's data once, or start with an empty Firestore database. Avoid importing sample/demo data by accident.</p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 22 }}>
              <button className="btn btn-primary" type="button" disabled={migrating} onClick={importLegacy}>
                {migrating ? "Importing..." : "Import existing data"}
              </button>
              <button className="btn btn-outline" type="button" disabled={migrating} onClick={skipLegacy}>Start empty</button>
            </div>
          </div>
        </div>
      )}
      {!!error && <div role="alert" style={{ position: "fixed", top: 12, right: 12, zIndex: 10000, maxWidth: 410, padding: 12, borderRadius: 8, background: "#fff3f1", color: "#b42318", boxShadow: "0 2px 16px #0002" }}>Firebase: {error}</div>}
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used inside StoreProvider.");
  return context;
}
