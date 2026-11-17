"""Synchronize the editable masters with round 2's local photographic materials.
Usage: blender -b --python blender/update_round2_materials.py -- --scene overview
Run after refine_flowpilot.py when rebuilding. Preserves unit metadata and collections.
"""
import argparse, math, sys, json
from pathlib import Path
import bpy
from mathutils import Vector, Matrix

p=argparse.ArgumentParser();p.add_argument('--scene',choices=['overview','oxidation','network'],required=True);p.add_argument('--render',action='store_true')
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);root=Path(__file__).resolve().parents[1]
path=root/f'models/blender/refined/{a.scene}-master.blend'
bpy.ops.wm.open_mainfile(filepath=str(path));bpy.context.preferences.filepaths.file_preview_type='NONE'
scene=bpy.context.scene
def linear(value):
    rgb=[int(value[i:i+2],16)/255 for i in (0,2,4)]
    return tuple(c/12.92 if c<.04045 else ((c+.055)/1.055)**2.4 for c in rgb)
def image(file,noncolor=False):
    im=bpy.data.images.load(str(root/'assets/realism'/file),check_existing=True)
    im.colorspace_settings.name='Non-Color' if noncolor else 'sRGB';im.pack();return im
photos={f'{t}-{c}':image(f'{t}-{c}.jpg',c!='color') for t in ['concrete','asphalt'] for c in ['color','normal','rough','ao']}
palette={'concrete':'d3d0c4','concreteDark':'858981','concreteLight':'e1dfd3','building':'c7c9c2','slab':'b2b3aa','road':'ffffff','terrain':'75816e','terrainEdge':'696e64','ground':'797f78','roof':'596970','roofWarm':'846c60','water':'426353','waterDark':'40503e','waterAnoxic':'40503e','waterClean':'587f78','wastewater':'49523b','steel':'a8b4b7','darkSteel':'3a4549','grating':'8a9699'}
count=0
for m in bpy.data.materials:
    if not m.use_nodes:continue
    n=m.node_tree.nodes;l=m.node_tree.links;bs=n.get('Principled BSDF')
    if not bs:continue
    role=m.name.split('REFERENCE_PBR_',1)[-1].split('.')[0]
    if role in palette:bs.inputs['Base Color'].default_value=(*linear(palette[role]),1)
    if 'Emission Strength' in bs.inputs and role not in ['led','bubble','flow']:bs.inputs['Emission Strength'].default_value=0
    kind='concrete' if ('concrete' in role or role in ['building','slab'] or m.name.startswith('FP_concrete')) else 'asphalt' if role=='road' else None
    if kind:
        count+=1;coord=n.new('ShaderNodeTexCoord');scale=n.new('ShaderNodeVectorMath');scale.operation='SCALE';scale.inputs[3].default_value=1/3;l.new(coord.outputs['UV'],scale.inputs[0])
        tex={}
        for channel in ['color','normal','rough','ao']:
            q=n.new('ShaderNodeTexImage');q.image=photos[f'{kind}-{channel}'];l.new(scale.outputs['Vector'],q.inputs['Vector']);tex[channel]=q
        for socket in ['Base Color','Normal','Roughness']:
            for link in list(bs.inputs[socket].links):l.remove(link)
        color=tex['color'].outputs['Color']
        if kind=='concrete':
            mix=n.new('ShaderNodeMixRGB');mix.blend_type='MIX';mix.inputs[0].default_value=.25 if role=='building' else .4 if role=='slab' else .55;mix.inputs[1].default_value=(*linear('b8b5ab'),1);l.new(color,mix.inputs[2]);color=mix.outputs[0]
        l.new(color,bs.inputs['Base Color']);l.new(tex['rough'].outputs['Color'],bs.inputs['Roughness'])
        normal=n.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.35;l.new(tex['normal'].outputs['Color'],normal.inputs['Color']);l.new(normal.outputs[0],bs.inputs['Normal']);bs.inputs['Metallic'].default_value=0
    elif 'water' in role.lower() or 'wastewater' in role.lower() or m.name.startswith('FP_cutaway_water'):
        bs.inputs['Metallic'].default_value=0;bs.inputs['Roughness'].default_value=.15;bs.inputs['IOR'].default_value=1.333;bs.inputs['Coat Weight'].default_value=.55
    elif role in ['steel','darkSteel','grating']:bs.inputs['Metallic'].default_value=.85;bs.inputs['Roughness'].default_value=.42
world=scene.world;world.use_nodes=True;nodes=world.node_tree.nodes;links=world.node_tree.links
env=nodes.new('ShaderNodeTexEnvironment');env.image=image('industrial-sunset.hdr');links.new(env.outputs['Color'],nodes.get('Background').inputs[0]);nodes.get('Background').inputs[1].default_value=.6
# Native camera-facing foliage cards with packed RGBA photographs; the source tree is separately editable.
old=bpy.data.collections.get('ROUND2_PHOTOGRAPHIC_VEGETATION')
if old:
    for obj in list(old.objects):bpy.data.objects.remove(obj,do_unlink=True)
    bpy.data.collections.remove(old)
collection=bpy.data.collections.new('ROUND2_PHOTOGRAPHIC_VEGETATION');scene.collection.children.link(collection)
positions=[]
for obj in list(scene.objects):
    if obj.type=='MESH' and any(m and m.name.startswith(('REFERENCE_PBR_tree','REFERENCE_PBR_vegetation')) for m in obj.data.materials):
        pt=obj.matrix_world.translation
        if not any(math.hypot(pt.x-v.x,pt.y-v.y)<.5 for v in positions):positions.append(pt.copy())
        obj.hide_render=True;obj.hide_set(True)
tree_images=[image(f'tree-impostor-{i}.png') for i in range(4)]
for i,pt in enumerate(positions):
    h=2.35+abs(math.sin(pt.x*2.3-pt.y))*.45;center=Vector((pt.x,pt.y,h/2+.1));d=scene.camera.location-center;d.z=0;d.normalize();right=Vector((-d.y,d.x,0));up=Vector((0,0,1))
    angle=math.atan2(d.x,-d.y);im=tree_images[round(angle/(math.pi/2))%4]
    mesh=bpy.data.meshes.new(f'FoliageCardMesh{i}');mesh.from_pydata([(-h/2,-h/2,0),(h/2,-h/2,0),(h/2,h/2,0),(-h/2,h/2,0)],[],[(0,1,2,3)]);mesh.update()
    uv=mesh.uv_layers.new(name='UVMap')
    for loop,xy in zip(uv.data,[(0,0),(1,0),(1,1),(0,1)]):loop.uv=xy
    obj=bpy.data.objects.new(f'ScannedFoliage-{i}',mesh);collection.objects.link(obj);obj.location=center;obj.rotation_euler=Matrix((right,up,d)).transposed().to_euler();obj['source']='Poly Haven tree_small_02, CC0, four-view photographic LOD'
    mat=bpy.data.materials.new(f'FoliagePhoto{i}');mat.use_nodes=True;n=mat.node_tree.nodes;l=mat.node_tree.links;bs=n.get('Principled BSDF');q=n.new('ShaderNodeTexImage');q.image=im;l.new(q.outputs['Color'],bs.inputs['Base Color']);l.new(q.outputs['Alpha'],bs.inputs['Alpha']);bs.inputs['Roughness'].default_value=.9;mesh.materials.append(mat)
bpy.ops.file.pack_all();scene['refinement_round']=2;scene['photographic_materials']=count;scene['scanned_foliage_cards']=len(positions)
bpy.ops.wm.save_as_mainfile(filepath=str(path))
if a.render:
    scene.cycles.samples=16;scene.render.filepath=str(root/f'models/blender/refined/{a.scene}-round2-preview.png');bpy.ops.render.render(write_still=True)
print('ROUND2_MASTER',a.scene,count,len(positions),sum(bool(im.packed_file) for im in bpy.data.images),flush=True)
