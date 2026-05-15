#!/usr/bin/env python3
"""
Extract ConversionMap and SourceMap from ComfyUI/nodes.py.
Run from repo root:  python3 scripts/extract-node-type-map.py
Output: src/lib/shared/node-type-map.json
"""

import sys, json
from pathlib import Path
from collections import defaultdict

REPO_ROOT = Path(__file__).parent.parent
COMFYUI   = REPO_ROOT.parent / 'ComfyUI'
OUTPUT    = REPO_ROOT / 'src' / 'lib' / 'shared' / 'node-type-map.json'

sys.path.insert(0, str(COMFYUI))
import nodes as comfy_nodes

NODE_CLASS_MAPPINGS = comfy_nodes.NODE_CLASS_MAPPINGS
WIDGET_TYPES = {'INT', 'FLOAT', 'STRING', 'BOOLEAN'}

conversion_map = defaultdict(lambda: defaultdict(list))
source_map     = defaultdict(list)

for class_name, cls in NODE_CLASS_MAPPINGS.items():
    try:
        input_types  = cls.INPUT_TYPES()
        return_types = list(getattr(cls, 'RETURN_TYPES', ()) or ())
    except Exception:
        continue

    if not return_types:
        continue

    required_raw = input_types.get('required', {}) or {}

    req_connection = []   # [(name, type_str, slot_index)]
    slot_idx = 0
    for input_name, input_def in required_raw.items():
        if not isinstance(input_def, (list, tuple)) or not input_def:
            slot_idx += 1
            continue
        type_val = input_def[0]
        if isinstance(type_val, list) or type_val in WIDGET_TYPES:
            slot_idx += 1
            continue
        if not isinstance(type_val, str):
            slot_idx += 1
            continue
        req_connection.append((input_name, type_val, slot_idx))
        slot_idx += 1

    widget_defaults = {}
    for input_name, input_def in required_raw.items():
        if not isinstance(input_def, (list, tuple)) or not input_def:
            continue
        type_val = input_def[0]
        if isinstance(type_val, list) or type_val in WIDGET_TYPES:
            cfg = input_def[1] if len(input_def) > 1 else {}
            if isinstance(cfg, dict):
                widget_defaults[input_name] = cfg.get('default', None)

    if not req_connection:
        for out_idx, out_type in enumerate(return_types):
            if isinstance(out_type, str):
                source_map[out_type].append({
                    'class':          class_name,
                    'outputSlot':     out_idx,
                    'widgetDefaults': widget_defaults,
                })
    else:
        for (src_name, src_type, _src_slot) in req_connection:
            extras = [
                {'name': n, 'type': t, 'slotIndex': i}
                for (n, t, i) in req_connection if n != src_name
            ]
            for out_idx, out_type in enumerate(return_types):
                if isinstance(out_type, str):
                    conversion_map[src_type][out_type].append({
                        'class':       class_name,
                        'inputSlot':   src_name,
                        'outputSlot':  out_idx,
                        'extraInputs': extras,
                    })

def freeze(d):
    if isinstance(d, defaultdict): return {k: freeze(v) for k, v in d.items()}
    if isinstance(d, list): return [freeze(i) for i in d]
    return d

out = {'conversionMap': freeze(conversion_map), 'sourceMap': freeze(source_map)}
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
with open(OUTPUT, 'w', encoding='utf-8') as f:
    json.dump(out, f, indent=2, ensure_ascii=False)

src_count = sum(len(v) for v in out['sourceMap'].values())
print(f'OK: {OUTPUT}')
print(f'  sourceMap:     {len(out["sourceMap"])} output types, {src_count} entries')
print(f'  conversionMap: {len(out["conversionMap"])} source types')
