# Verification record — implementation candidate, failed live bridge trial

## Versions and authority

Inspected Pi documentation and examples: **0.86.1**. Package host development dependencies: **0.86.1**. Orca runtime/live CLI guides: **1.4.192**. Bun: **1.4.2**. The initial draft briefly resolved 0.87.1 development dependencies; final manifest/lockfile were corrected to the inspected 0.86.1 contract.

The native proof was performed by the parent before this executor started. Parent evidence: `/home/alex/Work/GenUIExperiment/plans/001-execution.md` and read-only `plans/evidence/*.json` there. No native receipt is evidence of automatic Pi bridge wakeup. A later dedicated bridge trial is recorded below as **FAILED/UNVERIFIED** for end-to-end bridge behavior.

## Native Orca proof — parent verified PASS

- Two Pi workers overlapped in separate fixture worktrees from one recorded common base.
- One worker asked a bounded question, resumed after the exact reply and wrote the requested heading; the other edited its own separate fixture.
- Question/reply, repeated unacknowledged Delivery, succeeded completion, release, ack-returning-next-batch and finite empty timeout passed.
- Source Run: `run_47533ecf4333`; exact coordinator launch handle was confirmed against Run ownership. Unqualified `terminal show` selected a different UI terminal, so it is never used by this bridge.
- Native workers reported `openai-codex/gpt-5.5`, medium. They still had old packages installed/loaded; native success is not the old-extensions-unloaded acceptance gate.
- `test/fixtures/*.observed.json` retain sanitized response shapes only; identifiers, paths and request identities are replaced. `failed-start.synthetic.json` is deliberately synthetic, not evidence of a forced live failure.

## Provider-free implementation checks — PASS

Run in this assigned isolated checkout:

```
bun install --frozen-lockfile
bun run check
bun test
```

`check` is strict TypeScript (`tsc --noEmit`, strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes). Tests invoke only fake Orca executors and local child processes; no provider, credentials, Orca binary or network is needed. Installation itself requires available dependencies/cache.

Coverage includes argv safety; bounded separate stdout/stderr; nonzero/malformed receipt retention; cancellation; pre-aborted no-launch; exact Run/repo/terminal ownership; pre-attach owner inspection; concurrent admission with durable uncertain reservations and task reconciliation; strict observed JSON-string message payloads; full FIFO batch validation; bounded read pages; questions and runtime cleanup proof; duplicate/replay; successful reply receipt restoration; lost-reply pause; receive/persist/inject interruptions; ack-next-batch and empty-ack listener restart; stale reply/ack rejection; real registered Pi event-handler tests for detached startup, busy follow-up, reload, fork/new/session replacement, tree pause, compaction and shutdown.

An earlier draft had failing shallow mocks and a fast-empty-wait test hang. Those were replaced by controllable abort-aware fake waits and actual extension-event harness tests; they are not counted as evidence of correctness.

## Conservative v1 recovery limits

- A reply intent with no validated durable successful receipt **pauses**. No proven public coordinator question-status inspection API exists; this bridge does not misuse worker `ask --resume`, re-answer, or infer answered state. Inspect retained receipts and runtime-issued exact recovery; manual reconciliation is required when proof is unavailable.
- Task/create/start uncertainty occupies capacity across reload until authoritative settlement can reconcile it. Unknown task creation with no returned identity cannot be auto-cleared; no retry key or replacement is invented.
- Ack uncertainty retains the old checkpoint. Explicit resume compares Orca's authoritative current Delivery; it retains the next batch if the old ack committed, and refuses an unexplained change otherwise.
- Cleanup acceptance supports verified release (`released` ownership/release with exact owner Dispatch), verified immediate reuse by a live new Dispatch on the same terminal in this Run, and observed runtime `user_owned`/`user_takeover`. Unproven explicit-retain, pre-existing-terminal, release_pending and release_unknown shapes fail closed. Parent explicitly approved this bounded limitation; it is not a fabricated pass for every cleanup form.
- Broken authority/downtime/malformed records pause. A normal finite empty timeout rolls into one further bounded wait with no model turn. Shutdown aborts only owned CLI children, never workers/worktrees.

## Dedicated bridge live trial — FAILED / UNVERIFIED

A dedicated lead loaded only this extension and exposed the expected tools: `read`, `bash`, `edit`, `write`, `orca_delegate`, and `orca_inbox`. Binding to Run `run_97fa33433029` succeeded at 12:25:20, with Orca runtime `1.4.192`; this confirms extension load and Run binding only, not end-to-end delivery.

The trial then made a procedure error: after the bridge was already bound, the test lead called raw orchestration `run-use` at 12:27:41. The bridge checkpoint became paused within about 200 ms and the TUI showed `Invalid inbox authority/connection state`. The exact returned error/cancellation record was not captured, so causality and a source-code defect are unproven; we observed `Invalid inbox authority/connection state` after raw `run-use`, not an actual retained `cancelled=true` receipt.

Both custom `pi --no-extensions` `worker-start --terminal` attempts returned `ok: true` but failed at `stage=dispatch_input` with `lastError=agent_prompt_stalled`, even though the worker prompts later executed. These are runtime-start/input-readiness blockers for this trial. Do not retry live orchestration without new explicit approval.

Observed worker results were failures, not bridge passes:

- Task A slept 60 seconds, then `orca orchestration ask` failed with `ask requires an active supervised Dispatch`; it modified no files.
- Task B slept 120 seconds, committed only `live-b.md` at `6efda3a`, then deliberately failed `AssertionError [ERR_ASSERTION]: 1 == 2`; its `worker_done` outcome was `failed`.
- `worker-release` returned retained external-terminal receipts with `processAction=none`; resource ownership was external/release not requested, with original terminal/dispatch identities preserved.

The lead received native runtime nudges as ordinary USER messages at 12:29:56 and 12:30:55. Parent analysis found zero pi-orca custom-message injections, and recorded bridge inbox delivery remained null. `orca_inbox pending` twice returned `No active Delivery`; the lead then incorrectly bypassed the bridge with raw CLI `check`/`ack`. Therefore no bridge wakeup, bridge ack, or bridge recovery PASS can be claimed.

### Live rollout gates after the failed trial

| Required case | State |
| --- | --- |
| Dedicated lead loads only this extension; workers' old tools absent | PARTIAL: extension/tool surface verified |
| `/orca start` or equivalent bridge binding to explicit Run | PARTIAL: binding succeeded for `run_97fa33433029` |
| Two bridge-launched workers overlap, separate edits/common base, actual model selection | FAILED/UNVERIFIED: custom worker-start attempts hit `agent_prompt_stalled` |
| Idle lead automatically wakes for blocking question and exact reply resumes worker | FAILED/UNVERIFIED: no custom bridge Delivery; Task A ask failed |
| Busy lead receives completion without interrupting tools/human input | FAILED/UNVERIFIED: native runtime nudges only, not pi-orca delivery |
| Bridge `orca_inbox pending`/`ack` handles completion and cleanup | FAILED/UNVERIFIED: pending returned `No active Delivery`; raw CLI was used incorrectly |
| Pending-question reload/replay and session/tree ownership live behavior | NOT RUN |
| Live failed completion remains failed | OBSERVED via raw CLI only; not a bridge acceptance pass |
| Explicit stop of approved fixture attempt leaves unrelated terminals/worktrees intact | NOT RUN: no explicit worker-stop test; fixture preservation alone is not acceptance |
| Pre-existing/explicit-retain terminal cleanup evidence | OBSERVED retained external terminals; bridge cleanup acceptance still unverified |
| Full old-extensions-unloaded acceptance and post-migration round trip | NOT RUN |
| Global package removal, owner instruction patch and Taskdesk regression gates | NOT RUN; rollout not authorized |

No Taskdesk files, private transcripts, auth/environment values, or fixture worktrees/terminals are published here. Candidate publication is experimental only; rollout remains forbidden. The narrow next step is to diagnose supported Pi launcher/input readiness and avoid double-binding before any newly approved short retry.
