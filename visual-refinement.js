/* PBR surfaces and Blender bevels; keep original objects and animation arrays. */
window.FlowPilotVisuals = {
  scenes: {}, textures: null, bevels: null,
  async applyBevels(scene) {
    if(!this.bevels)this.bevels=fetch('assets/pbr/bevel-atlas.json').then(r=>{if(!r.ok)throw new Error('Bevel atlas unavailable');return r.json();}).then(data=>{
      const T=window.THREE;const result={};Object.entries(data).forEach(([key,entry])=>{const geometry=new T.BufferGeometry();for(const attr of ['position','normal','uv'])geometry.setAttribute(attr,new T.Float32BufferAttribute(entry[attr],attr==='uv'?2:3));geometry.computeBoundingSphere();result[key]=geometry;});return result;
    });
    const atlas=await this.bevels;
    scene.traverse(node=>{
      if(!node.isMesh||node.geometry.type!=='BoxGeometry'||Array.isArray(node.material))return;
      const {width,height,depth}=node.geometry.parameters;
      const key=[width,height,depth].map(n=>Number(n.toFixed(4))).join('|');
      if(atlas[key]){node.geometry=atlas[key];node.userData.blenderBevel=true;}
    });
  },
  async loadTextures() {
    if (!this.textures) {
      const T=window.THREE, loader=new T.TextureLoader();
      this.textures=Promise.all(['concrete-albedo','concrete-roughness','concrete-normal','asphalt-albedo','steel-roughness','water-normal'].map(async name => {
        const texture=await loader.loadAsync(`assets/pbr/${name}.png`);
        texture.wrapS=texture.wrapT=T.RepeatWrapping;
        texture.anisotropy=8;
        if (name.endsWith('albedo')) texture.colorSpace=T.SRGBColorSpace;
        return [name,texture];
      })).then(Object.fromEntries);
    }
    return this.textures;
  },
  async enhance(key,scene,renderer,materials) {
    this.scenes[key]={scene,renderer,materials};
    const T=window.THREE;
    Object.entries(materials).forEach(([name,material])=>{material.name=`FP_${name}`;});
    renderer.toneMapping=T.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.02;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
    scene.background=new T.Color(key==='network'?0x0c2130:0x0b202c);
    scene.fog=new T.Fog(scene.background,key==='network'?65:48,key==='network'?130:110);
    scene.traverse(node=>{
      if(node.isDirectionalLight){node.intensity=3.3;node.shadow.mapSize.set(innerWidth<=760?1024:2048,innerWidth<=760?1024:2048);node.shadow.normalBias=.025;node.shadow.bias=-.00018;node.shadow.radius=2.5;}
      if(node.isHemisphereLight){node.color.set(0xe5f0f5);node.groundColor.set(0x24343b);node.intensity=2.15;}
      if(node.isPointLight)node.intensity*=.23;
      if(node.isLineSegments&&node.material?.opacity<.5)node.material.opacity*=.55;
    });
    this.setQuality(localStorage.getItem('flowpilot-quality')||(innerWidth<=760?'balanced':'high'));
    // Offline studio sky for plausible metal and water reflections.
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;
    const ctx=canvas.getContext('2d'),gradient=ctx.createLinearGradient(0,0,0,256);
    gradient.addColorStop(0,'#819fb8');gradient.addColorStop(.45,'#dae7ea');gradient.addColorStop(.51,'#a7bbc2');gradient.addColorStop(.54,'#415464');gradient.addColorStop(1,'#142737');
    ctx.fillStyle=gradient;ctx.fillRect(0,0,512,256);
    const glow=ctx.createRadialGradient(330,76,2,330,76,65);glow.addColorStop(0,'rgba(255,248,226,.95)');glow.addColorStop(1,'rgba(255,248,226,0)');ctx.fillStyle=glow;ctx.fillRect(245,0,170,160);
    const sky=new T.CanvasTexture(canvas);sky.colorSpace=T.SRGBColorSpace;sky.mapping=T.EquirectangularReflectionMapping;
    const pmrem=new T.PMREMGenerator(renderer);const environment=pmrem.fromEquirectangular(sky);scene.environment=environment.texture;sky.dispose();pmrem.dispose();
    const colors={concrete:0x93a19f,concreteDark:0x556870,concreteLight:0xb3bcba,building:0x8d9fa1,slab:0x617078,ground:0x20313b,terrain:0x314b53,terrainEdge:0x1d303e,road:0x657080,water:0x498b91,waterDark:0x285e66,waterClean:0x6eaaaf,waterAnoxic:0x4f7575,wastewater:0x52674d,steel:0xaebbc1,darkSteel:0x394952,grating:0x758990,safety:0xd2b858,lime:0x89a849,blue:0x3e6e9d,airPipe:0x4e7fa5,processPipe:0x568773,sludgePipe:0xb7905e};
    Object.entries(materials).forEach(([name,m])=>{
      if(colors[name])m.color.set(colors[name]);
      if(m.emissive&& !['led','bubble','flow','window','glass'].includes(name))m.emissiveIntensity=Math.min(m.emissiveIntensity,.045);
      if(/water|wastewater/i.test(name)){m.roughness=.20;m.metalness=.15;m.opacity=.90;m.envMapIntensity=.8;}
      else if(/concrete|building|slab|terrain|ground|road/.test(name)){m.roughness=.87;m.metalness=.025;m.envMapIntensity=.16;}
      else if(/steel|grating/.test(name)){m.roughness=.38;m.metalness=.72;m.envMapIntensity=.6;}
      else m.envMapIntensity=.4;
      m.needsUpdate=true;
    });
    try {
      const textures=await this.loadTextures();
      Object.entries(materials).forEach(([name,m])=>{
        if(/concrete|building|slab/.test(name)){m.map=textures['concrete-albedo'];m.roughnessMap=textures['concrete-roughness'];m.normalMap=textures['concrete-normal'];m.normalScale=new T.Vector2(.18,.18);}
        else if(name==='road'){m.map=textures['asphalt-albedo'];}
        else if(/steel|grating/.test(name))m.roughnessMap=textures['steel-roughness'];
        else if(/water|wastewater/i.test(name)){m.normalMap=textures['water-normal'];m.normalScale=new T.Vector2(.25,.25);}
        m.needsUpdate=true;
      });
      const tiled=new Set(Object.entries(materials).filter(([name])=>/concrete|building|slab|road/.test(name)).map(([,material])=>material));
      scene.traverse(node=>{
        if(!node.isMesh||!tiled.has(node.material)||node.geometry.type!=='BoxGeometry')return;
        const geometry=node.geometry.clone(),pos=geometry.attributes.position,normal=geometry.attributes.normal,uv=geometry.attributes.uv;
        for(let i=0;i<pos.count;i++){
          const nx=Math.abs(normal.getX(i)),ny=Math.abs(normal.getY(i));
          if(ny>.9)uv.setXY(i,pos.getX(i),pos.getZ(i));
          else if(nx>.9)uv.setXY(i,pos.getZ(i),pos.getY(i));
          else uv.setXY(i,pos.getX(i),pos.getY(i));
        }
        uv.needsUpdate=true;node.geometry=geometry;
      });
      scene.userData.flowpilotPbr=true;
      await this.applyBevels(scene);
      scene.userData.blenderBevels=true;
    } catch(error){console.warn('PBR texture fallback:',error);}
  },
  setQuality(value){
    localStorage.setItem('flowpilot-quality',value);
    Object.values(this.scenes).forEach(({renderer,scene})=>{
      const high=value==='high';renderer.setPixelRatio(high?Math.min(devicePixelRatio||1,1.5):1);
      scene.traverse(n=>{if(n.isDirectionalLight){n.shadow.mapSize.set(high?2048:1024,high?2048:1024);if(n.shadow.map){n.shadow.map.dispose();n.shadow.map=null;}}});
    });
    window.dispatchEvent(new Event('resize'));
  }
};
document.addEventListener('DOMContentLoaded',()=>{
  const label=document.createElement('label');label.className='quality-control';label.innerHTML='画质 <select id="visualQuality"><option value="high">精细</option><option value="balanced">流畅</option></select>';
  const select=label.querySelector('select');select.value=localStorage.getItem('flowpilot-quality')|| (innerWidth<=760?'balanced':'high');
  select.addEventListener('change',()=>FlowPilotVisuals.setQuality(select.value));
  document.querySelector('.top-actions').prepend(label);
  const details=document.createElement('button');details.id='inspectDetails';details.className='secondary-button';details.innerHTML='<i data-lucide="scan-eye"></i><span>设备特写</span>';details.title='查看 Blender 精细设备（示意资产）';
  details.addEventListener('click',()=>{
    const key=location.hash.slice(1)||'overview';const three=key==='overview'?state.three:key==='oxidation'?state.oxidationThree:key==='network'?state.networkThree:null;
    if(!three)return;const active=details.classList.toggle('active');three.setView(active?'detail':key==='network'?'system':'isometric');
    details.querySelector('span').textContent=active?'返回总览':'设备特写';
  });
  const updateDetails=()=>{const key=location.hash.slice(1)||'overview';details.hidden=!['overview','oxidation','network'].includes(key);details.classList.remove('active');details.querySelector('span').textContent='设备特写';};
  updateDetails();window.addEventListener('hashchange',updateDetails);document.querySelector('.top-actions').prepend(details);
});
