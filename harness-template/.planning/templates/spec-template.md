---
id: SPEC-{{NUMBER}}
title: {{TITLE}}
status: Draft # Draft | Approved | In Progress | Completed
adr_ref: ADR-{{ADR_NUMBER}}
date: {{DATE}}
---

# SPEC-{{NUMBER}}: {{TITLE}}

## 1. Objetivo Direto (1 Parágrafo)
O que esta alteração faz e qual o resultado esperado.

## 2. Fronteira de Escopo (Strict Boundary)

### Arquivos Afetados (APENAS estes arquivos podem ser alterados):
- `[MODIFY]` `caminho/do/arquivo.ts`
- `[NEW]` `caminho/do/novo_arquivo.ts`
- `[DELETE]` `caminho/do/arquivo_obsoleto.ts`

> [!WARNING]
> É estritamente proibido alterar arquivos não listados acima. Descobertas fora do escopo devem ser anotadas em `.planning/BACKLOG.md`.

## 3. Contratos de Tipagem & Interfaces (Signatures)
```typescript
// Assinaturas das novas funções, classes ou rotas
export interface NovaFuncionalidadeInput {
  id: string;
  // ...
}
```

## 4. Casos de Teste (TDD - Red/Green)
- [ ] **Teste 1**: Deve retornar status 200 quando os dados forem válidos.
- [ ] **Teste 2**: Deve bloquear e retornar 400 quando o parâmetro X for inválido.
- [ ] **Teste 3**: Deve garantir isolamento por `tenant_id`.

## 5. Definition of Done
1. `npm run check:all` passando com 100% de sucesso.
2. Zero `any` e tipagem estrita respeitada.
3. Decisão sincronizada em `.planning/STATE.md`.
