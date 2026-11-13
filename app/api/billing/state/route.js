import { NextResponse } from "next/server";
import { getBillingDb } from "@/lib/firebaseAdminBilling";
import { isBillingAdmin } from "@/lib/billingServerAuth";
import {
  SECTION_COLLECTIONS,
  SETTINGS_DOC_PATH,
  assertPlainObject,
  assertValidRecordId,
  readBillingState,
} from "@/lib/billingFirestoreModel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_CACHE = { "Cache-Control": "private, no-store" };
const json = (data, status = 200) =>
  NextResponse.json(data, { status, headers: NO_CACHE });

export async function GET(request) {
  if (!(await isBillingAdmin(request))) {
    return json({ error: "Login required." }, 401);
  }

  try {
    return json({ state: await readBillingState() });
  } catch (error) {
    console.error("Billing Firestore read failed:", error);

    return json(
      {
        error:
          "Could not load billing data from Firebase. Check server credentials and Firestore setup.",
      },
      503
    );
  }
} 
// Closes the GET function
export async function POST(request) {
  if (!(await isBillingAdmin(request))) {
    return json({ error: "Login required." }, 401);
  }
  try {
    const body = await request.json();
    const section = body?.section;
    const db = getBillingDb();

    if (section === "settings") {
      assertPlainObject(body.value);
      await db.doc(SETTINGS_DOC_PATH).set(body.value);
      return json({ success: true });
    }

    const collectionName = SECTION_COLLECTIONS[section];
    if (!collectionName) {
      return json({ error: "Unknown billing section." }, 400);
    }

    const operations = body?.operations;
    if (!Array.isArray(operations) || operations.length > 100) {
      return json({ error: "Operations must be an array of at most 100 changes." }, 400);
    }

    // Validate the whole request before any database writes.
    for (const op of operations) {
      if (!op || !["create", "set", "delete"].includes(op.type)) {
        return json({ error: "Invalid operation." }, 400);
      }
      assertValidRecordId(op.id);
      if (op.type !== "delete") {
        assertPlainObject(op.value);
        if (String(op.value.id) !== op.id) {
          return json({ error: "Record ID must match document ID." }, 400);
        }
      }
    }

    const batch = db.batch();
    for (const op of operations) {
      const doc = db.collection(collectionName).doc(op.id);
      if (op.type === "create") {
        batch.create(doc, op.value); // Won't overwrite an existing invoice.
      } else if (op.type === "set") {
        batch.set(doc, op.value);
      } else {
        batch.delete(doc);
      }
    }
    if (operations.length) await batch.commit();
    return json({ success: true });
  } catch (error) {
    console.error("Billing Firestore write failed:", error);
    if (String(error.code) === "6" || /ALREADY_EXISTS|already exists/i.test(error.message || "")) {
      return json({ error: "This record already exists. Refresh and try again." }, 409);
    }
    if (/Invalid|too large|required/.test(String(error.message))) {
      return json({ error: error.message }, 400);
    }
    return json({ error: "Could not save to Firebase. Verify server credentials and database availability." }, 503);
  }
}

