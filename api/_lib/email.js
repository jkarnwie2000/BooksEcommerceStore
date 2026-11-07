import { addressLines } from "./orders.js";

const STORE_NAME = "Julius Gold's Library";

export function emailConfigured() {
  return Boolean(
    process.env.RESEND_API_KEY && process.env.EMAIL_FROM && process.env.BUSINESS_EMAIL
  );
}

// Send one email through Resend (https://resend.com).
// The idempotency key stops Stripe's webhook retries from sending duplicates.
export async function sendEmail({ to, subject, html, text, replyTo, idempotencyKey }) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [to],
      subject,
      html,
      text,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Resend error ${response.status}: ${detail}`);
  }
  return response.json();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const money = (n) => `$${Number(n).toFixed(2)}`;

function itemsHtml(order) {
  const rows = order.items
    .map(
      (item) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #eee">${escapeHtml(item.title)} × ${item.quantity}</td>
          <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">${money(item.amount)}</td>
        </tr>`
    )
    .join("");
  return `
    <table style="width:100%;border-collapse:collapse;font-size:15px">
      ${rows}
      <tr>
        <td style="padding:12px 0;font-weight:bold">Total</td>
        <td style="padding:12px 0;font-weight:bold;text-align:right">${money(order.total)}</td>
      </tr>
    </table>`;
}

function addressHtml(order) {
  if (!order.shipping) return "<p>No shipping address provided.</p>";
  const lines = [order.shipping.name, ...addressLines(order.shipping.address)];
  return `<p style="line-height:1.5">${lines.map(escapeHtml).join("<br>")}</p>`;
}

function itemsText(order) {
  return order.items
    .map((item) => `- ${item.title} x ${item.quantity}: ${money(item.amount)}`)
    .join("\n");
}

function addressText(order) {
  if (!order.shipping) return "No shipping address provided.";
  return [order.shipping.name, ...addressLines(order.shipping.address)].join("\n");
}

function layout(title, body) {
  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;color:#242424">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;padding:32px">
    <h1 style="margin:0 0 4px;font-size:22px;color:#7342d6">${escapeHtml(STORE_NAME)}</h1>
    <h2 style="margin:0 0 24px;font-size:18px">${escapeHtml(title)}</h2>
    ${body}
  </div>
</body></html>`;
}

export function customerConfirmationEmail(order) {
  const greeting = order.name ? `Hi ${order.name},` : "Hi,";
  const subject = `Your ${STORE_NAME} order #${order.number} is confirmed`;
  const html = layout(
    `Order #${order.number} confirmed`,
    `<p>${escapeHtml(greeting)}</p>
     <p>Thank you for your order! We've received your payment and are getting your books ready.</p>
     <h3 style="font-size:16px;margin:24px 0 8px">Order summary</h3>
     ${itemsHtml(order)}
     <h3 style="font-size:16px;margin:24px 0 8px">Shipping to</h3>
     ${addressHtml(order)}
     <p style="margin-top:24px">Questions about your order? Just reply to this email.</p>`
  );
  const text = `${greeting}

Thank you for your order! We've received your payment and are getting your books ready.

Order #${order.number}
${itemsText(order)}
Total: ${money(order.total)}

Shipping to:
${addressText(order)}

Questions about your order? Just reply to this email.
${STORE_NAME}`;
  return { subject, html, text };
}

export function businessNotificationEmail(order) {
  const subject = `New order #${order.number}: ${money(order.total)} from ${order.name || order.email || "a customer"}`;
  const contact = [order.name, order.email, order.phone].filter(Boolean);
  const html = layout(
    `New order #${order.number}`,
    `<p>A new order has been paid on ${escapeHtml(new Date(order.created).toUTCString())}.</p>
     <h3 style="font-size:16px;margin:24px 0 8px">Customer</h3>
     <p style="line-height:1.5">${contact.map(escapeHtml).join("<br>") || "Not provided"}</p>
     <h3 style="font-size:16px;margin:24px 0 8px">Ship to</h3>
     ${addressHtml(order)}
     <h3 style="font-size:16px;margin:24px 0 8px">Items</h3>
     ${itemsHtml(order)}
     <p style="margin-top:24px;color:#6b6b6b;font-size:13px">Stripe session: ${escapeHtml(order.id)}</p>`
  );
  const text = `New order #${order.number} (${new Date(order.created).toUTCString()})

Customer:
${contact.join("\n") || "Not provided"}

Ship to:
${addressText(order)}

Items:
${itemsText(order)}
Total: ${money(order.total)}

Stripe session: ${order.id}`;
  return { subject, html, text };
}
