
"use client";

import { useEffect, useState } from "react";
import { LogOut, Loader2 } from "lucide-react";

export default function AdminLogoutPage() {
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function logout() {
      try {
        const response = await fetch("/api/admin/logout", {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Unable to end admin session.");
        }

        if (active) {
          window.location.replace("/admin/login");
        }
      } catch (err) {
        console.error("Logout failed:", err);

        if (active) {
          setError(
            "Unable to logout. Please try again."
          );
        }
      }
    }

    logout();

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f8f5] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-lg">

        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e5f3e9]">
          <LogOut
            size={30}
            className="text-[#065a3b]"
          />
        </div>

        <h1 className="text-xl font-bold text-gray-900">
          The Cam Crew_TVM
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Billing Management System
        </p>

        {error ? (
          <>
            <p className="mt-6 text-sm text-red-600">
              {error}
            </p>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-[#065a3b] px-5 py-2.5 text-sm font-semibold text-white"
            >
              Retry Logout
            </button>
          </>
        ) : (
          <div className="mt-7 flex items-center justify-center gap-3 text-sm text-gray-600">
            <Loader2
              size={20}
              className="animate-spin text-[#087747]"
            />

            Signing out securely...
          </div>
        )}
      </div>
    </main>
  );
}
