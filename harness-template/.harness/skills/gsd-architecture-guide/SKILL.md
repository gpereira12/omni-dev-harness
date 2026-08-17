---
name: gsd-architecture-guide
description: Guia de governança Get-Shit-Done (GSD) com tracking de estado em .planning/STATE.md e decisões estruturais em PROJECT.md.
always_use: false
---

# 🎯 Get-Shit-Done (GSD) Architecture Guide

A governança do projeto utiliza a metodologia GSD para manter o estado vivo e decisões travadas.

## Estrutura de `.planning/`

- `.planning/PROJECT.md`: Visão geral, roadmap e **Decisões Estruturais Travadas** (`DEC-001`, `DEC-002`).
- `.planning/STATE.md`: Status atual da sprint/tarefa, próximas ações e blockers.

## Protocolo de Execução
1. **Ao Iniciar**: Leia `.planning/STATE.md` para entender o contexto atual.
2. **Ao Decidir**: Registre novas decisões arquiteturais como `DEC-*` em `PROJECT.md`.
3. **Ao Concluir**: Atualize `STATE.md` com os artefatos criados e o novo status.
