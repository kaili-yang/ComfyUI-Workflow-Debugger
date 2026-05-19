#!/usr/bin/env bash
# Sync node schema from ComfyUI backend and check frontend enum values for drift.
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
# 2. Check frontend enum values for drift (optional — skip if no frontend path)
# ---------------------------------------------------------------------------

if [[ -z "$FRONTEND_DIR" ]]; then
  echo ""
  echo "Tip: pass a second argument to also check frontend enum values."
  echo "  $0 $COMFYUI_DIR /path/to/ComfyUI_frontend"
  echo ""
  echo "Done."
  exit 0
fi

if [[ ! -d "$FRONTEND_DIR" ]]; then
  echo "Warning: frontend directory not found: $FRONTEND_DIR — skipping enum check"
  echo "Done."
  exit 0
fi

GLOBAL_ENUMS="$FRONTEND_DIR/src/lib/litegraph/src/types/globalEnums.ts"

if [[ ! -f "$GLOBAL_ENUMS" ]]; then
  echo "Warning: globalEnums.ts not found at expected path — skipping enum check"
  echo "Done."
  exit 0
fi

echo ""
echo "Checking frontend enum values for drift ..."

WARNINGS=0

# Check RenderShape.HollowCircle
# Used in: src/lib/checks/others/disconnected-inputs.ts as OPTIONAL_SLOT_SHAPE = 7
HOLLOW_CIRCLE=$(grep "HollowCircle" "$GLOBAL_ENUMS" | grep -o '[0-9]\+' | head -1)
if [[ "$HOLLOW_CIRCLE" != "7" ]]; then
  echo "  ⚠️  RenderShape.HollowCircle changed: $HOLLOW_CIRCLE (was 7)"
  echo "     → Update OPTIONAL_SLOT_SHAPE in src/lib/checks/others/disconnected-inputs.ts"
  WARNINGS=$((WARNINGS + 1))
else
  echo "  ✓  RenderShape.HollowCircle = $HOLLOW_CIRCLE (unchanged)"
fi

# Check LGraphEventMode values
# Used in: src/types/workflow.ts as NodeMode = 0 | 1 | 2 | 3 | 4
ALWAYS=$(grep "ALWAYS" "$GLOBAL_ENUMS" | grep -o '[0-9]\+' | head -1)
NEVER=$(grep "NEVER" "$GLOBAL_ENUMS" | grep -o '[0-9]\+' | head -1)
BYPASS=$(grep "BYPASS" "$GLOBAL_ENUMS" | grep -o '[0-9]\+' | head -1)

if [[ "$ALWAYS" != "0" || "$NEVER" != "2" || "$BYPASS" != "4" ]]; then
  echo "  ⚠️  LGraphEventMode values changed: ALWAYS=$ALWAYS NEVER=$NEVER BYPASS=$BYPASS (were 0/2/4)"
  echo "     → Update NodeMode in src/types/workflow.ts"
  WARNINGS=$((WARNINGS + 1))
else
  echo "  ✓  LGraphEventMode ALWAYS=$ALWAYS NEVER=$NEVER BYPASS=$BYPASS (unchanged)"
fi

echo ""
if [[ $WARNINGS -gt 0 ]]; then
  echo "Done — $WARNINGS enum value(s) changed, manual update required (see above)."
  exit 1
else
  echo "Done."
fi
