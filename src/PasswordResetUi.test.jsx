import "@testing-library/jest-dom/vitest";
import { test, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Admin from "./pages/Admin";
import AdminResetPassword from "./pages/AdminResetPassword";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  sessionStorage.clear();
});

test("Forgot your password? sends a reset link for the entered email", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ message: "If that email matches the admin account, a reset link is on its way." }),
  });
  render(
    <MemoryRouter>
      <Admin books={[]} />
    </MemoryRouter>
  );

  fireEvent.click(screen.getByRole("button", { name: /forgot your password/i }));
  fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "owner@store.com" } });
  fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));

  expect(await screen.findByRole("status")).toHaveTextContent(/reset link is on its way/);
  expect(fetchMock.mock.calls[0][0]).toBe("/api/admin/forgot-password");
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ email: "owner@store.com" });

  fireEvent.click(screen.getByRole("button", { name: /back to sign in/i }));
  expect(screen.getByRole("button", { name: /^sign in$/i })).toBeInTheDocument();
});

function renderReset(url) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/admin/reset-password" element={<AdminResetPassword />} />
      </Routes>
    </MemoryRouter>
  );
}

test("reset page sets the new password with the token from the link", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ message: "ok" }),
  });
  renderReset("/admin/reset-password?token=abc123");

  fireEvent.change(screen.getByLabelText(/^new password/i), { target: { value: "brand-new-pass" } });
  fireEvent.change(screen.getByLabelText(/confirm new password/i), { target: { value: "brand-new-pass" } });
  fireEvent.click(screen.getByRole("button", { name: /reset password/i }));

  expect(await screen.findByRole("status")).toHaveTextContent(/password has been reset/i);
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
    token: "abc123",
    password: "brand-new-pass",
  });
});

test("reset page catches mismatched passwords before sending", () => {
  const fetchMock = vi.spyOn(globalThis, "fetch");
  renderReset("/admin/reset-password?token=abc123");

  fireEvent.change(screen.getByLabelText(/^new password/i), { target: { value: "brand-new-pass" } });
  fireEvent.change(screen.getByLabelText(/confirm new password/i), { target: { value: "different-pass" } });
  fireEvent.click(screen.getByRole("button", { name: /reset password/i }));

  expect(screen.getByRole("alert")).toHaveTextContent(/don't match/);
  expect(fetchMock).not.toHaveBeenCalled();
});

test("reset page without a token explains the link is incomplete", () => {
  renderReset("/admin/reset-password");
  expect(screen.getByRole("alert")).toHaveTextContent(/link is incomplete/);
});
