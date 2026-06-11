# ComfyUI Workflow Debugger: Debug ComfyUI workflows, errors, and node issues

[🌐 English](README.md) | [🇨🇳 简体中文](README.zh.md)

**https://comfy-workflow-debugger.netlify.app/**

## Maintenance Records

| Date | Maintainer | Description | Status/Notes |
| :--- | :--- | :--- | :--- |
| 2026-06-10 | Antigravity | Synchronized ComfyUI backend node definitions and ComfyUI_frontend derived types (690 nodes, sourceMap 25 types, conversionMap 21 types) | Synchronized and verified |
| 2026-06-03 | Antigravity | Synchronized ComfyUI backend node definitions and ComfyUI_frontend derived types (690 nodes, sourceMap 25 types, conversionMap 21 types) | Synchronized and verified |
| 2026-05-25 | Antigravity | Synchronized ComfyUI backend and ComfyUI_frontend node definitions and types, updated UploadPanel static analysis tooltip texts | Synchronized and verified |


**ComfyUI Workflow Debugger** is a free, offline-first browser tool built to solve your **broken ComfyUI workflows, graph load failures, and node connection errors**. If your ComfyUI workflow fails to execute, displays a red node, shows link type mismatches, or throws load errors, this tool instantly diagnoses and repairs your JSON files without needing a local ComfyUI installation.

A free, browser-based tool that checks your ComfyUI workflow for problems and fixes them automatically — no ComfyUI installation required. Perfect for **ComfyUI troubleshooting**, **workflow analysis**, and **node failure diagnosis**.

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

---

## Scenario-Based Diagnostics & Use Cases

### ComfyUI Workflow Debugging
*Diagnose structural and connection flow errors in your workflows to get them running smoothly.*
- **Broken connections** — wires that reference links or nodes that no longer exist.
- **Infinite loops** — circular dependencies between nodes that would prevent execution.
- **Orphan nodes** — nodes with no connections that have no effect on the output.

### ComfyUI Error Troubleshooting
*Solve runtime crashes, incorrect formats, and misconfigured graph setups.*
- **Invalid parameter values** — empty or out-of-range values that will cause errors at runtime.
- **No output node** — workflows that have no Save Image or other output node and can never produce a result.
- **Stale file references** — image or video paths that point to files that have been moved or deleted.

### ComfyUI Node Failure Diagnosis
*Troubleshoot custom nodes, type compatibility, and node states.*
- **Type mismatches** — connections between nodes that expect different data types.
- **Disabled nodes** — nodes that are muted or bypassed while other nodes still depend on their output.
- **Missing custom nodes** *(requires server connection)* — node types that aren't installed in your ComfyUI instance.

---

## Auto-Fix Capabilities

Click **Fix** to automatically repair all fixable issues in one step:

- **Remove broken connections** — clears dangling wires and remaps connections that can be recovered
- **Re-enable disabled nodes** — restores muted or bypassed nodes that are still needed by the workflow
- **Insert type converters** — adds the appropriate conversion node between mismatched connections so the data flows correctly
- **Wire disconnected inputs** — connects available outputs to required inputs that have nothing plugged in
- **Reset invalid values** — replaces empty or null parameter values with safe defaults
- **Restore file references** — substitutes missing file paths with placeholder test data so the workflow can run

## FAQ & Common Troubleshooting Questions

### How to debug broken ComfyUI workflows?
To debug a broken ComfyUI workflow, export your workflow as a `.json` file (either standard or API format) and drag it into the **ComfyUI Workflow Debugger**. The tool will run a comprehensive static analysis locally in your browser, highlight broken links, type mismatches, and orphan nodes, and let you repair them in one click.

### Why does my ComfyUI graph fail to load?
A ComfyUI graph usually fails to load because of corrupted JSON structure, dangling wires pointing to deleted nodes, or missing custom node schemas. By loading it into this debugger, the static analyzer bypasses ComfyUI's loading gate, detects the structural errors, and outputs a repaired version that ComfyUI can successfully read.

### How to find the failing node in a workflow?
When a ComfyUI run fails, finding the specific failing node in a huge workflow can be painful. The debugger lists all diagnostic errors grouped by node types and IDs, highlights type mismatches, and alerts you to disabled nodes that are bottlenecking execution.

---

## Node Schema Updates

The built-in node definitions are sourced directly from the [official ComfyUI repository](https://github.com/comfyanonymous/ComfyUI) — the same source ComfyUI itself uses. There is no secondary or third-party data involved.

ComfyUI Core follows a weekly release cycle, targeting Monday. This tool syncs the built-in node schema every Tuesday after the ComfyUI release. If ComfyUI delays its release, the schema update here is delayed accordingly.

To always check against the exact nodes installed in your ComfyUI instance, connect the tool to your running ComfyUI server — this bypasses the built-in schema entirely.
