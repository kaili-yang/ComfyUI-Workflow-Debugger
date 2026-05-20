# ComfyUI Workflow Debugger

Offline static analysis and auto-fix tool for ComfyUI workflow JSON files.  
Stack: Vue 3 + TypeScript + Vite + Tailwind CSS.

## Dev Commands

```bash
pnpm dev          # Vite dev server
pnpm build        # vue-tsc type-check + production build
pnpm typecheck    # vue-tsc only (no emit)
```

---

## Source Layout

```
src/
  components/               # Vue SFCs — UI only, no analysis logic
  lib/
    analyzer.ts             # Orchestrator: imports all check functions, returns AnalysisResult
    fixer.ts                # Orchestrator: imports all fix functions, returns FixResult
    checks/                 # One file per check category (graph format)
      link.ts               # Ghost links, missing node refs, link[5] type metadata
      type-mismatch.ts      # Source/target slot type incompatibility
      node-state.ts         # Muted/bypassed with dependents; orphan nodes
      topology.ts           # No output node; cycle detection
      schema.ts             # Unknown node types; widget value range/options
      media.ts              # Stale media file references
      api-format.ts         # All checks for API-format (prompt-queue) workflows
      others/
        disconnected-inputs.ts   # Unconnected input slots (severity depends on schema)
    fixes/                  # One file per fixable category — mirrors checks/ structure
      link.ts               # Remove ghost links; correct link type metadata
      media.ts              # Substitute stale media refs with test data files
    shared/
      graph-context.ts      # GraphAnalysisContext type + buildContext() factory
      stale-ref.ts          # isLikelyStaleRef() — shared by checks/media and fixes/media
      output-nodes.ts       # OUTPUT_NODE_TYPES set — shared by topology and api-format
  types/
    workflow.ts             # All domain types: Issue, AnalysisResult, WorkflowNode, …
```

---

## Architecture: Checks

Every detectable problem lives in exactly **one check file**.

### Check file contract

Each exported function follows this shape:

```typescript
export function checkXxx(ctx: GraphAnalysisContext): Issue[]
```

`GraphAnalysisContext` (defined in `shared/graph-context.ts`) is built **once**
by the orchestrator and passed to every check — no check rebuilds the node/link maps.

Rules:
- Check functions are **pure** — they read `ctx` and return issues; they never mutate
- Return `[]` immediately when the check doesn't apply (no `objectInfo`, etc.)
- Set `fixable: true` only when a corresponding fix function exists in `fixes/`
- Include `nodeId` and `nodeType` on every issue that is node-specific

### Adding a new check

See `.claude/skills/add-check/SKILL.md` for the full walkthrough.

Short path:
1. Find the right category file in `checks/`, or create `checks/others/<name>.ts`
2. Export `checkXxx(ctx: GraphAnalysisContext): Issue[]`
3. Import and add to the return array in `analyzer.ts` → `analyzeGraph()`

---

## Architecture: Fixes

Every auto-fixable problem has a corresponding fix function in `fixes/` whose
filename matches the check category.

### Fix file contract

```typescript
// Simple fix — returns change count
export function fixXxx(workflow: GraphWorkflow): number

// Fix with side-output (e.g. which test files were substituted)
export function fixXxx(workflow: GraphWorkflow): { changes: number; [extra]: ... }
```

The orchestrator (`fixer.ts`) owns the deep-clone and the final `JSON.stringify`.
Fix functions receive a fully-owned object and may mutate freely.

### Fix ordering constraint

`fixGhostLinks` must run **before** `fixLinkTypeMetadata`.  
Ghost-link removal rebuilds `workflow.links`; type-metadata correction iterates it.  
Never reorder these two calls in `fixer.ts`.

### Adding a new fix

See `.claude/skills/add-fix/SKILL.md` for the full walkthrough.

Short path:
1. Create or extend `fixes/<category>.ts`
2. Export a function matching the contract above
3. Add `fixable: true` to the issue in the matching check file
4. Import and call in `fixer.ts` → `fixWorkflow()`, respecting ordering
5. Add a bullet to "What gets fixed" in `FixPanel.vue`

---

## Category Reference

| Category file | Issue types handled |
|---|---|
| `checks/link.ts` | Ghost link IDs in slots; links pointing to missing nodes; `link[5]` type metadata mismatch |
| `checks/type-mismatch.ts` | Source output type ≠ target input type across a wire |
| `checks/node-state.ts` | Muted/bypassed nodes feeding live dependents; orphan nodes |
| `checks/topology.ts` | Workflow has no output node; circular dependencies |
| `checks/schema.ts` | Node type not in `/object_info`; widget value out of range/options |
| `checks/media.ts` | Stale file refs in `widgets_values` (temp, UUID, non-ASCII, empty) |
| `checks/api-format.ts` | All of the above adapted for API/prompt-queue workflow format |
| `checks/others/disconnected-inputs.ts` | Unconnected input slots — severity is ambiguous without schema |
| `fixes/link.ts` | Remove dangling link refs; sync `link[5]` to source output type |
| `fixes/media.ts` | Replace stale file refs with bundled test-data files |

---

## Shared Utilities

| File | Exports | Used by |
|---|---|---|
| `shared/graph-context.ts` | `GraphAnalysisContext`, `buildContext()` | `analyzer.ts`, all check files |
| `shared/stale-ref.ts` | `isLikelyStaleRef()` | `checks/media.ts`, `fixes/media.ts` |
| `shared/output-nodes.ts` | `OUTPUT_NODE_TYPES` | `checks/topology.ts`, `checks/api-format.ts` |
| `shared/node-type-map.ts` | `nodeTypeMap`, `NodeTypeMap` | `fixer.ts`, all fix functions that insert nodes |

Do not duplicate stale-ref logic or the output-node set in category files.

---

## Static Data Files

Two JSON files provide offline node knowledge. They serve entirely different purposes
and are generated by separate scripts.

### `src/lib/nodes_schema.json` — diagnostic catalog

Answers: *"what inputs and outputs does each node have?"*

Used by the **check functions** to detect problems without a server connection — e.g.,
whether a widget value is null, out of range, or uses an unknown node type.
Generated by `scripts/build_schema.py` (static AST, no runtime deps).
Updated automatically by `scripts/update_schema.sh`.

### `src/lib/shared/node-type-map.json` — fix-engine routing table

Answers: *"when the fixer needs to insert or wire a node, what node should it use?"*

Contains two tables:

- **`sourceMap`**: given a required output type (e.g. `CONDITIONING`), which nodes
  produce it and what are their required connection inputs? Used by `satisfy-input.ts`
  when a slot has no source — it inserts the simplest matching node and recursively
  satisfies its own inputs.

- **`conversionMap`**: given a type mismatch on a wire (source type A → slot expecting
  type B), which nodes accept A as input and produce B? Used by `fixes/type-conversion.ts`
  to insert a converter node between the mismatched endpoints.

Generated by `scripts/extract-node-type-map.py` (derives from `nodes_schema.json`,
no runtime deps). Updated automatically by `scripts/update_schema.sh`.

### `slotIndex` convention

All `slotIndex` values in both tables use **connection-slot indexing**: the position of
the input among connection-type inputs only (INT/FLOAT/STRING/BOOLEAN/COMBO are widget
inputs and are not counted). This matches the `node.inputs[]` array index in the
ComfyUI workflow JSON, which only contains connection slots.

## Optional vs Required Inputs (Offline Detection)

Without a server connection, the graph workflow JSON itself encodes whether a
connection slot is optional: the ComfyUI frontend sets `input.shape = 7`
(`RenderShape.HollowCircle`) for any slot that comes from `INPUT_TYPES()['optional']`
in the backend node definition (`ComfyUI/nodes.py`).

The constant `OPTIONAL_SLOT_SHAPE = 7` in `checks/others/disconnected-inputs.ts`
references this. Source:
- Shape enum: `ComfyUI_frontend/src/lib/litegraph/src/types/globalEnums.ts`
- Assignment: `ComfyUI_frontend/src/services/litegraphService.ts` → `addInputSocket()`
- Origin: `ComfyUI/nodes.py` → `INPUT_TYPES()['optional']` dict

Additionally, inputs with a `widget` property carry their value in `widgets_values`
and do not require a wire — never flag them as disconnection issues.

---

## Orchestrators Stay Thin

`analyzer.ts` and `fixer.ts` contain **no logic** — only imports and sequencing.

- `analyzer.ts`: builds context once, calls all check functions, merges arrays
- `fixer.ts`: deep-clones once, calls fix functions in dependency order, serializes

If new logic is needed, it belongs in a check/fix file or in `shared/`.

---

## Coding Standards

- TypeScript only; no `any`, no `as any`
- Vue 3 Composition API (`<script setup lang="ts">`) in all components
- Tailwind utility classes; avoid `<style>` blocks except for keyframe animations
- No barrel files (`index.ts` re-exports)
- No comments unless the WHY is non-obvious to a reader unfamiliar with ComfyUI internals
- Pure functions wherever possible; no mutable module-level state in check/fix files
- `noUnusedLocals` and `noUnusedParameters` are enforced by tsconfig — every import must be used

## Common Pitfalls

- `isLikelyStaleRef` lives in `shared/stale-ref.ts` — do not copy it into category files
- `OUTPUT_NODE_TYPES` lives in `shared/output-nodes.ts` — add new output node type strings there
- After `fixGhostLinks` mutates `workflow.links`, any pre-built `linkMap` is stale;
  do not pass it to subsequent fix functions
- `GraphAnalysisContext.linkMap` reflects the workflow **before** any fix runs;
  never re-use a check context inside fix functions
