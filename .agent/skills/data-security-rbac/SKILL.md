---
name: data-security-rbac
description: Data security, AuthN (Google Identity, Passkeys, OAuth2), AuthZ (RBAC, ABAC, ReBAC/Zanzibar, CASL), Concordia Multi-Tenant Permission Pattern, Database per Service, Soft Delete, Rate Limiting, Presigned URLs, and LGPD/GDPR compliance.
always_use: false
---

# 🔒 Data Security, AuthN/AuthZ & Multi-Tenant Governance

Esta skill estabelece a autoridade máxima em **Identidade, Autenticação (AuthN)**, **Autorização (AuthZ)**, **Governança Multi-Tenant** e **Segurança de Dados** no ecossistema OMNI.

---

## 1. O Modelo Mental: AuthN vs. AuthZ (Zero Trust)

```
[ Usuário / Cliente ]
         │
         ▼
 ┌───────────────┐      Valida Credenciais / Passkey / OIDC
 │ AuthN Layer   │ ──► "QUEM É VOCÊ?" (Identidade Verificada)
 └───────┬───────┘      Emite JWT Seguro ou Session Cookie
         │
         ▼
 ┌───────────────┐      Valida Tenant, Grupo de Acesso, Rota e Capacidade
 │ AuthZ Layer   │ ──► "O QUE VOCÊ PODE FAZER?" (Políticas e Regras)
 └───────┬───────┘      Ex: canCreate em /financeiro? Tenant ID confere?
         │
         ▼
[ Execução do Use Case & Banco ]
```

- **AuthN (Autenticação)**: Estabelece a prova criptográfica de identidade. A aplicação sabe com certeza quem é o sujeito (`sub: usr_01h8x4...`).
- **AuthZ (Autorização)**: Avalia o contexto e os direitos do sujeito sobre determinado recurso dentro de um limite de isolamento (*Tenant Boundary*).

---

## 2. Camada de Autenticação (AuthN) no Ecossistema OMNI

### A. Google Cloud Identity Platform (GCIP / Firebase Auth Enterprise)
Padrão canônico recomendado para infraestrutura baseada em Google Cloud / Cloud Run:
1. **Multi-Tenancy Nativo**: O GCIP permite criar múltiplos *tenants* sob o mesmo projeto GCP, isolando diretórios de usuários, provedores SAML/OIDC corporativos e configurações de MFA.
2. **Provedores Federados**: Suporte imediato para Google Workspace (com restrição por domínio corporativo), Apple, Microsoft Azure AD e SAML 2.0 corporativo.
3. **Validação Criptográfica de Tokens**: O backend valida o JWT emitido pelo GCIP através da biblioteca oficial `firebase-admin` ou verificando a assinatura RS256 contra as chaves públicas públicas do Google (`https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com`).
4. **Custom Claims para Tenant Context**:
   ```typescript
   // Injeção de contexto no token do usuário
   await admin.auth().setCustomUserClaims(userId, {
     tenant_id: 'ten_01h8x498a',
     is_super_admin: false,
   });
   ```

### B. Provedores Especializados Alternativos
- **Supabase Auth (GoTrue)**: Excelente para projetos integrados diretamente com PostgreSQL e Row-Level Security (RLS).
- **Clerk / Auth0**: Indicados para B2C ou SaaS com onboarding avançado, gerenciamento de organização de autoatendimento e SSO corporativo plug-and-play.
- **Solução Própria de Credenciais**: Quando for estritamente necessária a persistência interna de senhas, use hashing **Argon2id** (mínimo: 64MB de memória, 3 iterações) ou **Bcrypt** com fator de custo `workFactor >= 12`.

### C. Fatores Modernos de Autenticação
1. **Passkeys (FIDO2 / WebAuthn)**: Autenticação biométrica local (Face ID, Touch ID, Windows Hello) via par de chaves assimétricas. Imune a ataques de phishing e dispensa armazenamento de senhas no banco.
2. **Magic Links Assinados (Email)**: Tokens temporários assinados com HMAC-SHA256, com tempo de expiração curto (5 a 10 minutos) e marcação de uso único (*Single-Use Nonce*) no Redis para mitigar ataques de repetição (*Replay Attack*).
3. **Verificação OTP via WhatsApp / SMS**: Usado para fluxos ágeis de ativação e validação de 2FA. **Mandatório**: Aplicar Rate Limiting estrito por número de telefone e por IP (máximo 3 envios a cada 15 minutos).

### D. Sessões vs. Tokens (Estratégia de Transporte)
| Ambiente | Transporte Recomendado | Mitigação de Risco |
| :--- | :--- | :--- |
| **Web SPA / SSR (Browser)** | **Cookies HttpOnly, Secure, SameSite=Lax/Strict** | Elimina roubo de token via XSS no JavaScript do cliente. |
| **Mobile / PWA / APIs** | **Authorization: Bearer <JWT>** | Refresh Token Rotation (RTR) com armazenamento seguro e revogação no Redis. |

---

## 3. Camada de Autorização (AuthZ) & Modelos de Governança

### A. Modelos de Controle de Acesso
1. **RBAC (Role-Based Access Control)**: Usuários recebem papéis (`admin`, `operador`, `leitor`). Ideal para hierarquias estáticas, mas sofre de "explosão de papéis" (*role explosion*) em sistemas complexos.
2. **ABAC (Attribute-Based Access Control)**: Regras avaliam atributos dinâmicos do sujeito, recurso e ambiente (ex: *"Usuário pode aprovar pagamentos se valor < R$ 10.000, for dia útil e estiver conectado na VPN"*).
3. **ReBAC (Relationship-Based Access Control / Google Zanzibar)**: Autorização modelada como grafo de relacionamentos (ex: `user:123` é `editor` de `document:456` porque é `member` de `team:marketing`).

### B. Motores de Governança de Mercado
- **CASL (`@casl/ability`)**: O padrão canônico para TypeScript isomórfico. Permite definir habilidades puras compartilhadas entre frontend (para ocultar botões) e backend (para bloquear requisições).
- **Oso (Polar)**: Motor desacoplado baseado em linguagem lógica declarativa (Polar) para regras complexas de ABAC e ReBAC.
- **Permify / Ory Keto**: Motores de autorização open-source baseados no whitepaper do Google Zanzibar para microsserviços distribuídos.
- **Open Policy Agent (OPA / Rego)**: Governança como código para arquiteturas de nuvem, Kubernetes e microsserviços de grande porte.

---

## 4. O Padrão Canônico Concordia (The Concordia Pattern)

O padrão **Concordia** é a arquitetura canônica do ecossistema OMNI para **SaaS Multi-Tenant B2B com Controle de Acesso Baseado em Capacidades e Tradução em Tempo de Execução**.

### A. Topologia de Entidades
```
  ┌──────────┐
  │  Tenant  │ (Fronteira Rígida de Isolamento de Dados)
  └────┬─────┘
       │ 1:N
       ├─────────────────────────────────┐
       ▼                                 ▼
┌──────────────┐                  ┌──────────────┐
│  App Modules │ (Features        │ Access Groups│ (Grupos de Acesso
│  & Licenças  │  Ativas)         │  do Tenant   │  ex: "Gerente Financeiro")
└──────┬───────┘                  └──────┬───────┘
       │                                 │ 1:N
       ▼                                 ▼
┌──────────────┐                  ┌──────────────┐
│ Menus/Rotas  │                  │ People/Users │
└──────┬───────┘                  └──────┬───────┘
       │                                 │
       └────────────────┬────────────────┘
                        │
                        ▼
            ┌───────────────────────┐
            │ PermissionTranslator  │ (Resolução de Contexto)
            └───────────┬───────────┘
                        │
                        ▼
              [ ActiveRouteAccess ]
     { canList, canView, canCreate, ... }
```

### B. O Contrato Canônico de Capacidades (`ActiveRouteAccess`)
Em vez de espalhar verificações ad-hoc de strings no código, toda rota e componente consome um contrato fortemente tipado:

```typescript
export interface ActiveRouteAccess {
  canList: boolean;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canExclude: boolean;
  customActions: Record<string, boolean>;
}

export interface PermissionMetadata {
  module_key: string;
  menu_route: string | null;
  menu_view: string | null;
  feature: string; // Ex: 'listar', 'criar', 'editar', 'excluir', 'creditar-pontos'
}
```

### C. Higienização Dinâmica de Rotas (`cleanDynamicRoute`)
Para evitar a necessidade de cadastrar rotas com IDs variantes no banco de permissões (ex: `/usuarios/f81d4fae-.../editar`), o motor normaliza o caminho:

```typescript
private static cleanDynamicRoute(route: string): string {
  let clean = route;
  let prev = '';
  while (clean !== prev) {
    prev = clean;
    // Remove UUIDs v4/v7 no final da rota
    clean = clean.replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, '');
    // Remove IDs numéricos
    clean = clean.replace(/\/\d+$/, '');
    // Remove sufixos operacionais de tela
    clean = clean.replace(/\/(criar|novo|new|adicionar|editar|constructor|dashboard)$/i, '');
  }
  return clean;
}
```

### D. Motor de Tradução (`PermissionTranslator`)
O tradutor resolve as permissões do usuário contra a rota e view ativas. Se o usuário for `SuperAdmin`, aplica-se o padrão Proxy garantindo bypass seguro:

```typescript
export class PermissionTranslator {
  public static translateRoutePermissions(
    resolvedPermissions: PermissionMetadata[],
    menu: { module_key: string; menu_route: string; menu_view: string } | null,
    isSuperAdmin: boolean,
  ): ActiveRouteAccess {
    // 1. SuperAdmin Bypass elegante via Proxy
    if (isSuperAdmin) {
      return {
        canList: true,
        canView: true,
        canCreate: true,
        canEdit: true,
        canExclude: true,
        customActions: new Proxy({}, { get: () => true }) as Record<string, boolean>,
      };
    }

    const access: ActiveRouteAccess = {
      canList: false,
      canView: false,
      canCreate: false,
      canEdit: false,
      canExclude: false,
      customActions: {},
    };

    if (!menu) return access;

    // 2. Filtra permissões aplicáveis ao contexto da rota/view
    const routePermissions = resolvedPermissions.filter((perm) => {
      const { route: permRoute, view: permView } = PermissionTranslator.parseMenuUrl(perm.menu_route);
      const cleanPermRoute = PermissionTranslator.cleanDynamicRoute(permRoute);
      const cleanMenuRoute = PermissionTranslator.cleanDynamicRoute(menu.menu_route);
      const permissionView = perm.menu_view || permView || '';

      const exactMatch = cleanPermRoute === cleanMenuRoute && permissionView === (menu.menu_view || '');
      const moduleMatch = perm.module_key === menu.module_key && (!perm.menu_route || perm.menu_route === '');

      return exactMatch || moduleMatch;
    });

    // 3. Mapeia ações de alto nível para capacidades booleanas
    routePermissions.forEach((perm) => {
      const action = perm.feature;
      if (action === 'listar') {
        access.canList = true;
      } else if (action === 'visualizar' || action === 'ler') {
        access.canView = true;
      } else if (action === 'criar' || action === 'adicionar') {
        access.canCreate = true;
        access.canView = true;
      } else if (action === 'editar') {
        access.canEdit = true;
      } else if (action === 'excluir' || action === 'remover') {
        access.canExclude = true;
      } else {
        access.customActions[action] = true;
      }
    });

    return access;
  }
}
```

### E. Isolamento Estrito de Tenant (Tenant Boundary Middleware)
- **Regra Absoluta**: Nenhuma query de banco ou caso de uso pode omitir o `tenant_id`.
- O `tenant_id` é extraído exclusivamente do token verificado (AuthN) e injetado no contexto da requisição (`req.tenantId`), nunca confiando em valores passados pelo body ou query string do cliente.
- Violação dessa regra caracteriza falha grave de **BOLA / IDOR (Broken Object Level Authorization)**.

---

## 5. Padrões Complementares de Dados e Resiliência

### A. Database per Service & Isolamento
- Cada microsserviço é o proprietário exclusivo de seus dados.
- Consultas cruzadas diretas via SQL entre esquemas de serviços diferentes são proibidas. A comunicação ocorre estritamente via APIs tipadas ou eventos assíncronos (Pub/Sub).

### B. Soft Delete Pattern
- Exclusão lógica com `is_deleted = true` e `deleted_at = TIMESTAMP WITH TIME ZONE (UTC)`.
- Consultas padrão filtram registros deletados por padrão.
- **Hard Purge**: Registros com `deleted_at > 90 dias` são arquivados para armazenamento frio (Cloud Storage Parquet) para conformidade regulatória.

### C. Rate Limiting & Throttling
- **Algoritmo Sliding Window Counter**: Rate limiting de alta precisão via Redis com chave composta `rl:{tenant_id}:{user_id}:{endpoint}`.
- Limites agressivos em rotas de autenticação (ex: login, reset de senha, emissão de OTP: max 5 requisições por minuto).

### D. Storage Seguro & Presigned URLs
- Upload e download direto de arquivos sensíveis via URLs pré-assinadas com tempo de expiração curto (15 minutos) no Google Cloud Storage (GCS) ou AWS S3.
- Arquivos binários nunca devem trafegar pela camada de API principal da aplicação.

### E. Trilha de Auditoria Imutável (Audit Trail) & LGPD/GDPR
- Toda mutação crítica gera um registro de auditoria imutável com `eventId`, `timestamp` (ISO 8601 UTC), `actorId`, `tenantId`, `action`, `resource`, `before` e `after`.
- Tratamento de Direito ao Esquecimento (LGPD/GDPR): Anonimização de PII (nome, email, telefone substituídos por hash irreversível) preservando os dados contábeis/fiscais do tenant.
