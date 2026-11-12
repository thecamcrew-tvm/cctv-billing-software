import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSession,
} from "@/lib/adminSession";

// Anyone who opens the site root sees the login page first.
// The dashboard is still protected by the signed admin session.
export async function middleware(request) {
  const { pathname, search } = request.nextUrl;

  // Always show the login URL when someone opens the homepage.
  // This applies even when the browser already has an admin cookie.
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  // Keep login/logout pages and their API routes accessible.
  // Do NOT redirect an authenticated visitor away from /admin/login,
  // otherwise the homepage-to-login redirect can create a loop.
  if (
    pathname === "/admin/login" ||
    pathname === "/admin/logout" ||
    pathname === "/api/admin/login" ||
    pathname === "/api/admin/logout"
  ) {
    return NextResponse.next();
  }

  const secret = process.env.ADMIN_SESSION_SECRET;
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;

  let isAuthenticated = false;
  if (secret && secret.length >= 32 && token) {
    try {
      isAuthenticated = Boolean(await verifyAdminSession(token, secret));
    } catch {
      isAuthenticated = false;
    }
  }

  // A valid session is required for the dashboard and other private routes.
  if (isAuthenticated) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Admin authentication required." },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!_next/|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|map|txt|woff|woff2|ttf|eot|webmanifest)).*)",
  ],
};