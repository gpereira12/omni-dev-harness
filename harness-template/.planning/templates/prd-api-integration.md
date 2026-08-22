---
id: PRD-{{NUMBER}}
title: {{TITLE}}
type: api-integration # APIs, Webhooks, Microsserviços, Contratos Externos
status: Draft # Draft | In Review | Approved
author: {{AUTHOR}}
date: {{DATE}}
---

# PRD-{{NUMBER}}: {{TITLE}}

## 1. Objetivo da Integração & Arquitetura
- **Sistemas Envolvidos:** Sistema Origem (Client/BFF) $\longleftrightarrow$ Sistema Destino (API/Gateway/Provider).
- **Padrão de Comunicação:** REST / GraphQL / gRPC / Webhook Assíncrono.

## 2. Contratos de Dados & Especificação de Endpoints
- **Método & Endpoint:** `POST /api/v1/resource`
- **Autenticação:** Bearer JWT / API Key via Secret Manager / mTLS / WIF.
- **Headers Obrigatórios:** `Idempotency-Key`, `Content-Type: application/json`, `X-Tenant-ID`.

### Payload de Requisição (Request Schema)
```json
{
  "referenceId": "018f3a22-1234-7000-8000-000000000001",
  "amount": 1000,
  "metadata": {}
}
```

### Payload de Resposta (Success 200/201)
```json
{
  "status": "success",
  "data": {}
}
```

## 3. Tratamento de Erros (RFC 7807 / Problem Details)
| Status Code | Code / Reason | Mensagem de Erro Acionável |
| :--- | :--- | :--- |
| `400 Bad Request` | `VALIDATION_FAILED` | Detalhamento dos campos inválidos via Zod. |
| `401 Unauthorized`| `TOKEN_EXPIRED` | Token expirado, tentar refresh transparente. |
| `409 Conflict`    | `DUPLICATE_IDEMPOTENCY`| Operação já processada pela Idempotency-Key. |
| `429 Too Many Req`| `RATE_LIMIT_EXCEEDED` | Excedido limite de taxa com Retry-After. |

## 4. Políticas de Resiliência & Webhooks
- **Timeout Padrão:** Máximo de 3000ms com AbortController.
- **Estratégia de Retentativas:** Exponential Backoff com Jitter (3 tentativas).
- **Assinatura de Webhook:** Validação de HMAC SHA-256 no cabeçalho do webhook recebido.

## 5. Critérios de Aceite
- Requisições bem-sucedidas respondem no formato esperado com tipagem estrita.
- Erros de rede ou do provedor são tratados sem vazamento de stack trace em produção.
