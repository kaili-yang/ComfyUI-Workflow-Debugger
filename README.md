# ComfyUI Workflow Debugger: Debug ComfyUI workflows, errors, and node issues

[🌐 English](README.md) | [🇨🇳 简体中文](README.zh.md)

**https://comfy-workflow-debugger.netlify.app/**

## Maintenance Records

| Date | Maintainer | Description | Status/Notes |
| :--- | :--- | :--- | :--- |
| 2026-07-28 | Claude | Synchronized ComfyUI backend node definitions and ComfyUI_frontend derived types (781 nodes, sourceMap 25 types/740 entries, conversionMap 21 types/352 entries) | Synchronized and verified |
| 2026-06-10 | Antigravity | Synchronized ComfyUI backend node definitions and ComfyUI_frontend derived types (690 nodes, sourceMap 25 types, conversionMap 21 types) | Synchronized and verified |
| 2026-06-03 | Antigravity | Synchronized ComfyUI backend node definitions and ComfyUI_frontend derived types (690 nodes, sourceMap 25 types, conversionMap 21 types) | Synchronized and verified |
| 2026-05-25 | Antigravity | Synchronized ComfyUI backend and ComfyUI_frontend node definitions and types, updated UploadPanel static analysis tooltip texts | Synchronized and verified |


**ComfyUI Workflow Debugger** is a free, offline-first browser tool built to solve your **broken ComfyUI workflows, graph load failures, and node connection errors**. If your ComfyUI workflow fails to execute, displays a red node, shows link type mismatches, or throws load errors, this tool instantly diagnoses and repairs your JSON files without needing a local ComfyUI installation.

A free, browser-based tool that checks your ComfyUI workflow for problems and fixes them automatically — no ComfyUI installation required. Perfect for **ComfyUI troubleshooting**, **workflow analysis**, and **node failure diagnosis**.

## Screenshots & Demo

![ComfyUI Workflow Debugger](<src/assets/ComfyUI Workflow Debugger-KL.png>)
*ComfyUI Workflow Debugger — diagnostics and auto-fix panel*

<video src="https://github.com/kaili-yang/ComfyUI-Workflow-Debugger/raw/main/src/assets/workflow%20debugger%20intro%20video.mp4" controls width="800">
  Your browser does not support the video tag. Watch the intro video at
  <code>src/assets/workflow debugger intro video.mp4</code>.
</video>

*Quick walkthrough of uploading a workflow, reviewing diagnostics, and auto-fixing issues*

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

---

## Contributing

Thank you for your interest in contributing to **ComfyUI Workflow Debugger**!  
We welcome bug reports, feature ideas, documentation improvements, and pull requests from the community — the same spirit you will find in projects such as [Vue](https://github.com/vuejs/core/blob/main/.github/contributing.md), [Vite](https://github.com/vitejs/vite/blob/main/CONTRIBUTING.md), and [Node.js](https://github.com/nodejs/node/blob/main/CONTRIBUTING.md).

> Full step-by-step contributor workflow also lives in [`CONTRIBUTING.md`](./CONTRIBUTING.md).

### Code of Conduct

By participating in this project you agree to treat everyone with respect.  
Harassment, discrimination, or hostile behavior will not be tolerated.  
If you experience or witness unacceptable behavior, please open a private report with the maintainers via [GitHub](https://github.com/kaili-yang/ComfyUI-Workflow-Debugger/issues) or contact [Kaili Yang](https://github.com/kaili-yang).

### Ways to contribute

| Area | Examples |
| --- | --- |
| **Bugs** | Broken analysis results, UI glitches, incorrect auto-fixes |
| **Features** | New diagnostics, new auto-fix strategies, UX improvements |
| **Docs** | README, guides, inline comments, translations |
| **Schema sync** | Keeping built-in node definitions in sync with ComfyUI |
| **Tests & fixtures** | Sample workflows under `test data/` / `workflow/` that reproduce issues |

Not sure where to start? Browse [open issues](https://github.com/kaili-yang/ComfyUI-Workflow-Debugger/issues) and look for labels such as `good first issue` or `help wanted`.

### Development setup

**Prerequisites:** Node.js 20+ (or current LTS) and [pnpm](https://pnpm.io/).

```bash
git clone git@github.com:kaili-yang/ComfyUI-Workflow-Debugger.git
cd ComfyUI-Workflow-Debugger
pnpm install
pnpm dev          # http://localhost:5177/
```

Useful scripts:

```bash
pnpm build        # type-check + production build
pnpm preview      # preview the production build
```

Stack: **Vue 3 + TypeScript + Vite + Tailwind CSS**. Analysis and auto-fix logic live under `src/lib/` (pure functions); UI lives under `src/components/`.

### Branch & pull request workflow

1. **Fork** the repository and clone your fork.
2. Create a topic branch from `main`:
   ```bash
   git checkout -b fix/describe-your-change
   # or
   git checkout -b feat/describe-your-change
   ```
3. Make focused commits. Prefer small PRs that do one thing well.
4. Ensure the app builds: `pnpm build`.
5. Push your branch and open a **Pull Request** against `main` on  
   [kaili-yang/ComfyUI-Workflow-Debugger](https://github.com/kaili-yang/ComfyUI-Workflow-Debugger).
6. Fill in the PR template (or describe): **what**, **why**, **how to test**.
7. Respond to review feedback. Maintainers may ask for changes before merging.

#### Pull request checklist

- [ ] The change solves a real problem or adds clear value
- [ ] UI-only vs analysis changes stay separated where practical
- [ ] New diagnostics go in `src/lib/checks/` and stay **pure** (no mutation)
- [ ] New auto-fixes go in `src/lib/fixes/` and set `fixable: true` on matching issues
- [ ] Fix ordering in `fixer.ts` is preserved (`fixGhostLinks` before `fixLinkTypeMetadata`)
- [ ] No secrets, API keys, or personal workflow dumps committed
- [ ] `pnpm build` succeeds

### Coding guidelines

- Prefer **clear, small diffs** over drive-by refactors in the same PR.
- Keep Vue components free of analysis logic; put checks/fixes in `src/lib/`.
- Match existing TypeScript types in `src/types/workflow.ts`.
- Follow the surrounding naming and formatting style (no need to reformat unrelated files).
- For checks: return `Issue[]`; never mutate `GraphAnalysisContext`.
- For fixes: receive an owned workflow object; return a change count (or structured result).

Architecture notes for adding checks/fixes are documented in [`CLAUDE.md`](./CLAUDE.md).

### Commit messages

Use short, imperative subjects (similar to Conventional Commits):

```
feat: detect stale media refs in API-format workflows
fix: correct link type metadata after ghost-link removal
docs: clarify contribution workflow
chore: sync node schema from latest ComfyUI backend
style: polish Step 2 empty-state minimap
```

- **Author email** for commits that should count on GitHub’s contribution graph must be a verified address on your GitHub account (for maintainers of this repo: `Kelly Yang <124ykl@gmail.com>`).
- Do not put secrets or personal data in commit messages.

### Reporting bugs

Open an issue with:

1. **ComfyUI Workflow Debugger** version / commit (or the live Netlify build date)
2. Browser and OS
3. Whether you used **offline** analysis or a **connected ComfyUI** server
4. A **minimal workflow JSON** that reproduces the problem (sanitize private paths)
5. Expected vs actual behavior (screenshots help)

### Feature requests

Open an issue describing:

- The user problem (not only the proposed solution)
- How you would test the feature
- Whether it needs ComfyUI server connectivity

### License

This project is released under the **[GNU Affero General Public License v3.0 only](https://www.gnu.org/licenses/agpl-3.0.html)** (`AGPL-3.0-only`), as declared in `package.json`.

By submitting a contribution (including patches, pull requests, and documentation), you agree that your work is licensed under the same AGPL-3.0-only terms, and that you have the right to submit it under those terms.

### Maintainers & contact

- **Author / maintainer:** [Kaili Yang](https://github.com/kaili-yang) (`Kelly Yang <124ykl@gmail.com>`)
- **Repository:** [github.com/kaili-yang/ComfyUI-Workflow-Debugger](https://github.com/kaili-yang/ComfyUI-Workflow-Debugger)
- **Live demo:** [comfy-workflow-debugger.netlify.app](https://comfy-workflow-debugger.netlify.app/)

Questions that are not bugs or features are welcome in Issues (please choose a clear title). We appreciate every contribution — large or small.
