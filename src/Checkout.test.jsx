import "@testing-library/jest-dom/vitest";
import { test, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Cart from "./pages/Cart";

const cart = [
  { id: 1, title: "Test Book", originalPrice: 20, salePrice: 15, url: "x.jpg", quantity: 2 },
];

afterEach(() => vi.restoreAllMocks());

test("checkout sends book ids and quantities, then redirects to Stripe", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    json: async () => ({ url: "https://checkout.stripe.com/test" }),
  });
  const assign = vi.fn();
  vi.spyOn(window, "location", "get").mockReturnValue({ ...window.location, assign });

  render(<MemoryRouter><Cart cart={cart} changeQuantity={vi.fn()} removeItem={vi.fn()} /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: /proceed to checkout/i }));

  await waitFor(() => expect(assign).toHaveBeenCalledWith("https://checkout.stripe.com/test"));
  const [url, options] = fetchMock.mock.calls[0];
  expect(url).toBe("/api/create-checkout-session");
  expect(JSON.parse(options.body)).toEqual({ items: [{ id: 1, quantity: 2 }] });
});

test("checkout shows an error when the server fails", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: false,
    json: async () => ({ error: "Stripe is not configured." }),
  });

  render(<MemoryRouter><Cart cart={cart} changeQuantity={vi.fn()} removeItem={vi.fn()} /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: /proceed to checkout/i }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Stripe is not configured.");
});
