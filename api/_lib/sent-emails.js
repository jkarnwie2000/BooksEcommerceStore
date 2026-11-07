import { BlobNotFoundError, head, put } from "@vercel/blob";

// Remembers which order emails were sent (as tiny private Vercel Blob files),
// so Stripe webhook retries never email anyone twice.
const pathFor = (key) => `emails/sent/${key.replace(/[^A-Za-z0-9_-]/g, "_")}.json`;

const enabled = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

export async function alreadySent(key) {
  if (!enabled()) return false;
  try {
    await head(pathFor(key));
    return true;
  } catch (err) {
    if (err instanceof BlobNotFoundError) return false;
    throw err;
  }
}

export async function markSent(key) {
  if (!enabled()) return;
  await put(pathFor(key), JSON.stringify({ sentAt: new Date().toISOString() }), {
    access: "private",
    allowOverwrite: true,
    addRandomSuffix: false,
    contentType: "application/json",
  });
}
