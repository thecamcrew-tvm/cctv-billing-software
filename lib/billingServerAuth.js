import "server-only";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/adminSession";

export async function isBillingAdmin(request) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!secret || secret.length < 32 || !token) return false;
  return Boolean(await verifyAdminSession(token, secret));
}
