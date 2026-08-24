---
name: php-moodle-architecture
description: Modern PHP 8.3/8.4 enterprise standards, Hexagonal Architecture, DDD, CQRS, Moodle LMS plugin architecture, XMLDB, Events/Hooks API, Forms/Output/External/Task/Cache APIs, PHPStan, Pest PHP, FrankenPHP, and high-concurrency performance tuning.
always_use: false
---

# 🐘 PHP & Moodle LMS Architecture Standards

## 1. PHP 8.x Modern Standards & Strict Typing

**Rule 1**: Every PHP file MUST begin with `declare(strict_types=1);`. Zero implicit type coercions.

### Core Language Features (8.2 → 8.4)

| Feature | Version | Industrial Use Case |
| :--- | :--- | :--- |
| **Readonly Classes** | 8.2 | Value Objects, DTOs, Commands — immutable by design |
| **Backed Enums** | 8.1+ | Replace string/int constants with type-safe enums |
| **`#[\Override]`** | 8.3 | Compile-time verification of method overrides |
| **Typed Class Constants** | 8.3 | Enforce constant types across inheritance |
| **`json_validate()`** | 8.3 | Validate JSON without allocating decode memory |
| **`array_find()` / `array_any()` / `array_all()`** | 8.4 | Native C-optimized functional collection search |
| **Property Hooks (`get` / `set`)** | 8.4 | Eliminate getter/setter boilerplate with inline validation |
| **Asymmetric Visibility (`public private(set)`)** | 8.4 | Public reads, private writes — encapsulation without getters |
| **`new` without parentheses chaining** | 8.4 | `new Factory()->create()` — cleaner fluent APIs |
| **`#[\Deprecated]`** | 8.4 | Structured deprecation metadata with `reason`, `since`, `replacement` |
| **DNF Types `(A&B)\|C`** | 8.2+ | Intersection + Union for precision-typed dependency injection |

### Canonical Value Object (PHP 8.4)

```php
declare(strict_types=1);

namespace App\Domain\ValueObject;

final readonly class Money
{
    public function __construct(
        public int    $amountInCents,
        public string $currency = 'BRL'
    ) {
        if ($this->amountInCents < 0) {
            throw new \InvalidArgumentException('Money amount cannot be negative');
        }
        if (strlen($this->currency) !== 3) {
            throw new \InvalidArgumentException('Currency must be a 3-letter ISO code');
        }
    }

    public function add(self $other): self
    {
        if ($this->currency !== $other->currency) {
            throw new \InvalidArgumentException('Cannot add money with different currencies');
        }
        return new self($this->amountInCents + $other->amountInCents, $this->currency);
    }

    public function equals(self $other): bool
    {
        return $this->amountInCents === $other->amountInCents
            && $this->currency === $other->currency;
    }
}
```

---

## 2. Architecture & Domain-Driven Design

### Hexagonal Architecture (Ports & Adapters)

The Domain Core remains **100% framework-agnostic**. No Laravel, no Symfony, no Eloquent, no Doctrine inside `Domain/`.

```text
📁 src/
├── 📁 Domain/                  # Enterprise Business Rules (Pure PHP)
│   ├── 📁 Model/               # Entities, Aggregates, Enums
│   ├── 📁 ValueObject/         # Readonly Value Objects (Money, Email, CourseId)
│   ├── 📁 Event/               # Domain Events (OrderCreated, EnrolmentProcessed)
│   ├── 📁 Repository/          # Outbound Port Interfaces (never implementations)
│   └── 📁 Exception/           # Domain-specific Exceptions
├── 📁 Application/             # Use Case Orchestration
│   ├── 📁 Command/             # CQRS Write Commands & Handlers
│   ├── 📁 Query/               # CQRS Read Queries & Handlers
│   └── 📁 DTO/                 # Data Transfer Objects (in/out boundaries)
└── 📁 Infrastructure/          # Adapters & Framework Details
    ├── 📁 Persistence/         # Doctrine / Eloquent Repository Implementations
    ├── 📁 Http/                # Controllers, Requests, API Resources
    └── 📁 Messaging/           # Queue Consumers, Event Subscribers
```

### CQRS Pattern

- **Commands (Writes)**: Enforce business invariants through Domain Aggregates → persist via Repository.
- **Queries (Reads)**: Bypass heavy entity hydration → query DBAL / read-replica directly → return lightweight Read DTOs.
- **Rule**: Commands return **void or an ID**. Queries return **DTOs, never Entities**.

### Canonical Command Handler

```php
declare(strict_types=1);

namespace App\Application\Command\CreateOrder;

final readonly class CreateOrderCommand
{
    public function __construct(
        public string $customerId,
        public int    $amountInCents,
        public string $currency
    ) {}
}

final readonly class CreateOrderHandler
{
    public function __construct(
        private OrderRepositoryInterface $orderRepository,
        private EventDispatcherInterface $eventDispatcher
    ) {}

    public function __invoke(CreateOrderCommand $command): OrderId
    {
        $order = Order::create(
            new CustomerId($command->customerId),
            new Money($command->amountInCents, $command->currency)
        );

        $this->orderRepository->save($order);

        foreach ($order->releaseEvents() as $event) {
            $this->eventDispatcher->dispatch($event);
        }

        return $order->id;
    }
}
```

---

## 3. Framework Decision Matrix

| Criteria | Laravel 11 / 12 | Symfony 7 | Slim 4 / Micro |
| :--- | :--- | :--- | :--- |
| **Philosophy** | Convention over configuration, unified ecosystem | Extreme decoupled modularity, strict typing | Minimalist PSR-7/15, zero bloat |
| **Best For** | SaaS, multi-tenant platforms, rapid MVP→scale | Banking/fintech, complex DDD/Hexagonal, LTS infra | Single-purpose microservices, Lambda/Serverless |
| **ORM** | Eloquent (Active Record) | Doctrine 3 (Data Mapper) | Raw PDO / DBAL |
| **Architecture Fit** | Action/Service Pattern, Modular Monolith | Hexagonal / Clean Architecture, Event-Driven | Pure PSR-15 Middleware + Handlers |
| **Release Cadence** | Annual major | 6-month cycle + 3-year LTS | Stable core, sporadic |
| **When NOT to Use** | Pure internal API microservices | Rapid prototyping, small CRUD apps | Anything requiring full-stack rendering |

---

## 4. Tooling, Static Analysis & Testing

### Quality Stack (Non-Negotiable)

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PHP QUALITY PIPELINE                                 │
├───────────────────┬─────────────────────────────────────────────────────────┤
│ Code Style        │ PHP-CS-Fixer / Laravel Pint → PER-CS 2.0 enforcement   │
│ Static Analysis   │ PHPStan Level 10 + Rector (automated AST refactoring)  │
│ Unit / Feature    │ Pest PHP v3 (BDD syntax, parallel execution)           │
│ Architecture      │ Pest Arch Tests (layer boundary enforcement)           │
│ Mutation          │ Pest --mutate / Infection (MSI ≥ 80%)                  │
│ Autoloading       │ PSR-4 strict + Composer classmap-authoritative         │
│ CI Security       │ composer audit --abandoned=report                      │
└───────────────────┴─────────────────────────────────────────────────────────┘
```

### Architecture Testing (Pest Arch) — Enforce in CI

```php
declare(strict_types=1);

arch('domain must not depend on infrastructure or frameworks')
    ->expect('App\Domain')
    ->not->toUse(['Illuminate', 'Symfony', 'App\Infrastructure', 'Doctrine']);

arch('domain models must be final')
    ->expect('App\Domain\Model')
    ->toBeFinal();

arch('strict types everywhere')
    ->expect('App')
    ->toUseStrictTypes();

arch('no debugging functions in production')
    ->expect(['dd', 'dump', 'ray', 'var_dump', 'die', 'exit'])
    ->not->toBeUsed();
```

### PHPStan Configuration (Level 10)

```neon
# phpstan.neon
parameters:
    level: 10
    paths: [src, tests]
    checkGenericClassInNonGenericObjectType: true
    checkMissingIterableValueType: true
    treatPhpDocTypesAsCertain: true
```

---

## 5. Moodle LMS Architecture Overview

### Component Model

```text
moodle/
├── lib/                 # Core ($DB, $PAGE, $OUTPUT, setup.php, DML/DDL)
├── mod/                 # Activity Modules (quiz, assign, forum)
├── local/               # Custom Cross-Cutting Plugins ← PRIMARY EXTENSION POINT
├── blocks/              # Sidebar Widgets
├── auth/                # Authentication Plugins (SAML2, OAuth2, LDAP)
├── enrol/               # Enrolment Plugins
├── theme/               # Themes (Boost, child themes, SCSS)
├── admin/tool/          # Administrative Utilities
└── cache/               # MUC (Moodle Universal Cache)
```

### Plugin Types Decision Matrix

| Plugin Type | When to Use | Key Differentiator |
| :--- | :--- | :--- |
| **`local_*`** | Cross-cutting integrations, cron jobs, webhooks, event listeners | No course-level instance required; site-wide |
| **`mod_*`** | Interactive course activities (labs, simulators, custom quizzes) | Instance per course, backup/restore support mandatory |
| **`block_*`** | Dashboard widgets, sidebar components | Positional UI, minimal logic |
| **`auth_*`** | External SSO (SAML2, OAuth2), user auto-provisioning | Extends `auth_plugin_base` |
| **`theme_*`** | Brand styling, layout overrides, SCSS, Mustache template overrides | Inherits Boost, override renderers/templates |

### Events vs Hooks (Moodle 4.3+)

- **Events API** (`\core\event\base`): **One-way notifications**. Dispatched *after* actions (logging, webhooks, background tasks). Cannot modify execution state.
- **Hooks API** (`\core\hook\*`): **Two-way interception**. Replaces legacy `lib.php` callbacks. Plugins inject UI, mutate data in-flight, override behavior. 👉 **Always prefer Hooks over lib.php callbacks for Moodle 4.3+.**

### Page Lifecycle Pipeline

```text
config.php → lib/setup.php → $PAGE->set_url() → $PAGE->set_context()
  → require_login() → require_capability()
    → required_param() / optional_param()
      → Business Logic ($DB, Services)
        → Renderables + Mustache → $OUTPUT->header() / render() / footer()
```

### Core APIs Reference (Deep-dive: [moodle-plugin-development.md](./moodle-plugin-development.md))

| API | Purpose | Key Class / Function |
| :--- | :--- | :--- |
| **Forms** | HTML forms + server/client validation + CSRF | `moodleform`, `$mform->addElement()` |
| **Output** | Renderables + Mustache templates | `renderable`, `templatable`, `export_for_template()` |
| **External** | REST / AJAX Web Services | `external_api`, `external_function_parameters` |
| **Task** | Scheduled cron + ad-hoc background jobs | `scheduled_task`, `adhoc_task`, `manager::queue_adhoc_task()` |
| **Cache (MUC)** | Multi-tier caching (Request/Session/Application) | `cache::make()`, `db/caches.php` |
| **File** | Content-addressable virtual file storage | `get_file_storage()`, `stored_file` |
| **Hooks** | Synchronous plugin interception (4.3+) | `db/hooks.php`, `$hook->add_html()` |
| **Events** | Async event dispatch + observers | `db/events.php`, `\core\event\base::trigger()` |
| **DML** | Database CRUD via `$DB` global | `get_record()`, `insert_record()`, `get_records_sql()` |

---

## 6. Anti-Patterns

### PHP Anti-Patterns

- **Dynamic Properties**: Fatal in PHP 9, deprecated in 8.2. 👉 **Fix**: Always declare typed class properties.
- **Error Suppression (`@`)**: Masks failures, blocks JIT optimization. 👉 **Fix**: Handle exceptions explicitly.
- **Raw Superglobals (`$_GET`, `$_POST`)**: Breaks encapsulation, enables injection. 👉 **Fix**: PSR-7 `ServerRequestInterface` or framework Request objects.
- **Fat Controllers / God Services**: Controllers must only deserialize → authorize → dispatch → respond. 👉 **Fix**: Single-Action Handlers (`__invoke()`), max ~30 lines per controller.
- **Implicit Nullable (`string $p = null`)**: Deprecated in PHP 8.4. 👉 **Fix**: Explicit `?string $p = null`.
- **SQLite In-Memory for Tests**: Misses dialect-specific SQL, JSONB, and concurrency. 👉 **Fix**: Testcontainers with real DB engine.

### Moodle Anti-Patterns

- **Core Hacks (Direct Core Modification)**: Makes upgrades impossible, instant merge conflicts. 👉 **Fix**: Extend via plugins + Hooks API (4.3+).
- **Raw SQL DDL (`ALTER TABLE`)**: Breaks multi-DB compatibility (PostgreSQL/MySQL/Oracle). 👉 **Fix**: XMLDB `install.xml` + `$dbman` DDL in `upgrade.php`.
- **Local Disk I/O (`mkdir()` / `fopen()`)**: Breaks clustered deployments (Cloud Run/K8s). 👉 **Fix**: `get_file_storage()` + virtual file areas.
- **Unsanitized Params (`$_GET['id']`)**: SQL Injection & XSS vectors. 👉 **Fix**: `required_param($name, PARAM_INT)` / `optional_param()`.
- **Skipping `require_sesskey()`**: Enables CSRF on mutation endpoints. 👉 **Fix**: Validate sesskey on ALL POST/mutation scripts.
- **N+1 in Loops**: `$DB->get_record()` inside `foreach`. 👉 **Fix**: `$DB->get_records_list()` or single JOIN query.
- **Unclosed Recordsets**: `$DB->get_recordset_sql()` without `$rs->close()`. 👉 **Fix**: Always wrap in `try { ... } finally { $rs->close(); }`.

---

## 7. Runtime Performance & DevOps

### PHP-FPM vs Persistent Runtimes

```text
Traditional PHP-FPM (Shared-Nothing):
  Request → Cold Boot (Autoload → Framework → Container) → Handle → Destroy

FrankenPHP Worker Mode (Memory-Resident):
  Boot Framework ONCE → Request 1 → Reset (0.5ms) → Request 2 → Reset (0.5ms)
  ⚡ 3x–5x throughput, HTTP/3, 103 Early Hints, Mercure real-time push
```

**Worker Safety Rule**: Applications MUST be stateless per request. Never store request-specific state in `static` properties or un-reset singletons.

### OPcache + JIT (Production Essentials)

```ini
opcache.enable=1
opcache.memory_consumption=256
opcache.max_accelerated_files=20000
opcache.validate_timestamps=0          ; NEVER validate in production
opcache.preload=/app/config/preload.php
opcache.jit=tracing
opcache.jit_buffer_size=128M
```

### Production Composer

```bash
composer install --no-dev --optimize-autoloader --classmap-authoritative --no-interaction
composer audit --abandoned=report
```

### MUC Tiering (Moodle)

| Mode | Scope | Backing Store | Use Case |
| :--- | :--- | :--- | :--- |
| `MODE_REQUEST` | Single HTTP request | PHP memory | Hot-path computed data |
| `MODE_SESSION` | User session | Session store | User-specific metadata |
| `MODE_APPLICATION` | Shared / global | Redis / APCu | Course metadata, config, API responses |

Deep-dives: [moodle-plugin-development.md](./moodle-plugin-development.md) · [php-security-performance.md](./php-security-performance.md)
