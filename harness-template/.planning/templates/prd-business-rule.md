---
id: PRD-{{NUMBER}}
title: {{TITLE}}
type: business-rule # Regras de Domínio, Autenticação, Finanças, RBAC
status: Draft # Draft | In Review | Approved
author: {{AUTHOR}}
date: {{DATE}}
---

# PRD-{{NUMBER}}: {{TITLE}}

## 1. Contexto de Negócio & Objetivo
- **Domínio / Módulo:** (ex: Billing, Auth, Assinaturas, Estoque, Pedidos).
- **Objetivo da Regra:** Por que esta regra existe e o que ela protege/garante no negócio.

## 2. Atores & Matriz de Permissões (RBAC)
| Papel / Role | Permissão de Leitura | Permissão de Escrita / Ação | Restrições Especiais |
| :--- | :--- | :--- | :--- |
| `Admin / Owner` | ✅ Total | ✅ Total | Nenhuma |
| `Member / User` | ⚠️ Próprio tenant | ⚠️ Ações permitidas | Filtro estrito por tenant_id |
| `Anonymous / Public` | ❌ Bloqueado | ❌ Bloqueado | Exige autenticação |

## 3. Tabela de Decisão de Negócio (Decision Matrix)
| Condição A | Condição B | Condição C | Resultado Esperado / Ação do Sistema |
| :--- | :--- | :--- | :--- |
| Ex: Status Ativo | Pagamento OK | Dentro do prazo | ✅ Permitir acesso ao recurso |
| Ex: Status Inativo | Qualquer | Qualquer | ❌ Bloquear e retornar erro de suspensão |
| Ex: Status Ativo | Pagamento Atrasado | Período de tolerância | ⚠️ Permitir com alerta de inadimplência |

## 4. Máquina de Estados / Ciclo de Vida da Entidade
```
[Rascunho / Pendente] ──> [Processando] ──> [Aprovado / Ativo]
                               │
                               └──> [Falhou / Rejeitado] ──> [Cancelado]
```

## 5. Requisitos de Auditoria & Conformidade
- [ ] **RA-01**: Registro de trilha de auditoria imutável (`actor_id`, `action`, `timestamp UTC`, `before`, `after`).
- [ ] **RA-02**: Isolamento estrito multi-tenant (proibido cross-tenant leakage).

## 6. Critérios de Aceite (Gherkin)
- **Cenário 1**: Execução com sucesso sob condições válidas.
- **Cenário 2**: Bloqueio e feedback acionável quando a regra for violada.
