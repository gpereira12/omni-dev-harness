# 🏛️ OMNI-SAF: Software Architecture Framework

O **OMNI-SAF** é o framework metodológico do ecossistema para desenhar, documentar, avaliar e auditar sistemas de software.

---

## 1. O Modelo C4 de Representação Arquitetural

Todo sistema deve ser compreendido e documentado em 4 níveis de zoom:

```
[ Nível 1: Contexto ]   -> Quem são os usuários externos e quais sistemas terceiros se conectam?
[ Nível 2: Contêineres] -> Quais são as aplicações, bancos de dados, filas e serviços que rodam?
[ Nível 3: Componentes] -> Dentro de um serviço, quais são os módulos (Controllers, Use Cases, Repositories)?
[ Nível 4: Código ]     -> Como as classes, interfaces e funções estão estruturadas internamente?
```

---

## 2. Domain-Driven Design (DDD) Estratégico

Antes de dividir o código em microsserviços ou módulos, o agente deve mapear:

1. **Core Domain (O Coração do Negócio)**: O que nos diferencia dos concorrentes (ex: Motor de Alocação de Horários do Scheduler, Algoritmo de Precificação).
2. **Supporting Domain (Domínios de Apoio)**: Necessários para a operação, mas não são o diferencial único (ex: Gestão de Contratos do Aluno, Controle de Presença).
3. **Generic Domain (Domínios Genéricos)**: Componentes commoditizados que devemos terceirizar ou usar libs prontas (ex: Auth com Supabase/Clerk, Envio de emails com Resend).

---

## 3. Matriz de Decisão PACELC & CAP

Em arquiteturas distribuídas, todo design deve documentar formalmente suas escolhas:

| Cenário | Escolha OMNI | Justificativa |
| :--- | :--- | :--- |
| **Sob Partição de Rede (P)** | **Consistência (C)** para Financeiro/Matrícula<br>**Disponibilidade (A)** para Catálogo/Storefront | Transações financeiras não podem aceitar pagamentos duplicados; catálogo pode servir dados ligeiramente defasados. |
| **Em Operação Normal (E)** | **Baixa Latência (L)** para leitura via Cache<br>**Consistência (C)** para escrita transacional | Otimiza a experiência de leitura mantendo a integridade no banco. |

---

## 4. Architectural Fitness Functions (Testes de Arquitetura)

A arquitetura não pode ser apenas um documento esquecido; ela deve ser validada por testes automáticos no CI/CD:
- **Regra de Dependência**: O Core de Negócio nunca pode importar pacotes de infraestrutura (`@prisma/client`, `express`, `axios`).
- **Complexidade Ciclomática**: Nenhuma função pode exceder complexidade ciclomática > 10.
- **Tamanho de Arquivo**: Módulos não devem ultrapassar 300 linhas de código.

---

## 5. Template Canônico de ADR (Architecture Decision Record)

Toda decisão estrutural no projeto deve ser registrada em `.planning/adr/ADR-XXX.md`:

```markdown
# ADR-001: [Título Curto da Decisão]

## Status
[ Proposed | Accepted | Deprecated | Superseded by ADR-YYY ]

## Contexto e Problema
[ Qual é o problema de negócio ou técnico que estamos tentando resolver? ]

## Decisão Escolhida
[ Qual padrão, ferramenta ou arquitetura escolhemos implementar? ]

## Consequências
- **Positivas**: [ O que ganhamos em performance, manutenibilidade ou custo? ]
- **Negativas / Trade-offs**: [ Qual complexidade ou overhead estamos assumindo conscientemente? ]
```
