---
id: PRD-{{NUMBER}}
title: {{TITLE}}
type: platform-infra # Performance, Caching, Infraestrutura Cloud, Resiliência
status: Draft # Draft | In Review | Approved
author: {{AUTHOR}}
date: {{DATE}}
---

# PRD-{{NUMBER}}: {{TITLE}}

## 1. Problema de Plataforma & Gargalo Identificado
- **Métrica Afetada:** Latência (p95/p99), Consumo de Memória, Custo Cloud, Taxa de Erro 5xx.
- **Ambiente Afetado:** Google Cloud Run, Cloud SQL, Redis Memorystore, Edge CDN.

## 2. Orçamento de Performance & SLAs (Service Level Objectives)
| Métrica | Meta / SLA Alvo | Situação Atual | Impacto |
| :--- | :--- | :--- | :--- |
| **TTFB (Time to First Byte)** | < 30ms (Cache Hit) | 250ms | Melhoria de SEO e UX |
| **Throughput / Concorrência** | 100 req/s sem degradação | 20 req/s | Suporte a picos de tráfego |
| **Disponibilidade / Uptime** | 99.95% | 99.5% | Redução de quedas |

## 3. Estratégia de Cache & Invalidação
- **Camada L1 (In-Memory LRU):** TTL, tamanho máximo de entradas e Negative Cache (0ms para 404).
- **Camada L2 (Redis Compartilhado):** Chaves com prefixo de tenant (`tenant:{id}:resource:{key}`).
- **Gatilho de Invalidação:** Webhook ou evento Pub/Sub de purge com invalidação cirúrgica.

## 4. Resiliência, Graceful Lifecycle & Concorrência
- **Circuit Breaker:** Limiar de falhas para abertura de circuito e tempo de half-open.
- **Graceful Shutdown:** Manipulação de `SIGTERM`/`SIGINT` com drain de conexões antes do encerramento.
- **Otimização de Custos (FinOps):** Auto-scaling de 0 a N, descarte de instâncias ociosas.

## 5. Critérios de Aceite & Testes de Carga
- O sistema mantém os SLAs definidos sob carga simulada.
- O encerramento do container não corta conexões ativas de clientes.
