---
name: data-modeling-anti-patterns
description: Advanced database schema modeling, normalization (1NF-3NF/BCNF), anomaly prevention, Merkle Trees, and the 4 critical schema anti-patterns (God Tables, Polymorphic FKs, Primitive Obsession, Enum Abuse/Descriptor Pattern).
always_use: false
---

# 🗄️ Advanced Data Modeling & Schema Anti-Patterns

A modelagem do banco de dados é a decisão mais difícil e cara de refatorar em produção. Todo schema deve ser desenhado para prevenir anomalias de escrita, evitar corrupção lógica e garantir integridade referencial nativa.

---

## 1. As 3 Anomalias Clássicas de Banco Relacional

1. **Anomalia de Inserção**: Impossibilidade de cadastrar um registro sem a existência de outro não-relacionado (ex: não conseguir cadastrar uma Disciplina sem ter um Aluno matriculado nela). 👉 **Solução: 3NF/BCNF**.
2. **Anomalia de Atualização**: O mesmo dado está duplicado em várias linhas; atualizar em um lugar deixa os outros inconsistentes (ex: endereço do aluno duplicado em cada cobrança).
3. **Anomalia de Remoção**: A exclusão de um registro apaga inadvertidamente dados históricos vitais (ex: deletar um Aluno e apagar o histórico da Turma). 👉 **Solução: Soft Delete + Tabelas Associativas**.

---

## 2. Os 4 Grandes Anti-Padrões de Modelagem

### 1. "God Table" (Entidade Sobrecarregada)
- **Sintoma**: Uma única tabela acumulando múltiplas responsabilidades de domínios distintos.
- **Exemplo Real**: Uma tabela `Matricula` contendo dados contratuais jurídicos + alocação de enturmação + parcelas financeiras + notas.
- **Correção**: Segregação por Bounded Contexts:
  - `ContratoMatricula` (Jurídico/Assinatura)
  - `Enturmacao` (Acadêmico/Alocação de Sala)
  - `CobrancaMatricula` (Financeiro/Faturas)

### 2. "Polymorphic Association" sem Trava Relacional
- **Sintoma**: Múltiplas Foreign Keys opcionais (`nullable`) na mesma tabela que deveriam ser mutuamente exclusivas, sem nenhuma trava no banco.
- **Exemplo Real**: Tabela `Endereco` com `aluno_id` e `responsavel_id` permitindo que ambos fiquem nulos ou ambos preenchidos simultaneamente.
- **Correção**:
  - **Opção A (Constraint CHECK)**:
    ```sql
    ALTER TABLE enderecos ADD CONSTRAINT check_owner_exclusive 
    CHECK (
      (aluno_id IS NOT NULL AND responsavel_id IS NULL) OR 
      (aluno_id IS NULL AND responsavel_id IS NOT NULL)
    );
    ```
  - **Opção B (Tabela Associativa)**: `aluno_enderecos` e `responsavel_enderecos`.

### 3. "Primitive Obsession" no Schema
- **Sintoma**: Uso de strings/textos livres em colunas que representam entidades de domínio com regras próprias.
- **Exemplo Real**: Coluna `disciplina: VARCHAR(255)` permitindo valores como `"Matemática"`, `"matematica"`, `"Matematica 1º Ano"`.
- **Correção**: Criar entidade de domínio obrigatória com Foreign Key: `disciplina_id UUID REFERENCES disciplinas(id)`.

### 4. "Enum Abuse" (Falta do Descriptor Pattern)
- **Sintoma**: Uso de `ENUM` fechado de banco (`CREATE TYPE segmento_enum AS ENUM (...)`) para conceitos que evoluem com o tempo ou dependem de configuração por cliente/filial.
- **Problema**: Adicionar ou renomear valores de Enum em bancos em produção exige migrations DDL com lock de tabela e quebra código legado.
- **Correção (Descriptor Pattern — Padrão Ed-Fi)**:
  - Criar tabela de domínio configurável:
    ```sql
    CREATE TABLE segmentos (
      id UUID PRIMARY KEY,
      code VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      is_active BOOLEAN DEFAULT TRUE
    );
    ```

---

## 3. Merkle Trees & Integridade de Dados

- **Conceito**: Árvore criptográfica onde folhas são hashes de registros individuais e o nó raiz (*Root Hash*) sintetiza a integridade de todo o dataset.
- **Casos de Uso**:
  1. **Auditoria de Histórico Acadêmico/Financeiro**: Provar matematicamente que nenhum registro antigo foi adulterado.
  2. **Sincronização Eficiente (Data Sync / Offline-First)**: Comparar o *Root Hash* entre servidor e cliente mobile; se forem iguais, zero dados precisam trafegar pela rede.
