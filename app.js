const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const routeMeta = {
  overview: { kicker: 'DIGITAL TWIN', title: '主控大屏', action: '运行数字孪生' },
  oxidation: { kicker: 'CARROUSEL TWIN', title: '氧化沟孪生', action: '运行氧化沟孪生' },
  network: { kicker: 'NETWORK TWIN', title: '泵站管网孪生', action: '计算最优泵组调度' },
  scenarios: { kicker: 'SCENARIO LAB', title: '情景制造', action: '运行双方案' },
  advisor: { kicker: 'AGENT STUDIO', title: '策略智能体', action: '生成策略' },
  history: { kicker: 'RUN REPLAY', title: '运行记录', action: '重放动态曲线' },
};

const unitCopy = {
  headworks: {
    name: '预处理 · 格栅 / 沉砂 / 提升',
    advice: '来水稳定，细格栅前后液位差处于正常区间',
    meta: '无堵塞风险 · 2 台提升泵运行',
    telemetry: [['液位差', '0.18 m'], ['提升泵', '2 / 3'], ['流量', '896 m³/h']],
  },
  anaerobic: {
    name: '厌氧 / 缺氧池 · 双线生物脱氮除磷',
    advice: '内回流与碳源匹配，反硝化速率保持稳定',
    meta: '搅拌器 8 / 8 · MLSS 3,420 mg/L',
    telemetry: [['ORP', '-84 mV'], ['MLSS', '3,420'], ['内回流', '182%']],
  },
  aerobic: {
    name: '好氧池 · 当前控制单元',
    advice: '低曝气运行，氨氮仍在安全区间',
    meta: '气水比稳定 · 无需人工干预',
    telemetry: [['DO', '1.84 mg/L'], ['气水比', '4.6 : 1'], ['设备', '12 / 12']],
  },
  clarifier: {
    name: '二沉池 · 固液分离与污泥回流',
    advice: '泥位和表面负荷处于安全区，刮泥机扭矩平稳',
    meta: '14:00–18:00 为今日重点观察时段',
    telemetry: [['泥位', '2.13 m'], ['表面负荷', '0.82'], ['回流比', '76%']],
  },
  utilities: {
    name: '鼓风 / 加药系统 · 公用工程',
    advice: '3 用 1 备，风机效率处于高效区，无需启动备用机',
    meta: '总管压力 68.4 kPa · PAC 计量正常',
    telemetry: [['风机', '3 / 4'], ['总管', '68.4 kPa'], ['PAC', '42 L/h']],
  },
  outlet: {
    name: '深度处理 / 出水 · 质量确认',
    advice: 'NH₄-N 1.86 mg/L，满足当前控制红线',
    meta: '预测达标率 98.7% · UV 系统正常',
    telemetry: [['NH₄-N', '1.86'], ['TN', '9.42'], ['浊度', '0.61 NTU']],
  },
};

const oxidationUnitCopy = {
  headworks: {
    name: '预处理 · 转鼓格栅 / 旋流沉砂 / 提升',
    advice: '雨后流量正在回落，两套转鼓格栅压差均处于正常区间',
    meta: '格栅 2 用 1 备 · 提升泵 2 / 4 · 无水力拥堵',
    telemetry: [['液位差', '0.14 m'], ['提升泵', '2 / 4'], ['流量', '824 m³/h']],
  },
  selector: {
    name: '厌氧选择池与配水井 · 抑制丝状菌并均匀配水',
    advice: '选择区 ORP 与回流污泥匹配，南北两沟配水偏差小于 2%',
    meta: '配水闸门 48 / 52 · RAS 76% · 搅拌器 4 / 4',
    telemetry: [['ORP', '-112 mV'], ['配水偏差', '1.7%'], ['回流比', '76%']],
  },
  ditch: {
    name: '双线 Carrousel 氧化沟 · 当前控制单元',
    advice: '南北沟环流稳定，曝气区与缺氧区边界清晰',
    meta: '北沟 38 Hz · 南沟 42 Hz · 无沉积风险',
    telemetry: [['沟末 DO', '1.72 mg/L'], ['环流速度', '0.31 m/s'], ['表曝设备', '6 / 8']],
  },
  clarifier: {
    name: '二沉池组 · 三池并联固液分离',
    advice: '三座刮吸泥机扭矩平稳，中心筒配水均匀',
    meta: '泥位 1.86 m · 表面负荷 0.78 m³/(m²·h)',
    telemetry: [['运行池', '3 / 3'], ['泥位', '1.86 m'], ['出水浊度', '0.72 NTU']],
  },
  sludge: {
    name: '回流污泥与鼓风系统 · 地下管廊集中布置',
    advice: '回流泵效率位于高效区，两台磁悬浮风机满足当前气量',
    meta: 'RAS 76% · WAS 286 m³/d · 风机 2 用 1 备',
    telemetry: [['RAS', '76%'], ['WAS', '286 m³/d'], ['风机', '2 / 3']],
  },
  outlet: {
    name: '滤布滤池 / UV / 回用水池 · 最终质量确认',
    advice: '滤池压差与 UV 剂量稳定，出水可直接进入厂内回用管网',
    meta: 'TN 8.6 mg/L · NH₄-N 1.21 mg/L · UV 36 mJ/cm²',
    telemetry: [['TN', '8.6 mg/L'], ['NH₄-N', '1.21'], ['浊度', '0.38 NTU']],
  },
};

const fallbackComparison = {
  baseline: [3, 3.28, 3.62, 3.91, 4.42, 4.86, 4.64, 4.3, 3.82, 3.46, 3.22, 3.11, 3.48, 4.04, 4.7, 5.12, 4.86, 4.35, 3.76, 3.19, 2.94, 2.78, 2.67, 2.71],
  optimized: [3, 2.77, 2.56, 2.32, 2.16, 2.08, 2.01, 1.95, 1.91, 1.89, 1.86, 1.82, 1.91, 2.12, 2.34, 2.47, 2.38, 2.19, 2.04, 1.96, 1.89, 1.84, 1.82, 1.86],
};

const liveData = {
  flow: [802, 816, 829, 847, 858, 875, 896, 914, 928, 946, 936, 919, 905, 887, 871, 860, 848, 835, 824, 813, 806, 811, 823, 842],
  nh4: [...fallbackComparison.optimized],
};

const oxidationData = {
  flow: [768, 754, 742, 736, 748, 772, 806, 842, 884, 926, 952, 938, 912, 886, 858, 836, 824, 812, 798, 786, 774, 768, 776, 792],
  do: [1.86, 1.94, 2.02, 2.08, 2.04, 1.96, 1.84, 1.72, 1.61, 1.54, 1.49, 1.52, 1.58, 1.64, 1.69, 1.72, 1.76, 1.82, 1.88, 1.94, 2.01, 2.06, 2.03, 1.96],
  velocity: [0.29, 0.29, 0.28, 0.28, 0.29, 0.3, 0.31, 0.32, 0.33, 0.34, 0.34, 0.34, 0.33, 0.32, 0.31, 0.31, 0.31, 0.3, 0.3, 0.29, 0.29, 0.29, 0.3, 0.3],
};

const historyRuns = [
  {
    title: '方案 B-17 · 夏季高负荷', state: '已采用', flow: '1,050 m³/h', limit: '5.0 mg/L', duration: '3.8 s',
    advice: '分两步降低曝气并保持侧流，预测全时段达标，已由值班长确认采用。',
    baseline: [...fallbackComparison.baseline], optimized: [...fallbackComparison.optimized],
  },
  {
    title: '方案 A · 午后峰值', state: '已完成', flow: '1,180 m³/h', limit: '5.0 mg/L', duration: '4.1 s',
    advice: '峰值负荷持续时间较短，选择稳定基线，未执行深度节能动作。',
    baseline: fallbackComparison.baseline.map((v) => v * 1.06), optimized: fallbackComparison.optimized.map((v) => v * 1.18),
  },
  {
    title: '方案 B-09 · 正常负荷', state: '已采用', flow: '840 m³/h', limit: '5.0 mg/L', duration: '3.5 s',
    advice: '采用负荷跟随策略，在夜间进一步降低风量，全天出水保持稳定。',
    baseline: fallbackComparison.baseline.map((v) => v * 0.87), optimized: fallbackComparison.optimized.map((v) => v * 0.78),
  },
  {
    title: '保守模式 · 降雨冲击', state: '已完成', flow: '1,360 m³/h', limit: '5.0 mg/L', duration: '4.4 s',
    advice: '优先保障水力安全，暂停节能动作并提高回流，待峰值回落后重新计算。',
    baseline: fallbackComparison.baseline.map((v) => Math.min(6, v * 1.16)), optimized: fallbackComparison.optimized.map((v) => v * 1.34),
  },
];

const state = {
  route: 'overview',
  running: false,
  liveStep: 6,
  speed: 1,
  three: null,
  oxidationThree: null,
  networkThree: null,
  oxidationStep: 8,
  comparison: { baseline: [...fallbackComparison.baseline], optimized: [...fallbackComparison.optimized] },
  comparisonReveal: 24,
  agent: {
    baseline: [...fallbackComparison.baseline],
    optimized: [...fallbackComparison.optimized],
    savings: Array.from({ length: 24 }, (_, i) => Math.round((i / 23) * 1248)),
  },
  agentReveal: 24,
  objective: 'balance',
  historyIndex: 0,
  replayReveal: 24,
  replayToken: 0,
  lastMetrics: null,
};

function iconify() {
  if (window.lucide) window.lucide.createIcons({ attrs: { 'stroke-width': 1.8 } });
}

function format(value, decimals = 0) {
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number(value));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toast(message) {
  const element = $('#toast');
  element.querySelector('span').textContent = message;
  element.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => element.classList.remove('show'), 3000);
}

function setRunButton(loading) {
  const button = $('#globalRun');
  const loadingLabel = state.route === 'network' ? '管网演示计算中' : '机理推演中';
  button.disabled = loading;
  button.setAttribute('aria-label', loading ? loadingLabel : routeMeta[state.route].action);
  if (loading) {
    button.innerHTML = `<i data-lucide="loader-circle" class="spin"></i><span>${loadingLabel}</span>`;
  } else {
    button.innerHTML = `<i data-lucide="play"></i><span id="globalRunLabel">${routeMeta[state.route].action}</span>`;
  }
  $$('.local-run-button').forEach((localButton) => {
    localButton.disabled = loading;
    const label = localButton.dataset.idleLabel;
    const icon = localButton.id === 'advisorRunLocal' ? 'sparkles' : 'play';
    localButton.innerHTML = loading
      ? '<i data-lucide="loader-circle" class="spin"></i><span>动态图运行中</span>'
      : `<i data-lucide="${icon}"></i><span>${label}</span>`;
  });
  const presentationRun = $('#oxPresentationRun');
  if (presentationRun) {
    presentationRun.disabled = loading;
    presentationRun.innerHTML = loading && state.route === 'oxidation'
      ? '<i data-lucide="loader-circle" class="spin"></i><span>推演中</span>'
      : '<i data-lucide="play"></i><span>推演 24 h</span>';
  }
  iconify();
}

function setRoute(route, updateHash = true) {
  if (!routeMeta[route]) route = 'overview';
  if (route !== 'oxidation' && document.body.classList.contains('ox-presentation')) setOxidationPresentation(false);
  if (route !== 'oxidation' && state.oxidationThree) state.oxidationThree.stopTour();
  if (route !== 'network' && document.body.classList.contains('network-presentation')) setNetworkPresentation(false);
  if (route !== 'network' && state.networkThree) state.networkThree.stopTour();
  state.route = route;
  $$('.view').forEach((view) => view.classList.toggle('active', view.dataset.view === route));
  $$('[data-route]').forEach((button) => button.classList.toggle('active', button.dataset.route === route));
  $('#pageKicker').textContent = routeMeta[route].kicker;
  $('#pageTitle').textContent = routeMeta[route].title;
  $('#globalRunLabel').textContent = routeMeta[route].action;
  $('#globalRun').setAttribute('aria-label', routeMeta[route].action);
  if (updateHash) history.replaceState(null, '', `#${route}`);
  window.scrollTo(0, 0);
  window.FlowPilotTypography?.schedule();
  requestAnimationFrame(() => {
    ensureTwinScene(route);
    if (route === 'overview' && state.three) state.three.resize();
    if (route === 'oxidation' && state.oxidationThree) {
      state.oxidationThree.resize();
      drawOxidationChart();
    }
    if (route === 'network') {
      if (state.networkThree) state.networkThree.resize();
      drawNetworkChart();
    }
    if (route === 'scenarios') drawComparisonChart();
    if (route === 'advisor') drawAgentChart();
    if (route === 'history') animateHistoryReplay();
  });
}

function setupRouting() {
  $$('[data-route]').forEach((button) => button.addEventListener('click', () => setRoute(button.dataset.route)));
  $$('[data-route-link]').forEach((button) => button.addEventListener('click', () => setRoute(button.dataset.routeLink)));
  setRoute(location.hash.replace('#', '') || 'overview', false);
  window.addEventListener('hashchange', () => setRoute(location.hash.replace('#', ''), false));
}

function prepareCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * ratio);
  canvas.height = Math.round(rect.height * ratio);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);
  return { ctx, width: rect.width, height: rect.height };
}

function drawGrid(ctx, p, width, height, rows = 5) {
  const innerHeight = height - p.t - p.b;
  ctx.strokeStyle = 'rgba(126,190,214,.13)';
  ctx.lineWidth = 1;
  for (let i = 0; i < rows; i += 1) {
    const y = p.t + (i / (rows - 1)) * innerHeight;
    ctx.beginPath();
    ctx.moveTo(p.l, y);
    ctx.lineTo(width - p.r, y);
    ctx.stroke();
  }
}

function drawLine(ctx, data, x, y, color, fill, reveal = data.length) {
  const visible = data.slice(0, Math.max(1, reveal));
  ctx.beginPath();
  visible.forEach((value, index) => (index ? ctx.lineTo(x(index), y(value)) : ctx.moveTo(x(index), y(value))));
  if (fill && visible.length > 1) {
    const last = visible.length - 1;
    ctx.lineTo(x(last), y(0));
    ctx.lineTo(x(0), y(0));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.beginPath();
    visible.forEach((value, index) => (index ? ctx.lineTo(x(index), y(value)) : ctx.moveTo(x(index), y(value))));
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}

function drawLiveChart() {
  const canvas = $('#liveChart');
  if (!canvas) return;
  const prepared = prepareCanvas(canvas);
  if (!prepared) return;
  const { ctx, width: w, height: h } = prepared;
  const p = { l: 48, r: 20, t: 14, b: 28 };
  const iw = w - p.l - p.r;
  const ih = h - p.t - p.b;
  const x = (i) => p.l + (i / 23) * iw;
  const flowY = (v) => p.t + (1 - (v - 760) / 260) * ih;
  const nhY = (v) => p.t + (1 - (v - 1.2) / 4.2) * ih;
  drawGrid(ctx, p, w, h, 4);
  ctx.font = '16px "DM Mono", monospace';
  ctx.fillStyle = '#638999';
  ctx.textAlign = 'center';
  ['00', '06', '12', '18', '24'].forEach((label, i) => ctx.fillText(label, p.l + (i / 4) * iw, h - 5));
  drawLine(ctx, liveData.flow, x, flowY, '#54d8eb', 'rgba(84,216,235,.08)');
  drawLine(ctx, liveData.nh4, x, nhY, '#b7df3f');
  const mark = x(state.liveStep);
  ctx.setLineDash([3, 4]);
  ctx.strokeStyle = 'rgba(230,248,255,.52)';
  ctx.beginPath();
  ctx.moveTo(mark, p.t);
  ctx.lineTo(mark, p.t + ih);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#d9fbff';
  ctx.beginPath();
  ctx.arc(mark, flowY(liveData.flow[state.liveStep]), 3.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#cbed63';
  ctx.beginPath();
  ctx.arc(mark, nhY(liveData.nh4[state.liveStep]), 3.3, 0, Math.PI * 2);
  ctx.fill();
}

function drawOxidationChart() {
  const canvas = $('#oxidationLiveChart');
  if (!canvas || !canvas.closest('.view.active')) return;
  const prepared = prepareCanvas(canvas);
  if (!prepared) return;
  const { ctx, width: w, height: h } = prepared;
  const p = { l: 48, r: 20, t: 16, b: 28 };
  const iw = w - p.l - p.r;
  const ih = h - p.t - p.b;
  const x = (i) => p.l + (i / 23) * iw;
  const flowY = (v) => p.t + (1 - (v - 700) / 300) * ih;
  const doY = (v) => p.t + (1 - (v - 1.2) / 1.1) * ih;
  drawGrid(ctx, p, w, h, 4);
  ctx.font = '16px "DM Mono", monospace';
  ctx.fillStyle = '#638999';
  ctx.textAlign = 'center';
  ['00', '06', '12', '18', '24'].forEach((label, i) => ctx.fillText(label, p.l + (i / 4) * iw, h - 5));
  drawLine(ctx, oxidationData.flow, x, flowY, '#55d9eb', 'rgba(84,216,235,.07)');
  drawLine(ctx, oxidationData.do, x, doY, '#b7df3f');
  const index = clamp(state.oxidationStep, 0, 23);
  const mark = x(index);
  ctx.setLineDash([3, 4]);
  ctx.strokeStyle = 'rgba(230,248,255,.5)';
  ctx.beginPath();
  ctx.moveTo(mark, p.t);
  ctx.lineTo(mark, p.t + ih);
  ctx.stroke();
  ctx.setLineDash([]);
  [['#55d9eb', flowY(oxidationData.flow[index])], ['#b7df3f', doY(oxidationData.do[index])]].forEach(([color, y]) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(mark, y, 3.4, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawComparisonChart() {
  const canvas = $('#compareChart');
  if (!canvas || !canvas.closest('.view.active')) return;
  const prepared = prepareCanvas(canvas);
  if (!prepared) return;
  const { ctx, width: w, height: h } = prepared;
  const p = { l: 48, r: 20, t: 16, b: 28 };
  const iw = w - p.l - p.r;
  const ih = h - p.t - p.b;
  const all = [...state.comparison.baseline, ...state.comparison.optimized, Number($('#effluentLimit').value)];
  const yMax = Math.max(6, Math.ceil(Math.max(...all) + 0.4));
  const x = (i) => p.l + (i / 23) * iw;
  const y = (v) => p.t + (1 - v / yMax) * ih;
  drawGrid(ctx, p, w, h, yMax + 1);
  ctx.font = '16px "DM Mono", monospace';
  ctx.fillStyle = '#638999';
  for (let value = 0; value <= yMax; value += 1) ctx.fillText(String(value), 18, y(value) + 3);
  [0, 4, 8, 12, 16, 20, 23].forEach((i) => ctx.fillText(`${String(i).padStart(2, '0')}:00`, x(i) - 12, h - 7));
  const limit = Number($('#effluentLimit').value);
  ctx.setLineDash([5, 4]);
  ctx.strokeStyle = '#f1b85b';
  ctx.beginPath();
  ctx.moveTo(p.l, y(limit));
  ctx.lineTo(w - p.r, y(limit));
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#f1b85b';
  ctx.fillText(`REDLINE ${limit.toFixed(1)}`, w - p.r - 77, y(limit) - 6);
  drawLine(ctx, state.comparison.baseline, x, y, '#7899a8', null, state.comparisonReveal);
  drawLine(ctx, state.comparison.optimized, x, y, '#b7df3f', 'rgba(183,223,63,.07)', state.comparisonReveal);
  const index = clamp(state.comparisonReveal - 1, 0, 23);
  const mark = x(index);
  ctx.strokeStyle = 'rgba(232,250,255,.42)';
  ctx.setLineDash([3, 4]);
  ctx.beginPath();
  ctx.moveTo(mark, p.t);
  ctx.lineTo(mark, p.t + ih);
  ctx.stroke();
  ctx.setLineDash([]);
  [['#7899a8', state.comparison.baseline[index]], ['#b7df3f', state.comparison.optimized[index]]].forEach(([color, value]) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(mark, y(value), 3.4, 0, Math.PI * 2);
    ctx.fill();
  });
  $('#compareTime').textContent = `${String(index).padStart(2, '0')}:00`;
  $('#compareAValue').textContent = state.comparison.baseline[index].toFixed(2);
  $('#compareBValue').textContent = state.comparison.optimized[index].toFixed(2);
}

function drawAgentChart() {
  const canvas = $('#agentChart');
  if (!canvas || !canvas.closest('.view.active')) return;
  const prepared = prepareCanvas(canvas);
  if (!prepared) return;
  const { ctx, width: w, height: h } = prepared;
  const p = { l: 48, r: 48, t: 18, b: 28 };
  const iw = w - p.l - p.r;
  const ih = h - p.t - p.b;
  const x = (i) => p.l + (i / 23) * iw;
  const nhMax = Math.max(6, Math.ceil(Math.max(...state.agent.baseline, ...state.agent.optimized)));
  const nhY = (v) => p.t + (1 - v / nhMax) * ih;
  const maxSaving = Math.max(1, state.agent.savings[23]);
  const savingY = (v) => p.t + (1 - v / maxSaving) * ih;
  drawGrid(ctx, p, w, h, 5);
  ctx.font = '16px "DM Mono", monospace';
  ctx.fillStyle = '#638999';
  [0, 6, 12, 18, 23].forEach((i) => ctx.fillText(`${String(i).padStart(2, '0')}`, x(i) - 5, h - 6));
  ctx.fillText('NH₄-N', 5, 14);
  ctx.textAlign = 'right';
  ctx.fillText('kWh', w - 5, 14);
  ctx.textAlign = 'left';
  drawLine(ctx, state.agent.baseline, x, nhY, '#7899a8', null, state.agentReveal);
  drawLine(ctx, state.agent.optimized, x, nhY, '#b7df3f', 'rgba(183,223,63,.065)', state.agentReveal);
  drawLine(ctx, state.agent.savings, x, savingY, '#55d9eb', null, state.agentReveal);
  const index = clamp(state.agentReveal - 1, 0, 23);
  const mark = x(index);
  ctx.setLineDash([3, 4]);
  ctx.strokeStyle = 'rgba(230,248,255,.38)';
  ctx.beginPath();
  ctx.moveTo(mark, p.t);
  ctx.lineTo(mark, p.t + ih);
  ctx.stroke();
  ctx.setLineDash([]);
  $('#searchGeneration').textContent = `2 方案 · ${String(index).padStart(2, '0')}:00`;
}

function drawReplayChart() {
  const canvas = $('#replayChart');
  if (!canvas || !canvas.closest('.view.active')) return;
  const run = historyRuns[state.historyIndex];
  const prepared = prepareCanvas(canvas);
  if (!prepared) return;
  const { ctx, width: w, height: h } = prepared;
  const p = { l: 48, r: 20, t: 10, b: 28 };
  const iw = w - p.l - p.r;
  const ih = h - p.t - p.b;
  const yMax = Math.max(6, Math.ceil(Math.max(...run.baseline, ...run.optimized) + 0.2));
  const x = (i) => p.l + (i / 23) * iw;
  const y = (v) => p.t + (1 - v / yMax) * ih;
  drawGrid(ctx, p, w, h, 4);
  ctx.font = '16px "DM Mono", monospace';
  ctx.fillStyle = '#638999';
  [0, 6, 12, 18, 23].forEach((i) => ctx.fillText(`${String(i).padStart(2, '0')}`, x(i) - 5, h - 5));
  const limit = Number.parseFloat(run.limit);
  ctx.setLineDash([5, 4]);
  ctx.strokeStyle = '#f1b85b';
  ctx.beginPath();
  ctx.moveTo(p.l, y(limit));
  ctx.lineTo(w - p.r, y(limit));
  ctx.stroke();
  ctx.setLineDash([]);
  const reveal = clamp(state.replayReveal, 1, 24);
  drawLine(ctx, run.baseline, x, y, '#7899a8', null, reveal);
  drawLine(ctx, run.optimized, x, y, '#b7df3f', 'rgba(183,223,63,.06)', reveal);
  const index = clamp(reveal - 1, 0, 23);
  const mark = x(index);
  ctx.setLineDash([3, 4]);
  ctx.strokeStyle = 'rgba(230,248,255,.44)';
  ctx.beginPath();
  ctx.moveTo(mark, p.t);
  ctx.lineTo(mark, p.t + ih);
  ctx.stroke();
  ctx.setLineDash([]);
  [['#7899a8', run.baseline[index]], ['#b7df3f', run.optimized[index]]].forEach(([color, value]) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(mark, y(value), 3.5, 0, Math.PI * 2);
    ctx.fill();
  });
  const replayState = $('#replayState');
  if (replayState) {
    replayState.querySelector('span').textContent = `${String(index).padStart(2, '0')}:00`;
    replayState.querySelector('b').textContent = `A ${run.baseline[index].toFixed(2)} · B ${run.optimized[index].toFixed(2)}`;
  }
}

function animateHistoryReplay(duration = 2600) {
  const token = ++state.replayToken;
  const button = $('#replayRun');
  const replayState = $('#replayState');
  state.replayReveal = 1;
  if (button) {
    button.disabled = true;
    button.classList.add('running');
  }
  if (replayState) replayState.classList.add('running');
  drawReplayChart();
  const started = performance.now();
  const frame = (now) => {
    if (token !== state.replayToken) return;
    const raw = clamp((now - started) / duration, 0, 1);
    const eased = 1 - (1 - raw) ** 2.4;
    state.replayReveal = clamp(Math.ceil(eased * 24), 1, 24);
    drawReplayChart();
    if (raw < 1) {
      requestAnimationFrame(frame);
      return;
    }
    if (button) {
      button.disabled = false;
      button.classList.remove('running');
    }
    if (replayState) replayState.classList.remove('running');
  };
  requestAnimationFrame(frame);
}

function updateLiveValues() {
  state.liveStep = (state.liveStep + 1) % liveData.flow.length;
  const i = state.liveStep;
  const flow = liveData.flow[i];
  const nh = liveData.nh4[i];
  $('#flowMetric').textContent = flow;
  $('#nhMetric').textContent = nh.toFixed(2);
  $('#energyMetric').textContent = (0.287 + Math.sin(i * 0.43) * 0.008).toFixed(3);
  $('#simHour').textContent = `${String(i).padStart(2, '0')}:00`;
  drawLiveChart();
}

function updateOxidationValues(index = (state.oxidationStep + 1) % oxidationData.flow.length) {
  state.oxidationStep = index;
  const flow = oxidationData.flow[index];
  const dissolvedOxygen = oxidationData.do[index];
  const velocity = oxidationData.velocity[index];
  const nh4 = oxidationData.nh4?.[index] ?? clamp(1.12 + (1.9 - dissolvedOxygen) * 0.17 + Math.sin(index * 0.41) * 0.035, 0.98, 1.38);
  const blanket = clamp(1.82 + (flow - 800) * 0.0012 + Math.sin(index * 0.29) * 0.045, 1.72, 2.08);
  const tn = oxidationData.snox ? oxidationData.snox[index] + nh4 : 8.45 + Math.sin(index * 0.27 + 0.6) * 0.21;
  $('#oxFlowMetric').textContent = flow;
  $('#oxDoMetric').textContent = dissolvedOxygen.toFixed(2);
  $('#oxEnergyMetric').textContent = (0.255 + flow / 100000 + Math.sin(index * 0.32) * 0.004).toFixed(3);
  $('#oxSimHour').textContent = `${String(index).padStart(2, '0')}:00`;
  $('#oxVelocity').textContent = `${velocity.toFixed(2)} m/s`;
  $('#oxHudFlow').textContent = flow;
  $('#oxHudDo').textContent = dissolvedOxygen.toFixed(2);
  $('#oxHudVelocity').textContent = velocity.toFixed(2);
  $('#oxHudNh4').textContent = nh4.toFixed(2);
  $('#oxPinFlow').textContent = `${flow} m³/h`;
  $('#oxPinDo').textContent = `DO ${dissolvedOxygen.toFixed(2)} · ${velocity.toFixed(2)} m/s`;
  $('#oxPinBlanket').textContent = `泥位 ${blanket.toFixed(2)} m`;
  $('#oxPinOutlet').textContent = `NH₄-N ${nh4.toFixed(2)} · TN ${tn.toFixed(1)}`;
  const ditchTag = $('.oxidation-tags [data-ox-unit="ditch"] small');
  if (ditchTag) ditchTag.textContent = `环流 ${velocity.toFixed(2)} m/s · DO ${dissolvedOxygen.toFixed(2)}`;
  const selectedUnit = $('.oxidation-tags [data-ox-unit].selected')?.dataset.oxUnit;
  const telemetry = $$('#oxUnitTelemetry b');
  if (selectedUnit === 'ditch' && telemetry.length >= 3) {
    telemetry[0].textContent = `${dissolvedOxygen.toFixed(2)} mg/L`;
    telemetry[1].textContent = `${velocity.toFixed(2)} m/s`;
  } else if (selectedUnit === 'headworks' && telemetry.length >= 3) {
    telemetry[2].textContent = `${flow} m³/h`;
  } else if (selectedUnit === 'clarifier' && telemetry.length >= 2) {
    telemetry[1].textContent = `${blanket.toFixed(2)} m`;
  } else if (selectedUnit === 'outlet' && telemetry.length >= 2) {
    telemetry[0].textContent = `${tn.toFixed(1)} mg/L`;
    telemetry[1].textContent = nh4.toFixed(2);
  }
  drawOxidationChart();
}

function readScenario() {
  return {
    preset: $('#conditionPreset').value,
    peakFlow: Number($('#inflowPeak').value),
    influentNh: Number($('#influentNh').value),
    temperature: Number($('#waterTemp').value),
    limit: Number($('#effluentLimit').value),
    energyCap: Number($('#energyCap').value),
    baseline: {
      air: Number($('#baseAir').value),
      pump: Number($('#basePump').value),
      volume: Number($('#baseVolume').value),
      forecast: false,
    },
    optimized: {
      air: Number($('#optAir').value),
      pump: Number($('#optPump').value),
      volume: Number($('#optVolume').value),
      forecast: true,
    },
  };
}

function resample24(values, fallback) {
  const clean = Array.isArray(values) ? values.map(Number).filter(Number.isFinite) : [];
  if (clean.length >= 24) return clean.slice(0, 24);
  if (clean.length < 2) return [...fallback];
  return Array.from({ length: 24 }, (_, index) => {
    const source = (index / 23) * (clean.length - 1);
    const low = Math.floor(source);
    const high = Math.min(clean.length - 1, Math.ceil(source));
    const mix = source - low;
    return clean[low] * (1 - mix) + clean[high] * mix;
  });
}

function stressSeries(series, scenario) {
  const hydraulic = 1 + (scenario.peakFlow - 900) / 5000;
  const load = 1 + Math.max(-8, scenario.influentNh - 28) / 250;
  const temperature = 1 + Math.max(0, 18 - scenario.temperature) * 0.018;
  const shock = scenario.preset === 'rain' ? 1.08 : 1;
  const factor = clamp(hydraulic * load * temperature * shock, 0.82, 1.45);
  return series.map((value) => clamp(value * factor, 0.15, 9.5));
}

function ensureStrategySeparation(baseline, optimized) {
  const mean = baseline.reduce((sum, value) => sum + value, 0) / Math.max(1, baseline.length);
  const difference = baseline.reduce((sum, value, index) => sum + Math.abs(value - optimized[index]), 0) / Math.max(1, baseline.length);
  if (difference / Math.max(0.1, mean) >= 0.06) return optimized;
  return optimized.map((value, index) => clamp(value * (0.81 + Math.sin(index * 0.48) * 0.018), 0.15, 9.5));
}

function energyFor(controls) {
  return 0.135 + controls.air * 0.000045 + controls.pump * 0.00000047 + (7000 - controls.volume) * 0.0000012;
}

function metricsFor(series, controls, limit, peakFlow) {
  const peak = Math.max(...series);
  const peakIndex = series.indexOf(peak);
  const compliance = (series.filter((value) => value <= limit).length / series.length) * 100;
  const energy = Math.max(0.16, energyFor(controls));
  return { peak, peakIndex, final: series[series.length - 1], compliance, energy, dailyEnergy: energy * peakFlow * 24 };
}

function choosePlan(base, optimized, scenario) {
  const violationPenalty = (metrics) => Math.max(0, metrics.peak - scenario.limit) * 45;
  const score = (metrics) => metrics.compliance * 0.75 - metrics.energy * 55 - violationPenalty(metrics);
  return score(optimized) >= score(base) ? 'B' : 'A';
}

function setScenarioDirty() {
  $('#scenarioDirty').classList.add('changed');
  $('#scenarioDirty').innerHTML = '<i></i>参数已修改 · 待运行';
  $('#scenarioProgressTitle').textContent = '边界已更新';
  $('#scenarioProgressDetail').textContent = '点击“运行情景对照”，动态图会立即开始推进';
  $('#scenarioProgressPercent').textContent = '0%';
  $('#scenarioProgressBar').style.width = '0%';
  $('#compareChartState').className = 'chart-state';
  $('#compareChartState').innerHTML = '<i data-lucide="clock-3"></i><span>参数已修改 · 待运行</span>';
  iconify();
  updateConstraintHealth();
}

function updateConstraintHealth() {
  const scenario = readScenario();
  const valid = [
    scenario.peakFlow >= 700 && scenario.peakFlow <= 1400,
    scenario.influentNh >= 15 && scenario.influentNh <= 55,
    scenario.temperature >= 10 && scenario.temperature <= 32,
    scenario.limit >= 1 && scenario.limit <= 8,
    scenario.energyCap >= 0.18 && scenario.energyCap <= 0.55,
    scenario.baseline.volume >= 4000 && scenario.optimized.volume >= 4000,
  ].filter(Boolean).length;
  $('#constraintHealth').textContent = `${valid} / 6 已就绪`;
  $('#constraintHealth').style.background = valid === 6 ? '' : '#4a2d25';
  return valid === 6;
}

function updateRangeOutputs() {
  $('#inflowPeakOutput').textContent = `${format($('#inflowPeak').value)} m³/h`;
  $('#waterTempOutput').textContent = `${$('#waterTemp').value} ℃`;
  $('#baseAirOutput').textContent = `${format($('#baseAir').value)} Nm³/h`;
  $('#basePumpOutput').textContent = `${format($('#basePump').value)} L/d`;
  $('#baseVolumeOutput').textContent = `${format($('#baseVolume').value)} m³`;
  $('#optAirOutput').textContent = `${format($('#optAir').value)} Nm³/h`;
  $('#optPumpOutput').textContent = `${format($('#optPump').value)} L/d`;
  $('#optVolumeOutput').textContent = `${format($('#optVolume').value)} m³`;
}

function applyPreset(preset) {
  const presets = {
    normal: { flow: 840, nh: 27, temp: 24 },
    peak: { flow: 1050, nh: 32, temp: 24 },
    rain: { flow: 1320, nh: 24, temp: 21 },
    lowtemp: { flow: 760, nh: 35, temp: 12 },
  };
  const selected = presets[preset];
  $('#inflowPeak').value = selected.flow;
  $('#influentNh').value = selected.nh;
  $('#waterTemp').value = selected.temp;
  updateRangeOutputs();
  setScenarioDirty();
}

function setupScenarioControls() {
  $('#conditionPreset').addEventListener('change', (event) => applyPreset(event.target.value));
  const ids = ['inflowPeak', 'influentNh', 'waterTemp', 'effluentLimit', 'energyCap', 'baseAir', 'basePump', 'baseVolume', 'optAir', 'optPump', 'optVolume'];
  ids.forEach((id) => {
    $('#' + id).addEventListener('input', () => {
      updateRangeOutputs();
      setScenarioDirty();
    });
  });
  updateRangeOutputs();
  updateConstraintHealth();
}

function setScenarioProgress(percent, title, detail, step) {
  $('#scenarioProgressPercent').textContent = `${percent}%`;
  $('#scenarioProgressBar').style.width = `${percent}%`;
  $('#scenarioProgressTitle').textContent = title;
  $('#scenarioProgressDetail').textContent = detail;
  $$('.progress-steps span').forEach((item, index) => item.classList.toggle('active', index <= step));
}

function setAgentProgress(percent, title, detail) {
  $('#agentProgressPercent').textContent = `${percent}%`;
  $('#agentProgressBar').style.width = `${percent}%`;
  $('#agentProgressTitle').textContent = title;
  $('#agentProgressDetail').textContent = detail;
}

async function fetchSumo(body) {
  return window.FlowPilotEngine.run({...body, scenario:readScenario()}, body.process || 'a2o');
}

function animateReveal(key, draw, duration = 2500) {
  return new Promise((resolve) => {
    const started = performance.now();
    const frame = (now) => {
      const raw = clamp((now - started) / duration, 0, 1);
      const eased = 1 - (1 - raw) ** 3;
      state[key] = clamp(Math.ceil(eased * 24), 1, 24);
      draw();
      if (raw < 1) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  });
}

function updateScenarioResults(scenario, source = 'sumo') {
  const base = metricsFor(state.comparison.baseline, scenario.baseline, scenario.limit, scenario.peakFlow);
  const optimized = metricsFor(state.comparison.optimized, scenario.optimized, scenario.limit, scenario.peakFlow);
  const selected = choosePlan(base, optimized, scenario);
  const saving = ((base.energy - optimized.energy) / base.energy) * 100;
  const best = selected === 'B' ? optimized : base;
  const bestControls = selected === 'B' ? scenario.optimized : scenario.baseline;
  state.lastMetrics = { base, optimized, selected, saving, scenario };
  $('#basePeakNh').textContent = base.peak.toFixed(2);
  $('#baseEnergy').textContent = base.energy.toFixed(3);
  $('#baseCompliance').textContent = base.compliance.toFixed(1);
  $('#scenarioNh').textContent = optimized.peak.toFixed(2);
  $('#scenarioEnergy').textContent = optimized.energy.toFixed(3);
  $('#scenarioCompliance').textContent = optimized.compliance.toFixed(1);
  const stateA = $('.plan-a .plan-state');
  const stateB = $('.plan-b .plan-state');
  stateA.textContent = selected === 'A' ? '推荐' : '对照';
  stateB.textContent = selected === 'B' ? '推荐' : '候选';
  stateA.classList.toggle('recommended', selected === 'A');
  stateB.classList.toggle('recommended', selected === 'B');
  const peakHour = best.peakIndex;
  const start = String(Math.max(0, peakHour - 1)).padStart(2, '0');
  const end = String(Math.min(23, peakHour + 2)).padStart(2, '0');
  const exitFlow = Math.round((scenario.peakFlow * 1.12) / 10) * 10;
  $('#scenarioAdvice1').textContent = selected === 'B' ? `曝气量分步降至 ${format(bestControls.air)} Nm³/h` : `保持基线曝气 ${format(bestControls.air)} Nm³/h`;
  $('#scenarioAdviceCopy1').textContent = selected === 'B' ? `侧流同步设为 ${format(bestControls.pump)} L/d，分两次完成，间隔 20 分钟。` : '当前约束下节能空间不足，先保持稳定运行并观察负荷回落。';
  $('#scenarioAdvice2').textContent = `${start}:00–${end}:00 重点看氨氮与泥位`;
  $('#scenarioAdviceCopy2').textContent = `NH₄-N 小于 ${(scenario.limit * 0.72).toFixed(1)} mg/L 且泥位低于 2.8 m，就保持当前策略。`;
  $('#scenarioAdvice3').textContent = `流量超过 ${format(exitFlow)} m³/h 时退出`;
  $('#scenarioAdviceCopy3').textContent = `或 NH₄-N 连续 2 个点超过 ${(scenario.limit * 0.9).toFixed(1)} mg/L，恢复基线后重新计算。`;
  $('#modelStamp').textContent = `${source === 'sumo' ? 'SUMO 22' : source === 'asm' ? 'REDUCED ASM · 未校准' : 'DEMO PREVIEW'} · 24 h · dynamic mode`;
  $('#overviewActionTitle').textContent = selected === 'B' ? `采用方案 B，预计节能 ${Math.max(0, saving).toFixed(1)}%` : '保持方案 A，优先保障出水';
  $('#overviewActionCopy').textContent = selected === 'B' ? `将曝气量分两步降至 ${format(scenario.optimized.air)} Nm³/h；${start}:00 后重点看二沉池泥位。` : '当前工况接近控制边界，暂不执行深度节能动作。';
  historyRuns[0] = {
    title: `方案 ${selected}-${selected === 'B' ? '17' : 'BASE'} · ${$('#conditionPreset option:checked').textContent}`,
    state: '已完成', flow: `${format(scenario.peakFlow)} m³/h`, limit: `${scenario.limit.toFixed(1)} mg/L`, duration: '3.8 s',
    advice: $('#scenarioAdviceCopy1').textContent,
    baseline: [...state.comparison.baseline], optimized: [...state.comparison.optimized],
  };
}

async function runScenario() {
  if (state.running || !updateConstraintHealth()) return;
  const scenario = readScenario();
  state.running = true;
  state.speed = 2.8;
  setRunButton(true);
  $('#syncText').textContent = '动态图运行中';
  $('#simulationState').textContent = 'SIMULATING';
  $('#compareChartState').className = 'chart-state running';
  $('#compareChartState').innerHTML = '<i data-lucide="loader-circle"></i><span>预览曲线 · 引擎计算中</span>';
  iconify();
  state.comparison.baseline = stressSeries(fallbackComparison.baseline, scenario);
  state.comparison.optimized = ensureStrategySeparation(state.comparison.baseline, stressSeries(fallbackComparison.optimized, scenario));
  updateScenarioResults(scenario, 'fallback');
  state.comparisonReveal = 1;
  drawComparisonChart();
  const chartAnimation = animateReveal('comparisonReveal', drawComparisonChart, 3100);
  if (window.innerWidth <= 760) requestAnimationFrame(() => $('.comparison-panel').scrollIntoView({ behavior: 'smooth', block: 'start' }));
  const sumoTask = fetchSumo({ baseline: scenario.baseline, optimized: scenario.optimized })
    .then((payload) => ({ payload }))
    .catch((error) => ({ error }));
  let source = 'fallback';
  setScenarioProgress(12, '动态图已启动', '先播放预览，完成后替换为引擎动力学结果', 0);
  await wait(320);
  setScenarioProgress(36, '边界已确认', '正在推进 24 小时流量与氨氮变化', 1);
  await wait(420);
  setScenarioProgress(58, '双方案动态对照', '曲线每小时更新，建议同步生成', 1);
  const result = await sumoTask;
  if (result.payload) {
    const payload = result.payload;
    const baseRaw = resample24(payload.baseline?.snhx, fallbackComparison.baseline);
    const optRaw = resample24(payload.optimized?.snhx, fallbackComparison.optimized);
    state.comparison.baseline = baseRaw;
    state.comparison.optimized = optRaw;
    source = payload.engine;
    await animateReveal('comparisonReveal', drawComparisonChart, 1800);
  }
  updateScenarioResults(scenario, source);
  drawComparisonChart();
  setScenarioProgress(86, '生成现场动作', '把曲线变化翻译成调整值、观察点和退出条件', 3);
  await chartAnimation;
  setScenarioProgress(100, '动态推演完成', '未校准结果：建议须经现场复核后试调', 3);
  $('#scenarioDirty').classList.remove('changed');
  $('#scenarioDirty').innerHTML = '<i></i>本轮结果已同步';
  $('#compareChartState').className = 'chart-state';
  $('#compareChartState').innerHTML = '<i data-lucide="circle-check"></i><span>24 小时动态推演完成</span>';
  $('#syncText').textContent = source === 'fallback' ? '仅演示预览' : `${source.toUpperCase()} 结果已同步`;
  $('#simulationState').textContent = `${source.toUpperCase()} RESULT`;
  iconify();
  toast(source === 'fallback' ? '引擎不可用：当前仅演示预览，不能用于控制' : `${source.toUpperCase()} 动态推演完成；策略需现场校准验证`);
  state.running = false;
  state.speed = 1;
  setRunButton(false);
}

async function runOverview() {
  if (state.running) return;
  ensureTwinScene('overview');
  const scenario = readScenario();
  state.running = true;
  state.speed = 3.2;
  setRunButton(true);
  $('#syncText').textContent = '机理引擎计算中';
  $('#simulationState').textContent = 'DIGITAL TWIN RUNNING';
  if (state.three) state.three.setRunning(true);
  let source = 'sumo';
  try {
    const payload = await fetchSumo({ baseline: scenario.baseline, optimized: scenario.optimized });
    source = payload.engine;
    state.comparison.baseline = resample24(payload.baseline?.snhx, fallbackComparison.baseline);
    state.comparison.optimized = resample24(payload.optimized?.snhx, fallbackComparison.optimized);
    if (payload.optimized?.flow) liveData.flow = resample24(payload.optimized.flow, liveData.flow).map(Math.round);
  } catch (error) {
    source = 'fallback';
    state.comparison.baseline = stressSeries(fallbackComparison.baseline, scenario);
    state.comparison.optimized = ensureStrategySeparation(state.comparison.baseline, stressSeries(fallbackComparison.optimized, scenario));
  }
  updateScenarioResults(scenario, source);
  liveData.nh4 = [...state.comparison.optimized];
  state.liveStep = 0;
  for (let i = 0; i < 24; i += 1) {
    state.liveStep = i;
    updateOverviewMetricsAt(i);
    drawLiveChart();
    await wait(75);
  }
  $('#simulationState').textContent = `${source.toUpperCase()} RESULT`;
  $('#syncText').textContent = source === 'fallback' ? '仅演示预览' : `${source.toUpperCase()} 结果已同步`;
  if (state.three) state.three.setRunning(false);
  toast(`24 小时动态推演完成 · ${source.toUpperCase()} · 未经实厂校准`);
  state.running = false;
  state.speed = 1;
  setRunButton(false);
}

async function runOxidation() {
  if (state.running) return;
  ensureTwinScene('oxidation');
  state.running = true;
  state.speed = 3.6;
  setRunButton(true);
  $('#syncText').textContent = '氧化沟推演中';
  $('#oxidationSimulationState').textContent = '24 H DYNAMIC RUN';
  if (state.oxidationThree) state.oxidationThree.setRunning(true);
  let source = '演示预览';
  try {
    const scenario = readScenario();
    const payload = await fetchSumo({baseline:scenario.baseline, optimized:scenario.optimized, process:'oxidation'});
    oxidationData.flow = resample24(payload.optimized.flow, oxidationData.flow).map(Math.round);
    oxidationData.do = resample24(payload.optimized.do, oxidationData.do);
    oxidationData.nh4 = resample24(payload.optimized.snhx, Array(24).fill(1));
    oxidationData.snox = resample24(payload.optimized.snox, Array(24).fill(8));
    source = payload.engine.toUpperCase();
  } catch (error) { $('#engineStatus').textContent = '引擎未完成，氧化沟仅播放预览'; }
  state.oxidationStep = 0;
  for (let index = 0; index < 24; index += 1) {
    updateOxidationValues(index);
    if (index === 8) {
      $('#oxActionTitle').textContent = '峰值前维持双沟 42 Hz';
      $('#oxActionCopy').textContent = '08:00 后流量快速抬升，暂不降频；保持沟内流速高于 0.30 m/s，避免沟底沉积。';
    }
    if (index === 15) {
      $('#oxActionTitle').textContent = '北沟转碟分步降至 38 Hz';
      $('#oxActionCopy').textContent = '峰值已回落，南沟保持 42 Hz；北沟每 20 分钟降低 2 Hz，并守住沟末 DO 1.5 mg/L。';
    }
    await wait(92);
  }
  $('#oxidationSimulationState').textContent = `${source} · 未校准`;
  $('#syncText').textContent = `${source} 氧化沟推演`;
  if (state.oxidationThree) state.oxidationThree.setRunning(false);
  $('#oxActionTitle').textContent = '先核对沟末 DO，再决定调低曝气';
  $('#oxActionCopy').textContent = '曲线为未校准机理预测；转碟频率与流速仍是演示参数。DO 低于 1.5 mg/L 不建议降频，实际动作需现场复核。';
  toast(`氧化沟 24 小时曲线完成 · ${source} · 现场策略仅作讨论`);
  state.running = false;
  state.speed = 1;
  setRunButton(false);
}

function updateOverviewMetricsAt(index) {
  const flow = liveData.flow[index];
  const nh = liveData.nh4[index];
  $('#flowMetric').textContent = flow;
  $('#nhMetric').textContent = nh.toFixed(2);
  $('#energyMetric').textContent = (0.287 + Math.sin(index * 0.43) * 0.008).toFixed(3);
  $('#simHour').textContent = `${String(index).padStart(2, '0')}:00`;
}

function deriveAgentControls(scenario) {
  const actionLimit = Number($('#actionLimit').value) / 100;
  const risk = $('#riskLevel').value;
  let airFactor = state.objective === 'energy' ? 1 - actionLimit : state.objective === 'compliance' ? 1 - actionLimit * 0.35 : 1 - actionLimit * 0.72;
  if (risk === 'conservative') airFactor += 0.055;
  if (risk === 'progressive') airFactor -= 0.045;
  if ($('#lockStandby').checked) airFactor = Math.min(airFactor, 0.9);
  const air = Math.round(clamp(scenario.baseline.air * airFactor, 0, 5000) / 100) * 100;
  const pumpFactor = state.objective === 'compliance' ? 0.96 : state.objective === 'energy' ? 0.84 : 0.89;
  const pump = Math.round(clamp(scenario.baseline.pump * pumpFactor, 40000, 90000) / 1000) * 1000;
  return { air, pump, volume: scenario.optimized.volume, forecast: true };
}

function updateAgentBoundary() {
  $('#actionLimitOutput').textContent = `${$('#actionLimit').value}%`;
  const locks = ['lockDo', 'lockSludge', 'lockStandby'].filter((id) => $('#' + id).checked).length;
  const total = locks + 3;
  $('#agentBoundaryTitle').textContent = `${total} 项约束已锁定`;
  $('#agentBoundaryCopy').textContent = '对比基线与规则候选；泥位、备用机约束尚未建模';
  setAgentProgress(0, '约束已更新', '点击“生成今日策略”，搜索曲线会立即启动');
}

function setupAdvisor() {
  $$('[data-objective]').forEach((button) => button.addEventListener('click', () => {
    $$('[data-objective]').forEach((item) => item.classList.toggle('active', item === button));
    state.objective = button.dataset.objective;
    updateAgentBoundary();
  }));
  ['riskLevel', 'energyPrice', 'actionLimit', 'lockDo', 'lockSludge', 'lockStandby'].forEach((id) => $('#' + id).addEventListener('input', updateAgentBoundary));
  $$('[data-advisor-mode]').forEach((button) => button.addEventListener('click', () => {
    $$('[data-advisor-mode]').forEach((item) => item.classList.toggle('active', item === button));
    const manager = button.dataset.advisorMode === 'manager';
    $('#engineerTimeline').hidden = manager;
    $('#managerSummary').hidden = !manager;
    if (manager) {
      $('#recommendationTitle').textContent = '规则候选对照 · 待现场复核';
      $('#recommendationCopy').textContent = '收益来自未校准预测和经验能耗系数；应核对出水约束后逐步试调，回退由现场人员执行。';
    } else if (state.lastMetrics) {
      updateAgentRecommendation(state.lastMetrics.scenario, state.lastMetrics.optimized, state.lastMetrics.saving);
    }
  }));
  $('#applyRecommendation').addEventListener('click', () => {
    historyRuns[0].state = '已采用';
    $('#historyList [data-run="0"] .status-pill').textContent = '已采用';
    $('#historyList [data-run="0"] .status-pill').classList.add('adopted');
    toast('已保存到演示值班清单；本平台未连接 PLC，不会下发设备动作');
  });
  updateAgentBoundary();
}

function updateAgentRecommendation(scenario, optimizedMetrics, savingPercent) {
  const controls = deriveAgentControls(scenario);
  const dailySaving = Math.max(0, state.agent.savings[23]);
  const price = Number($('#energyPrice').value);
  const risk = $('#riskLevel').value;
  const riskText = risk === 'conservative' ? '极低' : risk === 'progressive' ? '可控' : '低';
  const confidence = clamp(Math.round(88 + optimizedMetrics.compliance / 20 - (risk === 'progressive' ? 5 : 0)), 72, 96);
  $('#recommendationTitle').textContent = `方案 B-${state.objective === 'energy' ? '23' : state.objective === 'compliance' ? '08' : '17'} · ${state.objective === 'compliance' ? '稳态强化' : '低曝气 + 侧流协同'}`;
  $('#recommendationCopy').textContent = optimizedMetrics.peak > scenario.limit
    ? `候选策略峰值 ${optimizedMetrics.peak.toFixed(2)} mg/L 超过红线 ${scenario.limit.toFixed(1)} mg/L，暂不建议采用。应维持基线并重新评估曝气。`
    : `候选曝气 ${format(controls.air)} Nm³/h、侧流 ${format(controls.pump)} L/d，预测峰值 ${optimizedMetrics.peak.toFixed(2)} mg/L。仅为未校准预测，须经现场验证后逐步试调。`;
  $('#confidenceValue').textContent = '待校准';
  $('#impactValue1').textContent = `${optimizedMetrics.peak.toFixed(2)} mg/L`;
  $('#impactValue2').textContent = `${format(dailySaving)} kWh/d`;
  $('#impactValue3').textContent = `${riskText} · ${(100 - optimizedMetrics.compliance).toFixed(1)}%`;
  $('#agentAction1').textContent = `先将曝气降到 ${format(Math.round((scenario.baseline.air + controls.air) / 200) * 100)} Nm³/h`;
  $('#agentAction2').textContent = `再降到 ${format(controls.air)} Nm³/h`;
  $('#agentAction3').textContent = `NH₄-N 超过 ${(scenario.limit * 0.9).toFixed(1)} mg/L 即回退`;
  $('#managerSaving').textContent = `约 ${format(dailySaving)} kWh`;
  $('#managerSavingMoney').textContent = `约 ${format(dailySaving * price)} 元电费`;
  $('#managerCompliance').textContent = `${optimizedMetrics.compliance.toFixed(1)}%`;
  $('#managerRisk').textContent = scenario.peakFlow > 1150 ? '水力冲击叠加' : '下午负荷叠加';
  $('#agentChartOverlay').innerHTML = `<span>规则候选</span><strong>${$('#recommendationTitle').textContent.split(' · ')[0]}</strong><small>合规 ${optimizedMetrics.compliance.toFixed(1)} · 节能 ${savingPercent.toFixed(1)}%</small>`;
}

async function runAdvisor() {
  if (state.running) return;
  const scenario = readScenario();
  const optimizedControls = deriveAgentControls(scenario);
  state.running = true;
  state.speed = 2.4;
  setRunButton(true);
  $('#syncText').textContent = '搜索曲线运行中';
  state.agent.baseline = stressSeries(fallbackComparison.baseline, scenario);
  state.agent.optimized = ensureStrategySeparation(state.agent.baseline, stressSeries(fallbackComparison.optimized, scenario));
  const refreshAgentResult = () => {
    const baseMetrics = metricsFor(state.agent.baseline, scenario.baseline, scenario.limit, scenario.peakFlow);
    const optMetrics = metricsFor(state.agent.optimized, optimizedControls, scenario.limit, scenario.peakFlow);
    const savingPercent = ((baseMetrics.energy - optMetrics.energy) / baseMetrics.energy) * 100;
    const hourlySaving = Math.max(0, (baseMetrics.energy - optMetrics.energy) * scenario.peakFlow);
    state.agent.savings = Array.from({ length: 24 }, (_, index) => Math.round(hourlySaving * (index + 1)));
    updateAgentRecommendation(scenario, optMetrics, savingPercent);
  };
  refreshAgentResult();
  state.agentReveal = 1;
  drawAgentChart();
  const chartAnimation = animateReveal('agentReveal', drawAgentChart, 3200);
  if (window.innerWidth <= 760) requestAnimationFrame(() => $('.agent-chart-panel').scrollIntoView({ behavior: 'smooth', block: 'start' }));
  const sumoTask = fetchSumo({ baseline: scenario.baseline, optimized: optimizedControls })
    .then((payload) => ({ payload }))
    .catch((error) => ({ error }));
  let source = 'fallback';
  setAgentProgress(10, '策略对照已启动', '预览曲线播放中，引擎评估基线与规则候选');
  await wait(340);
  setAgentProgress(34, '正在筛选候选动作', '对比曝气、侧流与出水响应');
  await wait(430);
  setAgentProgress(57, '双方案对照', '核对基线与一个规则候选的出水响应');
  const result = await sumoTask;
  if (result.payload) {
    const payload = result.payload;
    state.agent.baseline = resample24(payload.baseline?.snhx, fallbackComparison.baseline);
    state.agent.optimized = resample24(payload.optimized?.snhx, fallbackComparison.optimized);
    source = payload.engine;
    await animateReveal('agentReveal', drawAgentChart, 1800);
  }
  refreshAgentResult();
  drawAgentChart();
  setAgentProgress(86, '生成工程建议', '把候选曲线翻译成现场复核与试调建议');
  await chartAnimation;
  setAgentProgress(100, '今日策略已生成', `${source === 'sumo' ? 'SUMO 结果（校准状态待确认）' : source === 'asm' ? 'ASM 结果（未校准）' : '演示预览'}已完成工程化翻译`);
  $('#agentModelStamp').textContent = `${source.toUpperCase()} + RULE CANDIDATE · 2 comparisons · 未校准`;
  $('#syncText').textContent = `${source.toUpperCase()} 策略对照`;
  toast('基线与规则候选对比完成，建议仅用于讨论，不直接控制设备');
  state.running = false;
  state.speed = 1;
  setRunButton(false);
}

function handleGlobalRun() {
  if (state.route === 'overview') runOverview();
  else if (state.route === 'oxidation') runOxidation();
  else if (state.route === 'network') runNetwork();
  else if (state.route === 'scenarios') runScenario();
  else if (state.route === 'advisor') runAdvisor();
  else {
    animateHistoryReplay();
    if (window.innerWidth <= 760) requestAnimationFrame(() => $('.history-detail').scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }
}

function setupUnitSelection() {
  $$('.scene-tags button').forEach((button) => button.addEventListener('click', () => selectUnit(button.dataset.unit)));
}

function selectUnit(unit) {
  const button = $(`.scene-tags button[data-unit="${unit}"]`);
  if (!button) return;
  $$('.scene-tags button').forEach((item) => item.classList.toggle('selected', item === button));
  const copy = unitCopy[unit];
  $('#unitName').textContent = copy.name;
  $('#unitAdvice').textContent = copy.advice;
  $('#unitMeta').textContent = copy.meta;
  $('#unitTelemetry').innerHTML = copy.telemetry.map(([label, value]) => `<span><small>${label}</small><b>${value}</b></span>`).join('');
  if (state.three) state.three.focus(unit);
}

function setupOxidationSelection() {
  $$('[data-ox-unit]').forEach((button) => button.addEventListener('click', () => selectOxidationUnit(button.dataset.oxUnit)));
  $$('[data-ox-focus]').forEach((button) => button.addEventListener('click', () => selectOxidationUnit(button.dataset.oxFocus)));
  $('#oxTourToggle').addEventListener('click', () => {
    ensureTwinScene('oxidation');
    if (state.oxidationThree) state.oxidationThree.toggleTour();
  });
  $('#oxPresentationTour').addEventListener('click', () => {
    ensureTwinScene('oxidation');
    if (state.oxidationThree) state.oxidationThree.toggleTour();
  });
  $('#oxPresentationEnter').addEventListener('click', () => setOxidationPresentation(true));
  $('#oxPresentationExit').addEventListener('click', () => setOxidationPresentation(false));
  $('#oxPresentationRun').addEventListener('click', runOxidation);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && document.body.classList.contains('ox-presentation')) setOxidationPresentation(false);
  });
}

function setOxidationPresentation(active) {
  if (active && state.route !== 'oxidation') setRoute('oxidation');
  document.body.classList.toggle('ox-presentation', active);
  $('#oxPresentationEnter').classList.toggle('active', active);
  $('#oxPresentationEnter').setAttribute('aria-pressed', String(active));
  ensureTwinScene('oxidation');
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (!state.oxidationThree) return;
    state.oxidationThree.resize();
    if (active) state.oxidationThree.startTour();
    else {
      state.oxidationThree.stopTour();
      state.oxidationThree.setView('isometric');
    }
  }));
}

function selectOxidationUnit(unit, shouldFocus = true) {
  const button = $(`[data-ox-unit="${unit}"]`);
  if (!button || !oxidationUnitCopy[unit]) return;
  $$('[data-ox-unit]').forEach((item) => item.classList.toggle('selected', item === button));
  const copy = oxidationUnitCopy[unit];
  $('#oxUnitName').textContent = copy.name;
  $('#oxUnitAdvice').textContent = copy.advice;
  $('#oxUnitMeta').textContent = copy.meta;
  $('#oxUnitTelemetry').innerHTML = copy.telemetry.map(([label, value]) => `<span><small>${label}</small><b>${value}</b></span>`).join('');
  $$('[data-ox-pin]').forEach((item) => item.classList.toggle('active', item.dataset.oxPin === unit));
  if (shouldFocus && state.oxidationThree) state.oxidationThree.focus(unit);
}

function setupHistory() {
  $$('#historyList [data-run]').forEach((button) => button.addEventListener('click', () => {
    $$('#historyList [data-run]').forEach((item) => item.classList.toggle('selected', item === button));
    state.historyIndex = Number(button.dataset.run);
    const run = historyRuns[state.historyIndex];
    $('#historyDetailTitle').textContent = run.title;
    $('#historyDetailState').textContent = run.state;
    $('#historyDetailState').classList.toggle('adopted', run.state === '已采用');
    $('#historyFlow').textContent = run.flow;
    $('#historyLimit').textContent = run.limit;
    $('#historyDuration').textContent = run.duration;
    $('#historyAdvice').textContent = run.advice;
    animateHistoryReplay();
    if (window.innerWidth <= 760) requestAnimationFrame(() => $('.history-detail').scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }));
  $('#replayRun').addEventListener('click', () => animateHistoryReplay());
  $('#exportHistory').addEventListener('click', () => {
    const rows = [
      ['运行时间', '工况', '策略', '峰值NH4-N', '节能', '状态'],
      ['今天 10:42', '夏季高负荷', '方案 B-17', '2.47', '8.2%', '已采用'],
      ['昨天 16:18', '午后峰值', '方案 A', '4.31', '2.1%', '已完成'],
      ['07-09 09:30', '正常负荷', '方案 B-09', '2.12', '9.4%', '已采用'],
      ['07-08 14:05', '降雨冲击', '保守模式', '4.76', '-', '已完成'],
    ];
    const csv = '\ufeff' + rows.map((row) => row.join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'flowpilot-run-history.csv';
    link.click();
    URL.revokeObjectURL(url);
    toast('运行档案已导出为 CSV');
  });
}

function initPlant3d() {
  const mount = $('#plant3d');
  if (!mount || !window.THREE) return;
  const T = window.THREE;
  const renderer = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(window.innerWidth <= 760 ? 1 : Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  mount.appendChild(renderer.domElement);

  const scene = new T.Scene();
  scene.background = new T.Color(0x061725);
  scene.fog = new T.Fog(0x061725, 30, 65);
  const camera = new T.PerspectiveCamera(38, 1, 0.1, 140);
  scene.add(new T.HemisphereLight(0xbcefff, 0x071018, 1.85));
  const sun = new T.DirectionalLight(0xd7f5ff, 3.2);
  sun.position.set(-15, 25, 17);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -30;
  sun.shadow.camera.right = 30;
  sun.shadow.camera.top = 24;
  sun.shadow.camera.bottom = -24;
  scene.add(sun);
  const rim = new T.PointLight(0x25bddd, 5.5, 42);
  rim.position.set(18, 10, -15);
  scene.add(rim);
  const processGlow = new T.PointLight(0x67e4ef, 2.8, 22);
  processGlow.position.set(0, 7, 1);
  scene.add(processGlow);
  const headworksGlow = new T.PointLight(0x9be8ff, 1.8, 14);
  headworksGlow.position.set(-16, 5, 2);
  scene.add(headworksGlow);
  const utilityGlow = new T.PointLight(0xffc870, 1.7, 16);
  utilityGlow.position.set(7, 5, -9);
  scene.add(utilityGlow);

  const mat = {
    ground: new T.MeshStandardMaterial({ color: 0x071a24, roughness: 0.95 }),
    slab: new T.MeshStandardMaterial({ color: 0x334a55, roughness: 0.78, metalness: 0.08 }),
    road: new T.MeshStandardMaterial({ color: 0x172934, roughness: 0.94 }),
    concrete: new T.MeshStandardMaterial({ color: 0x60747c, roughness: 0.72, metalness: 0.12 }),
    concreteDark: new T.MeshStandardMaterial({ color: 0x354c57, roughness: 0.78, metalness: 0.18 }),
    building: new T.MeshStandardMaterial({ color: 0x6c8188, roughness: 0.66 }),
    roof: new T.MeshStandardMaterial({ color: 0xb14c4d, roughness: 0.72, metalness: 0.12 }),
    glass: new T.MeshPhysicalMaterial({ color: 0x58b6cf, emissive: 0x145669, emissiveIntensity: 0.75, transparent: true, opacity: 0.68, roughness: 0.15 }),
    waterDark: new T.MeshPhysicalMaterial({ color: 0x126c80, emissive: 0x075166, emissiveIntensity: 0.95, transparent: true, opacity: 0.8, roughness: 0.18, metalness: 0.08 }),
    water: new T.MeshPhysicalMaterial({ color: 0x2bb9d2, emissive: 0x08738a, emissiveIntensity: 1.08, transparent: true, opacity: 0.72, roughness: 0.12 }),
    waterClean: new T.MeshPhysicalMaterial({ color: 0x6cd8e7, emissive: 0x16798b, emissiveIntensity: 1.05, transparent: true, opacity: 0.66, roughness: 0.1 }),
    steel: new T.MeshStandardMaterial({ color: 0x8da6ad, roughness: 0.34, metalness: 0.72 }),
    darkSteel: new T.MeshStandardMaterial({ color: 0x253f4c, roughness: 0.42, metalness: 0.68 }),
    safety: new T.MeshStandardMaterial({ color: 0xe4c23f, emissive: 0x55410a, emissiveIntensity: 0.55, roughness: 0.45 }),
    lime: new T.MeshStandardMaterial({ color: 0xaace3e, emissive: 0x405b0d, emissiveIntensity: 0.9 }),
    processPipe: new T.MeshStandardMaterial({ color: 0x3da66f, emissive: 0x164c31, emissiveIntensity: 0.9, metalness: 0.58, roughness: 0.28 }),
    airPipe: new T.MeshStandardMaterial({ color: 0x3f83e8, emissive: 0x173f84, emissiveIntensity: 0.95, metalness: 0.58, roughness: 0.25 }),
    sludgePipe: new T.MeshStandardMaterial({ color: 0xd6933f, emissive: 0x64370f, emissiveIntensity: 0.85, metalness: 0.5, roughness: 0.3 }),
    led: new T.MeshBasicMaterial({ color: 0xbdf8ff }),
    red: new T.MeshStandardMaterial({ color: 0xd65a58, emissive: 0x5d1716, emissiveIntensity: 0.55 }),
    tree: new T.MeshStandardMaterial({ color: 0x254f36, roughness: 0.95 }),
    bark: new T.MeshStandardMaterial({ color: 0x513e2c, roughness: 1 }),
    white: new T.MeshStandardMaterial({ color: 0xd4e0df, roughness: 0.7 }),
    concreteLight: new T.MeshStandardMaterial({ color: 0x82959a, roughness: 0.8, metalness: 0.05 }),
    grating: new T.MeshStandardMaterial({ color: 0x46616b, roughness: 0.38, metalness: 0.78 }),
    rubber: new T.MeshStandardMaterial({ color: 0x111a20, roughness: 0.82 }),
    orange: new T.MeshStandardMaterial({ color: 0xe77a32, emissive: 0x6d2608, emissiveIntensity: 0.48, roughness: 0.46 }),
    copper: new T.MeshStandardMaterial({ color: 0x9e7242, roughness: 0.38, metalness: 0.62 }),
    cabinet: new T.MeshStandardMaterial({ color: 0x49616a, roughness: 0.5, metalness: 0.42 }),
    grass: new T.MeshStandardMaterial({ color: 0x1b3b2b, roughness: 1 }),
  };

  const waterSurfaces = [];
  const mixers = [];
  const scrapers = [];
  const bubbles = [];
  const flowParticles = [];
  const fans = [];
  const rotors = [];
  const floats = [];
  const fallingWater = [];
  const hoists = [];
  const buriedRouteMarkers = [];
  const vehicles = [];
  const beacons = [];
  const pickables = [];
  const focusMap = {
    headworks: { target: new T.Vector3(-16, 0.9, 2), radius: 13, height: 7.8, yaw: -1.02 },
    anaerobic: { target: new T.Vector3(-6, 0.8, 0), radius: 14.5, height: 8.2, yaw: 0.64 },
    aerobic: { target: new T.Vector3(1.7, 0.8, 0), radius: 15, height: 7.8, yaw: 0.72 },
    clarifier: { target: new T.Vector3(10.8, 0.7, 0.4), radius: 15, height: 8.8, yaw: 0.78 },
    utilities: { target: new T.Vector3(2, 1.3, -9), radius: 18, height: 9.5, yaw: 3.05 },
    outlet: { target: new T.Vector3(17, 0.8, 0), radius: 13.5, height: 8.5, yaw: 1.36 },
  };

  function box(w, h, d, material, x, y, z, parent = scene, unit = '') {
    const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = h > 0.18;
    mesh.receiveShadow = true;
    if (unit) {
      mesh.userData.unit = unit;
      pickables.push(mesh);
    }
    parent.add(mesh);
    return mesh;
  }

  function cylinder(radiusTop, radiusBottom, height, material, x, y, z, parent = scene, segments = 24, unit = '') {
    const mesh = new T.Mesh(new T.CylinderGeometry(radiusTop, radiusBottom, height, segments), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (unit) {
      mesh.userData.unit = unit;
      pickables.push(mesh);
    }
    parent.add(mesh);
    return mesh;
  }

  function addEdges(mesh, color = 0x85d9e7, opacity = 0.32) {
    const lines = new T.LineSegments(new T.EdgesGeometry(mesh.geometry), new T.LineBasicMaterial({ color, transparent: true, opacity }));
    lines.position.copy(mesh.position);
    lines.rotation.copy(mesh.rotation);
    lines.scale.copy(mesh.scale);
    mesh.parent.add(lines);
    return lines;
  }

  function railing(x1, z1, x2, z2, y = 1.28, parent = scene) {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const length = Math.hypot(dx, dz);
    const angle = Math.atan2(dz, dx);
    const group = new T.Group();
    group.position.set(x1, 0, z1);
    group.rotation.y = -angle;
    parent.add(group);
    box(length, 0.055, 0.055, mat.safety, length / 2, y, 0, group);
    box(length, 0.045, 0.045, mat.safety, length / 2, y - 0.35, 0, group);
    const count = Math.max(2, Math.ceil(length / 1.15));
    for (let i = 0; i <= count; i += 1) box(0.045, 0.72, 0.045, mat.safety, (i / count) * length, y - 0.35, 0, group);
    return group;
  }

  function stairs(x, z, direction = 1, parent = scene) {
    const group = new T.Group();
    group.position.set(x, 0, z);
    parent.add(group);
    for (let i = 0; i < 6; i += 1) box(0.85, 0.11, 0.32, mat.steel, direction * i * 0.28, 0.08 + i * 0.15, 0, group);
    railing(0, -0.47, direction * 1.55, -0.47, 1.25, group);
    railing(0, 0.47, direction * 1.55, 0.47, 1.25, group);
    return group;
  }

  function building(x, z, w, d, h, roofMaterial, unit) {
    const group = new T.Group();
    group.position.set(x, 0, z);
    scene.add(group);
    box(w + 0.28, 0.16, d + 0.28, mat.concreteDark, 0, 0.02, 0, group, unit);
    const body = box(w, h, d, mat.building, 0, h / 2, 0, group, unit);
    addEdges(body, 0x94d8e2, 0.2);
    box(w + 0.18, 0.18, d + 0.18, roofMaterial, 0, h + 0.08, 0, group, unit);
    box(0.8, 1.45, 0.08, mat.darkSteel, -w * 0.28, 0.73, d / 2 + 0.05, group);
    box(0.98, 0.11, 0.12, mat.safety, -w * 0.28, 1.48, d / 2 + 0.07, group);
    [-w / 2 + 0.12, w / 2 - 0.12].forEach((cornerX) => {
      box(0.16, h, 0.16, mat.concreteLight, cornerX, h / 2, d / 2 + 0.02, group);
      box(0.16, h, 0.16, mat.concreteLight, cornerX, h / 2, -d / 2 - 0.02, group);
      cylinder(0.045, 0.045, h - 0.18, mat.darkSteel, cornerX, h / 2 - 0.02, d / 2 + 0.11, group, 10);
    });
    const windows = Math.max(2, Math.floor(w / 1.4));
    for (let i = 0; i < windows; i += 1) {
      const windowX = -w / 2 + 0.7 + i * ((w - 1.4) / Math.max(1, windows - 1));
      box(0.72, 0.55, 0.06, mat.darkSteel, windowX, h * 0.62, d / 2 + 0.055, group);
      box(0.62, 0.45, 0.065, mat.glass, windowX, h * 0.62, d / 2 + 0.09, group);
      box(0.028, 0.46, 0.075, mat.steel, windowX, h * 0.62, d / 2 + 0.1, group);
    }
    const sideWindows = Math.max(1, Math.floor(d / 1.7));
    for (let i = 0; i < sideWindows; i += 1) {
      const sideZ = -d / 2 + 0.7 + i * ((d - 1.4) / Math.max(1, sideWindows - 1));
      box(0.06, 0.42, 0.58, mat.glass, w / 2 + 0.055, h * 0.6, sideZ, group);
    }
    box(w + 0.08, 0.07, 0.11, mat.darkSteel, 0, h - 0.1, d / 2 + 0.11, group);
    return group;
  }

  function addTree(x, z, scale = 1) {
    cylinder(0.42 * scale, 0.42 * scale, 0.035, mat.grating, x, -0.08, z, scene, 20);
    cylinder(0.09 * scale, 0.12 * scale, 0.8 * scale, mat.bark, x, 0.38 * scale, z);
    const crown = new T.Mesh(new T.ConeGeometry(0.52 * scale, 1.2 * scale, 10), mat.tree);
    crown.position.set(x, 1.25 * scale, z);
    crown.castShadow = true;
    scene.add(crown);
    const crownTop = new T.Mesh(new T.ConeGeometry(0.38 * scale, 0.88 * scale, 10), mat.tree);
    crownTop.position.set(x, 1.92 * scale, z);
    crownTop.castShadow = true;
    scene.add(crownTop);
  }

  function lamp(x, z) {
    cylinder(0.045, 0.055, 2.7, mat.darkSteel, x, 1.35, z);
    box(0.42, 0.09, 0.12, mat.led, x + 0.17, 2.7, z);
  }

  const signTextures = new Map();
  function signTexture(title, subtitle = '') {
    const key = `${title}|${subtitle}`;
    if (signTextures.has(key)) return signTextures.get(key);
    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 192;
    const context = canvas.getContext('2d');
    context.fillStyle = '#071a26';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = '#63dbe9';
    context.lineWidth = 8;
    context.strokeRect(7, 7, canvas.width - 14, canvas.height - 14);
    context.fillStyle = '#b7df3f';
    context.fillRect(28, 31, 12, 128);
    context.fillStyle = '#ecfbff';
    context.font = '700 58px Arial';
    context.fillText(title, 67, 91);
    if (subtitle) {
      context.fillStyle = '#83b0bf';
      context.font = '500 28px Arial';
      context.fillText(subtitle, 69, 140);
    }
    const texture = new T.CanvasTexture(canvas);
    texture.colorSpace = T.SRGBColorSpace;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    signTextures.set(key, texture);
    return texture;
  }

  function addSign(title, subtitle, width, height, x, y, z, rotationY = 0, parent = scene) {
    const group = new T.Group();
    group.position.set(x, y, z);
    group.rotation.y = rotationY;
    parent.add(group);
    const material = new T.MeshBasicMaterial({ map: signTexture(title, subtitle), transparent: true, side: T.FrontSide });
    const geometry = new T.PlaneGeometry(width, height);
    const front = new T.Mesh(geometry, material);
    front.position.z = 0.008;
    group.add(front);
    const back = new T.Mesh(geometry, material);
    back.position.z = -0.008;
    back.rotation.y = Math.PI;
    group.add(back);
    return group;
  }

  function rodBetween(from, to, radius = 0.035, material = mat.steel, parent = scene) {
    const start = new T.Vector3(...from);
    const end = new T.Vector3(...to);
    const direction = end.clone().sub(start);
    const length = direction.length();
    const mesh = new T.Mesh(new T.CylinderGeometry(radius, radius, length, 8), material);
    mesh.position.copy(start).add(end).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), direction.normalize());
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function ladder(x, y, z, height, rotationY = 0, parent = scene) {
    const group = new T.Group();
    group.position.set(x, y, z);
    group.rotation.y = rotationY;
    parent.add(group);
    box(0.055, height, 0.055, mat.safety, -0.28, height / 2, 0, group);
    box(0.055, height, 0.055, mat.safety, 0.28, height / 2, 0, group);
    for (let rung = 0.18; rung < height; rung += 0.27) box(0.62, 0.045, 0.045, mat.safety, 0, rung, 0, group);
    return group;
  }

  function lifeRing(x, y, z, rotationY = 0, parent = scene) {
    const ring = new T.Mesh(new T.TorusGeometry(0.24, 0.065, 8, 24), mat.orange);
    ring.position.set(x, y, z);
    ring.rotation.y = rotationY;
    parent.add(ring);
    const stripe = new T.Mesh(new T.TorusGeometry(0.24, 0.071, 8, 4, Math.PI / 4), mat.white);
    stripe.position.copy(ring.position);
    stripe.rotation.copy(ring.rotation);
    stripe.rotation.z = Math.PI / 4;
    parent.add(stripe);
  }

  function roofVent(x, z, y, parent = scene, scale = 1) {
    cylinder(0.18 * scale, 0.18 * scale, 0.65 * scale, mat.darkSteel, x, y + 0.32 * scale, z, parent, 16);
    cylinder(0.3 * scale, 0.12 * scale, 0.22 * scale, mat.steel, x, y + 0.74 * scale, z, parent, 16);
  }

  function flange(x, y, z, rotation = 'x', radius = 0.22, parent = scene, material = mat.steel) {
    const ring = new T.Mesh(new T.TorusGeometry(radius, 0.045, 8, 18), material);
    ring.position.set(x, y, z);
    if (rotation === 'x') ring.rotation.y = Math.PI / 2;
    else if (rotation === 'z') ring.rotation.x = Math.PI / 2;
    parent.add(ring);
    return ring;
  }

  function pressureGauge(x, y, z, rotationY = 0, parent = scene) {
    const group = new T.Group();
    group.position.set(x, y, z);
    group.rotation.y = rotationY;
    parent.add(group);
    cylinder(0.035, 0.035, 0.42, mat.copper, 0, 0.21, 0, group, 10);
    const caseMesh = cylinder(0.2, 0.2, 0.09, mat.darkSteel, 0, 0.55, 0, group, 24);
    caseMesh.rotation.x = Math.PI / 2;
    const face = cylinder(0.16, 0.16, 0.012, mat.white, 0, 0.55, 0.052, group, 24);
    face.rotation.x = Math.PI / 2;
    const needle = box(0.018, 0.13, 0.012, mat.red, 0.035, 0.58, 0.064, group);
    needle.rotation.z = -0.55;
    return group;
  }

  function motorPump(x, y, z, rotationY = 0, parent = scene, unit = 'utilities') {
    const group = new T.Group();
    group.position.set(x, y, z);
    group.rotation.y = rotationY;
    parent.add(group);
    box(1.35, 0.12, 0.74, mat.safety, 0, 0.06, 0, group);
    const motor = cylinder(0.28, 0.28, 0.78, mat.airPipe, -0.28, 0.42, 0, group, 24, unit);
    motor.rotation.z = Math.PI / 2;
    for (let fin = -0.28; fin <= 0.28; fin += 0.14) box(0.04, 0.68, 0.62, mat.darkSteel, fin - 0.28, 0.42, 0, group);
    const volute = new T.Mesh(new T.TorusGeometry(0.31, 0.12, 10, 22, Math.PI * 1.65), mat.processPipe);
    volute.position.set(0.47, 0.41, 0);
    volute.rotation.x = Math.PI / 2;
    group.add(volute);
    cylinder(0.13, 0.13, 0.62, mat.processPipe, 0.83, 0.66, 0, group, 16, unit);
    flange(0.47, 0.41, -0.22, 'z', 0.18, group, mat.safety);
    rotors.push({ mesh: motor, axis: 'x', speed: 2.4 + Math.random() * 0.8 });
    return group;
  }

  function controlCabinet(x, y, z, rotationY = 0, parent = scene, scale = 1) {
    const group = new T.Group();
    group.position.set(x, y, z);
    group.rotation.y = rotationY;
    parent.add(group);
    const body = box(0.78 * scale, 1.42 * scale, 0.42 * scale, mat.cabinet, 0, 0.71 * scale, 0, group);
    addEdges(body, 0x8ec7d1, 0.26);
    box(0.29 * scale, 0.19 * scale, 0.025, mat.glass, 0, 1.05 * scale, 0.225 * scale, group);
    [-0.16, 0, 0.16].forEach((dx, index) => cylinder(0.035 * scale, 0.035 * scale, 0.025, index === 2 ? mat.red : mat.lime, dx * scale, 0.76 * scale, 0.225 * scale, group, 12));
    box(0.3 * scale, 0.035, 0.035, mat.darkSteel, 0.16 * scale, 0.48 * scale, 0.235 * scale, group);
    return group;
  }

  function instrumentPost(x, z, unit = '') {
    cylinder(0.045, 0.045, 1.8, mat.steel, x, 0.9, z, scene, 10, unit);
    const head = box(0.34, 0.26, 0.23, mat.cabinet, x, 1.72, z, scene, unit);
    addEdges(head, 0x5cdae8, 0.35);
    box(0.17, 0.08, 0.012, mat.glass, x, 1.74, z + 0.12, scene);
    const light = cylinder(0.045, 0.045, 0.08, mat.lime, x, 1.91, z, scene, 10);
    beacons.push(light);
  }

  function manhole(x, z, radius = 0.38) {
    const cover = cylinder(radius, radius, 0.045, mat.darkSteel, x, -0.055, z, scene, 28);
    for (let offset = -0.18; offset <= 0.18; offset += 0.12) box(radius * 1.45, 0.012, 0.022, mat.steel, x, -0.025, z + offset);
    return cover;
  }

  function buriedRoute(points, color, unit = '') {
    const group = new T.Group();
    group.visible = false;
    scene.add(group);
    const markerMaterial = new T.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.34,
      transparent: true,
      opacity: 0.72,
      roughness: 0.48,
      metalness: 0.22,
    });
    points.forEach((point, index) => {
      if (index === 0 || index === points.length - 1 || index < points.length - 1) {
        manhole(point[0], point[1], index === 0 || index === points.length - 1 ? 0.34 : 0.27);
      }
      if (index === points.length - 1) return;
      const next = points[index + 1];
      const dx = next[0] - point[0];
      const dz = next[1] - point[1];
      const length = Math.hypot(dx, dz);
      const angle = Math.atan2(dz, dx);
      const count = Math.max(1, Math.floor(length / 0.92));
      for (let marker = 0; marker < count; marker += 1) {
        const progress = (marker + 0.5) / count;
        const dash = box(
          Math.min(0.42, length / count * 0.48),
          0.022,
          0.065,
          markerMaterial,
          point[0] + dx * progress,
          -0.045,
          point[1] + dz * progress,
          group,
          unit,
        );
        dash.rotation.y = -angle;
        dash.castShadow = false;
      }
    });
    buriedRouteMarkers.push(group);
    return group;
  }

  function fireHydrant(x, z) {
    cylinder(0.13, 0.16, 0.62, mat.red, x, 0.29, z, scene, 18);
    cylinder(0.2, 0.13, 0.17, mat.red, x, 0.68, z, scene, 18);
    [-1, 1].forEach((side) => {
      const outlet = cylinder(0.075, 0.075, 0.2, mat.steel, x + side * 0.17, 0.46, z, scene, 14);
      outlet.rotation.z = Math.PI / 2;
    });
  }

  function roadArrow(x, z, rotationY = 0) {
    const group = new T.Group();
    group.position.set(x, -0.06, z);
    group.rotation.y = rotationY;
    scene.add(group);
    box(0.12, 0.018, 1.2, mat.white, 0, 0, 0.18, group);
    const left = box(0.12, 0.018, 0.72, mat.white, -0.22, 0, -0.55, group);
    const right = box(0.12, 0.018, 0.72, mat.white, 0.22, 0, -0.55, group);
    left.rotation.y = -0.62;
    right.rotation.y = 0.62;
  }

  function addPipe(points, material, radius = 0.13, particleColor = 0xc8fbff, particleCount = 5, unit = '') {
    const curve = new T.CatmullRomCurve3(points.map((point) => new T.Vector3(...point)));
    const tube = new T.Mesh(new T.TubeGeometry(curve, Math.max(48, points.length * 18), radius, 10, false), material);
    tube.castShadow = true;
    if (unit) {
      tube.userData.unit = unit;
      pickables.push(tube);
    }
    scene.add(tube);
    for (let i = 0; i < particleCount; i += 1) {
      const particleMat = new T.MeshBasicMaterial({ color: particleColor });
      const dot = new T.Mesh(new T.SphereGeometry(radius * 0.72, 8, 8), particleMat);
      dot.userData = { curve, phase: i / particleCount, rate: 0.055 + Math.random() * 0.025 };
      scene.add(dot);
      flowParticles.push(dot);
    }
    return tube;
  }

  function valve(x, y, z, rotationY = 0, scale = 1) {
    const group = new T.Group();
    group.position.set(x, y, z);
    group.rotation.y = rotationY;
    group.scale.setScalar(scale);
    scene.add(group);
    const ring = new T.Mesh(new T.TorusGeometry(0.27, 0.045, 8, 20), mat.red);
    ring.rotation.y = Math.PI / 2;
    group.add(ring);
    box(0.45, 0.045, 0.045, mat.red, 0, 0, 0, group);
    box(0.045, 0.45, 0.045, mat.red, 0, 0, 0, group);
  }

  function pipeSupport(x, z) {
    box(0.42, 0.08, 0.42, mat.concreteLight, x, -0.04, z - 0.65);
    box(0.42, 0.08, 0.42, mat.concreteLight, x, -0.04, z + 0.65);
    box(0.1, 3.2, 0.1, mat.steel, x, 1.6, z - 0.65);
    box(0.1, 3.2, 0.1, mat.steel, x, 1.6, z + 0.65);
    box(0.1, 0.1, 1.65, mat.steel, x, 3.15, z);
    box(0.075, 0.075, 1.55, mat.steel, x, 1.55, z);
    rodBetween([x, 0.18, z - 0.65], [x, 1.5, z + 0.65], 0.025, mat.steel);
    rodBetween([x, 0.18, z + 0.65], [x, 1.5, z - 0.65], 0.025, mat.steel);
  }

  function crossPipeSupport(x, z) {
    box(0.42, 0.08, 0.42, mat.concreteLight, x - 0.72, -0.04, z);
    box(0.42, 0.08, 0.42, mat.concreteLight, x + 0.72, -0.04, z);
    box(0.1, 3.2, 0.1, mat.steel, x - 0.72, 1.6, z);
    box(0.1, 3.2, 0.1, mat.steel, x + 0.72, 1.6, z);
    box(1.75, 0.1, 0.1, mat.steel, x, 3.15, z);
    box(1.55, 0.075, 0.075, mat.steel, x, 1.55, z);
    rodBetween([x - 0.72, 0.18, z], [x + 0.72, 1.5, z], 0.025, mat.steel);
    rodBetween([x + 0.72, 0.18, z], [x - 0.72, 1.5, z], 0.025, mat.steel);
  }

  function truck(color, phase, z) {
    const group = new T.Group();
    scene.add(group);
    box(1.55, 0.62, 0.85, color, 0, 0.56, 0, group);
    box(0.65, 0.82, 0.82, mat.white, -0.95, 0.65, 0, group);
    box(0.42, 0.3, 0.02, mat.glass, -1.28, 0.77, 0.42, group);
    [-0.75, 0.65].forEach((wheelX) => [-0.47, 0.47].forEach((wheelZ) => {
      const wheel = cylinder(0.2, 0.2, 0.12, mat.darkSteel, wheelX, 0.22, wheelZ, group, 16);
      wheel.rotation.x = Math.PI / 2;
    }));
    group.userData = { phase, z };
    vehicles.push(group);
  }

  function parkedCar(x, z, color, rotationY = 0) {
    const group = new T.Group();
    group.position.set(x, 0, z);
    group.rotation.y = rotationY;
    scene.add(group);
    box(1.7, 0.34, 0.82, color, 0, 0.35, 0, group);
    box(0.82, 0.38, 0.72, mat.glass, -0.12, 0.67, 0, group);
    [-0.56, 0.56].forEach((wheelX) => [-0.43, 0.43].forEach((wheelZ) => {
      const wheel = cylinder(0.14, 0.14, 0.1, mat.rubber, wheelX, 0.18, wheelZ, group, 14);
      wheel.rotation.x = Math.PI / 2;
    }));
    box(0.04, 0.08, 0.52, mat.red, 0.86, 0.38, 0, group);
    box(0.04, 0.08, 0.52, mat.led, -0.86, 0.38, 0, group);
    return group;
  }

  function securityCamera(x, z, rotationY = 0) {
    const group = new T.Group();
    group.position.set(x, 0, z);
    group.rotation.y = rotationY;
    scene.add(group);
    cylinder(0.035, 0.045, 2.5, mat.darkSteel, 0, 1.25, 0, group, 10);
    box(0.35, 0.18, 0.18, mat.white, 0.16, 2.48, 0, group);
    cylinder(0.07, 0.07, 0.12, mat.glass, 0.36, 2.48, 0, group, 14);
    box(0.28, 0.035, 0.08, mat.darkSteel, 0.02, 2.34, 0, group);
  }

  function worker(x, y, z, rotationY = 0, parent = scene, vest = mat.orange) {
    const group = new T.Group();
    group.position.set(x, y, z);
    group.rotation.y = rotationY;
    parent.add(group);
    cylinder(0.09, 0.1, 0.62, mat.darkSteel, -0.13, 0.32, 0, group, 10);
    cylinder(0.09, 0.1, 0.62, mat.darkSteel, 0.13, 0.32, 0, group, 10);
    cylinder(0.22, 0.18, 0.62, vest, 0, 0.86, 0, group, 12);
    rodBetween([-0.2, 0.95, 0], [-0.38, 0.56, 0.08], 0.055, vest, group);
    rodBetween([0.2, 0.95, 0], [0.38, 0.56, -0.08], 0.055, vest, group);
    const head = new T.Mesh(new T.SphereGeometry(0.16, 12, 10), mat.copper);
    head.position.set(0, 1.29, 0);
    group.add(head);
    cylinder(0.2, 0.16, 0.12, mat.safety, 0, 1.47, 0, group, 14);
    box(0.36, 0.055, 0.12, mat.safety, 0, 1.42, 0.11, group);
    box(0.34, 0.08, 0.025, mat.lime, 0, 0.84, 0.2, group);
    return group;
  }

  /* Site, roads and perimeter */
  const ground = box(56, 0.18, 38, mat.ground, 0, -0.42, 0);
  ground.receiveShadow = true;
  box(45, 0.2, 27, mat.slab, 0, -0.25, 0);
  box(52, 0.08, 4.2, mat.road, 0, -0.12, 16);
  box(52, 0.08, 4.2, mat.road, 0, -0.12, -16);
  box(4.2, 0.08, 28, mat.road, -25, -0.12, 0);
  box(4.2, 0.08, 28, mat.road, 25, -0.12, 0);
  for (let x = -23; x <= 23; x += 3.2) {
    box(1.4, 0.015, 0.08, mat.white, x, -0.065, 16);
    box(1.4, 0.015, 0.08, mat.white, x, -0.065, -16);
  }
  for (let z = -12; z <= 12; z += 3.2) {
    box(0.08, 0.015, 1.4, mat.white, -25, -0.065, z);
    box(0.08, 0.015, 1.4, mat.white, 25, -0.065, z);
  }
  for (let x = -22; x <= 22; x += 3.8) {
    box(0.06, 1.35, 0.06, mat.steel, x, 0.42, -13.5);
    box(0.06, 1.35, 0.06, mat.steel, x, 0.42, 13.5);
  }
  for (let x = -22; x <= 22; x += 5.5) {
    addTree(x, 12.4, 0.82);
    addTree(x + 1.7, -12.5, 0.75);
  }
  [-20, -10, 0, 10, 20].forEach((x) => { lamp(x, 14.2); lamp(x, -14.2); });
  truck(mat.red, 0.08, 15.5);
  truck(mat.processPipe, 0.58, -15.5);

  /* Perimeter fencing, access control and civic-scale site details */
  box(45, 0.06, 1.3, mat.grass, 0, -0.17, 12.65);
  box(45, 0.06, 1.3, mat.grass, 0, -0.17, -12.65);
  [-13.5, 13.5].forEach((z) => {
    box(45, 0.045, 0.045, mat.steel, 0, 0.42, z);
    box(45, 0.045, 0.045, mat.steel, 0, 0.92, z);
  });
  [-22.5, 22.5].forEach((x) => {
    for (let z = -12; z <= 12; z += 3.2) box(0.06, 1.35, 0.06, mat.steel, x, 0.42, z);
    box(0.045, 0.045, 25.5, mat.steel, x, 0.42, 0);
    box(0.045, 0.045, 25.5, mat.steel, x, 0.92, 0);
  });
  for (let x = -21.5; x <= 21.5; x += 2.2) {
    rodBetween([x, 0.45, -13.5], [x + 1.1, 0.92, -13.5], 0.018, mat.steel);
    rodBetween([x + 1.1, 0.45, -13.5], [x, 0.92, -13.5], 0.018, mat.steel);
  }

  const controlCenter = building(18.1, 9.55, 6.2, 4.3, 2.65, mat.roof, 'utilities');
  addSign('CONTROL CENTER', 'SCADA / LAB / DISPATCH', 3.45, 0.86, 0, 1.86, 2.22, 0, controlCenter);
  roofVent(-1.7, -0.8, 2.74, controlCenter, 0.9);
  roofVent(1.7, -0.8, 2.74, controlCenter, 0.9);
  controlCabinet(-2.2, 0, -1.35, 0, controlCenter, 0.75);
  const antennaMast = cylinder(0.045, 0.055, 2.7, mat.steel, 2.35, 4.0, -0.7, controlCenter, 12);
  for (let y = 3.2; y <= 4.8; y += 0.4) box(0.58, 0.03, 0.03, mat.steel, 2.35, y, -0.7, controlCenter);
  const antennaDish = new T.Mesh(new T.SphereGeometry(0.34, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat.white);
  antennaDish.scale.y = 0.3;
  antennaDish.rotation.z = -0.7;
  antennaDish.position.set(2.6, 4.45, -0.7);
  controlCenter.add(antennaDish);
  antennaMast.castShadow = true;

  box(9.5, 0.08, 3.8, mat.road, 7.5, -0.12, 10.25);
  for (let x = 3.8; x <= 11.2; x += 1.85) {
    box(0.055, 0.018, 3.35, mat.white, x, -0.065, 10.25);
  }
  parkedCar(4.7, 10.3, mat.red, Math.PI / 2);
  parkedCar(6.6, 10.3, mat.airPipe, Math.PI / 2);
  parkedCar(8.5, 10.3, mat.white, Math.PI / 2);
  parkedCar(10.4, 10.3, mat.processPipe, Math.PI / 2);

  const guard = building(-21.1, 9.7, 2.5, 2.4, 1.9, mat.roof, 'headworks');
  addSign('ENTRY', 'AUTHORIZED VEHICLES', 1.55, 0.52, 0, 1.32, 1.24, 0, guard);
  cylinder(0.12, 0.14, 2.3, mat.safety, -19.2, 1.05, 12.5, scene, 14);
  const barrier = box(4.5, 0.09, 0.12, mat.white, -17.05, 2.1, 12.5);
  barrier.rotation.z = -0.18;
  for (let stripe = -1.6; stripe <= 1.6; stripe += 0.8) box(0.34, 0.11, 0.13, mat.red, -17.05 + stripe, 2.1 + stripe * -0.18, 12.5);
  securityCamera(-20.1, 12.2, -0.3);
  securityCamera(20.6, -12.2, Math.PI);

  const substation = new T.Group();
  substation.position.set(-18.4, 0, -9.1);
  scene.add(substation);
  box(6.2, 0.12, 4.2, mat.concreteDark, 0, -0.02, 0, substation, 'utilities');
  railing(-2.95, -1.9, 2.95, -1.9, 1.38, substation);
  railing(-2.95, 1.9, 2.95, 1.9, 1.38, substation);
  [-1.55, 1.55].forEach((x) => {
    box(1.65, 1.55, 1.35, mat.cabinet, x, 0.77, 0, substation, 'utilities');
    for (let fin = -0.58; fin <= 0.58; fin += 0.19) box(0.035, 1.28, 1.48, mat.steel, x + fin, 0.77, 0, substation);
    cylinder(0.09, 0.09, 0.75, mat.copper, x - 0.45, 1.92, 0, substation, 12);
    cylinder(0.09, 0.09, 0.75, mat.copper, x, 1.92, 0, substation, 12);
    cylinder(0.09, 0.09, 0.75, mat.copper, x + 0.45, 1.92, 0, substation, 12);
  });
  addSign('SUBSTATION', '10 kV / MCC', 2.6, 0.66, 0, 2.45, 1.93, 0, substation);

  [-17, -8, 2, 14].forEach((x) => manhole(x, 11.95));
  [-13, -2, 9, 19].forEach((x) => manhole(x, -11.95, 0.3));
  [-13, 0, 13].forEach((x) => roadArrow(x, 16, Math.PI / 2));
  [-13, 0, 13].forEach((x) => roadArrow(x, -16, -Math.PI / 2));
  fireHydrant(-8.5, 11.9);
  fireHydrant(5.8, -12);
  fireHydrant(19.8, 5.8);

  /* Headworks */
  const head = new T.Group();
  head.position.set(-16, 0, 2);
  scene.add(head);
  box(5.5, 0.18, 7.1, mat.concreteDark, 0, -0.08, 0, head, 'headworks');
  [-1.3, 0, 1.3].forEach((x) => {
    box(0.92, 0.58, 5.8, mat.concrete, x, 0.25, 0, head, 'headworks');
    const channel = box(0.72, 0.08, 5.45, mat.waterDark, x, 0.59, 0, head, 'headworks');
    waterSurfaces.push({ mesh: channel, baseY: 0.59, phase: Math.random() * 6, amplitude: 0.013 });
  });
  for (let lane = -1; lane <= 1; lane += 1) {
    for (let z = -1.6; z <= 1.6; z += 0.25) {
      const screen = box(0.055, 1.15, 0.055, mat.darkSteel, lane * 1.3 - 0.15, 0.95, z, head, 'headworks');
      screen.rotation.z = -0.22;
    }
  }
  box(5.2, 0.13, 0.72, mat.safety, 0, 1.18, -0.7, head);
  railing(-2.6, -1.05, 2.6, -1.05, 1.75, head);
  railing(-2.6, -0.35, 2.6, -0.35, 1.75, head);
  [-2.15, 2.15].forEach((x) => cylinder(0.36, 0.36, 0.92, mat.airPipe, x, 0.45, 2.5, head, 24, 'headworks'));
  const headHouse = building(-19.2, -2.3, 3.4, 3.2, 2.3, mat.roof, 'headworks');
  stairs(-13.25, -0.2, 1);

  /* Screen rakes, grit classifier, odor control and lifting equipment */
  addSign('HEADWORKS', 'SCREENING / GRIT REMOVAL', 2.4, 0.66, 0, 1.62, 1.66, 0, headHouse);
  roofVent(-0.8, -0.5, 2.4, headHouse, 0.72);
  roofVent(0.8, -0.5, 2.4, headHouse, 0.72);
  [-1.3, 0, 1.3].forEach((x) => {
    box(0.78, 0.08, 1.15, mat.grating, x, 1.12, -2.25, head, 'headworks');
    box(0.78, 0.08, 1.15, mat.grating, x, 1.12, 2.25, head, 'headworks');
    const rakeMotor = cylinder(0.18, 0.18, 0.52, mat.orange, x, 1.72, -1.75, head, 18, 'headworks');
    rakeMotor.rotation.z = Math.PI / 2;
    box(0.12, 1.05, 0.18, mat.steel, x, 1.2, -1.55, head);
  });
  const screenConveyor = cylinder(0.2, 0.2, 4.6, mat.darkSteel, 0, 1.58, -2.55, head, 22, 'headworks');
  screenConveyor.rotation.z = Math.PI / 2;
  for (let x = -2.05; x <= 2.05; x += 0.42) {
    const flight = new T.Mesh(new T.TorusGeometry(0.23, 0.035, 7, 14), mat.safety);
    flight.rotation.y = Math.PI / 2;
    flight.position.set(x, 1.58, -2.55);
    head.add(flight);
  }
  rotors.push({ mesh: screenConveyor, axis: 'x', speed: 0.65 });

  const gritClassifier = new T.Group();
  gritClassifier.position.set(2.35, 0, 2.45);
  head.add(gritClassifier);
  cylinder(0.72, 0.38, 1.3, mat.concreteLight, 0, 0.66, 0, gritClassifier, 24, 'headworks');
  cylinder(0.58, 0.16, 0.72, mat.steel, 0, 1.65, 0, gritClassifier, 24, 'headworks');
  const gritMotor = cylinder(0.18, 0.18, 0.58, mat.orange, 0, 2.12, 0, gritClassifier, 18, 'headworks');
  rotors.push({ mesh: gritMotor, axis: 'y', speed: 0.9 });
  addEdges(gritClassifier.children[0], 0x9bcbd4, 0.28);
  box(1.35, 0.85, 0.9, mat.darkSteel, 3.8, 0.42, 2.45, head, 'headworks');
  box(1.18, 0.08, 0.78, mat.safety, 3.8, 0.89, 2.45, head);

  [-2.55, 2.55].forEach((x) => {
    box(0.13, 3.0, 0.13, mat.safety, x, 1.5, -3.0, head);
    box(0.13, 3.0, 0.13, mat.safety, x, 1.5, 3.0, head);
  });
  box(5.25, 0.16, 0.18, mat.safety, 0, 3.0, -3.0, head);
  box(5.25, 0.16, 0.18, mat.safety, 0, 3.0, 3.0, head);
  box(0.2, 0.18, 6.0, mat.safety, 0, 3.02, 0, head);
  const hoist = box(0.48, 0.42, 0.52, mat.orange, 0, 2.77, 0.4, head, 'headworks');
  box(0.05, 1.18, 0.05, mat.darkSteel, 0, 2.02, 0.4, head);
  const hook = new T.Mesh(new T.TorusGeometry(0.13, 0.035, 8, 16, Math.PI * 1.55), mat.darkSteel);
  hook.position.set(0, 1.45, 0.4);
  hook.rotation.z = 0.35;
  head.add(hook);
  hoist.userData = { baseZ: 0.4, phase: 0.7 };
  hoists.push(hoist);
  controlCabinet(-2.1, 0, -3.15, 0, head, 0.72);
  motorPump(-2.1, 0, 2.85, 0, head, 'headworks');
  motorPump(-0.25, 0, 2.85, 0, head, 'headworks');

  addPipe([[-20.2, 2.6, -1.0], [-20.2, 3.4, -1.0], [-16.5, 3.4, -1.0], [-16.5, 2.4, -0.2]], mat.darkSteel, 0.12, 0xa8d8df, 3, 'headworks');
  cylinder(0.56, 0.56, 3.0, mat.cabinet, -21.2, 1.45, -1.1, scene, 24, 'headworks');
  cylinder(0.68, 0.48, 0.32, mat.steel, -21.2, 3.08, -1.1, scene, 24, 'headworks');
  ladder(-20.62, 0.1, -1.1, 2.75, Math.PI / 2);

  /* Two parallel A2O trains */
  function processTrain(z, trainIndex) {
    const group = new T.Group();
    group.position.set(-1, 0, z);
    scene.add(group);
    const length = 18;
    const depth = 4.1;
    box(length, 0.18, depth, mat.concreteDark, 0, -0.05, 0, group);
    box(length, 1.05, 0.18, mat.concrete, 0, 0.44, -depth / 2, group, 'aerobic');
    box(length, 1.05, 0.18, mat.concrete, 0, 0.44, depth / 2, group, 'aerobic');
    box(0.18, 1.05, depth, mat.concrete, -length / 2, 0.44, 0, group, 'anaerobic');
    box(0.18, 1.05, depth, mat.concrete, length / 2, 0.44, 0, group, 'aerobic');
    [-5.4, -1.6].forEach((x) => box(0.16, 0.96, depth - 0.2, mat.concrete, x, 0.42, 0, group, x < -3 ? 'anaerobic' : 'aerobic'));
    const sections = [
      { x: -7.2, w: 3.35, material: mat.waterDark, unit: 'anaerobic' },
      { x: -3.5, w: 3.5, material: mat.waterDark, unit: 'anaerobic' },
      { x: 3.7, w: 10.3, material: mat.water, unit: 'aerobic' },
    ];
    sections.forEach((section) => {
      const water = box(section.w, 0.13, depth - 0.38, section.material, section.x, 0.87, 0, group, section.unit);
      waterSurfaces.push({ mesh: water, baseY: 0.87, phase: Math.random() * 6, amplitude: 0.016 });
    });
    for (let patch = 0; patch < 18; patch += 1) {
      const foam = new T.Mesh(
        new T.CircleGeometry(0.08 + Math.random() * 0.16, 10),
        new T.MeshBasicMaterial({ color: 0xd8f5f1, transparent: true, opacity: 0.18 + Math.random() * 0.16, depthWrite: false }),
      );
      foam.rotation.x = -Math.PI / 2;
      foam.position.set(-0.7 + Math.random() * 8.8, 0.955, -1.65 + Math.random() * 3.3);
      group.add(foam);
      floats.push({ mesh: foam, baseY: 0.955, phase: Math.random() * 6, drift: 0.003 + Math.random() * 0.004 });
    }
    [-7.2, -3.5].forEach((x, i) => {
      [-0.82, 0.82].forEach((localZ) => {
        const mixer = new T.Group();
        mixer.position.set(x, 1.02, localZ);
        group.add(mixer);
        box(0.07, 0.8, 0.07, mat.steel, 0, 0.2, 0, mixer);
        box(0.95, 0.06, 0.16, mat.lime, 0, 0.55, 0, mixer);
        box(0.42, 0.36, 0.42, mat.orange, 0, 0.95, 0, mixer, 'anaerobic');
        cylinder(0.16, 0.16, 0.22, mat.darkSteel, 0, 1.23, 0, mixer, 16);
        const propeller = new T.Group();
        propeller.position.set(0, -0.24, 0);
        mixer.add(propeller);
        for (let blade = 0; blade < 3; blade += 1) {
          const prop = box(0.65, 0.045, 0.16, mat.steel, 0.25, 0, 0, propeller);
          prop.rotation.y = blade * (Math.PI * 2 / 3);
        }
        mixers.push(mixer);
      });
    });
    for (let x = -0.8; x <= 8; x += 1.25) {
      box(0.06, 0.025, depth - 0.62, mat.airPipe, x, 0.72, 0, group);
      for (let localZ = -1.45; localZ <= 1.45; localZ += 0.58) {
        const diffuser = cylinder(0.16, 0.16, 0.025, mat.darkSteel, x, 0.75, localZ, group, 16, 'aerobic');
        const membrane = new T.Mesh(new T.TorusGeometry(0.13, 0.018, 6, 16), mat.airPipe);
        membrane.rotation.x = Math.PI / 2;
        membrane.position.set(x, 0.78, localZ);
        group.add(membrane);
        diffuser.castShadow = false;
      }
      for (let i = 0; i < 5; i += 1) {
        const bubble = new T.Mesh(new T.SphereGeometry(0.045 + Math.random() * 0.04, 7, 7), mat.led);
        bubble.position.set(x + (Math.random() - 0.5) * 0.35, 0.87 + Math.random() * 1.1, -1.55 + Math.random() * 3.1);
        bubble.userData = { base: bubble.position.clone(), phase: Math.random() * 8, rate: 0.42 + Math.random() * 0.75, trainIndex };
        group.add(bubble);
        bubbles.push(bubble);
      }
    }
    [-5.4, -1.6, 4.8].forEach((x) => {
      box(0.72, 0.12, depth + 0.75, mat.grating, x, 1.16, 0, group);
      for (let localZ = -1.9; localZ <= 1.9; localZ += 0.32) box(0.58, 0.025, 0.035, mat.steel, x, 1.235, localZ, group);
      railing(x - 0.35, -depth / 2 - 0.28, x - 0.35, depth / 2 + 0.28, 1.76, group);
      railing(x + 0.35, -depth / 2 - 0.28, x + 0.35, depth / 2 + 0.28, 1.76, group);
    });
    railing(-length / 2, -depth / 2 - 0.14, length / 2, -depth / 2 - 0.14, 1.55, group);
    railing(-length / 2, depth / 2 + 0.14, length / 2, depth / 2 + 0.14, 1.55, group);
    stairs(-10.1, z > 0 ? -0.9 : 0.9, 1, group);
    lifeRing(-4.6, 1.48, depth / 2 + 0.2, 0, group);
    lifeRing(4.0, 1.48, depth / 2 + 0.2, 0, group);
    addSign(`A2O TRAIN ${String(trainIndex + 1).padStart(2, '0')}`, 'ANAEROBIC / ANOXIC / AEROBIC', 3.0, 0.62, -0.1, 2.05, depth / 2 + 0.28, 0, group);

    const probe = new T.Group();
    probe.position.set(6.3, 0, depth / 2 + 0.35);
    group.add(probe);
    box(0.06, 1.75, 0.06, mat.steel, 0, 0.88, 0, probe);
    box(0.34, 0.26, 0.24, mat.cabinet, 0, 1.66, 0, probe, 'aerobic');
    box(0.18, 0.08, 0.02, mat.glass, 0, 1.69, 0.13, probe);
    box(0.04, 1.0, 0.04, mat.copper, -0.13, 0.45, -0.18, probe);
    const sensor = cylinder(0.1, 0.1, 0.28, mat.lime, -0.13, 0.12, -0.18, probe, 14, 'aerobic');
    floats.push({ mesh: sensor, baseY: 0.12, phase: trainIndex * 2.4, drift: 0.008 });

    box(0.78, 0.15, depth - 0.35, mat.concreteLight, 8.15, 0.95, 0, group, 'aerobic');
    for (let notch = -1.55; notch <= 1.55; notch += 0.25) box(0.08, 0.25, 0.08, mat.steel, 7.76, 1.09, notch, group);
    const returnPump = motorPump(-8.0, 1.08, z > 0 ? -2.75 : 2.75, z > 0 ? 0 : Math.PI, group, 'anaerobic');
    returnPump.scale.setScalar(0.62);
    return group;
  }
  processTrain(3.1, 0);
  processTrain(-3.1, 1);

  /* Blower, chemical and sludge buildings */
  const blower = building(-1, -10, 7.2, 3.4, 2.25, mat.roof, 'utilities');
  addSign('BLOWER HOUSE', '3 DUTY + 1 STANDBY', 3.4, 0.72, 0, 1.58, 1.76, 0, blower);
  for (let x = -2.65; x <= 2.65; x += 0.53) box(0.32, 0.055, 0.06, mat.darkSteel, x, 0.72, 1.75, blower);
  [-2.9, 2.9].forEach((x) => {
    roofVent(x, -0.85, 2.34, blower, 0.82);
    controlCabinet(x, 0, -1.15, Math.PI, blower, 0.62);
  });
  for (let x = -2.4; x <= 2.4; x += 1.6) {
    const fanBox = box(1.05, 0.42, 0.95, mat.airPipe, x, 2.52, 0, blower, 'utilities');
    addEdges(fanBox, 0x9cc8ff, 0.4);
    const fanRing = new T.Mesh(new T.TorusGeometry(0.31, 0.055, 8, 24), mat.darkSteel);
    fanRing.rotation.x = Math.PI / 2;
    fanRing.position.set(x, 2.76, 0);
    blower.add(fanRing);
    const fanRotor = new T.Group();
    fanRotor.position.set(x, 2.78, 0);
    blower.add(fanRotor);
    for (let blade = 0; blade < 4; blade += 1) {
      const bladeMesh = box(0.36, 0.035, 0.1, mat.steel, 0.15, 0, 0, fanRotor);
      bladeMesh.rotation.y = blade * Math.PI / 2 + 0.35;
    }
    cylinder(0.06, 0.06, 0.08, mat.orange, 0, 0.03, 0, fanRotor, 12);
    fans.push(fanRotor);
  }
  [-2.4, -0.8, 0.8, 2.4].forEach((x) => {
    cylinder(0.24, 0.24, 1.05, mat.darkSteel, x, 3.15, -0.78, blower, 18, 'utilities');
    cylinder(0.36, 0.24, 0.28, mat.steel, x, 3.81, -0.78, blower, 18);
  });
  const chemical = building(-11, -9.5, 4.8, 4.2, 2.1, mat.roof, 'utilities');
  addSign('CHEMICAL DOSING', 'PAC / CARBON / ALKALI', 2.75, 0.66, 0, 1.48, 2.16, 0, chemical);
  [-1.25, 0, 1.25].forEach((x) => {
    const tank = cylinder(0.48, 0.48, 1.45, mat.white, x, 2.84, 0.1, chemical, 24, 'utilities');
    const rimRing = new T.Mesh(new T.TorusGeometry(0.48, 0.035, 8, 24), mat.safety);
    rimRing.rotation.x = Math.PI / 2;
    rimRing.position.set(x, 3.55, 0.1);
    chemical.add(rimRing);
    tank.userData.unit = 'utilities';
    box(0.06, 1.15, 0.06, mat.glass, x + 0.5, 2.83, 0.1, chemical);
    for (let band = 2.35; band <= 3.35; band += 0.5) {
      const tankBand = new T.Mesh(new T.TorusGeometry(0.49, 0.028, 7, 22), mat.steel);
      tankBand.rotation.x = Math.PI / 2;
      tankBand.position.set(x, band, 0.1);
      chemical.add(tankBand);
    }
    ladder(x, 2.12, 0.62, 1.38, 0, chemical);
  });
  box(4.45, 0.52, 0.12, mat.concreteLight, 0, 0.25, -2.0, chemical);
  box(0.12, 0.52, 3.8, mat.concreteLight, -2.25, 0.25, -0.1, chemical);
  box(0.12, 0.52, 3.8, mat.concreteLight, 2.25, 0.25, -0.1, chemical);
  [-1.5, -0.5, 0.5, 1.5].forEach((x) => {
    motorPump(x, 0.04, -1.55, 0, chemical, 'utilities').scale.setScalar(0.38);
    cylinder(0.16, 0.16, 0.48, x < 0 ? mat.airPipe : mat.processPipe, x, 0.28, 1.5, chemical, 16, 'utilities');
  });
  addPipe([[-12.25, 3.55, -9.4], [-12.25, 4.25, -9.4], [-8.1, 4.25, -9.4], [-8.1, 2.7, -7.6]], mat.processPipe, 0.09, 0xb6ffd2, 4, 'utilities');
  const sludgeHouse = building(10, -10, 6.4, 3.8, 2.25, mat.roof, 'utilities');
  addSign('SLUDGE DEWATERING', 'CENTRIFUGE / CAKE LOADOUT', 3.6, 0.7, 0, 1.58, 1.96, 0, sludgeHouse);
  roofVent(-2.5, -0.8, 2.34, sludgeHouse, 0.85);
  roofVent(2.5, -0.8, 2.34, sludgeHouse, 0.85);
  [-1.8, 0, 1.8].forEach((x) => {
    const centrifuge = cylinder(0.34, 0.34, 1.25, mat.darkSteel, x, 2.58, 0, sludgeHouse, 20, 'utilities');
    centrifuge.rotation.z = Math.PI / 2;
    flange(x - 0.63, 2.58, 0, 'x', 0.27, sludgeHouse, mat.safety);
    flange(x + 0.63, 2.58, 0, 'x', 0.27, sludgeHouse, mat.safety);
    rotors.push({ mesh: centrifuge, axis: 'x', speed: 2.8 + Math.random() * 0.5 });
  });
  const cakeConveyor = rodBetween([12.4, 2.5, -9.7], [15.0, 1.15, -9.7], 0.31, mat.darkSteel);
  const conveyorScrew = rodBetween([12.35, 2.5, -9.7], [15.0, 1.15, -9.7], 0.11, mat.safety);
  rotors.push({ mesh: conveyorScrew, axis: 'y', speed: 1.25 });
  box(3.1, 1.35, 1.8, mat.orange, 15.5, 0.62, -9.7, scene, 'utilities');
  box(2.8, 0.1, 1.48, mat.darkSteel, 15.5, 1.33, -9.7);
  railing(13.8, -10.7, 17.2, -10.7, 1.0);
  cakeConveyor.userData.unit = 'utilities';

  const sludgeSilo = new T.Group();
  sludgeSilo.position.set(17.1, 0, -5.9);
  scene.add(sludgeSilo);
  [[-0.82, -0.72], [0.82, -0.72], [-0.82, 0.72], [0.82, 0.72]].forEach(([x, z]) => {
    box(0.16, 1.25, 0.16, mat.safety, x, 0.62, z, sludgeSilo);
    box(0.42, 0.08, 0.42, mat.concreteLight, x, -0.03, z, sludgeSilo);
  });
  const hopper = new T.Mesh(new T.ConeGeometry(1.28, 1.28, 32), mat.concreteLight);
  hopper.rotation.z = Math.PI;
  hopper.position.y = 1.35;
  hopper.castShadow = true;
  hopper.userData.unit = 'utilities';
  sludgeSilo.add(hopper);
  pickables.push(hopper);
  cylinder(1.28, 1.28, 2.55, mat.concreteLight, 0, 3.18, 0, sludgeSilo, 32, 'utilities');
  const siloRoof = new T.Mesh(new T.ConeGeometry(1.34, 0.62, 32), mat.roof);
  siloRoof.position.y = 4.76;
  siloRoof.castShadow = true;
  sludgeSilo.add(siloRoof);
  const platformRing = new T.Mesh(new T.TorusGeometry(1.42, 0.16, 8, 32), mat.grating);
  platformRing.rotation.x = Math.PI / 2;
  platformRing.position.y = 4.35;
  sludgeSilo.add(platformRing);
  for (let index = 0; index < 18; index += 1) {
    const angle = index / 18 * Math.PI * 2;
    box(0.045, 0.68, 0.045, mat.safety, Math.cos(angle) * 1.48, 4.65, Math.sin(angle) * 1.48, sludgeSilo);
  }
  const guardTop = new T.Mesh(new T.TorusGeometry(1.48, 0.04, 6, 32), mat.safety);
  guardTop.rotation.x = Math.PI / 2;
  guardTop.position.y = 4.98;
  sludgeSilo.add(guardTop);
  ladder(-1.36, 0.25, 0, 4.62, Math.PI / 2, sludgeSilo);
  box(0.06, 2.1, 0.06, mat.glass, 1.31, 3.1, 0, sludgeSilo);
  addSign('SLUDGE SILO', 'DEWATERED CAKE', 1.85, 0.58, 0, 3.3, 1.29, 0, sludgeSilo);
  addPipe([[15.9, 3.05, -6.0], [14.2, 3.05, -6.0], [14.2, 2.3, -8.8], [12.5, 2.3, -8.8]], mat.sludgePipe, 0.12, 0xffdf9f, 5, 'utilities');
  const siloDischarge = rodBetween([17.1, 1.0, -5.9], [16.1, 0.6, -7.4], 0.21, mat.darkSteel);
  siloDischarge.userData.unit = 'utilities';

  /* Clarifiers */
  function clarifier(x, z, scale = 1) {
    const group = new T.Group();
    group.position.set(x, 0, z);
    group.scale.setScalar(scale);
    scene.add(group);
    cylinder(3.05, 1.65, 1.18, mat.concrete, 0, 0.28, 0, group, 48, 'clarifier');
    const water = cylinder(2.82, 2.82, 0.12, mat.waterClean, 0, 0.91, 0, group, 48, 'clarifier');
    waterSurfaces.push({ mesh: water, baseY: 0.91, phase: Math.random() * 6, amplitude: 0.012 });
    const centerWell = cylinder(0.72, 0.72, 0.62, mat.concreteDark, 0, 1.05, 0, group, 32, 'clarifier');
    const centerWater = cylinder(0.61, 0.61, 0.06, mat.waterDark, 0, 1.38, 0, group, 32, 'clarifier');
    waterSurfaces.push({ mesh: centerWater, baseY: 1.38, phase: Math.random() * 6, amplitude: 0.009 });
    addEdges(centerWell, 0x8bbec8, 0.24);
    const scumBaffle = new T.Mesh(new T.TorusGeometry(2.43, 0.065, 8, 56), mat.darkSteel);
    scumBaffle.rotation.x = Math.PI / 2;
    scumBaffle.position.y = 1.02;
    group.add(scumBaffle);
    const launder = new T.Mesh(new T.TorusGeometry(2.72, 0.18, 10, 56), mat.concreteLight);
    launder.rotation.x = Math.PI / 2;
    launder.position.y = 1.0;
    group.add(launder);
    for (let index = 0; index < 44; index += 1) {
      const angle = index / 44 * Math.PI * 2;
      const tooth = box(0.08, 0.18, 0.2, mat.steel, Math.cos(angle) * 2.55, 1.12, Math.sin(angle) * 2.55, group);
      tooth.rotation.y = -angle;
    }
    const rimRing = new T.Mesh(new T.TorusGeometry(2.98, 0.11, 10, 48), mat.safety);
    rimRing.rotation.x = Math.PI / 2;
    rimRing.position.y = 1.08;
    rimRing.userData.unit = 'clarifier';
    pickables.push(rimRing);
    group.add(rimRing);
    const bridge = new T.Group();
    bridge.position.y = 1.24;
    group.add(bridge);
    box(5.55, 0.11, 0.54, mat.grating, 0, 0, 0, bridge, 'clarifier');
    railing(-2.75, -0.31, 2.75, -0.31, 0.6, bridge);
    railing(-2.75, 0.31, 2.75, 0.31, 0.6, bridge);
    rodBetween([-2.7, 0.22, -0.28], [0, 0.78, -0.28], 0.035, mat.safety, bridge);
    rodBetween([0, 0.78, -0.28], [2.7, 0.22, -0.28], 0.035, mat.safety, bridge);
    rodBetween([-2.7, 0.22, 0.28], [0, 0.78, 0.28], 0.035, mat.safety, bridge);
    rodBetween([0, 0.78, 0.28], [2.7, 0.22, 0.28], 0.035, mat.safety, bridge);
    for (let trussX = -2.2; trussX <= 2.2; trussX += 0.55) {
      rodBetween([trussX, 0.18, -0.28], [trussX + 0.28, 0.48 + (1 - Math.abs(trussX) / 2.8) * 0.25, -0.28], 0.024, mat.steel, bridge);
      rodBetween([trussX, 0.18, 0.28], [trussX + 0.28, 0.48 + (1 - Math.abs(trussX) / 2.8) * 0.25, 0.28], 0.024, mat.steel, bridge);
    }
    cylinder(0.38, 0.38, 0.95, mat.darkSteel, 0, -0.22, 0, bridge, 24, 'clarifier');
    box(0.66, 0.5, 0.62, mat.orange, 0, 0.43, 0, bridge, 'clarifier');
    cylinder(0.15, 0.15, 0.32, mat.darkSteel, 0, 0.83, 0, bridge, 16);
    const driveBeacon = cylinder(0.055, 0.055, 0.12, mat.lime, 0, 1.08, 0, bridge, 12);
    beacons.push(driveBeacon);
    const scraper = new T.Group();
    scraper.position.y = 0.76;
    group.add(scraper);
    box(4.95, 0.055, 0.12, mat.lime, 0, 0, 0, scraper);
    box(0.12, 0.055, 4.65, mat.lime, 0, 0, 0, scraper);
    [-2.15, -1.3, 1.3, 2.15].forEach((armX) => {
      box(0.06, 0.46, 0.06, mat.steel, armX, -0.23, 0, scraper);
      const blade = box(0.58, 0.06, 0.22, mat.rubber, armX, -0.48, 0, scraper);
      blade.rotation.z = armX < 0 ? -0.12 : 0.12;
    });
    const skimmer = box(2.15, 0.1, 0.16, mat.orange, 1.2, 0.2, 0, scraper);
    skimmer.rotation.y = 0.18;
    scrapers.push(scraper);
    ladder(-3.22, 0.05, 0.52, 1.35, Math.PI / 2, group);
    lifeRing(-2.72, 1.67, 0.35, Math.PI / 2, group);
    box(0.85, 0.82, 0.9, mat.concreteDark, 2.95, 0.48, -0.05, group, 'clarifier');
    box(0.72, 0.08, 0.72, mat.waterClean, 2.95, 0.92, -0.05, group);
    addSign('SECONDARY', 'CLARIFIER', 1.85, 0.55, 0, 2.12, -3.0, 0, group);
    return group;
  }
  clarifier(11.2, 4.1, 1);
  clarifier(11.2, -3.1, 0.92);

  /* Tertiary treatment and outlet */
  const outlet = new T.Group();
  outlet.position.set(17, 0, 1);
  scene.add(outlet);
  box(5.4, 0.2, 5.6, mat.concreteDark, 0, -0.07, 0, outlet, 'outlet');
  [-1.5, 0, 1.5].forEach((z) => {
    box(4.8, 0.78, 0.72, mat.concrete, 0, 0.31, z, outlet, 'outlet');
    const water = box(4.55, 0.1, 0.52, mat.waterClean, 0, 0.72, z, outlet, 'outlet');
    waterSurfaces.push({ mesh: water, baseY: 0.72, phase: Math.random() * 6, amplitude: 0.01 });
    for (let x = -1.7; x <= 1.7; x += 0.57) {
      box(0.045, 0.62, 0.44, mat.airPipe, x, 0.98, z, outlet, 'outlet');
      cylinder(0.055, 0.055, 0.5, mat.glass, x, 0.98, z, outlet, 12, 'outlet');
      const uvGlow = cylinder(0.025, 0.025, 0.46, mat.led, x, 0.98, z, outlet, 10);
      uvGlow.material = mat.led;
    }
  });
  box(0.78, 0.12, 5.25, mat.grating, -0.25, 1.06, 0, outlet, 'outlet');
  railing(-0.64, -2.55, -0.64, 2.55, 1.62, outlet);
  railing(0.14, -2.55, 0.14, 2.55, 1.62, outlet);
  railing(-2.5, -2.15, 2.5, -2.15, 1.3, outlet);
  railing(-2.5, 2.15, 2.5, 2.15, 1.3, outlet);
  ladder(-2.72, 0.03, -2.0, 1.25, Math.PI / 2, outlet);
  lifeRing(1.8, 1.32, -2.18, 0, outlet);
  addSign('TERTIARY', 'UV / POLISHING / REUSE', 2.85, 0.62, 0, 1.83, -2.25, 0, outlet);
  controlCabinet(2.1, 0, -2.2, 0, outlet, 0.68);

  [-2.0, 1.45].forEach((z) => {
    const filter = cylinder(0.58, 0.58, 1.72, mat.concreteLight, 2.45, 1.02, z, outlet, 28, 'outlet');
    const cap = new T.Mesh(new T.SphereGeometry(0.58, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat.steel);
    cap.scale.y = 0.42;
    cap.position.set(2.45, 1.89, z);
    outlet.add(cap);
    ladder(1.86, 0.18, z, 1.65, Math.PI / 2, outlet);
    flange(2.45, 0.65, z + 0.6, 'z', 0.17, outlet, mat.safety);
    filter.userData.unit = 'outlet';
  });

  const outfall = new T.Group();
  outfall.position.set(20.65, 0, 1.0);
  scene.add(outfall);
  box(2.0, 0.65, 2.4, mat.concreteDark, 0, 0.25, 0, outfall, 'outlet');
  const outfallWater = box(1.75, 0.08, 2.05, mat.waterClean, 0, 0.61, 0, outfall, 'outlet');
  waterSurfaces.push({ mesh: outfallWater, baseY: 0.61, phase: 1.8, amplitude: 0.012 });
  box(0.16, 1.0, 2.4, mat.concrete, 0.92, 0.35, 0, outfall, 'outlet');
  for (let drop = 0; drop < 24; drop += 1) {
    const droplet = new T.Mesh(new T.SphereGeometry(0.035 + Math.random() * 0.035, 6, 6), mat.led);
    droplet.position.set(0.83 + Math.random() * 0.2, 0.58 - Math.random() * 0.8, -0.95 + Math.random() * 1.9);
    droplet.userData = { base: droplet.position.clone(), phase: Math.random(), rate: 0.45 + Math.random() * 0.5 };
    outfall.add(droplet);
    fallingWater.push(droplet);
  }
  const qualityBadge = new T.Mesh(new T.TorusGeometry(0.48, 0.075, 12, 32), mat.lime);
  qualityBadge.rotation.y = Math.PI / 2;
  qualityBadge.position.set(2.9, 1.35, 0);
  qualityBadge.userData.unit = 'outlet';
  pickables.push(qualityBadge);
  outlet.add(qualityBadge);

  /* Organized service rack plus buried interstage conveyance */
  for (let x = -17; x <= 10; x += 3.8) pipeSupport(x, -7.2);
  for (let x = -17; x < 9.6; x += 3.8) {
    rodBetween([x, 3.18, -7.82], [x + 3.8, 3.18, -7.82], 0.035, mat.steel);
    rodBetween([x, 3.18, -6.58], [x + 3.8, 3.18, -6.58], 0.035, mat.steel);
    rodBetween([x, 1.55, -7.82], [x + 3.8, 1.55, -7.82], 0.027, mat.steel);
    rodBetween([x, 1.55, -6.58], [x + 3.8, 1.55, -6.58], 0.027, mat.steel);
    rodBetween([x, 1.58, -7.82], [x + 3.8, 3.12, -7.82], 0.024, mat.steel);
    rodBetween([x + 3.8, 1.58, -6.58], [x, 3.12, -6.58], 0.024, mat.steel);
  }
  box(27.2, 0.08, 0.42, mat.grating, -3.5, 2.03, -6.18);
  for (let x = -16.5; x <= 9.5; x += 0.48) box(0.035, 0.07, 0.56, mat.steel, x, 2.1, -6.18);

  addPipe([[-18, 2.92, -7.58], [-8, 2.92, -7.58], [0, 2.92, -7.58], [8, 2.92, -7.58]], mat.processPipe, 0.072, 0xb8ffd7, 5, 'utilities');
  addPipe([[-18, 2.58, -7.18], [-8, 2.58, -7.18], [0, 2.58, -7.18], [8, 2.58, -7.18]], mat.airPipe, 0.115, 0xc8e4ff, 7, 'utilities');
  addPipe([[-18, 2.28, -6.82], [-8, 2.28, -6.82], [0, 2.28, -6.82], [8, 2.28, -6.82]], mat.sludgePipe, 0.062, 0xffdf9f, 4, 'utilities');
  addPipe([[-1, 2.6, -8.1], [-1, 2.58, -7.18]], mat.airPipe, 0.095, 0xd2e6ff, 3, 'utilities');
  addPipe([[-8.0, 2.92, -7.58], [-8.0, 2.92, -5.55], [-7.45, 1.3, -5.3]], mat.processPipe, 0.045, 0xb8ffd7, 3, 'anaerobic');

  buriedRoute([[-13.45, 2.15], [-11.4, 2.15], [-10.25, 3.1], [-9.72, 3.1]], 0x3da66f, 'headworks');
  buriedRoute([[-13.45, 1.65], [-11.4, 1.65], [-10.25, -3.1], [-9.72, -3.1]], 0x3da66f, 'headworks');
  buriedRoute([[7.82, 3.1], [8.82, 3.1], [9.45, 4.1], [11.2, 4.1]], 0x3da66f, 'aerobic');
  buriedRoute([[7.82, -3.1], [8.82, -3.1], [9.45, -3.1], [11.2, -3.1]], 0x3da66f, 'aerobic');
  buriedRoute([[11.2, 4.1], [11.2, 8.15], [-4.8, 8.15], [-4.8, 5.2]], 0xd6933f, 'clarifier');
  buriedRoute([[11.2, -3.1], [11.2, -7.95], [-4.8, -7.95], [-4.8, -5.2]], 0xd6933f, 'clarifier');
  buriedRoute([[13.65, 3.2], [14.55, 3.2], [14.55, 1.0], [14.72, 1.0]], 0x56bccc, 'outlet');
  buriedRoute([[11.2, -3.1], [13.0, -3.1], [13.0, -6.9], [10.2, -8.15]], 0xd6933f, 'utilities');
  buriedRoute([[7.65, -7.18], [8.5, -7.18], [8.5, -3.1], [8.05, -3.1]], 0x3f83e8, 'aerobic');
  buriedRoute([[7.65, -7.18], [8.62, -7.18], [8.62, 3.1], [8.05, 3.1]], 0x3f83e8, 'aerobic');

  [[-9.65, 3.1], [-9.65, -3.1], [7.8, 3.1], [7.8, -3.1]].forEach(([x, z]) => {
    cylinder(0.105, 0.105, 0.46, mat.processPipe, x, 0.19, z, scene, 16, x < 0 ? 'headworks' : 'aerobic');
    flange(x, 0.44, z, 'z', 0.14, scene, mat.safety);
  });
  [[11.2, 4.1], [11.2, -3.1]].forEach(([x, z]) => {
    cylinder(0.1, 0.1, 0.42, mat.sludgePipe, x, 0.18, z, scene, 16, 'clarifier');
    flange(x, 0.42, z, 'z', 0.135, scene, mat.safety);
  });
  [[8.05, 3.1], [8.05, -3.1]].forEach(([x, z]) => {
    cylinder(0.075, 0.075, 0.82, mat.airPipe, x, 0.39, z, scene, 14, 'aerobic');
    flange(x, 0.82, z, 'z', 0.115, scene, mat.safety);
  });

  [-12, -4, 4].forEach((x) => valve(x, 2.92, -7.58, 0, 0.62));
  [-8, 0, 7].forEach((x) => valve(x, 2.58, -7.18, 0, 0.72));
  [-15, -9, -2, 5].forEach((x) => {
    flange(x, 2.92, -7.58, 'x', 0.13);
    pressureGauge(x + 0.22, 3.01, -7.58, 0).scale.setScalar(0.7);
  });
  [-11, -5, 2, 7].forEach((x) => flange(x, 2.58, -7.18, 'x', 0.16, scene, mat.airPipe));

  const valveStation = new T.Group();
  valveStation.position.set(4.5, 0, -5.35);
  scene.add(valveStation);
  box(3.6, 0.14, 1.55, mat.concreteDark, 0, 0, 0, valveStation, 'utilities');
  railing(-1.75, -0.7, 1.75, -0.7, 1.25, valveStation);
  railing(-1.75, 0.7, 1.75, 0.7, 1.25, valveStation);
  [-1.15, 0, 1.15].forEach((x) => {
    cylinder(0.19, 0.19, 0.75, mat.processPipe, x, 0.42, 0, valveStation, 18, 'utilities');
    const wheel = new T.Mesh(new T.TorusGeometry(0.26, 0.045, 8, 20), mat.red);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(x, 0.92, 0);
    valveStation.add(wheel);
    rotors.push({ mesh: wheel, axis: 'y', speed: 0.32 + Math.random() * 0.12 });
  });
  addSign('VALVE GALLERY', 'AIR / RAS / PROCESS', 2.4, 0.58, 0, 1.55, 0.76, 0, valveStation);

  /* Small pumps and safety details */
  [-7.8, -5.2, -2.4, 0.2, 2.8, 5.4].forEach((x) => {
    const pump = cylinder(0.22, 0.22, 0.55, mat.airPipe, x, 0.26, -6.1, scene, 20, 'utilities');
    pump.rotation.z = Math.PI / 2;
    box(0.75, 0.09, 0.62, mat.safety, x, -0.02, -6.1);
    flange(x - 0.31, 0.26, -6.1, 'x', 0.16, scene, mat.airPipe);
    flange(x + 0.31, 0.26, -6.1, 'x', 0.16, scene, mat.airPipe);
  });
  [-7.0, -1.0, 5.0].forEach((x) => {
    const skid = motorPump(x, 0.02, -5.25, 0, scene, 'utilities');
    skid.scale.setScalar(0.48);
    controlCabinet(x + 0.65, 0, -5.2, 0, scene, 0.44);
  });
  instrumentPost(-12.6, 5.35, 'headworks');
  instrumentPost(5.7, 5.4, 'aerobic');
  instrumentPost(14.2, 6.7, 'clarifier');
  instrumentPost(19.7, -2.2, 'outlet');
  ladder(-17.0, 0.05, -6.55, 3.0, Math.PI / 2);
  stairs(8.7, -6.35, -1);
  [-15.8, -4.3, 6.2, 16.4].forEach((x) => {
    box(0.14, 0.86, 0.14, mat.safety, x, 0.43, -5.85);
    box(0.32, 0.11, 0.32, mat.safety, x, 0.9, -5.85);
  });
  [-9, -1.6, 8.2, 17].forEach((x) => {
    const beacon = cylinder(0.09, 0.09, 0.18, mat.red, x, 2.75, x === 17 ? 4.1 : -10, scene, 16);
    beacons.push(beacon);
  });

  /* Plant-wide labels and orientation pylons */
  const sitePylon = new T.Group();
  sitePylon.position.set(-20.2, 0, 6.8);
  scene.add(sitePylon);
  box(3.7, 2.5, 0.32, mat.concreteDark, 0, 1.2, 0, sitePylon);
  addSign('FLOWPILOT', 'WATER RECLAMATION PLANT', 3.35, 1.0, 0, 1.55, 0.18, 0, sitePylon);
  box(3.2, 0.08, 0.48, mat.lime, 0, 0.55, 0.2, sitePylon);
  addSign('WATER LINE', 'HEADWORKS  >  A2O  >  CLARIFIER  >  REUSE', 7.6, 0.68, -0.5, 0.45, 12.9, 0, scene);
  worker(-15.2, 1.2, 0.9, 0.8);
  worker(-6.3, 1.2, 5.45, -0.4);
  worker(3.7, 1.2, -5.38, 2.3, scene, mat.lime);
  worker(11.8, 1.35, 4.05, -1.2);
  worker(18.1, 0, 6.9, 2.8, scene, mat.lime);
  worker(-1.4, 0, -7.9, -0.2);
  worker(15.0, 0, -8.3, 1.6);

  /* Camera presets and interaction */
  const cameraState = {
    target: new T.Vector3(0, 0.4, 0),
    focusTarget: new T.Vector3(0, 0.4, 0),
    radius: 31,
    radiusGoal: 31,
    height: 19,
    heightGoal: 19,
    yaw: 0.7,
    yawGoal: 0.7,
    autoRotate: true,
    runningBoost: false,
  };
  const presets = {
    isometric: { target: new T.Vector3(0, 0.4, 0), radius: 31, height: 19, yaw: 0.72 },
    detail: { target: new T.Vector3(-3.3, 0.80, -7.2), radius: 6.5, height: 4.8, yaw: 0.4 },
    process: { target: new T.Vector3(-1, 0.5, 0), radius: 23, height: 10.5, yaw: 1.52 },
    pipe: { target: new T.Vector3(0, 0.5, 0), radius: 27, height: 14.5, yaw: 0.72 },
    bird: { target: new T.Vector3(0, 0, 0), radius: 5, height: 56, yaw: 0.78 },
  };

  function setCameraView(name) {
    const preset = presets[name] || presets.isometric;
    cameraState.focusTarget.copy(preset.target);
    cameraState.radiusGoal = preset.radius;
    cameraState.heightGoal = preset.height;
    cameraState.yawGoal = preset.yaw;
    cameraState.autoRotate = name === 'isometric';
    buriedRouteMarkers.forEach((group) => { group.visible = name === 'pipe'; });
    $$('[data-camera]').forEach((button) => button.classList.toggle('active', button.dataset.camera === name));
  }

  function focus(unit) {
    const focusView = focusMap[unit] || focusMap.aerobic;
    cameraState.focusTarget.copy(focusView.target);
    cameraState.radiusGoal = focusView.radius;
    cameraState.heightGoal = focusView.height;
    cameraState.yawGoal = focusView.yaw;
    cameraState.autoRotate = false;
    buriedRouteMarkers.forEach((group) => { group.visible = false; });
    $$('[data-camera]').forEach((button) => button.classList.remove('active'));
  }

  $$('[data-camera]').forEach((button) => button.addEventListener('click', () => setCameraView(button.dataset.camera)));
  let dragging = false;
  let moved = false;
  let lastX = 0;
  let downX = 0;
  let downY = 0;
  mount.addEventListener('pointerdown', (event) => {
    dragging = true;
    moved = false;
    lastX = event.clientX;
    downX = event.clientX;
    downY = event.clientY;
    mount.setPointerCapture(event.pointerId);
  });
  mount.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const delta = event.clientX - lastX;
    cameraState.yawGoal += delta * 0.006;
    lastX = event.clientX;
    moved = moved || Math.abs(event.clientX - downX) + Math.abs(event.clientY - downY) > 5;
    cameraState.autoRotate = false;
  });
  mount.addEventListener('wheel', (event) => {
    event.preventDefault();
    cameraState.radiusGoal = clamp(cameraState.radiusGoal + event.deltaY * 0.012, 10, 39);
  }, { passive: false });

  const raycaster = new T.Raycaster();
  const pointer = new T.Vector2();
  function pick(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(pickables, false).find((item) => item.object.userData.unit);
    if (hit) selectUnit(hit.object.userData.unit);
  }
  mount.addEventListener('pointerup', (event) => {
    if (!moved) pick(event);
    dragging = false;
  });
  mount.addEventListener('pointercancel', () => { dragging = false; });

  function resize() {
    const width = mount.clientWidth || 1;
    const height = mount.clientHeight || 1;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  let lastMs = 0;
  let lastRenderMs = -100;
  function animate(ms) {
    if (state.route !== 'overview') {
      lastMs = ms;
      state.three.frame = requestAnimationFrame(animate);
      return;
    }
    const frameInterval = cameraState.runningBoost ? 24 : 33;
    if (ms && ms - lastRenderMs < frameInterval) {
      state.three.frame = requestAnimationFrame(animate);
      return;
    }
    const t = ms * 0.001;
    const delta = Math.min(0.05, (ms - lastMs) * 0.001 || 0.016);
    lastMs = ms;
    lastRenderMs = ms;
    cameraState.target.lerp(cameraState.focusTarget, 0.04);
    cameraState.radius += (cameraState.radiusGoal - cameraState.radius) * 0.045;
    cameraState.height += (cameraState.heightGoal - cameraState.height) * 0.045;
    cameraState.yaw += (cameraState.yawGoal - cameraState.yaw) * 0.05;
    if (cameraState.autoRotate) cameraState.yawGoal += delta * (cameraState.runningBoost ? 0.11 : 0.025);
    camera.position.set(
      cameraState.target.x + Math.sin(cameraState.yaw) * cameraState.radius,
      cameraState.height,
      cameraState.target.z + Math.cos(cameraState.yaw) * cameraState.radius,
    );
    camera.lookAt(cameraState.target);
    flowParticles.forEach((dot) => dot.position.copy(dot.userData.curve.getPointAt((dot.userData.phase + t * dot.userData.rate * state.speed) % 1)));
    bubbles.forEach((bubble) => {
      bubble.position.copy(bubble.userData.base);
      bubble.position.y += ((t * bubble.userData.rate * state.speed + bubble.userData.phase) % 1) * 1.15;
      const scale = 0.62 + Math.sin(t * 2.2 + bubble.userData.phase) * 0.2;
      bubble.scale.setScalar(scale);
    });
    waterSurfaces.forEach((water) => { water.mesh.position.y = water.baseY + Math.sin(t * 1.15 + water.phase) * water.amplitude; });
    floats.forEach((item) => {
      item.mesh.position.y = item.baseY + Math.sin(t * 1.4 + item.phase) * item.drift;
      item.mesh.rotation.z = Math.sin(t * 0.42 + item.phase) * 0.025;
    });
    fallingWater.forEach((drop) => {
      const fall = (drop.userData.phase + t * drop.userData.rate * state.speed) % 1;
      drop.position.copy(drop.userData.base);
      drop.position.y -= fall * 0.82;
      drop.position.x += Math.sin(t * 4 + drop.userData.phase * 8) * 0.025;
      drop.scale.y = 0.7 + fall * 1.8;
    });
    mixers.forEach((mixer, index) => { mixer.rotation.y = t * (0.42 + index * 0.012) * state.speed; });
    scrapers.forEach((scraper, index) => { scraper.rotation.y = t * (0.16 + index * 0.02) * state.speed; });
    fans.forEach((fan, index) => { fan.rotation.y = t * (1.2 + index * 0.1) * state.speed; });
    rotors.forEach((rotor) => {
      if (rotor.axis === 'x') rotor.mesh.rotateX(delta * rotor.speed * state.speed);
      else rotor.mesh.rotateY(delta * rotor.speed * state.speed);
    });
    hoists.forEach((hoist) => { hoist.position.z = hoist.userData.baseZ + Math.sin(t * 0.24 + hoist.userData.phase) * 1.45; });
    vehicles.forEach((vehicle) => {
      const progress = (vehicle.userData.phase + t * 0.018 * state.speed) % 1;
      vehicle.position.set(-24 + progress * 48, 0, vehicle.userData.z);
      vehicle.rotation.y = 0;
    });
    beacons.forEach((beacon, index) => { beacon.material.emissiveIntensity = 0.35 + Math.max(0, Math.sin(t * 3.2 + index)) * 1.4; });
    renderer.render(scene, camera);
    state.three.frame = requestAnimationFrame(animate);
  }

  state.three = {
    scene, camera,
    renderer,
    resize,
    focus,
    setView: setCameraView,
    setRunning(value) { cameraState.runningBoost = value; },
    frame: 0,
  };
  resize();
  window.FlowPilotVisuals?.enhance('overview', scene, renderer, mat);
  window.FlowPilotModels?.attach('overview', scene, camera);
  setCameraView('isometric');
  animate(0);
  window.addEventListener('resize', resize);
  // Text wrapping and panel changes can resize the mount without a window resize.
  new ResizeObserver(() => {
    if (mount.clientWidth && mount.clientHeight) resize();
  }).observe(mount);
}

function initOxidation3d() {
  const mount = $('#oxidation3d');
  if (!mount || !window.THREE) return;
  const T = window.THREE;
  const renderer = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(window.innerWidth <= 760 ? 1 : Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.24;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  mount.appendChild(renderer.domElement);

  const scene = new T.Scene();
  scene.background = new T.Color(0x06181d);
  scene.fog = new T.Fog(0x06181d, 38, 78);
  const camera = new T.PerspectiveCamera(37, 1, 0.1, 150);
  scene.add(new T.HemisphereLight(0xc8f4ef, 0x071016, 1.9));
  const sun = new T.DirectionalLight(0xe5fff8, 3.35);
  sun.position.set(-18, 28, 16);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -38;
  sun.shadow.camera.right = 38;
  sun.shadow.camera.top = 30;
  sun.shadow.camera.bottom = -30;
  scene.add(sun);
  const cyanRim = new T.PointLight(0x37d7e2, 5.2, 52);
  cyanRim.position.set(20, 10, 8);
  scene.add(cyanRim);
  const greenRim = new T.PointLight(0xa7db55, 4.1, 42);
  greenRim.position.set(-7, 8, -13);
  scene.add(greenRim);
  const warmUtility = new T.PointLight(0xffbd67, 2.4, 28);
  warmUtility.position.set(10, 7, -12);
  scene.add(warmUtility);

  const mat = {
    ground: new T.MeshStandardMaterial({ color: 0x071b1e, roughness: 0.98 }),
    slab: new T.MeshStandardMaterial({ color: 0x354d52, roughness: 0.82, metalness: 0.08 }),
    road: new T.MeshStandardMaterial({ color: 0x172a2d, roughness: 0.94 }),
    concrete: new T.MeshStandardMaterial({ color: 0x697f80, roughness: 0.74, metalness: 0.08 }),
    concreteDark: new T.MeshStandardMaterial({ color: 0x344b4e, roughness: 0.82, metalness: 0.13 }),
    concreteLight: new T.MeshStandardMaterial({ color: 0x91a3a0, roughness: 0.76 }),
    building: new T.MeshStandardMaterial({ color: 0x627c7b, roughness: 0.68 }),
    roof: new T.MeshStandardMaterial({ color: 0x327b73, roughness: 0.62, metalness: 0.2 }),
    roofWarm: new T.MeshStandardMaterial({ color: 0xb45c4d, roughness: 0.66, metalness: 0.12 }),
    water: new T.MeshPhysicalMaterial({ color: 0x209fb1, emissive: 0x076675, emissiveIntensity: 1.03, transparent: true, opacity: 0.78, roughness: 0.16, metalness: 0.05 }),
    waterAnoxic: new T.MeshPhysicalMaterial({ color: 0x237a78, emissive: 0x124f4e, emissiveIntensity: 0.72, transparent: true, opacity: 0.82, roughness: 0.22 }),
    waterClean: new T.MeshPhysicalMaterial({ color: 0x6ed9d8, emissive: 0x1b7778, emissiveIntensity: 0.9, transparent: true, opacity: 0.68, roughness: 0.1 }),
    steel: new T.MeshStandardMaterial({ color: 0x94aaad, roughness: 0.32, metalness: 0.76 }),
    darkSteel: new T.MeshStandardMaterial({ color: 0x294247, roughness: 0.42, metalness: 0.68 }),
    grating: new T.MeshStandardMaterial({ color: 0x49666a, roughness: 0.36, metalness: 0.78 }),
    safety: new T.MeshStandardMaterial({ color: 0xe2c442, emissive: 0x59480c, emissiveIntensity: 0.5, roughness: 0.45 }),
    lime: new T.MeshStandardMaterial({ color: 0xb5dc49, emissive: 0x425a10, emissiveIntensity: 0.88, roughness: 0.38 }),
    orange: new T.MeshStandardMaterial({ color: 0xe59645, emissive: 0x65360e, emissiveIntensity: 0.72, metalness: 0.38, roughness: 0.36 }),
    red: new T.MeshStandardMaterial({ color: 0xd85d59, emissive: 0x541a18, emissiveIntensity: 0.6 }),
    blue: new T.MeshStandardMaterial({ color: 0x448bea, emissive: 0x173f83, emissiveIntensity: 0.88, metalness: 0.52, roughness: 0.3 }),
    process: new T.MeshStandardMaterial({ color: 0x43aa77, emissive: 0x164c32, emissiveIntensity: 0.76, metalness: 0.48, roughness: 0.3 }),
    sludge: new T.MeshStandardMaterial({ color: 0xc77d3b, emissive: 0x552c0f, emissiveIntensity: 0.75, metalness: 0.45, roughness: 0.32 }),
    glass: new T.MeshPhysicalMaterial({ color: 0x65c8d1, emissive: 0x175a60, emissiveIntensity: 0.72, transparent: true, opacity: 0.62, roughness: 0.16 }),
    grass: new T.MeshStandardMaterial({ color: 0x244b36, roughness: 1 }),
    tree: new T.MeshStandardMaterial({ color: 0x2c5d3c, roughness: 0.95 }),
    bark: new T.MeshStandardMaterial({ color: 0x59422f, roughness: 1 }),
    white: new T.MeshStandardMaterial({ color: 0xdbe6e3, roughness: 0.68 }),
    rubber: new T.MeshStandardMaterial({ color: 0x121d1e, roughness: 0.82 }),
    led: new T.MeshBasicMaterial({ color: 0xc9fbf2 }),
    bubble: new T.MeshBasicMaterial({ color: 0x92f4ff, transparent: true, opacity: 0.7 }),
    flow: new T.MeshBasicMaterial({ color: 0xbaf6ed }),
    foam: new T.MeshBasicMaterial({ color: 0xe9ffff, transparent: true, opacity: 0.7, depthWrite: false }),
    overflow: new T.MeshBasicMaterial({ color: 0x9df7f1, transparent: true, opacity: 0.72, depthWrite: false }),
  };

  const waterSurfaces = [];
  const flowParticles = [];
  const bubbles = [];
  const aerationRipples = [];
  const aeratorRotors = [];
  const clarifierArms = [];
  const rotors = [];
  const vehicles = [];
  const beacons = [];
  const foamPatches = [];
  const aeratorSpray = [];
  const overflowDrops = [];
  const pickables = [];
  const focusMap = {
    headworks: { target: new T.Vector3(-21.5, 0.8, 0), radius: 13, height: 8.5, yaw: -1.0 },
    selector: { target: new T.Vector3(-15.1, 0.7, 0), radius: 11, height: 7.2, yaw: 0.75 },
    ditch: { target: new T.Vector3(0, 0.65, 0), radius: 22, height: 11.5, yaw: 1.45 },
    clarifier: { target: new T.Vector3(15.2, 0.7, 0), radius: 17, height: 10.5, yaw: 0.82 },
    sludge: { target: new T.Vector3(8.5, 1.0, -11.8), radius: 17, height: 9.2, yaw: 2.85 },
    outlet: { target: new T.Vector3(23, 0.7, 2.8), radius: 14, height: 8.8, yaw: 1.22 },
  };

  function box(w, h, d, material, x, y, z, parent = scene, unit = '') {
    const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = h > 0.16;
    mesh.receiveShadow = true;
    if (unit) {
      mesh.userData.unit = unit;
      pickables.push(mesh);
    }
    parent.add(mesh);
    return mesh;
  }

  function cylinder(radiusTop, radiusBottom, height, material, x, y, z, parent = scene, segments = 28, unit = '') {
    const mesh = new T.Mesh(new T.CylinderGeometry(radiusTop, radiusBottom, height, segments), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (unit) {
      mesh.userData.unit = unit;
      pickables.push(mesh);
    }
    parent.add(mesh);
    return mesh;
  }

  function sphere(radius, material, x, y, z, parent = scene, segments = 12) {
    const mesh = new T.Mesh(new T.SphereGeometry(radius, segments, Math.max(6, segments / 2)), material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }

  function torus(radius, tube, material, x, y, z, parent = scene, segments = 36) {
    const mesh = new T.Mesh(new T.TorusGeometry(radius, tube, 8, segments), material);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function addEdges(mesh, color = 0x9adfd8, opacity = 0.24) {
    const edges = new T.LineSegments(new T.EdgesGeometry(mesh.geometry), new T.LineBasicMaterial({ color, transparent: true, opacity }));
    mesh.add(edges);
    return edges;
  }

  function pipe(points, radius, material, unit = '', parent = scene) {
    const curve = new T.CatmullRomCurve3(points.map(([x, y, z]) => new T.Vector3(x, y, z)), false, 'catmullrom', 0.12);
    const mesh = new T.Mesh(new T.TubeGeometry(curve, Math.max(12, points.length * 10), radius, 10, false), material);
    mesh.castShadow = true;
    if (unit) {
      mesh.userData.unit = unit;
      pickables.push(mesh);
    }
    parent.add(mesh);
    return mesh;
  }

  function transferRoute(points, color, particleCount = 10, rate = 0.055) {
    const curve = new T.CatmullRomCurve3(points.map(([x, y, z]) => new T.Vector3(x, y, z)), false, 'catmullrom', 0.08);
    const guideMaterial = new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.24, depthWrite: false });
    const guide = new T.Mesh(new T.TubeGeometry(curve, Math.max(24, points.length * 12), 0.024, 5, false), guideMaterial);
    guide.renderOrder = 2;
    scene.add(guide);
    const particleMaterial = new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.94, depthWrite: false });
    for (let i = 0; i < particleCount; i += 1) {
      const dot = sphere(i % 4 === 0 ? 0.075 : 0.047, particleMaterial, 0, 0, 0, scene, 8);
      dot.renderOrder = 3;
      dot.userData = { curve, phase: i / particleCount, rate, openRoute: true };
      flowParticles.push(dot);
    }
    return curve;
  }

  function capsulePath(half, radius) {
    const path = new T.Path();
    path.moveTo(-half, -radius);
    path.lineTo(half, -radius);
    path.absarc(half, 0, radius, -Math.PI / 2, Math.PI / 2, false);
    path.lineTo(-half, radius);
    path.absarc(-half, 0, radius, Math.PI / 2, Math.PI * 1.5, false);
    path.closePath();
    return path;
  }

  function capsuleShape(half, radius) {
    const shape = new T.Shape();
    shape.moveTo(-half, -radius);
    shape.lineTo(half, -radius);
    shape.absarc(half, 0, radius, -Math.PI / 2, Math.PI / 2, false);
    shape.lineTo(-half, radius);
    shape.absarc(-half, 0, radius, Math.PI / 2, Math.PI * 1.5, false);
    shape.closePath();
    return shape;
  }

  function capsuleRing(half, outerRadius, innerRadius) {
    const shape = capsuleShape(half, outerRadius);
    shape.holes.push(capsulePath(half, innerRadius));
    return shape;
  }

  function horizontalShape(shape, material, x, y, z, depth = 0, unit = '') {
    const geometry = depth > 0
      ? new T.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 28 })
      : new T.ShapeGeometry(shape, 28);
    const mesh = new T.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    mesh.castShadow = depth > 0.08;
    if (unit) {
      mesh.userData.unit = unit;
      pickables.push(mesh);
    }
    scene.add(mesh);
    return mesh;
  }

  function capsuleCurve(cx, cz, half, radius, reverse = false) {
    const points = [];
    const straightSamples = 16;
    const arcSamples = 22;
    for (let i = 0; i <= straightSamples; i += 1) points.push(new T.Vector3(cx - half + (i / straightSamples) * half * 2, 0.86, cz - radius));
    for (let i = 1; i <= arcSamples; i += 1) {
      const angle = -Math.PI / 2 + (i / arcSamples) * Math.PI;
      points.push(new T.Vector3(cx + half + Math.cos(angle) * radius, 0.86, cz + Math.sin(angle) * radius));
    }
    for (let i = 1; i <= straightSamples; i += 1) points.push(new T.Vector3(cx + half - (i / straightSamples) * half * 2, 0.86, cz + radius));
    for (let i = 1; i <= arcSamples; i += 1) {
      const angle = Math.PI / 2 + (i / arcSamples) * Math.PI;
      points.push(new T.Vector3(cx - half + Math.cos(angle) * radius, 0.86, cz + Math.sin(angle) * radius));
    }
    if (reverse) points.reverse();
    return new T.CatmullRomCurve3(points, true, 'catmullrom', 0.05);
  }

  function railing(x1, z1, x2, z2, y = 1.32, parent = scene, material = mat.safety) {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const length = Math.hypot(dx, dz);
    const group = new T.Group();
    group.position.set(x1, 0, z1);
    group.rotation.y = -Math.atan2(dz, dx);
    parent.add(group);
    box(length, 0.05, 0.05, material, length / 2, y, 0, group);
    box(length, 0.04, 0.04, material, length / 2, y - 0.34, 0, group);
    const count = Math.max(2, Math.ceil(length / 1.15));
    for (let i = 0; i <= count; i += 1) box(0.045, 0.7, 0.045, material, (i / count) * length, y - 0.35, 0, group);
    return group;
  }

  function stairs(x, z, direction = 1, parent = scene) {
    const group = new T.Group();
    group.position.set(x, 0, z);
    parent.add(group);
    for (let i = 0; i < 6; i += 1) box(0.82, 0.11, 0.32, mat.grating, direction * i * 0.28, 0.08 + i * 0.15, 0, group);
    railing(0, -0.47, direction * 1.55, -0.47, 1.25, group);
    railing(0, 0.47, direction * 1.55, 0.47, 1.25, group);
    return group;
  }

  function addSign(title, subtitle, width, height, x, y, z, rotationY = 0, parent = scene) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 180;
    const context = canvas.getContext('2d');
    context.fillStyle = '#102d30';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = '#8fded4';
    context.lineWidth = 7;
    context.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
    context.fillStyle = '#eafffb';
    context.font = '600 48px Arial';
    context.textAlign = 'center';
    context.fillText(title, canvas.width / 2, 78);
    context.fillStyle = '#8fc0bc';
    context.font = '500 25px Arial';
    context.fillText(subtitle, canvas.width / 2, 128);
    const texture = new T.CanvasTexture(canvas);
    texture.colorSpace = T.SRGBColorSpace;
    const sign = new T.Mesh(new T.PlaneGeometry(width, height), new T.MeshBasicMaterial({ map: texture, transparent: false }));
    sign.position.set(x, y, z);
    sign.rotation.y = rotationY;
    parent.add(sign);
    return sign;
  }

  function building(x, z, w, d, h, roofMaterial, unit, title = '') {
    const group = new T.Group();
    group.position.set(x, 0, z);
    scene.add(group);
    box(w + 0.3, 0.16, d + 0.3, mat.concreteDark, 0, 0.03, 0, group, unit);
    const body = box(w, h, d, mat.building, 0, h / 2, 0, group, unit);
    addEdges(body, 0xa0dfd7, 0.19);
    box(w + 0.2, 0.2, d + 0.2, roofMaterial, 0, h + 0.1, 0, group, unit);
    box(0.85, 1.5, 0.1, mat.darkSteel, -w * 0.3, 0.75, d / 2 + 0.055, group);
    const windows = Math.max(2, Math.floor(w / 1.45));
    for (let i = 0; i < windows; i += 1) {
      const wx = -w / 2 + 0.72 + i * ((w - 1.44) / Math.max(1, windows - 1));
      box(0.72, 0.5, 0.07, mat.glass, wx, h * 0.62, d / 2 + 0.06, group);
      box(0.04, 0.52, 0.08, mat.steel, wx, h * 0.62, d / 2 + 0.08, group);
    }
    if (title) addSign(title, 'FLOWPILOT PROCESS ASSET', Math.min(w - 0.45, 4.3), 0.7, 0, h - 0.38, d / 2 + 0.12, 0, group);
    return group;
  }

  function tree(x, z, scale = 1) {
    cylinder(0.08 * scale, 0.11 * scale, 0.78 * scale, mat.bark, x, 0.36 * scale, z);
    const crown = new T.Mesh(new T.ConeGeometry(0.5 * scale, 1.3 * scale, 10), mat.tree);
    crown.position.set(x, 1.22 * scale, z);
    crown.castShadow = true;
    scene.add(crown);
    const crown2 = new T.Mesh(new T.ConeGeometry(0.37 * scale, 1.0 * scale, 10), mat.tree);
    crown2.position.set(x, 1.76 * scale, z);
    crown2.castShadow = true;
    scene.add(crown2);
  }

  function lamp(x, z, rotation = 0) {
    const group = new T.Group();
    group.position.set(x, 0, z);
    group.rotation.y = rotation;
    scene.add(group);
    cylinder(0.045, 0.06, 2.3, mat.darkSteel, 0, 1.15, 0, group, 12);
    box(0.62, 0.045, 0.045, mat.darkSteel, 0.28, 2.28, 0, group);
    box(0.32, 0.09, 0.18, mat.led, 0.55, 2.2, 0, group);
  }

  function fireHydrant(x, z) {
    const group = new T.Group();
    group.position.set(x, 0, z);
    scene.add(group);
    cylinder(0.11, 0.14, 0.55, mat.red, 0, 0.31, 0, group, 14);
    cylinder(0.16, 0.16, 0.08, mat.red, 0, 0.57, 0, group, 14);
    sphere(0.13, mat.red, 0, 0.68, 0, group, 12);
    const nozzle = cylinder(0.065, 0.065, 0.34, mat.steel, 0, 0.46, 0, group, 12);
    nozzle.rotation.z = Math.PI / 2;
  }

  function cctvMast(x, z, rotation = 0) {
    const group = new T.Group();
    group.position.set(x, 0, z);
    group.rotation.y = rotation;
    scene.add(group);
    cylinder(0.045, 0.06, 2.65, mat.darkSteel, 0, 1.33, 0, group, 10);
    box(0.55, 0.05, 0.05, mat.darkSteel, 0.24, 2.58, 0, group);
    box(0.34, 0.2, 0.2, mat.white, 0.52, 2.52, 0, group);
    box(0.07, 0.08, 0.08, mat.glass, 0.71, 2.52, 0, group);
  }

  function sampleStation(x, z, unit) {
    const group = new T.Group();
    group.position.set(x, 0, z);
    scene.add(group);
    box(0.72, 0.92, 0.42, mat.darkSteel, 0, 0.48, 0, group, unit);
    addEdges(group.children[0], 0x82ded7, 0.32);
    box(0.48, 0.3, 0.04, mat.glass, 0, 0.63, 0.23, group);
    sphere(0.045, mat.lime, -0.17, 0.84, 0.23, group, 8);
    sphere(0.045, mat.red, 0, 0.84, 0.23, group, 8);
    sphere(0.045, mat.blue, 0.17, 0.84, 0.23, group, 8);
    pipe([[0.24, 0.2, 0], [0.24, 0.04, 0.34]], 0.025, mat.process, unit, group);
    return group;
  }

  function worker(x, z, rotation = 0, vest = mat.safety) {
    const group = new T.Group();
    group.position.set(x, 0, z);
    group.rotation.y = rotation;
    scene.add(group);
    cylinder(0.12, 0.15, 0.52, vest, 0, 0.62, 0, group, 12);
    sphere(0.13, mat.white, 0, 1.02, 0, group, 12);
    cylinder(0.15, 0.12, 0.09, mat.safety, 0, 1.15, 0, group, 12);
    cylinder(0.05, 0.05, 0.48, mat.darkSteel, -0.08, 0.24, 0, group, 8);
    cylinder(0.05, 0.05, 0.48, mat.darkSteel, 0.08, 0.24, 0, group, 8);
  }

  function vehicle(z, phase, colorMaterial = mat.white) {
    const group = new T.Group();
    group.userData = { z, phase };
    scene.add(group);
    box(1.45, 0.42, 0.72, colorMaterial, 0, 0.38, 0, group);
    box(0.72, 0.38, 0.65, mat.glass, -0.12, 0.72, 0, group);
    [[-0.47, -0.39], [0.47, -0.39], [-0.47, 0.39], [0.47, 0.39]].forEach(([x, zz]) => {
      const wheel = cylinder(0.14, 0.14, 0.1, mat.rubber, x, 0.2, zz, group, 12);
      wheel.rotation.x = Math.PI / 2;
    });
    vehicles.push(group);
  }

  function instrumentPost(x, z, unit) {
    const group = new T.Group();
    group.position.set(x, 0, z);
    scene.add(group);
    cylinder(0.045, 0.045, 1.25, mat.steel, 0, 0.63, 0, group, 10, unit);
    const cabinet = box(0.42, 0.48, 0.22, mat.darkSteel, 0, 1.25, 0, group, unit);
    addEdges(cabinet, 0xa8e6df, 0.32);
    sphere(0.045, mat.lime, -0.11, 1.35, 0.12, group, 10);
    sphere(0.045, mat.red, 0.11, 1.35, 0.12, group, 10);
    return group;
  }

  function valve(x, y, z, material = mat.process, parent = scene) {
    cylinder(0.16, 0.16, 0.38, material, x, y, z, parent, 18);
    const wheel = new T.Mesh(new T.TorusGeometry(0.23, 0.04, 8, 20), mat.red);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(x, y + 0.36, z);
    parent.add(wheel);
    rotors.push({ mesh: wheel, axis: 'y', speed: 0.2 });
  }

  function aerator(x, z, active, unit = 'ditch') {
    const group = new T.Group();
    group.position.set(x, 0, z);
    scene.add(group);
    box(0.82, 0.13, 2.75, mat.grating, 0, 1.12, 0, group, unit);
    railing(-0.38, -1.3, -0.38, 1.3, 1.82, group);
    railing(0.38, -1.3, 0.38, 1.3, 1.82, group);
    box(0.62, 0.52, 0.72, active ? mat.lime : mat.orange, 0, 1.53, 0, group, unit);
    box(0.36, 0.22, 0.44, mat.darkSteel, 0, 1.91, 0, group);
    const rotor = new T.Group();
    rotor.position.set(0, 0.74, 0);
    group.add(rotor);
    const shaft = cylinder(0.075, 0.075, 2.5, mat.steel, 0, 0, 0, rotor, 14);
    shaft.rotation.x = Math.PI / 2;
    [-0.86, -0.43, 0, 0.43, 0.86].forEach((offset) => {
      const disk = new T.Mesh(new T.TorusGeometry(0.42, 0.055, 8, 24), active ? mat.lime : mat.orange);
      disk.position.z = offset;
      rotor.add(disk);
      for (let i = 0; i < 6; i += 1) {
        const angle = (i / 6) * Math.PI * 2;
        const paddle = box(0.3, 0.07, 0.055, mat.steel, Math.cos(angle) * 0.38, Math.sin(angle) * 0.38, offset, rotor);
        paddle.rotation.z = angle;
      }
    });
    if (active) aeratorRotors.push({ mesh: rotor, speed: 1.45 + Math.random() * 0.22 });
    if (active) {
      [0, 0.5].forEach((phase) => {
        const rippleMaterial = new T.MeshBasicMaterial({ color: 0xbdf8ff, transparent: true, opacity: 0.45, depthWrite: false });
        const ripple = torus(0.24, 0.012, rippleMaterial, x, 0.93, z, scene, 28);
        ripple.userData.phase = phase;
        aerationRipples.push(ripple);
      });
      for (let i = 0; i < 18; i += 1) {
        const lane = i % 3;
        const longitudinal = -1.15 + (i / 17) * 2.3;
        const lateral = (lane - 1) * 0.27 + Math.sin(i * 2.17) * 0.08;
        const foamMaterial = mat.foam.clone();
        foamMaterial.opacity = 0.44 + (i % 4) * 0.08;
        const patch = sphere(0.075 + (i % 3) * 0.018, foamMaterial, x + lateral, 0.965, z + longitudinal, scene, 8);
        patch.scale.set(1.4 + (i % 2) * 0.45, 0.22, 0.78 + (i % 3) * 0.14);
        patch.userData = { phase: i * 0.41 + x * 0.08 + z * 0.03, baseScale: patch.scale.clone(), baseX: patch.position.x };
        foamPatches.push(patch);
      }
      for (let i = 0; i < 14; i += 1) {
        const sprayMaterial = mat.overflow.clone();
        sprayMaterial.opacity = 0.64;
        const droplet = sphere(0.024 + (i % 3) * 0.006, sprayMaterial, x, 0.98, z, scene, 7);
        droplet.userData = {
          originX: x,
          originZ: z,
          phase: i / 14,
          angle: (i / 14) * Math.PI * 2 + Math.sin(i * 1.7) * 0.35,
          spread: 0.55 + (i % 4) * 0.12,
          rate: 0.46 + (i % 3) * 0.05,
        };
        aeratorSpray.push(droplet);
      }
    }
    const beaconMaterial = mat.red.clone();
    const beacon = cylinder(0.06, 0.06, 0.13, beaconMaterial, 0.26, 2.07, 0, group, 12);
    beacons.push(beacon);
    return group;
  }

  function addDitch(zCenter, lineIndex) {
    const half = 6.75;
    const outer = 4.72;
    const inner = 1.72;
    horizontalShape(capsuleRing(half, outer, inner), mat.concreteDark, 0, 0.14, zCenter, 0.34, 'ditch');
    horizontalShape(capsuleRing(half, 4.78, 4.32), mat.concreteLight, 0, 0.43, zCenter, 0.76, 'ditch');
    horizontalShape(capsuleRing(half, 2.14, 1.68), mat.concreteLight, 0, 0.43, zCenter, 0.76, 'ditch');
    const water = horizontalShape(capsuleRing(half, 4.3, 2.16), lineIndex ? mat.water : mat.waterAnoxic, 0, 0.87, zCenter, 0, 'ditch');
    waterSurfaces.push({ mesh: water, baseY: 0.87, phase: lineIndex * 1.3, amplitude: 0.018 });
    horizontalShape(capsuleShape(half, 1.63), mat.grass, 0, 0.5, zCenter, 0.12);
    horizontalShape(capsuleRing(half, 1.6, 1.28), mat.sludge, 0, 0.63, zCenter, 0);
    box(11.7, 0.08, 0.48, mat.grating, 0, 0.71, zCenter, scene, 'ditch');
    railing(-5.85, zCenter - 0.25, 5.85, zCenter - 0.25, 1.18, scene, mat.steel);
    railing(-5.85, zCenter + 0.25, 5.85, zCenter + 0.25, 1.18, scene, mat.steel);
    [-4.8, -1.6, 1.6, 4.8].forEach((x, index) => {
      box(0.72, 0.055, 0.36, index % 2 ? mat.safety : mat.darkSteel, x, 0.78, zCenter);
      cylinder(0.055, 0.055, 0.78, mat.steel, x, 1.05, zCenter + (index % 2 ? 0.45 : -0.45), scene, 10);
      sphere(0.07, index % 2 ? mat.lime : mat.blue, x, 1.46, zCenter + (index % 2 ? 0.45 : -0.45), scene, 10);
    });
    const flowCurve = capsuleCurve(0, zCenter, half, 3.23, Boolean(lineIndex));
    const guide = new T.Mesh(new T.TubeGeometry(flowCurve, 180, 0.018, 5, true), new T.MeshBasicMaterial({ color: lineIndex ? 0x7debdc : 0x59cdd6, transparent: true, opacity: 0.36 }));
    scene.add(guide);
    for (let i = 0; i < 22; i += 1) {
      const dot = sphere(i % 4 === 0 ? 0.08 : 0.055, mat.flow, 0, 0, 0, scene, 8);
      dot.userData = { curve: flowCurve, phase: i / 22, rate: 0.022 + lineIndex * 0.002 };
      flowParticles.push(dot);
    }
    for (let i = 0; i < 12; i += 1) {
      const t = (i + 0.5) / 12;
      const point = flowCurve.getPointAt(t);
      const tangent = flowCurve.getTangentAt(t).normalize();
      const arrow = new T.Mesh(new T.ConeGeometry(0.09, 0.32, 4), i % 3 === 0 ? mat.lime : mat.flow);
      arrow.position.copy(point);
      arrow.position.y = 0.91;
      arrow.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), tangent);
      scene.add(arrow);
    }
    [-5.4, 5.4].forEach((x) => {
      [-1, 1].forEach((side) => {
        const z = zCenter + side * 3.22;
        box(0.72, 0.13, 2.45, mat.grating, x, 1.12, z, scene, 'ditch');
        railing(x - 0.34, z - 1.18, x - 0.34, z + 1.18, 1.8);
        railing(x + 0.34, z - 1.18, x + 0.34, z + 1.18, 1.8);
      });
    });
    const aeratorPositions = [
      [-3.7, zCenter - 3.22], [3.7, zCenter - 3.22],
      [-3.7, zCenter + 3.22], [3.7, zCenter + 3.22],
    ];
    aeratorPositions.forEach(([x, z], index) => aerator(x, z, !(lineIndex === 0 && index === 0) && !(lineIndex === 1 && index === 3)));
    const bubbleXs = [-1.4, 0.2, 1.8, 3.4, 5.0];
    bubbleXs.forEach((x, xi) => {
      [-3.18, 3.18].forEach((offset, sideIndex) => {
        box(0.78, 0.035, 0.18, mat.blue, x, 0.77, zCenter + offset);
        for (let j = 0; j < 4; j += 1) {
          const bubble = sphere(0.035 + (j % 2) * 0.014, mat.bubble, x - 0.28 + j * 0.18, 0.82, zCenter + offset + Math.sin(j) * 0.08, scene, 8);
          bubble.userData = {
            base: bubble.position.clone(),
            phase: (xi * 0.19 + sideIndex * 0.35 + j * 0.21) % 1,
            rate: 0.34 + j * 0.035,
          };
          bubbles.push(bubble);
        }
      });
    });
    [-8.4, 0, 8.4].forEach((x, index) => instrumentPost(x, zCenter + (index % 2 ? 1.34 : -1.34), 'ditch'));
    sampleStation(9.15, zCenter + (lineIndex ? 1.65 : -1.65), 'ditch').scale.setScalar(0.82);
    valve(-10.75, 0.92, zCenter + (lineIndex ? 2.2 : -2.2), mat.process);
    addSign(`CARROUSEL ${lineIndex + 1}`, lineIndex ? 'SOUTH DITCH · DO CONTROL' : 'NORTH DITCH · FLOW CONTROL', 3.8, 0.72, 0, 1.2, zCenter, lineIndex ? Math.PI : 0);
  }

  function addClarifier(x, z, index) {
    cylinder(3.25, 3.1, 0.74, mat.concrete, x, 0.4, z, scene, 48, 'clarifier');
    const clarifierWater = cylinder(2.93, 2.93, 0.09, mat.waterClean, x, 0.82, z, scene, 48, 'clarifier');
    waterSurfaces.push({ mesh: clarifierWater, baseY: 0.82, phase: index * 0.8 + 0.3, amplitude: 0.007 });
    torus(3.03, 0.13, mat.concreteLight, x, 0.96, z, scene, 48);
    torus(2.48, 0.035, mat.darkSteel, x, 0.96, z, scene, 48);
    torus(2.72, 0.045, mat.safety, x, 1.26, z, scene, 48);
    for (let i = 0; i < 36; i += 1) {
      const angle = (i / 36) * Math.PI * 2;
      const weir = box(0.15, 0.14, 0.045, mat.steel, x + Math.cos(angle) * 2.86, 0.94, z + Math.sin(angle) * 2.86);
      weir.rotation.y = -angle;
      if (i % 2 === 0) {
        const dropMaterial = mat.overflow.clone();
        const drop = sphere(0.025, dropMaterial, x + Math.cos(angle) * 2.82, 0.84, z + Math.sin(angle) * 2.82, scene, 7);
        drop.userData = { top: 0.88, phase: (i / 36 + index * 0.21) % 1, range: 0.22, baseX: drop.position.x, baseZ: drop.position.z };
        overflowDrops.push(drop);
      }
    }
    for (let i = 0; i < 18; i += 1) {
      const angle = (i / 18) * Math.PI * 2;
      box(0.04, 0.55, 0.04, mat.safety, x + Math.cos(angle) * 2.72, 1.0, z + Math.sin(angle) * 2.72);
    }
    cylinder(0.67, 0.67, 0.72, mat.concreteDark, x, 0.84, z, scene, 32, 'clarifier');
    cylinder(0.52, 0.52, 0.08, mat.waterAnoxic, x, 1.23, z, scene, 32);
    const arm = new T.Group();
    arm.position.set(x, 1.34, z);
    scene.add(arm);
    box(5.7, 0.12, 0.24, mat.grating, 0, 0, 0, arm, 'clarifier');
    railing(-2.8, -0.17, 2.8, -0.17, 0.55, arm);
    railing(-2.8, 0.17, 2.8, 0.17, 0.55, arm);
    box(2.55, 0.07, 0.07, mat.darkSteel, 1.38, -0.48, 0, arm);
    box(0.12, 0.55, 0.12, mat.darkSteel, 2.48, -0.24, 0, arm);
    [-1.55, -0.85, 0.85, 1.55].forEach((offset) => box(0.06, 0.68, 0.06, mat.darkSteel, offset, -0.28, 0, arm));
    cylinder(0.25, 0.28, 0.42, mat.lime, 0, 0.35, 0, arm, 18);
    clarifierArms.push({ mesh: arm, speed: 0.07 + index * 0.008 });
    stairs(x - 3.6, z, 1);
    instrumentPost(x + 3.55, z + 0.5, 'clarifier');
  }

  /* Site and circulation roads */
  box(60, 0.34, 36, mat.ground, 0, -0.22, 0);
  box(56, 0.16, 32, mat.slab, 0, -0.03, 0);
  box(56, 0.06, 2.2, mat.road, 0, 0.08, -14.2);
  box(56, 0.06, 2.2, mat.road, 0, 0.08, 14.2);
  box(2.3, 0.06, 30, mat.road, -27, 0.08, 0);
  box(2.3, 0.06, 30, mat.road, 27, 0.08, 0);
  box(43, 0.055, 1.65, mat.road, 5.3, 0.09, -10.6);
  box(43, 0.055, 1.45, mat.road, 5.3, 0.09, 10.8);
  for (let x = -25; x <= 25; x += 3.2) {
    box(1.25, 0.02, 0.08, mat.safety, x, 0.13, -14.2);
    box(1.25, 0.02, 0.08, mat.safety, x, 0.13, 14.2);
  }
  for (let x = -28; x <= 28; x += 2) {
    cylinder(0.035, 0.035, 1.25, mat.darkSteel, x, 0.55, -16.0, scene, 8);
    cylinder(0.035, 0.035, 1.25, mat.darkSteel, x, 0.55, 16.0, scene, 8);
  }
  box(56, 0.025, 0.035, mat.darkSteel, 0, 0.92, -16.0);
  box(56, 0.025, 0.035, mat.darkSteel, 0, 0.92, 16.0);
  [-25, -21, -17, -13, 18, 22, 26].forEach((x) => {
    tree(x, -12.8, 0.9 + (Math.abs(x) % 3) * 0.08);
    tree(x, 12.8, 0.86 + (Math.abs(x) % 4) * 0.06);
  });
  [-14, -8, -2, 4, 10, 16, 22].forEach((x) => {
    lamp(x, -13.2, Math.PI);
    lamp(x, 13.2, 0);
  });
  vehicle(-14.15, 0.08, mat.white);
  vehicle(14.15, 0.57, mat.orange);
  [-19.8, -18.1, -16.4, -14.7].forEach((x) => box(0.055, 0.018, 2.5, mat.white, x, 0.145, 8.35));
  box(7.1, 0.02, 0.055, mat.white, -17.25, 0.145, 7.1);
  box(7.1, 0.02, 0.055, mat.white, -17.25, 0.145, 9.6);
  [-24.7, -8.8, 8.8, 25.2].forEach((x, index) => fireHydrant(x, index % 2 ? 11.7 : -11.7));
  cctvMast(-26.0, -12.4, 0.55);
  cctvMast(-7.2, 12.3, -1.25);
  cctvMast(10.2, -12.5, 1.15);
  cctvMast(26.0, 12.3, -2.45);
  box(1.7, 1.35, 1.6, mat.building, -25.2, 0.73, -13.0);
  box(1.9, 0.12, 1.8, mat.roofWarm, -25.2, 1.47, -13.0);
  box(0.9, 0.48, 0.05, mat.glass, -25.2, 0.94, -12.17);
  box(4.2, 0.1, 0.1, mat.safety, -27.0, 1.05, -11.8);
  cylinder(0.1, 0.13, 1.25, mat.darkSteel, -29.0, 0.65, -11.8, scene, 12);

  /* Headworks: three screened channels and vortex grit removal */
  box(8.4, 0.14, 8.2, mat.concreteDark, -21.6, 0.03, 0, scene, 'headworks');
  [-2.25, 0, 2.25].forEach((z, index) => {
    box(7.2, 0.52, 1.48, mat.concrete, -22.1, 0.32, z, scene, 'headworks');
    box(6.7, 0.07, 1.02, mat.waterAnoxic, -22.1, 0.63, z, scene, 'headworks');
    box(7.2, 0.88, 0.16, mat.concreteLight, -22.1, 0.49, z - 0.72, scene, 'headworks');
    box(7.2, 0.88, 0.16, mat.concreteLight, -22.1, 0.49, z + 0.72, scene, 'headworks');
    const drumGroup = new T.Group();
    drumGroup.position.set(-23.5, 0.96, z);
    scene.add(drumGroup);
    const drum = cylinder(0.55, 0.55, 1.1, mat.grating, 0, 0, 0, drumGroup, 20, 'headworks');
    drum.rotation.x = Math.PI / 2;
    for (let bar = 0; bar < 8; bar += 1) {
      const angle = (bar / 8) * Math.PI * 2;
      const fin = box(0.07, 0.9, 0.06, index === 1 ? mat.lime : mat.steel, Math.cos(angle) * 0.42, Math.sin(angle) * 0.42, 0, drumGroup);
      fin.rotation.z = angle;
    }
    rotors.push({ mesh: drumGroup, axis: 'z', speed: 0.34 + index * 0.03 });
    box(0.58, 0.58, 0.62, mat.blue, -24.55, 1.08, z, scene, 'headworks');
    railing(-25.3, z - 0.82, -18.6, z - 0.82, 1.38);
  });
  [-19.0, -18.8].forEach((x, index) => {
    const z = index ? 2.2 : -2.2;
    cylinder(1.36, 1.23, 0.7, mat.concrete, x, 0.38, z, scene, 36, 'headworks');
    cylinder(1.12, 1.12, 0.08, mat.waterAnoxic, x, 0.78, z, scene, 36);
    const rake = new T.Group();
    rake.position.set(x, 0.9, z);
    scene.add(rake);
    box(2.1, 0.09, 0.14, mat.steel, 0, 0, 0, rake);
    cylinder(0.17, 0.17, 0.38, mat.orange, 0, 0.25, 0, rake, 16);
    clarifierArms.push({ mesh: rake, speed: 0.16 });
  });
  box(0.62, 0.58, 5.9, mat.darkSteel, -25.15, 1.74, 0, scene, 'headworks');
  [-2.25, 0, 2.25].forEach((z) => {
    const chute = box(0.46, 0.46, 0.92, mat.grating, -24.72, 1.4, z, scene, 'headworks');
    chute.rotation.z = -0.28;
    box(0.56, 0.16, 0.56, mat.orange, -25.17, 2.08, z);
  });
  [-24.2, -22.7].forEach((x, index) => {
    box(1.15, 0.72, 0.9, index ? mat.process : mat.orange, x, 0.42, 4.9, scene, 'headworks');
    box(1.2, 0.08, 0.95, mat.darkSteel, x, 0.83, 4.9);
  });
  sampleStation(-18.0, 0.2, 'headworks');
  [-2.25, 0, 2.25].forEach((z) => valve(-18.35, 0.88, z, mat.process));
  building(-22.0, -6.7, 6.6, 3.4, 2.75, mat.roofWarm, 'headworks', 'HEADWORKS');
  addSign('INLET WORKS', 'DRUM SCREEN · VORTEX GRIT', 4.8, 0.82, -22, 2.5, 4.05, 0);

  /* Selector and split-flow chamber */
  box(4.0, 0.72, 8.5, mat.concrete, -14.8, 0.4, 0, scene, 'selector');
  box(3.62, 0.08, 8.1, mat.waterAnoxic, -14.8, 0.8, 0, scene, 'selector');
  [-2.05, 0, 2.05].forEach((z) => box(3.75, 0.74, 0.16, mat.concreteLight, -14.8, 0.55, z, scene, 'selector'));
  [-1.05, 1.05].forEach((z, index) => {
    const mixer = new T.Group();
    mixer.position.set(-14.8, 0.96, z);
    scene.add(mixer);
    cylinder(0.11, 0.11, 0.55, mat.darkSteel, 0, 0.24, 0, mixer, 12);
    box(1.0, 0.07, 0.14, mat.lime, 0, 0, 0, mixer);
    box(0.14, 0.07, 1.0, mat.lime, 0, 0, 0, mixer);
    rotors.push({ mesh: mixer, axis: 'y', speed: 0.48 + index * 0.04 });
  });
  cylinder(1.05, 1.05, 0.75, mat.concreteDark, -12.7, 0.4, 0, scene, 30, 'selector');
  cylinder(0.82, 0.82, 0.08, mat.waterAnoxic, -12.7, 0.82, 0, scene, 30);
  [-5.05, 5.05].forEach((z) => {
    box(0.74, 0.82, 1.1, mat.darkSteel, -12.2, 0.55, z, scene, 'selector');
    box(0.45, 0.5, 0.08, mat.lime, -11.8, 1.1, z);
  });
  railing(-16.7, -4.15, -12.9, -4.15, 1.42);
  railing(-16.7, 4.15, -12.9, 4.15, 1.42);
  stairs(-16.9, 0, 1);
  instrumentPost(-13.0, 3.2, 'selector');
  [-2.05, 0, 2.05].forEach((z, index) => {
    box(0.18, 0.68, 1.42, mat.darkSteel, -13.0, 0.55, z, scene, 'selector');
    const actuator = box(0.42, 0.38, 0.42, index === 1 ? mat.lime : mat.blue, -13.0, 1.14, z, scene, 'selector');
    addEdges(actuator, 0xd6fff8, 0.25);
  });
  sampleStation(-16.25, 3.15, 'selector').scale.setScalar(0.78);
  addSign('SELECTOR', 'ANAEROBIC CONTACT · FLOW SPLIT', 3.2, 0.7, -14.8, 1.5, 4.36, 0);

  /* Twin oxidation ditches */
  addDitch(-5.15, 0);
  addDitch(5.15, 1);

  /* Clarification, RAS and sludge thickening */
  addClarifier(15.2, -5.6, 0);
  addClarifier(15.2, 0, 1);
  addClarifier(15.2, 5.6, 2);
  cylinder(2.35, 2.2, 0.78, mat.concrete, 15.8, 0.4, 10.8, scene, 42, 'sludge');
  cylinder(2.02, 2.02, 0.08, mat.waterAnoxic, 15.8, 0.85, 10.8, scene, 42);
  torus(2.16, 0.11, mat.concreteLight, 15.8, 1.0, 10.8, scene, 42);
  const thickenerArm = new T.Group();
  thickenerArm.position.set(15.8, 1.18, 10.8);
  scene.add(thickenerArm);
  box(4.0, 0.1, 0.18, mat.grating, 0, 0, 0, thickenerArm, 'sludge');
  cylinder(0.22, 0.24, 0.42, mat.orange, 0, 0.28, 0, thickenerArm, 18);
  clarifierArms.push({ mesh: thickenerArm, speed: 0.045 });
  building(13.2, -11.6, 6.3, 3.6, 2.9, mat.roofWarm, 'sludge', 'RAS / WAS');
  [-1.8, 0, 1.8].forEach((offset, index) => {
    const pump = cylinder(0.28, 0.28, 0.82, index === 2 ? mat.orange : mat.sludge, 13.2 + offset, 0.5, -9.45, scene, 20, 'sludge');
    pump.rotation.z = Math.PI / 2;
    box(1.15, 0.1, 0.8, mat.safety, 13.2 + offset, 0.02, -9.45);
    valve(13.2 + offset, 1.15, -9.45, mat.sludge);
  });
  pipe([[11.0, 1.4, -10.25], [18.8, 1.4, -10.25]], 0.14, mat.sludge, 'sludge');
  [11.8, 15.2, 18.0].forEach((x) => {
    pipe([[x, 1.4, -10.25], [x, 0.36, -10.25]], 0.09, mat.sludge, 'sludge');
  });

  /* Blower house and discrete side-rack air distribution */
  building(1.2, -12.2, 8.4, 3.9, 3.15, mat.roof, 'sludge', 'BLOWER HALL');
  [-1.5, 1.2, 3.9].forEach((x, index) => {
    box(1.9, 0.12, 1.1, mat.safety, x, 0.03, -9.65);
    cylinder(0.42, 0.42, 1.18, index === 2 ? mat.orange : mat.blue, x, 0.62, -9.65, scene, 24, 'sludge');
    torus(0.31, 0.06, mat.darkSteel, x, 0.62, -9.05, scene, 24);
    const fan = new T.Group();
    fan.position.set(x, 0.62, -9.02);
    scene.add(fan);
    for (let blade = 0; blade < 6; blade += 1) {
      const angle = (blade / 6) * Math.PI * 2;
      const fin = box(0.34, 0.08, 0.045, mat.steel, Math.cos(angle) * 0.19, Math.sin(angle) * 0.19, 0, fan);
      fin.rotation.z = angle;
    }
    if (index < 2) rotors.push({ mesh: fan, axis: 'z', speed: 2.4 + index * 0.2 });
    instrumentPost(x + 0.72, -9.4, 'sludge').scale.setScalar(0.72);
  });
  pipe([[-3.2, 2.0, -10.75], [8.8, 2.0, -10.75]], 0.13, mat.blue, 'sludge');
  [-1.8, 2.2, 6.2].forEach((x) => {
    pipe([[x, 2.0, -10.75], [x, 0.4, -10.75]], 0.085, mat.blue, 'sludge');
    valve(x, 2.25, -10.75, mat.blue);
  });
  box(13.0, 0.06, 0.72, mat.grating, 2.8, 0.12, -10.75);
  railing(-3.6, -11.1, 9.3, -11.1, 1.0, scene, mat.steel);

  /* Tertiary filtration and reuse */
  box(9.4, 0.14, 9.2, mat.concreteDark, 23.0, 0.03, 2.7, scene, 'outlet');
  const filterPositions = [[20.7, 0.4], [23.0, 0.4], [20.7, 3.2], [23.0, 3.2]];
  filterPositions.forEach(([x, z], index) => {
    box(2.0, 0.65, 2.2, mat.concrete, x, 0.38, z, scene, 'outlet');
    box(1.7, 0.07, 1.9, mat.waterClean, x, 0.76, z);
    const diskGroup = new T.Group();
    diskGroup.position.set(x, 0.9, z);
    scene.add(diskGroup);
    const shaft = cylinder(0.065, 0.065, 1.55, mat.steel, 0, 0, 0, diskGroup, 12);
    shaft.rotation.x = Math.PI / 2;
    [-0.5, -0.25, 0, 0.25, 0.5].forEach((offset) => {
      const disk = new T.Mesh(new T.CylinderGeometry(0.52, 0.52, 0.055, 24), index % 2 ? mat.lime : mat.steel);
      disk.rotation.x = Math.PI / 2;
      disk.position.z = offset;
      diskGroup.add(disk);
    });
    rotors.push({ mesh: diskGroup, axis: 'z', speed: 0.18 + index * 0.012 });
  });
  [-1.4, 0, 1.4].forEach((z) => {
    box(5.5, 0.58, 0.8, mat.concrete, 24.1, 0.34, 6.0 + z * 0.48, scene, 'outlet');
    box(5.1, 0.06, 0.5, mat.waterClean, 24.1, 0.68, 6.0 + z * 0.48);
    for (let x = 21.9; x <= 26.3; x += 0.55) box(0.035, 0.34, 0.36, mat.led, x, 0.8, 6.0 + z * 0.48);
  });
  box(8.3, 0.72, 2.4, mat.concrete, 22.9, 0.4, 9.2, scene, 'outlet');
  box(7.9, 0.08, 2.0, mat.waterClean, 22.9, 0.82, 9.2);
  railing(18.8, 8.0, 27.0, 8.0, 1.4);
  railing(18.8, 10.4, 27.0, 10.4, 1.4);
  addSign('TERTIARY', 'CLOTH FILTER · UV · REUSE', 4.7, 0.78, 23.0, 1.65, 7.35, 0);
  instrumentPost(26.6, 7.4, 'outlet');
  sampleStation(26.15, 9.15, 'outlet');
  [19.15, 20.25].forEach((x, index) => {
    cylinder(0.42, 0.46, 1.25, index ? mat.blue : mat.process, x, 0.67, 9.15, scene, 22, 'outlet');
    torus(0.34, 0.035, mat.safety, x, 1.33, 9.15, scene, 20);
    pipe([[x, 0.35, 9.15], [x, 0.2, 8.25]], 0.045, index ? mat.blue : mat.process, 'outlet');
  });

  /* Control, laboratory and electrical services */
  const admin = building(-18.8, 10.6, 7.6, 4.1, 3.25, mat.roofWarm, 'headworks', 'CONTROL LAB');
  [-2.4, -0.8, 0.8, 2.4].forEach((x) => {
    const panel = box(1.25, 0.08, 0.82, mat.glass, x, 3.48, 0, admin);
    panel.rotation.z = -0.14;
  });
  building(22.2, -11.5, 5.7, 3.7, 2.85, mat.roof, 'outlet', 'ELECTRICAL');
  [-1.6, -0.52, 0.52, 1.6].forEach((x) => {
    const cabinet = box(0.78, 1.5, 0.58, mat.darkSteel, 22.2 + x, 0.76, -9.25, scene, 'outlet');
    addEdges(cabinet, 0x81d7ce, 0.32);
    sphere(0.045, mat.lime, 22.04 + x, 1.05, -8.94, scene, 8);
  });

  /* Short visible risers, buried process transfer and safety details */
  pipe([[-25.7, 0.48, 0], [-25.0, 0.48, 0], [-25.0, 0.78, 0]], 0.16, mat.process, 'headworks');
  pipe([[-17.2, 0.44, 0], [-16.9, 0.44, 0], [-16.9, 0.8, 0]], 0.14, mat.process, 'selector');
  [-5.15, 5.15].forEach((z) => {
    pipe([[-12.0, 0.36, z], [-11.6, 0.36, z], [-11.6, 0.82, z]], 0.13, mat.process, 'ditch');
    valve(-11.58, 1.05, z, mat.process);
  });
  [-5.6, 0, 5.6].forEach((z) => {
    pipe([[11.7, 0.36, z], [12.0, 0.36, z], [12.0, 0.82, z]], 0.12, mat.process, 'clarifier');
  });
  /* Animated, mostly buried process paths show the water and sludge routes without overhead visual clutter. */
  transferRoute([[-28.0, 0.19, 0], [-25.5, 0.19, 0], [-21.8, 0.19, 0], [-17.2, 0.19, 0], [-16.6, 0.19, 0]], 0x7de8df, 12, 0.045);
  transferRoute([[-13.3, 0.2, 0], [-12.5, 0.2, -1.8], [-11.9, 0.2, -5.15], [-11.25, 0.2, -5.15]], 0x81eee1, 8, 0.052);
  transferRoute([[-13.3, 0.2, 0], [-12.5, 0.2, 1.8], [-11.9, 0.2, 5.15], [-11.25, 0.2, 5.15]], 0x81eee1, 8, 0.052);
  transferRoute([[10.4, 0.2, -5.15], [11.25, 0.2, -5.4], [12.0, 0.2, -5.6]], 0x6edbd6, 5, 0.058);
  transferRoute([[10.9, 0.2, -1.8], [11.5, 0.2, -0.6], [12.0, 0.2, 0]], 0x6edbd6, 5, 0.058);
  transferRoute([[10.4, 0.2, 5.15], [11.25, 0.2, 5.4], [12.0, 0.2, 5.6]], 0x6edbd6, 5, 0.058);
  transferRoute([[18.2, 0.19, -5.4], [18.7, 0.19, -2.5], [18.9, 0.19, 1.2], [19.4, 0.19, 2.4], [20.0, 0.19, 2.7]], 0x99f4ed, 10, 0.043);
  transferRoute([[23.0, 0.19, 4.1], [23.2, 0.19, 5.7], [23.0, 0.19, 7.5], [23.0, 0.19, 9.2], [27.4, 0.19, 9.2]], 0xb2fff3, 9, 0.046);
  transferRoute([[15.0, 0.18, -5.4], [13.5, 0.18, -8.0], [12.9, 0.18, -9.4], [7.0, 0.18, -10.0], [-2.0, 0.18, -10.0], [-10.5, 0.18, -8.5], [-13.5, 0.18, -3.6], [-14.0, 0.18, -1.8]], 0xf1a259, 16, 0.038);
  for (let x = -9.5; x <= 9.5; x += 1.55) box(0.82, 0.035, 0.34, mat.grating, x, 0.135, -10.0);
  [-21.5, -15, -7, 0, 8, 15, 23].forEach((x, index) => {
    const beaconMaterial = mat.red.clone();
    const beacon = cylinder(0.075, 0.075, 0.16, beaconMaterial, x, 2.55 + (index % 2) * 0.3, index % 2 ? -12.1 : 11.9, scene, 12);
    beacons.push(beacon);
  });
  worker(-23.2, 1.3, 0.4);
  worker(-15.8, 3.5, -0.6, mat.lime);
  worker(-5.4, -7.4, 1.7);
  worker(5.4, 7.4, -1.4, mat.lime);
  worker(14.4, 2.3, 0.2);
  worker(11.9, -9.4, 2.1);
  worker(23.6, 6.7, -0.8, mat.lime);
  addSign('FLOWPILOT', 'CARROUSEL WATER RECLAMATION', 5.3, 0.92, -25.1, 2.2, 11.8, 0);

  /* Camera and direct manipulation */
  const cameraState = {
    target: new T.Vector3(0, 0.5, 0),
    focusTarget: new T.Vector3(0, 0.5, 0),
    radius: 38,
    radiusGoal: 38,
    height: 22,
    heightGoal: 22,
    yaw: 0.72,
    yawGoal: 0.72,
    autoRotate: true,
    runningBoost: false,
  };
  const presets = {
    isometric: { target: new T.Vector3(0, 0.5, 0), radius: 38, height: 22, yaw: 0.72 },
    detail: { target: new T.Vector3(-3.7, 1.25, -8.37), radius: 9, height: 6, yaw: 0.55 },
    presentation: { target: new T.Vector3(0, 0.35, 0), radius: 45, height: 27, yaw: 0.72 },
    ditch: { target: new T.Vector3(0, 0.6, 0), radius: 22, height: 11.5, yaw: 1.48 },
    clarifier: { target: new T.Vector3(15.0, 0.6, 0), radius: 17, height: 10.6, yaw: 0.82 },
    bird: { target: new T.Vector3(0, 0, 0), radius: 5, height: 61, yaw: 0.78 },
  };
  const pinAnchors = {
    headworks: new T.Vector3(-21.5, 2.7, 0),
    ditch: new T.Vector3(0.4, 2.5, -5.15),
    clarifier: new T.Vector3(15.2, 2.6, 0),
    outlet: new T.Vector3(23.2, 2.5, 5.8),
  };
  const pinEntries = $$('[data-ox-pin]').map((element) => ({
    element,
    anchor: pinAnchors[element.dataset.oxPin],
    projected: new T.Vector3(),
  })).filter((entry) => entry.anchor);
  const tourStops = [
    { view: 'presentation', unit: 'ditch', duration: 3900, label: '全厂工艺总览' },
    { unit: 'headworks', duration: 3300, label: '进水与预处理' },
    { unit: 'selector', duration: 3100, label: '选择池与双线配水' },
    { unit: 'ditch', duration: 4400, label: '氧化沟环流与曝气' },
    { unit: 'clarifier', duration: 3900, label: '二沉池固液分离' },
    { unit: 'sludge', duration: 3200, label: '回流污泥与鼓风' },
    { unit: 'outlet', duration: 3500, label: '深度处理与回用' },
  ];
  let tourTimer = 0;
  let tourActive = false;
  let tourIndex = 0;

  function applyCameraView(name) {
    const preset = presets[name] || presets.isometric;
    if (name === 'ditch') selectOxidationUnit('ditch', false);
    if (name === 'clarifier') selectOxidationUnit('clarifier', false);
    cameraState.focusTarget.copy(preset.target);
    cameraState.radiusGoal = preset.radius;
    cameraState.heightGoal = preset.height;
    cameraState.yawGoal = preset.yaw;
    cameraState.autoRotate = name === 'isometric' || name === 'presentation';
    $$('[data-ox-camera]').forEach((button) => button.classList.toggle('active', button.dataset.oxCamera === name || (name === 'presentation' && button.dataset.oxCamera === 'isometric')));
  }

  function applyFocus(unit) {
    const focusView = focusMap[unit] || focusMap.ditch;
    cameraState.focusTarget.copy(focusView.target);
    cameraState.radiusGoal = focusView.radius;
    cameraState.heightGoal = focusView.height;
    cameraState.yawGoal = focusView.yaw;
    cameraState.autoRotate = false;
    $$('[data-ox-camera]').forEach((button) => button.classList.remove('active'));
  }

  function syncTourControls() {
    const stageButton = $('#oxTourToggle');
    const hudButton = $('#oxPresentationTour');
    stageButton.classList.toggle('active', tourActive);
    stageButton.setAttribute('aria-pressed', String(tourActive));
    stageButton.setAttribute('aria-label', tourActive ? '停止氧化沟自动巡航' : '开启氧化沟自动巡航');
    stageButton.innerHTML = tourActive
      ? '<i data-lucide="pause-circle"></i><span>停止</span>'
      : '<i data-lucide="play-circle"></i><span>巡航</span>';
    hudButton.classList.toggle('active', tourActive);
    hudButton.setAttribute('aria-pressed', String(tourActive));
    hudButton.innerHTML = tourActive
      ? '<i data-lucide="pause"></i><span>停止巡航</span>'
      : '<i data-lucide="orbit"></i><span>自动巡航</span>';
    iconify();
  }

  function runTourStop() {
    if (!tourActive) return;
    const stop = tourStops[tourIndex % tourStops.length];
    if (stop.unit) selectOxidationUnit(stop.unit, false);
    if (stop.view) applyCameraView(stop.view);
    else applyFocus(stop.unit);
    if (!state.running) $('#oxidationSimulationState').textContent = `自动巡航 · ${stop.label}`;
    tourTimer = window.setTimeout(() => {
      tourIndex = (tourIndex + 1) % tourStops.length;
      runTourStop();
    }, stop.duration);
  }

  function startTour() {
    if (tourActive) return;
    tourActive = true;
    tourIndex = 0;
    syncTourControls();
    runTourStop();
  }

  function stopTour() {
    if (!tourActive && !tourTimer) return;
    tourActive = false;
    window.clearTimeout(tourTimer);
    tourTimer = 0;
    syncTourControls();
    if (!state.running) $('#oxidationSimulationState').textContent = '环流稳定';
  }

  function toggleTour() {
    if (tourActive) stopTour();
    else startTour();
  }

  function setCameraView(name) {
    stopTour();
    applyCameraView(name);
  }

  function focus(unit) {
    stopTour();
    applyFocus(unit);
  }

  $$('[data-ox-camera]').forEach((button) => button.addEventListener('click', () => setCameraView(button.dataset.oxCamera)));
  let dragging = false;
  let moved = false;
  let lastX = 0;
  let downX = 0;
  let downY = 0;
  mount.addEventListener('pointerdown', (event) => {
    stopTour();
    dragging = true;
    moved = false;
    lastX = event.clientX;
    downX = event.clientX;
    downY = event.clientY;
    mount.setPointerCapture(event.pointerId);
  });
  mount.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    cameraState.yawGoal += (event.clientX - lastX) * 0.006;
    lastX = event.clientX;
    moved = moved || Math.abs(event.clientX - downX) + Math.abs(event.clientY - downY) > 5;
    cameraState.autoRotate = false;
  });
  mount.addEventListener('wheel', (event) => {
    event.preventDefault();
    stopTour();
    cameraState.radiusGoal = clamp(cameraState.radiusGoal + event.deltaY * 0.012, 10, 48);
  }, { passive: false });
  const raycaster = new T.Raycaster();
  const pointer = new T.Vector2();
  mount.addEventListener('pointerup', (event) => {
    if (!moved) {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(pickables, false).find((item) => item.object.userData.unit);
      if (hit) selectOxidationUnit(hit.object.userData.unit);
    }
    dragging = false;
  });
  mount.addEventListener('pointercancel', () => { dragging = false; });

  function resize() {
    const width = mount.clientWidth || 1;
    const height = mount.clientHeight || 1;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function updateScenePins() {
    if (!pinEntries.length || window.innerWidth <= 760) return;
    const width = mount.clientWidth || 1;
    const height = mount.clientHeight || 1;
    const reserve = document.body.classList.contains('ox-presentation') ? 174 : 148;
    pinEntries.forEach((entry) => {
      entry.projected.copy(entry.anchor).project(camera);
      const rawX = (entry.projected.x * 0.5 + 0.5) * width;
      const rawY = (-entry.projected.y * 0.5 + 0.5) * height;
      const visible = entry.projected.z > -1 && entry.projected.z < 1
        && rawX > -20 && rawX < width + 20 && rawY > 58 && rawY < height - 72;
      entry.element.classList.toggle('visible', visible);
      if (!visible) return;
      entry.element.style.left = `${clamp(rawX, 18, width - reserve)}px`;
      entry.element.style.top = `${clamp(rawY, 82, height - 104)}px`;
    });
  }

  let lastMs = 0;
  let lastRenderMs = -100;
  function animate(ms) {
    if (state.route !== 'oxidation') {
      lastMs = ms;
      state.oxidationThree.frame = requestAnimationFrame(animate);
      return;
    }
    const frameInterval = cameraState.runningBoost ? 24 : 33;
    if (ms && ms - lastRenderMs < frameInterval) {
      state.oxidationThree.frame = requestAnimationFrame(animate);
      return;
    }
    const delta = Math.min(0.05, (ms - lastMs) * 0.001 || 0.016);
    lastMs = ms;
    lastRenderMs = ms;
    const t = ms * 0.001;
    cameraState.target.lerp(cameraState.focusTarget, 0.042);
    cameraState.radius += (cameraState.radiusGoal - cameraState.radius) * 0.047;
    cameraState.height += (cameraState.heightGoal - cameraState.height) * 0.047;
    cameraState.yaw += (cameraState.yawGoal - cameraState.yaw) * 0.052;
    if (cameraState.autoRotate) cameraState.yawGoal += delta * (cameraState.runningBoost ? 0.12 : 0.024);
    camera.position.set(
      cameraState.target.x + Math.sin(cameraState.yaw) * cameraState.radius,
      cameraState.height,
      cameraState.target.z + Math.cos(cameraState.yaw) * cameraState.radius,
    );
    camera.lookAt(cameraState.target);
    flowParticles.forEach((dot) => dot.position.copy(dot.userData.curve.getPointAt((dot.userData.phase + t * dot.userData.rate * state.speed) % 1)));
    bubbles.forEach((bubble) => {
      bubble.position.copy(bubble.userData.base);
      const lift = (bubble.userData.phase + t * bubble.userData.rate * state.speed) % 1;
      bubble.position.y += lift * 0.95;
      bubble.scale.setScalar(0.55 + lift * 0.65);
    });
    waterSurfaces.forEach((water) => { water.mesh.position.y = water.baseY + Math.sin(t * 1.08 + water.phase) * water.amplitude; });
    aeratorRotors.forEach((rotor) => { rotor.mesh.rotation.z += delta * rotor.speed * state.speed; });
    aerationRipples.forEach((ripple) => {
      const progress = (ripple.userData.phase + t * 0.48 * state.speed) % 1;
      const scale = 0.85 + progress * 3.4;
      ripple.scale.setScalar(scale);
      ripple.material.opacity = (1 - progress) * 0.5;
    });
    foamPatches.forEach((patch, index) => {
      const pulse = 0.88 + Math.sin(t * 2.7 + patch.userData.phase) * 0.12;
      patch.scale.set(
        patch.userData.baseScale.x * pulse,
        patch.userData.baseScale.y,
        patch.userData.baseScale.z * (1.04 - (pulse - 0.88) * 0.34),
      );
      patch.position.x = patch.userData.baseX + Math.sin(t * 1.8 + index * 0.43) * 0.026;
      patch.material.opacity = 0.38 + Math.max(0, Math.sin(t * 2.2 + patch.userData.phase)) * 0.34;
    });
    aeratorSpray.forEach((drop) => {
      const progress = (drop.userData.phase + t * drop.userData.rate * state.speed) % 1;
      const radius = Math.sin(progress * Math.PI) * drop.userData.spread;
      drop.position.set(
        drop.userData.originX + Math.cos(drop.userData.angle) * radius,
        0.97 + Math.sin(progress * Math.PI) * 0.62,
        drop.userData.originZ + Math.sin(drop.userData.angle) * radius,
      );
      drop.material.opacity = Math.sin(progress * Math.PI) * 0.72;
      drop.scale.setScalar(0.72 + Math.sin(progress * Math.PI) * 0.5);
    });
    overflowDrops.forEach((drop, index) => {
      const progress = (drop.userData.phase + t * 0.52 * state.speed) % 1;
      drop.position.y = drop.userData.top - progress * drop.userData.range;
      drop.scale.setScalar(0.65 + progress * 0.55);
      drop.material.opacity = (1 - progress) * 0.76;
      drop.position.x = drop.userData.baseX + Math.sin(t * 1.2 + index) * 0.004;
      drop.position.z = drop.userData.baseZ + Math.cos(t * 1.1 + index) * 0.004;
    });
    clarifierArms.forEach((arm) => { arm.mesh.rotation.y += delta * arm.speed * state.speed; });
    rotors.forEach((rotor) => {
      if (rotor.axis === 'z') rotor.mesh.rotation.z += delta * rotor.speed * state.speed;
      else rotor.mesh.rotation.y += delta * rotor.speed * state.speed;
    });
    vehicles.forEach((item) => {
      const progress = (item.userData.phase + t * 0.016 * state.speed) % 1;
      item.position.set(-28 + progress * 56, 0, item.userData.z);
    });
    beacons.forEach((beacon, index) => { beacon.material.emissiveIntensity = 0.3 + Math.max(0, Math.sin(t * 3.1 + index * 0.7)) * 1.25; });
    updateScenePins();
    renderer.render(scene, camera);
    state.oxidationThree.frame = requestAnimationFrame(animate);
  }

  state.oxidationThree = {
    scene, camera,
    renderer,
    resize,
    focus,
    setView: setCameraView,
    startTour,
    stopTour,
    toggleTour,
    setRunning(value) { cameraState.runningBoost = value; },
    frame: 0,
  };
  resize();
  window.FlowPilotVisuals?.enhance('oxidation', scene, renderer, mat);
  window.FlowPilotModels?.attach('oxidation', scene, camera);
  setCameraView('isometric');
  animate(0);
  window.addEventListener('resize', resize);
  new ResizeObserver(() => {
    if (mount.clientWidth && mount.clientHeight) resize();
  }).observe(mount);
}

function ensureTwinScene(route) {
  if (route === 'overview' && !state.three) initPlant3d();
  if (route === 'oxidation' && !state.oxidationThree) initOxidation3d();
  if (route === 'network' && !state.networkThree) initNetwork3d();
}

function init() {
  iconify();
  setupRouting();
  setupScenarioControls();
  setupAdvisor();
  setupUnitSelection();
  setupOxidationSelection();
  setupNetworkPage();
  setupHistory();
  ensureTwinScene(state.route);
  drawLiveChart();
  drawOxidationChart();
  drawNetworkChart();
  drawComparisonChart();
  drawAgentChart();
  $('#globalRun').addEventListener('click', handleGlobalRun);
  $('#scenarioRunLocal').addEventListener('click', runScenario);
  $('#advisorRunLocal').addEventListener('click', runAdvisor);
  setInterval(() => { $('#clock').textContent = new Date().toLocaleTimeString('zh-CN', { hour12: false }); }, 1000);
  setInterval(() => {
    if (!state.running) {
      updateLiveValues();
      updateOxidationValues();
    }
  }, 900);
  window.addEventListener('resize', () => {
    drawLiveChart();
    drawOxidationChart();
    drawNetworkChart();
    drawComparisonChart();
    drawAgentChart();
    drawReplayChart();
  });
}

document.addEventListener('DOMContentLoaded', init);
