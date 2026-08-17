# 🕸️ GraphQL Architecture & Performance Standard

Este documento estabelece as regras e padrões de engenharia para desenvolvimento de APIs GraphQL no ecossistema OMNI.

---

## 1. Stack & Approaches

- **Code-First (NestJS GraphQL / Pothos / TypeGraphQL)**: Recomendado para aplicações TypeScript densas com validação de decorators e tipagem unificada.
- **Schema-First (Apollo Server / Yoga)**: Recomendado quando o contrato `.graphql` (SDL) é desenhado previamente com múltiplos times.

---

## 2. As 4 Regras de Performance & Segurança

### 1. Batching & Caching com DataLoaders (Anti-N+1)
Todo relacionamento aninhado (ex: `Order.customer` ou `Aluno.turma`) **DEVE** utilizar um `DataLoader` instanciado por requisição:
```typescript
// Exemplo canônico de DataLoader em TypeScript
export const createTurmaLoader = (db: PrismaClient) =>
  new DataLoader<string, Turma>(async (turmaIds) => {
    const turmas = await db.turma.findMany({
      where: { id: { in: [...turmaIds] } }
    });
    const turmaMap = new Map(turmas.map((t) => [t.id, t]));
    return turmaIds.map((id) => turmaMap.get(id) || null);
  });
```

### 2. Query Depth & Complexity Limiting (Defesa DoS)
Toda API GraphQL em produção deve configurar:
- **Max Depth Limit**: Máximo de **5 níveis** de aninhamento de queries.
- **Max Complexity**: Pontuação máxima de 200 pontos por query (`graphql-query-complexity`).

### 3. Result Pattern & Union Error Handling
Erros de negócio previsíveis devem ser modelados como Uniões de Tipos no Schema:
```graphql
type MatriculaSucesso {
  matricula: Matricula!
}

type VagasEsgotadasError {
  message: String!
  vagasRestantes: Int!
}

union MatricularResult = MatriculaSucesso | VagasEsgotadasError

type Mutation {
  matricular(input: MatricularInput!): MatricularResult!
}
```

### 4. Automatic Persisted Queries (APQ)
- O frontend envia apenas o hash SHA-256 da query em vez de uma string de 5KB.
- Reduz o tráfego de rede e permite cache de borda (CDN / Cloudflare) em operações de leitura `Query`.
