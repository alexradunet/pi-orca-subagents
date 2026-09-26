# Migration notes

This branch replaces the former Pi extension bridge with a skills-only package. Git history preserves the experiment; `8d98328` is the final pre-replacement reference for the old live-trial documentation and bridge source.

## What changed

- Package manifest now exposes only `./skills`.
- `skills/orca-development/SKILL.md` is the single live resource.
- TypeScript source, bridge tests, fixtures, lockfile, and build scripts were removed because they served only the superseded custom runtime.
- Native Orca CLI/orchestration owns Tasks, Dispatches, wake notifications, resource state, and cleanup.

## Rollout boundary

Installing or removing any package, disabling older coordination resources, launching live acceptance workers, merging, pushing, or changing global settings remains outside this checkout's authority unless explicitly approved.

## Verification for this package

- Confirm `package.json` has `pi.skills: ["./skills"]` and no `pi.extensions`.
- Confirm `skills/orca-development/SKILL.md` has valid skill frontmatter: lowercase hyphenated `name` and a non-empty description.
- Confirm docs describe native Orca as source of truth and do not present old bridge commands as live instructions.
- Run `git diff --check` and inspect `git status --short`.

Do not claim the migration has passed live Orca acceptance until the parent/coordinator reports that scoped native acceptance has passed.
