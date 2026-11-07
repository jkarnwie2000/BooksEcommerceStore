import "@testing-library/jest-dom/vitest";
import { test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Home from "./pages/Home";
import { books } from "./data";

test("Browse books scrolls to the Discount Books section", () => {
  const scrollIntoView = vi.fn();
  window.HTMLElement.prototype.scrollIntoView = scrollIntoView;

  const { container } = render(<MemoryRouter><Home books={books} /></MemoryRouter>);
  fireEvent.click(screen.getByRole("link", { name: /browse books/i }));

  expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth" });
  expect(scrollIntoView.mock.contexts[0]).toBe(container.querySelector("#recent"));
});
