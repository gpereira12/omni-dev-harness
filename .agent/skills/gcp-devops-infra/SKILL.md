---
name: gcp-devops-infra
description: Google Cloud Platform (GCP) DevOps standards, Cloud Run, Cloud SQL, Secret Manager, Pub/Sub, IaC (OpenTofu/Pulumi), and zero-downtime database migrations.
always_use: false
---

# ☁️ GCP DevOps & Infrastructure Standard

## 1. Hosting Platforms Decision Matrix (GCP vs Supabase vs Vercel vs Cloudflare)

| Platform | When to Recommend | When NOT to Use |
| :--- | :--- | :--- |
| **Google Cloud (Cloud Run + Cloud SQL)** | Enterprise systems, heterogenous microservices, Pub/Sub messaging, full VPC security. | Quick prototypes with zero DevOps budget. |
| **Vercel** | Next.js frontends with Edge Functions, rapid PR Preview Deploys, landing pages. | Long-running background workers or heavy compute tasks. |
| **Supabase** | Rapid MVP/SaaS with PostgreSQL, Auth, Row Level Security (RLS), Realtime & Storage in 5 minutes. | Highly complex enterprise databases with massive legacy stored procedures. |
| **Cloudflare Workers / Pages** | Ultra-low-latency edge applications (<20ms), edge KV storage, Cloudflare Queues. | Applications requiring full Node.js native C++ binary bindings. |

## 2. Google Cloud Serverless Suite
- **Compute**: Google Cloud Run (Auto-scale 0 to N, Concurrency = 80, CPU allocation on request).
- **Database**: Google Cloud SQL (PostgreSQL 16) connected via **Cloud SQL Auth Proxy** / Unix Sockets with IAM Auth.
- **Secrets**: Google Secret Manager with environment variable injection directly into container memory (Zero `.env` on disk).
- **Messaging**: Google Cloud Pub/Sub with Push Subscriptions to Cloud Run and Dead-Letter Topics.
- **Observability**: Cloud Logging (Structured JSON), Cloud Trace (Distributed Tracing), Cloud Error Reporting (Automatic exception grouping).
- **Releases**: Immutable revisions with Traffic Splitting for zero-downtime Blue-Green / Canary deploys.

## 2. Infrastructure as Code (IaC)
- **OpenTofu / Terraform**: Declarative infrastructure in HCL with GCS remote state backend.
- **Pulumi (TypeScript)**: Type-safe, programmatically defined GCP infrastructure using `@pulumi/gcp`.

## 4. Zero-Downtime Database Migrations
- **Rule 1**: NEVER execute migrations in application start command (`CMD ["npm", "start"]`). Execute as an isolated **Cloud Run Job** during CI/CD deploy.
- **Rule 2 (Expand & Contract)**:
  - *Phase 1 (Expand)*: Add new column as nullable. Application writes to both.
  - *Phase 2 (Backfill)*: Asynchronously backfill historical data.
  - *Phase 3 (Contract)*: Drop old column in subsequent release.
- **Rule 3**: Create PostgreSQL indexes concurrently (`CREATE INDEX CONCURRENTLY`) to avoid table write locks.
- **Rule 4**: Always set safety lock timeouts: `SET lock_timeout = '3s';`.

---

## 5. Cloud FinOps & Cost Governance
- **Concurrency**: `concurrency = 80` nos containers do Cloud Run para dividir o custo de vCPU por 80.
- **Scale-to-Zero**: `min-instances = 0` para ambientes de desenvolvimento, staging e workers de fila.
- **Storage Lifecycle**: Transição automática no GCS: Standard (0-30d) ➔ Nearline (31-90d) ➔ Coldline (>90d).
- **Billing Hard Caps**: Alertas automáticos no GCP Billing aos 50%, 80% e 100% do orçamento mensal.
