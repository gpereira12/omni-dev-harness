# ⚡ OMNI-REF: Reliability & Full Cycle Engineering Framework

O **OMNI-REF** combina o modelo **Full Cycle Developer da Netflix** com as práticas de **Site Reliability Engineering (SRE) do Google**.

---

## 1. O Modelo Full Cycle Developer (*"You Build It, You Run It"*)

No ecossistema OMNI, o ciclo de vida não termina no `git push`. Ele abrange 6 fases contínuas:

```
[ 1. Design & Plan ] ➔ [ 2. Code & Test ] ➔ [ 3. Build & Release ] ➔ 
[ 4. Deploy & Split ] ➔ [ 5. Monitor & Telemetry ] ➔ [ 6. Operate & Support ]
```

---

## 2. A Tríade SRE: SLI, SLO e Error Budgets

1. **SLI (Service Level Indicator)**: A métrica real medida em produção.
   - *Exemplo*: % de requisições HTTP retornando status `< 500` com latência `< 400ms`.
2. **SLO (Service Level Objective)**: A meta interna de confiabilidade que o time se compromete a manter.
   - *Padrão OMNI*: **99.9% de disponibilidade** (máximo de 43 minutos de downtime/mês).
3. **Error Budget (Orçamento de Erro)**: A margem de erro aceitável ($100\% - \text{SLO} = 0.1\%$).
   - **Regra de Ouro**: Se o Error Budget do mês estourar (devido a falhas no Sentry/CloudRun), **novos deploys de features são congelados** até que os bugs e gargalos de infraestrutura sejam resolvidos.

---

## 3. Blameless Post-Mortems (Cultura de Não-Culpa)

Quando um incidente grave ocorre em produção:
1. O foco é identificar a **causa raiz sistêmica** (ex: falta de timeout, migração sem lock_timeout, teste ausente), nunca apontar culpados.
2. É gerado um documento de Post-Mortem com a linha do tempo exata e **ações preventivas automatizadas** adicionadas ao `pre-commit` ou testes de regressão.

---

## 4. Cloud FinOps & Cost Engineering

O custo de infraestrutura e tokens de IA é tratado como um **requisito não-funcional de engenharia**:

1. **FinOps de Inteligência Artificial (Token Budgeting)**:
   - **Model Tiering**: 90% das chamadas usam modelos ultraleves (Gemini Flash / Flash-Lite / GPT-4o-mini). Modelos de raciocínio profundo (Pro/Sonnet) são restritos a 10% de alta complexidade.
   - **Semantic Caching**: Respostas para consultas frequentes são cacheadas em Redis com custo zero de tokens em hits.
   - **Context Budgeting**: Subagentes rodam em contextos isolados e efêmeros, sem carregar arquivos desnecessários na memória.

2. **FinOps de Computação (Google Cloud Run)**:
   - **Multi-Concurrency**: Configurar obrigatoriamente `concurrency = 80` por container (1 container atende até 80 requisições simultâneas, dividindo o custo de CPU).
   - **Scale-to-Zero**: Ambientes de desenvolvimento, staging e workers de fila rodam com `min-instances = 0` (custo R$ 0,00 quando ociosos).

3. **FinOps de Armazenamento (Object Lifecycle Management)**:
   - Arquivos estáticos e PDFs (contratos, relatórios) no Cloud Storage/S3 transitam automaticamente:
     - 0 a 30 dias: Classe *Standard* (acesso quente).
     - 31 a 90 dias: Classe *Nearline* (50% de desconto).
     - > 90 dias: Classe *Coldline / Archive* (85% de desconto).

4. **FinOps de Banco de Dados (Cloud SQL)**:
   - **Anti-N+1 Queries**: Queries com `JOIN` e `includes` estruturados para evitar picos de CPU no banco.
   - **Connection Pooling**: Uso obrigatório de PgBouncer / Cloud SQL Auth Proxy para multiplexar conexões.
