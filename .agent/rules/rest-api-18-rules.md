---
trigger: always_on
---

# 📜 The 18 Universal REST API Rules

Every HTTP API in this ecosystem must adhere to the following 18 non-negotiable rules:

1. **Use Plural Nouns**: Resources are collections. Use `/users`, `/orders`, `/products` (never `/user` or `/getUser`).
2. **Avoid Deep Nesting**: Limit nesting to at most 2 levels (e.g., `/users/123/orders`). If deeper, elevate to a top-level resource (e.g., `/order-items/456/refunds`).
3. **Match HTTP Methods to Intent**:
   - `GET`: Safe, idempotent read.
   - `POST`: Create resource or non-idempotent action.
   - `PUT`: Complete resource replacement (idempotent).
   - `PATCH`: Partial update.
   - `DELETE`: Removal (idempotent).
4. **Return 201 + Location on Create**: Return `201 Created` with a `Location: /v1/resources/res_123` header.
5. **Support Conditional Requests**: Honor `ETag`, `If-None-Match` (returns `304 Not Modified`) and `If-Match` (returns `412 Precondition Failed`).
6. **Never Expose Raw DB IDs**: Never expose sequential integers (`1, 2, 3`). Use **UUIDv7**, **ULID**, **CUID2**, or domain-prefixed IDs (e.g., `usr_01h8x4...`).
7. **Keep URLs Lowercase & Hyphenated**: Always use kebab-case (`/user-profiles`, `/order-cancellations`).
8. **Avoid Verbs in the Path**: The HTTP method defines the verb. Use `DELETE /users/123` (not `/users/123/delete`) and `PATCH /orders/123` with `{ "status": "canceled" }` (or `POST /orders/123/cancellations`).
9. **Version From Day One**: Use URI path versioning `/v1/users` or custom headers `Accept: application/vnd.omni.v1+json`.
10. **Make Errors Actionable (RFC 7807 / RFC 9457)**: Return structured problem details with `type`, `title`, `status`, `detail`, `code`, and `invalidParams`.
11. **Support Sparse Fieldsets**: Allow clients to request specific fields (e.g., `GET /users?fields=id,name,avatarUrl`).
12. **Honor Content Negotiation**: Respect `Accept`, `Content-Type`, `Accept-Language`, and `Accept-Encoding: gzip, br`.
13. **Make Writes Safe to Retry (Idempotency Keys)**: Require `Idempotency-Key: <uuid>` on critical mutation endpoints (payments, orders).
14. **Never Leak Stack Traces**: Production responses must never expose internal driver errors or stack traces. Return generic safe messages with a `correlationId`.
15. **Return ISO 8601 Timestamps in UTC**: APIs and databases must communicate and store timestamps strictly in UTC with the `Z` suffix (`YYYY-MM-DDTHH:mm:ss.sssZ`). Presentation timezones (e.g., `America/Sao_Paulo`) are handled by the client UI.
16. **Avoid Over-and Under-Fetching**: Support controlled relation embedding (e.g., `GET /v1/orders?embed=items,customer`).
17. **Announce Deprecations Early**: Use HTTP headers `Deprecation: @timestamp` and `Sunset: <date>` with migration links.
18. **Enforce Request Size Limits**: Enforce payload limits (`413 Payload Too Large`, max 1MB-5MB for JSON). File uploads must use **Presigned URLs** directly to object storage.
