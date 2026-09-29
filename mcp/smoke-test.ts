/**
 * End-to-end check of the MCP server over the real protocol: spawns it the
 * way Claude Code does (stdio) and calls every tool. Point CRISP_WORKSPACE at
 * a copy of the workspace; this creates and edits documents.
 *
 *   CRISP_WORKSPACE=/tmp/copy npx tsx mcp/smoke-test.ts
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const ws = process.env.CRISP_WORKSPACE;
if (!ws) throw new Error("Set CRISP_WORKSPACE to a throwaway copy of the workspace");

async function main() {
  const client = new Client({ name: "crisp-smoke-test", version: "0" });
  await client.connect(
    new StdioClientTransport({ command: "npx", args: ["tsx", "mcp/server.ts"], env: { ...process.env, CRISP_WORKSPACE: ws } as Record<string, string> })
  );

  const out = (r: unknown) => ((r as { content: { text: string }[] }).content[0]?.text ?? "");
  const call = async (name: string, args: Record<string, unknown> = {}) => client.callTool({ name, arguments: args });

  const tools = (await client.listTools()).tools.map((t) => t.name);
  console.log("TOOLS:", tools.join(", "));
  console.log("\nLIST_CLIENTS:\n" + out(await call("list_clients")));
  console.log("\nSEARCH 'value flow':\n" + out(await call("search_documents", { query: "value flow", limit: 3 })));
  const read = out(await call("read_document", { id: "gb-workshop-output" }));
  console.log("\nREAD gb-workshop-output (first 6 lines):\n" + read.split("\n").slice(0, 6).join("\n"));
  const created = out(await call("create_document", { title: "Agent brief", body: "## Summary\n\nWritten over MCP.", client: "givebacks", process: "workshop", doc_type: "deliverable" }));
  console.log("\nCREATE:\n" + created);
  const id = created.match(/\[id: ([^\]]+)\]/)![1];
  console.log("\nUPDATE:\n" + out(await call("update_document", { id, body: "## Summary\n\nRevised over MCP." })));
  console.log("\nREAD BACK:\n" + out(await call("read_document", { id })));
  const missing = await call("read_document", { id: "does-not-exist" });
  console.log("\nMISSING ID -> isError:", (missing as { isError?: boolean }).isError, "|", out(missing));
  console.log("\nLIST local:\n" + out(await call("list_documents", { state: "local" })));
  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
