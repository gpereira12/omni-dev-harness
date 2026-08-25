# 🌐 Omni Dev Harness

**The Universal AI Engineering Harness, Architecture Standards & Spec-Driven Development (SDD) Engine.**

> **Ambiente de Execução:** O `omni-dev-harness` foi projetado para operar nativamente dentro de assistentes de agentes de IA (**Google Antigravity, Claude Code, OpenAI Codex, OpenCode, Cursor**), garantindo governança, rastreabilidade e máxima eficiência de tokens.

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
├── harness-template/                  <-- Template Clonável para QUALQUER Projeto
│   ├── AGENTS.md.template             <-- Governança por projeto (Invariantes, SDD, Design System e DoD)
│   ├── .planning/                     <-- Motor SDD (Spec-Driven Development)
│   │   └── templates/
│   │       ├── epic-template.md       <-- Template de Épico Orquestrador (Decomposição e Portões)
│   │       ├── spec-template.md       <-- Template de Spec Técnica com Fronteira de Escopo Rígida
│   │       ├── adr-template.md        <-- Template de ADR com Evidências de Código Obrigatórias
│   │       └── prd-*.md               <-- Templates de PRD por Domínio (Feature, Refactor, Security, etc.)
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
├── mcp-template/                      <-- Servidor MCP Canônico de Desenvolvimento & Memória
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

## 🧭 O Agente Omni como Consultor de Memória (Advisor Flow)

Durante a fase de setup ou discovery de qualquer projeto, o agente de IA avalia a complexidade arquitetural e sugere a melhor estratégia de memória:

```
                  ┌──────────────────────────────────────────────┐
                  │ 1. DIAGNÓSTICO DO PROJETO PELO AGENTE OMNI   │
                  │ (Volume de código, módulos, complexidade)    │
                  └──────────────────────┬───────────────────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 │                                               │
                 ▼ Projeto Médio / Grande                        ▼ Projeto Pequeno / Simples
       (Múltiplos módulos, regras de negócio,          (Scripts utilitários, CLIs,
        SaaS, integrações ou múltiplos agentes)         landing pages de 1 repositório)
                 │                                               │
                 ▼                                               ▼
┌─────────────────────────────────────────────────┐ ┌─────────────────────────────────────────┐
│ 💡 SUGESTÃO ATIVA DA IA:                        │ │ 💡 SUGESTÃO ATIVA DA IA:                │
│ "Detectei que este projeto possui alta           │ │ "Este projeto é enxuto. Recomendo       │
│  complexidade de domínio. Sugiro instalarmos    │ │  usar Memória em Arquivos Markdown      │
│  o servidor MCP de Memória Persistente          │ │  (knowledge/lessons-learned/), sem      │
│  (mcp-template/ com SQLite FTS5) para buscas    │ │  necessidade de servidor MCP extra."    │
│  em 0ms e economia massiva de tokens."          │ │                                         │
└─────────────────────────────────────────────────┘ └─────────────────────────────────────────┘
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

1. **Memória Primeiro**: Antes de diagnosticar qualquer problema ou iniciar um épico, o agente consulta a memória persistente (via MCP ou `knowledge/lessons-learned/`).
2. **Evidência Empírica Obrigatória**: O agente comprova a necessidade de qualquer alteração citando linhas de código (`file://...`) e métricas.
3. **Fronteira Rígida de Escopo (Anti-Scope Creep)**: O agente é estritamente proibido de editar arquivos fora da lista `Arquivos Afetados` da Spec aprovada.
4. **Regra de Capacidade de Subagentes (3x6)**:
   - Tarefas $\le 6$: Agente principal.
   - Tarefas de 7 a 18: Máximo de 3 subagentes balanceados em paralelo (máx 6 tarefas cada).
   - Tarefas $> 18$: Decomposição em Épicos e Sprints sequenciais.
5. **Design System & UI Catalog-First**: Em projetos frontend com Design System interno ou tema dinâmico, é proibido usar componentes crus de terceiros ou hexadecimais fixos.
6. **Git Worktree & Commits em Blocos Atômicos**: Proibidos commits monolíticos gigantes. Alterações são organizadas por camadas lógicas (Tipos $\rightarrow$ Services $\rightarrow$ UI $\rightarrow$ Testes).
7. **Deploy 100% Human-in-the-Loop**: A IA nunca executa deploys em produção de forma autônoma.

---

## ⚡ Como Rodar e Equipar Seus Projetos

### Opção 1: Inicialização em 1 Linha (Local)
Para equipar qualquer projeto existente na sua máquina com governança, SDD e servidor MCP:

```bash
# Execute o script apontando para a pasta do projeto alvo
/Users/gabrielpereira/Desktop/Projetos/Nexus/omni-dev-harness/scripts/init-harness.sh /caminho/do/projeto
```

O script provisionará automaticamente:
1. `AGENTS.md` customizado com as invariantes universais ativas.
2. `.planning/` com subpastas `epics/`, `decisions/`, `specs/`, `templates/` e `BACKLOG.md`.
3. `.harness/` com os hooks (`pre-commit-check.sh`, `guard-destructive-db.sh`), subagentes e skills.
4. `mcp_dev/` configurado com ferramentas de desenvolvimento e consulta rápida de conhecimento.
