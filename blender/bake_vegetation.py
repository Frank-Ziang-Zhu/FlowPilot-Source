"""Rebake four transparent foliage views from the packed original scan.
Run with Blender --background --python blender/bake_vegetation.py.
Source: Poly Haven tree_small_02 (CC0), retained as editable full-resolution geometry.
"""
import bpy, math
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(root/'models/blender/refined/vegetation-source.blend'))
scene=bpy.context.scene;camera=scene.camera
points=[o.matrix_world@Vector(c) for o in scene.objects if o.type=='MESH' for c in o.bound_box]
center=Vector(tuple((min(v[i] for v in points)+max(v[i] for v in points))/2 for i in range(3)))
height=max(v.z for v in points)-min(v.z for v in points)
scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
scene.render.resolution_x=scene.render.resolution_y=768;scene.render.resolution_percentage=100;scene.cycles.samples=24;scene.cycles.use_denoising=True
camera.data.type='ORTHO';camera.data.ortho_scale=height*1.13
for i in range(4):
    angle=i*math.tau/4;camera.location=center+Vector((math.sin(angle)*10,math.cos(angle)*10,4));camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(root/f'assets/realism/tree-impostor-{i}.png');bpy.ops.render.render(write_still=True)
print('Four offline photographic vegetation views baked')
