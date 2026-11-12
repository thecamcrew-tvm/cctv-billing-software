import { NextResponse } from "next/server";
import { getBillingDb } from "@/lib/firebaseAdminBilling";
import { isBillingAdmin } from "@/lib/billingServerAuth";
import {
  SECTION_COLLECTIONS,
  SETTINGS_DOC_PATH,
  assertPlainObject,
  assertValidRecordId,
} from "@/lib/billingFirestoreModel";

export const runtime = "nodejs";
const reply = (body, status = 200) => NextResponse.json(body, {
  status,
  headers: { "Cache-Control": "no-store" },
});

export async function POST(request) {
  if (!(await isBillingAdmin(request))) return reply({ error: "Login required." }, 401);

  try {
    const payload = await request.json();
    const state = payload?.state;
    assertPlainObject(state);

    const total = ["invoices", "customers", "products"].reduce((sum, section) => {
      if (!Array.isArray(state[section])) throw new Error(`Invalid ${section} array.`);
      return sum + state[section].length;
    }, 0);
    if (total > 400) {
      return reply({ error: "Import supports up to 400 records. Contact a developer for a larger migration." }, 413);
    }

    const db = getBillingDb();
    const checks = await Promise.all([
      ...Object.values(SECTION_COLLECTIONS).map((name) => db.collection(name).limit(1).get()),
      db.doc(SETTINGS_DOC_PATH).get(),
    ]);
    if (checks.slice(0, 3).some((snap) => !snap.empty) || checks[3].exists) {
      return reply({ error: "Firebase already contains billing data. Import was stopped to prevent overwriting it." }, 409);
    }

    const batch = db.batch();
    for (const [section, collectionName] of Object.entries(SECTION_COLLECTIONS)) {
      const seen = new Set();
      for (const record of state[section]) {
        assertPlainObject(record);
        const id = String(record.id || "");
        assertValidRecordId(id);
        if (seen.has(id)) throw new Error(`Duplicate ${section} ID: ${id}`);
        seen.add(id);
        batch.create(db.collection(collectionName).doc(id), record);
      }
    }
    assertPlainObject(state.settings || {});
    batch.create(db.doc(SETTINGS_DOC_PATH), state.settings || {});
    batch.create(db.doc("camCrewConfig/initialImport"), { importedAt: new Date().toISOString() });
    await batch.commit();
    return reply({ success: true, imported: total });
  } catch (error) {
    console.error("Billing import failed:", error);
    if (/ALREADY_EXISTS|already exists/i.test(error.message || "")) {
      return reply({ error: "Another import has already been completed." }, 409);
    }
    if (/Invalid|Duplicate|too large/.test(String(error.message))) {
      return reply({ error: error.message }, 400);
    }
    return reply({ error: "Firebase import failed. No import was confirmed." }, 503);
  }
}

