import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { mergeDocs, rowToDoc, TEAM_SELECT, type TeamRow } from "../workspace/team";
import { registerReadTools, type DocSource } from "./read-tools";

/**
 * Crisp's MCP server over HTTP, for clients that cannot run the repo locally
 * (Claude app connectors, `claude mcp add --transport http`).
 *
 * Who is asking is decided by the bearer token alone: a Supabase access token
 * issued through Supabase Auth's OAuth 2.1 server. The token is verified with
 * the Auth server, then every query runs as that person, so row-level security
 * applies to the agent exactly as it does in the app. No service key anywhere.
 *
 * Stateless: a fresh server per request, no session to store, so it runs on
 * serverless. It only reads the team's published documents; the hosted app
 * has no local drafts to see.
 */

const MCP_PATH = "/mcp";
const METADATA_PATH = "/.well-known/oauth-protected-resource";

type Env = { url: string; anonKey: string };

function env(): Env | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && anonKey ? { url, anonKey } : null;
}

const origin = (request: Request) => new URL(request.url).origin;

/** RFC 9728 metadata: tells a connector which authorization server to send the person to. */
export function protectedResourceMetadata(request: Request): Response {
  const config = env();
  if (!config) return Response.json({ error: "Team database is not configured." }, { status: 503 });
  return Response.json({
    resource: `${origin(request)}${MCP_PATH}`,
    resource_name: "Crisp",
    authorization_servers: [`${config.url}/auth/v1`],
    bearer_methods_supported: ["header"],
  });
}

const jsonError = (status: number, message: string, headers: Record<string, string> = {}) =>
  Response.json({ error: message }, { status, headers });

/** 401 with the pointer a connector follows to start the sign-in flow. */
const unauthorized = (request: Request, message: string) =>
  jsonError(401, message, {
    "WWW-Authenticate": `Bearer resource_metadata="${origin(request)}${METADATA_PATH}"`,
  });

type Authed = { supabase: SupabaseClient; email: string | undefined };

async function authenticate(request: Request, config: Env): Promise<Authed | Response> {
  const header = request.headers.get("authorization") ?? "";
  const token = /^Bearer\s+(.+)$/i.exec(header)?.[1];
  if (!token) return unauthorized(request, "Sign in required.");

  const supabase = createClient(config.url, config.anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  // Asks the Auth server rather than trusting the token's own claims.
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return unauthorized(request, "Invalid or expired token.");

  // A token alone is not enough: anyone can create a Supabase account.
  // Row-level security returns this row only to a team member.
  const { data: member } = await supabase.from("team_members").select("user_id").eq("user_id", data.user.id).maybeSingle();
  if (!member) return jsonError(403, "This account is not on the Crisp team.");

  return { supabase, email: data.user.email };
}

function teamSource({ supabase, email }: Authed): DocSource {
  return async () => {
    const { data, error } = await supabase.from("documents").select(TEAM_SELECT);
    if (error) return { docs: [], status: `Team documents: could not load (${error.message}).` };
    const docs = mergeDocs([], (data as unknown as TeamRow[]).map(rowToDoc));
    return { docs, status: `Team documents (signed in as ${email ?? "unknown"}).` };
  };
}

export async function handleMcp(request: Request): Promise<Response> {
  // Stateless server: no standing stream to open and no session to end.
  if (request.method !== "POST") return jsonError(405, "Method not allowed.", { Allow: "POST" });

  const config = env();
  if (!config) return jsonError(503, "Team database is not configured.");

  const authed = await authenticate(request, config);
  if (authed instanceof Response) return authed;

  const server = new McpServer({ name: "crisp", version: "0.1.0" });
  registerReadTools(server, teamSource(authed), { hosted: true });

  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  try {
    await server.connect(transport);
    return await transport.handleRequest(request);
  } catch (err) {
    console.error("crisp mcp request failed:", err);
    return jsonError(500, "The Crisp MCP server hit an error.");
  }
}
