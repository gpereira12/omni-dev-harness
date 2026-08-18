# 🔷 .NET & C# Enterprise Architecture Standards

Este documento estabelece as diretrizes canônicas para desenvolvimento de backend em **C# (.NET 8 / .NET 9+)**, cobrindo os padrões arquiteturais de mercado mais consolidados da indústria (Clean Architecture, CQRS com MediatR, EF Core + Dapper, MassTransit Outbox e Polly).

---

## 1. Stack & Quando Escolher C# / .NET

| Critério | .NET / C# |
| :--- | :--- |
| **Casos de Uso Ideais** | Fintechs, sistemas bancários, microsserviços de altíssimo throughput, ERPs corporativos densos, sistemas com integração pesada com bancos de dados relacionais e mensageria corporativa. |
| **Diferenciais** | Tipagem estrita profunda, compilação JIT/AOT nativa, Server Garbage Collector de baixa latência, Dependency Injection nativa de alto desempenho e ecossistema robusto de bibliotecas enterprise. |

---

## 2. Clean Architecture em .NET (Estrutura de Projetos)

A solução (.sln) é organizada em 4 camadas com estrita inversão de dependência:

```text
src/
├── MyProject.Domain/           <-- Entidades, Value Objects, Domain Events, Enums, Erros puros (ZERO dependências)
├── MyProject.Application/      <-- Use Cases, Commands/Queries (MediatR), DTOs, Interfaces de Repositório, Behaviors
├── MyProject.Infrastructure/   <-- EF Core DbContext, Repositórios, MassTransit, Integrações Externas, Cloud Storage
└── MyProject.WebApi/           <-- Minimal APIs / Controllers, Middlewares, Injeção de Dependência, Program.cs
```

---

## 3. CQRS & MediatR Pipeline Behaviors

Toda mutação (Command) e consulta (Query) trafega através de Handlers desacoplados com **Pipeline Behaviors** automáticos:

```
[ Request HTTP ] ──▶ [ MediatR Pipeline ] 
                            │
                            ├─▶ 1. [ LoggingBehavior ] (Log estruturado + correlationId)
                            ├─▶ 2. [ ValidationBehavior ] (FluentValidation automático)
                            ├─▶ 3. [ PerformanceBehavior ] (Alerta se demorar > 500ms)
                            ├─▶ 4. [ TransactionBehavior ] (Abre transação atômica)
                            │
                            ▼
                     [ UseCase Handler ] (Executa regra pura de domínio)
```

### Exemplo de Command com C# Moderno (Primary Constructors & Records):
```csharp
// Application/Features/Students/Commands/CreateStudentCommand.cs
public record CreateStudentCommand(string FullName, string Email, string DocumentNumber) 
    : IRequest<Result<Guid>>;

public class CreateStudentCommandHandler(IStudentRepository repository, IUnitOfWork unitOfWork) 
    : IRequestHandler<CreateStudentCommand, Result<Guid>>
{
    public async Task<Result<Guid>> Handle(CreateStudentCommand request, CancellationToken cancellationToken)
    {
        var student = Student.Create(request.FullName, request.Email, request.DocumentNumber);
        await repository.AddAsync(student, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        
        return Result<Guid>.Success(student.Id);
    }
}
```

---

## 4. Persistência Híbrida: EF Core + Dapper

- **Escrita (Commands)**: **Entity Framework Core**
  - Mapeamento via `IEntityTypeConfiguration<T>` (Fluent API desacoplada, zero data-annotations no domínio).
  - **Soft Delete Automático**: `builder.HasQueryFilter(e => !e.IsDeleted);`
  - **Audit Interceptors**: `SaveChangesInterceptor` que preenche `CreatedAt` e `UpdatedAt` em UTC automaticamente.
- **Leitura (Queries)**: **Dapper**
  - Para consultas complexas, relatórios e dashboards analíticos, utiliza-se Dapper diretamente sobre queries SQL otimizadas sem overhead de Change Tracking do EF Core.

---

## 5. Resiliência com Polly v8 (Resilience Pipelines)

Toda chamada HTTP externa ou integração com banco/serviço terceiro é encapsulada em uma pipeline de resiliência:

```csharp
// Program.cs
builder.Services.AddResiliencePipeline("default-network-pipeline", pipelineBuilder =>
{
    pipelineBuilder
        .AddRetry(new RetryStrategyOptions
        {
            MaxRetryAttempts = 3,
            BackoffType = DelayBackoffType.Exponential,
            UseJitter = true
        })
        .AddCircuitBreaker(new CircuitBreakerStrategyOptions
        {
            FailureRatio = 0.5,
            SamplingDuration = TimeSpan.FromSeconds(30),
            MinimumThroughput = 8,
            BreakDuration = TimeSpan.FromSeconds(15)
        })
        .AddTimeout(TimeSpan.FromSeconds(5));
});
```

---

## 6. Mensageria & Transactional Outbox com MassTransit

- **Transactional Outbox Nativo**: O MassTransit grava o evento na tabela `OutboxMessage` dentro da mesma transação do `DbContext.SaveChangesAsync()`.
- **Brokers Suportados**: RabbitMQ, Kafka, Azure Service Bus ou Google Pub/Sub com transporte amqp/grpc.

```csharp
// Program.cs
builder.Services.AddMassTransit(x =>
{
    x.AddEntityFrameworkOutbox<ApplicationDbContext>(o =>
    {
        o.UsePostgres();
        o.UseBusOutbox();
    });
    
    x.UsingRabbitMq((context, cfg) =>
    {
        cfg.Host("localhost", "/");
        cfg.ConfigureEndpoints(context);
    });
});
```

---

## 7. Minimal APIs & Error Handling RFC 7807

- Uso de **ASP.NET Core Minimal APIs** com tipagem estrita e rotas expressivas:
```csharp
app.MapPost("/v1/students", async (CreateStudentCommand command, ISender mediator) =>
{
    var result = await mediator.Send(command);
    return result.IsSuccess 
        ? Results.Created($"/v1/students/{result.Value}", result.Value)
        : Results.Problem(statusCode: 400, title: result.Error.Code, detail: result.Error.Message);
});
```
