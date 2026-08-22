---
id: PRD-{{NUMBER}}
title: {{TITLE}}
type: feature-ui-ux # UI, Telas, Componentes, Jornadas Visuais
status: Draft # Draft | In Review | Approved
author: {{AUTHOR}}
date: {{DATE}}
---

# PRD-{{NUMBER}}: {{TITLE}}

## 1. Problema de Negócio & Oportunidade
- **O que precisa ser resolvido:** Descreva a dor do usuário ou a oportunidade de produto.
- **Impacto Esperado:** Métrica ou valor de negócio pretendido (ex: conversão, retenção, usabilidade).

## 2. Personas & Jornadas do Usuário (User Journey)
- **Persona Principal:** Quem utiliza esta interface/recurso.
- **Fluxo Principal (Happy Path):**
  1. Usuário acessa o recurso X.
  2. Interage com o componente Y.
  3. Recebe o feedback visual Z.

## 3. Especificação de UI/UX & Estados da Interface
- **Hierarquia Visual & Responsividade:**
  - Desktop / Tablet / Mobile (Touch targets mínimos de 44px conforme Apple HIG).
- **Matriz de Estados Visuais (4-State Async Pattern):**
  - **1. Idle / Inicial:** Estado padrão do componente antes da interação.
  - **2. Loading / Skeleton:** Feedback visual imediato durante operações assíncronas.
  - **3. Empty State:** O que renderizar quando não houver dados disponíveis.
  - **4. Error State com Retry:** Mensagem amigável com botão de tentar novamente.

## 4. Requisitos Funcionais (Regras de Produto)
- [ ] **RF-01**: Comportamento do componente ou tela sob ação do usuário.
- [ ] **RF-02**: Filtros, buscas e paginação com debounce.
- [ ] **RF-03**: Fallbacks e valores padrão da interface.

## 5. Requisitos Não-Funcionais & Acessibilidade
- [ ] **RNF-01**: Acessibilidade WCAG AA (navegação por teclado, contraste e atributos ARIA).
- [ ] **RNF-02**: Performance de renderização (Zero layout shifts - CLS < 0.1).

## 6. Critérios de Aceite (Definition of Acceptance)
- Dado que o usuário interage com o recurso X, então o comportamento Y deve ocorrer.
- Dado que a busca não retorna resultados, o Empty State estruturado deve ser exibido.
