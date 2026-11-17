window.FlowPilotModels = {
  scenes: {},
  async attach(key, scene, camera) {
    this.scenes[key] = {scene, camera};
    try {
      const manifest = await (await fetch('models/blender/manifest.json')).json();
      const entry = manifest.scenes[key];
      if (!entry?.enabled) return;
      if (!/^[\w/ .-]+\.glb$/i.test(entry.file) || entry.file.includes('..')) throw new Error('Only local GLB paths are supported');
      const {GLTFLoader} = await import('./assets/vendor/GLTFLoader.js');
      const gltf = await new GLTFLoader().loadAsync(entry.file);
      gltf.scene.position.fromArray(entry.position || [0,0,0]);
      gltf.scene.rotation.set(...(entry.rotation || [0,0,0]));
      gltf.scene.scale.setScalar(entry.scale || 1);
      gltf.scene.userData.flowpilotImported = true;
      gltf.scene.traverse(node => {
        if (node.isMesh) {
          node.castShadow = true; node.receiveShadow = true;
          const materials = Array.isArray(node.material) ? node.material : [node.material];
          materials.forEach(material => { if (material) material.envMapIntensity = .5; });
        }
      });
      // Originals are hidden only after a replacement has successfully loaded.
      scene.traverse(node => {if ((entry.hideUnits || []).includes(node.userData.unit)) node.visible = false;});
      scene.add(gltf.scene);
      void window.FlowPilotRealism?.applyImported(gltf.scene).catch(error=>console.warn('Detail material fallback:',error.message));
      if (gltf.animations.length) {
        const {AnimationMixer, Clock} = await import('./assets/vendor/three.module.js');
        const mixer = new AnimationMixer(gltf.scene), clock = new Clock();
        gltf.animations.forEach(clip => mixer.clipAction(clip).play());
        const animate = () => {mixer.update(Math.min(clock.getDelta(), .05)); requestAnimationFrame(animate);};
        animate();
      }
      document.getElementById('modelStatus').textContent = 'Blender GLB 细节模型已载入';
    } catch (error) {
      console.warn('Blender optional overlay:', error);
      document.getElementById('modelStatus').textContent = 'GLB 加载失败，原始模型仍保留';
    }
  },
  async exportScene(key) {
    const entry = this.scenes[key];
    if (!entry) throw new Error('请先打开一个三维孪生页面');
    const {GLTFExporter} = await import('./assets/vendor/GLTFExporter.js');
    const clone = entry.scene.clone(true);
    const remove = [];
    clone.traverse(node => {
      const metadata={unit:node.userData.unit || '', flowpilotImported:!!node.userData.flowpilotImported};
      ['unit_id','sensor_id','actuator_id','animation_role','source','description'].forEach(key=>{
        if(typeof node.userData[key]==='string')metadata[key]=node.userData[key];
      });
      node.userData = metadata;
      // Canvas labels and scene helpers stay in the original browser scene.
      if (node.isSprite || node.isLight || node.isCamera || node.isLine) remove.push(node);
    });
    remove.forEach(node => node.parent?.remove(node));
    const bytes = await new GLTFExporter().parseAsync(clone, {binary:true, onlyVisible:true});
    const url = URL.createObjectURL(new Blob([bytes], {type:'model/gltf-binary'}));
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = `flowpilot-${key}.glb`; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return bytes.byteLength;
  }
};
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('exportGlb').addEventListener('click', async (event) => {
    const button = event.currentTarget; button.disabled = true;
    const status = document.getElementById('modelStatus'); status.textContent = '正在导出完整模型，请稍候';
    try {
      const key = location.hash.slice(1) || 'overview';
      const size = await window.FlowPilotModels.exportScene(key);
      status.textContent = `GLB 导出完成 · ${(size/1048576).toFixed(1)} MB`;
    } catch (error) { status.textContent = error.message; }
    finally { button.disabled = false; }
  });
});
