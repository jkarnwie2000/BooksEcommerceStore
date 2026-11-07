import { test, expect, vi, beforeEach, afterEach } from "vitest";
import RealStripe from "stripe";

const retrieve = vi.fn();
vi.mock("stripe", async (importOriginal) => {
  const { default: Original } = await importOriginal();
  class MockStripe extends Original {
    constructor(key) {
      super(key);
      this.checkout = { sessions: { retrieve } };
    }
  }
  return { default: MockStripe };
});

const { POST } = await import("../api/stripe-webhook.js");

const SECRET = "whsec_test_secret";
const session = {
  id: "cs_test_abc12345",
  object: "checkout.session",
  created: 1794000000,
  payment_status: "paid",
  amount_total: 3800,
  currency: "usd",
  customer_details: { email: "ada@example.com", name: "Ada Lovelace", phone: "+231770000000" },
  collected_information: {
    shipping_details: {
      name: "Ada <Lovelace>",
      address: { line1: "12 Broad St", line2: null, city: "Monrovia", state: "Montserrado", postal_code: "1000", country: "LR" },
    },
  },
  line_items: { data: [{ description: "Deep Work", quantity: 2, amount_total: 3800 }] },
};

function signedRequest(event, secret = SECRET) {
  const payload = JSON.stringify(event);
  const header = new RealStripe("sk_test").webhooks.generateTestHeaderString({ payload, secret });
  return new Request("https://shop.test/api/stripe-webhook", {
    method: "POST",
    headers: { "stripe-signature": header, "content-type": "application/json" },
    body: payload,
  });
}

const paidEvent = { id: "evt_1", type: "checkout.session.completed", data: { object: { id: session.id, payment_status: "paid" } } };
let fetchMock;

beforeEach(() => {
  Object.assign(process.env, {
    STRIPE_SECRET_KEY: "sk_test",
    STRIPE_WEBHOOK_SECRET: SECRET,
    RESEND_API_KEY: "re_test",
    EMAIL_FROM: "Library <orders@shop.test>",
    BUSINESS_EMAIL: "owner@shop.test",
  });
  retrieve.mockReset().mockResolvedValue(session);
  fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(
    async () => new Response(JSON.stringify({ id: "email_1" }), { status: 200 })
  );
});
afterEach(() => vi.restoreAllMocks());

const sentEmails = () =>
  fetchMock.mock.calls.map(([url, opts]) => ({ url, headers: opts.headers, body: JSON.parse(opts.body) }));

test("a paid checkout emails the customer and the business", async () => {
  const res = await POST(signedRequest(paidEvent));
  expect(res.status).toBe(200);
  expect(retrieve).toHaveBeenCalledWith(session.id, { expand: ["line_items"] });

  const emails = sentEmails();
  expect(emails).toHaveLength(2);
  emails.forEach((e) => expect(e.url).toBe("https://api.resend.com/emails"));

  const customer = emails.find((e) => e.body.to[0] === "ada@example.com");
  expect(customer.body.from).toBe("Library <orders@shop.test>");
  expect(customer.body.reply_to).toBe("owner@shop.test");
  expect(customer.body.subject).toMatch(/order #ABC12345 is confirmed/);
  expect(customer.body.text).toContain("12 Broad St");
  expect(customer.body.text).toContain("Monrovia, Montserrado, 1000");
  expect(customer.body.text).toContain("Deep Work x 2: $38.00");
  expect(customer.headers["Idempotency-Key"]).toBe(`order-customer/${session.id}`);

  const business = emails.find((e) => e.body.to[0] === "owner@shop.test");
  expect(business.body.subject).toContain("New order #ABC12345: $38.00");
  expect(business.body.reply_to).toBe("ada@example.com");
  expect(business.body.text).toContain("+231770000000");
  expect(business.headers["Idempotency-Key"]).toBe(`order-business/${session.id}`);
});

test("customer-supplied text is HTML-escaped in emails", async () => {
  await POST(signedRequest(paidEvent));
  const html = sentEmails()[0].body.html;
  expect(html).toContain("Ada &lt;Lovelace&gt;");
  expect(html).not.toContain("Ada <Lovelace>");
});

test("rejects a request with a bad signature", async () => {
  const res = await POST(signedRequest(paidEvent, "whsec_wrong"));
  expect(res.status).toBe(400);
  expect(fetchMock).not.toHaveBeenCalled();
});

test("ignores unpaid sessions and other events", async () => {
  let res = await POST(signedRequest({ ...paidEvent, data: { object: { id: session.id, payment_status: "unpaid" } } }));
  expect(res.status).toBe(200);
  res = await POST(signedRequest({ ...paidEvent, type: "customer.created" }));
  expect(res.status).toBe(200);
  expect(fetchMock).not.toHaveBeenCalled();
});

test("returns 500 so Stripe retries when an email fails", async () => {
  fetchMock.mockResolvedValueOnce(new Response("bad", { status: 500 }));
  const res = await POST(signedRequest(paidEvent));
  expect(res.status).toBe(500);
});
