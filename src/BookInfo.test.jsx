import "@testing-library/jest-dom/vitest";
import { test, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

afterEach(cleanup);
import { MemoryRouter, Routes, Route } from "react-router-dom";
import BookInfo from "./pages/BookInfo";

const mockBooks = [
  {
    id: 1,
    title: "Test Book",
    rating: 4,
    originalPrice: 20,
    salePrice: 15,
    url: "test-image.jpg",
  },
];

test("renders the selected book information", () => {
  render(
    <MemoryRouter initialEntries={["/books/1"]}>
      <Routes>
        <Route
          path="/books/:id"
          element={
            <BookInfo
              books={mockBooks}
              cart={[]}
              addToCart={vi.fn()}
            />
          }
        />
      </Routes>
    </MemoryRouter>
  );

  expect(screen.getByText("Test Book")).toBeInTheDocument();
});



test("after adding a book, offers to continue shopping or view the cart", () => {
  render(
    <MemoryRouter initialEntries={["/books/1"]}>
      <Routes>
        <Route
          path="/books/:id"
          element={
            <BookInfo
              books={mockBooks}
              cart={[{ ...mockBooks[0], quantity: 1 }]}
              addToCart={vi.fn()}
            />
          }
        />
      </Routes>
    </MemoryRouter>
  );

  expect(screen.getByText(/in your cart/i)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /continue shopping/i })).toHaveAttribute("href", "/books");
  expect(screen.getByRole("link", { name: /view cart/i })).toHaveAttribute("href", "/cart");
});

test("clicking Add to cart adds the book without leaving the page", () => {
  const addToCart = vi.fn();
  render(
    <MemoryRouter initialEntries={["/books/1"]}>
      <Routes>
        <Route
          path="/books/:id"
          element={<BookInfo books={mockBooks} cart={[]} addToCart={addToCart} />}
        />
      </Routes>
    </MemoryRouter>
  );

  fireEvent.click(screen.getByRole("button", { name: /add to cart/i }));
  expect(addToCart).toHaveBeenCalledWith(mockBooks[0]);
  expect(screen.getByText("Test Book")).toBeInTheDocument();
});
