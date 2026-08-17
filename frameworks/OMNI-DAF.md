# 📊 OMNI-DAF: Data Architecture & Engineering Framework

O **OMNI-DAF** é o framework metodológico para gerenciar o ciclo de vida dos dados, integridade relacional, contratos de dados, streaming e tiering de custos.

---

## 1. Princípios de Data Mesh & Data as a Product

1. **Propriedade Descentralizada por Domínio**: Cada time/serviço é dono e responsável pela qualidade e schema dos seus próprios dados.
2. **Dados como Produto**: Bancos de dados operacionais (OLTP) não são acessados diretamente por ferramentas de BI; o serviço expõe **Data Contracts** limpos e versionados.
3. **Infraestrutura de Dados Self-Service**: Provisionamento padronizado de PostgreSQL, ClickHouse e buckets GCS.

---

## 2. Storage Tiering Strategy (Hot, Warm & Cold)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DATA STORAGE TIERING                               │
├──────────────┬────────────────────────┬─────────────────────┬───────────────┤
│ Tier         │ Período                │ Tecnologia          │ Foco          │
├──────────────┼────────────────────────┼─────────────────────┼───────────────┤
│ **Hot**      │ Últimos 0 - 30 dias    │ PostgreSQL / Redis  │ Sub-ms / ACID │
│ **Warm**     │ 30 - 365 dias          │ ClickHouse / BigQry │ Analytics OLAP│
│ **Cold**     │ > 1 ano                │ GCS Parquet Files   │ Custo Mínimo  │
└──────────────┴────────────────────────┴─────────────────────┴───────────────┘
```

---

## 3. Data Contracts & Schema Evolution

Todo evento publicado em filas (Pub/Sub) ou interface de exportação deve possuir um contrato estrito (JSON Schema / Protobuf):

- **Retrocompatibilidade Obrigatória**: Novos campos devem ser opcionais (`nullable`). Campos antigos não podem ser removidos sem ciclo de depreciação com headers `Sunset`.
- **Validação de Borda**: Consumidores analíticos validam o contrato antes de ingerir no Data Lake/Warehouse.

---

## 4. Change Data Capture (CDC) & Outbox Engine

Para sincronizar o banco operacional com o sistema analítico ou mensageria sem sobrecarregar a aplicação:
- **Engine**: Leitura direta do Transaction Log do PostgreSQL (WAL - *Write Ahead Log*) via **Debezium** ou **Google Cloud Dataflow**.
- **Vantagem**: Zero queries de polling (`SELECT * FROM table WHERE updated_at > ...`) na CPU do banco principal.

---

## 5. Merkle Trees & Cryptographic Audit Ledger

Para registros que exigem comprovação jurídica de não-adulteração (ex: Atas de Notas, Extratos Financeiros, Contratos Digitais):
- Um worker gera o hash SHA-256 de cada linha e constrói a **Merkle Tree**.
- O *Root Hash* diário é ancorado e assinado digitalmente, garantindo auditoria à prova de fraude.
