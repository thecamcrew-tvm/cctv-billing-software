import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getBillingDb } from "@/lib/firebaseAdminBilling";
import { uploadBillingRequestPhoto, deleteBillingRequestPhoto } from "@/lib/billingRequestStorage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLLECTION = "billingClientRequests";
const MAX_IMAGES = 3;
const MAX_IMAGE_BYTES = 1_200_000; // 1.2 MB each, after browser compression
const MAX_MULTIPART_BYTES = 4_200_000; // Under typical serverless request-body limits
const TYPES = new Set([
  "CCTV Installation", "CCTV Repair", "Maintenance / AMC",
  "Access Control", "Smart Automation", "Other Service",
]);

function clean(value, limit) {
  return String(value ?? "").trim().slice(0, limit);
}

function reject(error, status = 400) {
  return NextResponse.json({ success: false, error }, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function sniffImageType(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mimeType: "image/jpeg", ext: "jpg" };
  }
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return { mimeType: "image/png", ext: "png" };
  }
  if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") {
    return { mimeType: "image/webp", ext: "webp" };
  }
  return null;
}

async function readPayload(request) {
  const type = request.headers.get("content-type") || "";
  const sizeHeader = Number(request.headers.get("content-length") || 0);
  if (type.includes("multipart/form-data")) {
    if (sizeHeader > MAX_MULTIPART_BYTES) {
      throw Object.assign(new Error("Request is too large. Try smaller images."), { status: 413 });
    }
    const data = await request.formData();
    const images = data.getAll("images");
    if (images.length > MAX_IMAGES) {
      throw Object.assign(new Error("Attach no more than 3 photos."), { status: 400 });
    }
    const fields = ["name", "phone", "email", "serviceType", "city", "address", "preferredDate", "description", "consent", "website"];
    const body = Object.fromEntries(fields.map((key) => [key, String(data.get(key) ?? "")]));
    body.consent = body.consent === "true";
    for (const file of images) {
      if (!file || typeof file.arrayBuffer !== "function") {
        throw Object.assign(new Error("Invalid photo attachment."), { status: 400 });
      }
      if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
        throw Object.assign(new Error("Each photo must be less than 1.2 MB. Try another photo."), { status: 413 });
      }
    }
    return { body, images };
  }
  if (!type.includes("application/json")) {
    throw Object.assign(new Error("Use JSON or multipart/form-data."), { status: 415 });
  }
  const raw = await request.text();
  if (raw.length > 12000) {
    throw Object.assign(new Error("Request is too large."), { status: 413 });
  }
  let body;
  try { body = JSON.parse(raw); } catch {
    throw Object.assign(new Error("Invalid request format."), { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw Object.assign(new Error("Invalid form data."), { status: 400 });
  }
  return { body, images: [] }; // Existing JSON-only clients remain compatible.
}

export async function POST(request) {
  try {
    // Browsers submit from this website; reject cross-origin browser submissions.
    const origin = request.headers.get("origin");
    if (origin) {
      let allowed = false;
      try { allowed = new URL(origin).origin === new URL(request.url).origin; }
      catch { allowed = false; }
      if (!allowed) return reject("Request origin is not allowed.", 403);
    }
    const { body, images } = await readPayload(request);
    // Basic honeypot. Do not upload anything for automated spam submissions.
    if (String(body.website || "").trim()) {
      return NextResponse.json({ success: true, reference: "Submitted" });
    }
    const name = clean(body.name, 100);
    const phone = clean(body.phone, 20);
    const email = clean(body.email, 150);
    const serviceType = clean(body.serviceType, 60);
    const city = clean(body.city, 120);
    const address = clean(body.address, 300);
    const description = clean(body.description, 2000);
    const preferredDate = clean(body.preferredDate, 10);
    const phoneDigits = phone.replace(/\D/g, "");

    if (name.length < 2 || name.length > 100) return reject("Enter your full name.");
    if (phoneDigits.length < 10 || phoneDigits.length > 13 || !/^[+\d ()-]+$/.test(phone)) {
      return reject("Enter a valid contact phone number.");
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return reject("Enter a valid email address.");
    if (!TYPES.has(serviceType)) return reject("Choose a service type.");
    if (city.length < 2) return reject("Enter your city or locality.");
    if (description.length < 10) return reject("Describe your service requirement (at least 10 characters).");
    if (preferredDate) {
      const date = new Date(`${preferredDate}T00:00:00Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(preferredDate) ||
          !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== preferredDate) {
        return reject("Enter a valid preferred date.");
      }
    }
    if (body.consent !== true) return reject("You must consent to being contacted.");

    // Verify image content before writing anything to private Cloudinary storage.
    const checkedImages = [];
    for (const file of images) {
      const bytes = Buffer.from(await file.arrayBuffer());
      if (bytes.length > MAX_IMAGE_BYTES || bytes.length === 0) return reject("Photo exceeds the upload size limit.", 413);
      const type = sniffImageType(bytes);
      if (!type) return reject("Only JPEG, PNG, and WebP photos are supported.");
      checkedImages.push({ bytes, mimeType: type.mimeType, ext: type.ext });
    }

    const ref = getBillingDb().collection(COLLECTION).doc();
    const uploadedPublicIds = [];
    const photoMetadata = [];

    try {
      for (const image of checkedImages) {
        const uploaded = await uploadBillingRequestPhoto({ requestId: ref.id, bytes: image.bytes });
        uploadedPublicIds.push(uploaded.public_id);
        photoMetadata.push({
          storageProvider: "cloudinary",
          publicId: uploaded.public_id,
          format: String(uploaded.format || image.ext).toLowerCase(),
          version: Number(uploaded.version || 0),
          contentType: image.mimeType,
          size: Number(uploaded.bytes || image.bytes.length),
        });
      }
      const reference = `SR-${ref.id.slice(0, 10).toUpperCase()}`;
      await ref.set({
        reference, name, phone, email, serviceType, city, address,
        preferredDate: preferredDate || null, description, consentToContact: true,
        status: "new", source: "public_website", images: photoMetadata,
        createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
      });
      return NextResponse.json({ success: true, reference, imageCount: photoMetadata.length }, {
        status: 201, headers: { "Cache-Control": "no-store" },
      });
    } catch (error) {
      // If Firestore save fails, remove all successfully uploaded photos.
      for (const publicId of uploadedPublicIds) {
        try {
          await deleteBillingRequestPhoto(publicId);
        } catch (cleanupError) {
          console.error("Cloudinary service photo cleanup failed:", cleanupError?.message);
        }
      }
      throw error;
    }
  } catch (error) {
    if (error?.status) return reject(error.message, error.status);
    console.error("Client service request submission failed:", error?.code, error?.message);
    return reject("Service request could not be saved. Try again or call our team.", 503);
  }
}
