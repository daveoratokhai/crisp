import { handleMcp } from "@/features/mcp/remote";

// Hosted MCP endpoint. Auth and tools live in features/mcp/remote.ts; this
// route sits outside the (app) group, so it never renders the signed-in shell.
export const POST = handleMcp;
export const GET = handleMcp;
export const DELETE = handleMcp;
