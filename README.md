# pi-orca

Historical retired experiment for Orca-managed Pi development. The TypeScript bridge and later skills-only package directions are superseded by a native local skill; Git history preserves the experiment at `8d98328` and later simplification commits for audit.

## Current direction

Use a local skill at `~/.agents/skills/orca-development/SKILL.md` for active Orca development guidance. Native Orca CLI/orchestration capabilities and their version-matched public guides are the source of truth; this repository is retained only as historical evidence, not as the recommended install path.

## What this repository contains

- Historical skill text at [`skills/orca-development/SKILL.md`](skills/orca-development/SKILL.md).
- Historical evidence that the custom Pi extension, SDK wrapper, scheduler, broker, registry, runtime, build step, and unit-test harness were removed.
- Documentation of the operating boundaries that informed the local-skill replacement.

## Installation

Package installation from this repository is no longer recommended. If you are reviewing the archived experiment anyway, inspect files directly instead of adding it to Pi settings.

## Verification

```bash
pi --no-skills --skill ./skills/orca-development/SKILL.md
```

For repository hygiene, use:

```bash
git diff --check
git status --short
```

There are no meaningful `bun run check` or `bun test` targets after removing the custom bridge runtime.

## Operating boundary

Use Orca as the source of truth for worktrees, terminals, Tasks, Dispatches, mailbox/lifecycle state, questions, completion evidence, and resource cleanup. While supervising pending work, use the documented bounded `check --wait`/native orchestration wait flow; do not assume that ending a turn automatically resumes on mailbox activity. Leads choose decomposition, tools/agents, concurrency, and inspection depth within the user's authorized scope and budget; this package does not impose a fixed slot count or keep private Pi session state.

Do not merge, push, publish, remove packages, alter global settings, or delete worktrees unless the user explicitly authorizes that action.
