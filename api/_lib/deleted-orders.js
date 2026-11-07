import { BlobNotFoundError, get, put } from "@vercel/blob";

// Stripe never deletes completed payments, so transactions deleted from the
// admin dashboard are recorded here (a private Vercel Blob file) and left
// out of the dashboard's order list and totals.
const PATHNAME = "admin/deleted-orders.json";

export function storageConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function readDeletedOrderIds() {
  if (!storageConfigured()) return [];
  try {
    const result = await get(PATHNAME, { access: "private", useCache: false });
    if (!result || result.statusCode !== 200) return [];
    const data = JSON.parse(await new Response(result.stream).text());
    return Array.isArray(data.deletedIds) ? data.deletedIds.map(String) : [];
  } catch (err) {
    if (err instanceof BlobNotFoundError) return [];
    throw err;
  }
}

export async function writeDeletedOrderIds(ids) {
  const deletedIds = [...new Set(ids.map(String))];
  await put(PATHNAME, JSON.stringify({ deletedIds }), {
    access: "private",
    allowOverwrite: true,
    addRandomSuffix: false,
    contentType: "application/json",
  });
  return deletedIds;
}
