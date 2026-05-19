#!/usr/bin/env bash
# Update the offline node schema from a local ComfyUI source tree.
#
# Usage:
#   ./scripts/update_schema.sh /path/to/ComfyUI
#
# Example:
#   ./scripts/update_schema.sh ../ComfyUI

set -euo pipefail

COMFYUI_DIR="${1:-}"

if [[ -z "$COMFYUI_DIR" ]]; then
  echo "Usage: $0 /path/to/ComfyUI"
  exit 1
fi

if [[ ! -d "$COMFYUI_DIR" ]]; then
  echo "Error: directory not found: $COMFYUI_DIR"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "Copying source files from $COMFYUI_DIR ..."
cp "$COMFYUI_DIR/nodes.py" "$REPO_ROOT/nodes_lib/nodes.py"
cp -r "$COMFYUI_DIR/comfy_extras/." "$REPO_ROOT/nodes_lib/comfy_extras/"
cp -r "$COMFYUI_DIR/comfy_api_nodes/." "$REPO_ROOT/nodes_lib/comfy_api_nodes/"

echo "Regenerating nodes_schema.json ..."
python3 "$SCRIPT_DIR/build_schema.py"

echo "Done."
