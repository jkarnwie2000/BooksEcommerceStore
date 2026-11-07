import { test, expect, vi, beforeEach } from "vitest";

// In-memory stand-in for the private Vercel Blob store.
const store = new Map();
vi.mock("@vercel/blob", async (importOriginal) => {
  const { BlobNotFoundError } = await importOriginal();
  return {
    BlobNotFoundError,
    get: vi.fn(async (path) =>
      store.has(path) ? { statusCode: 200, stream: new Response(store.get(path)).body } : null
    ),
    put: vi.fn(async (path, body) => {
      store.set(path, body);
      return {};
    }),
    del: vi.fn(async (path) => {
      store.delete(path);
    }),
    head: vi.fn(),
  };
});

const sendMail = vi.fn();
vi.mock("nodemailer", () => ({ default: { createTransport: () => ({ sendMail }) } }));

const { default: forgot } = await import("../api/admin/forgot-password.js");
const { default: reset } = await import("../api/admin/reset-password.js");
const { isAuthorized } = await import("../api/_lib/auth.js");

function mockRes() {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  res.setHeader = vi.fn();
  return res;
}

async function call(handler, body) {
  const res = mockRes();
  await handler({ method: "POST", headers: { host: "shop.test" }, body }, res);
  return { status: res.status.mock.calls[0][0], body: res.json.mock.calls[0][0] };
}

function signIn(email, password) {
  const value = Buffer.from(`${email}:${password}`).toString("base64");
  return isAuthorized({ headers: { authorization: `Basic ${value}` } });
}

function linkToken() {
  const text = sendMail.mock.calls.at(-1)[0].text;
  return text.match(/reset-password\?token=([a-f0-9]+)/)[1];
}

beforeEach(() => {
  store.clear();
  sendMail.mockReset().mockResolvedValue({});
  Object.assign(process.env, {
    ADMIN_EMAIL: "owner@store.com",
    ADMIN_PASSWORD: "original-pass",
    BLOB_READ_WRITE_TOKEN: "token",
    SMTP_USER: "store@gmail.com",
    SMTP_PASS: "app-pass",
  });
  delete process.env.SITE_URL;
});

test("full reset: email a link, set a new password, old one stops working", async () => {
  expect(await signIn("owner@store.com", "original-pass")).toBe(true);

  const requested = await call(forgot, { email: "Owner@Store.com" });
  expect(requested.status).toBe(200);
  const mail = sendMail.mock.calls[0][0];
  expect(mail.to).toBe("owner@store.com");
  expect(mail.subject).toMatch(/reset your .* admin password/i);
  expect(mail.html).toContain("https://shop.test/admin/reset-password?token=");

  const done = await call(reset, { token: linkToken(), password: "brand-new-pass" });
  expect(done.status).toBe(200);

  expect(await signIn("owner@store.com", "brand-new-pass")).toBe(true);
  expect(await signIn("owner@store.com", "original-pass")).toBe(false);
  expect(store.get("admin/credentials.json")).not.toContain("brand-new-pass");
});

test("a reset link works only once", async () => {
  await call(forgot, { email: "owner@store.com" });
  const token = linkToken();
  expect((await call(reset, { token, password: "first-new-pass" })).status).toBe(200);
  const again = await call(reset, { token, password: "second-new-pass" });
  expect(again.status).toBe(400);
  expect(await signIn("owner@store.com", "first-new-pass")).toBe(true);
});

test("an expired link is rejected", async () => {
  await call(forgot, { email: "owner@store.com" });
  const token = linkToken();
  const saved = JSON.parse(store.get("admin/password-reset.json"));
  store.set("admin/password-reset.json", JSON.stringify({ ...saved, expiresAt: Date.now() - 1 }));
  expect((await call(reset, { token, password: "new-password-1" })).status).toBe(400);
});

test("a wrong token is rejected", async () => {
  await call(forgot, { email: "owner@store.com" });
  const res = await call(reset, { token: "f".repeat(64), password: "new-password-1" });
  expect(res.status).toBe(400);
});

test("other email addresses get the same reply but no email", async () => {
  const reply = await call(forgot, { email: "stranger@example.com" });
  const ownerReply = await call(forgot, { email: "owner@store.com" });
  expect(reply).toEqual(ownerReply);
  expect(sendMail).toHaveBeenCalledTimes(1);
  expect(sendMail.mock.calls[0][0].to).toBe("owner@store.com");
});

test("rapid repeat requests send only one email a minute", async () => {
  await call(forgot, { email: "owner@store.com" });
  await call(forgot, { email: "owner@store.com" });
  expect(sendMail).toHaveBeenCalledTimes(1);
});

test("new passwords must be at least 8 characters", async () => {
  await call(forgot, { email: "owner@store.com" });
  const res = await call(reset, { token: linkToken(), password: "short" });
  expect(res.status).toBe(400);
  expect(res.body.error).toMatch(/at least 8/);
});
