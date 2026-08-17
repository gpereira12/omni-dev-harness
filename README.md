# 🌐 Omni Dev Harness

**The Universal AI Engineering Harness, Architecture Standards & MCP Infrastructure.**

`omni-dev-harness` é a base universal de governança, padrões arquiteturais, proteção determinística e servidores MCP para acelerar o desenvolvimento de software com agentes de inteligência artificial (**Antigravity, Claude Code, Cursor, Codex, OpenCode**).

---

## 🏛️ Estrutura do Repositório

```text
omni-dev-harness/
├── .agent/                            <-- Inteligência e Regras para Agentes
│   ├── rules/
│   │   ├── senior-architect.md        <-- Postura, Clean Architecture, SOLID e Autoridade
│   │   ├── skill-router.md            <-- Roteador dinâmico de contexto (Zero Bloat)
│   │   ├── rest-api-18-rules.md       <-- As 18 regras de ouro REST + ISO 8601 UTC
│   │   └── ai-agent-governance.md     <-- Governança de LLMs, Model Tiering e Guardrails
│   │
│   └── skills/
│       ├── master-protocol/           <-- O MIP (Fluxo de Discovery em 7 Fases)
│       ├── software-architecture/     <-- Hexagonal, Outbox, Saga, CQRS, ACL, Sidecar, Bulkhead
│       ├── frontend-design-system/    <-- Next, Vite, Astro, Mobile (Expo/Native), Shadcn, 21st.dev
│       ├── ux-behavioral-psychology/  <-- Leis de UX (Hick, Fitts, Doherty), Carga Cognitiva & Apple Standards
│       ├── distributed-resilience/    <-- Cache-Aside, Consistent Hashing, DLQ, Failover, SKIP LOCKED
│       ├── gcp-devops-infra/          <-- Cloud Run, Cloud SQL, Secret Manager, Pub/Sub, IaC & Migrations
│       └── data-security-rbac/        <-- Database per Service, Soft Delete, RBAC/CASL, LGPD
│
├── harness-template/                  <-- Template Clonável para QUALQUER Projeto (Padrão Acutis)
│   ├── AGENTS.md.template             <-- Governança por projeto (Invariantes e DoD)
│   ├── .harness/
│   │   ├── hooks/
│   │   │   ├── guard-destructive-db.sh<-- Bloqueia drop/reset de banco
│   │   │   └── pre-commit-check.sh    <-- Sensor de código (Build + Lint + Tests + .env)
│   │   ├── agents/
│   │   │   ├── code-reviewer.md       <-- Subagente de revisão estrita
│   │   │   └── architecture-advisor.md<-- Subagente de diagnóstico e stack
│   │   └── skills/
│   │       ├── git-worktree-workflow/ <-- Isolamento de sessões paralelas
│   │       └── gsd-architecture-guide/<-- Gestão de estado em .planning/
│
├── mcp-template/                      <-- Servidor MCP Canônico de Desenvolvimento
│   ├── package.json                   <-- @modelcontextprotocol/sdk + Zod
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts                   <-- Servidor Stdio
│       └── tools/
│           ├── dev-tools.ts           <-- Schemas de banco e verificação de código
│           └── gcp-tools.ts           <-- Leitura de logs Cloud Run e Error Reporting
│
└── scripts/
    └── init-harness.sh                <-- Script de instalação em 1 linha para novos repositórios
```

---

## ⚡ Instalação Rápida em Qualquer Projeto

Para equipar um projeto novo ou existente com o harness e as regras completas, execute no diretório do projeto:

```bash
# Via script local:
/caminho/para/omni-dev-harness/scripts/init-harness.sh

# Ou apontando para o seu repositório no GitHub:
curl -sSL https://raw.githubusercontent.com/seu-usuario/omni-dev-harness/main/scripts/init-harness.sh | bash
```

---

## 🛡️ Invariantes Universais

1. **Contexto é Orçamento**: Agentes só carregam arquivos de regras e skills sob demanda via `skill-router.md`.
2. **Definition of Done (DoD)**: Nenhuma tarefa é dada por encerrada sem passar pelo sensor `pre-commit-check.sh` e pela revisão do `code-reviewer.md`.
3. **Automação Segura**: Comandos destrutivos de banco (`migrate reset`, `drop`, `compose down -v`) são interceptados e bloqueados pelo `guard-destructive-db.sh`.
4. **UTC Wire Standard**: APIs e bancos de dados comunicam e armazenam timestamps rigorosamente no padrão ISO 8601 em UTC puro (`Z`).
5. **Zero Any & Clean Code**: Tipagem estrita, early returns, baixa complexidade ciclomática e aderência a Clean Architecture.
