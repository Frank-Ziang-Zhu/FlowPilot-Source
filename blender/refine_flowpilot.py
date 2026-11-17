"""Create editable masters and lightweight detail overlays from the restored GLBs.
Run: blender --background --python blender/refine_flowpilot.py -- --scene overview
All positions below use the existing Three.js coordinate system (Y up).
"""
import argparse, json, math, sys, re
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector

args_parser=argparse.ArgumentParser()
args_parser.add_argument('--scene',choices=['overview','oxidation','network'],required=True)
args_parser.add_argument('--render',action='store_true')
args=args_parser.parse_args(sys.argv[sys.argv.index('--')+1:])
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'models/blender/refined'
TEXTURES=ROOT/'assets/pbr'
OUT.mkdir(parents=True,exist_ok=True); TEXTURES.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.file_preview_type='NONE'
bpy.context.scene.unit_settings.system='METRIC'

def xyz(p): return (p[0],-p[2],p[1])
def image(name,data,noncolor=False):
    h,w=data.shape[:2]; im=bpy.data.images.new(name,width=w,height=h,alpha=True)
    im.colorspace_settings.name='Non-Color' if noncolor else 'sRGB'
    im.pixels.foreach_set(np.concatenate([data,np.ones((h,w,1),dtype=np.float32)],axis=2).astype(np.float32).ravel())
    im.filepath_raw=str(TEXTURES/(name+'.png')); im.file_format='PNG';im.save();im.pack();return im

def textures():
    n=512;y,x=np.mgrid[0:n,0:n];rng=np.random.default_rng(42)
    noise=rng.normal(0,1,(n,n));fine=noise*.015
    coarse=np.sin(x*.06)*np.sin(y*.04)*.022+np.sin(x*.18+y*.13)*.009
    h=.5+fine+coarse
    spots=(rng.random((n,n))>.995)*.16
    rgb=np.clip(.76+fine[...,None]+coarse[...,None]-spots[...,None],.40,.94)*np.array([1.0,.985,.955])
    concrete=image('concrete-albedo',rgb)
    rough=image('concrete-roughness',np.repeat(np.clip(.82+noise*.025,.7,.96)[...,None],3,axis=2),True)
    dx=(np.roll(h,1,1)-np.roll(h,-1,1))*1.1;dy=(np.roll(h,1,0)-np.roll(h,-1,0))*1.1
    normal=image('concrete-normal',np.stack([.5+dx,.5+dy,np.ones_like(h)],axis=2),True)
    asphalt=image('asphalt-albedo',np.repeat(np.clip(.34+noise*.025,.19,.43)[...,None],3,axis=2)*np.array([.97,1.,1.02]))
    steel=image('steel-roughness',np.repeat(np.clip(.42+np.sin(y*.64)*.018+noise*.008,.3,.55)[...,None],3,axis=2),True)
    wave=np.sin(x*.09+y*.03)*.035+np.sin(y*.15-x*.05)*.025
    water=image('water-normal',np.stack([.5+(np.roll(wave,1,1)-np.roll(wave,-1,1))*.9,.5+(np.roll(wave,1,0)-np.roll(wave,-1,0))*.9,np.ones_like(wave)],axis=2),True)
    return concrete,rough,normal,asphalt,steel,water
TEX=textures()
def mat(name,color,metal=0,rough=.6):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
    return m
M={'concrete':mat('FP_concrete',(0.52,.55,.55),.03,.85),'steel':mat('FP_galvanized',(0.47,.55,.59),.8,.38),'dark':mat('FP_cast_iron',(.08,.12,.15),.55,.52),'blue':mat('FP_pump_enamel',(.045,.18,.29),.35,.3),'yellow':mat('FP_safety_paint',(.76,.59,.12),.15,.44),'white':mat('FP_instrument_face',(.81,.84,.81),.05,.48),'red':mat('FP_isolation_valve',(.51,.105,.07),.3,.4),'glass':mat('FP_display_glass',(.045,.13,.18),.45,.18),'water':mat('FP_cutaway_water',(.06,.21,.18),.04,.24)}
def texnode(m,im,target):
    nodes=m.node_tree.nodes;links=m.node_tree.links;p=nodes.get('Principled BSDF');node=nodes.new('ShaderNodeTexImage');node.image=im
    if target=='normal':
        normal=nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.22;links.new(node.outputs['Color'],normal.inputs['Color']);links.new(normal.outputs['Normal'],p.inputs['Normal'])
    else: links.new(node.outputs['Color'],p.inputs[target])
texnode(M['concrete'],TEX[0],'Base Color');texnode(M['concrete'],TEX[1],'Roughness');texnode(M['concrete'],TEX[2],'normal');texnode(M['steel'],TEX[4],'Roughness');texnode(M['water'],TEX[5],'normal')
collection=bpy.data.collections.new('FP_DETAIL_OVERLAY');bpy.context.scene.collection.children.link(collection)
PARTS=[]
def record(obj,name,material,role='static_detail'):
    obj.name=name;obj.data.materials.append(M[material]);
    for c in list(obj.users_collection): c.objects.unlink(obj)
    collection.objects.link(obj);PARTS.append(obj)
    obj['unit_id']='demo:'+args.scene+':'+name;obj['animation_role']=role;obj['source']='Blender detail asset, illustrative geometry'
    if obj.type=='MESH':
        for p in obj.data.polygons:p.use_smooth=True
    return obj
def cube(name,loc,size,material,bevel=.025):
    bpy.ops.mesh.primitive_cube_add(size=1,location=xyz(loc));o=bpy.context.object;o.scale=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=o.modifiers.new('Machined edges','BEVEL');mod.width=min(bevel,min(size)*.15);mod.segments=2
        bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
    record(o,name,material)
    mod=o.modifiers.new('Weighted machined normals','WEIGHTED_NORMAL');mod.keep_sharp=True;mod.weight=80
    bpy.ops.object.modifier_apply(modifier=mod.name)
    return o
def cyl(name,loc,r,length,material,axis=(0,1,0),vertices=24):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=length,location=xyz(loc));o=bpy.context.object;o.rotation_mode='QUATERNION';o.rotation_quaternion=Vector((0,0,1)).rotation_difference(Vector(xyz(axis)))
    record(o,name,material)
    for polygon in o.data.polygons:polygon.use_smooth=len(polygon.vertices)==4
    return o
def rod(name,a,b,r,material):
    v=Vector(b)-Vector(a);return cyl(name,tuple((Vector(a)+Vector(b))/2),r,v.length,material,tuple(v),12)
def torus(name,loc,r,tube,material,axis=(0,1,0)):
    bpy.ops.mesh.primitive_torus_add(major_segments=24,minor_segments=6,major_radius=r,minor_radius=tube,location=xyz(loc));o=bpy.context.object;o.rotation_mode='QUATERNION';o.rotation_quaternion=Vector((0,0,1)).rotation_difference(Vector(xyz(axis)));return record(o,name,material)
def merge_since(start,name,metadata=None):
    parts=PARTS[start:]
    bpy.ops.object.select_all(action='DESELECT')
    for p in parts:p.select_set(True)
    bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();obj=bpy.context.object;obj.name=name
    obj['unit_id']='demo:'+args.scene+':'+name;obj['animation_role']='static_detail';obj['unit']=metadata or ('utilities' if args.scene=='overview' else 'ditch' if args.scene=='oxidation' else 'station-b')
    del PARTS[start:];PARTS.append(obj);return obj
def gauge(name,x,y,z):
    start=len(PARTS)
    cyl(name+'-stem',(x,y-.25,z),.027,.5,'steel');cyl(name+'-case',(x,y,z),.135,.08,'steel',(0,0,1));cyl(name+'-dial',(x,y,z+.045),.117,.009,'white',(0,0,1));torus(name+'-bezel',(x,y,z+.058),.123,.012,'dark',(0,0,1))
    for i in range(9):
        a=math.radians(40+i*35);rod(name+'-graduation',(x+math.cos(a)*.086,y+math.sin(a)*.086,z+.066),(x+math.cos(a)*.103,y+math.sin(a)*.103,z+.066),.003,'dark')
    rod(name+'-needle',(x,y,z+.07),(x-.052,y+.064,z+.07),.006,'red')
    obj=merge_since(start,name);obj['sensor_id']='demo:'+name+':pressure'
def flange(name,x,y,z,r=.15,axis=(1,0,0)):
    cyl(name,(x,y,z),r,.042,'steel',axis)
    for i in range(8):
        a=i*math.tau/8
        cyl(name+'-bolt',(x+.03,y+math.cos(a)*r*.78,z+math.sin(a)*r*.78),.014,.026,'dark',axis,6)
def skid(name,x,y,z):
    start=len(PARTS)
    cube(name+'-foundation',(x,y+.075,z),(1.78,.15,.92),'concrete',.025)
    cube(name+'-base',(x,y+.19,z),(1.62,.1,.65),'dark',.02)
    for dx in [-.64,.64]:
        for dz in [-.24,.24]:cyl(name+'-anchor',(x+dx,y+.265,z+dz),.025,.055,'steel',vertices=6)
    cyl(name+'-motor',(x-.39,y+.46,z),.205,.55,'blue',(1,0,0),32)
    for i in range(12):
        a=i*math.tau/12;cube(name+'-cooling-fin',(x-.39,y+.46+math.cos(a)*.218,z+math.sin(a)*.218),(.46,.03,.035),'blue',.003)
    cyl(name+'-fan-cover',(x-.72,y+.46,z),.215,.065,'dark',(1,0,0),32)
    cube(name+'-junction',(x-.36,y+.735,z),(.2,.14,.23),'blue',.012)
    cyl(name+'-coupling',(x-.035,y+.46,z),.085,.15,'steel',(1,0,0))
    cube(name+'-coupling-guard',(x-.025,y+.50,z),(.2,.18,.25),'yellow',.025)
    cyl(name+'-volute',(x+.34,y+.47,z),.265,.30,'blue',(1,0,0),32)
    cyl(name+'-suction',(x+.67,y+.47,z),.11,.28,'blue',(1,0,0));flange(name+'-suction-flange',x+.79,y+.47,z)
    cyl(name+'-discharge',(x+.32,y+.83,z),.09,.30,'blue');torus(name+'-pipe-joint',(x+.32,y+.98,z),.13,.025,'steel')
    cube(name+'-nameplate',(x+.48,y+.48,z+.19),(.14,.08,.018),'white',.004)
    merge_since(start,name)
    gauge(name+'-PI',x+.32,y+1.29,z)
def cabinet(name,x,y,z,unit):
    start=len(PARTS)
    cube(name+'-foot',(x,y+.065,z),(.57,.13,.5),'concrete');cube(name+'-shell',(x,y+.67,z),(.5,1.04,.32),'steel')
    cube(name+'-door',(x,y+.69,z+.169),(.45,.97,.02),'white',.008)
    cube(name+'-display',(x,y+.94,z+.186),(.23,.13,.018),'glass',.009)
    for dx,m in [(-.13,'red'),(0,'yellow'),(.13,'blue')]:cyl(name+'-switch',(x+dx,y+.57,z+.198),.028,.025,m,(0,0,1),16)
    cube(name+'-handle',(x+.15,y+.76,z+.196),(.018,.15,.028),'dark',.002)
    for i in range(5):cube(name+'-vent',(x,y+.27+i*.028,z+.184),(.23,.011,.01),'dark',.001)
    obj=merge_since(start,name,unit);obj['actuator_id']='demo:'+name+':panel'
def sample(name,x,y,z,unit):
    start=len(PARTS)
    cube(name+'-base',(x,y+.04,z),(.52,.08,.45),'concrete')
    for dx in [-.15,.15]:rod(name+'-post',(x+dx,y+.07,z),(x+dx,y+1.5,z),.025,'steel')
    cube(name+'-meter',(x,y+1.45,z),(.35,.34,.19),'white',.03)
    cube(name+'-screen',(x,y+1.5,z+.10),(.20,.11,.014),'glass',.01)
    cyl(name+'-sample-line',(x+.23,y+.7,z),.026,1.4,'steel')
    torus(name+'-sample-valve',(x+.23,y+1.03,z+.09),.09,.017,'red',(0,0,1))
    obj=merge_since(start,name,unit);obj['sensor_id']='demo:'+name+':quality'
def ladder(name,x,y,z,height=1.5):
    start=len(PARTS)
    for dx in [-.2,.2]:rod(name+'-rail',(x+dx,y,z),(x+dx,y+height+.18,z),.025,'steel')
    for dy in np.arange(.12,height,.22):rod(name+'-rung',(x-.2,y+dy,z),(x+.2,y+dy,z),.023,'steel')
    merge_since(start,name)

if args.scene=='overview':
    for i,z in enumerate([-3.1,3.1]):
        for j,x in enumerate([-6.8,-2.4,7.2]):sample(f'A2O-{i+1}-AIT-{j+1}',x,0,z+2.38,'aerobic' if x>0 else 'anaerobic')
        ladder(f'A2O-{i+1}-access',8.55,.14,z+2.15,1.2)
    for i,x in enumerate([-5.5,-3.3,-1.1]):skid(f'BLOWER-SERVICE-P{i+1}',x,0,-7.2)
    for i,(x,z) in enumerate([(10.8,7.1),(10.8,-6.0)]):cabinet(f'CLARIFIER-MCC-{i+1}',x,0,z,'clarifier')
    for i,z in enumerate([-1.2,1.2]):gauge(f'AIR-PI-{i+1}',4.6,1.35,z-6.55)
elif args.scene=='oxidation':
    for i,center in enumerate([-5.15,5.15]):
        for j,x in enumerate([-6.75,6.75]):sample(f'OX-{i+1}-DO-{j+1}',x,.2,center+4.9,'ditch')
        for j,x in enumerate([-3.7,3.7]):
            for k,offset in enumerate([-3.22,3.22]):
                start=len(PARTS);yy=1.57;zz=center+offset
                for b in range(7):cube(f'OX-gear-fin-{i}-{j}-{k}',(x-.26+b*.087,yy,zz+.38),(.025,.4,.10),'steel',.002)
                for dx in [-.23,.23]:
                    for dz in [-.25,.25]:cyl('Gearbox-anchor',(x+dx,1.29,zz+dz),.023,.06,'steel',vertices=6)
                obj=merge_since(start,f'OX-DRIVE-{i+1}-{j+1}-{k+1}','ditch');obj['actuator_id']='demo:'+obj.name
        ladder(f'OX-{i+1}-inspection-ladder',11.9,.1,center,1.38)
    for i,(x,z) in enumerate([(20,-5.6),(20,0),(20,5.6)]):cabinet(f'OX-CLARIFIER-MCC-{i+1}',x,0,z,'clarifier')
    for i,x in enumerate([-2,0,2]):skid(f'OX-BLOWER-SERVICE-{i+1}',x,0,-9.3)
else:
    for code,x,z,s in [('A',-16.7,2.8,1.02),('B',24.2,2.8,.9),('C',-7,-9.1,.82),('D',8.2,-10.2,.9)]:
        skid(f'{code}-PUMP-INSPECTION',x-1.45,.31,z+3.35)
        cabinet(f'{code}-MCC',x+3.2*s,.31,z+.7,'station-'+code.lower())
        sample(f'{code}-COD-FLOW',x-3.12*s,.25,z-1.1,'station-'+code.lower())
    start=len(PARTS);x=26.8;z=8.5;y=.25
    cube('Wetwell-section-floor',(x,y+.15,z),(3,.30,2.8),'concrete')
    cube('Wetwell-section-back',(x,y+1.25,z-1.34),(3,2.3,.20),'concrete')
    for dx in [-1.4,1.4]:cube('Wetwell-section-side',(x+dx,y+1.25,z),(.20,2.3,2.8),'concrete')
    cube('Wetwell-section-water',(x,y+.57,z),(2.7,.12,2.55),'water',0)
    for dx in [-.65,.65]:
        cyl('Submersible-pump',(x+dx,y+.69,z-.1),.24,.70,'blue')
        for j in range(10):
            angle=j*math.tau/10
            rod('Pump-cooling-rib',(x+dx+math.cos(angle)*.244,y+.55,z-.1+math.sin(angle)*.244),(x+dx+math.cos(angle)*.244,y+.96,z-.1+math.sin(angle)*.244),.018,'blue')
        torus('Motor-lifting-eye',(x+dx,y+1.13,z-.1),.09,.02,'steel',(0,0,1))
        for height in [.37,1.02]:
            torus('Pump-housing-joint',(x+dx,y+height,z-.1),.24,.023,'dark')
        for j in range(8):
            angle=j*math.tau/8
            cyl('Pump-casing-bolt',(x+dx+math.cos(angle)*.205,y+1.05,z-.1+math.sin(angle)*.205),.013,.035,'steel',vertices=6)
        cube('Pump-guide-shoe',(x+dx,y+.38,z-.35),(.46,.16,.19),'dark',.015)
        cyl('Riser',(x+dx,y+1.35,z-.1),.09,1.40,'blue')
        cyl('Discharge',(x+dx,y+2.02,z-.70),.09,1.25,'blue',(0,0,1))
        for zz in [z-.44,z-1.12]:
            cyl('Discharge-flange',(x+dx,y+2.02,zz),.145,.045,'steel',(0,0,1))
            for j in range(8):
                angle=j*math.tau/8
                cyl('Flange-bolt',(x+dx+math.cos(angle)*.118,y+2.02+math.sin(angle)*.118,zz+.031),.014,.028,'dark',(0,0,1),6)
        cyl('Isolation-valve-body',(x+dx,y+2.02,z-.85),.13,.29,'dark',(0,0,1))
        cyl('Valve-stem',(x+dx,y+2.20,z-.85),.023,.24,'steel')
        torus('Isolation-handwheel',(x+dx,y+2.34,z-.85),.17,.019,'red')
        for angle in [0,math.pi/2]:
            rod('Handwheel-spoke',(x+dx-math.cos(angle)*.15,y+2.34,z-.85-math.sin(angle)*.15),(x+dx+math.cos(angle)*.15,y+2.34,z-.85+math.sin(angle)*.15),.012,'red')
        for a in [-.12,.12]:rod('Pump-guide',(x+dx+a,y+.33,z-.34),(x+dx+a,y+2.18,z-.34),.016,'steel')
    for dx in [-1.3,0,1.3]:rod('Wetwell-safety-post',(x+dx,y+2.4,z-1.34),(x+dx,y+3.22,z-1.34),.025,'yellow')
    for dy in [2.84,3.22]:rod('Wetwell-safety-rail',(x-1.3,y+dy,z-1.34),(x+1.3,y+dy,z-1.34),.025,'yellow')
    obj=merge_since(start,'B-WETWELL-CUTAWAY','station-b');obj['description']='Illustrative inspection cutaway, not a surveyed station model'
    ladder('Wetwell-access',x+1.12,y+.3,z-.92,1.9)

# Keep detail GLB small: merge each assembly; bake bevels; do not export the original plant twice.
bpy.ops.object.select_all(action='DESELECT')
for obj in PARTS:obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/(args.scene+'-details.glb')),export_format='GLB',use_selection=True,export_extras=True,export_yup=True,export_animations=False)
detail_count=len(PARTS);triangles=sum(len(o.data.polygons) for o in PARTS if o.type=='MESH')
# Import the restored reference only into the editable master, with a separate collection.
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.import_scene.gltf(filepath=str(ROOT/('models/blender/reference/'+args.scene+'.glb')))
originals=list(bpy.context.selected_objects)
source_collection=bpy.data.collections.new('ORIGINAL_PROCEDURAL_REFERENCE');bpy.context.scene.collection.children.link(source_collection)
for obj in originals:
    for c in list(obj.users_collection):c.objects.unlink(obj)
    source_collection.objects.link(obj)
    if obj.type=='MESH':
        for p in obj.data.polygons:p.use_smooth=True
# Apply the same surface roles to the editable Blender reference master.
source_file=ROOT/('network.js' if args.scene=='network' else 'app.js')
function='initNetwork3d' if args.scene=='network' else 'initPlant3d' if args.scene=='overview' else 'initOxidation3d'
source=source_file.read_text(encoding='utf-8').split('function '+function+'()',1)[1]
material_block=source.split('const mat = {',1)[1].split('\n  };',1)[0]
def linear_hex(value):
    values=[int(value[i:i+2],16)/255 for i in (0,2,4)]
    return tuple(v/12.92 if v<.04045 else ((v+.055)/1.055)**2.4 for v in values)
roles={role:linear_hex(color) for role,color in re.findall(r'(\w+):\s*new T\.\w+Material\(\{\s*color:\s*0x([0-9a-fA-F]{6})',material_block)}
palette={'concrete':'93a19f','concreteDark':'556870','concreteLight':'b3bcba','building':'8d9fa1','slab':'617078','road':'303b45','terrain':'314b53','terrainEdge':'1d303e','water':'498b91','waterDark':'285e66','waterClean':'6eaaaf','waterAnoxic':'4f7575','wastewater':'52674d','steel':'aebbc1','darkSteel':'394952','grating':'758990'}
ref_materials={m for o in originals if o.type=='MESH' for m in o.data.materials if m and m.use_nodes}
for m in ref_materials:
    p=m.node_tree.nodes.get('Principled BSDF')
    if not p or not roles:continue
    rgb=tuple(p.inputs['Base Color'].default_value[:3])
    role=min(roles,key=lambda key:sum((a-b)**2 for a,b in zip(rgb,roles[key])))
    if sum((a-b)**2 for a,b in zip(rgb,roles[role]))>.0001:continue
    m.name='REFERENCE_PBR_'+role
    if role in palette:p.inputs['Base Color'].default_value=(*linear_hex(palette[role]),1)
    if 'Emission Strength' in p.inputs and role not in ['led','bubble','flow','window','glass']:p.inputs['Emission Strength'].default_value=.025
    if any(k in role for k in ['concrete','building','slab']):
        p.inputs['Roughness'].default_value=.86;p.inputs['Metallic'].default_value=.025
        n=m.node_tree.nodes.new('ShaderNodeTexNoise');n.inputs['Scale'].default_value=38;n.inputs['Detail'].default_value=2
        bump=m.node_tree.nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.12;bump.inputs['Distance'].default_value=.025
        m.node_tree.links.new(n.outputs['Fac'],bump.inputs['Height']);m.node_tree.links.new(bump.outputs['Normal'],p.inputs['Normal'])
    elif any(k in role.lower() for k in ['water','wastewater']):p.inputs['Roughness'].default_value=.2;p.inputs['Metallic'].default_value=.15;texnode(m,TEX[5],'normal')
    elif role in ['steel','darkSteel','grating']:p.inputs['Metallic'].default_value=.72;p.inputs['Roughness'].default_value=.38
for obj in originals:
    if obj.type!='MESH' or len(obj.data.vertices)!=24:continue
    dims=tuple(obj.dimensions)
    if min(dims)<.09 or max(dims)>12:continue
    if obj.data.users>1:obj.data=obj.data.copy()
    modifier=obj.modifiers.new('Small edge bevel','BEVEL');modifier.width=min(.035,min(dims)*.1);modifier.segments=2
# A daylight studio for inspecting the actual master in Blender.
scene=bpy.context.scene
world=bpy.data.worlds.new('Engineering daylight');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.16,.21,.26,1);world.node_tree.nodes['Background'].inputs[1].default_value=.55;scene.world=world
bpy.ops.object.light_add(type='SUN',location=(0,0,30));sun=bpy.context.object;sun.name='Daylight';sun.data.energy=2.8;sun.data.angle=math.radians(12);sun.rotation_euler=(math.radians(28),math.radians(-22),math.radians(-34))
bpy.ops.object.light_add(type='AREA',location=(0,-12,24));bpy.context.object.data.energy=2400;bpy.context.object.data.shape='DISK';bpy.context.object.data.size=25
camera_locations={'overview':(31,29,32),'oxidation':(37,34,37),'network':(48,45,44)}
bpy.ops.object.camera_add(location=camera_locations[args.scene]);camera=bpy.context.object;target=Vector((0,0,.7));camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=55 if args.scene!='network' else 72;scene.camera=camera
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
scene.render.resolution_x=1280;scene.render.resolution_y=900;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='PNG'
bpy.ops.object.select_all(action='DESELECT')
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            area.spaces.active.region_3d.view_perspective='CAMERA'
            area.spaces.active.shading.type='MATERIAL'
            area.spaces.active.shading.use_scene_world=True
            area.spaces.active.shading.use_scene_lights=True
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(args.scene+'-master.blend')))
if args.render:
    scene.render.filepath=str(OUT/(args.scene+'-blender-preview.png'));bpy.ops.render.render(write_still=True)
(OUT/(args.scene+'-build.json')).write_text(json.dumps({'scene':args.scene,'blender':bpy.app.version_string,'detail_assemblies':detail_count,'detail_polygons':triangles,'reference_objects':len(originals),'coordinate_system':'meters, Three Y up -> Blender Z up','export':'detail overlay only; original animations stay in JS','asset_ids':'demo identifiers, not live SCADA bindings'},indent=2),encoding='utf-8')
print('FLOWPILOT_REFINED='+args.scene)
