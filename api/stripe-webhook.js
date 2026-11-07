import Stripe from "stripe";
import { toOrder } from "./_lib/orders.js";
import {
  businessNotificationEmail,
  customerConfirmationEmail,
  emailConfigured,
  sendEmail,
} from "./_lib/email.js";

// Stripe webhook: POST /api/stripe-webhook
// On a paid checkout, emails the customer a confirmation and notifies the
// business. Uses the Web Request handler so the raw body is available for
// Stripe's signature check.
export async function POST(request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey || !webhookSecret) {
    return Response.json({ error: "Webhook is not configured." }, { status: 500 });
  }

  const stripe = new Stripe(secretKey);
  const payload = await request.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      payload,
      request.headers.get("stripe-signature") || "",
      webhookSecret
    );
  } catch (err) {
    return Response.json({ error: "Invalid signature." }, { status: 400 });
  }

  const paidEvents = [
    "checkout.session.completed",
    "checkout.session.async_payment_succeeded",
  ];
  if (!paidEvents.includes(event.type) || event.data.object.payment_status !== "paid") {
    return Response.json({ received: true });
  }

  if (!emailConfigured()) {
    console.error("Order emails skipped: RESEND_API_KEY, EMAIL_FROM or BUSINESS_EMAIL missing.");
    return Response.json({ received: true, emailed: false });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(event.data.object.id, {
      expand: ["line_items"],
    });
    const order = toOrder(session);
    const sends = [];

    if (order.email) {
      sends.push(
        sendEmail({
          to: order.email,
          replyTo: process.env.BUSINESS_EMAIL,
          idempotencyKey: `order-customer/${order.id}`,
          ...customerConfirmationEmail(order),
        })
      );
    }
    sends.push(
      sendEmail({
        to: process.env.BUSINESS_EMAIL,
        replyTo: order.email || undefined,
        idempotencyKey: `order-business/${order.id}`,
        ...businessNotificationEmail(order),
      })
    );

    const results = await Promise.allSettled(sends);
    const failed = results.filter((r) => r.status === "rejected");
    if (failed.length) {
      failed.forEach((r) => console.error("Order email failed:", r.reason));
      // A non-2xx makes Stripe retry; idempotency keys prevent duplicate sends.
      return Response.json({ error: "Some emails failed." }, { status: 500 });
    }
    return Response.json({ received: true, emailed: true });
  } catch (err) {
    console.error("Webhook processing error:", err);
    return Response.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
