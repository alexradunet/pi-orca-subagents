# Verification record — implementation candidate, not rollout acceptance

## Versions and authority

Inspected Pi documentation and examples: **0.86.1**. Package host development dependencies: **0.86.1**. Orca runtime/live CLI guides: **1.4.192**. Bun: **1.4.2**. The initial draft briefly resolved 0.87.1 development dependencies; final manifest/lockfile were corrected to the inspected 0.86.1 contract.

The native proof was performed by the parent before this executor started. Parent evidence: `/home/alex/Work/GenUIExperiment/plans/001-execution.md` and read-only `plans/evidence/*.json` there. No native receipt is evidence of automatic Pi bridge wakeup.

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

## Automatic bridge live gates — NOT YET RUN

| Required case | State |
| --- | --- |
| Dedicated lead loads only this extension; workers' old tools absent | NOT RUN |
| Two bridge-launched workers overlap, separate edits/common base, actual model selection | NOT RUN |
| Idle lead automatically wakes for blocking question and exact reply resumes worker | NOT RUN |
| Busy lead receives completion without interrupting tools/human input | NOT RUN |
| Pending-question reload/replay and session/tree ownership live behavior | NOT RUN |
| Live failed completion remains failed | NOT RUN |
| Explicit stop of approved fixture attempt leaves unrelated terminals/worktrees intact | NOT RUN; extra paid attempt requires approval |
| Pre-existing/explicit-retain terminal cleanup evidence | NOT RUN / fail-closed acknowledgement |
| Full old-extensions-unloaded acceptance and post-migration round trip | NOT RUN |
| Global package removal, owner instruction patch and Taskdesk regression gates | NOT RUN; rollout not authorized |

No worker launches, paid smoke calls, global settings changes, Taskdesk writes, merges, pushes or publication were executed by this implementation worker. Steps 6–7 remain parent/owner gates. **Do not recommend global migration based on unit tests alone.**
