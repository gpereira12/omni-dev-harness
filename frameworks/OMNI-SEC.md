# 🛡️ OMNI-SEC: Security & Threat Modeling Framework

O **OMNI-SEC** estabelece as defesas proativas contra vulnerabilidades e ameaças em sistemas modernos e agentes de IA.

---

## 1. Threat Modeling com STRIDE

Antes de aprovar a arquitetura de qualquer novo módulo ou endpoint, avalie contra a matriz STRIDE:

| Ameaça | Definição | Mitigação Canônica OMNI |
| :--- | :--- | :--- |
| **S**poofing | Falsificação de identidade | JWT assinado com chave assimétrica (RS256) ou sessões HttpOnly. |
| **T**ampering | Adulteração de dados | HMAC / Assinatura digital em Webhooks e Merkle Trees em dados sensíveis. |
| **R**epudiation | Negação de autoria | Trilha de auditoria imutável com IP, timestamp UTC e ActorID. |
| **I**nformation Disclosure | Vazamento de dados | Mascaramento de PII nos logs e zero stack traces em respostas de erro. |
| **D**enial of Service | Negação de serviço | Rate Limiting (Token Bucket) no Cloudflare/Redis e limites de body (413). |
| **E**levation of Privilege | Elevação de privilégios | RBAC estrito (CASL) e validação de permissão nos use cases/guards. |

---

## 2. Shift-Left Security

A segurança não é testada no final; ela é aplicada na raiz:
- **Zero Secrets no Git**: Hooks bloqueiam commits contendo arquivos `.env` ou chaves privadas.
- **Dependencies Scanning**: Dependabot / Snyk roda automaticamente em todo PR.
- **Parameterized Queries**: 100% de consultas SQL através de ORM tipado (Prisma/Drizzle) ou parâmetros sanitizados.
