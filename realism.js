/* Local scanned PBR, HDR lighting and contact occlusion for the live scenes. */
window.FlowPilotRealism={
  scenes:{},resources:null,time:{value:0},
  async load(){
    if(!this.resources)this.resources=(async()=>{
      const T=window.THREE,loader=new T.TextureLoader(),textures={};
      await Promise.all(['concrete','asphalt'].flatMap(type=>['color','normal','rough','ao'].map(async channel=>{
        const texture=await loader.loadAsync(`assets/realism/${type}-${channel}.jpg`);
        texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.anisotropy=8;
        texture.repeat.set(1/3,1/3);if(channel==='color')texture.colorSpace=T.SRGBColorSpace;
        textures[`${type}-${channel}`]=texture;
      })));
      const {RGBELoader}=await import('./assets/vendor/addons/loaders/RGBELoader.js');
      const hdr=await new RGBELoader().loadAsync('assets/realism/industrial-sunset.hdr');hdr.mapping=T.EquirectangularReflectionMapping;
      return {textures,hdr};
    })();return this.resources;
  },
  water(material){
    const time=this.time;
    material.metalness=0;material.roughness=.15;material.envMapIntensity=1.1;
    material.emissive?.set(0);material.opacity=.97;material.transparent=true;
    if(material.isMeshPhysicalMaterial){material.ior=1.333;material.clearcoat=.55;material.clearcoatRoughness=.16;material.transmission=0;}
    material.onBeforeCompile=shader=>{
      shader.uniforms.fpTime=time;
      shader.vertexShader='varying vec3 vWaterPosition;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvWaterPosition=(modelMatrix*vec4(transformed,1.0)).xyz;');
      shader.fragmentShader='uniform float fpTime;varying vec3 vWaterPosition;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
        vec2 wp=vWaterPosition.xz;
        float wa=sin(dot(wp,vec2(2.1,.65))+fpTime*.73);
        float wb=sin(dot(wp,vec2(-1.3,3.4))-fpTime*1.12);
        float wc=sin(dot(wp,vec2(7.2,4.5))+fpTime*1.53);
        vec3 wn=normalize(vec3(wa*.045+wc*.018,1.,wb*.04+wc*.014));
        normal=normalize(mat3(viewMatrix)*wn);`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        float undulation=sin(vWaterPosition.x*.87+fpTime*.3)*sin(vWaterPosition.z*1.1-fpTime*.26);
        diffuseColor.rgb*=.96+undulation*.045;`);
    };
    material.customProgramCacheKey=()=> 'fp-physical-water-v2';material.needsUpdate=true;
  },
  async install(key,scene,renderer,materials){
    const T=window.THREE,entry=this.scenes[key]={scene,renderer,materials};
    try{
      const {textures,hdr}=await this.load();
      const pmrem=new T.PMREMGenerator(renderer);pmrem.compileEquirectangularShader();
      const env=pmrem.fromEquirectangular(hdr);pmrem.dispose();entry.environment=env;
      scene.environment=env.texture;scene.background=new T.Color(0xb3c2ca);scene.fog=new T.Fog(0xb3c2ca,key==='network'?90:65,180);
      renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.85;
      const colors={concrete:0xd3d0c4,concreteDark:0x858981,concreteLight:0xe1dfd3,building:0xc7c9c2,slab:0xb2b3aa,ground:0x797f78,terrain:0x75816e,terrainEdge:0x696e64,road:0xffffff,roof:0x596970,roofWarm:0x846c60,steel:0xa8b4b7,darkSteel:0x3a4549,grating:0x8a9699,safety:0xd9b836,lime:0x849f5b,orange:0xb28248,tree:0x485b2d,vegetation:0x485b2d,grass:0x69764d,water:0x426353,waterDark:0x40503e,waterAnoxic:0x40503e,waterClean:0x587f78,wastewater:0x49523b};
      Object.entries(materials).forEach(([role,material])=>{
        if(colors[role])material.color.set(colors[role]);
        if(material.emissive&&!['flow','bubble','led'].includes(role))material.emissiveIntensity=0;
        if(/concrete|building|slab/.test(role)){
          material.map=textures['concrete-color'];material.normalMap=textures['concrete-normal'];material.roughnessMap=textures['concrete-rough'];material.aoMap=textures['concrete-ao'];
          material.normalScale=new T.Vector2(.4,.4);material.aoMapIntensity=.65;material.metalness=0;material.roughness=.9;material.envMapIntensity=.5;
          this.weather(material,role==='building'?.25:role==='slab'?.40:.55);
        }else if(role==='road'){
          material.map=textures['asphalt-color'];material.normalMap=textures['asphalt-normal'];material.normalScale=new T.Vector2(.28,.28);material.roughnessMap=textures['asphalt-rough'];material.aoMap=textures['asphalt-ao'];material.roughness=.9;material.metalness=0;
        }else if(/water|wastewater/i.test(role))this.water(material);
        else if(/steel|grating/.test(role)){material.metalness=.85;material.roughness=.42;material.envMapIntensity=.8;}
        else if(/Pipe|process|blue|sludge|roof|orange|safety/.test(role)){material.metalness=.12;material.roughness=.48;material.envMapIntensity=.6;}
        if(['glass','window'].includes(role)){material.color.set(0x354752);material.roughness=.16;material.envMapIntensity=1;}
        material.needsUpdate=true;
      });
      scene.traverse(node=>{
        if(node.isDirectionalLight){node.intensity=2.6;node.position.set(-24,32,17);node.shadow.normalBias=.03;node.shadow.bias=-.0001;}
        if(node.isHemisphereLight){node.color.set(0xc5d7e2);node.groundColor.set(0x756850);node.intensity=.95;}
      });
      // Extend the physical ground beyond the site slab so the plant sits in a landscape.
      const groundMat=new T.MeshStandardMaterial({color:0x8c9682,roughness:1,metalness:0});
      const ground=new T.Mesh(new T.PlaneGeometry(380,380),groundMat);ground.rotation.x=-Math.PI/2;ground.position.y=key==='network'?-.50:-.40;ground.receiveShadow=true;ground.userData.visualGround=true;scene.add(ground);
      const rawRender=renderer.render.bind(renderer);entry.rawRender=rawRender;
      renderer.render=(renderScene,camera)=>{
        if(entry.inPass||renderScene!==scene||renderer.getRenderTarget())return rawRender(renderScene,camera);
        this.time.value=performance.now()*.001;
        entry.vegetationCards?.forEach(card=>{
          const angle=Math.atan2(camera.position.x-card.position.x,camera.position.z-card.position.z);
          card.rotation.y=angle;
          const index=((Math.round(angle/(Math.PI/2))%4)+4)%4;
          if(card.material.map!==entry.treeImages[index]){card.material.map=entry.treeImages[index];card.material.needsUpdate=true;}
        });
        const quality=localStorage.getItem('flowpilot-quality')||document.getElementById('visualQuality')?.value||(innerWidth<=760?'balanced':'high');
        if(entry.composer&&quality!=='balanced'){
          entry.renderPass.camera=camera;entry.ssao.camera=camera;
          const size=renderer.getSize(new T.Vector2());
          if(size.x!==entry.width||size.y!==entry.height||renderer.getPixelRatio()!==entry.ratio){
            entry.composer.setPixelRatio(renderer.getPixelRatio());entry.composer.setSize(size.x,size.y);entry.width=size.x;entry.height=size.y;entry.ratio=renderer.getPixelRatio();
          }
          entry.inPass=true;
          try{entry.composer.render();}finally{entry.inPass=false;}
        }else rawRender(renderScene,camera);
      };
      await this.postprocess(entry);
      try{await this.vegetation(entry);}catch(error){console.warn('Vegetation fallback:',error.message);}
      this.annotationLayer(entry);
      scene.userData.flowpilotRealism=true;
    }catch(error){console.warn('Realistic rendering fallback:',error);scene.userData.realismError=error.message;}
  },
  annotationLayer(entry){
    const active=localStorage.getItem('flowpilot-annotations')==='on';
    entry.scene.traverse(n=>{
      if(n.isSprite||(n.isMesh&&n.material?.map?.isCanvasTexture)){
        if(n.userData.originalAnnotationVisible===undefined)n.userData.originalAnnotationVisible=n.visible;
        n.visible=active&&n.userData.originalAnnotationVisible;
        n.userData.visualAnnotation=true;
      }
    });
  },
  weather(material,amount){
    material.onBeforeCompile=shader=>{
      shader.uniforms.fpWeather={value:amount};
      shader.fragmentShader='uniform float fpWeather;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\ndiffuseColor.rgb=mix(diffuse*.78,diffuseColor.rgb,fpWeather);');
    };
    material.customProgramCacheKey=()=> 'fp-scanned-weather-v2';
  },
  async applyImported(group){
    const {textures}=await this.load(),T=window.THREE,seen=new Set();
    group.traverse(node=>{if(!node.isMesh)return;
      (Array.isArray(node.material)?node.material:[node.material]).forEach(material=>{
        if(seen.has(material))return;seen.add(material);
        if(material.name.startsWith('FP_concrete')){
          material.color.set(0xd3d0c4);material.map=textures['concrete-color'];material.normalMap=textures['concrete-normal'];material.normalScale=new T.Vector2(.25,.25);material.roughnessMap=textures['concrete-rough'];material.aoMap=textures['concrete-ao'];this.weather(material,.55);
        }
        if(material.name.startsWith('FP_cutaway_water'))this.water(material);
        material.envMapIntensity=.8;material.needsUpdate=true;
      });
    });
  },
  async vegetation(entry){
    const T=window.THREE,loader=new T.TextureLoader();
    const images=await Promise.all([0,1,2,3].map(i=>loader.loadAsync(`assets/realism/tree-impostor-${i}.png`)));
    images.forEach(texture=>{texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=8;});
    const crowns=[];entry.scene.traverse(n=>{if(n.isMesh&&['FP_tree','FP_vegetation'].includes(n.material?.name))crowns.push(n);});
    const grouped=new Map();
    crowns.forEach(n=>{n.updateWorldMatrix(true,false);const p=n.getWorldPosition(new T.Vector3());const key=`${p.x.toFixed(1)}:${p.z.toFixed(1)}`;if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(n);});
    const collection=new T.Group();collection.name='PHOTOGRAPHIC_SITE_VEGETATION';collection.userData.visualVegetation=true;
    const geometry=new T.PlaneGeometry(1,1);entry.vegetationCards=[];
    grouped.forEach(nodes=>{
      const p=nodes[0].getWorldPosition(new T.Vector3());
      if(collection.children.some(n=>Math.hypot(n.position.x-p.x,n.position.z-p.z)<.5))return;
      const height=2.35+Math.abs(Math.sin(p.x*2.3+p.z))*.45;
      const material=new T.MeshBasicMaterial({map:images[0],alphaTest:.45,side:T.DoubleSide,color:0xe9efdf});
      const card=new T.Mesh(geometry,material);card.scale.set(height,height,1);card.position.set(p.x,height*.5+.1,p.z);card.castShadow=true;card.userData.vegetationImpostor=true;
      collection.add(card);entry.vegetationCards.push(card);
    });
    entry.treeImages=images;entry.scene.add(collection);crowns.forEach(n=>{n.userData.originalCrownVisible=n.visible;n.visible=false;});
    entry.scene.userData.scannedTrees=entry.vegetationCards.length;
  },
  async postprocess(entry){
    const [{EffectComposer},{RenderPass},{SSAOPass},{OutputPass}]=await Promise.all([
      import('./assets/vendor/addons/postprocessing/EffectComposer.js'),import('./assets/vendor/addons/postprocessing/RenderPass.js'),import('./assets/vendor/addons/postprocessing/SSAOPass.js'),import('./assets/vendor/addons/postprocessing/OutputPass.js')]);
    const {renderer,scene}=entry,camera=window.FlowPilotModels.scenes[Object.keys(this.scenes).find(k=>this.scenes[k]===entry)].camera;
    const composer=new EffectComposer(renderer),renderPass=new RenderPass(scene,camera),ssao=new SSAOPass(scene,camera,512,512,16);
    ssao.kernelRadius=.65;ssao.minDistance=.00012;ssao.maxDistance=.009;
    // Glass, water and translucent data overlays must not become solid occluders.
    const override=ssao.overrideVisibility.bind(ssao);
    ssao.overrideVisibility=()=>{override();scene.traverse(n=>{if(n.isMesh&&(n.userData.vegetationImpostor||(Array.isArray(n.material)?n.material.every(m=>m.transparent):n.material.transparent))){if(!ssao._visibilityCache.has(n))ssao._visibilityCache.set(n,n.visible);n.visible=false;}});};
    composer.renderTarget1.samples=renderer.capabilities.isWebGL2?4:0;composer.renderTarget2.samples=composer.renderTarget1.samples;
    composer.addPass(renderPass);composer.addPass(ssao);composer.addPass(new OutputPass());
    Object.assign(entry,{composer,renderPass,ssao});
  }
};
document.addEventListener('DOMContentLoaded',()=>{
  ['overview','oxidation','network'].forEach(key=>{
    const button=document.createElement('button');button.className='stage-tool';button.id=`annotationLayer-${key}`;button.type='button';
    const update=()=>{const active=localStorage.getItem('flowpilot-annotations')==='on';button.textContent=active?'隐藏标注':'孪生标注';button.setAttribute('aria-pressed',String(active));button.classList.toggle('active',active);};
    update();button.addEventListener('click',()=>{
      localStorage.setItem('flowpilot-annotations',localStorage.getItem('flowpilot-annotations')==='on'?'off':'on');
      Object.values(FlowPilotRealism.scenes).forEach(entry=>FlowPilotRealism.annotationLayer(entry));
      ['overview','oxidation','network'].forEach(k=>{const n=document.getElementById(`annotationLayer-${k}`);if(n){n.textContent=localStorage.getItem('flowpilot-annotations')==='on'?'隐藏标注':'孪生标注';n.setAttribute('aria-pressed',String(localStorage.getItem('flowpilot-annotations')==='on'));}});
      update();
    });
    document.querySelector(`[data-view="${key}"] .stage-actions`)?.append(button);
  });
});
const baseEnhance=window.FlowPilotVisuals.enhance.bind(window.FlowPilotVisuals);
window.FlowPilotVisuals.enhance=async function(key,scene,renderer,materials){
  await baseEnhance(key,scene,renderer,materials);
  await window.FlowPilotRealism.install(key,scene,renderer,materials);
};
