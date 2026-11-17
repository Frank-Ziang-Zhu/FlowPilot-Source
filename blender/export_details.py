"""Export only the editable detail collection. Run with Blender."""
import argparse,sys
from pathlib import Path
import bpy
parser=argparse.ArgumentParser();parser.add_argument('--output',required=True)
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:])
collection=bpy.data.collections.get('FP_DETAIL_OVERLAY')
if not collection:raise ValueError('FP_DETAIL_OVERLAY collection is missing')
bpy.ops.object.select_all(action='DESELECT')
objects=[obj for obj in collection.all_objects if obj.type=='MESH']
if not objects:raise ValueError('No detail meshes to export')
for obj in objects:obj.select_set(True)
bpy.context.view_layer.objects.active=objects[0]
target=Path(args.output).resolve();target.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(target),export_format='GLB',use_selection=True,
                         export_apply=True,export_yup=True,export_extras=True,export_animations=False)
print('FLOWPILOT_DETAIL_EXPORT='+str(target))
