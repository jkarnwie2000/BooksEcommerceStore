import { MIN_PASSWORD_LENGTH, setAdminPassword, tokensMatch } from "../_lib/auth.js";
import { blobConfigured, deleteJson, readJson } from "../_lib/blob-json.js";
import { RESET_PATH } from "./forgot-password.js";

// POST /api/admin/reset-password  { token, password }
// Sets a new admin password using a link from the reset email. Each link
// works once and expires after 30 minutes.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!blobConfigured()) {
    return res.status(500).json({ error: "Password reset is not set up on this site." });
  }

  const { token, password } = req.body || {};
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return res
      .status(400)
      .json({ error: `Your new password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
  }

  try {
    const reset = await readJson(RESET_PATH);
    const valid =
      typeof token === "string" &&
      reset &&
      Date.now() < reset.expiresAt &&
      tokensMatch(token, reset.tokenHash);

    if (!valid) {
      return res.status(400).json({
        error: "This reset link is invalid or has expired. Please request a new one.",
      });
    }

    await setAdminPassword(password);
    await deleteJson(RESET_PATH); // one use only
    return res.status(200).json({ message: "Your password has been reset. You can sign in now." });
  } catch (err) {
    console.error("Reset password error:", err);
    return res.status(500).json({ error: "Could not reset the password. Please try again." });
  }
}
