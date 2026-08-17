# 🛡️ Bank-Grade Security & Hardening Checklist

Este checklist deve ser validado por todo agente de IA e engenheiro antes de aprovar qualquer endpoint, autenticação ou infraestrutura.

---

## 1. HTTP Headers & Transport Layer Security
- [ ] **HSTS**: `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` (força HTTPS).
- [ ] **Anti-Clickjacking**: `X-Frame-Options: DENY` (impede que o site seja embutido em iframes maliciosos).
- [ ] **MIME Sniffing**: `X-Content-Type-Options: nosniff`.
- [ ] **CSP**: `Content-Security-Policy: default-src 'self'; object-src 'none';`.
- [ ] **CORS**: Whitelist estrita de domínios permitidos (`origin: ["https://app.meudominio.com"]`). **Nunca** usar `origin: "*"` com `credentials: true`.

---

## 2. Authentication & Session Security
- [ ] **Cookies**: Tokens sensíveis trafegam estritamente com flags `HttpOnly; Secure; SameSite=Lax`.
- [ ] **Zero LocalStorage**: Tokens de longa duração nunca são salvos em `localStorage` ou `sessionStorage`.
- [ ] **Refresh Token Rotation**: Ao usar um refresh token, o token anterior é invalidado e substituído imediatamente.
- [ ] **Timing Attack Prevention**: Validação de hashes/tokens usando comparação de tempo constante (`crypto.timingSafeEqual`).

---

## 3. Input Sanitization & SSRF Defense
- [ ] **SSRF Firewall**: Toda chamada HTTP de saída (Webhooks / URLs de usuários) bloqueia o range de IPs privados:
  - `127.0.0.0/8` (Loopback)
  - `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16` (Redes Privadas)
  - `169.254.169.254` (Cloud Metadata Endpoint)
- [ ] **XSS Defense**: Sanitização de HTML com `DOMPurify` antes de renderizar qualquer conteúdo de usuário.
- [ ] **SQLi Defense**: 100% de consultas com parâmetros tipados (Prisma, Drizzle, ou `$1, $2` no SQL puro).

---

## 4. Field-Level Encryption & Data Protection
- [ ] **PII Protection**: Documentos sensíveis (CPF, Dados Médicos, Chaves PIX) criptografados com **AES-256-GCM** na aplicação antes de persistir no banco.
- [ ] **Audit Trail Imutável**: Toda alteração em dados sensíveis registra `who`, `when`, `what`, `IP` e `before/after` hashes.

---

## 5. AI & LLM Security (OWASP Top 10 for LLMs)
- [ ] **Indirect Prompt Injection**: Documentos e inputs externos são encapsulados em tags de dados não-confiáveis (`<untrusted_content>`).
- [ ] **Denial of Wallet**: Quota estrita de tokens e chamadas de LLM por usuário/hora.
- [ ] **Output Validation**: Todo output de modelo que aciona ferramentas de banco ou API passa por validação de schema **Zod** estrito.
