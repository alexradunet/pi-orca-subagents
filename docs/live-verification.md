# Historical verification and remaining gates

The old custom bridge implementation and its evidence are historical. Reference commit `8d98328` for the last pre-replacement state; do not preserve or follow those bridge commands as live documentation in this skills-only package.

## Historical evidence retained in Git

The previous experiment showed that extension loading and Run binding could occur, but its dedicated live bridge trial failed to prove end-to-end bridge wakeup, inbox acknowledgement, recovery behavior, old-package replacement, or rollout safety. It also recorded useful failure evidence: runtime prompt/input readiness issues, failed worker outcomes, retained external terminals, and a distinction between native Orca lifecycle nudges and custom bridge injections.

That evidence remains valuable for audit, but it is not an acceptance pass for this replacement.

## Skills-first acceptance gates

The parent/coordinator owns live acceptance. Before claiming success, it must verify in the intended environment that:

- the package loads only the `orca-development` skill;
- leads use native Orca CLI/orchestration guides and actual Task/Dispatch identities;
- questions are answered exactly once and FIFO deliveries are fully accounted before acknowledgement;
- worker completion is reviewed as evidence, not automatically accepted;
- failed/edited worktrees are preserved until reviewed;
- authorized cleanup uses Orca resource cleanup and does not remove unrelated terminals/worktrees;
- no unauthorized merge, push, install/remove, global settings change, or Taskdesk change occurred.

Until that report exists, this repository can only claim local package-shape verification.
