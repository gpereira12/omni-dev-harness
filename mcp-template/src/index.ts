import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { devTools } from "./tools/dev-tools.js";
import { gcpTools } from "./tools/gcp-tools.js";

const allTools = [...devTools, ...gcpTools];

const server = new Server(
  {
    name: "omni-dev-mcp",
    version: "1.0.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// Registra catálogo de ferramentas
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: allTools.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema
  }))
}));

// Roteador de execução de ferramentas
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const tool = allTools.find((t) => t.name === request.params.name);
  if (!tool) {
    throw new Error(`Ferramenta '${request.params.name}' não encontrada.`);
  }
  return await tool.handler(request.params.arguments || {});
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("🚀 [OMNI MCP] Servidor de desenvolvimento e GCP conectado via stdio.");
}

main().catch((err) => {
  console.error("❌ [OMNI MCP] Erro fatal:", err);
  process.exit(1);
});
