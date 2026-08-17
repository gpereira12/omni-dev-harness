---
name: git-worktree-workflow
description: Workflow para criação e gerenciamento de Git Worktrees isolados para sessões paralelas de agentes de IA.
always_use: false
---

# 🌿 Git Worktree Isolation Workflow

Utilize Git Worktrees para permitir que múltiplos agentes trabalhem em features ou branches diferentes simultaneamente sem conflito no diretório de trabalho principal.

## Comandos Padrão

```bash
# 1. Criar novo worktree para uma nova feature
git worktree add -b feature/minha-feature ../worktrees/minha-feature main

# 2. Listar worktrees ativos
git worktree list

# 3. Remover worktree após merge
git worktree remove ../worktrees/minha-feature
```
