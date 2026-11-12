import "server-only";
import { getBillingDb } from "@/lib/firebaseAdminBilling";

export const SECTION_COLLECTIONS = {
  invoices: "camCrewInvoices",
  customers: "camCrewCustomers",
  products: "camCrewProducts",
};
export const SETTINGS_DOC_PATH = "camCrewConfig/businessSettings";

export function assertValidRecordId(id) {
  if (
    typeof id !== "string" ||
    !id.trim() ||
    id.length > 180 ||
    id === "." || id === ".." ||
    id.includes("/") || id.includes("\\")
  ) {
    throw new Error("Invalid record ID.");
  }
}

export function assertPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("An object value is required.");
  }
  // Restrict payload to JSON-serializable data (app state is plain JSON).
  if (JSON.stringify(value).length > 250_000) {
    throw new Error("Record is too large.");
  }
}

export async function readBillingState() {
  const db = getBillingDb();
  const [invoicesSnap, customersSnap, productsSnap, settingsSnap] =
    await Promise.all([
      db.collection(SECTION_COLLECTIONS.invoices).get(),
      db.collection(SECTION_COLLECTIONS.customers).get(),
      db.collection(SECTION_COLLECTIONS.products).get(),
      db.doc(SETTINGS_DOC_PATH).get(),
    ]);

  function records(snapshot) {
    return snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
  }

  return {
    invoices: records(invoicesSnap),
    customers: records(customersSnap),
    products: records(productsSnap),
    settings: settingsSnap.exists ? settingsSnap.data() : {},
  };
}
