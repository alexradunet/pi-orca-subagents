# Publication report

## Scope and authority

Published `main` to `https://github.com/alexradunet/pi-orca-subagents.git` as an explicitly experimental implementation candidate. This did not modify `/home/alex/orca/workspaces/pi-orca/implement-orca-bridge` after inspecting its clean candidate commit `fd52e23be8fbe5dd8003f54e05e2812d3b6c27ed`.

## Repository checks

- Starting main baseline: `bd73766cc8c94bd382d274a7ac288ab0974e00b2`.
- Candidate fast-forward target: `fd52e23be8fbe5dd8003f54e05e2812d3b6c27ed`.
- Pre-push target probe: `git ls-remote https://github.com/alexradunet/pi-orca-subagents.git` returned success with no refs.
- Local main was fast-forwarded with `git merge --ff-only fd52e23be8fbe5dd8003f54e05e2812d3b6c27ed`; no reset or history rewrite was used.
- Added `origin` exactly as `https://github.com/alexradunet/pi-orca-subagents.git`.
- Push used normal `git push -u origin main`; no force push, branch deletion, npm publish, release, global install/removal, Taskdesk change, or source behavior change was performed.

## Secret/private-payload review

Inspected tracked files and history before push with `git ls-files`, targeted `rg`/`git grep` patterns for common tokens, private keys, bearer headers, passwords, API keys and secrets, and `git log --all -p` pattern checks. No credential/private-key hits were found; benign matches were dependency/package words such as AWS `credential-provider`/`token-providers` in `bun.lock` and prose about not printing secrets in docs.

## Checks run

- `bun install --frozen-lockfile`: pass, bun 1.4.2, no lockfile changes.
- `bun run check`: pass (`tsc --noEmit`).
- `bun test`: pass, 24 pass / 0 fail across 3 files.
- `git diff --check`: pass.

## Publication docs added

- `README.md`: added prominent experimental/not-live-accepted warning and portable clone/install instructions for `https://github.com/alexradunet/pi-orca-subagents.git`.
- `docs/publication-report.md`: this evidence report.

## Remaining live gate

All automatic bridge live acceptance gates in `docs/live-verification.md` remain **NOT RUN** here, including automatic wakeup, recovery/session reload behavior, old-extension-unloaded replacement, and global rollout/Taskdesk gates. Parent live trials in a separate fixture repo are not claimed as this package passing those gates.
