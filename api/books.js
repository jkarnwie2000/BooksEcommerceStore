import { readDeletedIds } from "./_lib/catalog.js";

// Public: GET /api/books -> { deletedIds: number[] }
// The shop uses this to hide books deleted from the admin dashboard.
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  res.setHeader("Cache-Control", "no-store");
  try {
    return res.status(200).json({ deletedIds: await readDeletedIds() });
  } catch (err) {
    console.error("Catalog read error:", err);
    return res.status(500).json({ error: "Could not load the catalog." });
  }
}
