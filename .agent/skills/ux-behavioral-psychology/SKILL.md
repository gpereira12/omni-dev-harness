---
name: ux-behavioral-psychology
description: Human-computer interaction (HCI), behavioral psychology laws (Hick, Fitts, Jakob, Doherty, Zeigarnik), cognitive load reduction, Apple aesthetics, and Google utility standards.
always_use: false
---

# 🧠 UX Psychology & Behavioral Engineering

Todo frontend e interface construída neste ecossistema deve aplicar rigorosamente os princípios da psicologia cognitiva humana para eliminar a fricção mental e maximizar a conversão.

---

## 1. As Leis Fundamentais da Psicologia de Interface

### 1. Lei de Hick-Hyman (Redução da Carga de Escolha)
- **Princípio**: O tempo para tomar uma decisão aumenta logaritmicamente com o número e complexidade das opções.
- **Regra do Agente**:
  - Máximo de **1 Call to Action (CTA) Primário** destacado por tela/seção.
  - Utilize **Progressive Disclosure** (revelar opções avançadas apenas quando o usuário solicitar, em vez de sobrecarregar com 20 campos de uma vez).

### 2. Lei de Fitts (Ergonomia e Facilidade de Toque)
- **Princípio**: O tempo para alcançar um alvo depende da distância e do tamanho do alvo.
- **Regra do Agente**:
  - Alvos de toque no mobile devem ter **no mínimo 44x44px** de área clicável.
  - Em interfaces mobile, ações críticas devem ficar na "Thumb Zone" (área inferior da tela, ao alcance natural do polegar).

### 3. Limiar de Doherty (Doherty Threshold — Feedback < 400ms)
- **Princípio**: A produtividade e satisfação do usuário aumentam exponencialmente quando o sistema responde em **menos de 400ms**.
- **Regra do Agente**:
  - **Optimistic UI**: Atualize a interface imediatamente no clique (ex: curtir, favoritar, alternar switch) antes mesmo da confirmação da API.
  - **Skeleton Screens**: Use esqueletos pulsantes em vez de spinners genéricos centralizados para dar percepção de carregamento estruturado.

### 4. Lei de Jakob (Consistência e Familiaridade)
- **Princípio**: Usuários passam a maior parte do tempo em outros aplicativos. Eles esperam que o seu funcione da mesma forma.
- **Regra do Agente**:
  - Nunca reinvente padrões universais (ex: ícone de busca é lupa, carrinho fica no topo direito, inputs de formulário seguem ordem lógica de leitura).

### 5. Efeito Zeigarnik (Motivação de Conclusão de Tarefa)
- **Princípio**: O cérebro humano lembra e prioriza tarefas incompletas.
- **Regra do Agente**:
  - Em fluxos multi-etapas (onboarding, matrícula, checkout), use **Steppers com % de conclusão** (ex: *"Passo 2 de 3 — Quase lá!"*).

### 6. Peak-End Rule (Regra do Pico e do Fim)
- **Princípio**: Usuários julgam uma experiência pelo momento mais intenso (pico) e pelo desfecho (fim).
- **Regra do Agente**:
  - A tela de sucesso (matrícula confirmada, pagamento aprovado) deve ser celebrada com micro-interações de deleite (animação de checkmark, confetes leves, mensagem de acolhimento).

---

## 2. O Princípio do Mínimo Esforço (Law of Least Effort)

1. **Smart Defaults**: Campos de formulário devem vir pré-selecionados com a opção mais provável para 80% dos usuários.
2. **Máscaras e Auto-preenchimento Inteligente**:
   - CEP busca endereço automaticamente (ViaCEP).
   - CNPJ/CPF com formatação automática durante a digitação.
   - Teclados mobile adequados (`inputMode="numeric"`, `inputMode="email"`).
3. **Prevenção de Erros (Inline Validation)**:
   - Valide o campo no evento `onBlur` (após o usuário sair do campo), nunca enquanto ele está digitando a primeira letra.

---

## 3. The Synergy: Apple Aesthetics & Google Utility

```
┌───────────────────────────────────────┬───────────────────────────────────────┐
│       APPLE AESTHETICS (A FORMA)      │      GOOGLE UTILITY (A FUNÇÃO)        │
├───────────────────────────────────────┼───────────────────────────────────────┤
│ • Whitespace generoso e respiro visual│ • Densidade de dados limpa e objetiva │
│ • Hierarquia tipográfica táctil       │ • Resposta instantânea e streaming    │
│ • Micro-interações táteis (scale-98)  │ • Contraste WCAG 2.1 AA (A11y)        │
│ • Cantos arredondados contínuos       │ • Totalmente navegável por teclado    │
└───────────────────────────────────────┴───────────────────────────────────────┘
```

- **Sensação Táctil**: Todo botão clicável deve ter feedback visual ativo:
  `className="transition-transform active:scale-[0.98] duration-150"`
- **Tipografia Escalonada**: Use escalas tipográficas harmônicas com `letter-spacing` negativo sutil em títulos grandes (`tracking-tight`) e altura de linha confortável (`leading-relaxed`) para leitura de parágrafos.
