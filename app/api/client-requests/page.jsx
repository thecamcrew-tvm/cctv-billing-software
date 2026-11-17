import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/adminSession";
import { getBillingDb } from "@/lib/firebaseAdminBilling";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = { title: "Client Service Requests | The Cam Crew_TVM" };

function formatTime(value) {
  const date = value?.toDate?.();
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(date);
}

export default async function AdminClientRequestsPage() {
  // Defense in depth, even if middleware is accidentally changed.
  const secret = process.env.ADMIN_SESSION_SECRET || "";
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  const authorized = await verifyAdminSession(token, secret);
  if (!authorized) redirect("/admin/login?next=%2Fadmin%2Fclient-requests");

  let requests = [];
  let error = "";
  try {
    const snapshot = await getBillingDb()
      .collection("billingClientRequests")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();
    requests = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.error("Unable to load client service requests:", err?.code, err?.message);
    error = "Could not load service requests. Check Firebase Admin permissions and Firestore configuration.";
  }

  return (
    <main style={{ background: "#f4f7f3", minHeight: "100vh", padding: "32px 18px", color: "#1b4330", fontFamily: "Inter, Segoe UI, Arial, sans-serif" }}>
      <div style={{ maxWidth: 1150, margin: "0 auto" }}>
        <Link href="/admin/dashboard?fromLogin=1" style={{ display: "inline-flex", gap: 8, alignItems: "center", color: "#176849", textDecoration: "none", fontSize: 13, fontWeight: 700 }}><ArrowLeft size={17}/> Dashboard</Link>
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "22px 0" }}><ClipboardList size={29}/><div><h1 style={{ fontSize: 27, margin: 0 }}>Client Service Requests</h1><p style={{ fontSize: 13, color: "#667f70", margin: "6px 0 0" }}>Latest 100 requests submitted through the public website</p></div></div>
        {error ? <div role="alert" style={{ background: "#fff3ef", border: "1px solid #f2c5b9", color: "#953f2a", padding: 20, borderRadius: 12 }}>{error}</div> : (
          <div style={{ background: "white", borderRadius: 15, border: "1px solid #e2ebe3", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", minWidth: 900 }}>
              <thead><tr style={{ background: "#f1f7f2" }}>{["Received", "Name", "Phone", "Service", "Location", "Details", "Status"].map((name) => <th key={name} style={{ padding: "16px 14px", fontSize: 12 }}>{name}</th>)}</tr></thead>
              <tbody>{requests.length === 0 ? <tr><td colSpan={7} style={{ padding: 30, color: "#789382", textAlign: "center" }}>No service requests yet.</td></tr> : requests.map((r) => <tr key={r.id} style={{ borderTop: "1px solid #ebf0ec" }}>
                <td style={{ padding: 14, whiteSpace: "nowrap", fontSize: 12 }}>{formatTime(r.createdAt)}</td>
                <td style={{ padding: 14, fontSize: 12, fontWeight: 700 }}>{r.name}<div style={{ fontWeight: 400, color: "#789382" }}>{r.email || ""}</div></td>
                <td style={{ padding: 14, fontSize: 12 }}><a href={`tel:${r.phone}`} style={{ color: "#087b50" }}>{r.phone}</a></td>
                <td style={{ padding: 14, fontSize: 12 }}>{r.serviceType}</td>
                <td style={{ padding: 14, fontSize: 12 }}>{r.city}<div style={{ fontSize: 11, color: "#789382" }}>{r.address || ""}</div></td>
                <td style={{ padding: 14, fontSize: 12, maxWidth: 300, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{r.description}{r.preferredDate && <div style={{ color: "#789382", fontSize: 11 }}>Preferred: {r.preferredDate}</div>}</td>
                <td style={{ padding: 14, fontSize: 12, fontWeight: 700, color: "#07874f" }}>{r.status || "new"}</td>
              </tr>)}</tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}