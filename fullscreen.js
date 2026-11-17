/* Enter native browser fullscreen directly within the user's click gesture. */
window.FlowPilotFullscreen = {
  async enter() {
    if (document.fullscreenElement) return true;
    if (!document.fullscreenEnabled || !document.documentElement.requestFullscreen) {
      window.toast?.('当前浏览器不支持原生全屏；可使用 F11');
      return false;
    }
    try {
      await document.documentElement.requestFullscreen({navigationUI:'hide'});
      return true;
    } catch (error) {
      console.warn('Fullscreen request:', error.message);
      window.toast?.('全屏未获浏览器许可；请在独立 Chrome/Edge 页面打开后点击运行');
      return false;
    }
  },
  async exit() {
    if (document.fullscreenElement) await document.exitFullscreen();
  }
};

// Some page rules use ID selectors and font shorthand. Enforce the actual
// computed minimum on initial load, route changes and fullscreen transitions.
window.FlowPilotTypography={
  originals:new Map(),pending:false,
  restore(){this.originals.forEach((value,node)=>{
    if(value.font)node.style.setProperty('font-size',value.font,value.priority);
    else node.style.removeProperty('font-size');
  });this.originals.clear();},
  schedule(){
    if(this.pending)return;this.pending=true;
    requestAnimationFrame(()=>{this.pending=false;this.apply();});
  },
  apply(){
    document.querySelectorAll('.view.active *, .topbar *, .sidebar *, .mobile-nav *, .toast, .ox-presentation-hud *, .network-presentation-hud *').forEach(node=>{
      if(!node.matches('input,select,textarea')&&![...node.childNodes].some(child=>child.nodeType===3&&child.textContent.trim()))return;
      if(!node.getClientRects().length)return;
      const style=getComputedStyle(node);
      if(style.visibility==='hidden'||parseFloat(style.opacity)<.1||parseFloat(style.fontSize)>=16)return;
      node.style.setProperty('font-size','16px','important');
    });
  }
};
document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button || button.disabled) return;
  if (['globalRun','scenarioRunLocal','advisorRunLocal','networkRunLocal','oxPresentationRun','networkPresentationRun','replayRun','oxPresentationEnter','networkPresentationEnter'].includes(button.id)) {
    void window.FlowPilotFullscreen.enter();
  }
  if (['oxPresentationExit','networkPresentationExit'].includes(button.id)) void window.FlowPilotFullscreen.exit();
}, true);
document.addEventListener('fullscreenchange', () => {
  const active = !!document.fullscreenElement;
  document.body.classList.toggle('native-fullscreen', active);
  const toggle = document.getElementById('fullscreenToggle');
  if (toggle) {
    toggle.setAttribute('aria-label', active ? '退出全屏' : '进入全屏');
    toggle.title = active ? '退出全屏（Esc）' : '进入真正全屏';
    toggle.querySelector('span').textContent = active ? '退出全屏' : '全屏';
  }
  if (!active) {
    if (document.body.classList.contains('ox-presentation')) setOxidationPresentation(false);
    if (document.body.classList.contains('network-presentation')) setNetworkPresentation(false);
  }
  requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  window.FlowPilotTypography.schedule();
});
document.addEventListener('DOMContentLoaded', () => {
  const observer=new MutationObserver(()=>window.FlowPilotTypography.schedule());
  observer.observe(document.body,{childList:true,characterData:true,attributes:true,attributeFilter:['class','hidden'],subtree:true});
  window.addEventListener('resize',()=>window.FlowPilotTypography.schedule());
  const button = document.createElement('button');
  button.id = 'fullscreenToggle'; button.className = 'secondary-button fullscreen-toggle';
  button.type = 'button'; button.title = '进入真正全屏'; button.setAttribute('aria-label','进入全屏');
  button.innerHTML = '<i data-lucide="maximize"></i><span>全屏</span>';
  button.addEventListener('click', () => document.fullscreenElement ? window.FlowPilotFullscreen.exit() : window.FlowPilotFullscreen.enter());
  document.querySelector('.top-actions').prepend(button);
  const exit = document.createElement('button');
  exit.id = 'fullscreenExit'; exit.className = 'secondary-button'; exit.textContent = '退出全屏 · Esc';
  exit.addEventListener('click', () => window.FlowPilotFullscreen.exit());
  document.body.append(exit);
  window.FlowPilotTypography.schedule();
});
