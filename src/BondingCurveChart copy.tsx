import React, { useState, useMemo } from "react";
import { InputNumber, Radio, Switch, Button } from "antd";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

// === 配置参数 ===
const TOTAL_SUPPLY = 7_900_000_000; // token 总量
const PHASE1_THRESHOLD = 69;        // Phase1 阈值%
const avgPhase1 = 0.00000001;      // Phase1 均价

// Phase2 多段阈值和均价
const phase2Thresholds = [70, 80, 90, 100];
const phase2AvgPrices = [
  0.000000077, // 70%
  0.000000125, // 80%
  0.000000175, // 90%
  0.000000233, // 100%
];

// 格式化数字
const formatNumber = (v: number, decimals = 12) => v.toFixed(decimals).replace(/\.?0+$/, "");

// === 核心函数 ===
// 计算指数 r
const calcR = (Pa: number, Pb: number, start: number, end: number) =>
  Math.pow(Pb / Pa, 1 / (end - start));

// 单价函数
function priceAt(x: number, smoothPhase1: boolean) {
  if (x <= PHASE1_THRESHOLD) return smoothPhase1 ? avgPhase1 * Math.pow(calcR(avgPhase1, phase2AvgPrices[0], 0, PHASE1_THRESHOLD), x) : avgPhase1;

  // Phase2 多段指数
  let prevThreshold = PHASE1_THRESHOLD;
  let prevPrice = avgPhase1;
  for (let i = 0; i < phase2Thresholds.length; i++) {
    const t = phase2Thresholds[i];
    const p = phase2AvgPrices[i];
    if (x <= t) {
      const r = calcR(prevPrice, p, prevThreshold, t);
      return prevPrice * Math.pow(r, x - prevThreshold);
    }
    prevThreshold = t;
    prevPrice = p;
  }
  return phase2AvgPrices[phase2AvgPrices.length - 1];
}

// 分段积分公式优化
function analyticIntegral(x1: number, x2: number, smoothPhase1: boolean) {
  let total = 0;
  if (x2 < x1) [x1, x2] = [x2, x1];

  // Phase1
  if (x1 < PHASE1_THRESHOLD && x2 > 0) {
    const xa = Math.max(x1, 0), xb = Math.min(x2, PHASE1_THRESHOLD);
    if (smoothPhase1) {
      const r1 = calcR(avgPhase1, phase2AvgPrices[0], 0, PHASE1_THRESHOLD);
      const A = avgPhase1 * Math.pow(r1, -xa);
      total += (A / Math.log(r1)) * (Math.pow(r1, xb) - Math.pow(r1, xa));
    } else {
      total += (xb - xa) * avgPhase1;
    }
  }

  // Phase2 多段积分
  let prevThreshold = PHASE1_THRESHOLD;
  let prevPrice = avgPhase1;
  for (let i = 0; i < phase2Thresholds.length; i++) {
    const t = phase2Thresholds[i];
    const p = phase2AvgPrices[i];
    if (x2 <= prevThreshold) break; // 已超范围
    const xa = Math.max(x1, prevThreshold);
    const xb = Math.min(x2, t);
    if (xb > xa) {
      const r = calcR(prevPrice, p, prevThreshold, t);
      const A = prevPrice * Math.pow(r, -prevThreshold);
      total += (A / Math.log(r)) * (Math.pow(r, xb) - Math.pow(r, xa));
    }
    prevThreshold = t;
    prevPrice = p;
  }

  return total;
}

// 根据 SOL 数量反推可买 token
function buyTokenBySol(currentSupply: number, solAmount: number, smoothPhase1: boolean) {
  let low = 0, high = TOTAL_SUPPLY - currentSupply, mid = 0;
  for (let i = 0; i < 50; i++) {
    mid = (low + high) / 2;
    const cost = analyticIntegral((currentSupply / TOTAL_SUPPLY) * 100, ((currentSupply + mid) / TOTAL_SUPPLY) * 100, smoothPhase1);
    if (cost > solAmount) high = mid;
    else low = mid;
  }
  return low;
}

// === React 组件 ===
const BondingCurve: React.FC = () => {
  const [smoothPhase1, setSmoothPhase1] = useState(false);
  const [currentSupply, setCurrentSupply] = useState(0);
  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
  const [tradeAmount, setTradeAmount] = useState(1000000);
  const [solInput, setSolInput] = useState<number | null>(null);
  const [result, setResult] = useState<{ tokens: number; sol: number } | null>(null);

  const data = useMemo(() => Array.from({ length: 101 }, (_, i) => ({ x: i, y: priceAt(i, smoothPhase1) })), [smoothPhase1]);

  const handleTrade = () => {
    const currentProgress = (currentSupply / TOTAL_SUPPLY) * 100;
    if (tradeType === "buy") {
      let tokensToBuy = tradeAmount;
      if (solInput) tokensToBuy = buyTokenBySol(currentSupply, solInput, smoothPhase1);
      const cost = analyticIntegral(currentProgress, ((currentSupply + tokensToBuy) / TOTAL_SUPPLY) * 100, smoothPhase1);
      setResult({ tokens: tokensToBuy, sol: cost });
      setCurrentSupply((s) => s + tokensToBuy);
    } else {
      const newSupply = Math.max(0, currentSupply - tradeAmount);
      const refund = analyticIntegral((newSupply / TOTAL_SUPPLY) * 100, currentProgress, smoothPhase1);
      setResult({ tokens: tradeAmount, sol: refund });
      setCurrentSupply(newSupply);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Bonding Curve 模拟 (Phase1: 0-{PHASE1_THRESHOLD}%, Phase2: 70-100%)</h2>

      <div style={{ marginBottom: 16 }}>
        <span>Phase1 平缓增长: </span>
        <Switch checked={smoothPhase1} onChange={setSmoothPhase1} />
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <XAxis dataKey="x" label={{ value: "Progress %", position: "insideBottomRight", offset: -5 }} />
          <YAxis scale="log" domain={["auto","auto"]} tickFormatter={(v) => formatNumber(Number(v),12)} />
          <Tooltip formatter={(v:any) => formatNumber(Number(v),12)+" SOL"} />
          <Line type="monotone" dataKey="y" stroke="#00f0ff" dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>

      <div style={{ marginTop:20 }}>
        <div style={{ marginBottom:12 }}>
          <span>当前流通: {currentSupply.toLocaleString()} / {TOTAL_SUPPLY.toLocaleString()} token</span>
        </div>

        <Radio.Group value={tradeType} onChange={(e)=>setTradeType(e.target.value)} style={{ marginBottom:12 }}>
          <Radio.Button value="buy">买入</Radio.Button>
          <Radio.Button value="sell">卖出</Radio.Button>
        </Radio.Group>

        {tradeType==="buy" && (
          <div style={{ marginBottom:12 }}>
            <span style={{ marginRight:8 }}>SOL 数量 (可选):</span>
            <InputNumber value={solInput||undefined} onChange={(v)=>setSolInput(v||null)} min={0} step={0.000000001}/>
          </div>
        )}

        <div style={{ marginBottom:12 }}>
          <span style={{ marginRight:8 }}>Token 数量:</span>
          <InputNumber value={tradeAmount} onChange={(v)=>setTradeAmount(v||0)} min={1} step={1000}/>
        </div>

        <Button type="primary" onClick={handleTrade}>执行 {tradeType==="buy"?"买入":"卖出"}</Button>

        {result && (
          <div style={{ marginTop:16 }}>
            <p>
              {tradeType==="buy"
                ? `买入 ${result.tokens.toLocaleString()} token，花费约 ${formatNumber(result.sol)} SOL`
                : `卖出 ${result.tokens.toLocaleString()} token，获得约 ${formatNumber(result.sol)} SOL`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BondingCurve;
