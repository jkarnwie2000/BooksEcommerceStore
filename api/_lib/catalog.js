import { get, put } from "@vercel/blob";
import { books } from "../../src/data.js";

// The catalog itself lives in src/data.js. Books deleted from the admin
// dashboard are recorded as a list of ids in a private Vercel Blob file,
// so a deleted book can be restored later.
const PATHNAME = "catalog/deleted-books.json";

export function storageConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function readDeletedIds() {
  if (!storageConfigured()) return [];
  try {
    const result = await get(PATHNAME, { access: "private", useCache: false });
    if (!result || result.statusCode !== 200) return [];
    const data = JSON.parse(await new Response(result.stream).text());
    return Array.isArray(data.deletedIds) ? data.deletedIds.map(Number) : [];
  } catch (err) {
    if (err?.name === "BlobNotFoundError") return [];
    throw err;
  }
}

export async function writeDeletedIds(ids) {
  const deletedIds = [...new Set(ids.map(Number))].sort((a, b) => a - b);
  await put(PATHNAME, JSON.stringify({ deletedIds }), {
    access: "private",
    allowOverwrite: true,
    addRandomSuffix: false,
    contentType: "application/json",
  });
  return deletedIds;
}

export function findBook(id) {
  return books.find((book) => book.id === Number(id));
}
