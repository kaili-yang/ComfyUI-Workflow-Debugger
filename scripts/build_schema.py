#!/usr/bin/env python3
"""
build_schema.py — static AST extractor for ComfyUI node schemas.

No node code is executed. Reads source files from nodes_lib/ and writes
src/lib/nodes_schema.json.

Output format:
  {
    "KSampler": {
      "category": "sampling",
      "inputs": {
        "required": { "model": "MODEL", "steps": "INT", ... },
        "optional": { "denoise": "FLOAT" }
      },
      "outputs": ["LATENT"]
    },
    ...
  }

Usage:
  python scripts/build_schema.py [--verbose]
"""

import ast
import json
import sys
from pathlib import Path
from typing import Optional

ROOT = Path(__file__).resolve().parent.parent
NODES_LIB = ROOT / "nodes_lib"
OUTPUT = ROOT / "src" / "lib" / "nodes_schema.json"

SOURCE_FILES = [
    NODES_LIB / "nodes.py",
    *sorted((NODES_LIB / "comfy_extras").glob("*.py")),
    *sorted((NODES_LIB / "comfy_api_nodes").glob("*.py")),
]

VERBOSE = "--verbose" in sys.argv

# ── IO class name → ComfyUI type string ───────────────────────────────────────
# Source: comfy_api/latest/_io.py  (@comfytype decorators)
# None = hidden input, not a connection slot
IO_CLASS_MAP: dict[str, Optional[str]] = {
    "String": "STRING",
    "Int": "INT",
    "Float": "FLOAT",
    "Boolean": "BOOLEAN",
    "Combo": "COMBO",
    "MultiCombo": "COMBO",
    "Image": "IMAGE",
    "Mask": "MASK",
    "Latent": "LATENT",
    "Conditioning": "CONDITIONING",
    "Sampler": "SAMPLER",
    "Sigmas": "SIGMAS",
    "Noise": "NOISE",
    "Guider": "GUIDER",
    "Clip": "CLIP",
    "ControlNet": "CONTROL_NET",
    "Vae": "VAE",
    "Model": "MODEL",
    "BackgroundRemoval": "BACKGROUND_REMOVAL",
    "ClipVision": "CLIP_VISION",
    "ClipVisionOutput": "CLIP_VISION_OUTPUT",
    "StyleModel": "STYLE_MODEL",
    "Gligen": "GLIGEN",
    "UpscaleModel": "UPSCALE_MODEL",
    "LatentUpscaleModel": "LATENT_UPSCALE_MODEL",
    "Audio": "AUDIO",
    "Video": "VIDEO",
    "Svg": "SVG",
    "LoraModel": "LORA_MODEL",
    "LossMap": "LOSS_MAP",
    "Voxel": "VOXEL",
    "Mesh": "MESH",
    "File3d": "FILE_3D",
    "File3dGlb": "FILE_3D_GLB",
    "File3dGltf": "FILE_3D_GLTF",
    "File3dFbx": "FILE_3D_FBX",
    "File3dObj": "FILE_3D_OBJ",
    "WanCameraEmbedding": "WAN_CAMERA_EMBEDDING",
    "Webcam": "WEBCAM",
    "MultiType": "MULTITYPE",
    "Hidden": None,
    "HiddenInput": None,
}


# ── AST utilities ─────────────────────────────────────────────────────────────

def _attr_chain(node: ast.expr) -> list[str]:
    """a.b.c  →  ['a', 'b', 'c']"""
    parts: list[str] = []
    while isinstance(node, ast.Attribute):
        parts.append(node.attr)
        node = node.value  # type: ignore[assignment]
    if isinstance(node, ast.Name):
        parts.append(node.id)
    return list(reversed(parts))


def _get_kwarg(call: ast.Call, name: str) -> Optional[ast.expr]:
    for kw in call.keywords:
        if kw.arg == name:
            return kw.value
    return None


def _class_by_name(tree: ast.Module) -> dict[str, ast.ClassDef]:
    return {n.name: n for n in ast.walk(tree) if isinstance(n, ast.ClassDef)}


def _class_attr(cls: ast.ClassDef, attr: str) -> Optional[ast.expr]:
    for stmt in cls.body:
        if isinstance(stmt, ast.Assign):
            for target in stmt.targets:
                if isinstance(target, ast.Name) and target.id == attr:
                    return stmt.value
    return None


def _constant_str(node: Optional[ast.expr]) -> str:
    if isinstance(node, ast.Constant) and isinstance(node.value, str):
        return node.value
    return ""


# ── Type resolution ───────────────────────────────────────────────────────────

def _collect_combo_names(tree: ast.Module) -> set[str]:
    """
    Module-level names whose values are COMBO-like:
    list/dict/tuple literals, or calls to folder_paths.get_filename_list.
    Used to resolve bare Name references in INPUT_TYPES slot definitions.
    """
    names: set[str] = set()
    for stmt in tree.body:
        if not isinstance(stmt, ast.Assign):
            continue
        val = stmt.value
        is_combo = isinstance(val, (ast.List, ast.Dict, ast.Tuple, ast.Set))
        if not is_combo and isinstance(val, ast.Call):
            fn = ".".join(_attr_chain(val.func))
            is_combo = "get_filename_list" in fn or "get_folder_paths" in fn
        if is_combo:
            for target in stmt.targets:
                if isinstance(target, ast.Name):
                    names.add(target.id)
    return names


def _resolve_type(node: ast.expr, combo_names: set[str]) -> str:
    """
    Resolve an INPUT_TYPES slot type expression → ComfyUI type string.

    Rules (in priority order):
      string literal           → the string itself ("IMAGE", "MODEL", …)
      list literal             → "COMBO"
      IO.STRING / io.STRING    → uppercase attr name ("STRING", "CLIP", …)
      IO.Image / io.Image      → IO_CLASS_MAP lookup → "IMAGE", …
      comfy.samplers.*.SAMPLERS/SCHEDULERS  → "COMBO"
      folder_paths.get_filename_list(…)     → "COMBO"
      known combo module-level name         → "COMBO"
      s.method(…)  (class self-call)        → "COMBO"  (dynamic file/option list)
      list(…) / sorted(…)                   → "COMBO"
      BinOp of two COMBO exprs (list +)     → "COMBO"
      anything else                         → "COMBO"  (safe fallback: all
                                               non-literal types in INPUT_TYPES
                                               are either connection strings or
                                               COMBO dropdowns — never UNKNOWN)
    """
    # String literal: "IMAGE", "LATENT", IO.STRING already yields "STRING", etc.
    if isinstance(node, ast.Constant) and isinstance(node.value, str):
        return node.value

    # List literal → COMBO dropdown options
    if isinstance(node, ast.List):
        return "COMBO"

    chain = _attr_chain(node)

    if chain:
        ns = chain[0]

        # IO.STRING / io.STRING  (uppercase = string constant equals the type)
        # IO.Image  / io.Image   (title-case = class with .Input/.Output)
        if ns in ("IO", "io") and len(chain) >= 2:
            attr = chain[1]
            if attr == attr.upper():
                return attr          # IO.STRING → "STRING"
            if attr in IO_CLASS_MAP:
                t = IO_CLASS_MAP[attr]
                return t if t is not None else "HIDDEN"
            return attr              # unknown IO subclass → use attr as-is

        # comfy.samplers.KSampler.SAMPLERS / .SCHEDULERS
        joined = ".".join(chain)
        if "SAMPLERS" in joined or "SCHEDULERS" in joined:
            return "COMBO"

        # folder_paths.get_filename_list / get_folder_paths in attr chain
        if "get_filename_list" in joined or "get_folder_paths" in joined:
            return "COMBO"

        # Known module-level COMBO variable
        if chain[0] in combo_names:
            return "COMBO"

        # s.method()  — INPUT_TYPES uses `s` as the class reference;
        # any method call on s returns a dynamic list → COMBO
        if chain[0] == "s":
            return "COMBO"

    # Function call
    if isinstance(node, ast.Call):
        fn_chain = _attr_chain(node.func)
        fn = ".".join(fn_chain)
        if "get_filename_list" in fn or "get_folder_paths" in fn:
            return "COMBO"
        if fn_chain and fn_chain[0] == "s":
            return "COMBO"          # s.vae_list(s) pattern
        if fn_chain in (["list"], ["sorted"], ["tuple"]):
            return "COMBO"

    # List concatenation: vaes + approx_vaes → COMBO
    if isinstance(node, ast.BinOp) and isinstance(node.op, ast.Add):
        l = _resolve_type(node.left, combo_names)
        r = _resolve_type(node.right, combo_names)
        if l == "COMBO" or r == "COMBO":
            return "COMBO"

    # Safe fallback: in valid ComfyUI V1 INPUT_TYPES, the only things that
    # appear as slot type expressions are string literals (connection types)
    # and list-producing expressions (COMBO). We already handled all known
    # string-literal cases above, so anything remaining is a dynamic list.
    if VERBOSE:
        print(f"  fallback→COMBO for AST: {ast.dump(node)[:120]}", file=sys.stderr)
    return "COMBO"


# ── V1 node extraction ────────────────────────────────────────────────────────

def _find_node_class_mappings(tree: ast.Module) -> dict[str, str]:
    """
    NODE_CLASS_MAPPINGS = {"NodeTypeName": ClassName, …}
    Returns {node_type_name: python_class_name}.
    """
    for stmt in tree.body:
        if not isinstance(stmt, ast.Assign):
            continue
        for target in stmt.targets:
            if not (isinstance(target, ast.Name) and target.id == "NODE_CLASS_MAPPINGS"):
                continue
            val = stmt.value
            if not isinstance(val, ast.Dict):
                continue
            result: dict[str, str] = {}
            for k, v in zip(val.keys, val.values):
                if isinstance(k, ast.Constant) and isinstance(v, ast.Name):
                    result[k.value] = v.id
            return result
    return {}


def _has_control_after_generate(config_node: ast.expr) -> bool:
    """Return True if the config dict literal has control_after_generate=True."""
    if not isinstance(config_node, ast.Dict):
        return False
    for k, v in zip(config_node.keys, config_node.values):
        if (
            isinstance(k, ast.Constant)
            and k.value == "control_after_generate"
            and isinstance(v, ast.Constant)
            and v.value is True
        ):
            return True
    return False


def _parse_v1_input_types(
    method: ast.FunctionDef,
    combo_names: set[str],
) -> tuple[dict[str, dict[str, str]], list[str]]:
    """
    Returns (inputs, cag_inputs) where cag_inputs lists INT slot names that
    have control_after_generate=True — the frontend injects an extra COMBO slot
    after each of these in widgets_values.
    """
    result: dict[str, dict[str, str]] = {"required": {}, "optional": {}}
    cag_inputs: list[str] = []

    for node in ast.walk(method):
        if not isinstance(node, ast.Return):
            continue
        top = node.value
        if not isinstance(top, ast.Dict):
            continue

        for cat_key, cat_val in zip(top.keys, top.values):
            if not isinstance(cat_key, ast.Constant):
                continue
            cat = cat_key.value
            if cat not in ("required", "optional"):
                continue
            if not isinstance(cat_val, ast.Dict):
                continue

            for slot_key, slot_val in zip(cat_val.keys, cat_val.values):
                if not isinstance(slot_key, ast.Constant):
                    continue
                slot_name = slot_key.value
                # Slot spec is a tuple: ("TYPE", {options…}) or (list_expr,)
                if isinstance(slot_val, ast.Tuple) and slot_val.elts:
                    type_str = _resolve_type(slot_val.elts[0], combo_names)
                    if type_str == "HIDDEN":
                        continue
                    result[cat][slot_name] = type_str
                    if (
                        type_str == "INT"
                        and len(slot_val.elts) >= 2
                        and _has_control_after_generate(slot_val.elts[1])
                    ):
                        cag_inputs.append(slot_name)

        break  # Only the first return dict

    return result, cag_inputs


def _parse_v1_outputs(cls: ast.ClassDef, combo_names: set[str]) -> list[str]:
    node = _class_attr(cls, "RETURN_TYPES")
    if node is None:
        return []
    if isinstance(node, ast.Tuple):
        return [_resolve_type(e, combo_names) for e in node.elts]
    if isinstance(node, ast.Constant):
        return [str(node.value)]
    return []


def _extract_v1_nodes(
    tree: ast.Module, combo_names: set[str]
) -> dict[str, dict]:
    mappings = _find_node_class_mappings(tree)
    if not mappings:
        return {}

    classes = _class_by_name(tree)
    schema: dict[str, dict] = {}

    for node_type, class_name in mappings.items():
        cls = classes.get(class_name)
        if cls is None:
            if VERBOSE:
                print(f"  V1 class not found: {class_name}", file=sys.stderr)
            continue

        inputs: dict[str, dict[str, str]] = {"required": {}, "optional": {}}
        cag_inputs: list[str] = []
        for item in cls.body:
            if isinstance(item, ast.FunctionDef) and item.name == "INPUT_TYPES":
                inputs, cag_inputs = _parse_v1_input_types(item, combo_names)
                break

        outputs = _parse_v1_outputs(cls, combo_names)
        category = _constant_str(_class_attr(cls, "CATEGORY"))

        entry: dict = {
            "category": category,
            "inputs": inputs,
            "outputs": outputs,
        }
        if cag_inputs:
            entry["control_after_generate"] = cag_inputs
        schema[node_type] = entry

    return schema


# ── V3 node extraction ────────────────────────────────────────────────────────

def _find_registered_v3_classes(tree: ast.Module) -> list[str]:
    """
    Collect class names returned from ComfyExtension.get_node_list().
    Only registered classes are included in the schema.
    """
    names: list[str] = []
    for node in ast.walk(tree):
        if not (
            isinstance(node, ast.AsyncFunctionDef)
            and node.name == "get_node_list"
        ):
            continue
        for stmt in node.body:
            if not isinstance(stmt, ast.Return):
                continue
            val = stmt.value
            if isinstance(val, ast.List):
                for elt in val.elts:
                    if isinstance(elt, ast.Name):
                        names.append(elt.id)
    return names


def _resolve_node_id(node: ast.expr, cls: ast.ClassDef) -> str:
    """Resolve node_id= argument: literal string or cls.NODE_ID."""
    if isinstance(node, ast.Constant) and isinstance(node.value, str):
        return node.value
    chain = _attr_chain(node)
    if len(chain) == 2 and chain[0] in ("cls", "self") and chain[1] == "NODE_ID":
        return _constant_str(_class_attr(cls, "NODE_ID"))
    return ""


def _parse_v3_inputs(inputs_node: Optional[ast.expr]) -> dict[str, dict[str, str]]:
    result: dict[str, dict[str, str]] = {"required": {}, "optional": {}}
    if not isinstance(inputs_node, ast.List):
        return result

    for item in inputs_node.elts:
        if not isinstance(item, ast.Call):
            continue
        chain = _attr_chain(item.func)
        # IO.Image.Input("name", optional=True)
        # io.Image.Input("name", optional=True)
        if len(chain) != 3 or chain[0] not in ("IO", "io") or chain[2] != "Input":
            continue

        io_class = chain[1]
        type_str = IO_CLASS_MAP.get(io_class)
        if type_str is None:
            continue  # Hidden / unrecognised

        if not item.args or not isinstance(item.args[0], ast.Constant):
            continue
        slot_name = item.args[0].value

        optional_node = _get_kwarg(item, "optional")
        is_optional = (
            isinstance(optional_node, ast.Constant)
            and optional_node.value is True
        )

        cat = "optional" if is_optional else "required"
        result[cat][slot_name] = type_str

    return result


def _parse_v3_outputs(outputs_node: Optional[ast.expr]) -> list[str]:
    if not isinstance(outputs_node, ast.List):
        return []
    result: list[str] = []
    for item in outputs_node.elts:
        if not isinstance(item, ast.Call):
            continue
        chain = _attr_chain(item.func)
        # IO.Image.Output()
        if len(chain) != 3 or chain[0] not in ("IO", "io") or chain[2] != "Output":
            continue
        io_class = chain[1]
        type_str = IO_CLASS_MAP.get(io_class)
        if type_str is not None:
            result.append(type_str)
    return result


def _extract_v3_nodes(tree: ast.Module) -> dict[str, dict]:
    registered = set(_find_registered_v3_classes(tree))
    if not registered:
        return {}

    classes = _class_by_name(tree)
    schema: dict[str, dict] = {}

    for class_name in registered:
        cls = classes.get(class_name)
        if cls is None:
            if VERBOSE:
                print(f"  V3 class not found: {class_name}", file=sys.stderr)
            continue

        for item in cls.body:
            if not (
                isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef))
                and item.name == "define_schema"
            ):
                continue

            for stmt in item.body:
                if not isinstance(stmt, ast.Return):
                    continue
                val = stmt.value
                if not isinstance(val, ast.Call):
                    continue
                fn_chain = _attr_chain(val.func)
                if not fn_chain or fn_chain[-1] != "Schema":
                    continue

                # node_id: first positional arg or keyword
                node_id_node = (
                    _get_kwarg(val, "node_id")
                    or (val.args[0] if val.args else None)
                )
                if node_id_node is None:
                    continue
                node_type = _resolve_node_id(node_id_node, cls)
                if not node_type:
                    continue

                category = _constant_str(_get_kwarg(val, "category"))
                inputs = _parse_v3_inputs(_get_kwarg(val, "inputs"))
                outputs = _parse_v3_outputs(_get_kwarg(val, "outputs"))

                schema[node_type] = {
                    "category": category,
                    "inputs": inputs,
                    "outputs": outputs,
                }
            break

    return schema


# ── File processing ───────────────────────────────────────────────────────────

def process_file(path: Path) -> dict[str, dict]:
    try:
        source = path.read_text(encoding="utf-8")
    except OSError as e:
        print(f"  ERROR reading {path.name}: {e}", file=sys.stderr)
        return {}

    try:
        tree = ast.parse(source, filename=str(path))
    except SyntaxError as e:
        print(f"  SKIP {path.name}: SyntaxError {e}", file=sys.stderr)
        return {}

    combo_names = _collect_combo_names(tree)
    v1 = _extract_v1_nodes(tree, combo_names)
    v3 = _extract_v3_nodes(tree)

    if VERBOSE and (v1 or v3):
        print(f"  {path.name}: {len(v1)} V1, {len(v3)} V3", file=sys.stderr)

    return {**v1, **v3}


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    schema: dict[str, dict] = {}
    v1_total = v3_total = 0

    for path in SOURCE_FILES:
        if not path.exists():
            print(f"  MISSING {path.relative_to(ROOT)}", file=sys.stderr)
            continue

        nodes = process_file(path)
        overlap = set(schema) & set(nodes)
        if overlap:
            print(
                f"  WARN duplicate node types in {path.name}: "
                + ", ".join(sorted(overlap)),
                file=sys.stderr,
            )
        schema.update(nodes)

    schema = dict(sorted(schema.items()))  # A-Z for stable diffs

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(schema, indent=2, ensure_ascii=False) + "\n")

    print(f"OK  {OUTPUT.relative_to(ROOT)}")
    print(f"    {len(schema)} nodes")


if __name__ == "__main__":
    main()
