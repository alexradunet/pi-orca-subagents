# Skills-first replacement report

## Scope

Implemented the owner-approved Pareto replacement in isolated checkout `/home/alex/orca/workspaces/pi-orca/skills-first`, based on main `8d98328fd93a7e6c9311503cede5ba8861732aa1`.

## Change list

- Converted `package.json` to a skills-only Pi package exposing only `./skills`.
- Removed bridge runtime source: `src/index.ts`, `src/orca.ts`, `src/inbox.ts`.
- Removed bridge-only tests and fixtures under `test/`.
- Removed TypeScript/build artifacts that no longer serve the package: `tsconfig.json`, `bun.lock`, `scripts`, Pi SDK peer/dev dependencies, and TypeScript dependencies.
- Rewrote `skills/orca-development/SKILL.md` as concise process guidance for native Orca-managed development.
- Rewrote `README.md` and `AGENTS.md` for the skills-only package and no-Bun verification reality.
- Replaced migration/verification docs with concise historical notes that reference `8d98328` for the superseded experiment, retain meaningful failure evidence, and distinguish native Orca lifecycle nudges from old custom bridge claims.
- Removed obsolete live bridge reports/patch docs so no second implementation or live bridge command recipe ships.

## Documentation inspected

- `/home/alex/.local/share/mise/installs/pi/0.86.1/pi/docs/packages.md` read fully.
- `/home/alex/.local/share/mise/installs/pi/0.86.1/pi/docs/skills.md` read fully.
- Current `orca-cli` skill stub and version-matched `orca-ide skills get orca-cli` guide read for native Orca CLI expectations.

## Verification run

```bash
python - <<'PY'
import json, pathlib, re
pkg=json.load(open('package.json'))
assert pkg['pi']=={'skills':['./skills']}
text=pathlib.Path('skills/orca-development/SKILL.md').read_text()
assert text.startswith('---\n')
fm=text.split('---\n',2)[1]
assert re.search(r'^name: orca-development$', fm, re.M)
assert re.search(r'^description: .+', fm, re.M)
assert not pathlib.Path('src').exists()
assert not pathlib.Path('test').exists()
print('manifest and skill checks passed')
PY

git diff --check
```

Result: manifest and skill checks passed; `git diff --check` passed.

Also ran `orca-ide status --json` successfully and inspected the version-matched Orca CLI guide. No live workers, package installs/removals, merges, pushes, global settings edits, Taskdesk edits, paid trials, or nested workers were performed.

## Remaining gates

- Parent/coordinator review of this commit.
- Parent-scoped native acceptance before claiming migration success.
- Any install, rollout, old-package removal, live worker launch, merge, push, or public sharing remains unauthorized until explicitly approved.
