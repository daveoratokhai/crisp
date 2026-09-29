import type { Via } from "./tree";

/**
 * Link to a document, remembering which route it was reached by.
 *
 * Lives in a plain module on purpose: it is called by server components
 * (the table) and client components (the sidebar). A function exported from
 * a client module is only a reference on the server and cannot be called
 * there, a failure TypeScript does not catch.
 */
export const docHref = (id: string, via?: Via) =>
  via ? `/d/${encodeURIComponent(id)}?via=${via}` : `/d/${encodeURIComponent(id)}`;
