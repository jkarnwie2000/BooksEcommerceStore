import Stripe from "stripe";
import { timingSafeEqual } from "crypto";

// Vercel serverless function: GET /api/admin/orders
// Requires header "Authorization: Bearer <ADMIN_PASSWORD>".
// Returns recent completed Stripe Checkout orders plus summary stats.

function isAuthorized(req) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const header = req.headers.authorization || "";
  const given = header.startsWith("Bearer ") ? header.slice(7) : "";
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: "Stripe is not configured." });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const sessions = await stripe.checkout.sessions.list({
      status: "complete",
      limit: 50,
      expand: ["data.line_items"],
    });

    const orders = sessions.data
      .filter((s) => s.payment_status === "paid")
      .map((s) => ({
        id: s.id,
        created: s.created * 1000,
        email: s.customer_details?.email || null,
        name: s.customer_details?.name || null,
        total: (s.amount_total || 0) / 100,
        currency: s.currency,
        items: (s.line_items?.data || []).map((li) => ({
          title: li.description,
          quantity: li.quantity,
          amount: (li.amount_total || 0) / 100,
        })),
      }));

    const revenue = orders.reduce((sum, o) => sum + o.total, 0);
    const booksSold = orders.reduce(
      (sum, o) => sum + o.items.reduce((n, i) => n + (i.quantity || 0), 0),
      0
    );

    return res.status(200).json({
      orders,
      stats: {
        revenue,
        orderCount: orders.length,
        booksSold,
        averageOrder: orders.length ? revenue / orders.length : 0,
      },
    });
  } catch (err) {
    console.error("Stripe admin error:", err);
    return res.status(500).json({ error: "Could not load orders." });
  }
}
