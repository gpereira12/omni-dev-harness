import fs from "fs";
import path from "path";
import { MCPToolDefinition } from "./dev-tools.js";

/**
 * Ferramenta MCP de Alta Eficiência de Contexto (SDD & Knowledge Engine)
 * Permite que agentes consultem decisões (ADRs) e specs sem carregar arquivos inteiros no prompt.
 */
export const knowledgeTools: MCPToolDefinition[] = [
  {
    name: "knowledge_query_decisions",
    description: "Consulta rápida no índice de decisões de arquitetura (ADRs) do projeto sob demanda.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Termo de busca ou tópico (ex: auth, helmet, cache, controller)" }
      },
      required: ["query"]
    },
    handler: async (args) => {
      const planningPath = path.resolve(process.cwd(), ".planning/decisions");
      if (!fs.existsSync(planningPath)) {
        return {
          content: [
            {
              type: "text",
              text: "ℹ️ Nenhuma pasta .planning/decisions/ encontrada neste workspace."
            }
          ]
        };
      }

      const files = fs.readdirSync(planningPath).filter((f) => f.endsWith(".md"));
      const matches: string[] = [];

      for (const file of files) {
        const content = fs.readFileSync(path.join(planningPath, file), "utf8");
        if (content.toLowerCase().includes(args.query.toLowerCase())) {
          matches.push(`--- ${file} ---\n` + content.substring(0, 1500) + (content.length > 1500 ? "\n...[truncado para economia de tokens]" : ""));
        }
      }

      if (matches.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `Nenhum ADR encontrado para o termo '${args.query}'.`
            }
          ]
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `🔍 [OMNI SDD] Encontrado(s) ${matches.length} documento(s) relevante(s):\n\n${matches.join("\n\n")}`
          }
        ]
      };
    }
  },
  {
    name: "knowledge_list_active_specs",
    description: "Lista as especificações técnicas (Specs) ativas e em andamento no projeto.",
    inputSchema: {
      type: "object",
      properties: {}
    },
    handler: async () => {
      const specsPath = path.resolve(process.cwd(), ".planning/specs");
      if (!fs.existsSync(specsPath)) {
        return {
          content: [
            {
              type: "text",
              text: "ℹ️ Nenhuma spec encontrada em .planning/specs/."
            }
          ]
        };
      }

      const files = fs.readdirSync(specsPath).filter((f) => f.endsWith(".md"));
      return {
        content: [
          {
            type: "text",
            text: `📋 [SPECS ATIVAS]:\n${files.map((f) => `- ${f}`).join("\n")}`
          }
        ]
      };
    }
  }
];
