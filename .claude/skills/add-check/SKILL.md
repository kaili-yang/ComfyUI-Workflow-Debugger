---
name: add-check
description: Step-by-step for adding a new diagnostic check to comfy_workflow_debuger. Use when the user wants to detect a new class of problem in workflows.
---

# Adding a New Check

## Step 1 — Identify the category

Consult the category table in `CLAUDE.md`. Pick the existing file that best
matches, or create a new file under `src/lib/checks/others/` if no category fits.

Category quick-reference:
- Link ID consistency → `checks/link.ts`
- Wire type mismatch → `checks/type-mismatch.ts`
- Node lifecycle (muted, orphan) → `checks/node-state.ts`
- Graph-level structure (reachability, cycles) → `checks/topology.ts`
- `/object_info` schema validation → `checks/schema.ts`
- `widgets_values` file references → `checks/media.ts`
- API-format-only issues → `checks/api-format.ts`
- Doesn't fit → `checks/others/<descriptive-name>.ts`

## Step 2 — Write the check function

```typescript
// src/lib/checks/<category>.ts

import type { Issue } from '../../types/workflow'
import type { GraphAnalysisContext } from '../shared/graph-context'

export function checkMyNewThing(ctx: GraphAnalysisContext): Issue[] {
  const { workflow, nodeMap, linkMap, objectInfo } = ctx
  const issues: Issue[] = []

  // Detection logic here...

  return issues
}
```

Mandatory constraints:
- Never mutate `ctx.workflow`, `ctx.nodeMap`, `ctx.linkMap`, or `ctx.objectInfo`
- Return `[]` fast when the check does not apply (missing objectInfo, wrong conditions, etc.)
- Set `fixable: true` only when you have also written or plan to write a fix function
- Include `nodeId` and `nodeType` on every issue that is node-specific
- `detail` is the machine-readable context; `suggestion` is user-facing fix advice

## Step 3 — Register in the orchestrator

Open `src/lib/analyzer.ts` and add inside `analyzeGraph()`:

```typescript
import { checkMyNewThing } from './checks/<category>'

// inside analyzeGraph():
const issues = [
  ...checkLinkIntegrity(ctx),
  // ...existing checks...
  ...checkMyNewThing(ctx),   // ← add here
]
```

Display order in the UI is controlled by DiagnosticsPanel.vue (errors first),
not by the call order here — place the call where it reads logically.

## Step 4 — Verify

```bash
pnpm typecheck
```

No errors means the new check is wired up correctly.

## Step 5 — If the issue is fixable

Follow the `add-fix` skill to add the corresponding fix function and mark the
issue `fixable: true`.
