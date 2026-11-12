
import {
  createHash,
  timingSafeEqual,
} from "node:crypto";

import { NextResponse } from "next/server";

import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_SECONDS,
  createAdminSession,
} from "@/lib/adminSession";

export const runtime = "nodejs";

function equalConstantTime(a, b) {
  const left = createHash("sha256")
    .update(String(a))
    .digest();

  const right = createHash("sha256")
    .update(String(b))
    .digest();

  return timingSafeEqual(left, right);
}

export async function POST(request) {
  const adminEmail = process.env.ADMIN_EMAIL
    ?.trim()
    .toLowerCase();

  const adminPassword = process.env.ADMIN_PASSWORD;
  const sessionSecret = process.env.ADMIN_SESSION_SECRET;

  if (
    !adminEmail ||
    !adminPassword ||
    adminPassword.length < 12 ||
    adminEmail === "admin@example.com" ||
    !sessionSecret ||
    sessionSecret.length < 32
  ) {
    return NextResponse.json(
      {
        error:
          "Admin login is not configured. Check environment variables.",
      },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }

  let data;

  try {
    data = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid login request." },
      { status: 400 }
    );
  }

  const email =
    typeof data?.email === "string"
      ? data.email.trim().toLowerCase()
      : "";

  const password =
    typeof data?.password === "string"
      ? data.password
      : "";

  if (
    !email ||
    email.length > 254 ||
    !password ||
    password.length > 1024
  ) {
    return NextResponse.json(
      { error: "Enter your email and password." },
      { status: 400 }
    );
  }

  const emailMatches = equalConstantTime(
    email,
    adminEmail
  );

  const passwordMatches = equalConstantTime(
    password,
    adminPassword
  );

  if (!emailMatches || !passwordMatches) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      {
        status: 401,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }

  const token = await createAdminSession(sessionSecret);

  const response = NextResponse.json(
    { success: true },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );

  response.cookies.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_SECONDS,
  });

  return response;
}
