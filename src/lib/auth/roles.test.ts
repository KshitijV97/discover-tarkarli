import { describe, expect, it } from "vitest";
import { isStaff, roleForEmail, safeCallbackUrl } from "./roles";

describe("roleForEmail", () => {
  const env = { ADMIN_EMAILS: " Owner@Example.com ,ops@example.com", STAFF_EMAILS: "kitchen@example.com" };
  it("maps allow-listed emails case-insensitively", () => {
    expect(roleForEmail("owner@example.com", env)).toBe("admin");
    expect(roleForEmail("OPS@example.com", env)).toBe("admin");
    expect(roleForEmail("kitchen@example.com", env)).toBe("staff");
  });
  it("defaults to guest", () => {
    expect(roleForEmail("someone@gmail.com", env)).toBe("guest");
    expect(roleForEmail(null, env)).toBe("guest");
    expect(roleForEmail("x@y.z", {})).toBe("guest");
  });
  it("isStaff", () => {
    expect(isStaff("admin")).toBe(true);
    expect(isStaff("staff")).toBe(true);
    expect(isStaff("guest")).toBe(false);
  });
});

describe("safeCallbackUrl", () => {
  it("allows relative paths only", () => {
    expect(safeCallbackUrl("/book?x=1")).toBe("/book?x=1");
    expect(safeCallbackUrl("https://evil.com")).toBe("/account");
    expect(safeCallbackUrl("//evil.com")).toBe("/account");
    expect(safeCallbackUrl("/\\evil.com")).toBe("/account");
    expect(safeCallbackUrl(undefined, "/")).toBe("/");
  });
});
