# 🧩 Microfrontends, Vue Advanced & Template Engines

Este documento estabelece as diretrizes arquiteturais para **Nuxt 3 (Vue SSR)**, **Template Engines (Liquid & Nunjucks)** e estratégias de **Microfrontends (MFEs)**.

---

## 1. Vue.js Advanced & Nuxt 3

- **Nuxt 3 (App Framework)**:
  - **Nitro Engine**: Execução serverless ultra-rápida no Google Cloud Run e Edge Workers.
  - **Hybrid Rendering (Route Rules)**: Permite definir rotas como SSR (`ssr: true`), estáticas (`prerender: true`) ou SPA client-side (`ssr: false`) no mesmo projeto.
- **Component Libraries**:
  - **shadcn-vue** (Radix Vue): Para SaaS moderno com controle total do código.
  - **PrimeVue**: Para dashboards corporativos densos com DataGrids avançados.

---

## 2. Template Engines: Liquid vs Nunjucks

| Engine | Ideal Use Case | Segurança | Destaque |
| :--- | :--- | :--- | :--- |
| **Liquid (LiquidJS)** | Temas de e-commerce, customizações por clientes, CMS. | **Sandboxed**: Seguro contra execução de JS arbitrário. | Filtros ricos (`| money`, `| date`). |
| **Nunjucks** | Geração de PDFs (Puppeteer), emails transacionais, SSR em Node. | Seguro com auto-escaping anti-XSS. | Herança de templates (`{% extends %}`). |

---

## 3. Microfrontends (MFE) Architecture

### A. Matriz de Decisão MFE
- **Adotar**: Quando múltiplos times precisam de deploys independentes em ciclos de release desacoplados.
- **Evitar**: Para times pequenos ou monorepos simples (adiciona overhead desnecessário de rede e bundle).

### B. As 3 Estratégias Canônicas de Implementação:

1. **Module Federation (Vite / Webpack 5)**:
   - O *Host App (Shell)* importa componentes remotos em tempo de execução (`import('remoteApp/Widget')`).
   - Compartilha bibliotecas comuns (`react`, `vue`, `pinia`, `lucide-react`) como *singleton dependencies* para evitar download duplicado.

2. **Edge Multi-Zones (Cloudflare / Reverse Proxy)**:
   - Roteamento na borda por prefixo de URL (`/store/*` ➔ App 1, `/app/*` ➔ App 2).
   - Zero acoplamento de código; cada zona é um repositório e deploy completamente independente.

3. **Web Components Wrapper**:
   - Encapsula micro-aplicações em Custom Elements (`<omni-auth-widget />`), permitindo coexistência de frameworks heterogêneos (React dentro de Vue ou vice-versa).

### C. Comunicação entre Microfrontends
- **Custom Event Bus**: Comunicação através de eventos padrão da DOM (`window.dispatchEvent` e `window.addEventListener`).
- **Zero Shared Memory**: Microfrontends nunca compartilham referências diretas de objetos em memória; a comunicação ocorre estritamente via mensagens serializadas JSON ou parâmetros de URL.
