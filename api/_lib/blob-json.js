import { BlobNotFoundError, del, get, put } from "@vercel/blob";

// Small JSON documents kept in the private Vercel Blob store.

export function blobConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function readJson(pathname) {
  if (!blobConfigured()) return null;
  try {
    const result = await get(pathname, { access: "private", useCache: false });
    if (!result || result.statusCode !== 200) return null;
    return JSON.parse(await new Response(result.stream).text());
  } catch (err) {
    if (err instanceof BlobNotFoundError) return null;
    throw err;
  }
}

export async function writeJson(pathname, data) {
  await put(pathname, JSON.stringify(data), {
    access: "private",
    allowOverwrite: true,
    addRandomSuffix: false,
    contentType: "application/json",
  });
}

export async function deleteJson(pathname) {
  try {
    await del(pathname);
  } catch (err) {
    if (!(err instanceof BlobNotFoundError)) throw err;
  }
}
