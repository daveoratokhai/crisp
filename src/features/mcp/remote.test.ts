import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleMcp, protectedResourceMetadata } from "./remote";

const SUPABASE_URL = "https://example-ref.supabase.co";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const post = (headers: Record<string, string> = {}) =>
  new Request("https://crisp.test/mcp", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
  });

describe("protectedResourceMetadata", () => {
  it("names this endpoint and points at the project's Auth server", async () => {
    const body = await protectedResourceMetadata(new Request("https://crisp.test/.well-known/oauth-protected-resource")).json();
    expect(body.resource).toBe("https://crisp.test/mcp");
    expect(body.authorization_servers).toEqual([`${SUPABASE_URL}/auth/v1`]);
  });

  it("says so when the database is not configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    expect(protectedResourceMetadata(new Request("https://crisp.test/x")).status).toBe(503);
  });
});

describe("handleMcp", () => {
  it("answers a request with no token with a pointer to the sign-in metadata", async () => {
    const res = await handleMcp(post());
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toBe('Bearer resource_metadata="https://crisp.test/.well-known/oauth-protected-resource"');
  });

  it("rejects anything but POST without touching the database", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const res = await handleMcp(new Request("https://crisp.test/mcp", { method: "GET" }));
    expect(res.status).toBe(405);
    expect(res.headers.get("allow")).toBe("POST");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects a token the Auth server does not recognise", async () => {
    vi.stubGlobal("fetch", async () => Response.json({ msg: "invalid JWT" }, { status: 401 }));
    const res = await handleMcp(post({ authorization: "Bearer forged" }));
    expect(res.status).toBe(401);
  });

  it("rejects a signed-in account that is not on the team", async () => {
    vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/auth/v1/user")) return Response.json({ id: "u1", email: "stranger@example.com", aud: "authenticated" });
      // team_members: row-level security returns nothing to a non-member.
      return Response.json([], { status: 200 });
    });
    const res = await handleMcp(post({ authorization: "Bearer valid-but-not-a-member" }));
    expect(res.status).toBe(403);
  });

  it("refuses when the database is not configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    expect((await handleMcp(post({ authorization: "Bearer x" }))).status).toBe(503);
  });
});
