import "@testing-library/jest-dom/vitest";
import { test, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Admin from "./pages/Admin";

const books = [{ id: 1, title: "Deep Work", originalPrice: 44, salePrice: 19, rating: 4.5 }];

afterEach(() => {
  vi.restoreAllMocks();
  sessionStorage.clear();
});

test("shows stats and orders after signing in", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({
      stats: { revenue: 38, orderCount: 1, booksSold: 2, averageOrder: 38 },
      orders: [{
        id: "cs_1", created: Date.now(), name: "Ada", email: "ada@example.com",
        total: 38, items: [{ title: "Deep Work", quantity: 2, amount: 38 }],
      }],
    }),
  });

  render(<Admin books={books} />);
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "secret" } });
  fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

  expect(await screen.findByText("Admin dashboard")).toBeInTheDocument();
  expect(screen.getByText("Ada")).toBeInTheDocument();
  expect(screen.getAllByText("$38.00").length).toBeGreaterThan(0);
  expect(globalThis.fetch.mock.calls[0][1].headers.Authorization).toBe("Bearer secret");
});

test("shows an error for a wrong password", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: false,
    status: 401,
    json: async () => ({ error: "Unauthorized" }),
  });

  render(<Admin books={books} />);
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "wrong" } });
  fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Incorrect password.");
});
