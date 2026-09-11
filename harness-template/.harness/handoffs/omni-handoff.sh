#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# 📦 Omni Handoff Protocol v2 — Commit-Driven Handoffs
# ============================================================
# Gerencia a transição de estado entre papéis da esteira.
# Handoffs são DURÁVEIS e BLOQUEANTES:
#   - O worktree DEVE estar limpo (sem uncommitted changes)
#   - O HEAD DEVE ter mensagem no formato handoff(<task-id>): <summary>
#   - O commit SHA é extraído do worktree e gravado no JSON
#   - Cada papel opera em sua própria branch: harness/<role>/<task-id>
# ============================================================

HARNESS_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HANDOFF_DIR="$HARNESS_ROOT/handoffs"
QUEUE_DIR="$HANDOFF_DIR/queue"
ATTENTION_DIR="$HANDOFF_DIR/attention"
ARCHIVE_DIR="$HANDOFF_DIR/archive"

mkdir -p "$QUEUE_DIR" "$ATTENTION_DIR" "$ARCHIVE_DIR"

# ── Helpers ──────────────────────────────────────────────────

_red()    { printf '\033[0;31m%s\033[0m\n' "$*"; }
_green()  { printf '\033[0;32m%s\033[0m\n' "$*"; }
_yellow() { printf '\033[0;33m%s\033[0m\n' "$*"; }
_bold()   { printf '\033[1m%s\033[0m\n' "$*"; }

# Detecta o diretório do worktree do papel atual (se disponível)
_worktree_dir() {
  local role="$1"
  local task="$2"
  local project_root
  project_root="$(git -C "$HARNESS_ROOT" rev-parse --show-toplevel 2>/dev/null || echo "$HARNESS_ROOT")"
  echo "$project_root/.worktrees/$role"
}

# Valida que o worktree está limpo e tem commit de handoff no HEAD
_validate_worktree() {
  local worktree_dir="$1"
  local task_id="$2"

  if [ ! -d "$worktree_dir/.git" ] && [ ! -f "$worktree_dir/.git" ]; then
    # Worktree ainda não inicializado — aceita (modo permissivo para projetos sem worktree)
    return 0
  fi

  # 1. Verifica uncommitted changes
  local dirty
  dirty="$(git -C "$worktree_dir" status --porcelain 2>/dev/null || true)"
  if [ -n "$dirty" ]; then
    _red "⛔ [HANDOFF BLOQUEADO] Worktree '$worktree_dir' possui alterações não commitadas."
    _yellow "   Execute: git add -A && git commit -m \"handoff($task_id): <resumo>\""
    exit 1
  fi

  # 2. Valida formato da mensagem do HEAD commit
  local head_msg
  head_msg="$(git -C "$worktree_dir" log -1 --format="%s" 2>/dev/null || echo "")"
  local expected_pattern="^handoff($task_id):"
  # Usando grep com ERE (compatível com bash sem regex nativo para grupos)
  if ! echo "$head_msg" | grep -qE "^handoff\($task_id\):"; then
    _red "⛔ [HANDOFF BLOQUEADO] Mensagem do HEAD commit não segue o protocolo."
    _red "   HEAD atual: \"$head_msg\""
    _yellow "   Esperado:   \"handoff($task_id): <resumo do trabalho>\""
    _yellow "   Execute:    git commit --amend -m \"handoff($task_id): <resumo>\""
    exit 1
  fi
}

# Extrai SHA e mensagem do HEAD do worktree
_get_commit_info() {
  local worktree_dir="$1"
  if [ -d "$worktree_dir/.git" ] || [ -f "$worktree_dir/.git" ]; then
    COMMIT_SHA="$(git -C "$worktree_dir" rev-parse --short HEAD 2>/dev/null || echo "uncommitted")"
    COMMIT_MSG="$(git -C "$worktree_dir" log -1 --format="%s" 2>/dev/null || echo "")"
  else
    # Fallback: usa o repo principal
    COMMIT_SHA="$(git rev-parse --short HEAD 2>/dev/null || echo "uncommitted")"
    COMMIT_MSG="$(git log -1 --format="%s" 2>/dev/null || echo "")"
  fi
}

usage() {
  cat <<EOF
$(_bold "Omni Handoff Protocol v2 — Commit-Driven Handoffs")

Uso: omni-handoff.sh <comando> [opções]

Comandos:

  $(_bold "init-worktree")   Inicializa worktree isolado para um papel com cascade branch
                --role <role>    Papel (specifier | coder | refactorer | guardian | ...)
                --task <task-id> ID da tarefa (ex: T-001)
                [--from <branch>] Branch de origem (default: HEAD do repo principal)
                               Se não informado e for o primeiro papel, usa HEAD.
                               Se papel anterior existir, usa harness/<prev-role>/<task>.

  $(_bold "send")            Envia handoff para o próximo papel da esteira (BLOQUEANTE)
                --from <role>   Papel remetente
                --to <role>     Papel destinatário
                --task <task-id>
                [--summary <text>] Resumo do que foi entregue

  $(_bold "receive")         Obtém a próxima tarefa da fila para o papel atual
                --role <role>

  $(_bold "attention")       Envia tarefa para o portão de aprovação humana
                --role <role> --task <task-id> --reason <motivo>

  $(_bold "approve")         Aprova tarefa no portão (também disponível no Dashboard)
                --task <task-id>

  $(_bold "reject")          Rejeita tarefa com feedback (também disponível no Dashboard)
                --task <task-id> --reason <motivo>

  $(_bold "status")          Lista todas as tarefas ativas, em fila e aguardando aprovação

EOF
  exit 1
}

CMD="${1:-}"
shift || usage

# ── Comandos ─────────────────────────────────────────────────

case "$CMD" in

  # ─── init-worktree ───────────────────────────────────────
  init-worktree)
    ROLE=""
    TASK=""
    FROM_BRANCH=""

    while [[ $# -gt 0 ]]; do
      case "$1" in
        --role)        ROLE="$2";        shift 2 ;;
        --task)        TASK="$2";        shift 2 ;;
        --from)        FROM_BRANCH="$2"; shift 2 ;;
        *) _red "Opção desconhecida: $1"; exit 1 ;;
      esac
    done

    [ -z "$ROLE" ] || [ -z "$TASK" ] && { _red "Erro: --role e --task são obrigatórios."; exit 1; }

    PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo "$HARNESS_ROOT")"
    WORKTREE_PATH="$PROJECT_ROOT/.worktrees/$ROLE"
    BRANCH_NAME="harness/$ROLE/$TASK"

    # Se não informado um --from, tenta detectar o papel anterior pela convenção
    if [ -z "$FROM_BRANCH" ]; then
      FROM_BRANCH="HEAD"
    fi

    # Cria branch cascata a partir da origem informada
    if git -C "$PROJECT_ROOT" show-ref --quiet "refs/heads/$BRANCH_NAME" 2>/dev/null; then
      _yellow "⚠️  Branch '$BRANCH_NAME' já existe. Reutilizando."
    else
      git -C "$PROJECT_ROOT" branch "$BRANCH_NAME" "$FROM_BRANCH"
      _green "🌿 Branch '$BRANCH_NAME' criada a partir de '$FROM_BRANCH'."
    fi

    # Cria o worktree se não existir
    if [ -d "$WORKTREE_PATH" ]; then
      _yellow "⚠️  Worktree '$WORKTREE_PATH' já existe."
    else
      mkdir -p "$(dirname "$WORKTREE_PATH")"
      git -C "$PROJECT_ROOT" worktree add "$WORKTREE_PATH" "$BRANCH_NAME"
      _green "🗂️  Worktree criado em '$WORKTREE_PATH' na branch '$BRANCH_NAME'."
    fi

    _green "✅ [INIT-WORKTREE] Papel '$ROLE' pronto para a task '$TASK'."
    echo "   Worktree: $WORKTREE_PATH"
    echo "   Branch:   $BRANCH_NAME"
    ;;

  # ─── send ────────────────────────────────────────────────
  send)
    FROM=""
    TO=""
    TASK=""
    SUMMARY=""
    SKIP_VALIDATION="${OMNI_SKIP_VALIDATION:-}"

    while [[ $# -gt 0 ]]; do
      case "$1" in
        --from)    FROM="$2";    shift 2 ;;
        --to)      TO="$2";      shift 2 ;;
        --task)    TASK="$2";    shift 2 ;;
        --summary) SUMMARY="$2"; shift 2 ;;
        --skip-validation) SKIP_VALIDATION=1; shift ;;
        *) _red "Opção desconhecida: $1"; exit 1 ;;
      esac
    done

    [ -z "$FROM" ] || [ -z "$TASK" ] && { _red "Erro: --from e --task são obrigatórios."; exit 1; }

    WORKTREE_DIR="$(_worktree_dir "$FROM" "$TASK")"
    BRANCH_REF="harness/$FROM/$TASK"

    # Validação bloqueante do worktree
    if [ -z "$SKIP_VALIDATION" ]; then
      _validate_worktree "$WORKTREE_DIR" "$TASK"
    fi

    # Extrai info do commit
    _get_commit_info "$WORKTREE_DIR"

    NOW="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

    # Se --to não informado: envia para attention (papel final)
    if [ -z "$TO" ]; then
      FILE="$ATTENTION_DIR/${TASK}.json"
      STATUS="waiting_approval"
      _yellow "⚠️  Sem --to informado: tarefa enviada para Approval Gate."
    else
      FILE="$QUEUE_DIR/${TASK}.json"
      STATUS="queued"
    fi

    cat <<EOF > "$FILE"
{
  "taskId": "$TASK",
  "fromRole": "$FROM",
  "toRole": "${TO:-null}",
  "commitSha": "$COMMIT_SHA",
  "commitMessage": "$COMMIT_MSG",
  "worktreeRef": "$BRANCH_REF",
  "summary": "$SUMMARY",
  "status": "$STATUS",
  "updatedAt": "$NOW"
}
EOF

    if [ "$STATUS" = "queued" ]; then
      _green "✅ [HANDOFF] Task '$TASK' enviada de '$FROM' → '$TO'"
      echo "   Commit: $COMMIT_SHA  \"$COMMIT_MSG\""
      echo "   Branch: $BRANCH_REF"
      echo ""
      _yellow "💡 Próximo passo: o papel '$TO' deve rodar:"
      echo "   omni-handoff.sh init-worktree --role $TO --task $TASK --from $BRANCH_REF"
    else
      _yellow "⚠️  [ATTENTION GATE] Task '$TASK' enviada para aprovação humana."
      echo "   Commit: $COMMIT_SHA  \"$COMMIT_MSG\""
      echo "   Acesse o Omni-Forge Dashboard para aprovar ou rejeitar."
    fi
    ;;

  # ─── receive ─────────────────────────────────────────────
  receive)
    ROLE=""
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --role) ROLE="$2"; shift 2 ;;
        *) _red "Opção desconhecida: $1"; exit 1 ;;
      esac
    done

    [ -z "$ROLE" ] && { _red "Erro: --role é obrigatório."; exit 1; }

    FOUND=0
    for f in "$QUEUE_DIR"/*.json; do
      [ -e "$f" ] || continue
      TO_ROLE="$(grep -o '"toRole": "[^"]*' "$f" | cut -d'"' -f4)"
      if [ "$TO_ROLE" = "$ROLE" ]; then
        TASK_ID="$(grep -o '"taskId": "[^"]*' "$f" | cut -d'"' -f4)"
        FROM_ROLE="$(grep -o '"fromRole": "[^"]*' "$f" | cut -d'"' -f4)"
        COMMIT_SHA_VAL="$(grep -o '"commitSha": "[^"]*' "$f" | cut -d'"' -f4)"
        BRANCH_REF="$(grep -o '"worktreeRef": "[^"]*' "$f" | cut -d'"' -f4)"

        _green "🎯 [RECEIVE] Task '$TASK_ID' disponível para o papel '$ROLE'"
        echo "   De:     $FROM_ROLE"
        echo "   Commit: $COMMIT_SHA_VAL"
        echo "   Branch: $BRANCH_REF"
        echo ""
        _yellow "💡 Para iniciar seu worktree:"
        echo "   omni-handoff.sh init-worktree --role $ROLE --task $TASK_ID --from $BRANCH_REF"
        echo ""
        cat "$f"
        FOUND=1
        break
      fi
    done

    if [ "$FOUND" -eq 0 ]; then
      echo "ℹ️  [RECEIVE] Nenhuma tarefa pendente na fila para o papel '$ROLE'."
    fi
    ;;

  # ─── attention ───────────────────────────────────────────
  attention)
    ROLE=""
    TASK=""
    REASON=""
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --role)   ROLE="$2";   shift 2 ;;
        --task)   TASK="$2";   shift 2 ;;
        --reason) REASON="$2"; shift 2 ;;
        *) _red "Opção desconhecida: $1"; exit 1 ;;
      esac
    done

    [ -z "$ROLE" ] || [ -z "$TASK" ] && { _red "Erro: --role e --task são obrigatórios."; exit 1; }

    WORKTREE_DIR="$(_worktree_dir "$ROLE" "$TASK")"
    _get_commit_info "$WORKTREE_DIR"

    NOW="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
    FILE="$ATTENTION_DIR/${TASK}.json"

    rm -f "$QUEUE_DIR/${TASK}.json"

    cat <<EOF > "$FILE"
{
  "taskId": "$TASK",
  "role": "$ROLE",
  "reason": "$REASON",
  "commitSha": "$COMMIT_SHA",
  "commitMessage": "$COMMIT_MSG",
  "worktreeRef": "harness/$ROLE/$TASK",
  "status": "waiting_approval",
  "requestedAt": "$NOW"
}
EOF
    _yellow "⚠️  [ATTENTION] Task '$TASK' enviada para o Portão de Aprovação."
    echo "   Motivo: $REASON"
    echo "   Commit: $COMMIT_SHA  \"$COMMIT_MSG\""
    ;;

  # ─── approve ─────────────────────────────────────────────
  approve)
    TASK=""
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --task) TASK="$2"; shift 2 ;;
        *) _red "Opção desconhecida: $1"; exit 1 ;;
      esac
    done

    [ -z "$TASK" ] && { _red "Erro: --task é obrigatório."; exit 1; }

    ATTN_FILE="$ATTENTION_DIR/${TASK}.json"
    if [ ! -f "$ATTN_FILE" ]; then
      _red "Erro: Task '$TASK' não encontrada em attention/."
      exit 1
    fi

    ROLE="$(grep -o '"role": "[^"]*' "$ATTN_FILE" | cut -d'"' -f4)"
    COMMIT_SHA_VAL="$(grep -o '"commitSha": "[^"]*' "$ATTN_FILE" | cut -d'"' -f4)"
    NOW="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

    # Tabela de próximo papel (espelha os pack JSONs)
    case "$ROLE" in
      specifier)            NEXT_ROLE="coder" ;;
      coder)                NEXT_ROLE="refactorer" ;;
      refactorer|cleaner)   NEXT_ROLE="guardian" ;;
      hardening)            NEXT_ROLE="qa" ;;
      guardian|qa|architecture-advisor) NEXT_ROLE="done" ;;
      *) NEXT_ROLE="done" ;;
    esac

    rm -f "$ATTN_FILE"

    if [ "$NEXT_ROLE" = "done" ]; then
      cat <<EOF > "$ARCHIVE_DIR/${TASK}.json"
{
  "taskId": "$TASK",
  "finalRole": "$ROLE",
  "commitSha": "$COMMIT_SHA_VAL",
  "status": "completed",
  "approvedAt": "$NOW"
}
EOF
      _green "🎉 [APPROVE] Task '$TASK' aprovada e CONCLUÍDA! Arquivada em archive/."
    else
      BRANCH_FROM="harness/$ROLE/$TASK"
      cat <<EOF > "$QUEUE_DIR/${TASK}.json"
{
  "taskId": "$TASK",
  "fromRole": "$ROLE",
  "toRole": "$NEXT_ROLE",
  "commitSha": "$COMMIT_SHA_VAL",
  "commitMessage": "approved from $ROLE",
  "worktreeRef": "$BRANCH_FROM",
  "status": "approved_queued",
  "approvedAt": "$NOW"
}
EOF
      _green "✅ [APPROVE] Task '$TASK' aprovada → despachada para '$NEXT_ROLE'."
      echo ""
      _yellow "💡 O papel '$NEXT_ROLE' deve iniciar com:"
      echo "   omni-handoff.sh receive --role $NEXT_ROLE"
      echo "   omni-handoff.sh init-worktree --role $NEXT_ROLE --task $TASK --from $BRANCH_FROM"
    fi
    ;;

  # ─── reject ──────────────────────────────────────────────
  reject)
    TASK=""
    REASON=""
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --task)   TASK="$2";   shift 2 ;;
        --reason) REASON="$2"; shift 2 ;;
        *) _red "Opção desconhecida: $1"; exit 1 ;;
      esac
    done

    [ -z "$TASK" ] && { _red "Erro: --task é obrigatório."; exit 1; }

    ATTN_FILE="$ATTENTION_DIR/${TASK}.json"
    COMMIT_SHA_VAL=""
    ROLE="unknown"

    if [ -f "$ATTN_FILE" ]; then
      ROLE="$(grep -o '"role": "[^"]*' "$ATTN_FILE" | cut -d'"' -f4)"
      COMMIT_SHA_VAL="$(grep -o '"commitSha": "[^"]*' "$ATTN_FILE" | cut -d'"' -f4)"
      rm -f "$ATTN_FILE"
    fi

    NOW="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

    cat <<EOF > "$QUEUE_DIR/${TASK}.json"
{
  "taskId": "$TASK",
  "fromRole": "$ROLE",
  "toRole": "coder",
  "commitSha": "$COMMIT_SHA_VAL",
  "status": "rejected_feedback",
  "reason": "$REASON",
  "rejectedAt": "$NOW"
}
EOF
    _red "❌ [REJECT] Task '$TASK' rejeitada → retornada para correção."
    echo "   Motivo: $REASON"
    ;;

  # ─── status ──────────────────────────────────────────────
  status)
    echo ""
    _bold "═══════ OMNI HANDOFF STATUS ═══════"
    echo ""
    _bold "📬 FILA ATIVA (aguardando papel)"
    if ls "$QUEUE_DIR"/*.json 2>/dev/null | grep -q .; then
      for f in "$QUEUE_DIR"/*.json; do
        [ -e "$f" ] || continue
        TASK_ID="$(grep -o '"taskId": "[^"]*' "$f" | cut -d'"' -f4)"
        FROM="$(grep -o '"fromRole": "[^"]*' "$f" | cut -d'"' -f4)"
        TO="$(grep -o '"toRole": "[^"]*' "$f" | cut -d'"' -f4)"
        SHA="$(grep -o '"commitSha": "[^"]*' "$f" | cut -d'"' -f4)"
        STATUS="$(grep -o '"status": "[^"]*' "$f" | cut -d'"' -f4)"
        printf "  %-12s  %s → %s  [%s]  commit:%s\n" "$TASK_ID" "$FROM" "$TO" "$STATUS" "$SHA"
      done
    else
      echo "  (vazia)"
    fi

    echo ""
    _bold "⚠️  AGUARDANDO APROVAÇÃO HUMANA"
    if ls "$ATTENTION_DIR"/*.json 2>/dev/null | grep -q .; then
      for f in "$ATTENTION_DIR"/*.json; do
        [ -e "$f" ] || continue
        TASK_ID="$(grep -o '"taskId": "[^"]*' "$f" | cut -d'"' -f4)"
        ROLE="$(grep -o '"role": "[^"]*' "$f" | cut -d'"' -f4)"
        REASON="$(grep -o '"reason": "[^"]*' "$f" | cut -d'"' -f4)"
        SHA="$(grep -o '"commitSha": "[^"]*' "$f" | cut -d'"' -f4)"
        printf "  %-12s  papel:%-14s  commit:%-8s  motivo:%s\n" "$TASK_ID" "$ROLE" "$SHA" "$REASON"
      done
    else
      echo "  (nenhuma)"
    fi

    echo ""
    _bold "✅ ARQUIVADAS RECENTES"
    RECENT=0
    for f in "$ARCHIVE_DIR"/*.json; do
      [ -e "$f" ] || continue
      TASK_ID="$(grep -o '"taskId": "[^"]*' "$f" | cut -d'"' -f4)"
      echo "  $TASK_ID — CONCLUÍDA"
      RECENT=$((RECENT + 1))
      [ "$RECENT" -ge 5 ] && break
    done
    [ "$RECENT" -eq 0 ] && echo "  (nenhuma)"
    echo ""
    ;;

  *)
    usage
    ;;
esac
