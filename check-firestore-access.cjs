
const fs = require("node:fs");
const path = require("node:path");

const { initializeApp, cert, deleteApp } =
  require("firebase-admin/app");

const { getFirestore } =
  require("firebase-admin/firestore");

const file = path.join(
  __dirname,
  "cam-crew-da27f-firebase-adminsdk-fbsvc-3665f5af8a.json"
);

async function main() {
  const serviceAccount = JSON.parse(
    fs.readFileSync(file, "utf8")
  );

  console.log("PROJECT:", serviceAccount.project_id);
  console.log("ACCOUNT:", serviceAccount.client_email);

  const app = initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id,
  }, "billing-permission-test");

  try {
    const db = getFirestore(app);

    // Read-only test. No documents are created.
    await db
      .collection("_firestore_permission_probe")
      .limit(1)
      .get();

    console.log("FIRESTORE ACCESS: SUCCESS");
    console.log("IAM permissions are working.");
  } catch (error) {
    console.error("FIRESTORE ACCESS: FAILED");
    console.error("CODE:", error.code);
    console.error("MESSAGE:", error.message);
  } finally {
    await deleteApp(app);
  }
}

main().catch((error) => {
  console.error("TEST FAILED:", error.message);
  process.exitCode = 1;
});
