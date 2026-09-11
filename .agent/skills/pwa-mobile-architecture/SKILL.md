---
name: pwa-mobile-architecture
description: Progressive Web Apps (PWA), Service Workers, Cache Storage API, Web App Manifest, Capacitor hybrid shells, mobile hardware capabilities, and offline-first data sync.
always_use: false
---

# 📱 PWA & Hybrid Mobile Architecture

Esta skill estabelece a engenharia canônica para **Progressive Web Apps (PWA)** e **Aplicações Híbridas (Capacitor)** no ecossistema OMNI, equilibrando a utilidade de engenharia (*Google-Utility*) com o refinamento táctil em dispositivos móveis (*Apple-Aesthetics*).

---

## 1. Matriz de Decisão: PWA vs. Capacitor vs. React Native vs. Nativo

```
                              ESPECTRO DE DESENVOLVIMENTO MOBILE
  [ Web Pura ] ──────► [ PWA ] ──────► [ Capacitor ] ──────► [ React Native ] ──────► [ Nativo Puro ]
   (Browser)         (Instalável)    (Web em Loja + APIs)     (Bridge Nativa)        (Swift / Kotlin)
   Zero Acesso        Web APIs       Loja Apple/Google +     Gestos 120 FPS +       POS Terminals +
   Hardware          Limitadas       Hardware Completo       UI Nativa Real         Hardware Exclusivo
```

| Dimensão | PWA Pura | Capacitor Shell | React Native (Expo) | Nativo (Swift / Kotlin) |
| :--- | :--- | :--- | :--- | :--- |
| **Canal de Distribuição** | URL direta, QR Code, WebAPK | App Store e Google Play | App Store e Google Play | App Store e Google Play |
| **Taxa de Loja (15% - 30%)** | **0% (Zero taxas de loja)** | Obrigatório para bens digitais | Obrigatório para bens digitais | Obrigatório para bens digitais |
| **Ciclo de Atualização** | **Instantâneo (Deploy Web)** | Instantâneo via OTA (Capgo) | Instantâneo via EAS Update | Submissão à loja a cada release |
| **Base de Código** | 100% Web existente | 100% Web existente | Base TypeScript móvel dedicada | Duas bases nativas distintas |
| **Push em Background (iOS)** | ⚠️ Condicional (iOS 16.4+ na Home) | ✅ **100% Nativo (APNs confiável)** | ✅ 100% Nativo | ✅ 100% Nativo |
| **Acesso a Periféricos** | Apenas Web APIs abertas | ✅ **Plugins nativos (BLE, Impressora, Zebra)** | ✅ Suporte completo | ✅ Acesso irrestrito a drivers |
| **Complexidade / TCO** | **Mínima (1 único time)** | **Baixa (Aproveitamento total)**| Média / Alta | Altíssima |

### Regras de Recomendação:
1. **PWA Pura**: Escolha primária para SaaS B2B, painéis operacionais, ERPs de campo, cardápios e sistemas onde agilidade de entrega e economia de taxas superam a necessidade de presença formal em lojas.
2. **Capacitor**: Escolha primária quando o projeto Web já existe, mas o cliente **exige presença na App Store / Google Play**, necessita de **Push Notifications 100% confiáveis no iOS**, biometria via Keychain nativo ou integração com hardware (impressoras térmicas Bluetooth, leitores barcode, terminais externos).
3. **React Native (Expo)**: Escolha quando a experiência do produto for B2C de consumo com listas pesadas e gestos táteis complexos a 120fps (estilo Uber, Airbnb, Instagram).
4. **Nativo Puro**: Reservado para hardwares dedicados (terminais Smart POS de cartão de crédito como Stone/PagBank), Apple Watch, Live Activities complexas ou CarPlay/Android Auto.

---

## 2. Service Workers & Estratégias de Cache (Prevenção do Cache Trap)

O maior risco operacional em PWAs é o **Cache Trap**: quando o Service Worker armazena em cache o próprio `index.html` ou arquivos desatualizados, impedindo que o usuário receba novas versões da aplicação.

### A. Regra de Ouro do Servidor Web (Cabeçalhos HTTP)
O arquivo do Service Worker (`sw.js` ou similar) **NUNCA deve sofrer cache no servidor HTTP ou CDN**:
```http
# Configuração obrigatória para /sw.js no Nginx, Cloudflare ou Cloud Run
Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0
```

### B. Ciclo de Atualização Controlado (Opt-in UI)
Nunca execute `self.skipWaiting()` silenciosamente durante o carregamento inicial caso a aplicação tenha sessões ativas com formulários ou rotas em uso, pois isso causa quebra de chunks dinâmicos (*ChunkLoadError*).

```typescript
// hook canônico de registro e detecção de atualização no React/Vite
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';

export function useServiceWorkerUpdate() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('[SW] Registrado com sucesso:', r);
    },
    onRegisterError(error) {
      console.error('[SW] Falha no registro:', error);
    },
  });

  if (needRefresh) {
    toast('Nova versão do sistema disponível!', {
      description: 'Clique para atualizar para a versão mais recente.',
      action: {
        label: 'Atualizar agora',
        onClick: () => updateServiceWorker(true),
      },
      duration: Infinity,
    });
  }
}
```

### C. As 4 Estratégias Canônicas de Cache (Workbox Patterns)

| Estratégia | Cenário de Uso | Comportamento |
| :--- | :--- | :--- |
| **Network-First (Fallback Cache)** | Endpoints da API REST (`/api/v1/*`), dados dinâmicos, extrato financeiro. | Prioriza a rede para dados frescos. Se offline, retorna a última resposta salva. |
| **Stale-While-Revalidate** | Avatares, imagens de produtos, fontes, assets com atualização moderada. | Retorna o cache imediatamente e busca a atualização em background. |
| **Cache-First (Cache falling back)** | Chunks de JS/CSS versionados com hash (`assets/*.a8f9.js`), logos da marca. | Serve do cache permanentemente. Só toca a rede se o hash mudar. |
| **Network-Only** | Mutações POST, PUT, DELETE, transações financeiras, checkout, login. | Nunca salva em cache. Se a rede falhar, trata com fallback de UI ou Outbox. |

---

## 3. Web App Manifest & Instalação

O arquivo `manifest.webmanifest` deve residir na raiz da aplicação pública e conter metadados estritos para disparar o "Rich Install UI" no Chromium:

```json
{
  "$schema": "https://json.schemastore.org/web-manifest-combined.json",
  "name": "Omni Operations Portal",
  "short_name": "OmniOps",
  "description": "Portal Operacional e Gestão Multi-Tenant",
  "start_url": "/?utm_source=pwa",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait-primary",
  "background_color": "#09090b",
  "theme_color": "#09090b",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-maskable-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

### Prompt de Instalação Diferenciado: Android vs. iOS
- **Android / Chromium**: O navegador dispara o evento `beforeinstallprompt`. Intercepte este evento, guarde o evento no estado e exiba um botão customizado "Instalar App".
- **iOS / Safari**: A Apple **não** suporta o evento `beforeinstallprompt`. A interface deve detectar se o usuário está em um dispositivo iOS em modo navegador (`navigator.userAgent` + `!window.matchMedia('(display-mode: standalone)').matches`) e apresentar um Drawer/Modal elegante demonstrando os passos: *"Toque no botão de Compartilhar e depois em 'Adicionar à Tela de Início'"*.

---

## 4. Matriz de Recursos de Hardware (O que o Celular Permite)

| Recurso do Dispositivo | PWA no Android (Chrome) | PWA no iOS (Safari) | Capacitor Shell (iOS & Android) |
| :--- | :---: | :---: | :---: |
| **Push Notifications em Background** | ✅ Total (Web Push API) | ⚠️ Requer iOS 16.4+ e app na Home | ✅ **100% Nativo (APNs & FCM via plugin)** |
| **Câmera & Captura de Vídeo** | ✅ `getUserMedia` / `<input capture>` | ✅ `getUserMedia` / `<input capture>` | ✅ Nativo com controle de flash e foco |
| **Leitura de Código de Barras / QR** | ✅ Barcode Detection API (Nativo) | ⚠️ Biblioteca JS (Zxing / Html5Qrcode) | ✅ **Plugin Nativo de alta velocidade (ML Kit)** |
| **Geolocalização (Foreground)** | ✅ Alta precisão | ✅ Alta precisão | ✅ Alta precisão |
| **Geolocalização (Background Track)**| ❌ Proibido pelo browser | ❌ Proibido pelo browser | ✅ **Permitido via Foreground Service Nativo** |
| **Biometria (Face ID / Touch ID)** | ⚠️ WebAuthn / Passkeys | ⚠️ WebAuthn / Passkeys | ✅ **Biometria Nativa + Armazenamento Seguro** |
| **Haptics (Vibração Tátil)** | ✅ `navigator.vibrate()` | ❌ Bloqueado pela Apple | ✅ **Motor Taptic Engine do iOS / Android** |
| **Persistência de Dados Offline** | ✅ IndexedDB persistente (GBs) | ⚠️ Risco de eviction após 7 dias de inatividade | ✅ **SQLite Nativo (Imune a eviction do OS)** |
| **Bluetooth Low Energy (BLE)** | ✅ Web Bluetooth (Android) | ❌ Bloqueado pela Apple | ✅ **Total (Capacitor BLE Plugin)** |
| **NFC (Leitura de Tags)** | ✅ Web NFC (Android) | ❌ Bloqueado pela Apple | ✅ **Total (Capacitor NFC Plugin)** |
| **Keep Awake (Tela Acesa)** | ✅ Screen Wake Lock API | ⚠️ iOS 16.4+ | ✅ Nativo |
| **Badges no Ícone** | ✅ App Badging API | ⚠️ Requer app instalado na Home | ✅ Nativo |

---

## 5. Padrões de UX Mobile & Apple-Aesthetics

Para eliminar a sensação de "site dentro de um WebView" e garantir fluidez nativa:

### A. Suporte a Safe-Areas (iPhone Notch & Dynamic Island)
O `index.html` deve incluir obrigatoriamente `viewport-fit=cover`:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
```

No CSS ou classes Tailwind:
```css
/* Classes utilitárias para Safe Area */
.safe-top {
  padding-top: env(safe-area-inset-top);
}
.safe-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
```

### B. Otimizações de Toque e Rolagem
1. **Eliminar delay de toque (300ms)**:
   ```css
   html, body, button, a {
     touch-action: manipulation;
   }
   ```
2. **Remover destaque cinza do Safari**:
   ```css
   * {
     -webkit-tap-highlight-color: transparent;
   }
   ```
3. **Evitar rolagem elástica indesejada (Rubber-banding)**:
   ```css
   body {
     overscroll-behavior-y: contain;
   }
   ```
4. **Prevenir seleção de texto em botões e navegações**:
   ```css
   nav, button, .interactive-card {
     user-select: none;
     -webkit-user-select: none;
   }
   ```

### C. Ergonomia de Teclados Virtuais Mobile (Input Modes & Keypads)

Em PWAs e aplicações web móveis, o teclado virtual ocupa entre 40% e 50% do display. Exibir o teclado QWERTY completo para dados numéricos é um dos principais fatores de abandono de formulários e erros de preenchimento.

**Regras Mandatórias de Atributos:**

1. **Telefone e Celular**:
   ```tsx
   <input
     type="tel"
     inputMode="tel"
     autoComplete="tel"
     placeholder="(11) 99999-9999"
   />
   ```
   *Dispara o teclado telefônico com caracteres especiais (`+`, `*`, `#`) e ativa preenchimento rápido do contato salvo no dispositivo.*

2. **Documentos e Códigos Formatados (CPF, CNPJ, CEP, Cartão)**:
   ```tsx
   <input
     type="text"
     inputMode="numeric"
     pattern="[0-9]*"
     autoComplete="postal-code" // ou cc-number, conforme o contexto
     placeholder="000.000.000-00"
   />
   ```
   *O atributo `pattern="[0-9]*"` é mandatório para forçar o numpad no iOS Safari sem perder a capacidade de renderizar máscaras de pontuação.*

3. **Código de Verificação SMS / 2FA (OTP)**:
   ```tsx
   <input
     type="text"
     inputMode="numeric"
     pattern="[0-9]*"
     autoComplete="one-time-code"
     maxLength={6}
   />
   ```
   *Permite que o teclado do iOS e Android sugira o código recebido via SMS com um único toque acima do teclado.*

4. **Valores Monetários e Decimais**:
   ```tsx
   <input
     type="text"
     inputMode="decimal"
     placeholder="0,00"
   />
   ```
   *Abre o teclado numérico contendo separador decimal (vírgula ou ponto, conforme o locale do teclado do usuário).*

> ⚠️ **Atenção (Anti-Pattern):** Nunca use `type="number"` para CPF, CEP ou Telefone. No mobile e desktop, ele descarta zeros à esquerda (ex: `01310-100` vira `1310100` ou quebra), falha ao receber máscara e renderiza setas verticais de incremento (*steppers*) indesejadas.

---

## 6. Arquitetura Offline-First & Outbox Pattern

Para aplicações com operação em áreas sem conectividade (operações logísticas, armazéns, garagens, visitas médicas):

```
       ARQUITETURA CLIENT-SIDE OUTBOX
[ Ação do Usuário (Criar Registro) ]
                │
                ▼
   ┌───────────────────────────┐
   │ Salva no IndexedDB Local  │ ──► Atualiza UI instantaneamente (Optimistic UI)
   └────────────┬──────────────┘
                │
                ▼
      ┌────────────────────┐
      │  Fila Outbox Local │
      └─────────┬──────────┘
                │
        [ Há Conexão? ]
         /           \
       Sim           Não
       /               \
      ▼                 ▼
[ Sincroniza via ]  [ Aguarda evento 'online' ]
[ API Backend    ]  [ ou Background Sync      ]
```

1. **Storage Local**: Utilize IndexedDB encapsulado via **Dexie.js** ou a persistência nativa do **TanStack Query** (`@tanstack/react-query-persist-client`).
2. **Idempotência**: Toda mutação gerada offline deve conter um `clientMutationId: UUIDv7` para evitar duplicações quando a conexão for restaurada e a fila processada.
