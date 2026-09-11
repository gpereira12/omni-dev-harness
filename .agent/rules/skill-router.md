---
trigger: always_on
---

# 🚦 SKILL ROUTER: Dynamic Context Activation

You are a context-aware engineer. To prevent context bloat and token waste, skills are set to `always_use: false`. You MUST dynamically activate the relevant skill sets based on the user's domain and request.

## 1. Domain Mapping

| Domain | Skill to Activate | Key Triggers |
| :--- | :--- | :--- |
| **Discovery & Planning** | `.agent/skills/master-protocol/` | Start Project, Discovery, New Feature, Architecture Assessment |
| **Software Architecture** | `.agent/skills/software-architecture/` | Hexagonal, Outbox, Saga, CQRS, ACL, Sidecar, Bulkhead, BFF |
| **Frontend & Mobile** | `.agent/skills/frontend-design-system/` | UI, Next.js, Vite, Astro, React Native, Swift, Kotlin, Shadcn, 21st.dev |
| **PWA & Mobile Híbrido** | `.agent/skills/pwa-mobile-architecture/` | PWA, Service Worker, Capacitor, Manifest, WebAPK, Offline-First, Workbox, Push Mobile |
| **UX & Psicologia** | `.agent/skills/ux-behavioral-psychology/` | UX, Leis de UX, Hick, Fitts, Doherty, Carga Cognitiva, Apple, Google |
| **Resilience & Distributed** | `.agent/skills/distributed-resilience/` | Caching, Redis, PubSub, Queues, DLQ, Failover, Consistent Hashing |
| **DevOps & Cloud (GCP)** | `.agent/skills/gcp-devops-infra/` | Cloud Run, Cloud SQL, Secret Manager, Pub/Sub, Terraform, Pulumi, Migrations |
| **Data Security & Auth (AuthN/AuthZ)** | `.agent/skills/data-security-rbac/` | AuthN, AuthZ, Google Identity, GCIP, Passkeys, OAuth, Concordia, AccessGroups, PermissionTranslator, RBAC, ABAC, ReBAC, CASL, Soft Delete, Presigned URLs, Rate Limiting, Audit |
| **PHP & Moodle LMS** | `.agent/skills/php-moodle-architecture/` | PHP, Moodle, LMS, Plugin, Composer, PHPStan, Eloquent, Doctrine, MUC, XMLDB, FrankenPHP |

## 2. Dynamic Activation Protocol

1. **Detect Context**: Analyze the user prompt to identify which domain is being addressed.
2. **Explicit Read**: Use `view_file` on the corresponding `SKILL.md` before generating code or architecture decisions.
3. **Budget Constraint**: Do not load multiple unrelated skills in the same turn. If the task is purely frontend, do not load database migration skills.
