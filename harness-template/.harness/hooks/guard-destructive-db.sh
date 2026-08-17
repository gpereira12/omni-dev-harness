#!/usr/bin/env bash
set -euo pipefail

# 🛡️ Guardrail contra comandos destrutivos de Banco de Dados
COMMAND="${1:-}"

DESTRUCTIVE_PATTERNS=(
  "migrate reset"
  "prisma migrate reset"
  "drop database"
  "drop schema"
  "drop table"
  "compose down -v"
  "docker-compose down -v"
  "truncate table"
)

for pattern in "${DESTRUCTIVE_PATTERNS[@]}"; do
  if [[ "$COMMAND" =~ $pattern ]]; then
    echo "❌ [HARNESS GUARD] COMANDO DESTRUTIVO BLOQUEADO: '$COMMAND'"
    echo "💡 Ações destrutivas de banco de dados exigem aprovação explícita e execução manual do desenvolvedor."
    exit 1
  fi
done

exit 0
