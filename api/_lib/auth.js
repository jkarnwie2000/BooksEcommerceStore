import { createHash, randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { readJson, writeJson } from "./blob-json.js";

const scryptAsync = promisify(scrypt);

// A password set through "Forgot your password?" is stored here as a salted
// scrypt hash. Until one exists, ADMIN_PASSWORD (a Vercel setting) is used.
const CREDENTIALS_PATH = "admin/credentials.json";
export const MIN_PASSWORD_LENGTH = 8;

function safeEqual(given, expected) {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function adminEmail() {
  return (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
}

export function emailMatchesAdmin(email) {
  const expected = adminEmail();
  return Boolean(expected) && safeEqual(String(email || "").trim().toLowerCase(), expected);
}

async function hashPassword(password, salt) {
  const key = await scryptAsync(password, salt, 64);
  return key.toString("hex");
}

export async function setAdminPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = await hashPassword(password, salt);
  await writeJson(CREDENTIALS_PATH, {
    algorithm: "scrypt",
    salt,
    hash,
    updatedAt: new Date().toISOString(),
  });
}

async function passwordMatches(password) {
  const stored = await readJson(CREDENTIALS_PATH);
  if (stored?.hash && stored?.salt) {
    return safeEqual(await hashPassword(password, stored.salt), stored.hash);
  }
  const fallback = process.env.ADMIN_PASSWORD || "";
  return Boolean(fallback) && safeEqual(password, fallback);
}

// True when the request carries "Authorization: Basic base64(email:password)"
// matching ADMIN_EMAIL (case-insensitive) and the admin password.
export async function isAuthorized(req) {
  if (!adminEmail()) return false;

  const header = req.headers.authorization || "";
  if (!header.startsWith("Basic ")) return false;

  const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  const separator = decoded.indexOf(":");
  if (separator < 0) return false;

  // Check both so the response time doesn't reveal which one was wrong.
  const emailOk = emailMatchesAdmin(decoded.slice(0, separator));
  const passwordOk = await passwordMatches(decoded.slice(separator + 1));
  return emailOk && passwordOk;
}

// Reset tokens are stored only as a SHA-256 hash.
export function hashToken(token) {
  return createHash("sha256").update(String(token)).digest("hex");
}

export function tokensMatch(token, storedHash) {
  return Boolean(storedHash) && safeEqual(hashToken(token), storedHash);
}
