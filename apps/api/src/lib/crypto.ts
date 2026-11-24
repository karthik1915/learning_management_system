import { createCipheriv, randomBytes } from "node:crypto";

/** AES-256-GCM. DATA_ENCRYPTION_KEY = 64 hex chars (openssl rand -hex 32). Output: iv.tag.cipher (base64). */
export const encryptText = (plain: string) => {
  const hex = process.env.DATA_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) throw new Error("DATA_ENCRYPTION_KEY must be 64 hex chars");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(hex, "hex"), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), enc].map((b) => b.toString("base64")).join(".");
};
