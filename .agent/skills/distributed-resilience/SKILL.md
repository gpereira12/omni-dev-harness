---
name: distributed-resilience
description: Distributed systems resilience, caching strategies, anti-patterns, failover, consistent hashing, and messaging patterns.
always_use: false
---

# ⚡ Distributed Resilience & Messaging

## 1. Caching Strategies
- **Cache-Aside (Lazy Loading)**: Read from cache. On miss, read from DB, populate cache with TTL, return. Invalidate (`DEL key`) on mutation. (Standard 90% of cases).
- **Write-Through**: Application writes to cache, which synchronously writes to DB.
- **Write-Behind (Write-Back)**: Writes to cache first; cache flushes to DB asynchronously in batches.
- **Distributed Cache Cluster**: Redis Cluster / Upstash / Cloudflare Edge Cache.

## 2. Distributed Anti-Patterns & Mitigations
- **Dual-Write Problem**: Writing to DB and queue in separate uncommitted steps. 👉 **Fix**: Transactional Outbox Pattern.
- **Cache Stampede**: Multiple threads recalculating an expired key simultaneously. 👉 **Fix**: Mutex Locks (Redlock) or Probabilistic Early Expiration (XFetch).
- **Poison Message**: Malformed message crashing consumer in loop. 👉 **Fix**: Retry with Exponential Backoff + immediate dead-lettering into **DLQ**.
- **Race Conditions**: Concurrent updates on shared resource. 👉 **Fix**: Optimistic Locking (`@Version`), Pessimistic Locking (`SELECT FOR UPDATE`), or Redis Distributed Lock.
- **Timing Attacks**: Comparing sensitive tokens with `===`. 👉 **Fix**: Constant-time comparison (`crypto.timingSafeEqual`).

## 3. High Availability & Partitioning
- **Failover Pattern**: Automatic standby activation via load balancer / health checks.
- **Consistent Hashing**: Hash ring (0 to $2^{32}-1$) with virtual nodes. Minimizes key remapping when adding/removing cache nodes ($k/N$ remapping).
- **Circuit Breaker**: States: `Closed` (normal) ➔ `Open` (fail fast on threshold) ➔ `Half-Open` (test recovery).

## 4. Messaging Matrix (Enterprise vs Low-Cost)
- **Google Cloud Pub/Sub**: Serverless push subscriptions directly to Cloud Run HTTP endpoints with auto-scale to zero. Free tier: 10 GB/month.
- **PostgreSQL SKIP LOCKED (Zero-Cost)**: `SELECT ... FOR UPDATE SKIP LOCKED` (`pg-boss` / `graphile-worker`) for transactional zero-cost queues without external brokers.
- **RabbitMQ**: Advanced AMQP routing exchanges and granular acknowledgments.
- **Apache Kafka**: High-throughput event streaming with log retention and replay.
