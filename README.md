# ComfyUI Workflow Debugger

**https://comfy-workflow-debugger.netlify.app/**

## 维护记录 (Maintenance Records)

| 维护日期 | 维护人 | 维护内容 | 备注/状态 |
| :--- | :--- | :--- | :--- |
| 2026-05-25 | Antigravity | 同步 ComfyUI 后端与 ComfyUI_frontend 节点定义及类型，更新 UploadPanel 静态分析提示文本 | 已同步且测试通过 |



A free, browser-based tool that checks your ComfyUI workflow for problems and fixes them automatically — no ComfyUI installation required.

## Screenshots

![Workflow with no issues](screenshots/no-issues.png)
*Clean workflow — all connections valid, no issues found*

![Workflow with warnings](screenshots/warnings.png)
*Workflow with warnings — stale file reference detected, 1 fixable issue*

![Workflow with multiple issues](screenshots/multiple-issues.png)
*Complex workflow — type mismatches, stale refs, and orphan nodes, 5 fixable issues*

## How to use

**Step 1 — Upload your workflow**

Open the app and drag and drop your ComfyUI workflow `.json` file, or click to browse. Both the standard graph format (*Save*) and the API format (*Save (API Format)*) are supported.

**Step 2 — Review diagnostics**

The tool instantly scans your workflow and lists every issue found, grouped by severity — errors that will prevent the workflow from running, warnings that may cause unexpected results, and informational notices.

**Step 3 — Fix issues**

- Click **Fix All** to repair every fixable issue in one step
- Or fix individual categories one at a time if you want more control

**Step 4 — Download the fixed workflow**

Download the repaired workflow JSON and load it back into ComfyUI.

**Optional:** connect to a running ComfyUI instance to also check for missing custom nodes and invalid parameter values specific to your setup.

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

