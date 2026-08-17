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
├── frameworks/                        <-- Suíte de Frameworks Metodológicos OMNI
│   ├── OMNI-SAF.md                    <-- Software Architecture Framework (C4, DDD, PACELC, ADRs)
│   ├── OMNI-DAF.md                    <-- Data Architecture Framework (Data Mesh, Contracts, CDC)
│   ├── OMNI-POF.md                    <-- Product & UX Framework (Atomic Design, Discovery)
│   ├── OMNI-REF.md                    <-- Reliability & Full Cycle Framework (Netflix & Google SRE)
│   ├── OMNI-SEC.md                    <-- Security Framework (STRIDE Threat Modeling, Zero Trust)
│   └── OMNI-AIF.md                    <-- Agentic AI Engineering Framework (Cognitive Loops, MCP, Evals)
│
├── harness-template/                  <-- Template Clonável para QUALQUER Projeto (Padrão Acutis)
│   ├── AGENTS.md.template             <-- Governança por projeto (Invariantes e DoD)
│   ├── .harness/
│   │   ├── hooks/
│   │   │   ├── guard-destructive-db.sh<-- Bloqueia drop/reset de banco
│   │   │   └── pre-commit-check.sh    <-- Sensor de código (Build + Lint + Tests + .env)
│   │   ├── agents/
│   │   │   ├── code-reviewer.md       <-- Subagente de revisão estrita
│   │   │   ├── architecture-advisor.md<-- Subagente de diagnóstico e stack
│   │   │   └── schema-reviewer.md     <-- Subagente de auditoria de schemas de banco
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

## ⚡ Como Rodar e Equipar Seus Projetos

Você pode utilizar o `omni-dev-harness` de **três formas práticas**:

### Opção 1: Inicialização em 1 Linha (Local)
Para equipar qualquer projeto existente na sua máquina com o harness e servidor MCP:

```bash
# Navegue até o projeto alvo
cd /Users/gabrielpereira/Desktop/Projetos/Nexus/meu-novo-projeto

# Execute o script de inicialização do omni-dev-harness
/Users/gabrielpereira/Desktop/Projetos/Nexus/omni-dev-harness/scripts/init-harness.sh
```

O script criará automaticamente:
1. `AGENTS.md` customizado com o nome do projeto.
2. `.harness/` com os hooks (`pre-commit-check.sh`, `guard-destructive-db.sh`), subagentes e skills.
3. `.planning/STATE.md` com a estrutura inicial de GSD.
4. `mcp_dev/` configurado e pronto para compilar.

---

### Opção 2: Via Git Submodule (Recomendado para Sincronização Contínua)
Para manter as regras e frameworks sempre sincronizados com o repositório central:

```bash
cd meu-projeto
git submodule add git@github.com:gpereira12/omni-dev-harness.git .omni-harness
./.omni-harness/scripts/init-harness.sh
```

---

### Opção 3: Como Rodar no Dia a Dia com Agentes de IA

Uma vez instalado o harness no projeto, qualquer ferramenta de IA (**Antigravity, Claude Code, Cursor, Codex, OpenCode**) segue o fluxo operacional abaixo:

#### 1. Início de Tarefa (Context Routing)
O agente consulta o `AGENTS.md` e ativa sob demanda apenas a skill necessária via `.agent/rules/skill-router.md`.

#### 2. Durante o Desenvolvimento (Proteção Ativa)
Se o agente tentar executar comandos perigosos como `prisma migrate reset` ou `drop table`, o guardrail `.harness/hooks/guard-destructive-db.sh` bloqueia a execução imediatamente.

#### 3. Auditoria de Banco de Dados (Schema Review)
Ao criar ou alterar tabelas no Prisma/SQL:
```bash
# Invoque o subagente de auditoria de dados:
# "Subagente schema-reviewer, audite o schema do Prisma procurando por God Tables ou falta de CHECKs"
```

#### 4. Fechamento da Tarefa (Definition of Done)
Antes de considerar uma tarefa pronta, execute o sensor determinístico de qualidade:
```bash
./.harness/hooks/pre-commit-check.sh
```
O script valida automaticamente:
* Conformidade do `.env` com o `.env.example`.
* Execução do Linter (`npm run lint`).
* Compilação TypeScript e Build (`npm run build`).
* Execução da suíte de testes (`npm test`).

#### 5. Execução do Servidor MCP de Desenvolvimento
Para conectar o servidor MCP do projeto ao Antigravity/Claude Code/Cursor:
```bash
cd mcp_dev
npm install
npm run build
npm start
```
E adicione ao seu arquivo `.mcp.json` na raiz do projeto:
```json
{
  "mcpServers": {
    "dev-tools": {
      "command": "node",
      "args": ["mcp_dev/dist/index.js"]
    }
  }
}
```

---

## 🛡️ Invariantes Universais

1. **Contexto é Orçamento**: Agentes só carregam arquivos de regras e skills sob demanda via `skill-router.md`.
2. **Definition of Done (DoD)**: Nenhuma tarefa é dada por encerrada sem passar pelo sensor `pre-commit-check.sh` e pela revisão do `code-reviewer.md`.
3. **Automação Segura**: Comandos destrutivos de banco (`migrate reset`, `drop`, `compose down -v`) são interceptados e bloqueados pelo `guard-destructive-db.sh`.
4. **UTC Wire Standard**: APIs e bancos de dados comunicam e armazenam timestamps rigorosamente no padrão ISO 8601 em UTC puro (`Z`).
5. **Zero Any & Clean Code**: Tipagem estrita, early returns, baixa complexidade ciclomática e aderência a Clean Architecture.
