import Stripe from "stripe";
import { isAuthorized } from "../_lib/auth.js";
import { toOrder } from "../_lib/orders.js";
import {
  readDeletedOrderIds,
  storageConfigured,
  writeDeletedOrderIds,
} from "../_lib/deleted-orders.js";

// Vercel serverless function, requires "Authorization: Bearer <ADMIN_PASSWORD>".
//   GET    /api/admin/orders          -> recent paid Stripe orders + summary stats
//   DELETE /api/admin/orders?id=cs_.. -> delete a transaction from the dashboard
//                                        (Stripe itself keeps its record)
export default async function handler(req, res) {
  if (!(await isAuthorized(req))) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method === "GET") return listOrders(req, res);
  if (req.method === "DELETE") return deleteOrder(req, res);

  res.setHeader("Allow", "GET, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
}

async function listOrders(req, res) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: "Stripe is not configured." });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const [sessions, deletedIds] = await Promise.all([
      stripe.checkout.sessions.list({
        status: "complete",
        limit: 50,
        expand: ["data.line_items"],
      }),
      readDeletedOrderIds(),
    ]);

    const orders = sessions.data
      .filter((s) => s.payment_status === "paid" && !deletedIds.includes(s.id))
      .map(toOrder);

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

async function deleteOrder(req, res) {
  const id = String(req.query?.id || "");
  if (!/^cs_[A-Za-z0-9_]+$/.test(id)) {
    return res.status(400).json({ error: "A valid transaction id is required." });
  }

  if (!storageConfigured()) {
    return res.status(500).json({ error: "Transaction storage is not configured." });
  }

  try {
    const current = await readDeletedOrderIds();
    await writeDeletedOrderIds([...current, id]);
    return res.status(200).json({ deleted: id });
  } catch (err) {
    console.error("Delete transaction error:", err);
    return res.status(500).json({ error: "Could not delete the transaction." });
  }
}
