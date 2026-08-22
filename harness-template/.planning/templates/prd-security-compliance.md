---
id: PRD-{{NUMBER}}
title: {{TITLE}}
type: security-compliance # Segurança, OWASP Top 10, Hardening, LGPD/GDPR, Rate Limit
status: Draft # Draft | In Review | Approved
author: {{AUTHOR}}
date: {{DATE}}
---

# PRD-{{NUMBER}}: {{TITLE}}

## 1. Contexto de Segurança & Vetor de Ameaça
- **Superfície Exposta:** Endpoints públicos, formulários de entrada, headers HTTP, dados pessoais (PII).
- **Vulnerabilidade ou Risco:** (ex: Falta de Rate Limiting, XSS, CSRF, Injeção SQL, Vazamento de PII, Clickjacking).

## 2. Modelagem de Ameaças (STRIDE Matrix)
| Categoria de Ameaça | Vetor de Ataque Possível | Contramedida / Proteção Implementada |
| :--- | :--- | :--- |
| **Spoofing (Identidade)** | Forja de cabeçalhos / IPs | Validação via `trust proxy` e WIF |
| **Tampering (Adulteração)** | Injeção de scripts / payloads | Helmet CSP restrito e validação Zod |
| **Repudiation (Repúdio)** | Ações não rastreáveis | Trilha de auditoria imutável com actor_id |
| **Information Disclosure** | Vazamento de stack trace ou headers | Remoção de `X-Powered-By` e logs limpos |
| **Denial of Service (DoS)** | Requisições em massa / brute force | Rate Limiting em Redis por IP/tenant |
| **Elevation of Privilege** | Acesso indevido cross-tenant | Validação obrigatória de `tenant_id` no DB |

## 3. Políticas de Sanitização & Headers de Segurança
- **Headers HTTP Obrigatórios (Helmet):** CSP, HSTS, X-Content-Type-Options: nosniff, X-Frame-Options.
- **Políticas de Rate Limit:**
  - Rotas públicas gerais: Ex: 120 req/min por IP.
  - Rotas críticas de mutação/auth: Ex: 5 req/min por IP.

## 4. Conformidade com Privacidade (LGPD / GDPR)
- **Dados Pessoais Sensíveis (PII):** Identificação de CPF, e-mails, telefones ou senhas.
- **Armazenamento Seguro:** Proibição de senhas em texto puro (bcrypt/argon2) e retenção segura de logs.

## 5. Critérios de Aceite & Validação de Segurança
- Scanners de segurança e linters de segurança (`eslint-plugin-security`) passam com 0 vulnerabilidades.
- Requisições que excedam limites de abuso recebem `429 Too Many Requests` com cabeçalho `Retry-After`.
