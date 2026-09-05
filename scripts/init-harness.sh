#!/usr/bin/env bash
set -euo pipefail

# 🚀 Omni Dev Harness — Project Initializer (Com suporte nativo a SDD)
TARGET_DIR="${1:-.}"
PROJECT_NAME="$(basename "$(cd "$TARGET_DIR" && pwd)")"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "⚡ [OMNI HARNESS] Inicializando governança e SDD em: $TARGET_DIR (Projeto: $PROJECT_NAME)..."

# 1. Copia a pasta .harness (hooks determinísticos, subagentes, packs e handoffs)
echo "📁 [1/5] Instalando hooks determinísticos, subagentes, packs e esteira de handoffs..."
mkdir -p "$TARGET_DIR/.harness"
cp -R "$SCRIPT_DIR/harness-template/.harness/"* "$TARGET_DIR/.harness/"
mkdir -p "$TARGET_DIR/.harness/handoffs/queue" "$TARGET_DIR/.harness/handoffs/attention" "$TARGET_DIR/.harness/handoffs/archive"
chmod +x "$TARGET_DIR/.harness/hooks/"*.sh 2>/dev/null || true
chmod +x "$TARGET_DIR/.harness/handoffs/"*.sh 2>/dev/null || true


# 2. Cria AGENTS.md se não existir
if [ ! -f "$TARGET_DIR/AGENTS.md" ]; then
  echo "📄 [2/5] Gerando AGENTS.md com Invariantes de SDD e Capacidade (3x6)..."
  sed "s/{{PROJECT_NAME}}/$PROJECT_NAME/g" "$SCRIPT_DIR/harness-template/AGENTS.md.template" > "$TARGET_DIR/AGENTS.md"
else
  echo "ℹ️ [2/5] AGENTS.md já existe. Preservando arquivo existente."
fi

# 3. Cria estrutura de .planning (SDD: decisions/, specs/, templates/, STATE.md)
echo "🎯 [3/5] Estruturando motor SDD (.planning/decisions, .planning/specs, templates)..."
mkdir -p "$TARGET_DIR/.planning/decisions"
mkdir -p "$TARGET_DIR/.planning/specs"
mkdir -p "$TARGET_DIR/.planning/templates"
cp -R "$SCRIPT_DIR/harness-template/.planning/templates/"* "$TARGET_DIR/.planning/templates/"

if [ ! -f "$TARGET_DIR/.planning/STATE.md" ]; then
  cat <<EOF > "$TARGET_DIR/.planning/STATE.md"
# GSD State — $PROJECT_NAME

## Current Status: Initialized with Omni Dev Harness & SDD Engine
- **Sprint / Task Atual**: Setup de Governança
- **Invariantes Ativas**: 18 REST Rules, SDD Evidence-Based, Zero Any, Subagent Capacity (3x6).
EOF
fi

if [ ! -f "$TARGET_DIR/.planning/BACKLOG.md" ]; then
  cat <<EOF > "$TARGET_DIR/.planning/BACKLOG.md"
# Project Backlog — $PROJECT_NAME

Registro de melhorias e tarefas descobertas fora do escopo cirúrgico das specs ativas.

- [ ] Setup inicial de testes e qualidade
EOF
fi

# 4. Copia Servidor MCP de Desenvolvimento
if [ ! -d "$TARGET_DIR/mcp_dev" ]; then
  echo "🛠️ [4/5] Instalando Servidor MCP de desenvolvimento e SDD..."
  mkdir -p "$TARGET_DIR/mcp_dev"
  cp -R "$SCRIPT_DIR/mcp-template/"* "$TARGET_DIR/mcp_dev/"
fi

echo "✅ [OMNI HARNESS] Projeto '$PROJECT_NAME' equipado com sucesso com Governança e SDD!"
echo "💡 Para rodar o sensor de código: .harness/hooks/pre-commit-check.sh"
