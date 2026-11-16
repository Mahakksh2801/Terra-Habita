import { describe, expect, it } from "vitest";
import { isEmailAllowed, parseAllowList } from "../access";

describe("allow list", () => {
  it("parses a comma-separated list, case-insensitively", () => {
    expect(parseAllowList(" Me@Example.com, you@example.com ,")).toEqual(["me@example.com", "you@example.com"]);
  });
  it("lets only listed emails in", () => {
    expect(isEmailAllowed("ME@example.com", "me@example.com", true)).toBe(true);
    expect(isEmailAllowed("stranger@example.com", "me@example.com", true)).toBe(false);
    expect(isEmailAllowed(null, "me@example.com", true)).toBe(false);
  });
  it("is closed in production when no list is set, open in development", () => {
    expect(isEmailAllowed("me@example.com", "", true)).toBe(false);
    expect(isEmailAllowed("me@example.com", undefined, false)).toBe(true);
  });
});
