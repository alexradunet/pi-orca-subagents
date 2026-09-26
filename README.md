# pi-orca

A skills-only Pi package for Orca-managed development. The previous TypeScript bridge experiment is superseded; Git history preserves it at `8d98328` and earlier commits for audit.

## What this package provides

- One skill: [`orca-development`](skills/orca-development/SKILL.md).
- No Pi extension, SDK wrapper, scheduler, broker, registry, custom runtime, build step, or unit-test harness.
- Guidance that points leads to native Orca CLI/orchestration capabilities and version-matched public guides instead of hardcoded recipes.

## Install for review

```bash
pi install /absolute/path/to/pi-orca
```

The manifest exposes only `./skills`. Installing does not change global Orca/Pi settings beyond the explicit package entry created by `pi install`.

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

Use Orca as the source of truth for worktrees, terminals, Tasks, Dispatches, lifecycle notifications, questions, completion evidence, and resource cleanup. Leads choose decomposition, tools/agents, concurrency, and inspection depth within the user's authorized scope and budget; this package does not impose a fixed slot count or keep private Pi session state.

Do not merge, push, publish, remove packages, alter global settings, or delete worktrees unless the user explicitly authorizes that action.
