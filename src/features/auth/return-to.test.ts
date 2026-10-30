import { describe, expect, it } from "vitest";
import { safeReturnTo } from "./return-to";

describe("safeReturnTo", () => {
  it("keeps a consent URL with its request", () => {
    expect(safeReturnTo("/oauth/consent?authorization_id=abc")).toBe("/oauth/consent?authorization_id=abc");
  });

  it("ignores everything else, so the cookie is never an open redirect", () => {
    for (const value of [undefined, "", "/", "/d/some-doc", "//evil.example/oauth/consent", "https://evil.example/oauth/consent", "/oauth/consent-evil", "/oauth/consentx?a=1"]) {
      expect(safeReturnTo(value)).toBeNull();
    }
  });
});
