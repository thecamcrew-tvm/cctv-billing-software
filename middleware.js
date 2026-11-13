
import { NextResponse } from "next/server";

import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSession,
} from "@/lib/adminSession";

export async function middleware(request) {
  const { pathname, search } = request.nextUrl;

  const secret = process.env.ADMIN_SESSION_SECRET;

  const token = request.cookies.get(
    ADMIN_SESSION_COOKIE
  )?.value;

  // Verify admin login session
  let isAuthenticated = false;

  if (token && secret && secret.length >= 32) {
    try {
      isAuthenticated = Boolean(
        await verifyAdminSession(token, secret)
      );
    } catch (error) {
      console.error("Session verification failed:", error);
      isAuthenticated = false;
    }
  }

  // Homepage always opens login
  if (pathname === "/") {
    return NextResponse.redirect(
      new URL("/admin/login", request.url)
    );
  }

  // Allow login and logout pages
  if (
    pathname === "/admin/login" ||
    pathname === "/admin/logout" ||
    pathname === "/api/admin/login" ||
    pathname === "/api/admin/logout"
  ) {
    return NextResponse.next();
  }

  // Dashboard protection
  if (pathname === "/admin/dashboard") {
    // User must be authenticated
    if (!isAuthenticated) {
      return NextResponse.redirect(
        new URL("/admin/login", request.url)
      );
    }

    // Direct dashboard URL should open login
    const fromLogin =
      request.nextUrl.searchParams.get("fromLogin");

    if (fromLogin !== "1") {
      return NextResponse.redirect(
        new URL("/admin/login", request.url)
      );
    }

    // Allow dashboard after login
    return NextResponse.next();
  }

  // Protect remaining admin pages and billing APIs
  if (!isAuthenticated) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Admin authentication required." },
        { status: 401 }
      );
    }

    const loginUrl = new URL(
      "/admin/login",
      request.url
    );

    loginUrl.searchParams.set(
      "next",
      pathname + search
    );

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/admin/:path*",
    "/bill/:path*",
    "/api/admin/:path*",
    "/api/billing/:path*",
  ],
};
