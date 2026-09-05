# 🤖 OMNI-AIF: Agentic AI Engineering Framework

O **OMNI-AIF** governa o desenvolvimento, orquestração, integração via MCP e benchmarking de sistemas autônomos de Inteligência Artificial.

---

## 1. Padrões Cognitivos de Agentes

```
┌───────────────────────────────────────┬───────────────────────────────────────┐
│              ReAct LOOP               │           PLAN-AND-EXECUTE            │
├───────────────────────────────────────┼───────────────────────────────────────┤
│ • Iterativo (Thought ➔ Action ➔ Obs)  │ • Determinação prévia do grafo (DAG)  │
│ • Ideal para exploração e debugging   │ • Ideal para migrações e deploys      │
│ • Alta adaptabilidade a imprevistos   │ • Mínimo consumo de tokens e previsível│
└───────────────────────────────────────┴───────────────────────────────────────┘
```

---

## 2. Governança de Ferramentas via MCP (Model Context Protocol)

- **Granularidade Cirúrgica**: Nunca exponha 50 rotas genéricas; exponha ferramentas de alto nível (`get_student_contract`, `calculate_penalty`).
- **Validação de Schema com Zod**: Toda ferramenta MCP valida estritamente os parâmetros de entrada e saída antes de acionar APIs ou banco.
- **Delegação de Identidade**: O token de autenticação do usuário final é repassado para o MCP Server, garantindo que o agente respeite o RBAC do usuário.

---

## 3. Avaliação & Benchmarking de IA (Evals)

Todo pipeline de RAG e Agentes deve ser medido continuamente:
- **Context Relevance**: O contexto recuperado pelo RAG contém apenas a informação necessária?
- **Faithfulness (Fidelidade)**: A resposta da IA é 100% baseada no contexto fornecido (zero alucinação)?
- **Tool-Call Accuracy**: O modelo chama a ferramenta com os tipos corretos na primeira tentativa?

---

## 4. Topologias Swarm & Linha de Montagem de Agentes

Para eliminar a contaminação de contexto e o viés de auto-aprovação de código, o OMNI divide a execução de software em esteiras de agentes especializados inspiradas no modelo *SwarmForge*:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   TOPOLOGIAS DE PACKS OMNI                                      │
├─────────────┬───────────────────────────────────────────────────────────┬───────────────────────┤
│ PACK        │ SEQUÊNCIA DE PAPÉIS                                       │ QUANDO UTILIZAR       │
├─────────────┼───────────────────────────────────────────────────────────┼───────────────────────┤
│ Two-Pack    │ Coder ➔ Cleaner                                           │ Bugfixes simples,     │
│             │                                                           │ scripts, CSS e spikes │
├─────────────┼───────────────────────────────────────────────────────────┼───────────────────────┤
│ Four-Pack   │ Specifier ➔ Coder ➔ Refactorer ➔ Guardian                 │ Padrão (80% das tasks)│
│             │ (TDD Red)    (TDD Green) (Clean/M<5)   (Multi-tenant/Lint)│ Novas features e APIs │
├─────────────┼───────────────────────────────────────────────────────────┼───────────────────────┤
│ Six-Pack    │ Specifier ➔ Coder ➔ Cleaner ➔ Architect ➔ Hardening ➔ QA  │ Módulos críticos,     │
│             │ (Mutation Testing via Stryker + E2E Playwright obrigatório│ pagamentos e auth     │
└─────────────┴───────────────────────────────────────────────────────────┴───────────────────────┘
```

### Regras Inegociáveis da Esteira:
1. **TDD Estrito (Red ➔ Green ➔ Refactor)**: O `Specifier` é estritamente proibido de escrever código de produção; ele escreve apenas contratos (`.d.ts`), tipos e testes falhando. O `Coder` só escreve o código estritamente necessário para passar os testes.
2. **Complexidade Ciclomática Máxima ($M < 5$)**: O `Refactorer/Cleaner` deve quebrar funções longas e condicionais aninhadas.
3. **Isolamento Multi-Tenant Garantido**: O `Guardian` audita se toda e qualquer consulta SQL/Kysely contém `.where('tenant_id', '=', tenantId)`.

---

## 5. Protocolo de Handoffs Duráveis (Git Worktrees + Attention Gate)

A comunicação entre agentes **não ocorre via janelas de chat efêmeras**, mas sim por meio de **commits duráveis em Git Worktrees isolados** e arquivos de manifesto:

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                  CICLO DE HANDOFF OMNI                                  │
├────────────────────┬────────────────────┬─────────────────────┬─────────────────────────┤
│ 1. EXECUÇÃO EM     │ 2. COMMIT &        │ 3. ATTENTION GATE   │ 4. MERGE & PRÓXIMO PAPEL│
│ WORKTREE ISOLADO   │ MANIFESTO          │ (HUMAN-IN-THE-LOOP) │                         │
│ Cada papel atua em │ Gera manifesto sob │ O Dashboard acende  │ O próximo agente recebe │
│ `.worktrees/<role>`│ `.harness/handoffs`│ `[Approve]/[Reject]`│ o commit no seu worktree│
└────────────────────┴────────────────────┴─────────────────────┴─────────────────────────┘
```

- **Manifesto de Handoff**: Registrado em JSON com `task`, `from_role`, `to_role`, `commit_sha` e status.
- **Portão de Atenção Humana**: Nenhuma especificação de arquitetura ou alteração em módulos de alto risco avança para produção sem o clique explícito do operador em `[Approve]` no Dashboard.

