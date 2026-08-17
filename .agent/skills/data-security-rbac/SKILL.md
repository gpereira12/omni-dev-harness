---
name: data-security-rbac
description: Data security, RBAC/ABAC authorization, Database per Service, Soft Delete pattern, Rate Limiting algorithms, Presigned URLs, and LGPD/GDPR compliance.
always_use: false
---

# 🔒 Data Security, RBAC & Storage

## 1. Authentication & Role-Based Access Control (RBAC)
- **Token Claims**: Embed verified roles into JWT/Session claims.
- **Authorization Enforcement**: Use **CASL** or NestJS / Next.js middleware guards.
- **Strict Role Boundaries**: Enforce least-privilege principles across controllers, use-cases, and database queries.

## 2. Database per Service & Isolation
- Each microservice strictly owns its database.
- Direct cross-database SQL queries are forbidden. Inter-service communication happens strictly via typed APIs or async events.

## 3. Soft Delete Pattern
- Logical deletion with `is_deleted = true` and `deleted_at = TIMESTAMP`.
- Exclude deleted records from standard queries by default.
- Allows immediate recovery, preserves foreign key integrity, and enables audit compliance.
- Hard purge strategy: Move records with `deleted_at > 90 days` to cold storage (S3/GCS Parquet).

## 4. Rate Limiting & Throttling
- **Token Bucket**: Allows short bursts while maintaining average throughput.
- **Sliding Window Counter**: High-precision rate limiting per IP and per authenticated UserID using Redis.
- Apply strict limits to sensitive routes (login, password reset, AI endpoints).

## 5. Storage & File Uploads
- **Presigned URLs**: Direct client-to-storage uploads (Google Cloud Storage, AWS S3, Cloudflare R2).
- Never pass large binary files through the application API server.

## 6. Immutable Audit Trail & LGPD/GDPR
- Record every critical data mutation with `eventId`, `timestamp` (UTC), `actorId`, `action`, `entity`, `before` and `after` payloads.
- Anonymize personal identifiable information (PII) upon user account deletion requests while preserving financial transaction records.
