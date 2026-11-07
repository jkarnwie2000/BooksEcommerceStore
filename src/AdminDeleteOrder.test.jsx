import "@testing-library/jest-dom/vitest";
import { test, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import Admin from "./pages/Admin";

const books = [{ id: 1, title: "Deep Work", originalPrice: 44, salePrice: 19, rating: 4.5 }];
const order = {
  id: "cs_test_1", created: Date.UTC(2026, 10, 7), name: "Ada", email: "ada@example.com",
  total: 38, items: [{ title: "Deep Work", quantity: 2, amount: 38 }],
};
const withOrder = {
  ok: true, status: 200,
  json: async () => ({ stats: { revenue: 38, orderCount: 1, booksSold: 2, averageOrder: 38 }, orders: [order] }),
};
const empty = {
  ok: true, status: 200,
  json: async () => ({ stats: { revenue: 0, orderCount: 0, booksSold: 0, averageOrder: 0 }, orders: [] }),
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  sessionStorage.clear();
});

async function signIn() {
  render(<Admin books={books} />);
  fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "admin@shop.test" } });
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "secret" } });
  fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
  await screen.findByText("Ada");
}

test("deleting a transaction confirms, calls the API, and refreshes the list", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(withOrder)
    .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ deleted: "cs_test_1" }) })
    .mockResolvedValueOnce(empty);
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);

  await signIn();
  fireEvent.click(screen.getByRole("button", { name: /delete transaction from ada/i }));

  expect(await screen.findByText("No paid orders yet.")).toBeInTheDocument();
  expect(confirm.mock.calls[0][0]).toMatch(/\$38\.00 transaction from Ada/);
  const [url, options] = fetchMock.mock.calls[1];
  expect(url).toBe("/api/admin/orders?id=cs_test_1");
  expect(options.method).toBe("DELETE");
  expect(options.headers.Authorization).toBe("Basic " + btoa("admin@shop.test:secret"));
});

test("cancelling the confirmation keeps the transaction", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(withOrder);
  vi.spyOn(window, "confirm").mockReturnValue(false);

  await signIn();
  fireEvent.click(screen.getByRole("button", { name: /delete transaction from ada/i }));

  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(screen.getByText("Ada")).toBeInTheDocument();
});

test("shows an error if the delete fails", async () => {
  vi.spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(withOrder)
    .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ error: "Could not delete the transaction." }) });
  vi.spyOn(window, "confirm").mockReturnValue(true);

  await signIn();
  fireEvent.click(screen.getByRole("button", { name: /delete transaction from ada/i }));

  await waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent("Could not delete the transaction.")
  );
  expect(screen.getByText("Ada")).toBeInTheDocument();
});
