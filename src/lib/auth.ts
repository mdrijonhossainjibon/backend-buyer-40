import CryptoJS from "crypto-js";

const ALGO = "AES"; // AES encryption

export interface SignatureResult {
  timestamp: string;
  hash: string;
  signature: string;
}



export interface VerifyResult {
  success: boolean;
  data?: string;
}

/**
 * Generate a signed hash of the data
 */
export function generateSignature(data: string, secret: string): SignatureResult {
  const timestamp = Date.now().toString();

  // 1️⃣ Encrypt data with AES
  const encrypted = CryptoJS.AES.encrypt(data, secret).toString();

  // 2️⃣ Combine IV + ciphertext as hash (CryptoJS manages IV internally)
  const hash = encrypted;

  // 3️⃣ Create signature (HMAC-SHA256)
  const signature = CryptoJS.HmacSHA256(hash + timestamp, secret).toString();

  return { timestamp, hash, signature };
}

/**
 * Verify the signature and decrypt data
 */
export function verifySignature(  { timestamp, hash, signature, allowedDelay = 1000 * 5  }: any ,  secret: string ): VerifyResult {
 
  // 1️⃣ Check timestamp
  if (Date.now() - parseInt(timestamp) > allowedDelay) return { success: false };

  // 2️⃣ Regenerate signature
  const expectedSignature = CryptoJS.HmacSHA256(hash + timestamp, secret).toString();

  // 3️⃣ Compare signatures safely
  if (signature !== expectedSignature) return { success: false };

  // 4️⃣ Decrypt
  try {
    const bytes = CryptoJS.AES.decrypt(hash, secret);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return { success: true, data: decrypted };
  } catch (err) {
    return { success: false };
  }
}
