import { timingSafeEqual } from "crypto";

function safeEqual(given, expected) {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// True when the request carries "Authorization: Basic base64(email:password)"
// matching ADMIN_EMAIL (case-insensitive) and ADMIN_PASSWORD.
export function isAuthorized(req) {
  const expectedEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const expectedPassword = process.env.ADMIN_PASSWORD || "";
  if (!expectedEmail || !expectedPassword) return false;

  const header = req.headers.authorization || "";
  if (!header.startsWith("Basic ")) return false;

  const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  const separator = decoded.indexOf(":");
  if (separator < 0) return false;

  const email = decoded.slice(0, separator).trim().toLowerCase();
  const password = decoded.slice(separator + 1);

  // Check both so the response time doesn't reveal which one was wrong.
  const emailOk = safeEqual(email, expectedEmail);
  const passwordOk = safeEqual(password, expectedPassword);
  return emailOk && passwordOk;
}
