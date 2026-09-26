# Migration and rollback notes

This package is not rolled out globally by implementation alone.

Future rollout requires separate approval:

1. Inventory active sessions that still use existing coordination packages.
2. Back up only affected Pi package/settings entries without printing secrets.
3. Install this local package with `pi install /home/alex/Work/pi-orca`.
4. Review `docs/improve-orca.patch` as a proposed adaptation, not an automatically applicable owner-file change. Decide explicitly whether to commit/share the currently untracked improve skill or rely on this package skill; do not stage unrelated .agents content or invent skills-lock hashes.
5. In a dedicated trial session, disable the old coordination resources through supported Pi package filtering and verify this package's tools load while old tools are absent.
6. Only after successful trial and explicit global removal approval, use `pi remove npm:pi-subagents` and `pi remove npm:pi-intercom`, preserving unrelated packages (including pi-web-access). Recorded rollback versions are `npm:pi-subagents@0.71.0` and `npm:pi-intercom@0.14.0`; confirm availability before depending on them.

Rollback: pause the Orca bridge, leave worker worktrees intact, reinstall the recorded old package versions, and restore the backed-up settings entries. Rollback does not transfer active Orca Dispatch state into another coordination system; reconcile live work explicitly.

Proposed future `AGENTS.md` paragraph: "Development coordination uses Orca-managed worktrees and supervised Tasks. Use `/skill:improve` for read-only planning, then dispatch bounded writing work through the local pi-orca bridge from an explicit Orca Run; workers report branch/base/commit, files changed, checks run, failures, and risks. Do not merge, push, delete worktrees, or remove global Pi packages without explicit approval."
