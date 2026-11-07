import React, { useCallback, useEffect, useState } from "react";

const TOKEN_KEY = "adminToken";

function readToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

function saveToken(token) {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // Storage unavailable (private mode); the session just won't persist.
  }
}

const money = (n) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

const Admin = ({ books }) => {
  const [token, setToken] = useState(readToken);
  const [password, setPassword] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadOrders = useCallback(async (authToken) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/orders", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const body = await response.json().catch(() => ({}));
      if (response.status === 401) {
        saveToken("");
        setToken("");
        throw new Error("Incorrect password.");
      }
      if (!response.ok) throw new Error(body.error || "Could not load orders.");
      saveToken(authToken);
      setToken(authToken);
      setData(body);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) loadOrders(token);
    // Run once on mount with any saved token.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleLogin(event) {
    event.preventDefault();
    if (password) loadOrders(password);
  }

  function handleLogout() {
    saveToken("");
    setToken("");
    setData(null);
    setPassword("");
  }

  if (!data) {
    return (
      <div id="books__body">
        <main id="books__main">
          <div className="books__container">
            <div className="row">
              <form className="admin__login" onSubmit={handleLogin}>
                <h2 className="cart__title">Admin login</h2>
                <label htmlFor="admin-password" className="admin__label">
                  Password
                </label>
                <input
                  id="admin-password"
                  type="password"
                  className="admin__input"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                />
                <button className="btn" type="submit" disabled={loading || !password}>
                  {loading ? "Signing in..." : "Sign in"}
                </button>
                {error && (
                  <p className="checkout__error" role="alert">{error}</p>
                )}
              </form>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const { stats, orders } = data;

  // Units sold per title, from the orders Stripe returned.
  const soldByTitle = {};
  orders.forEach((order) =>
    order.items.forEach((item) => {
      soldByTitle[item.title] = (soldByTitle[item.title] || 0) + (item.quantity || 0);
    })
  );

  return (
    <div id="books__body">
      <main id="books__main">
        <div className="books__container">
          <div className="row">
            <div className="admin__header">
              <h2 className="cart__title">Admin dashboard</h2>
              <div className="admin__actions">
                <button className="btn" onClick={() => loadOrders(token)} disabled={loading}>
                  {loading ? "Refreshing..." : "Refresh"}
                </button>
                <button className="btn admin__btn--secondary" onClick={handleLogout}>
                  Log out
                </button>
              </div>
            </div>
            {error && <p className="checkout__error" role="alert">{error}</p>}

            <div className="admin__stats">
              <div className="admin__stat">
                <span className="admin__stat--label">Revenue</span>
                <span className="admin__stat--value">{money(stats.revenue)}</span>
              </div>
              <div className="admin__stat">
                <span className="admin__stat--label">Orders</span>
                <span className="admin__stat--value">{stats.orderCount}</span>
              </div>
              <div className="admin__stat">
                <span className="admin__stat--label">Books sold</span>
                <span className="admin__stat--value">{stats.booksSold}</span>
              </div>
              <div className="admin__stat">
                <span className="admin__stat--label">Average order</span>
                <span className="admin__stat--value">{money(stats.averageOrder)}</span>
              </div>
            </div>

            <h3 className="admin__section-title">Recent orders</h3>
            {orders.length === 0 ? (
              <p className="admin__empty">No paid orders yet.</p>
            ) : (
              <div className="admin__table-wrap">
                <table className="admin__table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Customer</th>
                      <th>Items</th>
                      <th className="admin__num">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id}>
                        <td>{new Date(order.created).toLocaleString()}</td>
                        <td>{order.name || order.email || "—"}</td>
                        <td>
                          {order.items
                            .map((item) => `${item.title} × ${item.quantity}`)
                            .join(", ")}
                        </td>
                        <td className="admin__num">{money(order.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <h3 className="admin__section-title">Catalog</h3>
            <div className="admin__table-wrap">
              <table className="admin__table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th className="admin__num">Price</th>
                    <th className="admin__num">Sale price</th>
                    <th className="admin__num">Rating</th>
                    <th className="admin__num">Sold</th>
                  </tr>
                </thead>
                <tbody>
                  {books.map((book) => (
                    <tr key={book.id}>
                      <td>{book.title}</td>
                      <td className="admin__num">{money(book.originalPrice)}</td>
                      <td className="admin__num">
                        {book.salePrice ? money(book.salePrice) : "—"}
                      </td>
                      <td className="admin__num">{book.rating}</td>
                      <td className="admin__num">{soldByTitle[book.title] || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Admin;
