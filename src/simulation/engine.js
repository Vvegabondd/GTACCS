// ============================================================
// GTACCS Simulation Engine v2
// Flowchart-aligned: Scenario → Flows → Packets → Bottleneck
// → Congestion Detection → Algo Response → Metrics → Game Theory
// ============================================================

export const NODES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

export const LINKS = [
  { from: 'A', to: 'B', capacity: 100 },
  { from: 'A', to: 'C', capacity: 80  },
  { from: 'B', to: 'D', capacity: 60  },
  { from: 'C', to: 'D', capacity: 70  },
  { from: 'D', to: 'E', capacity: 50  },
  { from: 'E', to: 'F', capacity: 100 },
  { from: 'F', to: 'G', capacity: 90  },
  { from: 'G', to: 'H', capacity: 80  },
  { from: 'H', to: 'I', capacity: 70  },
  { from: 'I', to: 'J', capacity: 60  },
];

export const BOTTLENECK_LINK = 'D-E';
export const BOTTLENECK_CAPACITY = 50;

export const NODE_POSITIONS = {
  A: { x: 60,  y: 130 }, B: { x: 180, y: 50 },  C: { x: 180, y: 210 },
  D: { x: 300, y: 130 }, E: { x: 400, y: 130 }, F: { x: 500, y: 130 },
  G: { x: 600, y: 130 }, H: { x: 700, y: 130 }, I: { x: 800, y: 130 },
  J: { x: 900, y: 130 },
};

export const STRATEGY_META = {
  aggressive:   { label: 'Aggressive',   color: '#ef4444', bg: '#fef2f2', border: '#fecaca', icon: '⚡', desc: 'Continuously increases rate — causes heavy congestion' },
  conservative: { label: 'Conservative', color: '#22c55e', bg: '#f0fdf4', border: '#bbf7d0', icon: '🛡️', desc: 'Backs off early at 50% queue — stable but lower throughput' },
  aimd:         { label: 'TCP AIMD',     color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', icon: '📈', desc: 'Additive Increase, Multiplicative Decrease — TCP-like sawtooth' },
  adaptive:     { label: 'Adaptive RL',  color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', icon: '🔄', desc: 'Observes queue + loss state, dynamically adjusts rate' },
};

export const DEFAULT_FLOWS = [
  { id: 'F1', path: ['A','B','D','E','F','G','H','I','J'], strategy: 'aggressive',   rate: 40, color: '#ef4444' },
  { id: 'F2', path: ['C','D','E','F','G','H'],             strategy: 'adaptive',     rate: 40, color: '#3b82f6' },
  { id: 'F3', path: ['B','D','E','F','G'],                 strategy: 'aimd',         rate: 40, color: '#f59e0b' },
  { id: 'F4', path: ['A','C','D','E','F'],                 strategy: 'conservative', rate: 40, color: '#22c55e' },
];

export const SCENARIOS = {
  mixed: {
    name: 'Default Mixed', desc: 'One of each strategy — models real-world internet heterogeneity.', icon: '🌐',
    flows: DEFAULT_FLOWS,
  },
  low_traffic: {
    name: 'Low Traffic', desc: 'All flows at low rate — queue stays clear, no congestion.', icon: '🟢',
    flows: DEFAULT_FLOWS.map(f => ({ ...f, rate: 8 })),
  },
  heavy_congestion: {
    name: 'Heavy Congestion', desc: 'All flows aggressive — demonstrates network collapse.', icon: '🔴',
    flows: DEFAULT_FLOWS.map(f => ({ ...f, strategy: 'aggressive', rate: 60 })),
  },
  burst_traffic: {
    name: 'Burst Traffic', desc: 'High initial rates — observe queue buildup and recovery.', icon: '⚡',
    flows: DEFAULT_FLOWS.map((f, i) => ({ ...f, rate: i % 2 === 0 ? 70 : 10 })),
  },
  fairness_critical: {
    name: 'Fairness Critical', desc: 'All adaptive — converges to Nash Equilibrium with high fairness.', icon: '⚖️',
    flows: DEFAULT_FLOWS.map(f => ({ ...f, strategy: 'adaptive', rate: 40 })),
  },
  adaptive_env: {
    name: 'Adaptive Environment', desc: 'Mixed adaptive and AIMD — observe co-adaptation dynamics.', icon: '🔄',
    flows: DEFAULT_FLOWS.map((f, i) => ({ ...f, strategy: i % 2 === 0 ? 'adaptive' : 'aimd' })),
  },
};

const aimdState = {};
function getAimd(id) {
  if (!aimdState[id]) aimdState[id] = { ssthresh: 64, slowStart: true };
  return aimdState[id];
}

function updateRate(flow, lossDetected, queueUtil) {
  let rate = flow.rate;
  switch (flow.strategy) {
    case 'aggressive':
      rate *= lossDetected ? 0.85 : 1.25;
      break;
    case 'conservative':
      if (queueUtil > 0.5)      rate *= 0.75;
      else if (queueUtil < 0.3) rate += 1.5;
      break;
    case 'aimd': {
      const st = getAimd(flow.id);
      if (lossDetected) {
        st.ssthresh = Math.max(rate / 2, 2);
        rate = st.ssthresh;
        st.slowStart = false;
      } else {
        if (st.slowStart) { rate += 8; if (rate >= st.ssthresh) st.slowStart = false; }
        else rate += 1;
      }
      break;
    }
    case 'adaptive':
      if (lossDetected)          rate *= 0.55;
      else if (queueUtil > 0.7)  rate *= 0.95;
      else                       rate += 2.0;
      break;
    default:
      rate *= lossDetected ? 0.80 : 1.10;
  }
  return Math.max(0.5, Math.min(rate, 500));
}

function pathEdges(path) {
  const edges = [];
  for (let i = 0; i < path.length - 1; i++) edges.push(`${path[i]}-${path[i+1]}`);
  return edges;
}

function runCongestionRound(flows) {
  const linkDemand = {};
  LINKS.forEach(l => { linkDemand[`${l.from}-${l.to}`] = 0; });
  flows.forEach(flow => pathEdges(flow.path).forEach(e => { if (linkDemand[e] !== undefined) linkDemand[e] += flow.rate; }));

  const linkLoss = {}, linkUtil = {};
  LINKS.forEach(l => {
    const key = `${l.from}-${l.to}`;
    const d = linkDemand[key] || 0;
    linkUtil[key] = Math.min(d / l.capacity, 1.0);
    linkLoss[key] = d > l.capacity ? (d - l.capacity) / d : 0;
  });

  const updatedFlows = flows.map(flow => {
    const edges = pathEdges(flow.path);
    const loss = Math.max(...edges.map(e => linkLoss[e] || 0));
    return { ...flow, throughput: flow.rate * (1 - loss), delay: 10 * (1 + 5 * loss), lossRate: loss };
  });

  return { updatedFlows, linkLoss, linkUtil, linkDemand };
}

function computePayoff(flow, alpha = 0.3, beta = 2.0) {
  return flow.throughput - alpha * flow.delay - beta * flow.lossRate * 100;
}

export function jainsIndex(flows) {
  const x = flows.map(f => f.throughput);
  const n = x.length;
  if (!n) return 0;
  const s = x.reduce((a,b)=>a+b,0), s2 = x.reduce((a,b)=>a+b*b,0);
  return s2 === 0 ? 0 : (s*s)/(n*s2);
}

function checkEquilibrium(flowHistories, window = 8, threshold = 1.5) {
  return flowHistories.every(h => {
    if (h.length < window) return false;
    const r = h.slice(-window);
    return Math.max(...r) - Math.min(...r) < threshold;
  });
}

export function deriveInsight(flowsWithPayoff, fairness, equilibrium) {
  const sorted = [...flowsWithPayoff].sort((a,b) => (b.payoff||0) - (a.payoff||0));
  const best = sorted[0];
  const avgLoss = flowsWithPayoff.reduce((s,f) => s + (f.lossRate||0), 0) / (flowsWithPayoff.length || 1);
  if (avgLoss > 0.5)                 return { type: 'danger',  msg: 'Severe congestion — network near collapse. Aggressive flows dominate at the cost of all others.' };
  if (fairness > 0.85 && equilibrium) return { type: 'success', msg: `Nash Equilibrium reached — all flows self-organized equitably. ${STRATEGY_META[best?.strategy]?.label} leads.` };
  if (fairness < 0.4)                return { type: 'warning', msg: `Low fairness (${(fairness*100).toFixed(0)}%). ${STRATEGY_META[best?.strategy]?.label} is dominating bandwidth.` };
  if (equilibrium)                   return { type: 'info',    msg: `Equilibrium detected. Best: ${STRATEGY_META[best?.strategy]?.label}. No algorithm is universally optimal.` };
  return { type: 'info', msg: 'Flows competing for shared bottleneck D→E (50 Mbps). Watch for congestion signals and queue buildup.' };
}

export function simulationStep(flows, payoffHistories, alpha = 0.3, beta = 2.0) {
  const { updatedFlows, linkLoss, linkUtil, linkDemand } = runCongestionRound(flows);
  const flowsWithPayoff = updatedFlows.map(flow => ({ ...flow, payoff: computePayoff(flow, alpha, beta) }));
  const nextFlows = flowsWithPayoff.map(flow => ({
    ...flow, rate: updateRate(flow, flow.lossRate > 0.01, linkUtil[BOTTLENECK_LINK] || 0),
  }));
  const newHistories = payoffHistories.map((h,i) => [...h, flowsWithPayoff[i]?.payoff || 0]);
  const equilibrium = checkEquilibrium(newHistories);
  const totalThroughput = flowsWithPayoff.reduce((s,f) => s + f.throughput, 0);
  const fairness = jainsIndex(flowsWithPayoff);
  const congestedNodes = new Set();
  LINKS.forEach(l => {
    const key = `${l.from}-${l.to}`;
    if ((linkUtil[key]||0) > 0.85) { congestedNodes.add(l.from); congestedNodes.add(l.to); }
  });
  return {
    flows: nextFlows, linkLoss, linkUtil, linkDemand,
    fairness, totalThroughput, equilibrium, congestedNodes,
    flowsWithPayoff, newHistories,
    bottleneckUtil: linkUtil[BOTTLENECK_LINK] || 0,
    insight: deriveInsight(flowsWithPayoff, fairness, equilibrium),
  };
}

export function initSimulation(customFlows = null) {
  Object.keys(aimdState).forEach(k => delete aimdState[k]);
  const flows = (customFlows || DEFAULT_FLOWS).map(f => ({ ...f, throughput: 0, delay: 0, lossRate: 0, payoff: 0 }));
  return { flows, payoffHistories: flows.map(() => []) };
}
