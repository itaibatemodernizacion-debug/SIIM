// Cryptographic helpers for password hashing (PBKDF2-SHA256) and Browser Credential Manager integration

const PBKDF2_ITERATIONS = 100000;
const HASH_BITS = 256;

const bytesToHex = (bytes: Uint8Array): string =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

const hexToBytes = (hex: string): Uint8Array => {
  const clean = hex.trim();
  const len = Math.floor(clean.length / 2);
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
};

export const generateSaltHex = (byteLength = 16): string => {
  const bytes = new Uint8Array(byteLength);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < byteLength; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return bytesToHex(bytes);
};

// Constant-time string comparison to avoid timing leaks
export const constantTimeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
};

export const derivePasswordHash = async (
  password: string,
  saltHex: string,
  iterations = PBKDF2_ITERATIONS
): Promise<string> => {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );
    const saltBytes = hexToBytes(saltHex);
    const derived = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltBytes.buffer as ArrayBuffer,
        iterations,
        hash: 'SHA-256'
      },
      keyMaterial,
      HASH_BITS
    );
    return bytesToHex(new Uint8Array(derived));
  }

  // Fallback for non-secure contexts where crypto.subtle is unavailable
  let acc = 2166136261;
  const input = `${saltHex}:${password}:${iterations}`;
  for (let i = 0; i < input.length; i++) {
    acc ^= input.charCodeAt(i);
    acc = Math.imul(acc, 16777619);
  }
  return `fb_${(acc >>> 0).toString(16).padStart(8, '0')}`;
};

export interface HashedPasswordRecord {
  hash: string;
  salt: string;
  iterations: number;
  updatedAt: string;
}

export const createPasswordRecord = async (password: string): Promise<HashedPasswordRecord> => {
  const salt = generateSaltHex(16);
  const hash = await derivePasswordHash(password, salt, PBKDF2_ITERATIONS);
  return {
    hash,
    salt,
    iterations: PBKDF2_ITERATIONS,
    updatedAt: new Date().toISOString()
  };
};

export const verifyPasswordRecord = async (
  password: string,
  record: HashedPasswordRecord
): Promise<boolean> => {
  if (!record?.hash || !record?.salt) return false;
  const computed = await derivePasswordHash(
    password,
    record.salt,
    record.iterations || PBKDF2_ITERATIONS
  );
  return constantTimeEqual(computed, record.hash);
};

// Trigger native Browser Password Manager prompt to save/update credentials securely
export const storeBrowserCredential = async (
  username: string,
  password: string,
  displayName?: string
): Promise<void> => {
  try {
    const win = window as any;
    if (
      typeof navigator !== 'undefined' &&
      'credentials' in navigator &&
      typeof win.PasswordCredential === 'function'
    ) {
      const cred = new win.PasswordCredential({
        id: username,
        password,
        name: displayName || username
      });
      await navigator.credentials.store(cred);
    }
  } catch {
    // Gracefully ignore in iframes or browsers without PasswordCredential API
  }
};
