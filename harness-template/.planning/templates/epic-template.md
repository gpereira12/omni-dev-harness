---
id: EPIC-{{NUMBER}}
title: {{TITLE}}
type: {{TYPE}} # feature | refactor | api | infra | security
status: Draft # Draft | Approved | In Progress | Completed
owner: {{OWNER}}
date: {{DATE}}
---

# EPIC-{{NUMBER}}: {{TITLE}}

## 1. Visão Executiva & Objetivo de Negócio
- **Problema / Oportunidade:** Descrição clara do que precisa ser alcançado no macro.
- **Resultado Esperado (DoD do Épico):** Como saberemos que o épico foi entregue com sucesso.

## 2. Decomposição em Especificações Técnicas (SDD Specs)
Cada épico é quebrado em specs atômicas independentes com escopo restrito ($M \le 5$ arquivos por spec):

| Spec ID | Título da Spec | Tipo | Subagente Sugerido | Status |
| :--- | :--- | :--- | :--- | :--- |
| `SPEC-01` | Nome da sub-tarefa / módulo | Contrato / UI | Subagente 1 (UI) | Draft |
| `SPEC-02` | Nome do hook / service / schema | Lógica / API | Subagente 2 (Service) | Draft |
| `SPEC-03` | Testes E2E / Sintéticos | Testes | Subagente 3 (QA) | Draft |

## 3. Matriz de Dependências & Ordem de Execução
```
SPEC-01 (Contratos / Tipos) ──▶ SPEC-02 (Lógica / Views) ──▶ SPEC-03 (Testes E2E Playwright)
```

## 4. Estratégia de Subagentes (Regra 3x6)
- **Quantidade total de tarefas:** `{{TOTAL_TASKS}}`
- **Alocação:**
  - Se $\le 6$ tarefas: Agente principal sequencial.
  - Se $7$ a $18$ tarefas: Até 3 subagentes em paralelo com fronteiras de arquivos estritas.

## 5. Critérios Globais de Aceite do Épico
- [ ] Todas as specs filhas concluídas com status `Completed`.
- [ ] `npm run check:all` executado com 100% de sucesso.
- [ ] Testes E2E Playwright da feature executados e passando.
- [ ] Revisão de código e aprovação humana registrada no PR.
