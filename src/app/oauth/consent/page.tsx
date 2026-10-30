import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { decideConnection } from "@/app/actions";
import { copy } from "@/content/site";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: copy.consent.title };

/**
 * Where Supabase's OAuth server sends someone whose agent is connecting to
 * the hosted MCP endpoint (Authentication > OAuth Server > Authorization Path).
 * Outside (app), so no sidebar; the proxy still requires a signed-in team
 * member, and sends a signed-out visitor back here after Google sign-in.
 *
 * Client names come from dynamic registration, so any app can call itself
 * anything. The host it returns to is shown too: that is where the code goes.
 */
export default async function ConsentPage({ searchParams }: PageProps<"/oauth/consent">) {
  const { authorization_id, error: decisionError } = await searchParams;
  const id = typeof authorization_id === "string" ? authorization_id : null;
  if (!id) return <Notice body={copy.consent.missing} />;
  if (decisionError) return <Notice body={copy.consent.decisionFailed} />;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(id);
  if (error || !data) return <Notice body={copy.consent.failed} />;

  // Already allowed before, for the same access: straight back to the agent.
  if (!("authorization_id" in data)) redirect(data.redirect_url);

  const client = data.client.name || copy.consent.unnamedClient;
  let host = data.redirect_uri;
  try {
    host = new URL(data.redirect_uri).host;
  } catch {
    // Not a URL: show it as given.
  }
  const scopes = data.scope.split(" ").filter(Boolean);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-bg px-4">
      <div className="w-full max-w-[420px] rounded-2xl border border-grid bg-surface p-8 shadow-card">
        <h1 className="text-xl font-bold text-text">{copy.consent.title}</h1>
        <p className="mt-3 text-sm text-text">{copy.consent.body(client)}</p>
        <p className="mt-2 text-sm text-text-2">{copy.consent.detail}</p>
        {scopes.length > 0 && (
          <p className="mt-2 text-sm text-text-2">
            {copy.consent.scopes} <span className="font-mono text-text">{scopes.join(", ")}</span>
          </p>
        )}
        <p className="mt-2 text-sm text-text-2">{copy.consent.returnsTo(host)}</p>

        <div className="mt-6 flex gap-3">
          <form action={decideConnection.bind(null, id, false)} className="flex-1">
            <button
              type="submit"
              className="h-11 w-full rounded-full border border-line bg-surface text-sm font-medium text-text transition-colors hover:bg-hover"
            >
              {copy.consent.deny}
            </button>
          </form>
          <form action={decideConnection.bind(null, id, true)} className="flex-1">
            <button
              type="submit"
              className="h-11 w-full rounded-full bg-blue text-sm font-medium text-on-blue transition-opacity hover:opacity-90"
            >
              {copy.consent.approve}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-muted">{copy.consent.signedInAs(data.user.email)}</p>
      </div>
    </main>
  );
}

function Notice({ body }: { body: string }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-bg px-4">
      <div className="w-full max-w-[360px] text-center">
        <h1 className="text-xl font-bold text-text">{copy.consent.title}</h1>
        <p role="alert" className="mt-2 text-sm text-text-2">
          {body}
        </p>
      </div>
    </main>
  );
}
