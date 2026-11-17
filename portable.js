/* Engine selection is independent of the procedural scene builders. */
window.FlowPilotEngine = {
  async run(body, process = 'a2o') {
    const engine = document.getElementById('engineSelect').value;
    const route = location.hash.slice(1) || 'overview';
    const provenance = document.querySelector(`[data-provenance="${route}"]`);
    if (provenance) provenance.textContent = '机理计算中 · 输入来自页面边界 · 非现场数据';
    const send = async (selected) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), selected === 'sumo' ? 390000 : 30000);
      try {
        const response = await fetch('/api/run', {method:'POST', headers:{'Content-Type':'application/json'},
          body:JSON.stringify({...body, engine:selected, process}), signal:controller.signal});
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Engine failed');
        return result;
      } finally { clearTimeout(timer); }
    };
    try {
      const result = await send(engine);
      document.getElementById('engineStatus').textContent = engine === 'asm' ? 'ASM 动力学结果 · 未经校准' : 'SUMO 计算完成 · 校准状态待确认';
      if (provenance) provenance.textContent = `${result.engine.toUpperCase()} · ${result.engine === 'asm' ? '未校准' : '校准状态待确认'} · 模拟 24 h · 页面输入 · 辅助遥测为演示`;
      return result;
    } catch (error) {
      if (engine !== 'sumo') { if (provenance) provenance.textContent = '引擎失败 · 当前仅演示预览 · 非现场数据'; throw error; }
      document.getElementById('engineStatus').textContent = 'SUMO 不可用，明确回退到 ASM';
      const result = await send('asm');
      result.fallback_reason = String(error.message);
      if (provenance) provenance.textContent = 'SUMO 不可用 → ASM · 未校准 · 模拟 24 h · 页面输入';
      return result;
    }
  }
};
document.addEventListener('DOMContentLoaded', async () => {
  const control = document.getElementById('engineSelect');
  const charts = {overview:'liveChart', oxidation:'oxidationLiveChart', network:'networkCodChart', scenarios:'compareChart', advisor:'agentChart', history:'replayChart'};
  Object.entries(charts).forEach(([route, id]) => {
    const note = document.createElement('p'); note.dataset.provenance = route; note.className = 'result-provenance';
    note.textContent = route === 'network' ? '假设诊断演示 · 未校准 · 输入为示例/手工边界 · 经验时序' : route === 'history' ? '演示记录 · 非现场归档 · 00:00–23:00' : '演示预览 · 未校准 · 24 h · 点击运行后使用所选引擎';
    const chart = document.getElementById(id); chart.parentElement.insertBefore(note, chart);
  });
  control.addEventListener('change', () => {
    document.getElementById('engineStatus').textContent = control.value === 'asm' ? '离线机理推演 · 未经实厂校准' : 'SUMO 需本机运行时及有效许可';
  });
  try {
    const status = await (await fetch('/api/status')).json();
    if (status.default_engine === 'sumo' && status.sumo.available) control.value = 'sumo';
    control.dispatchEvent(new Event('change'));
  } catch (_) {
    document.getElementById('engineStatus').textContent = '请通过 start_flowpilot 启动本地服务';
  }
});
