import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { FieldValue } from "firebase-admin/firestore";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/adminSession";
import { getBillingDb } from "@/lib/firebaseAdminBilling";
import { uploadBillingRequestPhoto, deleteBillingRequestPhoto } from "@/lib/billingRequestStorage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLLECTION = "billingClientRequests";
const STATUSES = new Set(["new", "in_progress", "completed", "cancelled"]);
const SERVICE_TYPES = new Set([
  "CCTV Installation", "CCTV Repair", "Maintenance / AMC",
  "Access Control", "Smart Automation", "Other Service",
]);

async function requireAdmin() {
  const secret = process.env.ADMIN_SESSION_SECRET || "";
  if (secret.length < 32) return false;
  const store = await cookies();
  const token = store.get(ADMIN_SESSION_COOKIE)?.value;
  return Boolean(await verifyAdminSession(token, secret));
}

function reply(value, status = 200) {
  return NextResponse.json(value, {
    status, headers: { "Cache-Control": "no-store" },
  });
}

function asText(value, max) {
  return String(value ?? "").trim().slice(0, max);
}

function asIso(value) {
  if (value && typeof value.toDate === "function") return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return null;
}

// Admin New Service supports JSON as well as private Cloudinary photo attachments.
// PATCH accepts JSON/form fields only. Never accept client-supplied image URLs or IDs.
const MAX_PHOTOS = 3;
const MAX_IMAGE_BYTES = 1_200_000;
const MAX_MULTIPART_BYTES = 4_200_000;

function httpError(message, status = 400) {
  return Object.assign(new Error(message), { status });
}

function identifyPhoto(bytes) {
  if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) {
    return { mimeType: "image/jpeg", ext: "jpg" };
  }
  if (bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return { mimeType: "image/png", ext: "png" };
  }
  if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" &&
      bytes.toString("ascii", 8, 12) === "WEBP") {
    return { mimeType: "image/webp", ext: "webp" };
  }
  return null;
}

async function readBody(request, { allowImages = false } = {}) {
  const type = String(request.headers.get("content-type") || "").toLowerCase();
  const declaredSize = Number(request.headers.get("content-length") || 0);
  const limit = allowImages ? MAX_MULTIPART_BYTES : 64 * 1024;
  if (declaredSize > limit) throw httpError("Request is too large.", 413);

  const origin = request.headers.get("origin");
  if (origin) {
    let validOrigin = false;
    try { validOrigin = new URL(origin).origin === new URL(request.url).origin; }
    catch { validOrigin = false; }
    if (!validOrigin) throw httpError("Request origin is not allowed.", 403);
  }

  let body;
  let images = [];
  if (type.includes("multipart/form-data")) {
    const data = await request.formData();
    images = data.getAll("images");
    if (images.length && !allowImages) {
      throw httpError("Photo attachments are only supported when creating a service.");
    }
    if (images.length > MAX_PHOTOS) {
      throw httpError("Attach no more than 3 photos.");
    }
    for (const [key, value] of data.entries()) {
      if (value && typeof value.arrayBuffer === "function" && key !== "images") {
        throw httpError("Unexpected file attachment field. Use images.");
      }
    }
    for (const file of images) {
      if (!file || typeof file.arrayBuffer !== "function") {
        throw httpError("Invalid photo attachment.");
      }
      if (file.size < 1 || file.size > MAX_IMAGE_BYTES) {
        throw httpError("Each photo must be smaller than 1.2 MB.", 413);
      }
    }
    body = Object.fromEntries(
      [...data.entries()]
        .filter(([, value]) => !value || typeof value.arrayBuffer !== "function")
        .map(([key, value]) => [key, String(value)])
    );
  } else if (type.includes("application/x-www-form-urlencoded")) {
    const raw = await request.text();
    if (raw.length > 64 * 1024) throw httpError("Request is too large.", 413);
    body = Object.fromEntries(new URLSearchParams(raw));
  } else if (type.includes("application/json") || type.includes("text/plain") || !type) {
    const raw = await request.text();
    if (raw.length > 64 * 1024) throw httpError("Request is too large.", 413);
    try { body = JSON.parse(raw); }
    catch { throw httpError("Invalid JSON body. Check the request payload."); }
  } else {
    throw httpError("Unsupported request format. Send JSON or multipart/form-data.", 415);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw httpError("Invalid request payload.");
  }
  return { body, images };
}

export async function GET() {
  if (!(await requireAdmin())) return reply({ error: "Admin login required." }, 401);
  try {
    const snapshot = await getBillingDb().collection(COLLECTION)
      .orderBy("createdAt", "desc").limit(200).get();
    const requests = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: asText(data.name, 100),
        phone: asText(data.phone, 20),
        email: asText(data.email, 150),
        serviceType: asText(data.serviceType, 60),
        city: asText(data.city, 120),
        address: asText(data.address, 300),
        description: asText(data.description, 2000),
        reference: asText(data.reference, 40),
        // Return original Firestore image indices.  Do not re-index after filtering:
        // legacy/non-Cloudinary entries may otherwise point at the wrong image.
        images: (Array.isArray(data.images) ? data.images : []).slice(0, 3)
          .map((image, index) => image?.storageProvider === "cloudinary" && image?.publicId
            ? {
                index,
                url: `/api/admin/client-requests/image?requestId=${encodeURIComponent(doc.id)}&index=${index}`,
              }
            : null)
          .filter(Boolean),
        preferredDate: data.preferredDate || "",
        status: STATUSES.has(data.status) ? data.status : "new",
        source: data.source || "public_website",
        createdAt: asIso(data.createdAt),
      };
    });
    return reply({ success: true, requests });
  } catch (error) {
    console.error("Admin service request GET failed:", error?.code, error?.message);
    return reply({ error: "Unable to load requests. Check Firestore access permissions." }, 503);
  }
}

export async function POST(request) {
  if (!(await requireAdmin())) return reply({ error: "Admin login required." }, 401);
  try {
    const { body, images } = await readBody(request, { allowImages: true });
    const name = asText(body.name, 100);
    const phone = asText(body.phone, 20);
    const email = asText(body.email, 150);
    const serviceType = asText(body.serviceType, 60);
    const city = asText(body.city, 120);
    const address = asText(body.address, 300);
    const description = asText(body.description, 2000);
    const preferredDate = asText(body.preferredDate, 10);
    const phoneDigits = phone.replace(/\D/g, "");

    if (name.length < 2) return reply({ error: "Enter customer name." }, 400);
    if (!/^[+\d ()-]+$/.test(phone) || phoneDigits.length < 10 || phoneDigits.length > 13) {
      return reply({ error: "Enter a valid phone number." }, 400);
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return reply({ error: "Invalid email." }, 400);
    if (!SERVICE_TYPES.has(serviceType)) return reply({ error: "Choose a valid service." }, 400);
    if (city.length < 2) return reply({ error: "Enter locality or city." }, 400);
    if (description.length < 10) return reply({ error: "Enter at least 10 characters for the message." }, 400);
    if (preferredDate) {
      const date = new Date(`${preferredDate}T00:00:00Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(preferredDate) ||
          Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== preferredDate) {
        return reply({ error: "Enter a valid preferred date." }, 400);
      }
    }

    // Validate magic bytes instead of trusting filename or browser MIME labels.
    const checkedPhotos = [];
    for (const photo of images) {
      const bytes = Buffer.from(await photo.arrayBuffer());
      if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) {
        return reply({ error: "Each photo must be smaller than 1.2 MB." }, 413);
      }
      const type = identifyPhoto(bytes);
      if (!type) return reply({ error: "Only JPEG, PNG and WebP photos are supported." }, 400);
      checkedPhotos.push({ bytes, ...type });
    }

    const ref = getBillingDb().collection(COLLECTION).doc();
    const reference = `SR-${ref.id.slice(0, 10).toUpperCase()}`;
    const uploadedIds = [];
    const savedPhotos = [];
    try {
      for (const photo of checkedPhotos) {
        const uploaded = await uploadBillingRequestPhoto({
          requestId: ref.id, bytes: photo.bytes,
        });
        uploadedIds.push(uploaded.public_id);
        savedPhotos.push({
          storageProvider: "cloudinary",
          publicId: uploaded.public_id,
          format: String(uploaded.format || photo.ext).toLowerCase(),
          version: Number(uploaded.version || 0),
          contentType: photo.mimeType,
          size: Number(uploaded.bytes || photo.bytes.length),
        });
      }

      await ref.set({
        reference, name, phone, email, serviceType, city, address, description,
        preferredDate: preferredDate || null,
        status: "new", source: "admin_entry", consentToContact: false,
        images: savedPhotos,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } catch (err) {
      for (const publicId of uploadedIds) {
        try { await deleteBillingRequestPhoto(publicId); }
        catch (cleanupError) {
          console.error("Cloudinary cleanup failed:", cleanupError?.message);
        }
      }
      throw err;
    }
    return reply({ success: true, id: ref.id, reference, imageCount: savedPhotos.length }, 201);
  } catch (error) {
    if (error?.status) return reply({ error: error.message }, error.status);
    console.error("Admin service request POST failed:", error?.code, error?.message);
    return reply({ error: "Could not save the service request or its photos. Check Cloudinary configuration." }, 503);
  }
}

export async function PATCH(request) {
  if (!(await requireAdmin())) return reply({ error: "Admin login required." }, 401);
  try {
    const { body } = await readBody(request);
    const id = asText(body.id, 128);
    const status = asText(body.status, 30);
    if (!/^[A-Za-z0-9_-]{8,128}$/.test(id) || !STATUSES.has(status)) {
      return reply({ error: "Invalid request ID or status." }, 400);
    }
    const doc = getBillingDb().collection(COLLECTION).doc(id);
    const snapshot = await doc.get();
    if (!snapshot.exists) return reply({ error: "Request not found." }, 404);
    await doc.update({ status, updatedAt: FieldValue.serverTimestamp() });
    return reply({ success: true, id, status });
  } catch (error) {
    if (error?.status) return reply({ error: error.message }, error.status);
    console.error("Admin service request PATCH failed:", error?.code, error?.message);
    return reply({ error: "Could not update service status." }, 503);
  }
}

// ==========================================================
// DELETE — PERMANENTLY REMOVE A SERVICE REQUEST
// Requires a valid billing admin session and an exact Firestore document ID.
// Deleted records cannot be recovered from the dashboard.
// ==========================================================
export async function DELETE(request) {
  if (!(await requireAdmin())) {
    return reply({ error: "Admin login required." }, 401);
  }

  try {
    const { body } = await readBody(request);
    const id = asText(body.id, 128);
    if (!/^[A-Za-z0-9_-]{8,128}$/.test(id)) {
      return reply({ error: "Invalid service request ID." }, 400);
    }

    const docRef = getBillingDb().collection(COLLECTION).doc(id);
    const snapshot = await docRef.get();
    if (!snapshot.exists) {
      return reply({ error: "Service request not found. Refresh the list." }, 404);
    }

    const saved = snapshot.data() || {};
    const imageIds = (Array.isArray(saved.images) ? saved.images : [])
      // A stored image reference is never taken from the request body.
      // Only remove images in this request's own Cloudinary folder.
      .filter((photo) => photo?.storageProvider === "cloudinary" &&
        typeof photo?.publicId === "string" &&
        photo.publicId.startsWith(`client-service-requests/${id}/`))
      .map((photo) => photo.publicId);

    // Remove the request first so a Cloudinary outage cannot leave a visible
    // service request with its image references pointing at deleted files.
    await docRef.delete();

    let failedPhotoCount = 0;
    for (const publicId of new Set(imageIds)) {
      try {
        const result = await deleteBillingRequestPhoto(publicId);
        // Cloudinary normally returns { result: "ok" } or "not found".
        if (!result || !["ok", "not found"].includes(result.result)) {
          failedPhotoCount++;
          console.error("Cloudinary photo cleanup returned an unexpected result:", id, result?.result);
        }
      } catch (cleanupError) {
        failedPhotoCount++;
        console.error("Service photo cleanup failed:", id, cleanupError?.message);
      }
    }

    return reply({
      success: true,
      id,
      removedPhotoCount: new Set(imageIds).size - failedPhotoCount,
      failedPhotoCount,
      warning: failedPhotoCount
        ? `Request deleted, but ${failedPhotoCount} Cloudinary photo(s) could not be removed. Delete them manually from Cloudinary.`
        : null,
    });
  } catch (error) {
    if (error?.status) return reply({ error: error.message }, error.status);
    console.error("Admin service request DELETE failed:", error?.code, error?.message);
    return reply({ error: "Could not delete the service request. Please retry." }, 503);
  }
}
