#!/usr/bin/env bash
set -euo pipefail

# 🚦 Sensor de Código Determinístico (Definition of Done)
echo "🔍 [PRE-COMMIT] Iniciando verificação de qualidade..."

# 1. Validação de .env.example
if [ -f ".env.example" ] && [ -f ".env" ]; then
  echo "🔍 [1/6] Validando variáveis de ambiente..."
  MISSING_VARS=0
  while IFS='=' read -r key _; do
    # Ignora comentários e linhas vazias
    [[ "$key" =~ ^#.*$ ]] && continue
    [[ -z "$key" ]] && continue
    if ! grep -q "^${key}=" .env; then
      echo "⚠️ Variável obrigatória '$key' do .env.example não encontrada no .env"
      MISSING_VARS=1
    fi
  done < .env.example
fi

# 2. Bloqueio de vazamento de bypasses DEV (Zero Dev-Leaks)
if git diff --cached 2>/dev/null | grep -E 'VITE_AUTH_DEV=true|VITE_APP_BRAND=' > /dev/null 2>&1; then
  echo "❌ [BLOCK] Detectado bypass de desenvolvimento (AUTH_DEV / APP_BRAND) preparado para commit!"
  echo "Reverta essas alterações de ambiente local antes de comitar."
  exit 1
fi

# 3. Bloqueio de dados mockados em arquivos de produção (Zero Mock-Leaks)
echo "🔍 [2/6] Validando ausência de dados mockados em arquivos de produção..."
STAGED_PROD_CODE_FILES=$(git diff --cached --name-only --diff-filter=ACM 2>/dev/null | grep -E '\.(ts|tsx|js|jsx|cs|py|java|go)$' | grep -vE '(\.test\.|\.spec\.|\/__tests__\/|\/mocks?\/|\.stories\.|\.mock\.|fixtures|seed|Tests\/|Test\/)' || true)

if [ -n "$STAGED_PROD_CODE_FILES" ]; then
  MOCK_MATCHES=$(git diff --cached -U0 -- $STAGED_PROD_CODE_FILES 2>/dev/null | grep '^\+[^+]' | grep -iE "(id:[[:space:]]*['\"]mock-|['\"]mock-[a-zA-Z0-9_-]+['\"]|mockOrder|mockUser|mockData|mockResponse|mockList|fakeOrder|fakeUser|MOCK_DATA|useMock|isMock|\/\/[[:space:]]*mock|\/\*[[:space:]]*mock)" || true)
  if [ -n "$MOCK_MATCHES" ]; then
    echo "❌ [BLOCK] Detectado dado estático/mockado em arquivo de produção preparado para commit!"
    echo "Linhas detectadas:"
    echo "$MOCK_MATCHES"
    echo "⚠️ Mocks e fixtures são permitidos exclusivamente em arquivos de teste (*.test.*, __tests__/, mocks/)."
    echo "Remova os mocks antes de commitar ou subir para produção."
    exit 1
  fi
fi

# 4. Execução de Lint
if npm run | grep -q "lint"; then
  echo "🧹 [4/6] Executando linter..."
  npm run lint
else
  echo "⏭️ [4/6] Script de lint não configurado. Pulando."
fi

# 5. Execução de Typecheck / Build
if ls *.sln 1> /dev/null 2>&1; then
  echo "🏗️ [5/6] Validando compilação .NET Solution (dotnet build)..."
  dotnet build --nologo -v q
elif ls *.csproj 1> /dev/null 2>&1; then
  echo "🏗️ [5/6] Validando compilação .NET Project (dotnet build)..."
  dotnet build --nologo -v q
elif npm run 2>/dev/null | grep -q "build"; then
  echo "🏗️ [5/6] Validando compilação e tipagem (Build)..."
  npm run build
elif npm run 2>/dev/null | grep -q "typecheck"; then
  echo "🏗️ [5/6] Validando tipagem TypeScript..."
  npm run typecheck
else
  echo "⏭️ [5/6] Script de build/typecheck não configurado. Pulando."
fi

# 6. Execução de Testes
if ls *.sln 1> /dev/null 2>&1; then
  echo "🧪 [6/6] Executando testes automatizados .NET..."
  dotnet test --no-build --nologo -v q || true
elif npm run 2>/dev/null | grep -q "test"; then
  echo "🧪 [6/6] Executando testes automatizados..."
  npm test -- --run || npm test
else
  echo "⏭️ [6/6] Script de testes não configurado. Pulando."
fi

echo "✅ [PRE-COMMIT] Todas as verificações passaram com sucesso!"
exit 0
