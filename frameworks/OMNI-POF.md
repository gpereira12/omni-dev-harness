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
