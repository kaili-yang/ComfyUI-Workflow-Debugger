#!/usr/bin/env bash
# Sync node schema from ComfyUI backend and auto-update frontend-derived types.
#
# Usage:
#   ./scripts/update_schema.sh /path/to/ComfyUI [/path/to/ComfyUI_frontend]
#
# Example:
#   ./scripts/update_schema.sh ../ComfyUI ../ComfyUI_frontend

set -euo pipefail

COMFYUI_DIR="${1:-}"
FRONTEND_DIR="${2:-}"

if [[ -z "$COMFYUI_DIR" ]]; then
  echo "Usage: $0 /path/to/ComfyUI [/path/to/ComfyUI_frontend]"
  exit 1
fi

if [[ ! -d "$COMFYUI_DIR" ]]; then
  echo "Error: directory not found: $COMFYUI_DIR"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ---------------------------------------------------------------------------
# 1. Sync backend node definitions
# ---------------------------------------------------------------------------

echo "Copying backend source files from $COMFYUI_DIR ..."
cp "$COMFYUI_DIR/nodes.py" "$REPO_ROOT/nodes_lib/nodes.py"
cp -r "$COMFYUI_DIR/comfy_extras/." "$REPO_ROOT/nodes_lib/comfy_extras/"
cp -r "$COMFYUI_DIR/comfy_api_nodes/." "$REPO_ROOT/nodes_lib/comfy_api_nodes/"

echo "Regenerating nodes_schema.json ..."
python3 "$SCRIPT_DIR/build_schema.py"

# ---------------------------------------------------------------------------
# 2. Sync frontend-derived types (optional — skip if no frontend path)
# ---------------------------------------------------------------------------

if [[ -z "$FRONTEND_DIR" ]]; then
  echo ""
  echo "Tip: pass a second argument to also sync frontend-derived types."
  echo "  $0 $COMFYUI_DIR /path/to/ComfyUI_frontend"
  echo ""
  echo "Done."
  exit 0
fi

if [[ ! -d "$FRONTEND_DIR" ]]; then
  echo "Warning: frontend directory not found: $FRONTEND_DIR — skipping type sync"
  echo "Done."
  exit 0
fi

GLOBAL_ENUMS="$FRONTEND_DIR/src/lib/litegraph/src/types/globalEnums.ts"

if [[ ! -f "$GLOBAL_ENUMS" ]]; then
  echo "Warning: globalEnums.ts not found at expected path — skipping type sync"
  echo "Done."
  exit 0
fi

echo ""
echo "Syncing frontend-derived types ..."

python3 - "$GLOBAL_ENUMS" "$REPO_ROOT" <<'PYEOF'
import os
import re
import sys
import tempfile

enums_file = sys.argv[1]
repo_root  = sys.argv[2]

def read_file(path):
    with open(path, encoding='utf-8') as f:
        return f.read()

def write_file_atomic(path, content):
    """Write via a temp file in the same directory, then atomically replace."""
    dir_ = os.path.dirname(path)
    with tempfile.NamedTemporaryFile('w', encoding='utf-8', dir=dir_, delete=False) as tmp:
        tmp.write(content)
        tmp_path = tmp.name
    os.replace(tmp_path, path)

def apply_patch(path, pattern, replacement, description):
    src = read_file(path)
    updated, count = re.subn(pattern, replacement, src)
    if count == 0:
        print(f"  ✗  Pattern not found in {os.path.basename(path)}: {description}")
        sys.exit(1)
    if updated != src:
        write_file_atomic(path, updated)
        return True
    return False

src = read_file(enums_file)

# ── RenderShape.HollowCircle ─────────────────────────────────────────────────
# Syncs OPTIONAL_SLOT_SHAPE and its inline comment in disconnected-inputs.ts
hollow_match = re.search(r'HollowCircle\s*=\s*(\d+)', src)
if not hollow_match:
    print("  ✗  RenderShape.HollowCircle not found in globalEnums.ts")
    sys.exit(1)
hollow_value = hollow_match.group(1)

disconnected_path = f"{repo_root}/src/lib/checks/others/disconnected-inputs.ts"
changed = any([
    apply_patch(
        disconnected_path,
        r'(// RenderShape\.HollowCircle = )\d+',
        rf'\g<1>{hollow_value}',
        'comment RenderShape.HollowCircle',
    ),
    apply_patch(
        disconnected_path,
        r'(const OPTIONAL_SLOT_SHAPE = )\d+',
        rf'\g<1>{hollow_value}',
        'const OPTIONAL_SLOT_SHAPE',
    ),
])
if changed:
    print(f"  ✓  RenderShape.HollowCircle updated to {hollow_value} in disconnected-inputs.ts")
else:
    print(f"  ✓  RenderShape.HollowCircle = {hollow_value} (unchanged)")

# ── LGraphEventMode → NodeMode ───────────────────────────────────────────────
# Syncs the NodeMode union type and inline comment in workflow.ts
block_match = re.search(r'export enum LGraphEventMode \{([^}]+)\}', src, re.DOTALL)
if not block_match:
    print("  ✗  LGraphEventMode enum not found in globalEnums.ts")
    sys.exit(1)

entries = sorted(re.findall(r'(\w+)\s*=\s*(\d+)', block_match.group(1)), key=lambda e: int(e[1]))
values_str = ' | '.join(v for _, v in entries)
names_str  = ' | '.join(n for n, _ in entries)

workflow_path = f"{repo_root}/src/types/workflow.ts"
changed = apply_patch(
    workflow_path,
    r'export type NodeMode = [^\n]+',
    f'export type NodeMode = {values_str} // {names_str}',
    'export type NodeMode',
)
if changed:
    print(f"  ✓  NodeMode updated to: {values_str} in workflow.ts")
else:
    print(f"  ✓  NodeMode = {values_str} (unchanged)")
PYEOF

echo ""
echo "Done."
