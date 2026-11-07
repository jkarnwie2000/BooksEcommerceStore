import { randomBytes } from "crypto";
import { emailMatchesAdmin, adminEmail, hashToken } from "../_lib/auth.js";
import { blobConfigured, readJson, writeJson } from "../_lib/blob-json.js";
import { emailConfigured, passwordResetEmail, sendEmail } from "../_lib/email.js";

// POST /api/admin/forgot-password  { email }
// If the email is the admin's, emails a one-time reset link (valid 30 min).
// The response is the same either way, so it can't be used to find the
// admin's email address.
export const RESET_PATH = "admin/password-reset.json";
const LINK_LIFETIME_MS = 30 * 60 * 1000;
const RESEND_WAIT_MS = 60 * 1000;

const GENERIC_REPLY = {
  message: "If that email matches the admin account, a reset link is on its way. It expires in 30 minutes.",
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!adminEmail() || !blobConfigured() || !emailConfigured()) {
    return res.status(500).json({ error: "Password reset is not set up on this site." });
  }

  if (!emailMatchesAdmin(req.body?.email)) {
    return res.status(200).json(GENERIC_REPLY);
  }

  try {
    // Don't send more than one email a minute.
    const existing = await readJson(RESET_PATH);
    if (existing?.requestedAt && Date.now() - existing.requestedAt < RESEND_WAIT_MS) {
      return res.status(200).json(GENERIC_REPLY);
    }

    const token = randomBytes(32).toString("hex");
    const now = Date.now();
    await writeJson(RESET_PATH, {
      tokenHash: hashToken(token),
      requestedAt: now,
      expiresAt: now + LINK_LIFETIME_MS,
    });

    const siteUrl = (process.env.SITE_URL || `https://${req.headers.host}`).replace(/\/+$/, "");
    const link = `${siteUrl}/admin/reset-password?token=${token}`;
    await sendEmail({ to: adminEmail(), ...passwordResetEmail(link) });

    return res.status(200).json(GENERIC_REPLY);
  } catch (err) {
    console.error("Forgot password error:", err);
    return res.status(500).json({ error: "Could not send the reset email. Please try again." });
  }
}
