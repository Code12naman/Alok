import assert from "node:assert/strict";
import test from "node:test";
import { resolveTheme } from "../src/lib/theme.ts";

test("saved theme preference takes precedence over the system preference", () => {
  assert.equal(resolveTheme("dark", false), "dark");
  assert.equal(resolveTheme("light", true), "light");
});

test("first-time visitors inherit the system theme", () => {
  assert.equal(resolveTheme(null, true), "dark");
  assert.equal(resolveTheme(null, false), "light");
  assert.equal(resolveTheme("unexpected", true), "dark");
});
