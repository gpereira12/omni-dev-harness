import { z } from "zod";

export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
  handler: (args: any) => Promise<{ content: Array<{ type: "text"; text: string }> }>;
}

export const devTools: MCPToolDefinition[] = [
  {
    name: "dev_get_architecture_context",
    description: "Retorna as especificações de arquitetura e decisões travadas do projeto.",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string", description: "Tópico de interesse (ex: auth, database, frontend)" }
      }
    },
    handler: async (args) => {
      return {
        content: [
          {
            type: "text",
            text: `[CONTEXTO DE ARQUITETURA] Tópico '${args.topic || "geral"}': Padrões do Omni Dev Harness ativos. Consulte .planning/PROJECT.md para decisões travadas.`
          }
        ]
      };
    }
  },
  {
    name: "dev_get_table_schema",
    description: "Retorna o schema e colunas de uma tabela do banco de dados.",
    inputSchema: {
      type: "object",
      properties: {
        tableName: { type: "string", description: "Nome da tabela (ex: users, orders)" }
      },
      required: ["tableName"]
    },
    handler: async (args) => {
      return {
        content: [
          {
            type: "text",
            text: `[SCHEMA DDL] Tabela '${args.tableName}': id (UUIDv7, PK), created_at (TIMESTAMPTZ UTC), updated_at (TIMESTAMPTZ UTC), is_deleted (BOOLEAN).`
          }
        ]
      };
    }
  }
];
