import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import Dashboard from './components/Dashboard';
import FlowsTab from './components/FlowsTab';
import PayoffTab from './components/PayoffTab';
import ComparisonTab from './components/ComparisonTab';
import TheoryTab from './components/TheoryTab';
import AnalyticsTab from './components/AnalyticsTab';
import Sidebar from './components/Sidebar';
import { simulationStep, initSimulation, DEFAULT_FLOWS, SCENARIOS } from './simulation/engine';

const SPEED_MAP = { '0.5x': 2000, '1x': 1000, '2x': 500, '5x': 200, '10x': 100 };
const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'analytics', label: 'Analytics', icon: '🧮' },
  { id: 'flows',     label: 'Flows',     icon: '🔀' },
  { id: 'payoff',    label: 'Payoff',    icon: '💰' },
  { id: 'comparison',label: 'Compare',   icon: '⚔️' },
  // { id: 'theory',    label: 'Theory',    icon: '📚' },
];

export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [round, setRound] = useState(0);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState('1x');
  const [alpha, setAlpha] = useState(0.3);
  const [beta, setBeta] = useState(2.0);
  const [equilibrium, setEquilibrium] = useState(false);
  const [equilibriumRound, setEquilibriumRound] = useState(null);
  const [activeScenario, setActiveScenario] = useState('mixed');
  const [insight, setInsight] = useState(null);
  const [mode, setMode] = useState('arena'); // 'playground' | 'arena'

  const [flows, setFlows] = useState(DEFAULT_FLOWS.map(f => ({ ...f, throughput: 0, delay: 0, lossRate: 0, payoff: 0 })));
  const [payoffHistories, setPayoffHistories] = useState(DEFAULT_FLOWS.map(() => []));
  const [linkUtil, setLinkUtil] = useState({});
  const [linkLoss, setLinkLoss] = useState({});
  const [linkDemand, setLinkDemand] = useState({});
  const [fairness, setFairness] = useState(0);
  const [totalThroughput, setTotalThroughput] = useState(0);
  const [congestedNodes, setCongestedNodes] = useState(new Set());
  const [flowsWithPayoff, setFlowsWithPayoff] = useState([]);
  const [historyChart, setHistoryChart] = useState([]);
  const [bottleneckUtil, setBottleneckUtil] = useState(0);

  const timerRef = useRef(null);
  const stateRef = useRef({ flows, payoffHistories, alpha, beta });
  const equilibriumRef = useRef(false);

  useEffect(() => { stateRef.current = { flows, payoffHistories, alpha, beta }; }, [flows, payoffHistories, alpha, beta]);

  const doStep = useCallback(() => {
    const { flows: cur, payoffHistories: hist, alpha: a, beta: b } = stateRef.current;
    const result = simulationStep(cur, hist, a, b);
    setFlows(result.flows);
    setPayoffHistories(result.newHistories);
    setLinkUtil(result.linkUtil);
    setLinkLoss(result.linkLoss);
    setLinkDemand(result.linkDemand);
    setFairness(result.fairness);
    setTotalThroughput(result.totalThroughput);
    setEquilibrium(result.equilibrium);
    setCongestedNodes(result.congestedNodes);
    setFlowsWithPayoff(result.flowsWithPayoff);
    setBottleneckUtil(result.bottleneckUtil);
    setInsight(result.insight);
    setRound(r => {
      const nr = r + 1;
      if (result.equilibrium && !equilibriumRef.current) { equilibriumRef.current = true; setEquilibriumRound(nr); }
      const pt = { round: nr, throughput: +result.totalThroughput.toFixed(1), fairness: +result.fairness.toFixed(3) };
      result.flowsWithPayoff.forEach(f => {
        pt['rate_'+f.id]       = +(f.rate||0).toFixed(2);
        pt['payoff_'+f.id]     = +(f.payoff||0).toFixed(2);
        pt['delay_'+f.id]      = +(f.delay||0).toFixed(2);
        pt['loss_'+f.id]       = +((f.lossRate||0)*100).toFixed(2);
        pt['throughput_'+f.id] = +(f.throughput||0).toFixed(2);
      });
      setHistoryChart(prev => [...prev, pt]);
      return nr;
    });
  }, []);

  useEffect(() => {
    if (running) timerRef.current = setInterval(doStep, SPEED_MAP[speed] || 1000);
    return () => clearInterval(timerRef.current);
  }, [running, speed, doStep]);

  function handleScenario(key) {
    setActiveScenario(key);
    handleReset(SCENARIOS[key].flows);
  }

  function handleReset(customFlows) {
    setRunning(false); clearInterval(timerRef.current);
    equilibriumRef.current = false;
    setRound(0); setEquilibrium(false); setEquilibriumRound(null);
    setFairness(0); setTotalThroughput(0);
    setLinkUtil({}); setLinkLoss({}); setLinkDemand({});
    setCongestedNodes(new Set()); setFlowsWithPayoff([]);
    setHistoryChart([]); setInsight(null); setBottleneckUtil(0);
    const src = customFlows || flows.map(f => ({ id: f.id, path: f.path, strategy: f.strategy, rate: 40, color: f.color }));
    const init = initSimulation(src);
    setFlows(init.flows); setPayoffHistories(init.payoffHistories);
  }

  function handleUpdateFlows(newFlows) {
    equilibriumRef.current = false;
    const init = initSimulation(newFlows);
    setFlows(init.flows); setPayoffHistories(init.payoffHistories);
    setRound(0); setEquilibrium(false); setEquilibriumRound(null);
    setFairness(0); setTotalThroughput(0);
    setLinkUtil({}); setLinkLoss({});
    setCongestedNodes(new Set()); setFlowsWithPayoff([]); setHistoryChart([]);
  }

  const sharedState = {
    flows, linkUtil, linkLoss, linkDemand, fairness, totalThroughput,
    equilibrium, congestedNodes, flowsWithPayoff,
    historyChart: historyChart.slice(-40), bottleneckUtil, insight,
  };

  const scenarioInfo = SCENARIOS[activeScenario];
  const isBottleneckCongested = bottleneckUtil > 0.8;

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="logo">GT<span>ACCS</span></div>

        <div className="header-spacer" />

        <nav className="nav-tabs">
          {TABS.map(t => (
            <button key={t.id} className={'nav-tab' + (tab === t.id ? ' active' : '')} onClick={() => setTab(t.id)}>
              <span className="tab-icon">{t.icon}</span>
              <span className="tab-label">{t.label}</span>
            </button>
          ))}
        </nav>
      </header>

      <div className="app-container">
        <Sidebar 
          mode={mode} setMode={setMode} 
          activeScenario={activeScenario} onSelectScenario={handleScenario} 
        />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="sim-controls">
            <div className="sim-round">Round <span>{round}</span></div>

            <button className="ctrl-btn primary" onClick={() => setRunning(r => !r)}>
              {running ? '⏸ Pause' : '▶ Play'}
            </button>
            <button className="ctrl-btn ghost" onClick={doStep} disabled={running}>⏭ Step</button>
            <button className="ctrl-btn danger" onClick={() => handleReset()}>↺ Reset</button>

            <select className="speed-select" value={speed} onChange={e => setSpeed(e.target.value)}>
              {Object.keys(SPEED_MAP).map(s => <option key={s} value={s}>{s} Speed</option>)}
            </select>

            <div className="ctrl-spacer" />

            <div className="bottleneck-meter">
              <span className="bm-label">D→E</span>
              <div className="bm-bar">
                <div className="bm-fill" style={{ width: (bottleneckUtil * 100) + '%', background: isBottleneckCongested ? '#ef4444' : '#22c55e' }} />
              </div>
              <span className="bm-pct" style={{ color: isBottleneckCongested ? '#ef4444' : '#22c55e' }}>
                {Math.round(bottleneckUtil * 100)}%
              </span>
            </div>

            <div className={'eq-badge' + (equilibrium ? ' reached' : ' searching')}>
              {equilibrium ? ('⚡ NASH EQ — R' + equilibriumRound) : '🔍 Searching...'}
            </div>

            {congestedNodes.size > 0 && (
              <div className="congestion-pill">
                🔴 {Array.from(congestedNodes).slice(0,4).join(', ')}
              </div>
            )}
          </div>

          {insight && (
            <div className={'insight-bar insight-' + insight.type}>
              <span className="insight-icon">
                {insight.type === 'danger' ? '🚨' : insight.type === 'success' ? '✅' : insight.type === 'warning' ? '⚠️' : 'ℹ️'}
              </span>
              {insight.msg}
            </div>
          )}

          <main className="main-content">
            {tab === 'dashboard'  && <Dashboard state={sharedState} mode={mode} />}
            {tab === 'analytics'  && <AnalyticsTab state={{ ...sharedState, historyChart }} alpha={alpha} beta={beta} equilibriumRound={equilibriumRound} round={round} flows={flows} />}
            {tab === 'flows'      && <FlowsTab flows={flows} onUpdateFlows={handleUpdateFlows} running={running} />}
            {tab === 'payoff'     && <PayoffTab state={sharedState} alpha={alpha} beta={beta} onAlpha={setAlpha} onBeta={setBeta} />}
            {tab === 'comparison' && <ComparisonTab />}
            {/* {tab === 'theory'     && <TheoryTab />} */}
          </main>
        </div>
      </div>
    </div>
  );
}
