"use client";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// Generate a random AES-GCM key
export async function generateKey() {
  return crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256
    },
    true,
    ["encrypt", "decrypt"]
  );
}

// Export key to base64 (for URL)
export async function exportKey(key: CryptoKey) {
  const raw = await crypto.subtle.exportKey("raw", key);
  return btoa(String.fromCharCode(...new Uint8Array(raw)));
}

// Import key from base64
export async function importKey(base64Key: string) {
  const raw = Uint8Array.from(atob(base64Key), c => c.charCodeAt(0));

  return crypto.subtle.importKey(
    "raw",
    raw,
    "AES-GCM",
    false,
    ["decrypt"]
  );
}

// Encrypt secret
export async function encryptSecret(secret: string) {
  const key = await generateKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv
    },
    key,
    encoder.encode(secret)
  );

  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...iv)),
    key: await exportKey(key)
  };
}

// Decrypt secret
export async function decryptSecret(
  ciphertext: string,
  iv: string,
  base64Key: string
) {
  const key = await importKey(base64Key);

  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: Uint8Array.from(atob(iv), c => c.charCodeAt(0))
    },
    key,
    Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0))
  );

  return decoder.decode(decrypted);
}