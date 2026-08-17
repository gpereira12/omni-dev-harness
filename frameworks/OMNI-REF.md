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
