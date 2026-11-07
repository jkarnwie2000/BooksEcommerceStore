import { test, expect, beforeEach, vi } from "vitest";

vi.mock("@vercel/blob", async (importOriginal) => {
  const { BlobNotFoundError } = await importOriginal();
  return { BlobNotFoundError, get: vi.fn(async () => null), put: vi.fn(), del: vi.fn() };
});
import { isAuthorized } from "../api/_lib/auth.js";

const basic = (value) => ({ headers: { authorization: "Basic " + Buffer.from(value).toString("base64") } });

beforeEach(() => {
  process.env.ADMIN_EMAIL = "Owner@Store.com";
  process.env.ADMIN_PASSWORD = "s3cret:pass";
});

test("accepts the right email and password (email is case-insensitive)", async () => {
  expect(await isAuthorized(basic("owner@store.com:s3cret:pass"))).toBe(true);
  expect(await isAuthorized(basic(" OWNER@store.COM :s3cret:pass"))).toBe(true);
});

test("rejects a wrong email, wrong password, or missing credentials", async () => {
  expect(await isAuthorized(basic("someone@else.com:s3cret:pass"))).toBe(false);
  expect(await isAuthorized(basic("owner@store.com:wrong"))).toBe(false);
  expect(await isAuthorized(basic("owner@store.com:S3CRET:PASS"))).toBe(false);
  expect(await isAuthorized(basic("no-separator"))).toBe(false);
  expect(await isAuthorized({ headers: {} })).toBe(false);
  expect(await isAuthorized({ headers: { authorization: "Bearer s3cret:pass" } })).toBe(false);
});

test("rejects everyone until ADMIN_EMAIL is set", async () => {
  delete process.env.ADMIN_EMAIL;
  expect(await isAuthorized(basic("owner@store.com:s3cret:pass"))).toBe(false);
  expect(await isAuthorized(basic(":s3cret:pass"))).toBe(false);
});
