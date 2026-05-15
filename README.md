# ComfyUI Workflow Debugger

A lightweight, offline web tool for analyzing and debugging [ComfyUI](https://github.com/comfyanonymous/ComfyUI) workflow JSON files — no ComfyUI installation required.

## Screenshots

![Workflow with no issues](screenshots/no-issues.png)
*Clean workflow — all connections valid, no issues found*

![Workflow with warnings](screenshots/warnings.png)
*Workflow with warnings — stale file reference detected, 1 fixable issue*

![Workflow with multiple issues](screenshots/multiple-issues.png)
*Complex workflow — type mismatches, stale refs, and orphan nodes, 5 fixable issues*

## Features

- **Offline analysis** — runs entirely in the browser, no server or model downloads needed
- **Dual format support** — handles both Graph format (exported via *Save*) and API/Prompt format (exported via *Save (API Format)*)
- **Link integrity checks** — detects inputs/outputs referencing non-existent link IDs and links pointing to missing nodes
- **Type mismatch detection** — flags connections where the output type doesn't match the input type
- **Cycle detection** — identifies circular dependencies that would prevent execution
- **Muted/bypassed node warnings** — catches nodes that are muted or bypassed while downstream nodes still depend on their output
- **Orphan node detection** — highlights nodes with no connections that won't affect the workflow
- **Missing output node warning** — alerts when the workflow has no SaveImage, PreviewImage, or other output nodes
- **Actionable suggestions** — every issue includes a plain-language fix recommendation
- **Visual node graph** — renders the workflow graph with error highlights

## Coming Soon

- Per-node improvement suggestions
- Node performance profiling
- Auto-fix common errors

## Getting Started

```bash
pnpm install
pnpm dev
```

Open the app in your browser, then drag and drop a ComfyUI workflow `.json` file (or click to browse). The analyzer will immediately report any errors, warnings, and informational notices.

## Supported Checks

| Check | Severity |
|-------|----------|
| Invalid JSON | Error |
| Unrecognized workflow format | Error |
| Input referencing missing link | Error |
| Output referencing missing link | Error |
| Link pointing to missing node | Error |
| Type mismatch between connected slots | Error |
| Muted/bypassed node with active dependents | Error |
| Circular dependency | Error |
| Disconnected input slot | Warning |
| No output node in workflow | Warning |
| Orphan node (no connections) | Info |

## Tech Stack

- [Vue 3](https://vuejs.org/) + TypeScript
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
