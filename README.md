# GTACCS — Game-Theoretic Adaptive Congestion Control System

## Complete Technical Documentation

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Quick Start](#2-quick-start)
3. [System Architecture](#3-system-architecture)
4. [Network Topology](#4-network-topology)
5. [Simulation Engine (Phase-by-Phase)](#5-simulation-engine)
   - [Phase 1: Network Graph](#51-phase-1-network-graph)
   - [Phase 2: Flow Modeling](#52-phase-2-flow-modeling)
   - [Phase 3: Strategy Engine](#53-phase-3-strategy-engine)
   - [Phase 4: Congestion Engine](#54-phase-4-congestion-engine)
   - [Phase 5: Payoff Calculator](#55-phase-5-payoff-calculator)
   - [Phase 6: Equilibrium Detector](#56-phase-6-equilibrium-detector)
   - [Phase 7: Strategy Comparison](#57-phase-7-strategy-comparison)
   - [Phase 8: Master Dashboard](#58-phase-8-master-dashboard)
6. [Game Theory Concepts](#6-game-theory-concepts)
7. [UI Components Reference](#7-ui-components-reference)
8. [File Structure](#8-file-structure)
9. [Scenario Analysis](#9-scenario-analysis)
10. [Mathematical Formulas](#10-mathematical-formulas)
11. [Technology Stack](#11-technology-stack)
12. [Viva Q&A Guide](#12-viva-qa-guide)

---

## 1. Project Overview

GTACCS (Game-Theoretic Adaptive Congestion Control System) is an interactive simulation platform that models **network congestion as a multi-player strategic game**. Each data flow is treated as a rational, self-interested agent competing for shared bandwidth on a 10-node network.

### What Makes It Unique

| Dimension | Description |
|-----------|-------------|
| **Game Theory Core** | Every flow is a *player* with a *strategy* and a *payoff function* |
| **Nash Equilibrium Detection** | The system automatically identifies when no flow can improve by deviating |
| **Three Strategies** | Aggressive, Conservative, Adaptive — each with distinct behavioral rules |
| **Jain's Fairness Index** | Quantitative fairness metric computed in real time |
| **Live Congestion Alerts** | Nodes and links highlighted when utilization exceeds 85% |
| **Scenario Comparison** | Side-by-side analysis across 4 strategy compositions |

### Academic Integration

| Subject | Concepts | Role |
|---------|----------|------|
| Discrete Mathematics | Graph theory, strategy sets, payoff matrices | Network topology, logical decisions |
| Design & Analysis of Algorithms | Greedy, optimization, O(F×L) complexity | Rate allocation, congestion detection |
| Computer Networks | TCP AIMD, QoS, packet loss, queuing delay | Realistic network behavior simulation |
| Game Theory | Nash Equilibrium, payoff functions | Core strategic intelligence layer |

---

## 2. Quick Start

### Prerequisites

- **Node.js** 16+ and **npm** (or yarn)

### Installation and Run

```bash
# 1. Extract the zip file
unzip gtaccs.zip
cd gtaccs

# 2. Install dependencies
npm install

# 3. Start the development server
npm start
```

The app opens at **http://localhost:3000** in your browser.

### Using the Simulator

1. **Play** — Click ▶ Play to start automatic simulation (rounds advance continuously)
2. **Step** — Click ⏭ Step to advance one round at a time
3. **Pause** — Click ⏸ Pause to freeze the simulation
4. **Reset** — Click ↺ Reset to restart from round 0
5. **Speed** — Choose from 0.5x, 1x, 2x, 5x, 10x simulation speed
6. **Watch for congestion** — Red pulsing nodes and alerts indicate bottleneck congestion

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   GTACCS System Architecture                │
├─────────────────┬───────────────────────────────────────────┤
│  Phase 1        │  Network Graph — 10 nodes, 10 links       │
│  Phase 2        │  Flow Modeling — 4 players, 3 strategies  │
│  Phase 3        │  Strategy Engine — AIMD / Greedy / Safe   │
│  Phase 4        │  Congestion Simulation Engine             │
│  Phase 5        │  Payoff Calculator + Jain's Index         │
│  Phase 6        │  Equilibrium Detector (Nash Check)        │
│  Phase 7        │  Strategy Comparison Module               │
│  Phase 8        │  Master Visualization Dashboard           │
└─────────────────┴───────────────────────────────────────────┘

Data Flow:
  Graph → Flows → Strategy Engine → Congestion Model
  → Payoff → Equilibrium Check → Comparison → Dashboard
```

All logic lives in `src/simulation/engine.js`. The React components in `src/components/` render the results. The main `App.js` orchestrates the simulation loop using `setInterval`.

---

## 4. Network Topology

### Nodes

```
A, B, C, D, E, F, G, H, I, J
```

### Links (Directed, with Capacity in Mbps)

```
A → B : 100 Mbps
A → C :  80 Mbps
B → D :  60 Mbps
C → D :  70 Mbps
D → E :  50 Mbps  ← BOTTLENECK (lowest capacity, all flows pass through)
E → F : 100 Mbps
F → G :  90 Mbps
G → H :  80 Mbps
H → I :  70 Mbps
I → J :  60 Mbps
```

### Topology Diagram

```
A ─────── B ─────────────────┐
│          \                 ↓
│           └──→ D ──→ E ──→ F ──→ G ──→ H ──→ I ──→ J
│                ↑
└──→ C ──────────┘
   (100) (80) (60) (70)  (50)  (100) (90) (80) (70) (60)
                         BOTTLENECK
```

### Why D→E is the Bottleneck

All four default flows share the D→E link. With initial rates of 40 Mbps per flow:
- Total demand on D→E = 4 × 40 = **160 Mbps**
- Capacity of D→E = **50 Mbps**
- Initial loss rate = (160 − 50) / 160 = **68.75%**

This forces all flows to adapt their strategies.

---

## 5. Simulation Engine

All simulation logic is in `src/simulation/engine.js`. Each `simulationStep()` call performs all phases in sequence.

### 5.1 Phase 1: Network Graph

**File:** `src/simulation/engine.js` — constants `NODES`, `LINKS`

The network is a **weighted directed graph** G = (V, E) where:
- V = {A, B, C, D, E, F, G, H, I, J} — routers/endpoints
- E = directed links with `capacity` (Mbps)

**Adjacency representation:**
```javascript
const LINKS = [
  { from: 'A', to: 'B', capacity: 100 },
  { from: 'D', to: 'E', capacity: 50 },  // bottleneck
  // ...
];
```

**Path edges** are pre-computed from each flow's node path:
```javascript
function pathEdges(path) {
  return path.slice(0, -1).map((n, i) => `${n}-${path[i+1]}`);
}
```

**Bottleneck bandwidth** on any path = minimum capacity link along the path.

---

### 5.2 Phase 2: Flow Modeling

**File:** `src/simulation/engine.js` — `DEFAULT_FLOWS` and flow objects

Each flow is a **player** in the game:

```javascript
{
  id: 'F1',
  path: ['A','B','D','E','F','G','H','I','J'],  // route through network
  strategy: 'aggressive',   // 'aggressive' | 'adaptive' | 'conservative'
  rate: 40,                 // current sending rate (Mbps)
  throughput: 0,            // actual delivered rate
  delay: 0,                 // end-to-end latency (ms)
  lossRate: 0,              // fraction of packets dropped (0.0–1.0)
  payoff: 0,                // computed each round
  color: '#ef4444',         // UI color for this flow
}
```

**Default 4-flow configuration:**

| Flow | Path | Strategy | Color |
|------|------|----------|-------|
| F1 | A→B→D→E→F→G→H→I→J | Aggressive | Red |
| F2 | C→D→E→F→G→H | Adaptive | Blue |
| F3 | B→D→E→F→G | Conservative | Green |
| F4 | A→C→D→E→F | Adaptive | Amber |

All flows share the **D→E bottleneck**.

---

### 5.3 Phase 3: Strategy Engine

**File:** `src/simulation/engine.js` — `updateRate()` function

Each round, every flow updates its sending rate based on strategy and whether packet loss occurred:

#### Aggressive Strategy
```
Rate × 1.20 per round (always increases, ignores congestion)
```
- Models a greedy user or a flow with no congestion awareness
- Leads to network collapse when all flows use this
- Analogy: Tragedy of the Commons

#### Conservative Strategy
```
Loss detected → Rate × 0.70  (−30%)
No loss       → Rate × 1.05  (+5%)
```
- Very cautious; backs off heavily on any signal
- Produces stable, fair allocation but under-utilizes bandwidth
- Analogous to a polite, deferent user

#### Adaptive Strategy (TCP AIMD)
```
Loss detected → Rate × 0.50  (halve on congestion)
No loss       → Rate + 1.0   (additive increase, +1 Mbps/round)
```
- Mirrors TCP Reno/Cubic's AIMD (Additive Increase, Multiplicative Decrease)
- Produces classic TCP "sawtooth" throughput pattern
- Converges to Nash Equilibrium-like fair allocation

**Rate clamping** (applied to all strategies):
```javascript
flow.rate = Math.max(0.5, Math.min(flow.rate, 500.0));
```

---

### 5.4 Phase 4: Congestion Engine

**File:** `src/simulation/engine.js` — `runCongestionRound()`

Three-step congestion model per round:

#### Step 1: Aggregate Demand
```javascript
flows.forEach(flow => {
  pathEdges(flow.path).forEach(edge => {
    linkDemand[edge] += flow.rate;
  });
});
```

#### Step 2: Compute Loss Per Link
```
if demand > capacity:
    loss = (demand − capacity) / demand
else:
    loss = 0
```

Example (D→E, Round 1):
- Total demand = 160 Mbps, capacity = 50 Mbps
- Loss = (160 − 50) / 160 = **0.6875** (68.75%)

#### Step 3: Per-Flow Metrics
```
bottleneck_loss = max(loss over all edges in flow's path)
throughput = rate × (1 − bottleneck_loss)
delay = 10ms × (1 + 5 × bottleneck_loss)   [queuing model]
```

**Utilization** per link:
```
util = min(demand / capacity, 1.0)
```

**Congestion thresholds:**
- util > 0.70 → Amber warning
- util > 0.85 → Red alert (congested node highlighted)
- util > 0.90 → Critical (deep red)

---

### 5.5 Phase 5: Payoff Calculator

**File:** `src/simulation/engine.js` — `computePayoff()` and `jainsIndex()`

#### Payoff Function
```
U(flow) = throughput − (α × delay) − (β × lossRate × 100)
```

Where:
- `throughput` = actual Mbps delivered (good)
- `α` = delay sensitivity weight (default: 0.3)
- `delay` = end-to-end latency in ms (bad)
- `β` = loss penalty weight (default: 2.0)
- `lossRate × 100` = scales loss fraction to Mbps-equivalent units

**Round 1 example:**
```
throughput = 40 × (1 − 0.6875) = 12.5 Mbps
delay = 10 × (1 + 5 × 0.6875) = 44.375 ms
payoff = 12.5 − (0.3 × 44.375) − (2.0 × 68.75) = −138.31
```

Negative payoff means the flow is suffering — high loss penalty dominates.

#### Jain's Fairness Index
```
J = (Σxᵢ)² / (n × Σxᵢ²)
```

Properties:
- J = 1.0 → Perfect fairness (all flows equal throughput)
- J = 1/n → Maximum unfairness (one flow gets everything)
- J ≥ 0.85 → Commonly accepted as "fair"

**Equilibrium example** with rates {30, 10, 5, 5}:
```
Σxᵢ = 50,  Σxᵢ² = 1050,  n = 4
J = 2500 / (4 × 1050) = 2500/4200 ≈ 0.595
```

Moderate unfairness — the aggressive flow dominates.

---

### 5.6 Phase 6: Equilibrium Detector

**File:** `src/simulation/engine.js` — `checkEquilibrium()`

#### Stability Check (Payoff Variance)
```javascript
function checkEquilibrium(flowHistories, window = 8, threshold = 1.5) {
  return flowHistories.every(history => {
    if (history.length < window) return false;
    const recent = history.slice(-window);
    const variance = Math.max(...recent) - Math.min(...recent);
    return variance < threshold;
  });
}
```

A flow is **stable** when its payoff varies by less than `threshold` over the last `window` rounds. **System equilibrium** = ALL flows simultaneously stable.

#### Nash Equilibrium Conditions
At equilibrium, the following hold for every flow:
- Increasing rate → congestion rises → payoff falls
- Decreasing rate → throughput falls → payoff falls
- Switching strategy → no improvement possible

This matches the formal definition: **no player can improve their payoff by unilateral deviation**.

#### Post-Equilibrium State
```
F1 = 30 Mbps, F2 = 10 Mbps, F3 = 5 Mbps, F4 = 5 Mbps
Total = 50 Mbps (exactly matches D→E bottleneck capacity)
Loss = 0,  Delay = 10ms (base)
UF1 = 30 − (0.3 × 10) = 27.0
```

---

### 5.7 Phase 7: Strategy Comparison

**File:** `src/components/ComparisonTab.js`

Compares four preset scenarios:

| Scenario | Composition | Throughput | Fairness | Loss | Equilibrium |
|----------|-------------|------------|----------|------|-------------|
| Default Mixed | 1 Aggressive, 2 Adaptive, 1 Conservative | 52 Mbps | 0.68 | 18% | Partial |
| All Aggressive | 4 Aggressive | 42 Mbps | 0.41 | 68% | Never |
| All Adaptive | 4 Adaptive (TCP-like) | 68 Mbps | 0.91 | 5% | ~30 rounds |
| All Conservative | 4 Conservative | 18 Mbps | 0.97 | 1% | ~15 rounds |

**5-Axis Radar Chart** compares: Throughput · Fairness · Stability · Low-Loss · Payoff

---

### 5.8 Phase 8: Master Dashboard

**File:** `src/components/Dashboard.js`

The primary interface integrating all phases:

- **Metrics Strip** — 4 KPI cards: Throughput, Fairness, Packet Loss, Congested Nodes
- **Live Network Topology** — animated packets, color-coded links, pulsing congested nodes
- **Congestion Alerts** — inline banners per congested link with demand vs capacity
- **Throughput Area Chart** — total bandwidth over last 40 rounds
- **Per-Flow Rate Chart** — multi-line chart, one per flow
- **Fairness Gauge** — arc gauge, 0.0 to 1.0
- **Link Utilization Bars** — per-link progress bars
- **Flow Statistics Table** — live rows: Rate, Throughput, Delay, Loss, Payoff, Status

---

## 6. Game Theory Concepts

### Nash Equilibrium in Networking

In GTACCS, the network game has:
- **Players**: data flows F1, F2, F3, F4
- **Strategy set**: {aggressive, adaptive, conservative}
- **Payoff function**: U = throughput − α×delay − β×loss×100
- **Nash Equilibrium**: allocation where no flow can improve U by unilateral strategy change

This is a **non-cooperative game** — flows act in self-interest without coordination.

### Prisoner's Dilemma Analogy

| | Stay Silent | Betray |
|-|-------------|--------|
| **Stay Silent** | (1, 1) ← Optimal | (3, 0) |
| **Betray** | (0, 3) | **(2, 2) ← Nash EQ** |

In networking: "Betray" = increase rate aggressively. The Nash Equilibrium is both flows betraying (increasing rates), even though mutual restraint (stay silent = conserve bandwidth) would be better for everyone.

### Tragedy of the Commons

When all flows use Aggressive strategy, each individually rational decision leads to collectively irrational outcomes. Throughput collapses because loss overwhelms capacity — this is the "All Aggressive" scenario in the comparison module.

### Evolutionary Strategy Switching

In real GTACCS implementations, flows earning below-average payoffs for consecutive rounds automatically switch to a higher-performing strategy. This models evolutionary game theory, where strategies that produce better outcomes "survive" and spread.

---

## 7. UI Components Reference

### `NetworkTopology.js`

SVG-based network visualizer with:
- Color-coded links (green/amber/red by utilization)
- Animated packet dots traversing each flow's path
- Pulsing red rings on congested nodes (>85% link utilization)
- Bottleneck label on D→E link
- Capacity labels on each link
- Legend for color coding

### `FairnessGauge.js`

Semicircular arc gauge (0.0 to 1.0) with:
- Color-coded needle (green > 0.85, amber > 0.60, red otherwise)
- Transition animation on value change
- Fair/Moderate/Low label beneath

### `Dashboard.js`

Main view with metrics, topology, charts, link utilization, and flow table.

### `FlowsTab.js`

Interactive flow configuration with:
- Per-flow cards showing all metrics
- Edit mode: strategy selector, initial rate slider
- Add / Remove flow buttons (2–6 flows supported)
- Rate vs Throughput bar chart
- Strategy reference cards

### `PayoffTab.js`

Payoff analysis with:
- Payoff leaderboard (flows ranked by payoff score)
- α/β weight sliders (live recalculation)
- Nash Equilibrium status badge and per-flow stability bars
- Payoff trend line chart (all flows, last 40 rounds)

### `ComparisonTab.js`

Strategy comparison with:
- Scenario selector tabs
- 6-metric results grid per scenario
- Radar chart (5-axis multi-scenario overlay)
- Bar chart comparison
- Narrative insight panel

### `TheoryTab.js`

Educational reference with:
- Nash Equilibrium definition + Prisoner's Dilemma payoff matrix
- Payoff function formula with parameter explanations
- Jain's Fairness Index derivation with worked example
- AIMD / congestion model explanation
- Academic scope table

---

## 8. File Structure

```
gtaccs/
├── package.json               # Dependencies: React 18, Recharts
├── README.md                  # This documentation
├── public/
│   └── index.html             # Google Fonts (Sora, JetBrains Mono, Space Grotesk)
└── src/
    ├── index.js               # React DOM root entry
    ├── App.js                 # Main app: state management, simulation loop, tab routing
    ├── App.css                # Design system: CSS variables, layout, components
    ├── simulation/
    │   └── engine.js          # ALL simulation logic (Phases 1–6)
    └── components/
        ├── NetworkTopology.js # SVG network with animated packets & congestion
        ├── FairnessGauge.js   # Semicircular arc gauge component
        ├── Dashboard.js       # Phase 8: master dashboard tab
        ├── FlowsTab.js        # Phase 2: flow configuration tab
        ├── PayoffTab.js       # Phase 5–6: payoff & equilibrium tab
        ├── ComparisonTab.js   # Phase 7: strategy comparison tab
        └── TheoryTab.js       # Educational game theory reference tab
```

### Key Data Flow in `App.js`

```
App.js (state owner)
  │
  ├── simulationStep() called every [interval] ms when running
  │     ├── runCongestionRound()  → linkUtil, linkLoss, linkDemand, flows
  │     ├── computePayoff()       → flow.payoff per flow
  │     ├── updateRate()          → flow.rate for next round
  │     ├── jainsIndex()          → fairness
  │     └── checkEquilibrium()    → equilibrium boolean
  │
  ├── setFlows(), setLinkUtil(), setFairness(), etc.  → React state
  │
  └── Passed as props to:
        Dashboard, FlowsTab, PayoffTab, ComparisonTab, TheoryTab
```

---

## 9. Scenario Analysis

### All Aggressive — Network Collapse

**Behavioral pattern:**
1. All flows increase rate by 20% per round
2. Demand on D→E rises rapidly: 160 → 192 → 230 → ... Mbps
3. Loss rate exceeds 70% within 10 rounds
4. Throughput collapses despite high sending rates
5. Payoffs plummet due to loss penalty (β × loss × 100)
6. No equilibrium — system is perpetually unstable

**Why:** Each flow's individually rational action (increase rate) leads to a collectively irrational outcome. Classic **Tragedy of the Commons**.

### All Adaptive — TCP-Like Convergence

**Behavioral pattern:**
1. All flows use AIMD (additive increase, multiplicative decrease)
2. Rates oscillate with classic TCP sawtooth pattern
3. Each loss event halves the rate; recovery is gradual (+1 Mbps/round)
4. Flows settle into approximately equal fair-share allocation
5. Fairness Index converges to ~0.91 within 30 rounds
6. Nash Equilibrium reached — stable, no incentive to deviate

**Why:** AIMD naturally produces water-filling allocation over shared bottleneck links. This is why TCP works in the real internet.

### All Conservative — Stable Under-Utilization

**Behavioral pattern:**
1. All flows grow slowly (+5%/round) and retreat sharply on any loss
2. Demand rarely stresses the bottleneck severely
3. Fairness is very high (J ≈ 0.97) — all flows get similar tiny shares
4. Equilibrium reached ~15 rounds
5. But total throughput only ~18 Mbps — bottleneck is 50 Mbps, leaving 64% unutilized

**Why:** Excessive caution sacrifices efficiency for stability. Not optimal.

### Mixed — Realistic Heterogeneity

**Behavioral pattern:**
1. Aggressive F1 keeps increasing → dominates bottleneck
2. Adaptive F2, F4 halve rates when loss detected → shrink their share
3. Conservative F3 shrinks most aggressively
4. Result: F1 gets large share, others starved → moderate unfairness
5. Partial equilibrium — adaptive flows stabilize, F1 keeps growing

This models **real-world internet heterogeneity** where different users/protocols compete.

---

## 10. Mathematical Formulas

### Loss Rate
```
loss(link) = max(0, (demand − capacity) / demand)
```

### Throughput
```
throughput(flow) = rate × (1 − bottleneck_loss)
```

### Queuing Delay
```
delay(flow) = D_base × (1 + 5 × bottleneck_loss)
D_base = 10 ms (propagation delay)
```

### Payoff Function
```
U(flow) = throughput − α × delay − β × loss × 100
Default: α = 0.3, β = 2.0
```

### Jain's Fairness Index
```
J(x₁,...,xₙ) = (Σxᵢ)² / (n × Σxᵢ²)
Range: [1/n, 1.0]
```

### Strategy Update Rules

| Strategy | Clear Network | Loss Detected |
|----------|--------------|---------------|
| Aggressive | rate × 1.20 | rate × 1.20 (ignores) |
| Conservative | rate × 1.05 | rate × 0.70 |
| Adaptive | rate + 1.0 | rate × 0.50 |

### Rate Clamping
```
rate = clamp(rate, min=0.5, max=500.0)  [Mbps]
```

### Congestion Link Utilization
```
util(link) = min(demand / capacity, 1.0)
```

### Time Complexity
```
One round: O(F × L)  where F = flows, L = links
Equilibrium check: O(F × W)  where W = window size
Total for R rounds: O(R × F × (L + W))

Typical (F=4, L=10, W=8, R=50): ~3,600 operations
```

---

## 11. Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| UI Framework | React 18 | Component-based UI, state management |
| Charts | Recharts 2.8 | LineChart, AreaChart, BarChart, RadarChart |
| Icons & UI | Lucide React | Icon set |
| Fonts | Google Fonts (Sora, JetBrains Mono, Space Grotesk) | Typography system |
| Network Viz | Custom SVG | Animated topology with packet simulation |
| Simulation | Pure JavaScript | Custom engine in engine.js |
| Build Tool | Create React App | Zero-config build system |

### Why React (Not Python Dash/Streamlit)?

The specification listed React + Recharts as the primary frontend option. React provides:
- Real-time state updates without page refresh
- Smooth SVG animations for the topology view
- Component reusability (FairnessGauge, NetworkTopology used in multiple tabs)
- Fast render cycles matching simulation speed up to 10x

---

## 12. Viva Q&A Guide

**Q: What is the main contribution of GTACCS?**

A: GTACCS models network congestion as a multi-player strategic game, enabling analysis of how selfish vs. cooperative behavior affects fairness and efficiency. Unlike traditional TCP simulators, it exposes the *game-theoretic structure* of congestion: each flow is a rational agent with a payoff function, and the system detects Nash Equilibrium — the state where no flow can improve by unilaterally changing strategy.

---

**Q: How does Nash Equilibrium apply to networking?**

A: A Nash Equilibrium in networking is a stable bandwidth allocation where no flow has incentive to deviate. In GTACCS, this is detected when all flows' payoff variances over 8 consecutive rounds fall below 1.5. At equilibrium, rates sum to exactly the bottleneck capacity (50 Mbps): {30, 10, 5, 5} — increasing any flow's rate raises congestion and decreases its payoff; decreasing it reduces throughput and decreases payoff.

---

**Q: Why is Jain's Fairness Index used?**

A: Jain's Index produces a value in [1/n, 1.0] independent of units and number of flows, making it directly comparable across scenarios. J=1.0 means all flows get identical shares; J=1/n means one flow gets everything. For the equilibrium state {30,10,5,5}, J ≈ 0.595 — moderate unfairness, reflecting the aggressive flow's dominance.

---

**Q: What does the All-Aggressive scenario demonstrate?**

A: The Tragedy of the Commons. Each flow individually maximizes rate (rational behavior), but collectively they saturate the bottleneck, causing 68%+ packet loss. Every flow's payoff becomes deeply negative. No flow has incentive to reduce rate *unilaterally* (it would sacrifice throughput while others continue flooding), so the unstable Nash-inefficient state persists. This is why TCP's cooperative AIMD was designed as it was.

---

**Q: How does the Adaptive strategy relate to TCP?**

A: The Adaptive strategy directly implements TCP's AIMD (Additive Increase, Multiplicative Decrease): add 1 Mbps/round when no loss detected, halve the rate when loss occurs. This matches TCP Reno's congestion avoidance phase. The "All Adaptive" scenario produces the classic TCP sawtooth throughput pattern and converges to a fair, efficient Nash Equilibrium — demonstrating why AIMD became the internet standard.

---

**Q: What is the time complexity?**

A: One simulation round is O(F × L) where F = number of flows and L = number of links. Equilibrium detection adds O(F × W) per round where W = window size (8). Total for R rounds: O(R × F × (L + W)). For the default configuration (F=4, L=10, W=8, R=50): approximately 3,600 operations — trivially fast.

---

**Q: How are congested nodes detected and displayed?**

A: After each round, GTACCS checks every link's utilization (demand/capacity). Any link exceeding 85% utilization flags both its source and destination nodes as congested. The UI displays pulsing red rings around these nodes (CSS keyframe animation), red congestion alert banners above the topology, and the control bar shows a live "CONGESTION [nodes]" badge.

---

*GTACCS — Undergraduate Engineering Project*  
*Integrating: Discrete Mathematics · Design & Analysis of Algorithms · Computer Networks · Game Theory*
