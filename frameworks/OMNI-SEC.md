# 🛡️ OMNI-SEC: Security & Threat Modeling Framework

O **OMNI-SEC** estabelece as defesas proativas contra vulnerabilidades e ameaças em sistemas modernos, arquiteturas de nuvem e agentes autônomos de IA.

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
| **E**levation of Privilege | Elevação de privilégios | RBAC/ABAC estrito, isolamento multi-tenant e validação de capacidades por rota. |

---

## 2. Shift-Left Security

A segurança não é testada no final; ela é aplicada na raiz:
- **Zero Secrets no Git**: Hooks bloqueiam commits contendo arquivos `.env`, chaves privadas ou tokens de API.
- **Dependencies Scanning**: Dependabot / Snyk / Trivy roda automaticamente em todo PR para prevenir vulnerabilidades na cadeia de suprimentos (Supply Chain Attacks).
- **Parameterized Queries**: 100% de consultas SQL através de Query Builders tipados (Kysely, Drizzle) ou ORMs seguros (Prisma/Drizzle/EF Core), eliminando SQL Injection.
- **Multi-Tenant Strict Isolation (Zero IgnoreQueryFilters)**: Em arquiteturas multi-tenant, os Global Query Filters (`TenantId` e `!Deleted`) são invioláveis. É estritamente proibido o uso de `IgnoreQueryFilters()` ou desativação de escopo de tenant em consultas.

---

## 3. Governança de Autenticação (AuthN) e Autorização (AuthZ)

Todo sistema no ecossistema OMNI deve separar estritamente a prova de identidade (AuthN) da concessão de privilégios (AuthZ):

1. **Camada de AuthN (Quem é o sujeito)**:
   - Provedor corporativo canônico: **Google Cloud Identity Platform (GCIP)** com multi-tenancy nativo ou OAuth2/OIDC federado.
   - Alternativas aprovadas: Supabase Auth (PostgreSQL RLS), Clerk ou Auth0.
   - Fatores modernos: Passkeys (WebAuthn/FIDO2) e Magic Links com expiração curta e single-use token.
   - Prevenção de roubo de credenciais: Uso obrigatório de cookies `HttpOnly`, `Secure`, `SameSite=Lax` para navegação Web, e Bearer com Refresh Token Rotation (RTR) para mobile/PWA.
2. **Camada de AuthZ (O que o sujeito pode fazer)**:
   - **Princípio do Menor Privilégio (*Least Privilege*)**: Nenhum usuário ou subagente de IA possui permissões implícitas.
   - **Isolamento de Domínio (Tenant Boundary)**: A fronteira do tenant é inviolável. Nenhuma regra de autorização confia no `tenant_id` fornecido pelo cliente.
   - **Resolução em Tempo de Execução (The Concordia Pattern)**: Mapeamento determinístico de permissões do usuário em capacidades booleanas (`canList`, `canView`, `canCreate`, `canEdit`, `canExclude`, `customActions`) através do `PermissionTranslator`.

---

## 4. Prevenção Rigorosa contra BOLA / IDOR (OWASP API #1)

A vulnerabilidade número 1 em APIs modernas é **Broken Object Level Authorization (BOLA)**:

- **Regra**: Nunca execute queries usando apenas o identificador da entidade (`WHERE id = :id`).
- **Padrão OMNI**: Toda mutação e consulta deve incluir a chave composta com o tenant autenticado:
  ```sql
  -- ✅ CORRETO (Tenant-Scoped)
  SELECT * FROM orders WHERE id = :order_id AND tenant_id = :authenticated_tenant_id;

  -- ❌ VULNERÁVEL A BOLA (Proibido)
  SELECT * FROM orders WHERE id = :order_id;
  ```
- **IDs Não-Sequenciais**: Proibido expor sequenciais inteiros (`1, 2, 3`). Usar exclusivamente UUIDv7 ou identificadores com prefixo de domínio (`ord_01h8x4...`).

