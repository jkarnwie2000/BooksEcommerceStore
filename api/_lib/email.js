import nodemailer from "nodemailer";
import { addressLines } from "./orders.js";

const STORE_NAME = "Julius Gold's Library";

// Two ways to send email, picked by which settings exist:
//  1. Gmail (or any SMTP server): SMTP_USER + SMTP_PASS. No domain needed;
//     for Gmail, SMTP_PASS is a Google "app password".
//  2. Resend (https://resend.com): RESEND_API_KEY + EMAIL_FROM on a verified domain.
function provider() {
  if (process.env.SMTP_USER && process.env.SMTP_PASS) return "smtp";
  if (process.env.RESEND_API_KEY && process.env.EMAIL_FROM) return "resend";
  return null;
}

export function emailConfigured() {
  return provider() !== null && Boolean(businessEmail());
}

export function businessEmail() {
  return process.env.BUSINESS_EMAIL || process.env.SMTP_USER || "";
}

function fromAddress() {
  return process.env.EMAIL_FROM || `"${STORE_NAME}" <${process.env.SMTP_USER}>`;
}

let transporter;
function smtpTransporter() {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 465);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

export async function sendEmail({ to, subject, html, text, replyTo, idempotencyKey }) {
  if (provider() === "smtp") {
    const mailer = smtpTransporter();
    return mailer.sendMail({ from: fromAddress(), to, subject, html, text, replyTo });
  }

  // Resend; the idempotency key stops webhook retries from sending duplicates.
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: JSON.stringify({
      from: fromAddress(),
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

// Email-safe layout: nested tables with inline styles and bgcolor attributes
// render the same in Gmail, Outlook, Apple Mail, Yahoo and mobile apps.
// Every email gets the same purple banner with the store name.
function layout(title, body, preheader = "") {
  const store = escapeHtml(STORE_NAME);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f5f5f5" style="background-color:#f5f5f5">
  <tr>
    <td align="center" style="padding:24px 12px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="max-width:560px;background-color:#ffffff;border-radius:8px;font-family:Arial,Helvetica,sans-serif;color:#242424">
        <tr>
          <td bgcolor="#7342d6" align="center" style="background-color:#7342d6;padding:28px 32px;border-radius:8px 8px 0 0">
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:32px;font-weight:bold;color:#ffffff">&#128218; ${store}</div>
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;color:#e6dcfa;padding-top:4px">Your online library</div>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;color:#242424">
            <h2 style="margin:0 0 24px;font-size:20px;line-height:26px;color:#242424">${escapeHtml(title)}</h2>
            ${body}
          </td>
        </tr>
        <tr>
          <td bgcolor="#f0ebfb" align="center" style="background-color:#f0ebfb;padding:16px 32px;border-radius:0 0 8px 8px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#6b6b6b">
            &copy; ${new Date().getFullYear()} ${store}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

// Plain-text version header, for email apps that show text instead of HTML.
function textBanner() {
  const line = "=".repeat(STORE_NAME.length);
  return `${line}
${STORE_NAME}
${line}

`;
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
     <p style="margin-top:24px">Questions about your order? Just reply to this email.</p>`,
    `Thank you for your order! Order #${order.number}: ${money(order.total)}`
  );
  const text = `${textBanner()}${greeting}

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
     <p style="margin-top:24px;color:#6b6b6b;font-size:13px">Stripe session: ${escapeHtml(order.id)}</p>`,
    `New order #${order.number}: ${money(order.total)}`
  );
  const text = `${textBanner()}New order #${order.number} (${new Date(order.created).toUTCString()})

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
