#!/usr/bin/env bash
set -euo pipefail

# 🚦 Sensor de Código Determinístico (Definition of Done)
echo "🔍 [PRE-COMMIT] Iniciando verificação de qualidade..."

# 1. Validação de .env.example
if [ -f ".env.example" ] && [ -f ".env" ]; then
  echo "🔍 [1/4] Validando variáveis de ambiente..."
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

# 2. Execução de Lint
if npm run | grep -q "lint"; then
  echo "🧹 [2/4] Executando linter..."
  npm run lint
else
  echo "⏭️ [2/4] Script de lint não configurado. Pulando."
fi

# 3. Execução de Typecheck / Build
if npm run | grep -q "build"; then
  echo "🏗️ [3/4] Validando compilação e tipagem (Build)..."
  npm run build
elif npm run | grep -q "typecheck"; then
  echo "🏗️ [3/4] Validando tipagem TypeScript..."
  npm run typecheck
else
  echo "⏭️ [3/4] Script de build/typecheck não configurado. Pulando."
fi

# 4. Execução de Testes
if npm run | grep -q "test"; then
  echo "🧪 [4/4] Executando testes automatizados..."
  npm test -- --run || npm test
else
  echo "⏭️ [4/4] Script de testes não configurado. Pulando."
fi

echo "✅ [PRE-COMMIT] Todas as verificações passaram com sucesso!"
exit 0
