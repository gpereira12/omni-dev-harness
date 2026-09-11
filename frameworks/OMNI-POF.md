# 🎨 OMNI-POF: Product & UX Psychology Framework

O **OMNI-POF** estabelece a metodologia de concepção de produto, hierarquia visual, engenharia de componentes e redução de fricção cognitiva.

---

## 1. Atomic Design System Hierarchy

A construção de interfaces segue a decomposição atômica rigorosa:

1. **Átomos**: Cores HSL, Tipografia, Ícones (Phosphor/Lucide), Botão base, Input base.
2. **Moléculas**: Input com Label + Mensagem de Erro, Campo de Busca com Botão, Item de Cardápio.
3. **Organismos**: Header/Navbar, Tabela de Alunos com Paginação, Modal de Confirmação de Matrícula.
4. **Templates**: Layout de Dashboard (Sidebar + Header + Content Area) com Skeletons responsivos.
5. **Páginas**: Instância real hidratada com dados vindos de Server Actions ou APIs.

---

## 2. Dual-Track Discovery & Delivery

Nenhum código de UI é escrito antes de responder às 3 perguntas de produto:
1. **Problema Real**: Qual dor do usuário estamos eliminando? (Redução de tempo de cadastro, clareza financeira).
2. **Hipótese de Menor Esforço**: Como o usuário atinge o objetivo com o **menor número possível de cliques**?
3. **Métrica de Sucesso**: Qual indicador prova que a tela funciona? (Taxa de conversão, tempo até conclusão).

---

## 3. Cognitive Fluency & Micro-Interactions

- **Feedback Táctil**: Escala de clique (`active:scale-[0.98]`) e transições suaves de 150ms a 200ms.
- **Progressive Disclosure**: Telas densas divididas em abas semânticas ou accordions para evitar sobrecarga mental inicial.
- **Zero Surpresas**: O usuário sempre sabe o que acontecerá antes de clicar (textos claros em botões: *"Confirmar Matrícula por R$ 500"* em vez de apenas *"Confirmar"*).

---

## 4. Mobile Input Ergonomics (Princípio da Menor Fricção de Teclado)

Em dispositivos móveis (Web Responsiva, PWA e Apps), o teclado virtual consome até 50% da tela. Forçar o usuário a alternar manualmente entre teclados (`123` / `ABC`) viola a **Lei do Menor Esforço** e a **Lei de Hick**, aumentando o abandono de conversão e a taxa de erros de digitação.

### Matriz Canônica de Atributos de Entrada Mobile:

| Tipo de Dado | Web / PWA (HTML5 / React) | Mobile Nativo (React Native / Expo) | Comportamento Esperado |
| :--- | :--- | :--- | :--- |
| **Telefone / Celular** | `type="tel"` `inputMode="tel"` `autoComplete="tel"` | `keyboardType="phone-pad"` `textContentType="telephoneNumber"` | Teclado telefônico dedicado com discador e sugestão de autofill. |
| **CPF / CNPJ / Docs** | `type="text"` `inputMode="numeric"` `pattern="[0-9]*"` | `keyboardType="number-pad"` | Numpad puro; preserva zeros à esquerda e pontuação da máscara. |
| **CEP / Código Postal** | `type="text"` `inputMode="numeric"` `pattern="[0-9]*"` `autoComplete="postal-code"` | `keyboardType="number-pad"` `textContentType="postalCode"` | Numpad puro com integração de autofill de endereço. |
| **Código OTP / 2FA** | `type="text"` `inputMode="numeric"` `pattern="[0-9]*"` `autoComplete="one-time-code"` | `keyboardType="number-pad"` `textContentType="oneTimeCode"` | Numpad puro com captura automática de SMS do sistema operacional. |
| **Cartão de Crédito** | `type="text"` `inputMode="numeric"` `pattern="[0-9]*"` `autoComplete="cc-number"` | `keyboardType="number-pad"` `textContentType="creditCardNumber"` | Numpad puro com máscara sem quebra de zeros ou caracteres. |
| **Valores / Decimais**| `inputMode="decimal"` | `keyboardType="decimal-pad"` | Numpad com tecla de ponto/vírgula decimal habilitada. |
| **Contadores / Qtd** | `type="number"` `inputMode="numeric"` `min="0"` | `keyboardType="number-pad"` | Teclado numérico direto para contagem inteira positiva. |

> **Anti-Pattern Proibido:** Nunca utilize `<input type="number">` para documentos, CEPs ou telefones. Ele remove zeros à esquerda (ex: `01310` vira `1310`), quebra com pontuações de máscara, renderiza botões de incremento (spinners) indesejados no desktop e aceita expoentes científicos (`e`). O padrão canônico para dados mascarados é `inputMode="numeric"` com `type="text"` ou `type="tel"`.

