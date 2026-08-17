# ⚛️ React Architecture: State, Forms, Global Feedback & Resilience

Este documento estabelece as diretrizes canônicas para gerenciamento de estado, formulários de alta performance, feedback global de UI e resiliência a erros em aplicações React (Next.js e Vite).

---

## 1. State Management: The 3-Tier Model

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       REACT STATE MANAGEMENT TIERS                          │
├───────────────────┬─────────────────────────────────────────────────────────┤
│ Tier 1: Server    │ TanStack Query (React Query) — Cache, StaleTime, Retry  │
│ Tier 2: Client    │ Zustand — Global UI State com Atomic Selectors          │
│ Tier 3: Scoped    │ React Context API — Theme, I18n, Compound Components    │
└───────────────────┴─────────────────────────────────────────────────────────┘
```

### Regras de Ouro:
1. **Server State is NOT Client State**: Nunca copie dados vindos de APIs para `useState` ou stores do Zustand. Use `useQuery` com `staleTime: 1000 * 60 * 5` (5 minutos) para cache automático e deduplicação.
2. **Atomic Selectors no Zustand**: Sempre consuma o estado via seletores atômicos para evitar re-renderizações desnecessárias:
   ```typescript
   // ✅ Correto: re-renderiza apenas se isSidebarOpen mudar
   const isSidebarOpen = useUIStore((state) => state.isSidebarOpen);
   
   // ❌ Errado: re-renderiza quando QUALQUER campo da store mudar
   const { isSidebarOpen } = useUIStore();
   ```
3. **Context API apenas para Injeção**: Restrinja o uso de Context para provedores que raramente atualizam (`ThemeProvider`, `I18nProvider`).

---

## 2. Forms & Validation: React Hook Form + Zod

Todo formulário deve ser construído com **React Hook Form** integrado ao **Zod** (`@hookform/resolvers/zod`):

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

export const studentSchema = z.object({
  fullName: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  email: z.string().email("Email inválido"),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (YYYY-MM-DD)")
});

export type StudentFormData = z.infer<typeof studentSchema>;

export function StudentForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    mode: "onBlur" // Validação amigável ao sair do campo
  });

  const onSubmit = async (data: StudentFormData) => {
    // Chamada de mutação via TanStack Query
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register("fullName")} disabled={isSubmitting} />
      {errors.fullName && <p className="text-destructive text-sm">{errors.fullName.message}</p>}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Salvando..." : "Cadastrar Aluno"}
      </button>
    </form>
  );
}
```

---

## 3. Os 5 Estados Canônicos de UI & Resiliência

Todo componente com chamadas assíncronas deve cobrir formalmente os 5 estados:

1. **Idle**: Estado inicial neutro.
2. **Loading**: Esqueleto pulsante (`<Skeleton className="h-10 w-full" />`), evitando saltos visuais de layout (CLS).
3. **Success**: Renderização dos dados reais com transições suaves.
4. **Error**: Tratamento visual com mensagem amigável e botão de CTA *"Tentar Novamente"*.
5. **Disabled**: Bloqueio ativo de botões e inputs durante mutações (`isPending || isSubmitting`) para impedir envio duplicado acidental.

---

## 4. Sistema Global de Alertas (Toasts) via Sonner

Utilize a biblioteca **Sonner** para notificações desacopladas:
- Chamada direta em handlers:
  ```typescript
  import { toast } from "sonner";

  // Notificação com promessa assíncrona
  toast.promise(saveContractAction(), {
    loading: "Gerando contrato em PDF...",
    success: "Contrato gerado com sucesso!",
    error: (err) => `Erro ao gerar contrato: ${err.message}`
  });
  ```

---

## 5. Error Boundaries Granulares

Isole componentes críticos com `react-error-boundary` para que falhas parciais não derrubem a página inteira:

```tsx
import { ErrorBoundary } from "react-error-boundary";

function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/5 text-center">
      <p className="text-sm font-medium text-destructive">Não foi possível carregar este módulo.</p>
      <button onClick={resetErrorBoundary} className="mt-2 text-xs underline">
        Tentar novamente
      </button>
    </div>
  );
}

export function DashboardWidget() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <ComplexAnalyticsChart />
    </ErrorBoundary>
  );
}
```
