import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/adminSession";
import { getBillingDb } from "@/lib/firebaseAdminBilling";
import { getSignedBillingRequestPhotoUrl } from "@/lib/billingRequestStorage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function error(message, status) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request) {
  const secret = process.env.ADMIN_SESSION_SECRET || "";
  if (secret.length < 32) return error("Admin session is not configured.", 401);
  const store = await cookies();
  const token = store.get(ADMIN_SESSION_COOKIE)?.value;
  if (!(await verifyAdminSession(token, secret))) return error("Admin login required.", 401);

  const params = new URL(request.url).searchParams;
  // The Firestore document ID is authoritative; never accept a raw Cloudinary
  // public_id or URL from a browser.  `id` / `imageIndex` are compatibility
  // aliases for earlier admin pages.
  const requestId = String(params.get("requestId") ?? params.get("id") ?? "").trim();
  const rawIndex = String(params.get("index") ?? params.get("imageIndex") ?? "0").trim();

  // Firestore custom IDs can be shorter than 10 characters.  The old length
  // restriction incorrectly rejected those valid images with HTTP 400.
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(requestId) || !/^[0-2]$/.test(rawIndex)) {
    return error("Invalid image reference. Refresh the Service Requests page and try again.", 400);
  }

  try {
    const doc = await getBillingDb().collection("billingClientRequests").doc(requestId).get();
    if (!doc.exists) return error("Request not found.", 404);
    const entry = (Array.isArray(doc.data()?.images) ? doc.data().images : [])[Number(rawIndex)];
    const publicId = String(entry?.publicId || "");
    if (entry?.storageProvider !== "cloudinary" ||
        !publicId.startsWith(`client-service-requests/${requestId}/`)) {
      return error("Image not found in Cloudinary. Older images require migration.", 404);
    }
    const contentType = String(entry?.contentType || "");
    if (!["image/jpeg", "image/png", "image/webp"].includes(contentType)) {
      return error("Invalid image format.", 400);
    }

    // Never expose the signed Cloudinary link to the client. Proxy only after admin authorization.
    const signedUrl = getSignedBillingRequestPhotoUrl({
      publicId, format: entry.format, version: entry.version,
    });
    const cloudResponse = await fetch(signedUrl, {
      cache: "no-store",
      headers: { Accept: "image/avif,image/webp,image/png,image/jpeg,*/*" },
    });
    if (!cloudResponse.ok) {
      console.error("Cloudinary protected image retrieval failed:", cloudResponse.status);
      return error("Image is unavailable.", 404);
    }
    const bytes = await cloudResponse.arrayBuffer();
    if (bytes.byteLength > 1_500_000) return error("Image exceeds allowed size.", 413);
    return new Response(bytes, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, no-store, max-age=0",
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch (err) {
    console.error("Admin request image retrieval failed:", err?.code, err?.message);
    return error("Unable to load photo.", 503);
  }
}