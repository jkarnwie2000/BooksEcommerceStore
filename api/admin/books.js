import { isAuthorized } from "../_lib/auth.js";
import {
  findBook,
  readDeletedIds,
  storageConfigured,
  writeDeletedIds,
} from "../_lib/catalog.js";

// Admin: POST /api/admin/books  { id, action: "delete" | "restore" }
// Requires "Authorization: Bearer <ADMIN_PASSWORD>".
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!storageConfigured()) {
    return res.status(500).json({ error: "Book storage is not configured." });
  }

  const { id, action } = req.body || {};
  if (!findBook(id)) {
    return res.status(404).json({ error: "Book not found." });
  }
  if (action !== "delete" && action !== "restore") {
    return res.status(400).json({ error: 'Action must be "delete" or "restore".' });
  }

  try {
    const current = await readDeletedIds();
    const next =
      action === "delete"
        ? [...current, Number(id)]
        : current.filter((deletedId) => deletedId !== Number(id));
    const deletedIds = await writeDeletedIds(next);
    return res.status(200).json({ deletedIds });
  } catch (err) {
    console.error("Catalog write error:", err);
    return res.status(500).json({ error: "Could not update the catalog." });
  }
}
