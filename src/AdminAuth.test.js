import { test, expect, beforeEach } from "vitest";
import { isAuthorized } from "../api/_lib/auth.js";

const basic = (value) => ({ headers: { authorization: "Basic " + Buffer.from(value).toString("base64") } });

beforeEach(() => {
  process.env.ADMIN_EMAIL = "Owner@Store.com";
  process.env.ADMIN_PASSWORD = "s3cret:pass";
});

test("accepts the right email and password (email is case-insensitive)", () => {
  expect(isAuthorized(basic("owner@store.com:s3cret:pass"))).toBe(true);
  expect(isAuthorized(basic(" OWNER@store.COM :s3cret:pass"))).toBe(true);
});

test("rejects a wrong email, wrong password, or missing credentials", () => {
  expect(isAuthorized(basic("someone@else.com:s3cret:pass"))).toBe(false);
  expect(isAuthorized(basic("owner@store.com:wrong"))).toBe(false);
  expect(isAuthorized(basic("owner@store.com:S3CRET:PASS"))).toBe(false);
  expect(isAuthorized(basic("no-separator"))).toBe(false);
  expect(isAuthorized({ headers: {} })).toBe(false);
  expect(isAuthorized({ headers: { authorization: "Bearer s3cret:pass" } })).toBe(false);
});

test("rejects everyone until ADMIN_EMAIL is set", () => {
  delete process.env.ADMIN_EMAIL;
  expect(isAuthorized(basic("owner@store.com:s3cret:pass"))).toBe(false);
  expect(isAuthorized(basic(":s3cret:pass"))).toBe(false);
});
