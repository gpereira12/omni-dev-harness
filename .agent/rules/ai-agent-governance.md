---
trigger: always_on
---

# 🤖 AI Agent Governance & Model Tiering

## 1. Model Tiering Strategy
To optimize cost and latency, agents must adhere to the two-tier execution model:
- **Tier 1 (Lightweight / 90% of tasks)**: Gemini 2.0 Flash, Flash-Lite, Claude Haiku, GPT-4o-mini.
  - *Uses*: Routing, classification, schema extraction, RAG summarization, log triage, simple CRUD code.
- **Tier 2 (Deep Reasoning / 10% of tasks)**: Gemini 3.7 Pro, Claude 3.7 Sonnet.
  - *Uses*: Complex architectural decisions, multi-step math/scheduling solvers, massive refactorings, security audits.

## 2. Context Management: "Context is a Budget"
- Subagents run in isolated, ephemeral contexts.
- Subagents must return only structured summaries to the parent orchestrator to prevent context pollution and hallucinations.
- Use Semantic Caching (Redis + Embeddings) for repeated user inquiries.

## 3. Cognitive Patterns
- **ReAct Loop**: Use for exploratory research, debugging, and dynamic investigation.
- **Plan-and-Execute**: Use for deterministic workflows, migrations, scaffolding, and CI/CD pipelines.

## 4. Guardrails & Human-in-the-Loop (HITL)
- Destructive actions (dropping database tables, mass refunds, account deletions) MUST NOT execute autonomously. They require explicit human approval via a pending state.
- Validate all agent outputs against Zod/JSON Schemas before invoking downstream APIs or tools.
