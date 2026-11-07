import { test, expect, vi, beforeEach } from "vitest";

const create = vi.fn();
vi.mock("stripe", () => ({
  default: vi.fn(function () {
    this.checkout = { sessions: { create } };
  }),
}));

const { default: handler } = await import("../api/create-checkout-session.js");

function mockRes() {
  const res = { headers: {} };
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  res.setHeader = vi.fn();
  return res;
}

beforeEach(() => {
  process.env.STRIPE_SECRET_KEY = "sk_test_123";
  create.mockReset().mockResolvedValue({ url: "https://checkout.stripe.com/s" });
});

test("uses server-side prices and ignores unknown books or bad quantities", async () => {
  const req = {
    method: "POST",
    headers: { origin: "https://shop.test" },
    body: { items: [
      { id: 1, quantity: 2, salePrice: 0.01 },
      { id: 999, quantity: 1 },
      { id: 2, quantity: 0 },
    ] },
  };
  const res = mockRes();
  await handler(req, res);

  expect(res.status).toHaveBeenCalledWith(200);
  const args = create.mock.calls[0][0];
  expect(args.line_items).toHaveLength(1);
  expect(args.line_items[0].quantity).toBe(2);
  expect(args.line_items[0].price_data.unit_amount).toBe(1495);
  expect(args.shipping_address_collection.allowed_countries).toContain("LR");
  expect(args.allowed_payment_method_types).toEqual(["card"]);
  expect(args.payment_method_types).toBeUndefined();
  expect(args.wallet_options).toEqual({ link: { display: "never" } });
  expect(args.phone_number_collection).toEqual({ enabled: true });
  expect(args.success_url).toBe("https://shop.test/checkout/success?session_id={CHECKOUT_SESSION_ID}");
});

test("rejects an empty cart", async () => {
  const res = mockRes();
  await handler({ method: "POST", headers: {}, body: { items: [] } }, res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(create).not.toHaveBeenCalled();
});

test("falls back to Dashboard payment methods if Stripe rejects the card filter", async () => {
  const rejected = Object.assign(new Error("unknown parameter"), {
    type: "StripeInvalidRequestError",
    param: "allowed_payment_method_types",
  });
  create.mockRejectedValueOnce(rejected).mockResolvedValueOnce({ url: "https://checkout.stripe.com/fallback" });
  vi.spyOn(console, "warn").mockImplementation(() => {});

  const res = mockRes();
  await handler({ method: "POST", headers: { origin: "https://shop.test" }, body: { items: [{ id: 1, quantity: 1 }] } }, res);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith({ url: "https://checkout.stripe.com/fallback" });
  expect(create.mock.calls[1][0].allowed_payment_method_types).toBeUndefined();
  expect(create.mock.calls[1][0].wallet_options).toBeUndefined();
  expect(create.mock.calls[1][0].shipping_address_collection).toBeDefined();
});

test("other Stripe errors are not retried", async () => {
  create.mockRejectedValueOnce(Object.assign(new Error("bad key"), { type: "StripeAuthenticationError" }));
  vi.spyOn(console, "error").mockImplementation(() => {});

  const res = mockRes();
  await handler({ method: "POST", headers: {}, body: { items: [{ id: 1, quantity: 1 }] } }, res);

  expect(res.status).toHaveBeenCalledWith(500);
  expect(create).toHaveBeenCalledTimes(1);
});

test("also falls back if Stripe rejects the Link wallet setting", async () => {
  create
    .mockRejectedValueOnce(Object.assign(new Error("invalid"), {
      type: "StripeInvalidRequestError",
      param: "wallet_options[link][display]",
    }))
    .mockResolvedValueOnce({ url: "https://checkout.stripe.com/fallback" });
  vi.spyOn(console, "warn").mockImplementation(() => {});

  const res = mockRes();
  await handler({ method: "POST", headers: {}, body: { items: [{ id: 1, quantity: 1 }] } }, res);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(create).toHaveBeenCalledTimes(2);
});
