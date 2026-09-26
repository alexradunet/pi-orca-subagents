# pi-orca development

This repository contains a small Pi package that bridges a lead Pi session to Orca orchestration. Keep it narrow: one extension, one workflow skill, provider-free tests, no scheduler/database/broker, no global Pi settings changes, and no Taskdesk source/data changes from this checkout.

Use Bun commands:

```bash
bun run check
bun test
```

Live Orca worker launches, package rollout, and old-package removal require explicit coordinator/owner approval.
