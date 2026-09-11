---
name: ade-integration
description: >
  Guia de integração entre o Omni-Forge (camada de governança e controle) e
  as ferramentas ADE (Agent Development Environment) como Orca, Claude Code,
  Antigravity e Codex. Define responsabilidades claras e como o fluxo de
  commit-driven handoffs se encaixa em cada ferramenta.
---

# 🔗 ADE Integration Guide — Omni-Forge + Claude Code / Antigravity / Codex / Orca

## 1. Modelo Mental: Duas Camadas Distintas

O Omni-Forge **não substitui** sua ADE de preferência. Ele é a **camada de governança** que orquestra o que as ADEs executam.

```
┌─────────────────────────────────────────────────────────────────┐
│          CAMADA DE GOVERNANÇA — Omni-Forge Dashboard            │
│  • Kanban de estado por papel (Specifier → Coder → Guardian)    │
│  • Approval Gates (Approve / Reject com 1 clique)               │
│  • Histórico de commits por worktree                            │
│  • Status git em tempo real (limpo / sujo) por papel           │
│  • SDD Engine (Specs, ADRs, Epic templates)                     │
│  • Rules de qualidade (REST 18 rules, Clean Arch, LGPD)        │
└────────────────────────┬────────────────────────────────────────┘
                         │ SSE + REST API
┌────────────────────────▼────────────────────────────────────────┐
│              CAMADA ADE — Escolha a sua ferramenta              │
│                                                                  │
│  Claude Code         Antigravity        Codex        Orca ADE   │
│  (terminal)          (IDE integrada)    (terminal)   (desktop)  │
│                                                                  │
│  Os agentes rodam AQUI, em worktrees isolados                   │
│  e emitem handoffs via omni-handoff.sh                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Divisão de Responsabilidades

| O que fazer | Onde fazer |
|---|---|
| Escrever código, rodar testes, criar specs | ADE de sua escolha |
| Commitar no formato `handoff(T-001): ...` | ADE (terminal integrado ou Claude Code) |
| Emitir o handoff via `omni-handoff.sh send` | ADE (terminal ou task final do agente) |
| Ver o status do gate / aprovar / rejeitar | **Omni-Forge Dashboard** (:4200) |
| Inspecionar diff antes de aprovar | ADE (Orca tem diff review nativo; Claude Code tem /diff) |
| Criar nova task e atribuir a um papel | **Omni-Forge Dashboard** ou CLI |
| Gerenciar o ciclo de épicos e specs | `.planning/` do projeto via SDD Engine |

---

## 3. Fluxo Canônico por ADE

### 3.1 Claude Code (via terminal integrado da IDE ou standalone)

```bash
# Agente Claude Code no worktree do specifier:

# 1. Trabalha na spec e nos testes TDD Red
# 2. Commita no worktree isolado
git add -A
git commit -m "handoff(T-001): failing tests for checkout-v2 flow"

# 3. Emite o handoff (Claude Code executa via /bash ou terminal)
.harness/handoffs/omni-handoff.sh send \
  --from specifier \
  --to coder \
  --task T-001 \
  --summary "Contracts + failing tests para checkout v2"

# → Omni-Forge Dashboard detecta o novo handoff via file watcher
# → Coder aparece na fila do Kanban
# → Se require_approval=true: card de Approval Gate aparece no Dashboard
```

### 3.2 Antigravity (Google AGY)

O Antigravity roda os agentes em contextos separados de conversa. Cada papel
(Specifier, Coder, Refactorer, Guardian) é um **subagente** ou uma **conversa paralela**.

```
Workflow recomendado:
1. Inicie o agente Specifier com o prompt de .harness/agents/specifier.md
2. O agente entrega a spec e os testes, commita no worktree
3. O agente chama omni-handoff.sh send via run_command
4. O Omni-Forge Dashboard exibe o gate → você aprova no browser
5. Inicie o agente Coder com .harness/agents/coder.md
6. O coder roda omni-handoff.sh receive --role coder para pegar a task
7. O coder roda omni-handoff.sh init-worktree para configurar seu worktree
```

**Dica**: Configure o AGENTS.md do projeto com as instruções do Omni para que
o Antigravity leia as regras e skills automaticamente.

### 3.3 Codex (OpenAI)

Similar ao Claude Code. Codex roda via terminal e pode executar comandos shell.

```bash
# O agente Codex, ao finalizar, executa:
git add -A && git commit -m "handoff(T-001): implementation complete"
bash .harness/handoffs/omni-handoff.sh send --from coder --to refactorer --task T-001
```

### 3.4 Orca (ADE Desktop)

Orca é ideal para visualizar múltiplos agentes em paralelo. Configure um
**Project** por worktree no Orca:

```
Orca Projects:
  ├── acme-web / specifier   → worktree: .worktrees/specifier
  ├── acme-web / coder       → worktree: .worktrees/coder
  ├── acme-web / refactorer  → worktree: .worktrees/refactorer
  └── acme-web / guardian    → worktree: .worktrees/guardian
```

Cada terminal Orca roda o agente no seu worktree isolado. O Omni-Forge
Dashboard complementa com os gates e o Kanban de estado.

**Orca + Omni-Forge = visão completa:**
- **Orca**: "O que o agente está fazendo agora? Qual o diff?"
- **Forge**: "A task passou pelo gate? Foi aprovada? Está na fila certa?"

---

## 4. Protocolo de Handoff Unificado

Independente da ADE, o protocolo é sempre o mesmo:

```
1. git add -A
2. git commit -m "handoff(<task-id>): <resumo>"
3. omni-handoff.sh send --from <role> --to <next> --task <id>
```

O `omni-handoff.sh` v2 **rejeita** o handoff se:
- O worktree tiver uncommitted changes (git status não vazio)
- O HEAD commit não seguir o formato `handoff(<task-id>):`

---

## 5. Cascade Branch Strategy

Cada papel recebe sua própria branch que **ramifica do handoff commit do papel anterior**:

```
main
 └─ harness/specifier/T-001   (specifier trabalha aqui)
      commit: "handoff(T-001): failing tests"  ← ponto de entrega
       └─ harness/coder/T-001   (coder ramifica DAQUI)
            commit: "handoff(T-001): checkout implemented"  ← ponto de entrega
             └─ harness/refactorer/T-001
                  └─ harness/guardian/T-001
```

Para inicializar o worktree do próximo papel após aprovação:

```bash
omni-handoff.sh init-worktree \
  --role coder \
  --task T-001 \
  --from harness/specifier/T-001
```

---

## 6. Dashboard como Torre de Controle

Acesse `http://localhost:4200` para:

| Seção | O que mostra |
|---|---|
| Kanban | Progresso das tasks por papel (Queued → Attention → Done) |
| ⚠️ Approval Gates | Cards com SHA do commit + botões Approve/Reject |
| Worktree Status | Estado git de cada worktree (limpo/sujo) em tempo real |
| Commit History | Últimos commits por papel (via `/api/commits/:role`) |
| Projetos | Multi-project view com topologia de pack |

Os eventos `GATE_APPROVED`, `GATE_REJECTED`, `HANDOFF_UPDATE` são
transmitidos via SSE para atualização em tempo real sem polling.
