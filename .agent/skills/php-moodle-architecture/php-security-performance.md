---
name: php-security-performance
description: Enterprise PHP security hardening (SQL Injection, XSS, CSRF, Argon2id, CSP), Moodle authorization model (capabilities, sesskey, PARAM_* sanitization), production performance tuning (OPcache, JIT, FrankenPHP, MUC tiering), and multi-stage Docker builds.
always_use: false
---

# 🔐 PHP Security & Performance Hardening

## 1. SQL Injection Prevention

**Rule**: Zero string concatenation in SQL. 100% parameterized queries — no exceptions.

### PDO (Generic PHP)

```php
declare(strict_types=1);

// ✅ Named placeholders with strict type binding
$stmt = $pdo->prepare(
    'SELECT id, email, status FROM users WHERE tenant_id = :tenant_id AND status = :status'
);
$stmt->execute([
    'tenant_id' => $tenantId->toString(),
    'status'    => OrderStatus::Active->value,
]);
$users = $stmt->fetchAll(\PDO::FETCH_ASSOC);
```

### Moodle `$DB` (DML Layer)

```php
// ✅ Always use named placeholders via $DB API
$sql = "SELECT u.id, u.username, u.email
          FROM {user} u
          JOIN {role_assignments} ra ON ra.userid = u.id
         WHERE ra.roleid = :roleid AND ra.contextid = :contextid";
$users = $DB->get_records_sql($sql, ['roleid' => $roleid, 'contextid' => $contextid]);

// ✅ IN clauses — use $DB helper for cross-DB compatibility
[$insql, $inparams] = $DB->get_in_or_equal($courseids, SQL_PARAMS_NAMED);
$sql = "SELECT * FROM {local_nexus_sync} WHERE courseid {$insql}";
$records = $DB->get_records_sql($sql, $inparams);

// ❌ NEVER do this
$sql = "SELECT * FROM {user} WHERE id = " . $_GET['id'];  // SQL Injection vector
```

---

## 2. Password Hashing — Argon2id

Argon2id is the industry standard (resistant to GPU brute-force and side-channel attacks):

```php
declare(strict_types=1);

// Hashing
$hash = password_hash($plainPassword, PASSWORD_ARGON2ID, [
    'memory_cost' => 65536,   // 64 MB
    'time_cost'   => 4,       // 4 iterations
    'threads'     => 1,       // Single-threaded (prevents parallel attacks)
]);

// Verification with transparent rehashing
if (password_verify($plainPassword, $storedHash)) {
    if (password_needs_rehash($storedHash, PASSWORD_ARGON2ID, [
        'memory_cost' => 65536,
        'time_cost'   => 4,
        'threads'     => 1,
    ])) {
        $newHash = password_hash($plainPassword, PASSWORD_ARGON2ID);
        $userRepository->updatePasswordHash($userId, $newHash);
    }
    // Authentication successful.
}
```

---

## 3. XSS Prevention

### Generic PHP

- **Template Engines**: Twig (`{{ var }}`) and Blade (`{{ $var }}`) auto-escape by default. Never use `{!! $var !!}` or `|raw` on user input.
- **Manual Escaping**: `htmlspecialchars($input, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8')` for any raw HTML context.
- **JSON in HTML**: `json_encode($data, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_THROW_ON_ERROR)`.

### Moodle-Specific Output Functions

| Function | Use Case | What It Does |
| :--- | :--- | :--- |
| `format_string($text)` | Headings, names, titles | Strips HTML, applies multilang filter |
| `format_text($text, $format, $opts)` | Rich user content (forums, descriptions) | HTMLPurifier + LaTeX/MathJax + media embeds |
| `s($value)` | Inside HTML attributes | `htmlspecialchars()` equivalent |
| `p($value)` | Direct echo with escaping | Prints `s($value)` directly |
| `clean_text($text)` | Aggressive HTML purification | Full HTMLPurifier pass |

```php
// ✅ Moodle output patterns
echo '<h2>' . format_string($course->fullname) . '</h2>';
echo '<div>' . format_text($course->summary, $course->summaryformat) . '</div>';
echo '<input type="text" value="' . s($user->firstname) . '">';

// ❌ NEVER echo raw user data
echo $user->firstname;   // XSS vector
echo $_GET['search'];    // XSS + injection vector
```

---

## 4. CSRF Protection

### Generic PHP — Double-Submit / Synchronizer Token

```php
// Token generation (store in session)
$_SESSION['csrf_token'] = bin2hex(random_bytes(32));

// Validation on mutation endpoints
if (!hash_equals($_SESSION['csrf_token'], $_POST['csrf_token'] ?? '')) {
    http_response_code(403);
    exit('CSRF token mismatch');
}
```

### Moodle — Sesskey

```php
// In forms / links:
echo html_writer::empty_tag('input', ['type' => 'hidden', 'name' => 'sesskey', 'value' => sesskey()]);
$url = new moodle_url('/local/nexus/action.php', ['sesskey' => sesskey(), 'id' => $id]);

// In processing scripts (MANDATORY on ALL mutation endpoints):
require_sesskey();   // Dies with error if invalid or missing
```

### Cookie Security Headers

```php
// Set-Cookie attributes for session cookies
session_set_cookie_params([
    'lifetime' => 0,
    'path'     => '/',
    'domain'   => '.example.com',
    'secure'   => true,           // HTTPS only
    'httponly'  => true,           // No JavaScript access
    'samesite'  => 'Lax',         // CSRF mitigation
]);
```

---

## 5. Content Security Policy (CSP)

```php
// Nonce-based CSP (recommended)
$nonce = base64_encode(random_bytes(16));

header("Content-Security-Policy: " . implode('; ', [
    "default-src 'self'",
    "script-src 'self' 'nonce-{$nonce}'",
    "style-src 'self' 'unsafe-inline'",         // Required for many UI frameworks
    "img-src 'self' data: https:",
    "font-src 'self' https://fonts.gstatic.com",
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
]));

// Usage in HTML
echo "<script nonce=\"{$nonce}\" src=\"/app.js\"></script>";
```

---

## 6. Moodle Authorization Model

### Capability Enforcement Pipeline

```text
require_login($course)          → Is the user authenticated?
  → require_capability(...)     → Does the user have the required permission in this context?
    → require_sesskey()         → Is this a legitimate (non-CSRF) request?
      → required_param(PARAM_*) → Is the input sanitized and type-safe?
```

### Input Sanitization — `PARAM_*` Types

| Constant | Allowed Values | Use Case |
| :--- | :--- | :--- |
| `PARAM_INT` | Integer only | Database IDs, counts |
| `PARAM_ALPHA` | `[a-zA-Z]` only | Action names, simple identifiers |
| `PARAM_ALPHANUMEXT` | `[a-zA-Z0-9_-]` | Slugs, plugin names |
| `PARAM_TEXT` | Cleaned text, no HTML | Single-line text fields |
| `PARAM_RAW` | No cleaning — **dangerous** | Raw data for later processing (validate manually!) |
| `PARAM_RAW_TRIMMED` | Trimmed raw | Search queries (must escape on output) |
| `PARAM_URL` | Valid URL only | External links, API endpoints |
| `PARAM_BOOL` | `0` or `1` | Toggles, checkboxes |
| `PARAM_FLOAT` | Decimal number | Grades, scores |
| `PARAM_FILE` | Safe filename characters | File names |
| `PARAM_PATH` | Safe file path | Relative file paths |
| `PARAM_COMPONENT` | Frankenstyle component name | `local_nexus`, `mod_quiz` |

```php
// ✅ Correct — always declare expected type
$courseid = required_param('courseid', PARAM_INT);
$action   = optional_param('action', 'view', PARAM_ALPHA);
$search   = optional_param('q', '', PARAM_RAW_TRIMMED);

// ❌ NEVER access superglobals directly
$id = $_GET['id'];       // Unsanitized, type-unsafe
$id = $_POST['action'];  // Same problem
```

---

## 7. Security Hardening Checklist

- [ ] **HSTS**: `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- [ ] **Anti-Clickjacking**: `X-Frame-Options: DENY` + `frame-ancestors 'none'` in CSP
- [ ] **Content-Type Sniffing**: `X-Content-Type-Options: nosniff`
- [ ] **Referrer Policy**: `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] **Permissions Policy**: `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- [ ] **SQLi**: 100% parameterized queries — zero string concatenation in SQL
- [ ] **XSS**: Auto-escaping templates + `format_string()` / `format_text()` / `s()` in Moodle
- [ ] **CSRF**: `require_sesskey()` on every mutation endpoint; `SameSite=Lax` cookies
- [ ] **Password Hashing**: Argon2id with `memory_cost=65536`, `time_cost=4`
- [ ] **CSP**: Nonce-based script policy; `object-src 'none'`; `base-uri 'none'`
- [ ] **File Uploads**: Validate MIME type server-side; store outside webroot; use presigned URLs for downloads
- [ ] **Error Handling**: Never expose stack traces in production; return `correlationId` + generic message
- [ ] **Dependencies**: `composer audit --abandoned=report` in CI; Dependabot / Renovate enabled
- [ ] **PHP Configuration**: `expose_php=Off`, `display_errors=Off`, `log_errors=On`

---

## 8. OPcache & JIT — Production Configuration

```ini
; ──────────────────────────────────────
; OPcache (Mandatory in Production)
; ──────────────────────────────────────
opcache.enable=1
opcache.enable_cli=0
opcache.memory_consumption=256
opcache.interned_strings_buffer=16
opcache.max_accelerated_files=20000
opcache.validate_timestamps=0              ; NEVER validate in production — deploy = restart
opcache.save_comments=1                    ; Required for Doctrine annotations / PHPDoc
opcache.revalidate_freq=0

; ──────────────────────────────────────
; Preloading (PHP 8.0+)
; ──────────────────────────────────────
opcache.preload=/var/www/html/config/preload.php
opcache.preload_user=www-data

; ──────────────────────────────────────
; JIT Compiler (PHP 8.0+)
; ──────────────────────────────────────
opcache.jit=tracing                        ; Best for web workloads
opcache.jit_buffer_size=128M

; ──────────────────────────────────────
; Security Hardening
; ──────────────────────────────────────
expose_php=Off
display_errors=Off
display_startup_errors=Off
log_errors=On
error_log=/var/log/php/error.log
error_reporting=E_ALL
session.cookie_httponly=1
session.cookie_secure=1
session.cookie_samesite=Lax
session.use_strict_mode=1
```

---

## 9. FrankenPHP — Production Multi-Stage Dockerfile

```dockerfile
# ═══════════════════════════════════════════════════════════════
# Stage 1: Base image with PHP extensions
# ═══════════════════════════════════════════════════════════════
FROM dunglas/frankenphp:1-php8.4-alpine AS base

RUN install-php-extensions \
    pdo_pgsql \
    pgsql \
    redis \
    opcache \
    intl \
    zip \
    bcmath \
    gd \
    sodium

# ═══════════════════════════════════════════════════════════════
# Stage 2: Composer dependency installation
# ═══════════════════════════════════════════════════════════════
FROM composer:2 AS vendor
WORKDIR /app

COPY composer.json composer.lock ./
RUN composer install \
    --no-dev \
    --no-scripts \
    --no-autoloader \
    --prefer-dist \
    --ignore-platform-reqs

COPY . .
RUN composer dump-autoload --optimize --classmap-authoritative --no-dev

# ═══════════════════════════════════════════════════════════════
# Stage 3: Final production image
# ═══════════════════════════════════════════════════════════════
FROM base AS production
WORKDIR /app

COPY --from=vendor /app/vendor ./vendor
COPY . .

# Production environment
ENV APP_ENV=production
ENV FRANKENPHP_CONFIG="worker ./public/index.php"

# Copy optimized php.ini
COPY docker/php/php-production.ini /usr/local/etc/php/conf.d/99-production.ini

# Security: non-root execution
USER www-data

EXPOSE 80 443 443/udp

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost/healthz || exit 1

CMD ["frankenphp", "run", "--config", "/etc/caddy/Caddyfile"]
```

### PHP-FPM Alternative (Moodle — Traditional)

```dockerfile
# Moodle typically runs on PHP-FPM + Nginx/Apache
FROM php:8.4-fpm-alpine AS moodle-runtime

RUN apk add --no-cache \
    postgresql-dev \
    libzip-dev \
    icu-dev \
    freetype-dev \
    libjpeg-turbo-dev \
    libpng-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
        pdo_pgsql \
        pgsql \
        zip \
        intl \
        gd \
        opcache \
        soap \
        exif

COPY docker/php/moodle-production.ini /usr/local/etc/php/conf.d/99-moodle.ini

WORKDIR /var/www/html
COPY --chown=www-data:www-data . .

USER www-data
```

---

## 10. MUC Strategic Tiering (Moodle)

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                     MOODLE UNIVERSAL CACHE (MUC) TIERS                      │
├───────────────────┬─────────────────────────────────────────────────────────┤
│ MODE_REQUEST      │ PHP memory — dies at script end                        │
│                   │ Use: hot-path computed values, repeated lookups         │
├───────────────────┼─────────────────────────────────────────────────────────┤
│ MODE_SESSION      │ User session store                                     │
│                   │ Use: user-specific preferences, nav state              │
├───────────────────┼─────────────────────────────────────────────────────────┤
│ MODE_APPLICATION  │ Redis / APCu — shared across all requests              │
│                   │ Use: course metadata, config, API responses, lang pack │
│                   │ ⚡ Always set TTL + staticacceleration for hot keys     │
└───────────────────┴─────────────────────────────────────────────────────────┘
```

### Cache Invalidation Patterns

```php
// ✅ Targeted invalidation on write
$cache = \cache::make('local_nexus', 'course_sync_metadata');
$cache->delete("course_{$courseid}");

// ✅ Bulk purge (use sparingly — expensive)
\cache_helper::purge_by_definition('local_nexus', 'course_sync_metadata');

// ✅ Event-driven invalidation via cache event
$cache->purge();  // Nuclear option — only for admin cache clearing
```

---

## 11. RFC 9457 Problem Details (PHP APIs)

Standardized error responses for REST APIs built in generic PHP:

```php
declare(strict_types=1);

namespace App\Infrastructure\Http\Response;

final readonly class ProblemDetails
{
    /**
     * @param array<string, mixed> $extensions
     */
    public static function create(
        string $type,
        string $title,
        int    $status,
        string $detail,
        string $instance,
        array  $extensions = []
    ): array {
        return array_filter([
            'type'     => $type,
            'title'    => $title,
            'status'   => $status,
            'detail'   => $detail,
            'instance' => $instance,
            'timestamp' => gmdate('Y-m-d\TH:i:s.v\Z'),
            ...$extensions,
        ]);
    }
}

// Usage in exception handler:
// Content-Type: application/problem+json
// HTTP/1.1 422 Unprocessable Entity
// {
//   "type": "https://api.example.com/problems/validation-error",
//   "title": "Validation Failed",
//   "status": 422,
//   "detail": "The 'email' field must be a valid email address.",
//   "instance": "/v1/users",
//   "timestamp": "2026-08-24T13:45:00.000Z",
//   "invalid_params": [{"name": "email", "reason": "Invalid email format"}]
// }
```

---

## 12. Performance Anti-Patterns & Fixes

- **N+1 Query in Loop**: `$DB->get_record()` inside `foreach`. 👉 **Fix**: Pre-fetch with `$DB->get_records_list()` or single `JOIN` + `GROUP BY`.
- **`SELECT *` on Large Tables**: Fetches unused columns, wastes memory/bandwidth. 👉 **Fix**: Project only needed fields (`'id, username, email'`).
- **Unclosed Recordsets**: `$DB->get_recordset_sql()` without `$rs->close()`. 👉 **Fix**: `try { foreach } finally { $rs->close(); }`.
- **Missing OPcache `validate_timestamps=0`**: Re-stats every file per request. 👉 **Fix**: Set to `0` in production; restart PHP-FPM on deploy.
- **No Preloading**: Framework re-parsed on every cold start. 👉 **Fix**: Configure `opcache.preload` with core framework files.
- **Blocking I/O in Request Path**: HTTP calls to external APIs during page render. 👉 **Fix**: Queue ad-hoc tasks; return immediately; poll via AJAX.
- **Fat Serialized Objects in Cache**: Serializing entire Eloquent/Doctrine entities. 👉 **Fix**: Cache plain arrays or DTOs; reconstruct on cache hit.
