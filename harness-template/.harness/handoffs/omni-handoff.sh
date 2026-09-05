#!/usr/bin/env bash
set -euo pipefail

# 📦 Omni Handoff Protocol CLI
# Gerencia a transição de estado, filas e portões de aprovação de agentes autônomos.

HARNESS_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HANDOFF_DIR="$HARNESS_ROOT/handoffs"
QUEUE_DIR="$HANDOFF_DIR/queue"
ATTENTION_DIR="$HANDOFF_DIR/attention"
ARCHIVE_DIR="$HANDOFF_DIR/archive"

mkdir -p "$QUEUE_DIR" "$ATTENTION_DIR" "$ARCHIVE_DIR"

usage() {
  cat <<EOF
Uso: omni-handoff.sh <comando> [opções]

Comandos:
  send        Envia uma tarefa para o próximo papel da esteira
              --from <role> --to <role> --task <task-id> [--commit <sha>] [--summary <text>]

  receive     Verifica e obtém a próxima tarefa da fila para o papel atual
              --role <role>

  attention   Envia a tarefa para o portão de aprovação humana no Dashboard
              --role <role> --task <task-id> --reason <motivo>

  approve     Aprova uma tarefa que estava aguardando atenção humana
              --task <task-id>

  reject      Rejeita uma tarefa e devolve para o papel anterior com notas
              --task <task-id> --reason <motivo>

  status      Lista todas as tarefas ativas na fila e em atenção
EOF
  exit 1
}

CMD="${1:-}"
shift || usage

case "$CMD" in
  send)
    FROM=""
    TO=""
    TASK=""
    COMMIT=""
    SUMMARY=""

    while [[ $# -gt 0 ]]; do
      case "$1" in
        --from) FROM="$2"; shift 2 ;;
        --to) TO="$2"; shift 2 ;;
        --task) TASK="$2"; shift 2 ;;
        --commit) COMMIT="$2"; shift 2 ;;
        --summary) SUMMARY="$2"; shift 2 ;;
        *) echo "Opção desconhecida: $1"; exit 1 ;;
      esac
    done

    [ -z "$FROM" ] || [ -z "$TO" ] || [ -z "$TASK" ] && { echo "Erro: --from, --to e --task são obrigatórios."; exit 1; }
    
    if [ -z "$COMMIT" ]; then
      COMMIT="$(git rev-parse --short HEAD 2>/dev/null || echo "uncommitted")"
    fi

    NOW="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
    FILE="$QUEUE_DIR/${TASK}.json"

    cat <<EOF > "$FILE"
{
  "taskId": "$TASK",
  "fromRole": "$FROM",
  "toRole": "$TO",
  "commit": "$COMMIT",
  "summary": "$SUMMARY",
  "status": "queued",
  "updatedAt": "$NOW"
}
EOF
    echo "✅ [HANDOFF] Tarefa '$TASK' enviada com sucesso de '$FROM' para '$TO' (Commit: $COMMIT)."
    ;;

  receive)
    ROLE=""
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --role) ROLE="$2"; shift 2 ;;
        *) echo "Opção desconhecida: $1"; exit 1 ;;
      esac
    done

    [ -z "$ROLE" ] && { echo "Erro: --role é obrigatório."; exit 1; }

    FOUND=0
    for f in "$QUEUE_DIR"/*.json; do
      [ -e "$f" ] || continue
      TO_ROLE="$(grep -o '"toRole": "[^"]*' "$f" | cut -d'"' -f4)"
      if [ "$TO_ROLE" = "$ROLE" ]; then
        TASK_ID="$(grep -o '"taskId": "[^"]*' "$f" | cut -d'"' -f4)"
        echo "🎯 [RECEIVE] Tarefa encontrada para o papel '$ROLE': $TASK_ID"
        cat "$f"
        FOUND=1
        break
      fi
    done

    if [ "$FOUND" -eq 0 ]; then
      echo "ℹ️ [RECEIVE] Nenhuma tarefa pendente na fila para o papel '$ROLE'."
    fi
    ;;

  attention)
    ROLE=""
    TASK=""
    REASON=""
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --role) ROLE="$2"; shift 2 ;;
        --task) TASK="$2"; shift 2 ;;
        --reason) REASON="$2"; shift 2 ;;
        *) echo "Opção desconhecida: $1"; exit 1 ;;
      esac
    done

    [ -z "$ROLE" ] || [ -z "$TASK" ] && { echo "Erro: --role e --task são obrigatórios."; exit 1; }

    NOW="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
    COMMIT="$(git rev-parse --short HEAD 2>/dev/null || echo "head")"
    FILE="$ATTENTION_DIR/${TASK}.json"

    # Remove da fila regular se existir
    rm -f "$QUEUE_DIR/${TASK}.json"

    cat <<EOF > "$FILE"
{
  "taskId": "$TASK",
  "role": "$ROLE",
  "reason": "$REASON",
  "commit": "$COMMIT",
  "status": "waiting_approval",
  "requestedAt": "$NOW"
}
EOF
    echo "⚠️ [ATTENTION] Tarefa '$TASK' enviada para o Portão de Aprovação Humana (Motivo: $REASON)."
    ;;

  approve)
    TASK=""
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --task) TASK="$2"; shift 2 ;;
        *) echo "Opção desconhecida: $1"; exit 1 ;;
      esac
    done

    [ -z "$TASK" ] && { echo "Erro: --task é obrigatório."; exit 1; }

    ATTN_FILE="$ATTENTION_DIR/${TASK}.json"
    if [ ! -f "$ATTN_FILE" ]; then
      echo "Erro: Tarefa '$TASK' não encontrada em $ATTENTION_DIR."
      exit 1
    fi

    ROLE="$(grep -o '"role": "[^"]*' "$ATTN_FILE" | cut -d'"' -f4)"
    COMMIT="$(grep -o '"commit": "[^"]*' "$ATTN_FILE" | cut -d'"' -f4)"
    NOW="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

    # Move da atenção para a fila regular liberando a próxima etapa
    rm -f "$ATTN_FILE"

    NEXT_ROLE="coder"
    if [ "$ROLE" = "specifier" ]; then NEXT_ROLE="coder"; fi
    if [ "$ROLE" = "refactorer" ] || [ "$ROLE" = "cleaner" ]; then NEXT_ROLE="guardian"; fi
    if [ "$ROLE" = "guardian" ] || [ "$ROLE" = "qa" ]; then NEXT_ROLE="done"; fi

    if [ "$NEXT_ROLE" = "done" ]; then
      cat <<EOF > "$ARCHIVE_DIR/${TASK}.json"
{
  "taskId": "$TASK",
  "finalRole": "$ROLE",
  "commit": "$COMMIT",
  "status": "completed",
  "approvedAt": "$NOW"
}
EOF
      echo "🎉 [APPROVE] Tarefa '$TASK' aprovada e concluída com sucesso! Arquivada em $ARCHIVE_DIR."
    else
      cat <<EOF > "$QUEUE_DIR/${TASK}.json"
{
  "taskId": "$TASK",
  "fromRole": "$ROLE",
  "toRole": "$NEXT_ROLE",
  "commit": "$COMMIT",
  "status": "approved_queued",
  "approvedAt": "$NOW"
}
EOF
      echo "✅ [APPROVE] Tarefa '$TASK' aprovada pelo operador. Despachada para o papel '$NEXT_ROLE'."
    fi
    ;;

  reject)
    TASK=""
    REASON=""
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --task) TASK="$2"; shift 2 ;;
        --reason) REASON="$2"; shift 2 ;;
        *) echo "Opção desconhecida: $1"; exit 1 ;;
      esac
    done

    [ -z "$TASK" ] && { echo "Erro: --task é obrigatório."; exit 1; }

    ATTN_FILE="$ATTENTION_DIR/${TASK}.json"
    if [ -f "$ATTN_FILE" ]; then
      rm -f "$ATTN_FILE"
    fi

    NOW="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
    cat <<EOF > "$QUEUE_DIR/${TASK}.json"
{
  "taskId": "$TASK",
  "toRole": "coder",
  "status": "rejected_feedback",
  "reason": "$REASON",
  "rejectedAt": "$NOW"
}
EOF
    echo "❌ [REJECT] Tarefa '$TASK' rejeitada pelo operador. Retornada para correção com motivo: '$REASON'."
    ;;

  status)
    echo "=== [OMNI FORGE: FILA ATIVA] ==="
    ls -1 "$QUEUE_DIR" 2>/dev/null || echo "(vazia)"
    echo ""
    echo "=== [OMNI FORGE: AGUARDANDO ATENÇÃO / APROVAÇÃO] ==="
    ls -1 "$ATTENTION_DIR" 2>/dev/null || echo "(nenhuma)"
    ;;

  *)
    usage
    ;;
esac
