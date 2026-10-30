/**
 * Where to send someone after sign-in, when it is not Home. Only the OAuth
 * consent page qualifies today: an agent's connection request that started
 * while signed out. The proxy writes the cookie; the auth callback reads it.
 */

export const CONSENT_PATH = "/oauth/consent";
export const RETURN_COOKIE = "crisp-return-to";

/**
 * The cookie's value if it is a same-site consent URL, else null. Anything
 * else (another path, another host, `//evil.example`) is ignored, so the
 * cookie can never become an open redirect.
 */
export function safeReturnTo(value: string | undefined): string | null {
  if (!value) return null;
  if (value !== CONSENT_PATH && !value.startsWith(`${CONSENT_PATH}?`)) return null;
  return value;
}
