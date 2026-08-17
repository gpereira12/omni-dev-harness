---
name: software-architecture
description: Enterprise software architecture patterns including Hexagonal, Transactional Outbox, Saga, CQRS, ACL, Sidecar, Bulkhead, BFF, and API Gateway.
always_use: false
---

# 🏛️ Software Architecture Patterns

## 1. Hexagonal Architecture (Ports & Adapters)
- **Application Core**: Pure business entities, use cases, domain services. Zero dependencies on frameworks, ORMs, or HTTP libraries.
- **Input Ports**: Interfaces defining application capabilities (invoked by Controllers, Resolvers, CLI).
- **Output Ports**: Interfaces defining external dependencies (implemented by DB Repositories, Email, Payment Adapters).
- **Benefit**: Pure testability and framework independence.

## 2. Transactional Outbox Pattern
- **Problem**: Solves the Dual-Write Problem (saving to DB + publishing to message broker are not atomic).
- **Mechanism**: Writes business data and an `Outbox` event row in the **same ACID database transaction**. A background relay worker reads unpublished events and delivers them to the broker (Pub/Sub, Kafka, RabbitMQ) with at-least-once guarantee.

## 3. Saga Pattern (Distributed Transactions)
- **Mechanism**: Replaces 2PC in distributed systems. Each service executes its local transaction. If any step fails, compensating (rollback) actions are executed in reverse order.
- **Choreography**: Services react to events directly.
- **Orchestration**: A central Saga Orchestrator manages the workflow state machine.

## 4. CQRS (Command Query Responsibility Segregation)
- **Command Path**: Optimized for data integrity, domain rules, and write mutations.
- **Query Path**: Reads from denormalized, high-speed read projections or search engines (Elastic/Meili).

## 5. Anti-Corruption Layer (ACL)
- **Mechanism**: Mediates between modern domain core and messy external/legacy APIs.
- **Components**: Protocol Adapter + Data Mapper + Boundary Validator. Protects domain language and contracts.

## 6. Sidecar Pattern
- Companion container in the same Pod handling logging, mTLS, tracing, and secrets, keeping the main application code clean.

## 7. Bulkhead Pattern
- Isolates resource pools (thread pools, connection pools, memory quotas) per downstream service to prevent whole-system exhaustion.

## 8. Backend for Frontend (BFF) & API Gateway
- **API Gateway**: Single entry point for routing, authentication, rate limiting, and CORS.
- **BFF**: Tailored backend aggregation layer per client interface (Web vs Mobile vs Partner).
