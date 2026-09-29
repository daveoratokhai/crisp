import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const state = { configured: true, user: null as { id: string } | null, member: false };

vi.mock("@/lib/supabase/server", () => ({
  hasSupabase: () => state.configured,
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: state.member ? { user_id: state.user?.id } : null, error: null }) }),
      }),
    }),
  }),
}));

const { requireMember, UnauthorizedError } = await import("./guard");

describe("requireMember", () => {
  beforeEach(() => Object.assign(state, { configured: true, user: null, member: false }));

  it("refuses a signed-out request", async () => {
    await expect(requireMember()).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("refuses a signed-in user who is not on the team", async () => {
    state.user = { id: "u1" };
    await expect(requireMember()).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("allows a team member", async () => {
    state.user = { id: "u1" };
    state.member = true;
    await expect(requireMember()).resolves.toEqual({ userId: "u1" });
  });

  it("allows writes in local-only mode, when no sign-in is configured", async () => {
    state.configured = false;
    await expect(requireMember()).resolves.toEqual({ userId: null });
  });
});
