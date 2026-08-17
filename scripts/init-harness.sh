#!/usr/bin/env bash
set -euo pipefail

# 🚀 Omni Dev Harness — Project Initializer
TARGET_DIR="${1:-.}"
PROJECT_NAME="$(basename "$(cd "$TARGET_DIR" && pwd)")"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "⚡ [OMNI HARNESS] Inicializando governança em: $TARGET_DIR (Projeto: $PROJECT_NAME)..."

# 1. Copia a pasta .harness
echo "📁 [1/4] Instalando hooks determinísticos, subagentes e skills..."
mkdir -p "$TARGET_DIR/.harness"
cp -R "$SCRIPT_DIR/harness-template/.harness/"* "$TARGET_DIR/.harness/"
chmod +x "$TARGET_DIR/.harness/hooks/"*.sh

# 2. Cria AGENTS.md se não existir
if [ ! -f "$TARGET_DIR/AGENTS.md" ]; then
  echo "📄 [2/4] Gerando AGENTS.md customizado..."
  sed "s/{{PROJECT_NAME}}/$PROJECT_NAME/g" "$SCRIPT_DIR/harness-template/AGENTS.md.template" > "$TARGET_DIR/AGENTS.md"
else
  echo "ℹ️ [2/4] AGENTS.md já existe. Preservando arquivo existente."
fi

# 3. Cria estrutura de .planning se não existir
mkdir -p "$TARGET_DIR/.planning"
if [ ! -f "$TARGET_DIR/.planning/STATE.md" ]; then
  echo "🎯 [3/4] Inicializando .planning/STATE.md..."
  cat <<EOF > "$TARGET_DIR/.planning/STATE.md"
# GSD State — $PROJECT_NAME

## Current Status: Initialized with Omni Dev Harness
- **Sprint / Task Atual**: Setup de Governança
- **Invariantes Ativas**: 18 REST Rules, Zero Any, Hooks de Proteção de Banco.
EOF
fi

# 4. Copia Servidor MCP de Desenvolvimento
if [ ! -d "$TARGET_DIR/mcp_dev" ]; then
  echo "🛠️ [4/4] Instalando Servidor MCP de desenvolvimento..."
  mkdir -p "$TARGET_DIR/mcp_dev"
  cp -R "$SCRIPT_DIR/mcp-template/"* "$TARGET_DIR/mcp_dev/"
fi

echo "✅ [OMNI HARNESS] Projeto '$PROJECT_NAME' equipado com sucesso!"
echo "💡 Para rodar o sensor de código: .harness/hooks/pre-commit-check.sh"
