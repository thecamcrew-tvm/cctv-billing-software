"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  ClipboardList,
  Headphones,
  Loader2,
  LockKeyhole,
  MapPin,
  Camera,
  RefreshCw,
  ImagePlus,
  X,
  Phone,
  ShieldCheck,
} from "lucide-react";
import styles from "./request.module.css";

const REQUEST_TYPES = [
  "CCTV Installation",
  "CCTV Repair",
  "Maintenance / AMC",
  "Access Control",
  "Smart Automation",
  "Other Service",
];

const initialForm = {
  name: "",
  phone: "",
  email: "",
  serviceType: "",
  city: "",
  address: "",
  preferredDate: "",
  description: "",
  consent: false,
  website: "", // Invisible honeypot. Humans should leave this blank.
};


// Resize photos before uploading: keeps three attachments under typical
// serverless request-body limits and removes camera EXIF metadata.
const MAX_PHOTOS = 3;
const MAX_INPUT_BYTES = 15_000_000;
const MAX_UPLOAD_BYTES = 1_200_000;

async function optimizePhoto(file) {
  if (!file?.type?.startsWith("image/")) {
    throw new Error("Please select a photo image.");
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error("Please choose photos smaller than 15 MB each.");
  }

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("This photo format cannot be processed. Use a JPEG or PNG photo.");
  }

  try {
    const canvas = document.createElement("canvas");
    const maxSide = 1400;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Unable to process this photo.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    async function toJpeg(quality) {
      return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Photo compression failed.")), "image/jpeg", quality);
      });
    }

    let blob = await toJpeg(0.80);
    if (blob.size > MAX_UPLOAD_BYTES) blob = await toJpeg(0.65);
    if (blob.size > MAX_UPLOAD_BYTES) {
      const previous = document.createElement("canvas");
      previous.width = canvas.width;
      previous.height = canvas.height;
      previous.getContext("2d").drawImage(canvas, 0, 0);
      canvas.width = Math.max(1, Math.round(canvas.width * 0.7));
      canvas.height = Math.max(1, Math.round(canvas.height * 0.7));
      canvas.getContext("2d").drawImage(previous, 0, 0, canvas.width, canvas.height);
      blob = await toJpeg(0.60);
    }
    if (blob.size > MAX_UPLOAD_BYTES) throw new Error("This photo is still too large. Try a smaller photo.");

    return new File([blob], `service-photo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}.jpg`, {
      type: "image/jpeg",
    });
  } finally {
    bitmap.close?.();
  }
}

export default function ClientRequestPage() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const [photos, setPhotos] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [processingPhotos, setProcessingPhotos] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraFacing, setCameraFacing] = useState("environment");
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);

  // Real camera preview: the stream only exists while the camera dialog is open.
  // The stream is stopped when closing, switching cameras, or leaving the page.
  useEffect(() => {
    if (!cameraOpen) return undefined;
    let cancelled = false;
    let stream = null;

    async function startCamera() {
      setCameraError("");
      setCameraLoading(true);

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Camera is unavailable. Use HTTPS or localhost and a supported browser, or choose a photo instead.");
        setCameraLoading(false);
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: cameraFacing },
            width: { ideal: 1280 },
            height: { ideal: 960 },
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        cameraStreamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          try {
            await video.play();
          } catch {
            // Browser may delay autoplay until the user interacts with the preview.
          }
        }
        if (!cancelled) setCameraLoading(false);
      } catch (err) {
        if (cancelled) return;
        const denied = err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError";
        const busy = err?.name === "NotReadableError" || err?.name === "TrackStartError";
        setCameraError(denied
          ? "Camera permission was denied. Allow camera access in your browser settings, or use Choose Photos."
          : busy
            ? "Camera is being used by another app. Close that app or use Choose Photos."
            : "Could not open the camera. Check your camera connection or use Choose Photos.");
        setCameraLoading(false);
      }
    }

    startCamera();
    return () => {
      cancelled = true;
      if (stream) stream.getTracks().forEach((track) => track.stop());
      if (cameraStreamRef.current === stream) cameraStreamRef.current = null;
      if (videoRef.current?.srcObject === stream) videoRef.current.srcObject = null;
    };
  }, [cameraOpen, cameraFacing]);

  function openCamera() {
    if (loading || processingPhotos || photos.length >= MAX_PHOTOS) return;
    setCameraError("");
    setError("");
    setCameraFacing("environment");
    setCameraOpen(true);
  }

  function closeCamera() {
    setCameraOpen(false);
    setCameraError("");
  }

  async function capturePhoto() {
    if (processingPhotos || photos.length >= MAX_PHOTOS) return;
    const video = videoRef.current;
    if (!video || !cameraStreamRef.current || !video.videoWidth || !video.videoHeight) {
      setCameraError("Camera is starting. Please try Capture again when the preview appears.");
      return;
    }

    setCameraError("");
    setProcessingPhotos(true);
    try {
      const canvas = document.createElement("canvas");
      const ratio = Math.min(1, 1400 / Math.max(video.videoWidth, video.videoHeight));
      canvas.width = Math.max(1, Math.round(video.videoWidth * ratio));
      canvas.height = Math.max(1, Math.round(video.videoHeight * ratio));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Unable to capture this photo.");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((result) => result ? resolve(result) : reject(new Error("Photo capture failed.")), "image/jpeg", 0.82);
      });
      const file = new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" });
      const optimized = await optimizePhoto(file);
      setPhotos((previous) => [...previous, optimized].slice(0, MAX_PHOTOS));
      closeCamera(); // Taking a picture adds it to the normal preview; submit uploads to Cloudinary.
    } catch (err) {
      setCameraError(err?.message || "Unable to capture this photo.");
    } finally {
      setProcessingPhotos(false);
    }
  }

  useEffect(() => {
    const next = photos.map((file) => ({ name: file.name, url: URL.createObjectURL(file) }));
    setPreviews(next);
    return () => next.forEach((entry) => URL.revokeObjectURL(entry.url));
  }, [photos]);

  async function addPhotos(event) {
    const picked = Array.from(event.target.files || []);
    event.target.value = "";
    if (!picked.length) return;
    if (photos.length + picked.length > MAX_PHOTOS) {
      setError(`You can attach up to ${MAX_PHOTOS} photos.`);
      return;
    }
    setProcessingPhotos(true);
    setError("");
    try {
      const optimized = [];
      for (const file of picked) optimized.push(await optimizePhoto(file));
      setPhotos((previous) => [...previous, ...optimized].slice(0, MAX_PHOTOS));
    } catch (err) {
      setError(err.message || "Unable to process selected photos.");
    } finally {
      setProcessingPhotos(false);
    }
  }

  function update(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    if (loading || processingPhotos) return;

    setError("");
    if (!form.consent) {
      setError("Please agree to be contacted about your service request.");
      return;
    }
    setLoading(true);

    try {
      let body;
      const options = { method: "POST", credentials: "same-origin" };
      if (photos.length) {
        body = new FormData();
        for (const [key, value] of Object.entries(form)) body.append(key, String(value));
        for (const photo of photos) body.append("images", photo, photo.name);
        // Do not set Content-Type manually: the browser supplies the multipart boundary.
      } else {
        body = JSON.stringify(form);
        options.headers = { "Content-Type": "application/json" };
      }
      const response = await fetch("/api/client-requests", { ...options, body });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        throw new Error(result.error || "We could not submit the request. Please try again.");
      }
      setReference(result.reference || "Submitted");
      setForm({ ...initialForm });
      setPhotos([]);
    } catch (err) {
      setError(err.message || "Unable to submit your request.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.container}>
          <Link className={styles.brand} href="/"><span className={styles.logo}><ShieldCheck size={23}/></span><span><b>The Cam Crew_TVM</b><small>Automation & Security Surveillance</small></span></Link>
          <div className={styles.headerActions}>
            <Link href="/" className={styles.backLink}><ArrowLeft size={17}/> Home</Link>
            </div>
        </div>
      </header>

      <main className={styles.container}>
        <div className={styles.breadcrumb}><Link href="/">Home</Link><span>/</span><strong>Service Request</strong></div>
        <div className={styles.layout}>
          <aside className={styles.intro}>
            <span className={styles.eyebrow}><span/> WE'RE HERE TO HELP</span>
            <h1>Tell us how<br/>we can <em>help.</em></h1>
            <p>Need a new security system, a repair, or service support? Fill in the form and our team can contact you about the next steps.</p>
            <div className={styles.helpItems}>
              <div><span><ClipboardList size={20}/></span><div><b>Simple online request</b><small>Share what you need in a few steps.</small></div></div>
              <div><span><Headphones size={20}/></span><div><b>Team follow-up</b><small>We will use your details to contact you.</small></div></div>
              <div><span><MapPin size={20}/></span><div><b>Local service</b><small>Pothencode & Vizhinjam, Trivandrum.</small></div></div>
            </div>
            <div className={styles.callBox}><Phone size={22}/><div><small>Prefer to speak with us?</small><a href="tel:+918891177850">8891177850 <ArrowRight size={15}/></a></div></div>
          </aside>

          <section className={styles.formCard} aria-label="Client service request form">
            {reference ? (
              <div className={styles.success} role="status">
                <div className={styles.successIcon}><CheckCircle2 size={34}/></div>
                <h2>Request received!</h2>
                <p>Thank you for contacting The Cam Crew_TVM. Our team can now review your request and contact you using the details you provided.</p>
                <div className={styles.reference}><small>YOUR REQUEST REFERENCE</small><strong>{reference}</strong></div>
                <div className={styles.successActions}>
                  <button type="button" onClick={() => setReference("")} className={styles.submitButton}>Submit another request <ArrowRight size={18}/></button>
                  <Link className={styles.textButton} href="/">Back to Home</Link>
                </div>
              </div>
            ) : (
              <>
                <div className={styles.cardHeader}><span className={styles.cardIcon}><ClipboardList size={23}/></span><div><h2>Service Request Form</h2><p>Fields marked * are required.</p></div></div>
                <form onSubmit={submit} className={styles.form}>
                  {/* A spam trap: leave invisible to normal visitors. */}
                  <div className={styles.honeypot} aria-hidden="true"><label htmlFor="request-website">Website</label><input id="request-website" type="text" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => update("website", e.target.value)}/></div>
                  <div className={styles.formGrid}>
                    <div className={styles.field}><label htmlFor="request-name">Full name <b>*</b></label><input id="request-name" type="text" autoComplete="name" minLength={2} maxLength={100} required placeholder="Your full name" value={form.name} onChange={(e)=>update("name",e.target.value)}/></div>
                    <div className={styles.field}><label htmlFor="request-phone">Phone number <b>*</b></label><input id="request-phone" type="tel" autoComplete="tel" maxLength={20} required placeholder="10-digit mobile number" value={form.phone} onChange={(e)=>update("phone",e.target.value)}/></div>
                    <div className={styles.field}><label htmlFor="request-email">Email address <span>(optional)</span></label><input id="request-email" type="email" autoComplete="email" maxLength={150} placeholder="you@example.com" value={form.email} onChange={(e)=>update("email",e.target.value)}/></div>
                    <div className={styles.field}><label htmlFor="request-type">Service needed <b>*</b></label><select id="request-type" required value={form.serviceType} onChange={(e)=>update("serviceType",e.target.value)}><option value="">Select a service</option>{REQUEST_TYPES.map((type)=><option key={type} value={type}>{type}</option>)}</select></div>
                    <div className={styles.field}><label htmlFor="request-city">City / locality <b>*</b></label><input id="request-city" type="text" autoComplete="address-level2" maxLength={120} required placeholder="e.g. Pothencode" value={form.city} onChange={(e)=>update("city",e.target.value)}/></div>
                    <div className={styles.field}><label htmlFor="request-date">Preferred date <span>(optional)</span></label><input id="request-date" type="date" min={new Date().toISOString().slice(0,10)} value={form.preferredDate} onChange={(e)=>update("preferredDate",e.target.value)}/></div>
                    <div className={`${styles.field} ${styles.full}`}><label htmlFor="request-address">Service address <span>(optional)</span></label><input id="request-address" type="text" autoComplete="street-address" maxLength={300} placeholder="House / building name, street, landmark" value={form.address} onChange={(e)=>update("address",e.target.value)}/></div>
                    <div className={`${styles.field} ${styles.full}`}><label htmlFor="request-description">Describe your request <b>*</b></label><textarea id="request-description" required rows={5} minLength={10} maxLength={2000} placeholder="Tell us about your CCTV, security or automation requirement..." value={form.description} onChange={(e)=>update("description",e.target.value)}/><span className={styles.charCount}>{form.description.length} / 2000</span></div>
                  </div>
                  <div className={styles.photoSection}>
                    <div className={styles.photoHeading}>
                      <div>
                        <strong><ImagePlus size={18} /> Add problem photos <span>(optional)</span></strong>
                        <p>Show the camera fault, wiring, or installation area. Up to 3 photos.</p>
                      </div>
                      <span className={styles.photoCount}>{photos.length} / {MAX_PHOTOS}</span>
                    </div>
                    <div className={styles.photoActions}>
                      <label className={styles.photoButton}>
                        <ImagePlus size={17} /> Choose photos
                        <input type="file" accept="image/*" multiple onChange={addPhotos}
                          disabled={loading || processingPhotos || photos.length >= MAX_PHOTOS} />
                      </label>
                      <button type="button" className={styles.photoButton}
                        onClick={openCamera} disabled={loading || processingPhotos || photos.length >= MAX_PHOTOS}>
                        <Camera size={17} /> Take photo
                      </button>
                    </div>
                    {processingPhotos && <p className={styles.photoHint}><Loader2 size={15} className={styles.spin} /> Optimizing photos...</p>}
                    {previews.length > 0 && (
                      <div className={styles.photoGrid}>
                        {previews.map((entry, index) => (
                          <div className={styles.photoTile} key={entry.url}>
                            <img src={entry.url} alt={`Selected service photo ${index + 1}`} />
                            <button type="button" disabled={loading || processingPhotos}
                              aria-label={`Remove photo ${index + 1}`}
                              onClick={() => setPhotos((previous) => previous.filter((_, i) => i !== index))}>
                              <X size={15} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className={styles.photoHint}>Photos are optimized before uploading and stored privately in cloud storage. Only authorized staff can view them.</p>
                  </div>
                  <label className={styles.consent}><input type="checkbox" checked={form.consent} onChange={(e)=>update("consent",e.target.checked)} required/><span>I agree to be contacted by The Cam Crew_TVM about this service request. <b>*</b></span></label>
                  {error && <div role="alert" className={styles.error}>{error}</div>}
                  <button className={styles.submitButton} type="submit" disabled={loading || processingPhotos}>{loading ? <><Loader2 className={styles.spin} size={18}/> Submitting...</> : <>Submit Service Request <ArrowRight size={18}/></>}</button>
                  <div className={styles.privacy}><BadgeCheck size={15}/> Your details are used to respond to your service enquiry.</div>
                </form>
              </>
            )}
          </section>
        </div>
      </main>
      {cameraOpen && (
        <div className={styles.cameraOverlay} role="presentation" onKeyDown={(event) => {
          if (event.key === "Escape") closeCamera();
        }}>
          <section className={styles.cameraDialog} role="dialog" aria-modal="true"
            aria-label="Take service request photo" tabIndex={-1}>
            <div className={styles.cameraTopbar}>
              <div><Camera size={20} /><strong>Take Photo</strong></div>
              <button type="button" className={styles.cameraCloseButton}
                onClick={closeCamera} aria-label="Close camera"><X size={21} /></button>
            </div>
            <div className={styles.cameraStage}>
              <video ref={videoRef} className={styles.cameraVideo}
                autoPlay playsInline muted aria-label="Live camera preview" />
              {cameraLoading && (
                <div className={styles.cameraStatus} role="status">
                  <Loader2 size={22} className={styles.spin} /> Starting camera...
                </div>
              )}
              {cameraError && (
                <div className={styles.cameraStatus} role="alert">{cameraError}</div>
              )}
            </div>
            <div className={styles.cameraToolbar}>
              <button type="button" className={styles.cameraSwitchButton}
                disabled={cameraLoading || processingPhotos}
                onClick={() => setCameraFacing((current) => current === "environment" ? "user" : "environment")}
                title="Switch front/rear camera">
                <RefreshCw size={17} /> Switch camera
              </button>
              <button type="button" className={styles.cameraCaptureButton}
                disabled={cameraLoading || !!cameraError || processingPhotos || photos.length >= MAX_PHOTOS}
                onClick={capturePhoto}>
                {processingPhotos ? <Loader2 size={18} className={styles.spin} /> : <Camera size={18} />}
                {processingPhotos ? "Saving photo..." : "Capture Photo"}
              </button>
            </div>
            <p className={styles.cameraNote}>The camera image is saved to this request only after you capture it. Photos upload when you submit the form.</p>
          </section>
        </div>
      )}
      <footer className={styles.footer}>© {new Date().getFullYear()} The Cam Crew_TVM · <Link href="/">Home</Link> · <Link href="/admin/login">Billing Admin</Link></footer>
    </div>
  );
}