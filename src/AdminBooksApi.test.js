import { test, expect, vi, beforeEach } from "vitest";

let stored = null;
vi.mock("@vercel/blob", () => ({
  get: vi.fn(async () =>
    stored === null ? null : { statusCode: 200, stream: new Response(stored).body }
  ),
  put: vi.fn(async (_path, body) => { stored = body; return {}; }),
}));
const create = vi.fn();
vi.mock("stripe", () => ({
  default: vi.fn(function () { this.checkout = { sessions: { create } }; }),
}));

const { default: adminBooks } = await import("../api/admin/books.js");
const { default: publicBooks } = await import("../api/books.js");
const { default: checkout } = await import("../api/create-checkout-session.js");

function mockRes() {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  res.setHeader = vi.fn();
  return res;
}
const auth = { authorization: "Bearer pw" };

beforeEach(() => {
  stored = null;
  process.env.ADMIN_PASSWORD = "pw";
  process.env.BLOB_READ_WRITE_TOKEN = "token";
  process.env.STRIPE_SECRET_KEY = "sk_test";
  create.mockReset().mockResolvedValue({ url: "https://checkout.stripe.com/s" });
});

test("rejects requests without the admin password", async () => {
  const res = mockRes();
  await adminBooks({ method: "POST", headers: {}, body: { id: 1, action: "delete" } }, res);
  expect(res.status).toHaveBeenCalledWith(401);
});

test("delete then restore updates the public deleted list", async () => {
  let res = mockRes();
  await adminBooks({ method: "POST", headers: auth, body: { id: 1, action: "delete" } }, res);
  expect(res.json).toHaveBeenCalledWith({ deletedIds: [1] });

  res = mockRes();
  await publicBooks({ method: "GET", headers: {} }, res);
  expect(res.json).toHaveBeenCalledWith({ deletedIds: [1] });

  res = mockRes();
  await adminBooks({ method: "POST", headers: auth, body: { id: 1, action: "restore" } }, res);
  expect(res.json).toHaveBeenCalledWith({ deletedIds: [] });
});

test("rejects unknown books", async () => {
  const res = mockRes();
  await adminBooks({ method: "POST", headers: auth, body: { id: 999, action: "delete" } }, res);
  expect(res.status).toHaveBeenCalledWith(404);
});

test("checkout refuses deleted books", async () => {
  stored = JSON.stringify({ deletedIds: [1] });
  const res = mockRes();
  await checkout({ method: "POST", headers: {}, body: { items: [{ id: 1, quantity: 1 }] } }, res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(create).not.toHaveBeenCalled();
});
