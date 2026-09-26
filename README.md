# pi-orca

A thin Pi package that makes Orca's existing orchestration convenient from a lead Pi session. It exposes exactly one extension (`src/index.ts`) and one workflow skill (`skills/orca-development`); Orca remains the owner of worktrees, terminals, Tasks, Dispatches, messages, cleanup, and lifecycle receipts.

## What it adds

- `/orca start <objective>` and `/orca attach <run-id>` bind a lead Pi session to an explicit Orca Run.
- `/orca status`, `/orca pause`, `/orca resume`, and `/orca limit <n>` control only this bridge in the bound Run; default limit is four.
- `orca_delegate` creates one Task and starts one local Pi worker in a new top-level worktree from an explicit existing base ref.
- `orca_inbox` offers only `pending`, `reply`, and `ack`. `pending` pages the whole FIFO batch; `reply` uses its exact question ID; `ack` takes its exact delivery ID and `accountedMessageIds` for other messages. Cleanup is verified via Orca, not declared by the model.

Use the installed Orca CLI/orchestration skills for inspection, stopping, releasing, and all other operations. This package intentionally does not wrap Orca's whole CLI and does not implement a scheduler, broker, retry system, custom model backend, merge bot, or database.

## Workflow summary

1. Lead uses `/skill:improve`, vets findings, and writes/chooses plans; improve stays advisory/read-only.
2. User selects work or authorizes a bounded set; nothing is auto-executed from suggestions.
3. Lead partitions independent files/components and launches ready Tasks up to the bridge limit with a recorded common base ref.
4. Workers receive full context, owned/prohibited files, verification commands, STOP/ask conditions, and use Orca's injected `ask`/`worker_done` contract.
5. Lead answers questions and handles completions from `orca_inbox`; success requires report review and explicit cleanup/release decisions, not terminal idleness.
6. Accepted candidate branches are reviewed and integrated only by an explicitly authorized integration worker, with all gates re-run.

## Local verification

```bash
bun install
bun run check
bun test
```

After initial dependency resolution, use `bun install --frozen-lockfile`. Tests are provider-free and do not require Orca, credentials, or network access. Pi host development dependencies are pinned to `0.86.1`; host packages and TypeBox remain peers, not bundled runtimes.

## Safety and recovery

Run inside a live, local Orca-managed Pi terminal with exact `ORCA_TERMINAL_HANDLE`. Binding validates that terminal, repository metadata, active worker role across Runs, and Run coordinator ownership. Attach never takes over another coordinator. New/forked/cloned sessions cannot inherit authority. Reload revalidates; `/tree` pauses until explicit resume. Worktrees are cooperative isolation, **not filesystem security sandboxes**.

CLI executable selection is fixed per session: explicit `ORCA_CLI_COMMAND`, declared dev environment, otherwise `orca-ide` on Linux. No fallback executable or model is tried. Pi launches use the configured launcher/model; no unsupported model/effort flags are sent. Initial source default evidence was `openai-codex/gpt-5.5` / medium, not a bridge guarantee.

Inbox injection is attributed and queued as a follow-up, never human input or automatic acknowledgement. Read every `pending` page explicitly before ack (6000-character text slices; concatenate pages to reconstruct complete records). Unknown reply outcomes pause with the original question/Delivery retained; a successful reply receipt is durable and prevents duplicate replies after reload. There is no proven coordinator question-status API: lost reply receipts require manual inspection/runtime-issued recovery, not another answer. Unknown launch reservations remain occupied, including after reload; inspect their existing Task/Dispatch before any replacement. `pending` with `receiptIndex` and `page` exposes retained bounded mutation receipts even while paused.

Verified cleanup currently accepts exact released ownership, verified immediate reuse on the same terminal in this Run, or observed runtime `user_owned`/`user_takeover` retention. Other retention forms fail closed and remain a live gate. No worker is stopped or released automatically by this extension. See [live verification](docs/live-verification.md) for pending gates.

## Installation after acceptance

After live wakeup testing and separate rollout approval, install locally with:

```bash
pi install /home/alex/Work/pi-orca
```

Do not remove older Pi coordination packages or edit project instructions until the documented rollout gate is approved.
