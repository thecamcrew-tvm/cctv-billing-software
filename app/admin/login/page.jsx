"use client";

import { useEffect, useState } from "react";
import {
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ArrowRight,
  ShieldCheck,
  ReceiptText,
  Wrench,
  Headset,
} from "lucide-react";

import "./login.css";

const DASHBOARD_PATH = "/admin/dashboard";

function getSafeDestination() {
  const next = new URLSearchParams(window.location.search).get("next");

  if (
    !next ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.includes("\\")
  ) {
    return DASHBOARD_PATH;
  }

  try {
    const target = new URL(next, window.location.origin);

    if (target.origin !== window.location.origin) {
      return DASHBOARD_PATH;
    }

    const pathname = target.pathname;

    // '/' redirects to the login screen. Avoid a login redirect loop.
    if (
      pathname === "/" ||
      pathname === "/admin/login" ||
      pathname.startsWith("/admin/login/") ||
      pathname === "/admin/logout" ||
      pathname.startsWith("/admin/logout/")
    ) {
      return DASHBOARD_PATH;
    }

    // Only return routes that exist in this billing app.
    if (
      pathname === DASHBOARD_PATH ||
      pathname === "/bill"
    ) {
      return pathname + target.search + target.hash;
    }

    return DASHBOARD_PATH;
  } catch {
    return DASHBOARD_PATH;
  }
}

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event) {
    event.preventDefault();
    if (loading) return;

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(result.error || "Unable to sign in. Try again.");
        return;
      }

      // API set the signed admin-session cookie successfully.
      const destination = getSafeDestination();
const target = new URL(destination, window.location.origin);

if (target.pathname === "/admin/dashboard") {
  target.searchParams.set("fromLogin", "1");
}

window.location.replace(
  target.pathname + target.search + target.hash
);
    } catch {
      setError("Unable to reach the server. Check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="cam-admin-login">
      <div className="cam-admin-login-layout">
        {/* LEFT SIDE */}
        <section className="cam-admin-login-intro">
          <div className="cam-admin-brand">
            <span className="cam-admin-brand-icon">
              <ShieldCheck size={24} />
            </span>

            <div>
              <strong>
                The Cam Cr
                <span className="cam-admin-red">e</span>
                w_TVM
              </strong>

              <span>Automation &amp; Security Surveillance</span>
            </div>
          </div>

          <div className="cam-admin-intro-content">
            <div className="cam-admin-eyebrow">
              <span />
              SECURE BUSINESS WORKSPACE
            </div>

            <h1>
              Everything your business needs,
              <em> in one place.</em>
            </h1>

            <p>
              Sign in to manage customer invoices,
              service requests and business operations.
            </p>

            <div className="cam-admin-feature-list">
              <div>
                <ReceiptText size={20} />
                <span>GST Billing &amp; Invoice Management</span>
              </div>

              <div>
                <Wrench size={20} />
                <span>Service Requests &amp; Job Tracking</span>
              </div>

              <div>
                <Headset size={20} />
                <span>Customer Support Operations</span>
              </div>
            </div>
          </div>

          <div className="cam-admin-intro-footer">
            Pothencode &amp; Vizhinjam, Trivandrum, Kerala
          </div>
        </section>

        {/* RIGHT SIDE */}
        <section className="cam-admin-login-form-panel">
          <div className="cam-admin-login-form-container">
            <div className="cam-admin-login-header">
              <div className="cam-admin-login-lock">
                <LockKeyhole size={24} />
              </div>

              <div className="cam-admin-login-kicker">
                ADMINISTRATOR ACCESS
              </div>

              <h2>Welcome back</h2>
              <p>
                Enter your admin credentials to continue
                to the dashboard.
              </p>
            </div>

            <form
              className="cam-admin-login-form"
              onSubmit={handleLogin}
            >
              {/* EMAIL */}
              <div className="cam-admin-form-field">
                <label htmlFor="cam-admin-email">
                  Email Address
                </label>

                <div className="cam-admin-input-wrap">
                  <Mail size={18} />
                  <input
                    id="cam-admin-email"
                    type="email"
                    autoComplete="username"
                    placeholder="Enter admin email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    disabled={loading}
                    autoFocus
                  />
                </div>
              </div>

              {/* PASSWORD */}
              <div className="cam-admin-form-field">
                <label htmlFor="cam-admin-password">
                  Password
                </label>

                <div className="cam-admin-input-wrap">
                  <LockKeyhole size={18} />

                  <input
                    id="cam-admin-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    disabled={loading}
                  />

                  <button
                    type="button"
                    className="cam-admin-show-password"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="cam-admin-login-error" role="alert">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="cam-admin-login-submit"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign in to Dashboard"}
                {!loading && <ArrowRight size={19} />}
              </button>

              <p className="cam-admin-password-help">
                Contact the system administrator to reset your password.
              </p>
            </form>

            <div className="cam-admin-login-bottom">
              <ShieldCheck size={15} />
              Authorized staff only
            </div>
          </div>

          <div className="cam-admin-login-copyright">
            © {new Date().getFullYear()} The Cam Crew_TVM
          </div>
        </section>
      </div>
    </main>
  );
}
