// Server-only Cloudinary helper for The Cam Crew_TVM service request photos.
// Only cloud image bytes are uploaded. Firestore remains the request database.
// IMPORTANT: Never expose CLOUDINARY_API_SECRET in client-side code.
import "server-only";
import { v2 as cloudinary } from "cloudinary";
import { randomUUID } from "node:crypto";

function getCloudinary() {
  const cloud_name = String(process.env.CLOUDINARY_CLOUD_NAME || "").trim();
  const api_key = String(process.env.CLOUDINARY_API_KEY || "").trim();
  const api_secret = String(process.env.CLOUDINARY_API_SECRET || "").trim();
  if (!cloud_name || !api_key || !api_secret) {
    throw new Error("Configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET on the server.");
  }
  cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
  return cloudinary;
}

export async function uploadBillingRequestPhoto({ requestId, bytes }) {
  const client = getCloudinary();
  return new Promise((resolve, reject) => {
    const stream = client.uploader.upload_stream(
      {
        resource_type: "image",
        type: "authenticated", // Originals AND derived images require signatures.
        folder: `client-service-requests/${requestId}`,
        public_id: randomUUID(),
        overwrite: false,
        unique_filename: false,
      },
      (error, result) => {
        if (error) return reject(error);
        if (!result?.public_id || !result?.format) {
          return reject(new Error("Cloudinary did not return image details."));
        }
        resolve(result);
      }
    );
    stream.on("error", reject);
    stream.end(bytes);
  });
}

export async function deleteBillingRequestPhoto(publicId) {
  if (!String(publicId || "").startsWith("client-service-requests/")) return;
  return getCloudinary().uploader.destroy(publicId, {
    resource_type: "image", type: "authenticated", invalidate: true,
  });
}

export function getSignedBillingRequestPhotoUrl({ publicId, format, version }) {
  const normalizedId = String(publicId || "");
  const normalizedFormat = String(format || "").toLowerCase();
  if (!/^client-service-requests\/[A-Za-z0-9_-]{10,128}\/[A-Za-z0-9_-]+$/.test(normalizedId)) {
    throw new Error("Invalid Cloudinary image identifier.");
  }
  if (!/^(jpg|jpeg|png|webp)$/.test(normalizedFormat)) {
    throw new Error("Invalid Cloudinary photo format.");
  }
  return getCloudinary().url(normalizedId, {
    secure: true,
    resource_type: "image",
    type: "authenticated",
    sign_url: true,
    format: normalizedFormat,
    ...(Number.isInteger(Number(version)) && Number(version) > 0 ? { version: Number(version) } : {}),
  });
}