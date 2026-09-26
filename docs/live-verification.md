# Historical verification and remaining gates

The old custom bridge implementation and its evidence are historical. Reference commit `8d98328` for the last pre-replacement state; do not preserve or follow those bridge commands as live documentation in this skills-only package.

## Historical evidence retained in Git

The previous experiment showed that extension loading and Run binding could occur, but its dedicated live bridge trial failed to prove end-to-end bridge wakeup, inbox acknowledgement, recovery behavior, old-package replacement, or rollout safety. It also recorded useful failure evidence: runtime prompt/input readiness issues, failed worker outcomes, retained external terminals, and a distinction between native Orca lifecycle nudges and custom bridge injections.

That evidence remains valuable for audit, but it is not an acceptance pass for this replacement.

## Native Orca partial acceptance evidence (2026-09-26)

Scoped native acceptance on Pi `0.86.1` / Orca `1.4.192` was a **partial pass**, not a replacement acceptance pass. The run used native Orca task/mailbox/lifecycle state (`run_3ff08c7bb1c0`) with fixture repo `82d45ea7-e3a7-4510-adf0-aa98dbca44eb` at base `65bcb6f2a104582dfa37bac7fa33cfe6c6847d71`; the lead's actual tool list excluded the old coordination tools and project filters were active, while old-tool absence statements from workers are self-reports rather than independent evidence.

Passed evidence:

- Exactly two normal native Pi workers started successfully: A `task_e0cbb890bffb` / `ctx_b5f48cb10b98` in worktree `native-skill-a`, and B `task_0a9ee01d569e` / `ctx_80c6cd5137d2` in worktree `native-skill-b`.
- Native ask/reply worked after manual lead resume: delivery `delivery_e58f2788b346` included A question `msg_3efc831942ff`, the lead replied exactly `Beta`, and A later completed in `delivery_16421206f815`.
- A succeeded with commit `a60048604425caad83f6e3c53caef3e8537820b2` (`Add native skill A evidence`) containing `answer: Beta`.
- B preserved the intentional failure: commit `1c4b6e77b791e06c555f1685790fcf72265a4e05` (`Add native worker B evidence`) documented the deliberate failing assertion, and B's task remained failed as intended.

Not passed / not accepted:

- Automatic idle mailbox wake was not observed. The lead ended its turn at `13:13:13`; after several minutes without an idle wake, the parent test driver manually resumed it, so this run cannot prove automatic lead wake after ending a turn.
- Both settled worker terminals were `exited` / `operator_close` and archives were captured, but `worker-release` returned `release_unknown` / `tab_not_found` even after the documented same-request replay. Record this as unresolved release evidence, not clean release, and do not add retry/fix machinery here.
- Old packages remain installed and global rollout remains paused.

## Skills-first acceptance gates

The parent/coordinator owns live acceptance. Before claiming success, it must verify in the intended environment that:

- the package loads only the `orca-development` skill;
- leads use native Orca CLI/orchestration guides and actual Task/Dispatch identities;
- questions are answered exactly once and FIFO deliveries are fully accounted before acknowledgement;
- while supervising pending work, leads use documented bounded `check --wait` or other native orchestration waits instead of assuming that ending the turn will automatically resume on mailbox activity;
- worker completion is reviewed as evidence, not automatically accepted;
- failed/edited worktrees are preserved until reviewed;
- authorized cleanup uses Orca resource cleanup and does not remove unrelated terminals/worktrees;
- no unauthorized merge, push, install/remove, global settings change, or Taskdesk change occurred.

This repository currently claims skills-only package shape plus the partial native evidence above; it does not claim full migration acceptance or rollout readiness.
