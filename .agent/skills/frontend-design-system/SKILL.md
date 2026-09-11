---
name: frontend-design-system
description: Modern web and mobile frontend architecture, styling (Tailwind CSS), component libraries (shadcn/ui, Material UI), design tokens, UI resilience, micro-animations, and stack decision matrix.
always_use: false
---

# 🎨 Frontend & Mobile Architecture

## 1. Stack Decision Matrix

| Stack | Ideal Use Case | When NOT to Use |
| :--- | :--- | :--- |
| **Next.js (App Router)** | Hybrid SSR/RSC, portals with critical SEO, combined auth. | Pure internal authenticated dashboards where SPA latency is better. |
| **Vite (React / Vue)** | 100% Authenticated SaaS, Dashboards, internal tools (SPA). | Public sites requiring crawler indexability without client JS. |
| **Astro** | Content-first sites, documentation, landing pages (Islands Arch). | Highly dynamic authenticated SaaS dashboards. |
| **PWA (Vite / Next)** | B2B SaaS, portais operacionais de campo, instalação rápida sem loja. | Apps que exigem presença em loja ou background tracking contínuo. |
| **Capacitor (Web Shell)** | Publicação em App Store/Google Play aproveitando 100% da base Web, Push Nativo, BLE. | Apps B2C com animações gestuais extremas a 120 FPS ou gráficos 3D pesados. |
| **Templates (Nunjucks/Liquid)**| Traditional server-side rendering, transactional emails, themes. | Rich client-side reactive applications. |
| **React Native (Expo)** | Cross-platform mobile (iOS + Android), OTA updates via EAS. | Heavy 3D/GPU rendering or specialized hardware apps. |
| **Kotlin (Compose)** | Native Android, POS hardware terminals, deep OS integration. | Cross-platform with single small team. |
| **Swift (SwiftUI)** | Native iOS premium experience, Live Activities, Dynamic Island. | Android-first or multi-platform unified teams. |

---

## 2. Component Libraries & Styling Matrix

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         UI & STYLING FRAMEWORKS MATRIX                      │
├───────────────────┬─────────────────────────────────────────────────────────┤
│ Tailwind CSS      │ Utility-first CSS, JIT, Design Tokens em variáveis HSL  │
│ shadcn/ui         │ Radix UI Primitives + Tailwind (Zero vendor lock-in)    │
│ Material UI (MUI) │ Design System corporativo completo, DataGrid enterprise │
│ 21st.dev          │ Componentes e micro-interações modernas prontas         │
└───────────────────┴─────────────────────────────────────────────────────────┘
```

### A. Tailwind CSS (O Padrão de Estilização)
* **Design Tokens em Variáveis CSS**: Use paletas HSL desacopladas (`hsl(var(--primary))`) para suportar troca dinâmica de temas e Dark Mode sem recompilação.
* **Composição com `cn()` (clsx + tailwind-merge)**: Sempre utilize a função utilitária `cn(...)` para combinar e sobrescrever classes condicionais com segurança:
  ```typescript
  import { clsx, type ClassValue } from "clsx";
  import { twMerge } from "tailwind-merge";

  export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
  }
  ```

### B. shadcn/ui (A Escolha Primária para SaaS Moderno)
* **Filosofia**: Não é uma dependência externa instalada via `npm`, mas sim **código aberto copiado diretamente para a pasta de componentes do projeto** (`components/ui/`).
* **Primitivas Radix UI**: Garante 100% de acessibilidade nativa (teclado, ARIA, foco, leitores de tela).
* **Customização Total**: Permite alterar o visual de botões, modais, dropdowns e formulários sem lutar contra a especificidade de bibliotecas fechadas.

### C. Material UI — MUI (A Escolha para Sistemas Corporativos Densos)
* **Quando Escolher Material UI (@mui/material / Joy UI)**:
  - Sistemas ERP/CRM internos e portais corporativos complexos.
  - Necessidade de tabelas com recursos enterprise avançados out-of-the-box (`@mui/x-data-grid-pro` com ordenação multinível, filtro avançado, exportação Excel/PDF e pinagem de colunas).
  - Padrão visual estrito do Google Material Design 3.
* **Theming**: Configuração de tema tipado via `createTheme` e `ThemeProvider` com paleta semântica (`primary`, `secondary`, `error`, `warning`, `info`, `success`).

---

## 3. UI Ecosystem & Motion
- **Componentes**: [shadcn/ui](https://ui.shadcn.com) + [21st.dev](https://21st.dev) + [Material UI](https://mui.com).
- **Motion**: [Animista](https://animista.net) (micro-animações CSS leves) e Framer Motion para transições de layout.
- **Ícones**: [Phosphor Icons](https://phosphoricons.com) e [Lucide Icons](https://lucide.dev).
- **Cores & Tokens**: [Realtime Colors](https://realtimecolors.com) (gerador de contraste WCAG AA).

---

## 4. UI Resilience & State Handling
- **Error Boundaries**: Isolamento por rota e por widget complexo. Falha em um card nunca derruba a página inteira.
- **4-State Async Pattern**: Todo consumo assíncrono deve implementar: `Idle` | `Loading (Skeleton)` | `Success` | `Error (com CTA de Retry)`.
- **Global Toast Bus**: Sistema desacoplado de notificações (Sonner) acionado via event-driven hooks.
- **Real-Time Streaming**: Use Server-Sent Events (SSE) para streaming de respostas de IA e atualizações em tempo real sobre HTTP/2.
- **Mobile Offline-First**: Persistência local via SQLite (WatermelonDB/Capacitor) ou TanStack Query Persistence com sync assíncrono. Veja detalhes em [.agent/skills/pwa-mobile-architecture/SKILL.md](file:///Users/gabrielpereira/Desktop/Projetos/Nexus/omni-dev-harness/.agent/skills/pwa-mobile-architecture/SKILL.md).
