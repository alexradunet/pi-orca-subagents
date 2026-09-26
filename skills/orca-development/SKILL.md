---
name: orca-development
description: Use for Pi lead development workflows that combine /skill:improve planning with Orca-supervised parallel workers, review, acceptance, integration, and cleanup.
---

# Orca Development Workflow

Use this skill when a lead Pi session is coordinating source work through Orca. The installed Orca guide remains authoritative for exact CLI details; this skill describes the workflow and division of responsibility.

1. Start with `/skill:improve` when auditing or planning. The improve role is advisory/read-only: vet findings, write plans, and preserve human publication authority.
2. Ask the user to select work or explicitly authorize a bounded set. Do not turn every suggestion into automatic execution.
3. Partition work by exclusive files/components and dependencies. Use a recorded common base for independent branches; wait for accepted dependencies or an explicitly selected stacked ref for dependent work.
4. Launch ready Tasks up to the chosen Orca bridge ceiling. Each worker brief must include objective, repo/ref, owned files, prohibited files/data, success criteria, verification commands, expected report, and STOP/ask conditions.
5. Writing workers do not load the read-only improve skill as their execution role. They use Orca's injected `ask` and `worker_done` lifecycle contract, not Intercom, guessed coordinator identities, or local-only prompts.
6. A worker report must contain branch/base/commit or diff location, modified files, checks actually run, failures, and residual risks. Terminal idle or exit alone is not success.
7. The lead handles questions and completion deliveries through the bound Orca inbox. A follow-up `send` is mailbox delivery, not guaranteed prompt injection.
8. Once the bridge is bound to a Run, do **not** call raw orchestration `run-use`, `run-create`, `check`, `reply`, or `ack` for that Run. Use `/orca` controls and `orca_inbox`; if the bridge pauses or `orca_inbox pending` reports `No active Delivery`, stop and inspect rather than bypassing the bridge with raw CLI delivery commands.
9. Review candidate diffs with fresh context when useful. Return revisions to the owning worker or a replacement; use one integration worker only after authorization and rerun all gates.
10. Release exact settled owned agent terminals through Orca after accepted completion or failure. Do not delete worktrees or setup/user terminals as cleanup. Report failures as failures.

If Orca ownership, delivery acknowledgement, or launch semantics are unclear, pause and inspect/ask rather than building a second coordination system.
