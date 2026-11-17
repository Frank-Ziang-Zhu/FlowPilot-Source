"""Blender-authored edge bevels reused by original animated JS meshes."""
import argparse,json,sys
from pathlib import Path
import bpy
parser=argparse.ArgumentParser();parser.add_argument('--catalog',required=True)
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:])
catalog=json.loads(Path(args.catalog).read_text(encoding='utf-8'))
root=Path(__file__).resolve().parents[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
atlas={}
for key,(w,h,d) in catalog.items():
    bpy.ops.mesh.primitive_cube_add(size=1)
    obj=bpy.context.object;obj.scale=(w,d,h);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    mod=obj.modifiers.new('Engineering edge bevel','BEVEL');mod.width=min(.035,min(w,h,d)*.10);mod.segments=2
    bpy.ops.object.modifier_apply(modifier=mod.name)
    for poly in obj.data.polygons:poly.use_smooth=True
    mod=obj.modifiers.new('Weighted face normals','WEIGHTED_NORMAL');mod.keep_sharp=True;mod.weight=80
    bpy.ops.object.modifier_apply(modifier=mod.name)
    mesh=obj.data;mesh.calc_loop_triangles();positions=[];normals=[];uv=[]
    for triangle in mesh.loop_triangles:
        for loop_index in triangle.loops:
            loop=mesh.loops[loop_index];v=mesh.vertices[loop.vertex_index].co;n=mesh.corner_normals[loop_index].vector
            positions.extend(round(float(vv),6) for vv in (v.x,v.z,-v.y));normals.extend(round(float(nn),6) for nn in (n.x,n.z,-n.y))
            absn=(abs(n.x),abs(n.z),abs(n.y))
            if absn[1]>.85:uv.extend([round(v.x,6),round(-v.y,6)])
            elif absn[0]>.85:uv.extend([round(-v.y,6),round(v.z,6)])
            else:uv.extend([round(v.x,6),round(v.z,6)])
    atlas[key]={'position':positions,'normal':normals,'uv':uv,'size':[w,h,d]}
    bpy.data.objects.remove(obj,do_unlink=True)
(root/'assets/pbr/bevel-atlas.json').write_text(json.dumps(atlas,separators=(',',':')),encoding='utf-8')
print('BEVEL_VARIANTS='+str(len(atlas)))
