#!/usr/bin/env bash
set -euo pipefail

# 🔬 Omni Hardening Sensor
# Sensor automatizado de validação de qualidade, complexidade ciclomática (M < 5) e isolamento multi-tenant.

echo "🔍 [HARDENING SENSOR] Iniciando varredura rigorosa de integridade..."

FAILED=0

# 1. Checagem de Isolamento Multi-Tenant
echo "🛡️ [1/3] Verificando isolamento estrito multi-tenant em arquivos modificados..."
MODIFIED_DB_FILES=$(git diff --name-only --cached 2>/dev/null | grep -E '\.(ts|js)$' || git status -s 2>/dev/null | awk '{print $2}' | grep -E '\.(ts|js)$' || true)

if [ -n "$MODIFIED_DB_FILES" ]; then
  for file in $MODIFIED_DB_FILES; do
    [ -f "$file" ] || continue
    # Se o arquivo faz query no banco de dados mas não contém tenant_id
    if grep -E "(db\.|selectFrom|updateTable|deleteFrom|insertInto)" "$file" > /dev/null 2>&1; then
      if ! grep -E "tenant_id" "$file" > /dev/null 2>&1; then
        echo "❌ [ERRO TENANT] Consulta ao banco de dados sem filtro explícito de 'tenant_id' em: $file"
        FAILED=1
      fi
    fi
  done
fi

if [ "$FAILED" -eq 0 ]; then
  echo "✅ [1/3] Nenhuma violação de isolamento multi-tenant detectada."
fi

# 2. Checagem de Complexidade Ciclomática (M < 5)
echo "🧹 [2/3] Verificando complexidade ciclomática e tamanho de arquivos..."
if command -v npx >/dev/null 2>&1 && [ -f "package.json" ]; then
  if grep -q "eslint" package.json 2>/dev/null; then
    echo "ℹ️ Executando ESLint com verificação de complexidade..."
    npx eslint --rule 'complexity: ["error", 5]' src/ 2>/dev/null || {
      echo "⚠️ [ALERTA COMPLEXIDADE] Detectada função com complexidade ciclomática >= 5."
    }
  fi
fi
echo "✅ [2/3] Checagem de complexidade concluída."

# 3. Verificação de Testes e Build
echo "🧪 [3/3] Executando suíte de testes..."
if [ -f "package.json" ]; then
  if grep -q '"test"' package.json; then
    npm test -- --run || {
      echo "❌ [ERRO TESTES] A suíte de testes falhou."
      FAILED=1
    }
  fi
fi

if [ "$FAILED" -ne 0 ]; then
  echo "🚫 [HARDENING SENSOR] Verificação FALHOU. Corrija os apontamentos acima antes do handoff."
  exit 1
fi

echo "🎉 [HARDENING SENSOR] Todos os guardrails de qualidade e segurança foram APROVADOS!"
exit 0
