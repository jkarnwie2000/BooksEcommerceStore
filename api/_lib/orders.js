// Countries shoppers can ship to at checkout (two-letter ISO codes).
// Stripe requires an explicit list; add or remove countries as needed.
export const SHIPPING_COUNTRIES = [
  "LR", // Liberia
  "US", "CA", "GB",
  "GH", "NG", "SL", "GN", "CI",
];

// Turn a Stripe Checkout Session (with line_items expanded) into a plain order.
export function toOrder(session) {
  const shipping =
    session.collected_information?.shipping_details ||
    session.shipping_details || // older Stripe API versions
    null;

  return {
    id: session.id,
    number: orderNumber(session.id),
    created: session.created * 1000,
    email: session.customer_details?.email || null,
    name: shipping?.name || session.customer_details?.name || null,
    phone: session.customer_details?.phone || null,
    total: (session.amount_total || 0) / 100,
    currency: session.currency,
    shipping: shipping?.address
      ? { name: shipping.name || null, address: { ...shipping.address } }
      : null,
    items: (session.line_items?.data || []).map((li) => ({
      title: li.description,
      quantity: li.quantity,
      amount: (li.amount_total || 0) / 100,
    })),
  };
}

// Short, human-friendly reference derived from the Stripe session id.
export function orderNumber(sessionId) {
  return String(sessionId).slice(-8).toUpperCase();
}

// Address as display lines, skipping empty parts.
export function addressLines(address) {
  if (!address) return [];
  const cityLine = [address.city, address.state, address.postal_code]
    .filter(Boolean)
    .join(", ");
  return [address.line1, address.line2, cityLine, address.country].filter(Boolean);
}
