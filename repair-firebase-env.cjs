
const { loadEnvConfig } = require("@next/env");
const { createPrivateKey } = require("node:crypto");

loadEnvConfig(process.cwd());

const projectId = process.env.FIREBASE_PROJECT_ID || "";
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || "";

const privateKey = (
  process.env.FIREBASE_PRIVATE_KEY || ""
)
  .replace(/\\n/g, "\n")
  .replace(/\r/g, "")
  .trim();

console.log("Firebase Credential Check");
console.log("-------------------------");

console.log("Project ID:", projectId ? "SET" : "MISSING");

console.log(
  "Client Email:",
  clientEmail.endsWith(".iam.gserviceaccount.com")
    ? "FORMAT OK"
    : "INVALID OR MISSING"
);

console.log(
  "Private Key:",
  privateKey ? "SET" : "MISSING"
);

console.log(
  "PEM Header:",
  privateKey.startsWith("-----BEGIN PRIVATE KEY-----")
    ? "VALID"
    : "INVALID"
);

console.log(
  "PEM Footer:",
  privateKey.endsWith("-----END PRIVATE KEY-----")
    ? "VALID"
    : "INVALID"
);

try {
  createPrivateKey(privateKey);

  console.log("FIREBASE PRIVATE KEY: VALID");
} catch (error) {
  console.log("FIREBASE PRIVATE KEY: INVALID");
  console.log("Error Code:", error.code || "UNKNOWN");
}
