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

const sendMail = vi.fn();
const createTransport = vi.fn(() => ({ sendMail }));
vi.mock("nodemailer", () => ({ default: { createTransport: (...a) => createTransport(...a) } }));

const sentMarkers = new Set();
vi.mock("@vercel/blob", async (importOriginal) => {
  const { BlobNotFoundError } = await importOriginal();
  return {
  BlobNotFoundError,
  head: vi.fn(async (path) => {
    if (sentMarkers.has(path)) return {};
    throw new BlobNotFoundError(); // what the real SDK throws (its name is "Error")
  }),
  put: vi.fn(async (path) => { sentMarkers.add(path); return {}; }),
  };
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
  for (const k of ["SMTP_USER", "SMTP_PASS", "BLOB_READ_WRITE_TOKEN", "EMAIL_FROM", "BUSINESS_EMAIL"]) delete process.env[k];
  sentMarkers.clear();
  sendMail.mockReset().mockResolvedValue({ messageId: "m1" });
  createTransport.mockClear();
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

function useGmail() {
  delete process.env.RESEND_API_KEY;
  delete process.env.EMAIL_FROM;
  delete process.env.BUSINESS_EMAIL;
  process.env.SMTP_USER = "store@gmail.com";
  process.env.SMTP_PASS = "app-password";
  process.env.BLOB_READ_WRITE_TOKEN = "token";
}

test("with Gmail settings, sends both emails through Gmail SMTP", async () => {
  useGmail();
  const res = await POST(signedRequest(paidEvent));
  expect(res.status).toBe(200);
  expect(fetchMock).not.toHaveBeenCalled();

  expect(createTransport).toHaveBeenCalledWith(expect.objectContaining({
    host: "smtp.gmail.com", port: 465, secure: true,
    auth: { user: "store@gmail.com", pass: "app-password" },
  }));
  const mails = sendMail.mock.calls.map((c) => c[0]);
  expect(mails.map((m) => m.to).sort()).toEqual(["ada@example.com", "store@gmail.com"]);
  mails.forEach((m) => expect(m.from).toBe(`"Julius Gold's Library" <store@gmail.com>`));
  const customer = mails.find((m) => m.to === "ada@example.com");
  expect(customer.replyTo).toBe("store@gmail.com");
  expect(customer.subject).toMatch(/is confirmed/);
});

test("Stripe retries never send the same email twice", async () => {
  useGmail();
  // First attempt: business email fails, customer email succeeds.
  sendMail.mockImplementation(async (m) => {
    if (m.to === "store@gmail.com") throw new Error("SMTP down");
    return {};
  });
  let res = await POST(signedRequest(paidEvent));
  expect(res.status).toBe(500);

  // Retry: only the business email is sent.
  sendMail.mockReset().mockResolvedValue({});
  res = await POST(signedRequest(paidEvent));
  expect(res.status).toBe(200);
  expect(sendMail.mock.calls.map((c) => c[0].to)).toEqual(["store@gmail.com"]);

  // A further retry sends nothing.
  sendMail.mockClear();
  await POST(signedRequest(paidEvent));
  expect(sendMail).not.toHaveBeenCalled();
});

test("both emails carry the store-name banner, in HTML and plain text", async () => {
  await POST(signedRequest(paidEvent));
  const emails = sentEmails();
  expect(emails).toHaveLength(2);
  for (const { body } of emails) {
    expect(body.html).toContain('bgcolor="#7342d6"');
    expect(body.html).toMatch(/<td bgcolor="#7342d6"[\s\S]*Julius Gold&#39;s Library/);
    expect(body.text.startsWith("=====================\nJulius Gold's Library\n")).toBe(true);
  }
});
