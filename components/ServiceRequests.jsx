"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ClipboardList, Plus, RefreshCw, Search, Phone, Mail,
  MapPin, CalendarDays, X, AlertCircle, Wrench,
  Image as ImageIcon, ChevronLeft, ChevronRight, ZoomIn, ExternalLink, Trash2,
} from "lucide-react";

const SERVICE_TYPES = [
  "CCTV Installation", "CCTV Repair", "Maintenance / AMC",
  "Access Control", "Smart Automation", "Other Service",
];
const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];
const EMPTY_FORM = {
  name: "", phone: "", email: "", serviceType: "CCTV Installation",
  city: "", address: "", preferredDate: "", description: "",
};

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(date);
}

function StatusPill({ status }) {
  const styles = {
    new: "bg-blue-50 text-blue-700 border-blue-200",
    in_progress: "bg-amber-50 text-amber-700 border-amber-200",
    completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    cancelled: "bg-slate-100 text-slate-600 border-slate-200",
  };
  const label = STATUS_OPTIONS.find((item) => item.value === status)?.label || "New";
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${styles[status] || styles.new}`}>
      {label}
    </span>
  );
}


/**
 * Use the authenticated admin image route, not Cloudinary's direct URL.
 * The admin API currently returns { url: "/api/admin/client-requests/image?..." }.
 * Also supports Cloudinary metadata records with no url.
 */
function servicePhotoUrl(request, photo, index) {
  // The server GET returns the Firestore document ID and each image's original
  // index.  Build the protected URL from those fields (not an old stored URL).
  // Older API responses can use requestId/docId instead of id.
  let requestId = String(request?.id ?? request?.requestId ?? request?.docId ?? "").trim();
  let imageIndex = Number(photo?.index ?? photo?.imageIndex ?? index);

  // Compatibility: an older admin API may include only a protected image URL.
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(requestId)) {
    const savedUrl = String(photo?.url ?? "");
    if (savedUrl.startsWith("/api/admin/client-requests/image?")) {
      const params = new URLSearchParams(savedUrl.split("?")[1] || "");
      requestId = String(params.get("requestId") ?? params.get("id") ?? "").trim();
      imageIndex = Number(params.get("index") ?? params.get("imageIndex") ?? imageIndex);
    }
  }

  if (!/^[A-Za-z0-9_-]{1,128}$/.test(requestId) ||
      !Number.isInteger(imageIndex) || imageIndex < 0 || imageIndex > 2) {
    return null; // Never send an invalid image request to the server.
  }
  return `/api/admin/client-requests/image?requestId=${encodeURIComponent(requestId)}&index=${imageIndex}`;
}

function ServicePhotoThumbnail({ request, photo, index, onClick }) {
  const [failed, setFailed] = useState(false);
  const url = servicePhotoUrl(request, photo, index);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!url}
      title={`View photo ${index + 1} for ${request.name}`}
      aria-label={`View service request photo ${index + 1} for ${request.name}`}
      className="group relative h-20 w-20 shrink-0 disabled:cursor-not-allowed overflow-hidden rounded-xl border border-slate-200 bg-slate-100 text-slate-500 transition hover:border-[#08754b] hover:ring-2 hover:ring-emerald-100 focus:outline-none focus:ring-2 focus:ring-[#08754b]"
    >
      {failed || !url ? (
        <span className="flex h-full w-full flex-col items-center justify-center gap-1 px-1 text-center text-[10px]">
          <ImageIcon size={19} />
          Unavailable
        </span>
      ) : (
        <img
          src={url}
          alt={`Service issue photo ${index + 1}`}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
          onError={() => setFailed(true)}
          referrerPolicy="same-origin"
        />
      )}
      {!failed && url && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/30 group-hover:opacity-100 group-focus:opacity-100">
          <ZoomIn size={22} />
        </span>
      )}
    </button>
  );
}

function ServicePhotoViewer({ request, index, onClose, onChange }) {
  const images = Array.isArray(request?.images) ? request.images : [];
  const selected = images[index];

  useEffect(() => {
    if (!selected) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") onChange((index - 1 + images.length) % images.length);
      if (event.key === "ArrowRight") onChange((index + 1) % images.length);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [selected, index, images.length, onClose, onChange]);

  if (!selected) return null;
  const url = servicePhotoUrl(request, selected, index);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 p-3 sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        className="flex max-h-[96vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label={`Service request photo ${index + 1} of ${images.length}`}
      >
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h3 className="truncate font-bold text-slate-800">{request.name || "Service Request"}</h3>
            <p className="text-xs text-slate-500">
              {request.reference ? `${request.reference} · ` : ""}
              Photo {index + 1} of {images.length}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={url || "#"}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => { if (!url) event.preventDefault(); }}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              title="Open this protected photo in a new tab"
            >
              <ExternalLink size={15} /> <span className="hidden sm:inline">Open photo</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-100"
              aria-label="Close photo viewer"
            >
              <X size={19} />
            </button>
          </div>
        </header>
        <div className="relative flex min-h-[260px] flex-1 items-center justify-center overflow-auto bg-slate-100 p-3 sm:p-5">
          <ServicePhotoFullImage key={`${request.id}-${index}`} url={url} index={index} />
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => onChange((index - 1 + images.length) % images.length)}
                aria-label="Previous photo"
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/95 p-2 text-slate-700 shadow-md hover:bg-white"
              >
                <ChevronLeft size={22} />
              </button>
              <button
                type="button"
                onClick={() => onChange((index + 1) % images.length)}
                aria-label="Next photo"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/95 p-2 text-slate-700 shadow-md hover:bg-white"
              >
                <ChevronRight size={22} />
              </button>
            </>
          )}
        </div>
        <footer className="flex items-center justify-between gap-2 border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
          <span>Images are accessed through the admin-only API.</span>
          <span>Esc to close · Arrow keys to navigate</span>
        </footer>
      </section>
    </div>
  );
}

function ServicePhotoFullImage({ url, index }) {
  const [failed, setFailed] = useState(false);
  return failed || !url ? (
    <div role="alert" className="rounded-xl border border-red-200 bg-white p-8 text-center text-sm text-red-700">
      This photo could not be loaded. Check Cloudinary settings and the admin image API.
    </div>
  ) : (
    <img
      src={url}
      alt={`Full size service request photo ${index + 1}`}
      className="max-h-[70vh] max-w-full object-contain"
      onError={() => setFailed(true)}
      referrerPolicy="same-origin"
    />
  );
}

const ADMIN_MAX_PHOTOS = 3;
const ADMIN_MAX_UPLOAD_BYTES = 1_200_000;

// Resize pictures in the browser to keep uploads within the server's limit.
// Rendering to a canvas also strips EXIF location metadata.
async function prepareAdminPhoto(file) {
  if (!file?.type?.startsWith("image/")) throw new Error("Choose an image file.");
  if (file.size > 15_000_000) throw new Error("Photos must be under 15 MB before compression.");
  let bitmap;
  try { bitmap = await createImageBitmap(file); }
  catch { throw new Error("Unable to read this photo. Please use a JPEG or PNG image."); }
  try {
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not process the selected photo.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const compress = (quality) => new Promise((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not compress this photo.")), "image/jpeg", quality);
    });
    let blob = await compress(0.8);
    if (blob.size > ADMIN_MAX_UPLOAD_BYTES) blob = await compress(0.65);
    if (blob.size > ADMIN_MAX_UPLOAD_BYTES) {
      const copy = document.createElement("canvas");
      copy.width = canvas.width;
      copy.height = canvas.height;
      copy.getContext("2d").drawImage(canvas, 0, 0);
      canvas.width = Math.max(1, Math.round(canvas.width * 0.7));
      canvas.height = Math.max(1, Math.round(canvas.height * 0.7));
      canvas.getContext("2d").drawImage(copy, 0, 0, canvas.width, canvas.height);
      blob = await compress(0.60);
    }
    if (blob.size > ADMIN_MAX_UPLOAD_BYTES) throw new Error("Photo is still too large. Please select a smaller photo.");
    return new File([blob], `admin-service-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`, { type: "image/jpeg" });
  } finally { bitmap.close?.(); }
}

export default function ServiceRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [savingId, setSavingId] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [photoViewer, setPhotoViewer] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingId, setDeletingId] = useState("");
  const [newServicePhotos, setNewServicePhotos] = useState([]);
  const [newPhotoPreviews, setNewPhotoPreviews] = useState([]);
  const [processingPhotos, setProcessingPhotos] = useState(false);

  useEffect(() => {
    const entries = newServicePhotos.map((file) => ({ name: file.name, url: URL.createObjectURL(file) }));
    setNewPhotoPreviews(entries);
    return () => entries.forEach((entry) => URL.revokeObjectURL(entry.url));
  }, [newServicePhotos]);

  async function addNewServicePhotos(event) {
    const picked = Array.from(event.target.files || []);
    event.target.value = "";
    if (!picked.length) return;
    if (newServicePhotos.length + picked.length > ADMIN_MAX_PHOTOS) {
      setError("You can attach up to 3 photos.");
      return;
    }
    setError("");
    setProcessingPhotos(true);
    try {
      const ready = [];
      for (const photo of picked) ready.push(await prepareAdminPhoto(photo));
      setNewServicePhotos((current) => [...current, ...ready].slice(0, ADMIN_MAX_PHOTOS));
    } catch (err) {
      setError(err?.message || "Could not process photo.");
    } finally { setProcessingPhotos(false); }
  }


  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/client-requests", {
        method: "GET", credentials: "same-origin", cache: "no-store",
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || `Failed to load services (${response.status}).`);
      setRequests(Array.isArray(result.requests) ? result.requests : []);
    } catch (err) {
      setError(err.message || "Could not load service requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadRequests(); }, [loadRequests]);

  const displayed = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter((item) => {
      if (filter !== "all" && (item.status || "new") !== filter) return false;
      if (!q) return true;
      return [item.name, item.phone, item.email, item.serviceType, item.city,
        item.address, item.description, item.reference]
        .some((value) => String(value || "").toLowerCase().includes(q));
    });
  }, [requests, search, filter]);

  const countByStatus = (status) => requests.filter((r) => (r.status || "new") === status).length;

  async function updateStatus(id, status) {
    setSavingId(id);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/client-requests", {
        method: "PATCH", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Could not update service status.");
      setRequests((previous) => previous.map((r) => r.id === id ? { ...r, status } : r));
      setNotice("Service status updated.");
    } catch (err) {
      setError(err.message || "Service status update failed.");
    } finally {
      setSavingId("");
    }
  }

  // Delete requests only after explicit confirmation. The server checks the
  // admin session again; client-side checks are never the authorization layer.
  async function deleteServiceRequest() {
    const target = deleteTarget;
    if (!target?.id || deletingId) return;

    setDeletingId(target.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/client-requests", {
        method: "DELETE",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: target.id }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        throw new Error(result.error || `Unable to delete request (${response.status}).`);
      }

      setRequests((current) => current.filter((item) => item.id !== target.id));
      setPhotoViewer((current) => current?.request?.id === target.id ? null : current);
      setDeleteTarget(null);
      setNotice(result.warning || `Service request ${target.reference || target.name || ""} was deleted.`);
    } catch (err) {
      setError(err?.message || "Unable to delete service request.");
    } finally {
      setDeletingId("");
    }
  }

  function updateField(name, value) {
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  async function createService(event) {
    event.preventDefault();
    if (submitting || processingPhotos) return;
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      // JSON for text-only admin requests; multipart for requests with photos.
      // Do not set Content-Type manually for FormData: the browser adds its boundary.
      const options = { method: "POST", credentials: "same-origin" };
      if (newServicePhotos.length) {
        const data = new FormData();
        for (const [key, value] of Object.entries(form)) data.append(key, String(value ?? ""));
        for (const photo of newServicePhotos) data.append("images", photo, photo.name);
        options.body = data;
      } else {
        options.headers = { "Content-Type": "application/json" };
        options.body = JSON.stringify(form);
      }
      const response = await fetch("/api/admin/client-requests", options);
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Could not create service.");
      setShowNew(false);
      setForm(EMPTY_FORM);
      setNewServicePhotos([]);
      await loadRequests();
      setNotice(`New service created successfully${result.reference ? ` (${result.reference})` : ""}.`);
    } catch (err) {
      setError(err.message || "Failed to create service.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-[#e5f5eb] p-3 text-[#075c3b]"><Wrench size={23} /></span>
          <div>
            <h1 className="text-2xl font-bold text-[#123b2b]">Service Requests</h1>
            <p className="mt-1 text-sm text-slate-500">Receive customer messages and manage service work.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void loadRequests()} disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button type="button" onClick={() => { setShowNew(true); setError(""); setNewServicePhotos([]); }}
            className="inline-flex items-center gap-2 rounded-xl bg-[#08754b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#065d3b]">
            <Plus size={17} /> New Service
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          ["Total Requests", requests.length], ["New Messages", countByStatus("new")],
          ["In Progress", countByStatus("in_progress")], ["Completed", countByStatus("completed")],
        ].map(([title, value]) => (
          <div key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
            <p className="mt-2 text-3xl font-bold text-[#084e35]">{value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="relative min-w-[200px] flex-1">
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} type="search"
            aria-label="Search service requests" placeholder="Search customer, phone, message..."
            className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-[#08754b]" />
        </label>
        <select aria-label="Filter service requests by status" value={filter} onChange={(e) => setFilter(e.target.value)}
          className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm">
          <option value="all">All Statuses</option>
          {STATUS_OPTIONS.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
        </select>
      </div>

      {error && <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle size={18} /> {error}</p>}
      {notice && <p role="status" className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">{notice}</p>}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading service requests...</div>
        ) : displayed.length === 0 ? (
          <div className="p-12 text-center text-slate-500"><ClipboardList size={34} className="mx-auto mb-3" />No service requests found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full text-left text-sm">
              <thead className="bg-[#f2f8f4] text-xs uppercase text-[#36654d]">
                <tr>
                  <th className="px-4 py-4">Received</th><th className="px-4 py-4">Client / Contact</th>
                  <th className="px-4 py-4">Service</th><th className="px-4 py-4">Customer Message</th>
                  <th className="px-4 py-4">Location</th><th className="px-4 py-4">Status</th><th className="px-4 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100 align-top hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-500">{formatDate(item.createdAt)}</td>
                    <td className="min-w-[170px] px-4 py-4">
                      <strong className="block text-[#123b2b]">{item.name}</strong>
                      <a href={`tel:${String(item.phone || "").replace(/[^\d+]/g, "")}`}
                        className="mt-2 flex items-center gap-1 text-xs text-[#08754b]"><Phone size={13} /> {item.phone}</a>
                      {item.email && <a href={`mailto:${item.email}`} className="mt-1 flex items-center gap-1 break-all text-xs text-slate-500"><Mail size={13} /> {item.email}</a>}
                    </td>
                    <td className="px-4 py-4">{item.serviceType || "—"}{item.source === "admin_entry" && <span className="mt-1 block text-xs text-slate-400">Admin added</span>}</td>
                    <td className="max-w-[320px] whitespace-pre-wrap break-words px-4 py-4">
                      {item.description || "—"}
                      {Array.isArray(item.images) && item.images.length > 0 && (
                        <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/40 p-2.5">
                          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-[#08754b]">
                            <ImageIcon size={15} />
                            {item.images.length} attached {item.images.length === 1 ? "photo" : "photos"}
                          </div>
                          <div className="flex flex-wrap gap-2" aria-label="Attached service photos">
                            {item.images.map((photo, index) => (
                              <ServicePhotoThumbnail
                                key={`${item.id}-${index}`}
                                request={item}
                                photo={photo}
                                index={index}
                                onClick={() => setPhotoViewer({ request: item, index })}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className="flex items-center gap-1"><MapPin size={13}/>{item.city || "—"}</span>
                      {item.address && <span className="mt-1 block text-xs text-slate-500">{item.address}</span>}
                      {item.preferredDate && <span className="mt-2 flex items-center gap-1 text-xs text-slate-500"><CalendarDays size={13}/>{item.preferredDate}</span>}
                    </td>
                    <td className="min-w-[155px] px-4 py-4">
                      <StatusPill status={item.status || "new"}/>
                      <select aria-label={`Change status for ${item.name}`} value={item.status || "new"}
                        onChange={(e) => void updateStatus(item.id, e.target.value)} disabled={savingId === item.id || Boolean(deletingId)}
                        className="mt-2 block w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs disabled:opacity-50">
                        {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <button
                        type="button"
                        onClick={() => { setError(""); setNotice(""); setDeleteTarget(item); }}
                        disabled={Boolean(deletingId) || savingId === item.id}
                        aria-label={`Delete service request for ${item.name}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600 disabled:opacity-50"
                      >
                        <Trash2 size={15} /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="text-xs text-slate-500">Showing the latest 200 requests. Submitted client messages are visible only to signed-in admins.</p>

      {deleteTarget && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/70 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deletingId) setDeleteTarget(null);
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-service-title"
            aria-describedby="delete-service-description"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">
                <Trash2 size={22} />
              </span>
              <div>
                <h2 id="delete-service-title" className="text-lg font-bold text-slate-900">Delete Service Request?</h2>
                <p id="delete-service-description" className="mt-2 text-sm leading-6 text-slate-600">
                  Permanently delete the service request for <strong>{deleteTarget.name || "this customer"}</strong>
                  {deleteTarget.reference ? ` (${deleteTarget.reference})` : ""}?
                  Attached Cloudinary photos will also be removed when possible. This cannot be undone.
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                disabled={Boolean(deletingId)}
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={Boolean(deletingId)}
                onClick={() => void deleteServiceRequest()}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                <Trash2 size={16} /> {deletingId ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </section>
        </div>
      )}

      {photoViewer && (
        <ServicePhotoViewer
          request={photoViewer.request}
          index={photoViewer.index}
          onClose={() => setPhotoViewer(null)}
          onChange={(index) => setPhotoViewer((previous) => previous ? { ...previous, index } : null)}
        />
      )}

      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="presentation"
          onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) setShowNew(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="service-dialog-title"
            className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div><h2 id="service-dialog-title" className="text-lg font-bold text-[#123b2b]">New Service</h2>
                <p className="mt-1 text-xs text-slate-500">Add a service request received by phone or in person.</p></div>
              <button type="button" aria-label="Close form" disabled={submitting} onClick={() => { setShowNew(false); setNewServicePhotos([]); }}
                className="rounded-lg p-2 hover:bg-slate-100"><X size={20}/></button>
            </div>
            <form onSubmit={createService} className="max-h-[75vh] space-y-4 overflow-y-auto p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-semibold text-slate-700">Client Name *
                  <input required maxLength={100} minLength={2} value={form.name} onChange={(e) => updateField("name", e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 p-2.5 text-sm" /></label>
                <label className="block text-sm font-semibold text-slate-700">Phone Number *
                  <input required inputMode="tel" maxLength={20} value={form.phone} onChange={(e) => updateField("phone", e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 p-2.5 text-sm" /></label>
                <label className="block text-sm font-semibold text-slate-700">Email (optional)
                  <input type="email" maxLength={150} value={form.email} onChange={(e) => updateField("email", e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 p-2.5 text-sm" /></label>
                <label className="block text-sm font-semibold text-slate-700">Service *
                  <select required value={form.serviceType} onChange={(e) => updateField("serviceType", e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm">
                    {SERVICE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                  </select></label>
                <label className="block text-sm font-semibold text-slate-700">City / Locality *
                  <input required maxLength={120} value={form.city} onChange={(e) => updateField("city", e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 p-2.5 text-sm" /></label>
                <label className="block text-sm font-semibold text-slate-700">Preferred Date (optional)
                  <input type="date" value={form.preferredDate} onChange={(e) => updateField("preferredDate", e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 p-2.5 text-sm" /></label>
                <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">Full Address
                  <textarea maxLength={300} rows={2} value={form.address} onChange={(e) => updateField("address", e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 p-2.5 text-sm" /></label>
                <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">Service / Customer Message *
                  <textarea required minLength={10} maxLength={2000} rows={4} value={form.description} onChange={(e) => updateField("description", e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 p-2.5 text-sm" /></label>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <ImageIcon size={17} className="text-[#08754b]" /> Problem Photos (optional)
                </div>
                <p className="mb-3 text-xs text-slate-500">Up to 3 photos. Images are resized and stored privately in Cloudinary.</p>
                <label className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#08754b] bg-white px-4 py-2.5 text-sm font-semibold text-[#08754b] ${processingPhotos || submitting || newServicePhotos.length >= ADMIN_MAX_PHOTOS ? "pointer-events-none opacity-50" : "hover:bg-emerald-50"}`}>
                  <ImageIcon size={16} /> {processingPhotos ? "Processing photos..." : "Choose Photos"}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={processingPhotos || submitting || newServicePhotos.length >= ADMIN_MAX_PHOTOS}
                    onChange={addNewServicePhotos}
                    className="sr-only"
                    aria-label="Attach photos for new service request"
                  />
                </label>
                {newPhotoPreviews.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-3">
                    {newPhotoPreviews.map((preview, index) => (
                      <div key={preview.url} className="relative overflow-hidden rounded-lg border border-slate-200 bg-white">
                        <img src={preview.url} alt={`New service photo ${index + 1}`} className="h-24 w-24 object-cover" />
                        <button
                          type="button"
                          disabled={submitting || processingPhotos}
                          onClick={() => setNewServicePhotos((current) => current.filter((_, i) => i !== index))}
                          aria-label={`Remove photo ${index + 1}`}
                          className="absolute right-1 top-1 rounded-full bg-red-600 p-1 text-white hover:bg-red-700 disabled:opacity-50"
                        ><X size={14} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
              <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
                <button type="button" disabled={submitting} onClick={() => { setShowNew(false); setNewServicePhotos([]); }} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold">Cancel</button>
                <button type="submit" disabled={submitting || processingPhotos} className="rounded-lg bg-[#08754b] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">
                  {submitting ? "Saving..." : "Save New Service"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}