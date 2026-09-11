# 📱 Polyglot Frontend & Mobile Standards

Este guia estabelece os equivalentes canônicos de gerenciamento de estado, formulários, persistência offline e tratamento de erros para **Vue 3, React Native (Expo), Kotlin (Jetpack Compose) e Swift (SwiftUI)**.

---

## 1. Vue.js 3 (Composition API)

- **Server State**: **TanStack Vue Query** (`useQuery`, `useMutation`).
- **Global Client State**: **Pinia** com stores modulares e tipagem TypeScript estrita.
- **Forms & Validation**: **VeeValidate** integrado ao **Zod** (`toTypedSchema(schema)`).
- **UI & Alerts**: **shadcn-vue** (Radix Vue) + **vue-sonner** para toasts desacoplados.
- **Error Handling**: `onErrorCaptured()` encapsulando rotas e componentes assíncronos.

---

## 2. React Native (Expo)

- **Server State (Offline Persistent)**: **TanStack Query** integrado com `@tanstack/query-async-storage-persister` para cache em disco.
- **Global Client State**: **Zustand** (mesma API da Web com seletores atômicos).
- **Forms & Validation**: **React Hook Form** com `<Controller />` e **Zod**.
- **Keyboard Ergonomics**: Obrigatório `keyboardType="phone-pad"` (telefone), `keyboardType="number-pad"` (CPF, CNPJ, CEP, OTP) e `keyboardType="decimal-pad"` (valores).
- **UI Styling**: **NativeWind (Tailwind CSS v4)** para compartilhamento de tokens de design da web.
- **Toasts & Feedback**: **Burnt** (toasts nativos do iOS/Android) ou `react-native-toast-message`.
- **Local Database**: **WatermelonDB** ou **OP-SQLite** para aplicações offline-first com sync engine.

---

## 3. Kotlin (Android / Jetpack Compose)

- **Architecture**: **MVI / Clean Architecture** com `ViewModel`.
- **State Flow**: `StateFlow<UIState<T>>` exposto de forma imutável para a View:
  ```kotlin
  sealed interface UIState<out T> {
      object Idle : UIState<Nothing>
      object Loading : UIState<Nothing>
      data class Success<T>(val data: T) : UIState<T>
      data class Error(val message: String) : UIState<Nothing>
  }
  ```
- **Keyboard Options**: Obrigatório `keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone)` (telefone), `KeyboardType.Number` (CPF, CEP, códigos) e `KeyboardType.Decimal` (preços/valores).
- **Server State & Cache**: **Retrofit / Ktor** + **Room Database** (Single Source of Truth pattern).
- **Feedback**: `SnackbarHostState` para alertas e validação de botões desabilitados via `enabled = !uiState.isLoading`.

---

## 4. Swift (iOS / SwiftUI)

- **Architecture**: **MVVM** com a macro `@Observable` (iOS 17+) ou **TCA (The Composable Architecture)**.
- **State Management**: `@Observable` classes consumidas via `@State` e `@Binding`.
- **Keyboard Ergonomics**: Obrigatório `.keyboardType(.phonePad)` (telefone), `.keyboardType(.numberPad)` (CPF, CEP, OTP) e `.keyboardType(.decimalPad)` (valores monetários).
- **Server State & Persistence**: `URLSession` assíncrona (`async/await`) + **SwiftData** para armazenamento local.
- **Tactile Feedback**: Haptics nativos disparados em mutações de sucesso:
  ```swift
  let generator = UIImpactFeedbackGenerator(style: .medium)
  generator.impactOccurred()
  ```
- **Error Handling**: Enums com conformidade `LocalizedError` e fallbacks declarativos de tela.
