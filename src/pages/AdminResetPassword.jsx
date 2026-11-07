import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

const MIN_PASSWORD_LENGTH = 8;

// Opened from the link in the password reset email.
const AdminResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Your new password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Could not reset the password.");
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div id="books__body">
      <main id="books__main">
        <div className="books__container">
          <div className="row">
            {done ? (
              <div className="admin__login">
                <h2 className="cart__title">Password reset</h2>
                <p className="admin__success" role="status">
                  Your password has been reset. You can sign in with it now.
                </p>
                <Link to="/admin" className="btn">Go to admin login</Link>
              </div>
            ) : !token ? (
              <div className="admin__login">
                <h2 className="cart__title">Reset your password</h2>
                <p className="checkout__error" role="alert">
                  This reset link is incomplete. Please use the link from your email, or request a new one.
                </p>
                <Link to="/admin" className="btn">Go to admin login</Link>
              </div>
            ) : (
              <form className="admin__login" onSubmit={handleSubmit}>
                <h2 className="cart__title">Choose a new password</h2>
                <label htmlFor="new-password" className="admin__label">
                  New password
                </label>
                <input
                  id="new-password"
                  type="password"
                  className="admin__input"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={MIN_PASSWORD_LENGTH}
                  required
                />
                <label htmlFor="confirm-password" className="admin__label">
                  Confirm new password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  className="admin__input"
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  autoComplete="new-password"
                  required
                />
                <p className="admin__muted">At least {MIN_PASSWORD_LENGTH} characters.</p>
                <button className="btn" type="submit" disabled={saving || !password || !confirm}>
                  {saving ? "Saving..." : "Reset password"}
                </button>
                {error && <p className="checkout__error" role="alert">{error}</p>}
                {error && (
                  <Link to="/admin" className="admin__text-btn">Request a new reset link</Link>
                )}
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminResetPassword;
