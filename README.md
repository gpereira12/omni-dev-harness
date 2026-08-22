# 🌐 Omni Dev Harness

**The Universal AI Engineering Harness, Architecture Standards & Spec-Driven Development (SDD) Engine.**

`omni-dev-harness` é a base universal de governança, padrões arquiteturais corporativos, proteção determinística e servidores MCP projetada para orquestrar agentes de inteligência artificial (**Antigravity, Claude Code, Cursor, Codex, OpenCode**) com máxima precisão, rastreabilidade e economia de tokens.

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
│   ├── AGENTS.md.template             <-- Governança por projeto (Invariantes, SDD e DoD)
│   ├── .planning/                     <-- Motor SDD (Spec-Driven Development)
│   │   └── templates/
│   │       ├── adr-template.md        <-- Template de ADR com Evidências de Código Obrigatórias
│   │       └── spec-template.md       <-- Template de Spec Técnica com Fronteira de Escopo Rígida
│   │
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
├── mcp-template/                      <-- Servidor MCP Canônico de Desenvolvimento & SDD
│   ├── package.json                   <-- @modelcontextprotocol/sdk + Zod
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts                   <-- Servidor Stdio
│       └── tools/
│           ├── dev-tools.ts           <-- Schemas de banco DDL e contexto de arquitetura
│           ├── knowledge-tools.ts     <-- Busca instantânea de ADRs e Specs (Baixo custo de tokens)
│           └── gcp-tools.ts           <-- Leitura de logs Cloud Run e Error Reporting
│
└── scripts/
    └── init-harness.sh                <-- Script de instalação em 1 linha para novos repositórios
```

---

## 🎯 Pilares do Spec-Driven Development (SDD)

O `omni-dev-harness` implementa um motor de especificação determinística para eliminar o *Scope Creep* e a alucinação de agentes:

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                OMNI-SDD LIFECYCLE                                       │
├─────────────────┬──────────────────┬──────────────────────┬─────────────────────────────┤
│ 1. DISCOVERY    │ 2. PROPOSAL (ADR)│ 3. SPEC TÉCNICA (SDD)│ 4. EXECUÇÃO & VERIFICAÇÃO   │
│ Coleta de fatos │ 2 Alternativas + │ Contrato de código,  │ TDD, implementação cirúrgica│
│ e evidências    │ Trade-offs       │ Arquivos afetados e  │ e sensor de DoD             │
│ na codebase     │ e Decisão Final  │ Casos de Teste       │ (pre-commit-check.sh)       │
└─────────────────┴──────────────────┴──────────────────────┴─────────────────────────────┘
```

1. **Evidência Empírica Obrigatória**: Antes de propor uma solução, o agente deve comprovar a necessidade citando linhas de código (`file://...`) e métricas.
2. **Fronteira Rígida de Escopo**: O agente é estritamente proibido de editar arquivos fora da lista `Arquivos Afetados` da Spec aprovada. Descobertas acessórias vão para o `BACKLOG.md`.
3. **Regra de Capacidade de Subagentes (3x6)**:
   - Tarefas $\le 6$: Agente principal.
   - Tarefas de 7 a 18: Máximo de 3 subagentes balanceados em paralelo (máx 6 tarefas cada).
   - Tarefas $> 18$: Decomposição em Épicos e Sprints sequenciais.

---

## ⚡ Como Rodar e Equipar Seus Projetos

### Opção 1: Inicialização em 1 Linha (Local)
Para equipar qualquer projeto existente na sua máquina com governança, SDD e servidor MCP:

```bash
# Execute o script apontando para a pasta do projeto alvo
/Users/gabrielpereira/Desktop/Projetos/Nexus/omni-dev-harness/scripts/init-harness.sh /caminho/do/projeto
```

O script provisionará automaticamente:
1. `AGENTS.md` customizado com as 9 invariantes ativas.
2. `.planning/` com subpastas `decisions/`, `specs/`, `templates/` e `BACKLOG.md`.
3. `.harness/` com os hooks (`pre-commit-check.sh`, `guard-destructive-db.sh`), subagentes e skills.
4. `mcp_dev/` configurado com ferramentas de desenvolvimento e consulta rápida de conhecimento.

---

### Opção 2: Como Rodar no Dia a Dia com Agentes de IA

#### 1. Início de Tarefa (Spec & ADR)
O agente consulta o `AGENTS.md`, analisa as evidências na codebase e cria o ADR em `.planning/decisions/` e a Spec Técnica em `.planning/specs/`.

#### 2. Durante o Desenvolvimento (Proteção Ativa)
Se o agente tentar executar comandos destrutivos (`prisma migrate reset`, `drop table`, `docker-compose down -v`), o hook `.harness/hooks/guard-destructive-db.sh` bloqueia a ação em 0ms.

#### 3. Fechamento da Tarefa (Definition of Done)
Antes de considerar uma tarefa pronta, execute o sensor determinístico de qualidade:
```bash
./.harness/hooks/pre-commit-check.sh
```
O script valida automaticamente:
* Conformidade das variáveis de ambiente (`.env` vs `.env.example`).
* Execução do Linter (`npm run lint`).
* Compilação TypeScript e Typecheck (`npm run build` / `npm run typecheck`).
* Execução da suíte de testes (`npm test`).

#### 4. Servidor MCP de Desenvolvimento & SDD
Para conectar o servidor MCP do projeto ao Antigravity/Claude Code/Cursor, adicione ao seu `.mcp.json` na raiz do projeto:
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

1. **Contexto é Orçamento**: Agentes só carregam arquivos sob demanda via `skill-router.md` e MCP indexador.
2. **Decisões com Evidência (ADR)**: Toda decisão estrutural DEVE ser documentada com evidências de código e 2 alternativas antes da implementação.
3. **Spec-First & Zero Scope Creep**: Proibido alterar arquivos fora da Spec aprovada.
4. **Regra de Capacidade (3x6)**: Máximo de 3 subagentes em paralelo, com até 6 tarefas cada.
5. **Definition of Done (DoD)**: Nenhuma tarefa é encerrada sem passar pelo sensor `pre-commit-check.sh` e pela revisão do `code-reviewer.md`.
6. **Automação Segura**: Comandos destrutivos de banco são interceptados e bloqueados pelo `guard-destructive-db.sh`.
7. **UTC Wire Standard**: APIs e bancos de dados comunicam e persistem timestamps rigorosamente no padrão ISO 8601 em UTC puro (`Z`).
8. **Zero Any & Clean Code**: Tipagem estrita, early returns, baixa complexidade ciclomática ($M < 5$) e aderência a Clean Architecture.
