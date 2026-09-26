---
name: orca-development
description: >-
  Use when leading Pi development work in Orca: choose an appropriate short
  process, inspect with the native Orca CLI, coordinate supervised
  Tasks/Dispatches, review worker evidence, and clean up resources without
  using a custom orchestration runtime.
---

# Orca Development

Use this skill when a lead Pi session is doing source work in Orca and may need planning, decomposition, workers, review, or cleanup. Orca's installed guides are authoritative for exact commands: resolve the CLI for the current environment, run `orca skills get orca-cli` (or the selected executable's equivalent), and follow its version-matched public guide. When coordinating supervised Tasks/Dispatches, messages, blocking asks, worker completion, or decision gates, also read the version-matched orchestration guide with `orca skills get orchestration` before choosing commands.

## Principles

- Let the lead choose the process: direct edit, inspection, one worker, several workers, or no workers, based on the user's scope, risk, and budget.
- Native Orca owns worktrees, terminals, Tasks, Dispatches, inbox/wake notifications, lifecycle receipts, and cleanup state. Do not build or simulate a second runtime in Pi session memory.
- Keep one writer per checkout. A lead may inspect many checkouts, but only the checkout's owning writer changes its files unless ownership is explicitly transferred.
- Use actual Orca Task and Dispatch identities in worker prompts, messages, reports, and cleanup decisions; never substitute guessed names or local-only state.
- Treat worker completion as evidence for review, not acceptance. Review the report, diff, and relevant terminal/output before integrating or closing work.
- Do not merge, push, publish, install/remove packages, change global settings, or delete worktrees without explicit authorization.

## Lead workflow

1. Clarify the requested outcome and constraints. Use `/skill:improve` only when an advisory review/planning role is useful; that role is read-only when used, but ordinary leads and writers are not blanket read-only.
2. Inspect current repo state and relevant docs. If Orca state matters, use the native Orca CLI guide; if coordination state matters, use the native orchestration guide too. Do not rely on remembered command recipes.
3. Decide the smallest effective execution shape: direct implementation, targeted worker dispatch, parallel independent workers, reviewer, or integration worker. Avoid fixed concurrency policies; stay within explicit user/coordinator limits.
4. For each worker, provide the objective, repo/base/ref, owned files or components, prohibited areas, success criteria, verification expectations, STOP/ask conditions, and required completion evidence.
5. Answer worker questions exactly once through Orca's supervised ask/reply flow. If a question asks for a choice, answer the choice asked; if it is malformed or ambiguous, request clarification instead of inventing intent.
6. Account for whole FIFO message deliveries before acknowledging them. Do not acknowledge a batch until every message in that delivery has been read, routed, or deliberately recorded for follow-up.
7. On unknown mutations or uncertain delivery/launch/cleanup outcomes, inspect authoritative Orca state and retained evidence. Do not blindly retry, duplicate answers, or replace workers while identity or side effects are unclear.
8. Preserve useful edits and failed states until reviewed. Failed workers can contain valuable commits, diffs, logs, or repro evidence.
9. Use Orca resource cleanup for settled owned worker terminals/worktrees when cleanup is authorized. Do not stop or remove unrelated user/setup terminals.

## Worker completion evidence

Ask workers to report concise evidence: Task/Dispatch IDs, branch/base/commit or diff location, files changed, checks actually run, failures, unresolved risks, and whether cleanup is safe. A successful `worker_done` means the worker asserts completion; the lead still decides acceptance after review.

## Native runtime nudges vs old bridge evidence

Orca may inject lifecycle nudges, inbox messages, and wake notifications directly. Treat those as native runtime behavior. Historical custom bridge trial evidence from this repository is preserved only as migration context and must not be cited as proof that a new migration has passed.
