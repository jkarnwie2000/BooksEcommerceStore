import "@testing-library/jest-dom/vitest";
import { test, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Footer from "./components/Footer";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

test("About links to the home page and scrolls to the top", () => {
  const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  render(
    <MemoryRouter initialEntries={["/books"]}>
      <Routes>
        <Route path="/" element={<p>Home page</p>} />
        <Route path="/books" element={<p>Books page</p>} />
      </Routes>
      <Footer />
    </MemoryRouter>
  );

  const about = screen.getByRole("link", { name: "About" });
  expect(about).toHaveAttribute("href", "/");
  fireEvent.click(about);

  expect(screen.getByText("Home page")).toBeInTheDocument();
  expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
});

test.each([
  ["Home", "/", "Home page", "/books"],
  ["Cart", "/cart", "Cart page", "/books"],
  ["Home", "/", "Home page", "/"],
  ["Cart", "/cart", "Cart page", "/cart"],
])("%s link opens %s and scrolls to the top (starting on %s)", (name, href, pageText, start) => {
  const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  render(
    <MemoryRouter initialEntries={[start]}>
      <Routes>
        <Route path="/" element={<p>Home page</p>} />
        <Route path="/books" element={<p>Books page</p>} />
        <Route path="/cart" element={<p>Cart page</p>} />
      </Routes>
      <Footer />
    </MemoryRouter>
  );

  const link = screen.getByRole("link", { name });
  expect(link).toHaveAttribute("href", href);
  fireEvent.click(link);

  expect(screen.getByText(pageText)).toBeInTheDocument();
  expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
});
