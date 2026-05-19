# ComfyUI Workflow Debugger

**https://comfy-workflow-debugger.netlify.app/**

A free, browser-based tool that checks your ComfyUI workflow for problems and fixes them automatically — no ComfyUI installation required.

## Screenshots

![Workflow with no issues](screenshots/no-issues.png)
*Clean workflow — all connections valid, no issues found*

![Workflow with warnings](screenshots/warnings.png)
*Workflow with warnings — stale file reference detected, 1 fixable issue*

![Workflow with multiple issues](screenshots/multiple-issues.png)
*Complex workflow — type mismatches, stale refs, and orphan nodes, 5 fixable issues*

## How to use

1. Open the app in your browser
2. Drag and drop a ComfyUI workflow `.json` file, or click to browse
3. Review the issues found in the Diagnostics panel
4. Click **Fix** to auto-repair all fixable issues
5. Download the fixed workflow and load it back into ComfyUI

Works with both workflow formats: the standard graph format (*Save*) and the API format (*Save (API Format)*).

**Optional:** connect to a running ComfyUI instance to also check for missing custom nodes and invalid parameter values.

## Diagnostics

The tool scans your workflow and flags:

- **Broken connections** — wires that reference links or nodes that no longer exist
- **Type mismatches** — connections between nodes that expect different data types
- **Invalid parameter values** — empty or out-of-range values that will cause errors at runtime
- **Disabled nodes** — nodes that are muted or bypassed while other nodes still depend on their output
- **No output node** — workflows that have no Save Image or other output node and can never produce a result
- **Infinite loops** — circular dependencies between nodes that would prevent execution
- **Orphan nodes** — nodes with no connections that have no effect on the output
- **Stale file references** — image or video paths that point to files that have been moved or deleted
- **Missing custom nodes** *(requires server connection)* — node types that aren't installed in your ComfyUI instance

## Auto-Fix

Click **Fix** to automatically repair all fixable issues in one step:

- **Remove broken connections** — clears dangling wires and remaps connections that can be recovered
- **Re-enable disabled nodes** — restores muted or bypassed nodes that are still needed by the workflow
- **Insert type converters** — adds the appropriate conversion node between mismatched connections so the data flows correctly
- **Wire disconnected inputs** — connects available outputs to required inputs that have nothing plugged in
- **Reset invalid values** — replaces empty or null parameter values with safe defaults
- **Restore file references** — substitutes missing file paths with placeholder test data so the workflow can run

## Node Schema Updates

The built-in node definitions are sourced directly from the [official ComfyUI repository](https://github.com/comfyanonymous/ComfyUI) — the same source ComfyUI itself uses. There is no secondary or third-party data involved.

ComfyUI Core follows a weekly release cycle, targeting Monday. This tool syncs the built-in node schema every Tuesday after the ComfyUI release. If ComfyUI delays its release, the schema update here is delayed accordingly.

To always check against the exact nodes installed in your ComfyUI instance, connect the tool to your running ComfyUI server — this bypasses the built-in schema entirely.

## Getting Started

```bash
pnpm install
pnpm dev
```

