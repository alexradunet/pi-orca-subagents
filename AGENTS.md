# pi-orca development

This repository is a skills-only Pi package for Orca-managed development workflows. Keep it narrow: one `orca-development` skill, no extension runtime, no scheduler/database/broker, no scripted orchestrator, no global Pi settings changes, and no Taskdesk source/data changes from this checkout.

Use native Orca CLI/orchestration documentation for live behavior. There are no Bun build or unit-test targets after the bridge removal; verify manifests, skill frontmatter, docs, and Git cleanliness directly.

Live Orca worker launches, package rollout, old-package removal, merge, push, install, and public sharing require explicit coordinator/owner approval.
