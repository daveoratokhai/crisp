/**
 * Sign the Crisp MCP server in, as you, so agents can read the team's
 * published documents.
 *
 *   npm run mcp:login     opens Google in your browser, keeps the session
 *   npm run mcp:logout    deletes it
 *
 * Needs, once, in Supabase → Authentication → URL Configuration → Redirect URLs:
 *   http://localhost:54390/callback
 *
 * Only a team member's session is kept: after sign-in it checks team_members,
 * and signs straight back out if you are not on the team.
 */
import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import http from "node:http";
import { agentClient, SESSION_FILE, supabaseEnv } from "./session";

const PORT = 54390;
const REDIRECT = `http://localhost:${PORT}/callback`;
const TIMEOUT = 5 * 60 * 1000;

async function logout() {
  await fs.rm(SESSION_FILE, { force: true });
  console.log("Signed the Crisp MCP server out. Agents now see local documents only.");
}

async function login() {
  const env = supabaseEnv();
  if (!env) throw new Error("No Supabase keys found in crisp/.env.local.");
  const supabase = agentClient(env);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: REDIRECT, skipBrowserRedirect: true, queryParams: { hd: "evercrisp.ai" } },
  });
  if (error || !data.url) throw new Error(`Could not start sign-in: ${error?.message ?? "no URL returned"}`);

  const done = new Promise<string>((resolve, reject) => {
    const page = (res: http.ServerResponse, status: number, text: string) => {
      res.writeHead(status, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`<!doctype html><title>Crisp</title><body style="font-family:system-ui;padding:3rem;background:#191919;color:#f0efed"><p>${text}</p></body>`);
    };

    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url ?? "/", REDIRECT);
      if (url.pathname !== "/callback") return page(res, 404, "Not found.");
      const code = url.searchParams.get("code");
      if (!code) {
        page(res, 400, "Sign-in did not complete. You can close this tab.");
        server.close();
        return reject(new Error(url.searchParams.get("error_description") ?? "No code in the callback"));
      }
      const { data: exchanged, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError || !exchanged.user) {
        page(res, 400, "Sign-in failed. You can close this tab.");
        server.close();
        return reject(new Error(exchangeError?.message ?? "No user after sign-in"));
      }

      // Same rule as the app: only team members get to keep a session.
      const { data: member } = await supabase.from("team_members").select("user_id").eq("user_id", exchanged.user.id).maybeSingle();
      if (!member) {
        await supabase.auth.signOut();
        await fs.rm(SESSION_FILE, { force: true });
        page(res, 403, `${exchanged.user.email} is not on the Crisp team. You can close this tab.`);
        server.close();
        return reject(new Error(`${exchanged.user.email} is not in team_members`));
      }

      page(res, 200, "Crisp agents are signed in. You can close this tab.");
      server.close();
      resolve(exchanged.user.email ?? exchanged.user.id);
    });

    server.on("error", reject);
    server.listen(PORT, "127.0.0.1", () => {
      console.log("Opening Google sign-in in your browser. If it does not open, visit:\n" + data.url);
      execFile("open", [data.url], () => {});
    });
    setTimeout(() => {
      server.close();
      reject(new Error("Timed out waiting for sign-in"));
    }, TIMEOUT).unref();
  });

  const who = await done;
  console.log(`Signed the Crisp MCP server in as ${who}. Session saved to ${SESSION_FILE} (readable only by you).`);
}

const run = process.argv.includes("--logout") ? logout : login;
run().catch((err) => {
  console.error("crisp mcp:login:", err instanceof Error ? err.message : err);
  process.exit(1);
});
