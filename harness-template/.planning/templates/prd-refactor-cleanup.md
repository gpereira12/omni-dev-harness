---
id: PRD-{{NUMBER}}
title: {{TITLE}}
type: refactor-cleanup # Refatoração Estrutural, Decomposição Monolítica, Dívida Técnica
status: Draft # Draft | In Review | Approved
author: {{AUTHOR}}
date: {{DATE}}
---

# PRD-{{NUMBER}}: {{TITLE}}

## 1. Justificativa da Refatoração & Débito Técnico
- **Arquivos/Módulos Alvo:** (ex: `src/controllers/monolithic.controller.ts`).
- **Problema Estrutural:** Violação de Clean Architecture, complexidade ciclomática alta ($M > 5$), excesso de linhas (>150 linhas) ou acoplamento excessivo.

## 2. Métricas de Sucesso da Refatoração (Antes vs Depois)
| Métrica de Manutenibilidade | Estado Atual (Antes) | Meta Esperada (Depois) |
| :--- | :--- | :--- |
| **Linhas por Arquivo** | ~2.700 linhas | < 200 linhas por sub-módulo |
| **Complexidade Ciclomática ($M$)** | Alta ($M > 15$ em handlers) | Baixa ($M < 5$ com early returns) |
| **Uso de Tipos `any`** | 14 ocorrências | 0 ocorrências (Strict TypeScript) |
| **Cobertura de Testes** | Baixa em branches complexos | > 85% nos novos sub-módulos |

## 3. Plano de Decomposição Modular
Descreva a divisão dos arquivos em sub-módulos especializados:
- `src/controllers/feature/sub-controller-a.ts` (Responsabilidade A)
- `src/controllers/feature/sub-controller-b.ts` (Responsabilidade B)
- `src/controllers/feature/view-helpers.ts` (Funções puras sem efeitos colaterais)
- `src/controllers/feature/index.ts` (Ponto de entrada limpo)

## 4. Garantia de Zero-Breaking-Change & Regressão
- **Contratos Públicos Preservados:** As rotas HTTP, URLs e schemas de saída devem permanecer 100% inalterados para os clientes.
- **Estratégia de Teste:** Execução de testes de integração e regressão antes e após a refatoração.

## 5. Critérios de Aceite
- Todos os testes preexistentes continuam passando sem alteração de comportamento.
- O sensor de código (`check:all`) aprova com zero warnings de lint e typecheck.
