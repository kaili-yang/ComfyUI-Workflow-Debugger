# ComfyUI Workflow Debugger — Feature List & Promo Video Script

**Live app:** https://comfy-workflow-debugger.netlify.app/  
**Repo:** https://github.com/kaili-yang/ComfyUI-Workflow-Debugger  
**Author:** Kaili Yang · https://kaili.space/ · https://github.com/kaili-yang

---

## Implemented Features

### Core product

- Offline-first browser tool — no ComfyUI install, no model downloads
- Free / open source (AGPL-3.0)
- Supports **graph format** (*Save*) and **API format** (*Save (API Format)*)
- Upload via drag-and-drop, file picker, or paste JSON
- Instant static analysis in the browser

### Diagnostics (checks)

- Broken / ghost links and missing node references
- Link type metadata mismatches
- Type mismatches between connected slots
- Disconnected required inputs
- Null / empty widget values
- Muted or bypassed nodes that still have dependents
- Orphan nodes
- Circular dependencies (cycles)
- Missing output nodes (e.g. no Save Image)
- Stale media / file path references
- Unknown node types and invalid widget ranges (via built-in schema; stronger when server schema is available)
- Severity grouping: Error / Warning / Info
- Per-issue suggestions and node ID highlighting

### Auto-fix

- Fix All (one click) and per-category fix
- Remove broken / ghost connections; remap recoverable links
- Correct link type labels
- Re-enable bypassed / muted nodes that are still needed
- Insert type-conversion nodes for mismatches
- Wire disconnected required inputs (or insert source nodes)
- Reset null widget values to safe defaults
- Clamp / correct out-of-range widget values (with server schema)
- Replace stale media refs with bundled test placeholder files
- Export `fixed_*.json` for reload into ComfyUI
- Fix breakdown summary (what changed)

### Visualization & UX

- Interactive node-graph canvas with error highlights
- Click node → jump to related diagnostics
- Highlight newly inserted nodes / links after fix
- Resizable preview / diagnostics split
- Built-in node schema (~700+ core nodes), synced from official ComfyUI

### Server connection (code ready; UI currently gated)

- Connect to a local ComfyUI instance for live `/object_info`
- Detect missing custom nodes and setup-specific invalid values
- Cache schema in localStorage for reuse

---

## Planned / Not Yet Implemented

| Feature | Notes |
| --- | --- |
| Improvement suggestions per node | Marked **Coming Soon** in the upload panel |
| Node performance profiling | Marked **Coming Soon** in the upload panel |
| Dynamic media file validation | TODO in Fix panel — validate files against the live ComfyUI instance |
| Auto-fix for API-format workflows | Analysis works; auto-fix is graph-format only today |
| Re-enable / polish ComfyUI server toggle in UI | Connect logic exists; toggle is currently disabled in the upload panel |

---

## Promo Video Script (Auto-Play PPT Style)

**Format:** Full-screen slides, auto-advance ~4–6s each (or on click).  
**Tone:** Clear, product-demo, calm energy. Dark UI colors OK to match the app.  
**Total length target:** ~60–90 seconds.

---

### SLIDE 1 — Title

**On screen**

```
ComfyUI Workflow Debugger
Fix broken workflows in your browser
No ComfyUI install · No model downloads
```

**Voiceover / caption (optional)**  
Your workflow is broken. Red nodes. Bad links. Won’t load.  
There’s a faster way.

**Visual:** App logo / yellow accent square + product name.

---

### SLIDE 2 — The problem

**On screen**

```
When ComfyUI workflows break…
• Graph fails to load
• Red / missing nodes
• Type mismatch wires
• Stale file paths
• Hard-to-find failing nodes
```

**Voiceover**  
Huge graphs make small errors painful. Finding one bad wire can take forever.

---

### SLIDE 3 — The pitch

**On screen**

```
Offline static analysis + one-click auto-fix
Works in the browser
Free & open source
```

**CTA strip:** `comfy-workflow-debugger.netlify.app`

---

### SLIDE 4 — Feature set (Implemented)

**On screen** (checklist style)

```
✓ Runs offline — zero model downloads
✓ Detect broken links & missing nodes
✓ Type mismatch & cycle detection
✓ Visual graph with error highlights
✓ Auto-fix common errors
```

**Voiceover**  
Upload. See issues. Fix. Export. That’s the loop.

---

### SLIDE 5 — What it can detect

**On screen**

```
Diagnostics
• Broken connections & ghost links
• Type mismatches
• Cycles & orphan nodes
• Disabled nodes with dependents
• No output node
• Stale media references
• Invalid / null widget values
```

---

### SLIDE 6 — What auto-fix can do

**On screen**

```
One-click Fix
• Remove broken connections
• Re-enable needed disabled nodes
• Insert type converters
• Wire disconnected inputs
• Reset invalid values
• Restore placeholder file refs
```

---

### SLIDE 7 — How to use · Step 1

**On screen**

```
Step 1 — Upload
Drag & drop your .json
or click to browse
or paste workflow JSON

Supports Graph + API formats
```

**Visual cue:** Upload drop zone / Step 1 panel screenshot.

---

### SLIDE 8 — How to use · Step 2

**On screen**

```
Step 2 — Preview
Interactive node graph
Error and warning highlights
Click a node to inspect
```

**Visual cue:** Canvas with highlighted problem nodes.

---

### SLIDE 9 — How to use · Step 3

**On screen**

```
Step 3 — Review diagnostics
Errors · Warnings · Info
Grouped, actionable suggestions
Jump from issue → node
```

**Visual cue:** Diagnostics panel screenshot.

---

### SLIDE 10 — How to use · Step 4 (+ Download)

**On screen**

```
Step 4 — Fix
Click Fix (or Fix All)
See the breakdown of changes

Then — Download
Export fixed_*.json
Reload into ComfyUI
```

**Visual cue:** Big Fix button → Export.

**Optional tip card:**  
Connect your local ComfyUI for custom-node & parameter checks.

---

### SLIDE 11 — Coming soon

**On screen**

```
Roadmap
○ Improvement suggestions per node
○ Node performance profiling
○ Live media file validation
○ Deeper API-format auto-fix
```

**Voiceover**  
Shipping the core loop first. More tools on the way.

---

### SLIDE 12 — Closing / Author

**On screen**

```
[ Author avatar ]

Kaili Yang
ComfyUI Team Member · Open Source Contributor

Try it free
https://comfy-workflow-debugger.netlify.app/

GitHub
https://github.com/kaili-yang/ComfyUI-Workflow-Debugger

Author
https://github.com/kaili-yang
https://kaili.space/

X (Twitter)
https://x.com/   ← add your handle before publishing
```

**Layout notes for editors**

| Element | Placement |
| --- | --- |
| Avatar | Center or left, circular crop |
| Name + role | Beside / under avatar |
| Live app URL | Primary CTA, larger |
| GitHub repo | Secondary button / icon |
| GitHub profile | Icon + handle |
| X | Icon + @handle |
| Personal site | Small text link |

**End card VO**  
Built by Kaili. Star the repo, try it on your broken workflows, and tell me what to build next.

---

## Production Checklist

- [ ] Use real screenshots from Steps 1–4 (and Fix breakdown)
- [ ] Confirm X handle and drop it into Slide 12
- [ ] Drop avatar image asset (square, high-res)
- [ ] Keep each slide to one job — no dense paragraphs
- [ ] Auto-advance: ~5s for title/problem, ~6–7s for feature lists, ~5s for each how-to step, ~8s for closing
- [ ] Optional soft click SFX on slide change; silence is fine too

---

## Quick Reference Links

| Resource | URL |
| --- | --- |
| Live app | https://comfy-workflow-debugger.netlify.app/ |
| Repository | https://github.com/kaili-yang/ComfyUI-Workflow-Debugger |
| Author GitHub | https://github.com/kaili-yang |
| Author site | https://kaili.space/ |
| X | _(fill in)_ |
