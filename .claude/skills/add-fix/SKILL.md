---
name: add-fix
description: Step-by-step for adding a new auto-fix to comfy_workflow_debuger. Use when an existing check produces fixable issues that need a corresponding repair function.
---

# Adding a New Fix

## Step 1 — Mark the issue as fixable

In the check file that produces the issue, set `fixable: true`:

```typescript
issues.push({
  severity: 'warning',
  message: '...',
  suggestion: 'Will be auto-corrected by the Fix button',
  fixable: true,   // ← required; Fix button counts these
})
```

The Fix button in `FixPanel.vue` counts `issues.filter(i => i.fixable).length`.
Without this flag, the button stays disabled even if a fix function exists.

## Step 2 — Write the fix function

Create or extend `src/lib/fixes/<category>.ts` — the filename should mirror the
check category file that produces the issue.

```typescript
// src/lib/fixes/<category>.ts

import type { GraphWorkflow } from '../../types/workflow'

// Simple fix: return the number of changes made
export function fixMyThing(workflow: GraphWorkflow): number {
  let changes = 0
  // Mutate workflow directly — the orchestrator already deep-cloned it
  // ...
  return changes
}
```

If you need to return extra data (e.g. a list of substituted filenames):

```typescript
export function fixMyThing(
  workflow: GraphWorkflow,
): { changes: number; substituted: Set<string> } {
  // ...
  return { changes, substituted }
}
```

Mandatory constraints:
- Receive the workflow already deep-cloned by the orchestrator; mutate freely
- Never call `JSON.parse` or `JSON.stringify` — the orchestrator handles serialization
- Return a change count so the orchestrator can display "Fixed N issues"
- Do not rebuild `nodeMap`/`linkMap` from a stale state left by a previous fix step;
  build them fresh inside this function if you need them

## Step 3 — Register in the orchestrator

Open `src/lib/fixer.ts` and add inside `fixWorkflow()`:

```typescript
import { fixMyThing } from './fixes/<category>'

// inside fixWorkflow(), after deep-clone:
changes += fixMyThing(workflow)
```

**Ordering rule**: `fixGhostLinks` must always run before `fixLinkTypeMetadata`
because ghost-link removal rebuilds `workflow.links`. Place your new call after
both if it depends on a clean links array, or before if it doesn't.

## Step 4 — Update the UI description

Open `src/components/FixPanel.vue` and add a bullet to the "What gets fixed" list:

```html
<div class="flex items-start gap-2">
  <span class="text-gray-600 text-xs mt-0.5 flex-shrink-0">•</span>
  <span class="text-gray-500 text-xs leading-relaxed">Brief description of what this fix does</span>
</div>
```

## Step 5 — Verify

```bash
pnpm typecheck
```

Then load a workflow that triggers the issue and confirm:
1. The Fix button shows a non-zero fixable count
2. Clicking Fix increments the change counter
3. Exporting and re-loading the fixed JSON shows no more issues of this type
