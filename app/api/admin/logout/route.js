
import { NextResponse } from "next/server";

import {
  ADMIN_SESSION_COOKIE,
} from "@/lib/adminSession";

export const runtime = "nodejs";

export async function POST() {
  try {
    const response = NextResponse.json(
      {
        success: true,
        message: "Admin logged out successfully.",
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );

    // Delete the exact cookie created by the login API.
    response.cookies.set({
      name: ADMIN_SESSION_COOKIE,
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    });

    return response;
  } catch (error) {
    console.error("Admin logout error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to logout.",
      },
      { status: 500 }
    );
  }
}
