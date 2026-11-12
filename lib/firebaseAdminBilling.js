import "server-only";

import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

export function getBillingDb() {
  const name = "cam-crew-billing-firestore";
  let app = getApps().find((entry) => entry.name === name);

  if (!app) {
    const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    let credential;
    if (projectId && clientEmail && privateKey) {
      credential = cert({ projectId, clientEmail, privateKey });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      credential = applicationDefault();
    } else {
      throw new Error(
        "Firebase Admin is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY, or GOOGLE_APPLICATION_CREDENTIALS."
      );
    }

    app = initializeApp({ credential, ...(projectId ? { projectId } : {}) }, name);
  }

  return getFirestore(app);
}