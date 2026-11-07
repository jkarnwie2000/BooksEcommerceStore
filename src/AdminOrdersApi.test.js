import { test, expect, vi, beforeEach } from "vitest";

let stored = null;
vi.mock("@vercel/blob", async (importOriginal) => {
  const { BlobNotFoundError } = await importOriginal();
  return {
    BlobNotFoundError,
    del: vi.fn(),
    get: vi.fn(async (path) =>
      path !== "admin/deleted-orders.json" || stored === null
        ? null
        : { statusCode: 200, stream: new Response(stored).body }
    ),
    put: vi.fn(async (_path, body) => { stored = body; return {}; }),
  };
});

const session = (id, total) => ({
  id, created: 1790000000, payment_status: "paid", amount_total: total * 100, currency: "usd",
  customer_details: { name: "Ada", email: "a@x.com" },
  line_items: { data: [{ description: "Deep Work", quantity: 1, amount_total: total * 100 }] },
});
vi.mock("stripe", () => ({
  default: vi.fn(function () {
    this.checkout = { sessions: { list: vi.fn(async () => ({ data: [session("cs_a", 10), session("cs_b", 30)] })) } };
  }),
}));

const { default: handler } = await import("../api/admin/orders.js");

function mockRes() {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  res.setHeader = vi.fn();
  return res;
}
const auth = { authorization: "Basic " + Buffer.from("admin@shop.test:pw").toString("base64") };

beforeEach(() => {
  stored = null;
  process.env.ADMIN_PASSWORD = "pw";
  process.env.ADMIN_EMAIL = "admin@shop.test";
  process.env.BLOB_READ_WRITE_TOKEN = "token";
  process.env.STRIPE_SECRET_KEY = "sk_test";
});

test("rejects deletes without the admin password", async () => {
  const res = mockRes();
  await handler({ method: "DELETE", headers: {}, query: { id: "cs_a" } }, res);
  expect(res.status).toHaveBeenCalledWith(401);
  expect(stored).toBeNull();
});

test("rejects invalid transaction ids", async () => {
  const res = mockRes();
  await handler({ method: "DELETE", headers: auth, query: { id: "../../etc" } }, res);
  expect(res.status).toHaveBeenCalledWith(400);
});

test("a deleted transaction disappears from the list and the totals", async () => {
  let res = mockRes();
  await handler({ method: "DELETE", headers: auth, query: { id: "cs_b" } }, res);
  expect(res.status).toHaveBeenCalledWith(200);

  res = mockRes();
  await handler({ method: "GET", headers: auth, query: {} }, res);
  const body = res.json.mock.calls[0][0];
  expect(body.orders.map((o) => o.id)).toEqual(["cs_a"]);
  expect(body.stats).toEqual({ revenue: 10, orderCount: 1, booksSold: 1, averageOrder: 10 });
});
