
export const ADMIN_SESSION_COOKIE = "camcrew_admin_session";
export const ADMIN_SESSION_SECONDS = 8 * 60 * 60;

const encoder = new TextEncoder();

function hexFromBytes(bytes) {
  return Array.from(
    bytes,
    (byte) => byte.toString(16).padStart(2, "0")
  ).join("");
}

function bytesFromHex(hex) {
  if (!/^[a-f\d]+$/i.test(hex) || hex.length % 2 !== 0) {
    return null;
  }

  const bytes = new Uint8Array(hex.length / 2);

  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }

  return bytes;
}

async function importSessionKey(secret) {
  if (!secret || secret.length < 32) return null;

  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function createAdminSession(secret) {
  const key = await importSessionKey(secret);

  if (!key) {
    throw new Error(
      "ADMIN_SESSION_SECRET must contain at least 32 characters."
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const expires = now + ADMIN_SESSION_SECONDS;

  const randomBytes = new Uint8Array(16);
  crypto.getRandomValues(randomBytes);

  const payload =
    `${now}.${expires}.${hexFromBytes(randomBytes)}`;

  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload)
  );

  return `${payload}.${hexFromBytes(new Uint8Array(signed))}`;
}

export async function verifyAdminSession(token, secret) {
  if (typeof token !== "string" || token.length > 300) {
    return false;
  }

  const [
    issuedString,
    expiresString,
    nonce,
    signature,
    extra,
  ] = token.split(".");

  if (extra !== undefined) return false;

  if (!/^\d{10,11}$/.test(issuedString || "")) {
    return false;
  }

  if (!/^\d{10,11}$/.test(expiresString || "")) {
    return false;
  }

  if (!/^[a-f\d]{32}$/.test(nonce || "")) {
    return false;
  }

  if (!/^[a-f\d]{64}$/.test(signature || "")) {
    return false;
  }

  const issued = Number(issuedString);
  const expires = Number(expiresString);
  const now = Math.floor(Date.now() / 1000);

  if (
    issued > now + 60 ||
    expires <= now ||
    expires <= issued
  ) {
    return false;
  }

  if (expires - issued > ADMIN_SESSION_SECONDS) {
    return false;
  }

  const key = await importSessionKey(secret);

  if (!key) return false;

  try {
    return await crypto.subtle.verify(
      "HMAC",
      key,
      bytesFromHex(signature),
      encoder.encode(
        `${issuedString}.${expiresString}.${nonce}`
      )
    );
  } catch {
    return false;
  }
}
