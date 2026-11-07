import "@testing-library/jest-dom/vitest";
import { test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Footer, { socialLinks } from "./components/Footer";

test("renders every social media link opening in a new tab", () => {
  render(<BrowserRouter><Footer /></BrowserRouter>);
  socialLinks.forEach(({ name, url }) => {
    const link = screen.getByRole("link", { name });
    expect(link).toHaveAttribute("href", url);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});
