import Stripe from "stripe";
import { books } from "../src/data.js";
import { SHIPPING_COUNTRIES } from "./_lib/orders.js";

// Vercel serverless function: POST /api/create-checkout-session
// Body: { items: [{ id, quantity }] }
// Prices are looked up on the server so a client can't change what it pays.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: "Stripe is not configured." });
  }

  const items = Array.isArray(req.body?.items) ? req.body.items : [];

  const lineItems = [];
  for (const item of items) {
    const book = books.find((b) => b.id === Number(item.id));
    const quantity = Math.min(99, Math.floor(Number(item.quantity)));
    if (!book || !(quantity > 0)) continue;

    const price = book.salePrice || book.originalPrice;
    lineItems.push({
      quantity,
      price_data: {
        currency: "usd",
        unit_amount: Math.round(price * 100),
        product_data: {
          name: book.title,
          metadata: { bookId: String(book.id) },
          ...(book.url?.startsWith("http") ? { images: [book.url] } : {}),
        },
      },
    });
  }

  if (lineItems.length === 0) {
    return res.status(400).json({ error: "Your cart is empty." });
  }

  const origin =
    req.headers.origin ||
    `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}`;

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      // Card only (Apple Pay / Google Pay still work). Leaving out "link"
      // turns off Stripe Link, which pre-fills and locks the email and
      // address fields for shoppers it recognises.
      payment_method_types: ["card"],
      shipping_address_collection: { allowed_countries: SHIPPING_COUNTRIES },
      phone_number_collection: { enabled: true },
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart`,
    });
    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return res.status(500).json({ error: "Could not start checkout." });
  }
}
