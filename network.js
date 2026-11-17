const networkUnitCopy = {
  'station-b': {
    name: 'B 源头泵站 · 长距离输送起点',
    advice: '源水 COD 足够，问题更可能发生在离站后的输送过程',
    meta: '建议配置出站流量、压力、液位与在线 COD 同步采样',
    telemetry: [['出站 COD', '225 mg/L'], ['输送流量', '720 m³/h'], ['运行泵组', '2 / 3']],
  },
  'station-d': {
    name: 'D 增压泵站 · 压力接力与直送支路',
    advice: '单纯提高频率仍可能与 B、A 站错峰，需按污水团到达时间联动',
    meta: '智能调度建议 D 站先启，建立主干管连续推流',
    telemetry: [['当前频率', '42 Hz'], ['建议频率', '47 Hz'], ['启动时刻', 'T + 0 min']],
  },
  'station-c': {
    name: 'C 接力泵站 · 中途补压与水量整形',
    advice: 'C 站延迟接力可抬高风险段流速，避免高低液位反复启停',
    meta: '智能调度建议较 D 站延迟约 18 分钟启动',
    telemetry: [['当前频率', '36 Hz'], ['建议频率', '41 Hz'], ['启动时刻', 'T + 18 min']],
  },
  risk: {
    name: 'B—A 主干管疑似损失段 · 当前诊断对象',
    advice: '高功率不等于高输送效率，先验证低谷期停留与泵站错峰',
    meta: '模型初判 · 需用流量、液位与在线 COD 时序校核',
    telemetry: [['沿程长度', '6.4 km'], ['低谷流速', '0.29 m/s'], ['COD 损失', '约 125 mg/L']],
  },
  'station-a': {
    name: 'A 枢纽泵站 · 多路汇流与进厂提升',
    advice: 'A 站应按上游污水团到达时间接泵，减少汇流井滞留和稀释',
    meta: '建议在 D 站启动后约 35 分钟切入双泵恒液位模式',
    telemetry: [['当前频率', '43 Hz'], ['建议频率', '45 Hz'], ['运行泵组', '2 + 1 备']],
  },
  plant: {
    name: '污水处理厂进水端 · COD 保质输送终点',
    advice: '智能调度目标是稳定抬高进厂 COD，而不是制造瞬时浓度尖峰',
    meta: '建议同步校核进厂流量、COD、氨氮和电导率，排除稀释性来水',
    telemetry: [['当前 COD', '100 mg/L'], ['预测 COD', '205 mg/L'], ['目标 COD', '200 mg/L']],
  },
};

const networkModelState = {
  mode: 'baseline',
  reveal: 1,
  progress: 0,
  hasRun: false,
  running: false,
  selectedUnit: 'risk',
  animationToken: 0,
  model: null,
};

function readNetworkInputs() {
  return {
    source: clamp(Number($('#networkSourceCod').value) || 225, 100, 500),
    observed: clamp(Number($('#networkObservedCod').value) || 100, 40, 450),
    target: clamp(Number($('#networkTargetCod').value) || 200, 80, 350),
    flow: clamp(Number($('#networkFlow').value) || 720, 300, 1400),
    length: clamp(Number($('#networkLength').value) || 8.6, 3, 16),
  };
}

function calculateNetworkModel(inputs = readNetworkInputs()) {
  const residence = clamp(inputs.length * 0.72 * Math.pow(720 / inputs.flow, 0.64), 2.6, 10.8);
  const baselineVelocity = clamp(0.29 * Math.pow(inputs.flow / 720, 0.46) * Math.pow(8.6 / inputs.length, 0.12), 0.18, 0.52);
  const baselineEnd = clamp(inputs.observed, 40, inputs.source * 0.95);
  const calibratedLossRate = clamp(-Math.log(baselineEnd / inputs.source) / residence, 0.015, 0.3);
  const optimizedResidence = clamp(residence * 0.34, 1.45, 3.55);
  const optimizedVelocity = clamp(baselineVelocity * 2.66, 0.62, 1.05);
  const kineticEstimate = inputs.source * Math.exp(-calibratedLossRate * 0.34 * optimizedResidence);
  const deliverableCeiling = inputs.source * 0.93;
  const minimumImprovement = Math.min(deliverableCeiling, baselineEnd + 24);
  const requestedDelivery = Math.min(deliverableCeiling, inputs.target * 1.018);
  const optimizedEnd = clamp(
    Math.max(kineticEstimate, requestedDelivery),
    minimumImprovement,
    deliverableCeiling,
  );
  const baselineRetention = baselineEnd / inputs.source * 100;
  const optimizedRetention = optimizedEnd / inputs.source * 100;
  const bFrequency = Math.round(clamp(48 + (inputs.flow - 720) / 150, 44, 54));
  const dFrequency = Math.round(clamp(47 + (inputs.target - 200) / 18 + (inputs.length - 8.6) / 2.6, 42, 55));
  const cFrequency = Math.round(clamp(41 + (inputs.flow - 720) / 220, 38, 50));
  const aFrequency = Math.round(clamp(45 + (inputs.flow - 720) / 180, 42, 53));
  const delayC = Math.round(clamp(18 + (inputs.length - 8.6) * 1.8, 10, 32));
  const delayA = Math.round(clamp(35 + (inputs.length - 8.6) * 2.6, 22, 55));
  const points = 31;
  const baseline = [];
  const optimized = [];
  for (let i = 0; i < points; i += 1) {
    const ratio = i / (points - 1);
    const baseRatio = Math.pow(ratio, 1.08);
    const optRatio = Math.pow(ratio, 0.94);
    baseline.push(inputs.source * Math.exp(Math.log(baselineEnd / inputs.source) * baseRatio));
    optimized.push(inputs.source * Math.exp(Math.log(optimizedEnd / inputs.source) * optRatio));
  }
  return {
    ...inputs,
    residence,
    optimizedResidence,
    baselineVelocity,
    optimizedVelocity,
    calibratedLossRate,
    baselineEnd,
    optimizedEnd,
    baselineRetention,
    optimizedRetention,
    feasible: optimizedEnd >= inputs.target,
    bFrequency,
    cFrequency,
    dFrequency,
    aFrequency,
    delayC,
    delayA,
    baseline,
    optimized,
  };
}

function updateNetworkInputOutputs() {
  const model = networkModelState.model || calculateNetworkModel();
  $('#networkFlowOutput').textContent = `${format(model.flow)} m³/h`;
  $('#networkLengthOutput').textContent = `${model.length.toFixed(1)} km`;
}

function setNetworkRunButton(loading) {
  const button = $('#networkRunLocal');
  if (!button) return;
  button.disabled = loading;
  button.innerHTML = loading
    ? `<i data-lucide="loader-circle" class="spin"></i><span id="networkRunProgressLabel">${Math.round(networkModelState.progress)}% · 正在计算泵组时序</span>`
    : '<i data-lucide="play"></i><span>推演候选泵组时序</span>';
  const presentation = $('#networkPresentationRun');
  if (presentation) {
    presentation.disabled = loading;
    presentation.innerHTML = loading
      ? '<i data-lucide="loader-circle" class="spin"></i><span>调度求解中</span>'
      : '<i data-lucide="play"></i><span>计算最优调度</span>';
  }
  iconify();
}

function setNetworkMode(mode, fromRun = false) {
  if (!['baseline', 'optimized'].includes(mode)) mode = 'baseline';
  networkModelState.mode = mode;
  $$('[data-network-mode]').forEach((button) => button.classList.toggle('active', button.dataset.networkMode === mode));
  $('#networkSceneMode').textContent = mode === 'optimized' ? '保 COD 智能调度' : '当前泵站时序';
  if (state.networkThree) state.networkThree.setMode(mode, fromRun);
  updateNetworkReadouts();
  drawNetworkChart();
}

function updateNetworkReadouts(interpolation = null) {
  const model = networkModelState.model || calculateNetworkModel();
  const optimized = networkModelState.mode === 'optimized';
  const factor = interpolation == null ? (optimized ? 1 : 0) : clamp(interpolation, 0, 1);
  const plantCod = model.baselineEnd + (model.optimizedEnd - model.baselineEnd) * factor;
  const retention = model.baselineRetention + (model.optimizedRetention - model.baselineRetention) * factor;
  const residence = model.residence + (model.optimizedResidence - model.residence) * factor;
  const velocity = model.baselineVelocity + (model.optimizedVelocity - model.baselineVelocity) * factor;
  const sourceText = `${Math.round(model.source)}`;
  const plantText = `${Math.round(plantCod)}`;
  const retentionText = `${Math.round(retention)}`;
  const residenceText = residence.toFixed(1);

  $('#networkPlantCodMetric').textContent = plantText;
  $('#networkRetentionMetric').textContent = retentionText;
  $('#networkResidenceMetric').textContent = residenceText;
  $('#networkHudSource').textContent = sourceText;
  $('#networkHudPlant').textContent = plantText;
  $('#networkHudRetention').textContent = retentionText;
  $('#networkHudResidence').textContent = residenceText;
  $('#networkPinPlant').textContent = `COD ${plantText} mg/L`;
  $('#networkPinB').textContent = `COD ${sourceText} · ${format(model.flow)} m³/h`;
  $('#networkPinRisk').textContent = `${factor > 0.75 ? '连续推流' : '低谷流速'} ${velocity.toFixed(2)} m/s`;
  $('#networkPlantCodState').textContent = plantCod >= model.target ? '达到目标' : '偏低';
  $('#networkRetentionState').textContent = factor > 0.6 ? `提升 ${Math.round(model.optimizedRetention - model.baselineRetention)}%` : `损失 ${Math.round(100 - model.baselineRetention)}%`;
  $('#networkResidenceState').textContent = factor > 0.6 ? '已压缩' : '过长';
  $('#networkChartReadout').textContent = `B ${Math.round(model.source)} → 厂 ${plantText} mg/L`;
  $('#networkMassFlux').textContent = `按输入 B 站 Q×COD：${(model.flow * model.source / 1000).toFixed(1)} kg/h。A/进厂 Q 未提供，不能以 B 流量代替汇流后流量计算损失；浓度降低不等于质量通量降低。`;

  if (factor > 0.55) {
    $('#networkPinA').textContent = `2 泵 · ${model.aFrequency} Hz`;
    $('#networkPinC').textContent = `接力 · ${model.cFrequency} Hz`;
    $('#networkPinD').textContent = `先启 · ${model.dFrequency} Hz`;
  } else {
    $('#networkPinA').textContent = '2 泵 · 43 Hz';
    $('#networkPinC').textContent = '待协同 · 36 Hz';
    $('#networkPinD').textContent = '待协同 · 42 Hz';
  }

  const action = $('#networkActionTitle');
  const copy = $('#networkActionCopy');
  const badge = $('#networkActionBadge');
  const panel = $('.network-action');
  if (factor > 0.75) {
    badge.textContent = '假设演示 · 待验证';
    action.textContent = model.feasible
      ? `D 站先启，C 站延迟 ${model.delayC} 分钟接力`
      : '仅靠泵站调度无法达到当前目标';
    copy.textContent = model.feasible
      ? `B 站保持 2 泵 ${model.bFrequency} Hz 连续输送；A 站在第 ${model.delayA} 分钟切入 ${model.aFrequency} Hz 恒液位接收。假设演示值 ${Math.round(model.optimizedEnd)} mg/L，不能保证实厂达到目标，先核对支路质量通量与采样时差。`
      : `源水 COD 为 ${Math.round(model.source)} mg/L，假设演示值约 ${Math.round(model.optimizedEnd)} mg/L；需先排查稀释支流或补充高浓度来水，不能继续加泵硬推。`;
    panel.classList.add('optimized');
    panel.classList.toggle('unreachable', !model.feasible);
  } else {
    badge.textContent = '模型初判';
    action.textContent = '先查时序，不要继续盲目加功率';
    copy.textContent = '重点核对 B、C、D、A 四站 1 分钟级液位与启停记录，确认 B—A 段是否存在长时间低流速和泵站错峰。';
    panel.classList.remove('optimized');
    panel.classList.remove('unreachable');
  }

  const dispatch = $('#networkDispatch');
  dispatch.innerHTML = factor > 0.75
    ? `<span><b>B</b><small>2 泵 ${model.bFrequency} Hz</small></span><i></i><span><b>D</b><small>先启 ${model.dFrequency} Hz</small></span><i></i><span><b>C</b><small>+${model.delayC} min</small></span><i></i><span><b>A</b><small>+${model.delayA} min</small></span>`
    : '<span><b>B</b><small>连续输送</small></span><i></i><span><b>D</b><small>独立液位</small></span><i></i><span><b>C</b><small>独立液位</small></span><i></i><span><b>A</b><small>被动接收</small></span>';

  if (networkModelState.selectedUnit === 'risk') {
    $('#networkUnitTelemetry').innerHTML = [
      ['沿程长度', `${Math.max(1, model.length - 2.2).toFixed(1)} km`],
      [factor > 0.75 ? '调度流速' : '低谷流速', `${velocity.toFixed(2)} m/s`],
      ['COD 损失', `约 ${Math.round(model.source - plantCod)} mg/L`],
    ].map(([label, value]) => `<span><small>${label}</small><b>${value}</b></span>`).join('');
  }
}

function drawNetworkChart() {
  const canvas = $('#networkCodChart');
  if (!canvas) return;
  const prepared = prepareCanvas(canvas);
  if (!prepared) return;
  const { ctx, width, height } = prepared;
  const model = networkModelState.model || calculateNetworkModel();
  const p = { l: 48, r: 20, t: 14, b: 28 };
  const maxY = Math.ceil(Math.max(model.source * 1.08, model.target * 1.12) / 20) * 20;
  const minY = Math.max(40, Math.floor(Math.min(model.baselineEnd * 0.82, model.target * 0.78) / 20) * 20);
  const plotW = width - p.l - p.r;
  const plotH = height - p.t - p.b;
  const xAt = (index) => p.l + index / (model.baseline.length - 1) * plotW;
  const yAt = (value) => p.t + (maxY - value) / (maxY - minY) * plotH;

  ctx.strokeStyle = 'rgba(119,185,207,.12)';
  ctx.fillStyle = '#648897';
  ctx.font = '16px "DM Mono", monospace';
  ctx.textAlign = 'right';
  [0, 0.5, 1].forEach((ratio) => {
    const y = p.t + ratio * plotH;
    ctx.beginPath();
    ctx.moveTo(p.l, y);
    ctx.lineTo(width - p.r, y);
    ctx.stroke();
    ctx.fillText(`${Math.round(maxY - ratio * (maxY - minY))}`, p.l - 6, y + 3);
  });

  const targetY = yAt(model.target);
  ctx.setLineDash([5, 4]);
  ctx.strokeStyle = 'rgba(240,185,93,.72)';
  ctx.beginPath();
  ctx.moveTo(p.l, targetY);
  ctx.lineTo(width - p.r, targetY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#d8ae65';
  ctx.textAlign = 'left';
  ctx.fillText(`目标 ${Math.round(model.target)}`, p.l + 5, targetY - 4);

  const drawSeries = (values, color, reveal = 1, fill = false) => {
    const limit = Math.max(1, Math.floor((values.length - 1) * clamp(reveal, 0, 1)));
    if (fill) {
      const gradient = ctx.createLinearGradient(0, p.t, 0, p.t + plotH);
      gradient.addColorStop(0, `${color}24`);
      gradient.addColorStop(1, `${color}00`);
      ctx.beginPath();
      ctx.moveTo(xAt(0), p.t + plotH);
      for (let i = 0; i <= limit; i += 1) ctx.lineTo(xAt(i), yAt(values[i]));
      ctx.lineTo(xAt(limit), p.t + plotH);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();
    }
    ctx.beginPath();
    for (let i = 0; i <= limit; i += 1) {
      const x = xAt(i);
      const y = yAt(values[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
    return limit;
  };

  drawSeries(model.baseline, '#f0a94f', 1, networkModelState.mode === 'baseline');
  const showOptimized = networkModelState.hasRun || networkModelState.mode === 'optimized';
  let optimizedLimit = 0;
  if (showOptimized) {
    optimizedLimit = drawSeries(
      model.optimized,
      '#b7df3f',
      networkModelState.running ? networkModelState.reveal : 1,
      networkModelState.mode === 'optimized',
    );
  }

  const markerValues = networkModelState.mode === 'optimized' && showOptimized ? model.optimized : model.baseline;
  const markerIndex = networkModelState.running && networkModelState.mode === 'optimized' ? optimizedLimit : markerValues.length - 1;
  ctx.fillStyle = networkModelState.mode === 'optimized' ? '#d9f776' : '#ffd083';
  ctx.shadowColor = ctx.fillStyle;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(xAt(markerIndex), yAt(markerValues[markerIndex]), 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#688c9a';
  ctx.font = '16px "Noto Sans SC", sans-serif';
  ctx.textAlign = 'center';
  [
    [0, 'B站'],
    [0.39, 'D/C汇入'],
    [0.82, 'A站'],
    [1, '进厂'],
  ].forEach(([ratio, label]) => ctx.fillText(label, p.l + ratio * plotW, height - 7));
}

function selectNetworkUnit(unit, shouldFocus = true) {
  if (!networkUnitCopy[unit]) return;
  networkModelState.selectedUnit = unit;
  $$('[data-network-unit]').forEach((item) => item.classList.toggle('selected', item.dataset.networkUnit === unit));
  $$('[data-network-pin]').forEach((item) => item.classList.toggle('active', item.dataset.networkPin === unit));
  const copy = networkUnitCopy[unit];
  const model = networkModelState.model || calculateNetworkModel();
  let telemetry = copy.telemetry;
  if (unit === 'station-b') telemetry = [['出站 COD', `${Math.round(model.source)} mg/L`], ['输送流量', `${format(model.flow)} m³/h`], ['建议频率', `${model.bFrequency} Hz`]];
  if (unit === 'station-c') telemetry = [['当前频率', '36 Hz'], ['建议频率', `${model.cFrequency} Hz`], ['启动时刻', `T + ${model.delayC} min`]];
  if (unit === 'station-d') telemetry = [['当前频率', '42 Hz'], ['建议频率', `${model.dFrequency} Hz`], ['启动时刻', 'T + 0 min']];
  if (unit === 'station-a') telemetry = [['当前频率', '43 Hz'], ['建议频率', `${model.aFrequency} Hz`], ['接泵时刻', `T + ${model.delayA} min`]];
  if (unit === 'plant') telemetry = [['当前 COD', `${Math.round(model.baselineEnd)} mg/L`], ['调度预测', `${Math.round(model.optimizedEnd)} mg/L`], ['目标 COD', `${Math.round(model.target)} mg/L`]];
  $('#networkUnitName').textContent = copy.name;
  $('#networkUnitAdvice').textContent = copy.advice;
  $('#networkUnitMeta').textContent = copy.meta;
  $('#networkUnitTelemetry').innerHTML = telemetry.map(([label, value]) => `<span><small>${label}</small><b>${value}</b></span>`).join('');
  if (unit === 'risk') updateNetworkReadouts();
  if (shouldFocus && state.networkThree) state.networkThree.focus(unit);
}

function setNetworkPresentation(active) {
  if (active && state.route !== 'network') setRoute('network');
  document.body.classList.toggle('network-presentation', active);
  $('#networkPresentationEnter').classList.toggle('active', active);
  $('#networkPresentationEnter').setAttribute('aria-pressed', String(active));
  ensureTwinScene('network');
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (!state.networkThree) return;
    state.networkThree.resize();
    if (active) state.networkThree.startTour();
    else {
      state.networkThree.stopTour();
      state.networkThree.setView('system');
    }
  }));
}

async function runNetwork() {
  if (state.running || networkModelState.running) return;
  networkModelState.model = calculateNetworkModel();
  updateNetworkInputOutputs();
  networkModelState.running = true;
  networkModelState.hasRun = true;
  networkModelState.reveal = 0;
  networkModelState.progress = 0;
  networkModelState.animationToken += 1;
  const token = networkModelState.animationToken;
  state.running = true;
  state.speed = 1.55;
  setRunButton(true);
  setNetworkRunButton(true);
  ensureTwinScene('network');
  selectNetworkUnit('risk', false);
  setNetworkMode('optimized', true);
  if (state.networkThree) state.networkThree.setRunning(true);
  $('#networkActionBadge').textContent = '求解中';
  $('#networkActionTitle').textContent = '正在重建四座泵站的污水团到达时序';
  $('#networkActionCopy').textContent = '同步计算液位边界、主干管最小流速、泵组频率和 A 站接收窗口。';

  const started = performance.now();
  const duration = 5600;
  await new Promise((resolve) => {
    const frame = (now) => {
      if (token !== networkModelState.animationToken) {
        resolve();
        return;
      }
      const progress = clamp((now - started) / duration, 0, 1);
      const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      networkModelState.progress = progress * 100;
      networkModelState.reveal = eased;
      const label = $('#networkRunProgressLabel');
      if (label) label.textContent = `${Math.round(progress * 100)}% · 正在计算泵组时序`;
      updateNetworkReadouts(eased);
      drawNetworkChart();

      const totalMinutes = Math.round(progress * 150);
      const hour = 6 + Math.floor(totalMinutes / 60);
      const minute = totalMinutes % 60;
      $('#networkSimHour').textContent = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      if (progress < 0.18) $('#networkSimulationState').textContent = '校准 B—A 沿程 COD 衰减';
      else if (progress < 0.42) $('#networkSimulationState').textContent = '搜索 D / C 增压组合';
      else if (progress < 0.7) $('#networkSimulationState').textContent = `D 先启 · C 延迟 ${networkModelState.model.delayC} min`;
      else if (progress < 0.94) $('#networkSimulationState').textContent = 'A 站接力 · 污水团连续到厂';
      else $('#networkSimulationState').textContent = '保 COD 调度 · 推演完成';

      if (progress < 1) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  });

  if (token !== networkModelState.animationToken) return;
  networkModelState.running = false;
  networkModelState.progress = 100;
  networkModelState.reveal = 1;
  updateNetworkReadouts(1);
  drawNetworkChart();
  if (state.networkThree) state.networkThree.setRunning(false);
  state.running = false;
  state.speed = 1;
  setRunButton(false);
  setNetworkRunButton(false);
  $('#networkSimulationState').textContent = `智能调度 · 进厂 COD ${Math.round(networkModelState.model.optimizedEnd)} mg/L`;
  $('#syncText').textContent = '管网策略已生成';
  selectNetworkUnit('risk', false);
  toast(`泵组时序已生成：预测进厂 COD 提升至 ${Math.round(networkModelState.model.optimizedEnd)} mg/L`);
}

function setupNetworkPage() {
  networkModelState.model = calculateNetworkModel();
  updateNetworkInputOutputs();
  updateNetworkReadouts();
  drawNetworkChart();
  $$('[data-network-unit]').forEach((button) => button.addEventListener('click', () => selectNetworkUnit(button.dataset.networkUnit)));
  $$('[data-network-focus]').forEach((button) => button.addEventListener('click', () => selectNetworkUnit(button.dataset.networkFocus)));
  $$('[data-network-mode]').forEach((button) => button.addEventListener('click', () => setNetworkMode(button.dataset.networkMode)));
  $$('[data-network-camera]').forEach((button) => button.addEventListener('click', () => {
    ensureTwinScene('network');
    if (state.networkThree) state.networkThree.setView(button.dataset.networkCamera);
  }));
  ['networkSourceCod', 'networkObservedCod', 'networkTargetCod', 'networkFlow', 'networkLength'].forEach((id) => {
    $(`#${id}`).addEventListener('input', () => {
      networkModelState.model = calculateNetworkModel();
      networkModelState.hasRun = false;
      networkModelState.reveal = 1;
      setNetworkMode('baseline');
      updateNetworkInputOutputs();
      $('#networkSimulationState').textContent = '边界已变化 · 等待重新计算';
    });
  });
  $('#networkRunLocal').addEventListener('click', runNetwork);
  $('#networkTourToggle').addEventListener('click', () => {
    ensureTwinScene('network');
    if (state.networkThree) state.networkThree.toggleTour();
  });
  $('#networkPresentationTour').addEventListener('click', () => {
    ensureTwinScene('network');
    if (state.networkThree) state.networkThree.toggleTour();
  });
  $('#networkPresentationEnter').addEventListener('click', () => setNetworkPresentation(true));
  $('#networkPresentationExit').addEventListener('click', () => setNetworkPresentation(false));
  $('#networkPresentationRun').addEventListener('click', runNetwork);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && document.body.classList.contains('network-presentation')) setNetworkPresentation(false);
  });
}

function initNetwork3d() {
  const mount = $('#network3d');
  if (!mount || !window.THREE) return;
  const T = window.THREE;
  const renderer = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(window.innerWidth <= 760 ? 1 : Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.42;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  mount.appendChild(renderer.domElement);

  const scene = new T.Scene();
  scene.background = new T.Color(0x04131f);
  scene.fog = new T.Fog(0x04131f, 48, 92);
  scene.add(new T.HemisphereLight(0xc9f2ff, 0x07131b, 2.15));
  const sun = new T.DirectionalLight(0xe3f7ff, 3.1);
  sun.position.set(-17, 30, -21);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -38;
  sun.shadow.camera.right = 38;
  sun.shadow.camera.top = 28;
  sun.shadow.camera.bottom = -28;
  scene.add(sun);
  const cyanRim = new T.PointLight(0x42d9ff, 18, 42, 2);
  cyanRim.position.set(18, 8, 8);
  scene.add(cyanRim);
  const limeRim = new T.PointLight(0xb7df3f, 13, 34, 2);
  limeRim.position.set(-9, 7, -11);
  scene.add(limeRim);
  const warmRim = new T.PointLight(0xf3aa54, 10, 30, 2);
  warmRim.position.set(5, 7, 3);
  scene.add(warmRim);

  const camera = new T.PerspectiveCamera(34, 1, 0.1, 160);
  const mat = {
    terrain: new T.MeshStandardMaterial({ color:0x0e3038, roughness:.94, metalness:.05 }),
    terrainEdge: new T.MeshStandardMaterial({ color:0x123f48, roughness:.88 }),
    road: new T.MeshStandardMaterial({ color:0x1d333d, roughness:.9 }),
    roadEdge: new T.MeshStandardMaterial({ color:0x52656b, roughness:.85 }),
    lane: new T.MeshStandardMaterial({ color:0xb7c4b4, roughness:.8, emissive:0x31423c, emissiveIntensity:.18 }),
    concrete: new T.MeshStandardMaterial({ color:0x69828a, roughness:.78 }),
    concreteDark: new T.MeshStandardMaterial({ color:0x314952, roughness:.86 }),
    concreteLight: new T.MeshStandardMaterial({ color:0x9aadb0, roughness:.72 }),
    steel: new T.MeshStandardMaterial({ color:0x728a94, roughness:.34, metalness:.72 }),
    darkSteel: new T.MeshStandardMaterial({ color:0x1a333f, roughness:.4, metalness:.72 }),
    blue: new T.MeshStandardMaterial({ color:0x2a7fc7, roughness:.38, metalness:.3, emissive:0x082a48, emissiveIntensity:.3 }),
    cyan: new T.MeshStandardMaterial({ color:0x43d8ef, roughness:.25, metalness:.35, emissive:0x0b8ea9, emissiveIntensity:.7 }),
    lime: new T.MeshStandardMaterial({ color:0xb7df3f, roughness:.28, metalness:.24, emissive:0x557a09, emissiveIntensity:.7 }),
    orange: new T.MeshStandardMaterial({ color:0xf0a14c, roughness:.36, metalness:.25, emissive:0x6e2c06, emissiveIntensity:.5 }),
    red: new T.MeshStandardMaterial({ color:0xeb665d, roughness:.36, metalness:.2, emissive:0x681511, emissiveIntensity:.5 }),
    glass: new T.MeshPhysicalMaterial({ color:0x64d9ec, roughness:.12, metalness:.08, transparent:true, opacity:.28, transmission:.15 }),
    water: new T.MeshPhysicalMaterial({ color:0x218ba6, roughness:.17, metalness:.08, transparent:true, opacity:.82, transmission:.08, emissive:0x063b53, emissiveIntensity:.38 }),
    wastewater: new T.MeshPhysicalMaterial({ color:0x657a2a, roughness:.35, metalness:.02, transparent:true, opacity:.88, emissive:0x243109, emissiveIntensity:.24 }),
    roof: new T.MeshStandardMaterial({ color:0x183e52, roughness:.5, metalness:.45 }),
    white: new T.MeshStandardMaterial({ color:0xd4e3e3, roughness:.62 }),
    safety: new T.MeshStandardMaterial({ color:0xe3c43d, roughness:.4, metalness:.32, emissive:0x5f4b04, emissiveIntensity:.32 }),
    vegetation: new T.MeshStandardMaterial({ color:0x276b4f, roughness:.94 }),
    trunk: new T.MeshStandardMaterial({ color:0x41534d, roughness:.96 }),
    window: new T.MeshStandardMaterial({ color:0x79d8ef, roughness:.2, metalness:.2, emissive:0x1c7797, emissiveIntensity:1.25 }),
    asphaltGlow: new T.MeshBasicMaterial({ color:0x1a6070, transparent:true, opacity:.18 }),
  };

  const unitGroups = {};
  const flowParticles = [];
  const pipelines = [];
  const pumpRotors = [];
  const beacons = [];
  const pulseRings = [];
  const vehicles = [];
  const waterSurfaces = [];
  const stationAnchors = {
    plant: new T.Vector3(-25.5, 3.4, 7.4),
    'station-a': new T.Vector3(-16.7, 3.8, 2.8),
    'station-b': new T.Vector3(24.2, 3.5, 2.8),
    'station-c': new T.Vector3(-7.0, 3.5, -9.1),
    'station-d': new T.Vector3(8.2, 3.5, -10.2),
    risk: new T.Vector3(3.2, 1.45, 2.8),
  };

  function register(object, unit) {
    if (!unit) return object;
    if (!unitGroups[unit]) unitGroups[unit] = [];
    unitGroups[unit].push(object);
    object.userData.unit = unit;
    return object;
  }

  function box(w, h, d, material, x, y, z, parent = scene, unit = '') {
    const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return register(mesh, unit);
  }

  function cylinder(radiusTop, radiusBottom, height, material, x, y, z, parent = scene, segments = 24, unit = '') {
    const mesh = new T.Mesh(new T.CylinderGeometry(radiusTop, radiusBottom, height, segments), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return register(mesh, unit);
  }

  function sphere(radius, material, x, y, z, parent = scene, segments = 12, unit = '') {
    const mesh = new T.Mesh(new T.SphereGeometry(radius, segments, Math.max(8, Math.floor(segments * .65))), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    parent.add(mesh);
    return register(mesh, unit);
  }

  function torus(radius, tube, material, x, y, z, parent = scene, segments = 32, unit = '') {
    const mesh = new T.Mesh(new T.TorusGeometry(radius, tube, 8, segments), material);
    mesh.position.set(x, y, z);
    mesh.rotation.x = Math.PI / 2;
    mesh.castShadow = true;
    parent.add(mesh);
    return register(mesh, unit);
  }

  function rodBetween(from, to, radius = .035, material = mat.steel, parent = scene, unit = '') {
    const start = new T.Vector3(...from);
    const end = new T.Vector3(...to);
    const direction = end.clone().sub(start);
    const mesh = new T.Mesh(new T.CylinderGeometry(radius, radius, direction.length(), 10), material);
    mesh.position.copy(start.clone().add(end).multiplyScalar(.5));
    mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), direction.clone().normalize());
    mesh.castShadow = true;
    parent.add(mesh);
    return register(mesh, unit);
  }

  function railing(x1, z1, x2, z2, y = 1.25, parent = scene, unit = '') {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const length = Math.hypot(dx, dz);
    const count = Math.max(2, Math.ceil(length / .85));
    for (let i = 0; i <= count; i += 1) {
      const ratio = i / count;
      const x = x1 + dx * ratio;
      const z = z1 + dz * ratio;
      cylinder(.025, .025, .62, mat.safety, x, y - .31, z, parent, 8, unit);
    }
    rodBetween([x1, y, z1], [x2, y, z2], .028, mat.safety, parent, unit);
    rodBetween([x1, y - .28, z1], [x2, y - .28, z2], .022, mat.safety, parent, unit);
  }

  function stairs(x, z, direction = 1, parent = scene, unit = '') {
    for (let i = 0; i < 5; i += 1) box(.85, .1 + i * .09, .28, mat.steel, x, .05 + i * .045, z + direction * i * .27, parent, unit);
    railing(x - .45, z, x - .45, z + direction * 1.18, .82, parent, unit);
    railing(x + .45, z, x + .45, z + direction * 1.18, .82, parent, unit);
  }

  function addBillboard(title, subtitle, x, y, z, width = 5.2, accent = '#55d9eb') {
    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 192;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(4,20,31,.94)';
    ctx.fillRect(6, 6, 756, 180);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 5;
    ctx.strokeRect(7, 7, 754, 178);
    ctx.fillStyle = accent;
    ctx.fillRect(7, 7, 16, 178);
    ctx.fillStyle = '#effcff';
    ctx.font = '700 61px "Noto Sans SC", sans-serif';
    ctx.fillText(title, 54, 88);
    ctx.fillStyle = '#86aab7';
    ctx.font = '500 30px "DM Mono", monospace';
    ctx.fillText(subtitle, 56, 143);
    const texture = new T.CanvasTexture(canvas);
    texture.colorSpace = T.SRGBColorSpace;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const sprite = new T.Sprite(new T.SpriteMaterial({ map:texture, transparent:true, depthTest:false }));
    sprite.position.set(x, y, z);
    sprite.scale.set(width, width * .25, 1);
    sprite.renderOrder = 12;
    scene.add(sprite);
    return sprite;
  }

  function addPipeline(name, rawPoints, radius, color, kind, count = 26, rate = .04) {
    const curve = new T.CatmullRomCurve3(rawPoints.map((point) => new T.Vector3(...point)), false, 'catmullrom', .16);
    const casingMaterial = new T.MeshPhysicalMaterial({
      color,
      roughness:.22,
      metalness:.45,
      transparent:true,
      opacity:.34,
      emissive:color,
      emissiveIntensity:.5,
      depthTest:false,
    });
    const casing = new T.Mesh(new T.TubeGeometry(curve, 130, radius * 1.75, 12, false), casingMaterial);
    casing.renderOrder = 2;
    scene.add(casing);
    const coreMaterial = new T.MeshBasicMaterial({ color, transparent:true, opacity:.78, depthTest:false });
    const core = new T.Mesh(new T.TubeGeometry(curve, 130, radius, 10, false), coreMaterial);
    core.renderOrder = 3;
    scene.add(core);
    pipelines.push({ name, kind, casing, core, curve, baseRate:rate });
    for (let i = 0; i < count; i += 1) {
      const particleMaterial = new T.MeshBasicMaterial({
        color,
        transparent:true,
        opacity:.9,
        depthTest:false,
      });
      const dot = new T.Mesh(new T.SphereGeometry(i % 5 === 0 ? radius * 1.25 : radius * .78, 8, 6), particleMaterial);
      dot.renderOrder = 5;
      dot.userData = {
        curve,
        phase:i / count,
        rate:rate * (.9 + (i % 4) * .045),
        kind,
        name,
      };
      scene.add(dot);
      flowParticles.push(dot);
    }
    return { curve, casing, core };
  }

  function valve(x, y, z, rotation = 0, unit = '') {
    const group = new T.Group();
    group.position.set(x, y, z);
    group.rotation.y = rotation;
    box(.34, .34, .42, mat.darkSteel, 0, 0, 0, group, unit);
    cylinder(.08, .08, .48, mat.steel, 0, .36, 0, group, 12, unit);
    const wheel = torus(.27, .035, mat.safety, 0, .64, 0, group, 24, unit);
    wheel.rotation.x = Math.PI / 2;
    scene.add(group);
    return group;
  }

  function pressureGauge(x, y, z, unit = '') {
    cylinder(.035, .035, .52, mat.steel, x, y, z, scene, 8, unit);
    const face = cylinder(.2, .2, .09, mat.white, x, y + .34, z, scene, 20, unit);
    face.rotation.x = Math.PI / 2;
    const rim = torus(.2, .025, mat.darkSteel, x, y + .34, z + .052, scene, 20, unit);
    rim.rotation.x = 0;
    rodBetween([x, y + .34, z + .105], [x + .1, y + .42, z + .105], .012, mat.red, scene, unit);
  }

  function controlCabinet(x, y, z, unit = '', active = false) {
    const cabinet = box(.68, 1.18, .46, mat.darkSteel, x, y + .59, z, scene, unit);
    box(.53, .35, .016, mat.glass, x, y + .77, z + .24, scene, unit);
    for (let i = 0; i < 3; i += 1) sphere(.035, i === 0 && active ? mat.lime : mat.blue, x - .14 + i * .14, y + .42, z + .25, scene, 8, unit);
    return cabinet;
  }

  function pumpSkid(x, y, z, rotationY, unit, index, active = true) {
    const group = new T.Group();
    group.position.set(x, y, z);
    group.rotation.y = rotationY;
    box(1.18, .12, .62, mat.darkSteel, 0, .06, 0, group, unit);
    const motor = cylinder(.24, .24, .68, active ? mat.blue : mat.concreteDark, -.24, .38, 0, group, 20, unit);
    motor.rotation.z = Math.PI / 2;
    const pump = sphere(.31, active ? mat.cyan : mat.steel, .32, .38, 0, group, 18, unit);
    torus(.2, .04, mat.darkSteel, .59, .38, 0, group, 18, unit).rotation.y = Math.PI / 2;
    const rotor = cylinder(.07, .07, .7, mat.safety, -.24, .38, 0, group, 10, unit);
    rotor.rotation.z = Math.PI / 2;
    rotor.userData.station = unit;
    rotor.userData.phase = index * .7;
    pumpRotors.push(rotor);
    scene.add(group);
    return group;
  }

  function addStation(code, x, z, options = {}) {
    const unit = `station-${code.toLowerCase()}`;
    const scale = options.scale || 1;
    const accent = options.accent || mat.cyan;
    const group = new T.Group();
    group.position.set(x, 0, z);
    scene.add(group);
    box(6.2 * scale, .16, 5.1 * scale, mat.concreteDark, 0, .08, 0, group, unit);
    box(5.85 * scale, .11, 4.75 * scale, mat.concrete, 0, .2, 0, group, unit);

    const wetX = -1.55 * scale;
    cylinder(1.18 * scale, 1.18 * scale, 1.15, mat.concreteDark, wetX, .74, 0, group, 32, unit);
    const wetWater = cylinder(.98 * scale, .98 * scale, .08, mat.wastewater, wetX, 1.34, 0, group, 32, unit);
    waterSurfaces.push({ mesh:wetWater, baseY:wetWater.position.y, phase:x * .2, amplitude:.018 });
    torus(1.08 * scale, .07, mat.safety, wetX, 1.45, 0, group, 32, unit);
    rodBetween([wetX - .72 * scale, 1.49, 0], [wetX + .72 * scale, 1.49, 0], .055, mat.steel, group, unit);

    const houseX = 1.05 * scale;
    box(2.9 * scale, 1.75, 3.75 * scale, mat.concreteLight, houseX, 1.08, 0, group, unit);
    box(2.55 * scale, 1.25, .045, mat.glass, houseX, 1.05, 1.9 * scale, group, unit);
    box(3.25 * scale, .2, 4.05 * scale, mat.roof, houseX, 2.03, 0, group, unit);
    box(.76, 1.25, .05, mat.darkSteel, houseX + .82 * scale, .88, 1.93 * scale, group, unit);
    for (let i = 0; i < 4; i += 1) box(.42, .48, .035, mat.window, houseX - .95 * scale + i * .63 * scale, 1.34, 1.94 * scale, group, unit);

    const pumpCount = options.pumps || 3;
    for (let i = 0; i < pumpCount; i += 1) {
      pumpSkid(x + houseX - .78 * scale + i * .78 * scale, .24, z + .48, 0, unit, i, i < pumpCount - 1);
    }
    controlCabinet(x + houseX + 1.05 * scale, .24, z - 1.1 * scale, unit, true);
    pressureGauge(x + 2.5 * scale, .54, z - .85 * scale, unit);
    valve(x + 2.55 * scale, .55, z + .8 * scale, 0, unit);

    railing(x - 2.78 * scale, z - 2.25 * scale, x + 2.78 * scale, z - 2.25 * scale, 1.0, scene, unit);
    stairs(x + 2.15 * scale, z + 2.45 * scale, 1, scene, unit);
    const beaconMaterial = accent.clone();
    const beacon = cylinder(.075, .075, .18, beaconMaterial, x + 1.95 * scale, 2.28, z - 1.5 * scale, scene, 14, unit);
    beacon.userData.station = unit;
    beacons.push(beacon);
    const ringMaterial = new T.MeshBasicMaterial({ color:accent.color, transparent:true, opacity:.45, depthTest:false });
    const ring = torus(2.65 * scale, .028, ringMaterial, x, .37, z, scene, 48, unit);
    ring.userData.station = unit;
    ring.userData.phase = code.charCodeAt(0) * .11;
    ring.renderOrder = 6;
    pulseRings.push(ring);
    addBillboard(`${code} 泵站`, options.subtitle || 'PUMPING STATION', x, code === 'A' ? 5.35 : 4.45, z, 3.55 * scale, options.signAccent || '#55d9eb');
    return group;
  }

  function clarifier(x, z, scale = 1) {
    cylinder(1.45 * scale, 1.38 * scale, .58, mat.concrete, x, .38, z, scene, 36, 'plant');
    const water = cylinder(1.24 * scale, 1.24 * scale, .07, mat.water, x, .71, z, scene, 36, 'plant');
    waterSurfaces.push({ mesh:water, baseY:water.position.y, phase:x + z, amplitude:.012 });
    torus(1.29 * scale, .055, mat.safety, x, .84, z, scene, 36, 'plant');
    cylinder(.22, .22, .62, mat.darkSteel, x, .72, z, scene, 18, 'plant');
    rodBetween([x, .98, z], [x + 1.18 * scale, .98, z], .035, mat.steel, scene, 'plant');
  }

  function buildTreatmentPlant() {
    box(12.0, .14, 10.2, mat.concreteDark, -25.2, .07, 7.4, scene, 'plant');
    box(4.8, .72, 2.15, mat.concrete, -27.0, .44, 4.0, scene, 'plant');
    box(4.45, .07, 1.78, mat.wastewater, -27.0, .83, 4.0, scene, 'plant');
    for (let i = 0; i < 3; i += 1) box(.14, .76, 2.0, mat.concreteLight, -28.15 + i * 1.15, .52, 4.0, scene, 'plant');
    box(4.8, .72, 2.15, mat.concrete, -27.0, .44, 6.55, scene, 'plant');
    box(4.45, .07, 1.78, mat.water, -27.0, .83, 6.55, scene, 'plant');
    clarifier(-23.0, 4.7, .9);
    clarifier(-23.0, 8.1, .9);
    box(4.6, 1.8, 2.35, mat.concreteLight, -27.0, .98, 9.65, scene, 'plant');
    box(4.95, .18, 2.68, mat.roof, -27.0, 1.96, 9.65, scene, 'plant');
    for (let i = 0; i < 4; i += 1) box(.48, .55, .035, mat.window, -28.6 + i * 1.05, 1.16, 8.46, scene, 'plant');
    cylinder(.3, .3, 2.6, mat.blue, -21.3, 1.35, 10.0, scene, 20, 'plant');
    torus(.24, .035, mat.safety, -21.3, 2.68, 10.0, scene, 20, 'plant');
    railing(-30.7, 2.35, -19.5, 2.35, .9, scene, 'plant');
    addBillboard('污水处理厂', 'WWTP · COD RECEIVING POINT', -25.1, 7.25, 7.4, 4.4, '#67a7ff');
  }

  function tree(x, z, scale = 1) {
    cylinder(.11 * scale, .14 * scale, .9 * scale, mat.trunk, x, .46 * scale, z, scene, 10);
    sphere(.45 * scale, mat.vegetation, x, 1.12 * scale, z, scene, 10);
    sphere(.31 * scale, mat.vegetation, x - .25 * scale, .98 * scale, z + .12 * scale, scene, 9);
  }

  function streetLight(x, z, rotation = 0) {
    const group = new T.Group();
    group.position.set(x, 0, z);
    group.rotation.y = rotation;
    cylinder(.045, .065, 2.15, mat.darkSteel, 0, 1.08, 0, group, 10);
    rodBetween([0, 2.1, 0], [.45, 2.1, 0], .035, mat.darkSteel, group);
    const lampMat = mat.window.clone();
    box(.3, .1, .16, lampMat, .48, 2.04, 0, group);
    scene.add(group);
  }

  function cityBuilding(x, z, w, d, h, colorIndex = 0) {
    const colors = [0x173a49, 0x24424d, 0x1c3544, 0x2b4650];
    const material = new T.MeshStandardMaterial({ color:colors[colorIndex % colors.length], roughness:.78, metalness:.18 });
    box(w, h, d, material, x, h / 2 + .25, z);
    box(w + .18, .16, d + .18, mat.darkSteel, x, h + .31, z);
    const rows = Math.max(1, Math.floor(h / .7));
    const columns = Math.max(2, Math.floor(w / .65));
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        if ((row + column + colorIndex) % 3 === 0) continue;
        box(.22, .2, .025, mat.window, x - w / 2 + .38 + column * .58, .75 + row * .63, z + d / 2 + .014);
      }
    }
  }

  function manhole(x, z, label) {
    cylinder(.38, .38, .035, mat.darkSteel, x, .39, z, scene, 24);
    torus(.28, .018, mat.steel, x, .415, z, scene, 24);
    const tickCount = 8;
    for (let i = 0; i < tickCount; i += 1) {
      const angle = i / tickCount * Math.PI * 2;
      box(.13, .018, .025, mat.steel, x + Math.cos(angle) * .19, .44, z + Math.sin(angle) * .19);
    }
    if (label) addBillboard(label, 'MONITORING SHAFT', x, 1.45, z, 2.2, '#6c9cab');
  }

  /* Terrain, roads and urban context */
  box(66, .46, 36, mat.terrain, 0, 0, 2);
  box(67, .12, 37, mat.terrainEdge, 0, -.27, 2);
  const grid = new T.GridHelper(66, 44, 0x1a5963, 0x123b44);
  grid.position.y = .25;
  grid.position.z = 2;
  grid.material.transparent = true;
  grid.material.opacity = .22;
  scene.add(grid);

  box(61, .12, 4.6, mat.road, 0, .31, 2.9);
  box(4.4, .12, 17.2, mat.road, -7.0, .31, -5.1);
  box(4.4, .12, 18.4, mat.road, 8.2, .31, -5.8);
  box(54, .12, 3.8, mat.road, 1.0, .31, 12.2);
  box(4.0, .12, 10.2, mat.road, -22.8, .31, 7.4);
  box(61, .025, .055, mat.lane, 0, .39, 2.9);
  for (let x = -29; x <= 29; x += 3.2) box(1.35, .027, .055, mat.lane, x, .4, 1.55);
  for (let z = -12; z <= 2; z += 2.4) {
    box(.055, .027, 1.05, mat.lane, -7.0, .4, z);
    box(.055, .027, 1.05, mat.lane, 8.2, .4, z);
  }
  for (let x = -23; x <= 27; x += 3.2) box(1.35, .027, .055, mat.lane, x, .4, 12.2);

  [-27,-21,-13,-1,14,21,28].forEach((x, i) => streetLight(x, i % 2 ? .2 : 5.6, i % 2 ? Math.PI : 0));
  [-12,-6,0,6,12].forEach((z, i) => streetLight(i % 2 ? -9.5 : 10.7, z - 3, i % 2 ? Math.PI / 2 : -Math.PI / 2));
  [
    [-29,-11,3.8,3.3,2.8,0],[-23,-11.5,4.6,3.1,3.6,1],[-16,-10.8,3.5,3.7,2.4,2],
    [16,-11.8,4.0,3.0,3.1,3],[22,-10.8,3.3,3.4,2.5,0],[28,-11.2,3.8,3.0,3.8,1],
    [-30,15.2,3.5,2.5,2.7,2],[-15,15.4,4.6,2.5,3.2,3],[19,15.4,4.4,2.4,2.8,0],[27,15.1,3.6,2.7,3.4,1],
  ].forEach((args) => cityBuilding(...args));
  [
    [-31,-5],[-26,-5],[-19,-5],[-13,-5],[14,-5],[20,-5],[27,-5],
    [-31,13],[-18,13],[-11,13],[15,13],[23,13],[31,13],
  ].forEach(([x,z], index) => tree(x, z, .74 + (index % 3) * .1));

  /* Pump stations and treatment plant */
  addStation('A', -16.7, 2.8, { scale:1.02, pumps:4, subtitle:'HUB · RECEIVING STATION', accent:mat.orange, signAccent:'#f0b95d' });
  addStation('B', 24.2, 2.8, { scale:.9, pumps:3, subtitle:'SOURCE · 720 m³/h', accent:mat.cyan, signAccent:'#55d9eb' });
  addStation('C', -7.0, -9.1, { scale:.82, pumps:2, subtitle:'RELAY · BOOSTER', accent:mat.lime, signAccent:'#b7df3f' });
  addStation('D', 8.2, -10.2, { scale:.9, pumps:3, subtitle:'BOOST · DIRECT MAIN', accent:mat.lime, signAccent:'#b7df3f' });
  buildTreatmentPlant();

  /* Underground mains. They remain visible through the road as a digital-twin cutaway. */
  addPipeline('main', [
    [24.2,.24,2.8],[18,.18,2.8],[11,.12,2.8],[4,.1,2.8],[-4,.1,2.8],[-10,.12,2.8],[-16.7,.2,2.8],[-20.5,.2,3.8],[-24.3,.25,6.5],
  ], .16, 0x43d8ef, 'main', 38, .035);
  addPipeline('c-branch', [
    [-7,.22,-9.1],[-7,.1,-5.2],[-7,.08,-1],[-7,.1,2.8],[-10,.12,2.8],[-16.7,.2,2.8],
  ], .13, 0xb7df3f, 'boost', 20, .032);
  addPipeline('d-branch', [
    [8.2,.22,-10.2],[8.2,.1,-6],[8.2,.08,-1],[8.2,.1,2.8],[3,.1,2.8],[-5,.1,2.8],[-16.7,.2,2.8],
  ], .14, 0xb7df3f, 'boost', 24, .034);
  addPipeline('d-direct', [
    [8.2,.2,-10.2],[11,.08,-6],[11,.05,4],[11,.05,12.2],[3,.05,12.2],[-7,.05,12.2],[-17,.08,12.2],[-22,.14,10.8],[-24.5,.24,7.4],
  ], .12, 0xf0b95d, 'direct', 30, .03);

  /* Pipe corridor details: valves, shafts, warning edge and data nodes. */
  [-12,-1,10,18].forEach((x, index) => {
    manhole(x, 2.8, index === 1 ? 'M-03' : '');
    valve(x, .55, 2.8 + (index % 2 ? .55 : -.55), 0, 'risk');
  });
  [-7,8.2].forEach((x) => {
    manhole(x, -2.2, '');
    pressureGauge(x + .6, .55, -1.8, x < 0 ? 'station-c' : 'station-d');
  });

  const riskMaterial = new T.MeshBasicMaterial({ color:0xf0a94f, transparent:true, opacity:.09, depthWrite:false });
  const riskVolume = box(29.5, .66, 3.35, riskMaterial, 3.0, .58, 2.8, scene, 'risk');
  riskVolume.renderOrder = 1;
  const riskEdges = new T.LineSegments(
    new T.EdgesGeometry(new T.BoxGeometry(29.5, .66, 3.35)),
    new T.LineBasicMaterial({ color:0xf0a94f, transparent:true, opacity:.58, depthTest:false }),
  );
  riskEdges.position.copy(riskVolume.position);
  riskEdges.renderOrder = 7;
  scene.add(riskEdges);
  const scanMaterial = new T.MeshBasicMaterial({ color:0xffc462, transparent:true, opacity:.28, side:T.DoubleSide, depthTest:false });
  const riskScan = new T.Mesh(new T.PlaneGeometry(3.1, .58), scanMaterial);
  riskScan.position.set(16.8, .62, 2.8);
  riskScan.rotation.y = Math.PI / 2;
  riskScan.renderOrder = 8;
  scene.add(riskScan);
  addBillboard('COD 疑似损失走廊', 'B—A · LOW VELOCITY / LONG RESIDENCE', 3.0, 1.95, 2.8, 6.4, '#f0a94f');

  /* Roadside telemetry pylons and a small moving maintenance fleet. */
  [-12,-1,10,18].forEach((x, index) => {
    cylinder(.055, .055, 1.55, mat.darkSteel, x, 1.04, 5.15, scene, 10);
    box(.42, .3, .28, mat.darkSteel, x, 1.78, 5.15);
    box(.28, .12, .02, mat.window, x, 1.8, 5.0);
    const light = sphere(.055, index === 1 ? mat.orange : mat.lime, x, 2.02, 5.15, scene, 9);
    beacons.push(light);
  });
  for (let i = 0; i < 2; i += 1) {
    const vehicle = new T.Group();
    box(1.05, .38, .58, i ? mat.blue : mat.orange, 0, .45, 0, vehicle);
    box(.45, .32, .52, mat.glass, .2, .78, 0, vehicle);
    [-.35,.35].forEach((x) => [-.31,.31].forEach((z) => {
      const wheel = cylinder(.12, .12, .12, mat.darkSteel, x, .27, z, vehicle, 14);
      wheel.rotation.x = Math.PI / 2;
    }));
    vehicle.position.set(-28 + i * 28, .3, i ? 12.2 : 2.9);
    vehicle.userData = { phase:i * .46, lane:i ? 12.2 : 2.9, direction:i ? -1 : 1 };
    scene.add(vehicle);
    vehicles.push(vehicle);
  }

  const selectionRing = torus(2.9, .045, new T.MeshBasicMaterial({
    color:0xf0b95d, transparent:true, opacity:.75, depthTest:false,
  }), 3, .43, 2.8, scene, 64);
  selectionRing.renderOrder = 9;

  const cameraState = {
    target:new T.Vector3(0, 0, 2.5),
    focusTarget:new T.Vector3(0, 0, 2.5),
    radius:49,
    radiusGoal:49,
    height:28,
    heightGoal:28,
    yaw:-.92,
    yawGoal:-.92,
    dragging:false,
    lastX:0,
    lastY:0,
    autoRotate:false,
    runningBoost:false,
    tourTimer:0,
    tourIndex:0,
  };

  const cameraViews = {
    system:{ target:[0,0,2.4], radius:47, height:32, yaw:-.92 },
    detail:{ target:[26.8,1.2,8.5], radius:11, height:7, yaw:.8 },
    underground:{ target:[2,0,2.8], radius:38, height:12.5, yaw:-1.28 },
    'station-a':{ target:[-16.7,.5,2.8], radius:13.2, height:8.2, yaw:-.82 },
    'station-b':{ target:[24.2,.5,2.8], radius:12.5, height:7.7, yaw:.82 },
    'station-c':{ target:[-7,.5,-9.1], radius:11.4, height:7.2, yaw:-.2 },
    'station-d':{ target:[8.2,.5,-10.2], radius:11.8, height:7.4, yaw:.28 },
    risk:{ target:[3,.15,2.8], radius:27.5, height:9.2, yaw:-1.48 },
    plant:{ target:[-25.1,.5,7.4], radius:15.5, height:9.4, yaw:-.7 },
  };

  const tourStops = [
    { view:'system', unit:'risk', label:'全网拓扑 · B 到 A 长距离输送' },
    { view:'station-b', unit:'station-b', label:'B 源头泵站 · COD 输送起点' },
    { view:'risk', unit:'risk', label:'疑似损失段 · 低流速与长停留' },
    { view:'station-d', unit:'station-d', label:'D 增压泵站 · 第一接力点' },
    { view:'station-c', unit:'station-c', label:'C 接力泵站 · 时序整形' },
    { view:'station-a', unit:'station-a', label:'A 枢纽泵站 · 汇流接收' },
    { view:'plant', unit:'plant', label:'污水处理厂 · COD 到厂确认' },
  ];

  function setCameraView(name) {
    const view = cameraViews[name] || cameraViews.system;
    cameraState.focusTarget.set(...view.target);
    cameraState.radiusGoal = view.radius;
    cameraState.heightGoal = view.height;
    cameraState.yawGoal = view.yaw;
    $$('[data-network-camera]').forEach((button) => button.classList.toggle('active', button.dataset.networkCamera === name));
  }

  function focus(unit) {
    const viewName = cameraViews[unit] ? unit : unit === 'risk' ? 'risk' : 'system';
    setCameraView(viewName);
    const anchor = stationAnchors[unit] || stationAnchors.risk;
    selectionRing.position.set(anchor.x, .43, anchor.z);
    selectionRing.scale.setScalar(unit === 'risk' ? 2.5 : unit === 'plant' ? 1.65 : 1);
  }

  function scheduleTour() {
    clearTimeout(cameraState.tourTimer);
    if (!cameraState.autoRotate) return;
    cameraState.tourTimer = setTimeout(() => {
      cameraState.tourIndex = (cameraState.tourIndex + 1) % tourStops.length;
      const stop = tourStops[cameraState.tourIndex];
      setCameraView(stop.view);
      selectNetworkUnit(stop.unit, false);
      if (!networkModelState.running) $('#networkSimulationState').textContent = `自动巡航 · ${stop.label}`;
      scheduleTour();
    }, document.body.classList.contains('network-presentation') ? 5200 : 4300);
  }

  function startTour() {
    cameraState.autoRotate = true;
    $('#networkTourToggle').classList.add('active');
    $('#networkPresentationTour').classList.add('active');
    scheduleTour();
  }

  function stopTour() {
    cameraState.autoRotate = false;
    clearTimeout(cameraState.tourTimer);
    $('#networkTourToggle').classList.remove('active');
    $('#networkPresentationTour').classList.remove('active');
    if (!networkModelState.running) $('#networkSimulationState').textContent = networkModelState.mode === 'optimized' ? '保 COD 智能调度' : '当前调度 · COD 持续衰减';
  }

  function toggleTour() {
    if (cameraState.autoRotate) stopTour();
    else startTour();
  }

  function setMode(mode, fromRun = false) {
    const optimized = mode === 'optimized';
    pipelines.forEach((pipe) => {
      const isBoost = pipe.kind !== 'main';
      pipe.casing.material.opacity = optimized ? (isBoost ? .56 : .44) : (isBoost ? .24 : .38);
      pipe.casing.material.emissiveIntensity = optimized ? (isBoost ? 1.15 : .82) : .42;
      pipe.core.material.opacity = optimized ? .95 : (isBoost ? .42 : .72);
    });
    riskVolume.material.opacity = optimized ? .035 : .1;
    riskEdges.material.opacity = optimized ? .28 : .62;
    scanMaterial.opacity = optimized ? .12 : .3;
    selectionRing.material.color.set(optimized ? 0xb7df3f : 0xf0b95d);
    if (fromRun) {
      stopTour();
      setCameraView('risk');
    }
  }

  const pointer = renderer.domElement;
  pointer.addEventListener('pointerdown', (event) => {
    cameraState.dragging = true;
    cameraState.lastX = event.clientX;
    cameraState.lastY = event.clientY;
    stopTour();
    pointer.setPointerCapture(event.pointerId);
  });
  pointer.addEventListener('pointermove', (event) => {
    if (!cameraState.dragging) return;
    const dx = event.clientX - cameraState.lastX;
    const dy = event.clientY - cameraState.lastY;
    cameraState.yawGoal -= dx * .0055;
    cameraState.heightGoal = clamp(cameraState.heightGoal + dy * .025, 5, 38);
    cameraState.lastX = event.clientX;
    cameraState.lastY = event.clientY;
  });
  pointer.addEventListener('pointerup', (event) => {
    cameraState.dragging = false;
    if (pointer.hasPointerCapture(event.pointerId)) pointer.releasePointerCapture(event.pointerId);
  });
  pointer.addEventListener('pointercancel', () => { cameraState.dragging = false; });
  pointer.addEventListener('wheel', (event) => {
    event.preventDefault();
    stopTour();
    cameraState.radiusGoal = clamp(cameraState.radiusGoal + event.deltaY * .018, 8.5, 64);
  }, { passive:false });

  const pinEntries = $$('[data-network-pin]').map((element) => ({
    element,
    anchor:stationAnchors[element.dataset.networkPin].clone(),
    projected:new T.Vector3(),
  }));

  function updateScenePins() {
    if (!pinEntries.length || window.innerWidth <= 760) return;
    const width = mount.clientWidth || 1;
    const height = mount.clientHeight || 1;
    const reserve = document.body.classList.contains('network-presentation') ? 185 : 150;
    pinEntries.forEach((entry) => {
      entry.projected.copy(entry.anchor).project(camera);
      const rawX = (entry.projected.x * .5 + .5) * width;
      const rawY = (-entry.projected.y * .5 + .5) * height;
      const visible = entry.projected.z > -1 && entry.projected.z < 1
        && rawX > -30 && rawX < width + 30 && rawY > 54 && rawY < height - 72;
      entry.element.classList.toggle('visible', visible);
      if (!visible) return;
      entry.element.style.left = `${clamp(rawX, 18, width - reserve)}px`;
      entry.element.style.top = `${clamp(rawY, 82, height - 104)}px`;
    });
  }

  function resize() {
    const width = Math.max(1, mount.clientWidth);
    const height = Math.max(1, mount.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  const startColor = new T.Color(0x57e3f4);
  const lossColor = new T.Color(0xf0a14c);
  const criticalColor = new T.Color(0xe9675d);
  const optimizedColor = new T.Color(0xc8ed55);
  let lastMs = 0;
  let lastRenderMs = -100;
  function animate(ms) {
    if (state.route !== 'network') {
      lastMs = ms;
      state.networkThree.frame = requestAnimationFrame(animate);
      return;
    }
    const frameInterval = cameraState.runningBoost ? 22 : 33;
    if (ms && ms - lastRenderMs < frameInterval) {
      state.networkThree.frame = requestAnimationFrame(animate);
      return;
    }
    const delta = Math.min(.05, (ms - lastMs) * .001 || .016);
    lastMs = ms;
    lastRenderMs = ms;
    const t = ms * .001;
    const optimized = networkModelState.mode === 'optimized';
    cameraState.target.lerp(cameraState.focusTarget, .044);
    cameraState.radius += (cameraState.radiusGoal - cameraState.radius) * .05;
    cameraState.height += (cameraState.heightGoal - cameraState.height) * .05;
    cameraState.yaw += (cameraState.yawGoal - cameraState.yaw) * .052;
    if (cameraState.autoRotate && cameraState.tourIndex === 0) cameraState.yawGoal += delta * .028;
    camera.position.set(
      cameraState.target.x + Math.sin(cameraState.yaw) * cameraState.radius,
      cameraState.height,
      cameraState.target.z + Math.cos(cameraState.yaw) * cameraState.radius,
    );
    camera.lookAt(cameraState.target);

    flowParticles.forEach((dot, index) => {
      const boost = optimized ? (dot.userData.kind === 'main' ? 2.25 : 2.8) : (dot.userData.kind === 'main' ? .78 : .48);
      const runBoost = cameraState.runningBoost ? 1.38 : 1;
      const progress = (dot.userData.phase + t * dot.userData.rate * boost * runBoost * state.speed) % 1;
      dot.position.copy(dot.userData.curve.getPointAt(progress));
      if (optimized) {
        dot.material.color.copy(optimizedColor).lerp(startColor, .32 + Math.sin(index) * .08);
        dot.material.opacity = .78 + Math.sin(t * 3 + index) * .17;
        dot.scale.setScalar(.92 + Math.sin(t * 4 + index) * .16);
      } else if (dot.userData.kind === 'main') {
        dot.material.color.copy(startColor).lerp(progress > .72 ? criticalColor : lossColor, Math.pow(progress, .72));
        dot.material.opacity = .9 - progress * .48;
        dot.scale.setScalar(1 - progress * .42);
      } else {
        dot.material.color.copy(optimizedColor);
        dot.material.opacity = .25 + Math.max(0, Math.sin(t * 2 + index)) * .24;
        dot.scale.setScalar(.72);
      }
    });

    pumpRotors.forEach((rotor, index) => {
      const station = rotor.userData.station;
      const relay = station === 'station-c' || station === 'station-d';
      const multiplier = optimized ? (relay ? 2.8 : 1.9) : (relay ? .65 : 1);
      rotor.rotation.x += delta * (8 + index * .25) * multiplier * state.speed;
    });
    beacons.forEach((beacon, index) => {
      if (!beacon.material.emissive) return;
      const phase = Math.max(0, Math.sin(t * (optimized ? 4.2 : 2.6) + index * .68));
      beacon.material.emissiveIntensity = .35 + phase * (optimized ? 1.7 : .8);
    });
    pulseRings.forEach((ring, index) => {
      const progress = (ring.userData.phase + t * (optimized ? .55 : .24)) % 1;
      ring.scale.setScalar(.83 + progress * (optimized ? .45 : .2));
      ring.material.opacity = (1 - progress) * (optimized ? .55 : .25);
      ring.rotation.z += delta * .06 * (index % 2 ? 1 : -1);
    });
    waterSurfaces.forEach((water) => {
      water.mesh.position.y = water.baseY + Math.sin(t * 1.25 + water.phase) * water.amplitude;
    });
    vehicles.forEach((vehicle) => {
      const progress = (vehicle.userData.phase + t * .012 * state.speed) % 1;
      const x = vehicle.userData.direction > 0 ? -30 + progress * 60 : 30 - progress * 60;
      vehicle.position.x = x;
    });
    riskScan.position.x = 17.0 - ((t * (optimized ? .38 : .72)) % 1) * 28.0;
    riskScan.material.opacity = optimized ? .07 + Math.max(0, Math.sin(t * 2.2)) * .06 : .2 + Math.max(0, Math.sin(t * 2.8)) * .18;
    selectionRing.rotation.z += delta * .22;
    selectionRing.material.opacity = .5 + Math.sin(t * 2.4) * .22;
    updateScenePins();
    renderer.render(scene, camera);
    state.networkThree.frame = requestAnimationFrame(animate);
  }

  state.networkThree = {
    scene, camera,
    renderer,
    resize,
    focus,
    setView:setCameraView,
    setMode,
    startTour,
    stopTour,
    toggleTour,
    setRunning(value) { cameraState.runningBoost = value; },
    frame:0,
  };
  resize();
  window.FlowPilotVisuals?.enhance('network', scene, renderer, mat);
  window.FlowPilotModels?.attach('network', scene, camera);
  setMode(networkModelState.mode);
  focus('risk');
  setCameraView('system');
  animate(0);
  window.addEventListener('resize', resize);
  new ResizeObserver(() => {
    if (mount.clientWidth && mount.clientHeight) resize();
  }).observe(mount);
}
