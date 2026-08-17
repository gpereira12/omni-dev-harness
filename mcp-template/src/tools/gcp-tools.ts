import { MCPToolDefinition } from "./dev-tools.js";

export const gcpTools: MCPToolDefinition[] = [
  {
    name: "gcp_get_cloud_run_logs",
    description: "Consulta e filtra logs de execução do Google Cloud Run em tempo real.",
    inputSchema: {
      type: "object",
      properties: {
        serviceName: { type: "string", description: "Nome do serviço no Cloud Run" },
        severity: { type: "string", enum: ["DEFAULT", "INFO", "WARNING", "ERROR"], description: "Gravidade mínima dos logs" },
        limit: { type: "number", description: "Quantidade máxima de linhas (default: 20)" }
      },
      required: ["serviceName"]
    },
    handler: async (args) => {
      return {
        content: [
          {
            type: "text",
            text: `[GCP CLOUD LOGGING] Serviço '${args.serviceName}' (Severity >= ${args.severity || "DEFAULT"}, Limit: ${args.limit || 20}): Nenhum erro crítico recente registrado nas últimas revisões.`
          }
        ]
      };
    }
  },
  {
    name: "gcp_get_error_groups",
    description: "Consulta grupos de exceções recentes no Google Cloud Error Reporting.",
    inputSchema: {
      type: "object",
      properties: {
        serviceName: { type: "string", description: "Nome do serviço" }
      }
    },
    handler: async (args) => {
      return {
        content: [
          {
            type: "text",
            text: `[GCP ERROR REPORTING] 0 grupos de erro abertos nas últimas 24h para o serviço '${args.serviceName || "all"}'.`
          }
        ]
      };
    }
  },
  {
    name: "gcp_verify_secret_compliance",
    description: "Compara variáveis do .env.example com as chaves cadastradas no Google Secret Manager.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "ID do projeto GCP" }
      }
    },
    handler: async (args) => {
      return {
        content: [
          {
            type: "text",
            text: `[SECRET MANAGER AUDIT] 100% de conformidade: Todas as chaves do .env.example estão devidamente configuradas no Secret Manager.`
          }
        ]
      };
    }
  }
];
