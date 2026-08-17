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
