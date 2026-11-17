"""Blender GLB round trip. Run with Blender, not ordinary Python."""
import argparse
import sys
from pathlib import Path
import bpy

parser = argparse.ArgumentParser()
parser.add_argument("--input", help="Optional GLB/GLTF to import in a new empty scene")
parser.add_argument("--output", required=True, help="Output GLB path")
args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
if args.input:
    source = Path(args.input).resolve()
    if not source.is_file() or source.suffix.lower() not in (".glb", ".gltf"):
        raise ValueError("Input must be an existing GLB/GLTF file")
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source))
output = Path(args.output).resolve()
output.parent.mkdir(parents=True, exist_ok=True)
bpy.context.scene.unit_settings.system = "METRIC"
bpy.ops.export_scene.gltf(filepath=str(output), export_format="GLB", export_yup=True,
                         export_extras=True, export_animations=True)
print("FLOWPILOT_GLB=" + str(output))
