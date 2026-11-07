import "@testing-library/jest-dom/vitest";
import { test, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import Admin from "./pages/Admin";

const books = [
  { id: 1, title: "Deep Work", originalPrice: 44, salePrice: 19, rating: 4.5 },
  { id: 2, title: "Atomic Habits", originalPrice: 39, salePrice: null, rating: 5 },
];
const ordersResponse = {
  ok: true, status: 200,
  json: async () => ({ stats: { revenue: 0, orderCount: 0, booksSold: 0, averageOrder: 0 }, orders: [] }),
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  sessionStorage.clear();
});

async function signIn(props) {
  render(<Admin books={books} {...props} />);
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "secret" } });
  fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
  await screen.findByText("Admin dashboard");
}

test("deleting a book asks for confirmation and saves it", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(ordersResponse)
    .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ deletedIds: [1] }) });
  vi.spyOn(window, "confirm").mockReturnValue(true);
  const onDeletedIdsChange = vi.fn();

  await signIn({ deletedIds: [], onDeletedIdsChange });
  fireEvent.click(screen.getByRole("button", { name: "Delete Deep Work" }));

  await waitFor(() => expect(onDeletedIdsChange).toHaveBeenCalledWith([1]));
  const [url, options] = fetchMock.mock.calls[1];
  expect(url).toBe("/api/admin/books");
  expect(options.headers.Authorization).toBe("Bearer secret");
  expect(JSON.parse(options.body)).toEqual({ id: 1, action: "delete" });
});

test("cancelling the confirmation does not delete", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(ordersResponse);
  vi.spyOn(window, "confirm").mockReturnValue(false);

  await signIn({ deletedIds: [] });
  fireEvent.click(screen.getByRole("button", { name: "Delete Deep Work" }));

  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test("deleted books are marked and can be restored", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(ordersResponse)
    .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ deletedIds: [] }) });
  const onDeletedIdsChange = vi.fn();

  await signIn({ deletedIds: [1], onDeletedIdsChange });
  expect(screen.getByText("Deleted")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Restore Deep Work" }));

  await waitFor(() => expect(onDeletedIdsChange).toHaveBeenCalledWith([]));
  expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ id: 1, action: "restore" });
});
