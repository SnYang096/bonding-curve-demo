// 可控前70% 平滑的 bonding curve
import React, { useMemo, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

// ====== 可调参数 ======
const TOTAL_SUPPLY = 7_000_000_000; // 7B
const P0 = 1e-8;                    // 底价
const B = 0.7;                      // 拐点（70%）

// logistic 平滑
function logistic(t: number) {
  return 1 / (1 + Math.exp(-t));
}

// 单点价格
function priceAtPercent(
  x: number,
  a: number,
  cLeft: number,
  cRight: number,
  w: number
) {
  const t = (x - B) / Math.max(w, 1e-9);
  const blend = logistic(t);
  const c = cLeft + (cRight - cLeft) * blend;
  const dx = x - B;
  return P0 + a * (dx / Math.sqrt(c + dx * dx) + 1);
}

// 数值积分（买/卖用）
function integratePrice(
  from: number,   // 区间起点（占总供应比例，0~1）
  to: number,     // 区间终点（占总供应比例，0~1）
  steps: number,  // 数值积分的步数，用多少个小区间近似积分
  a: number,      // 曲线振幅（priceAtPercent 中控制价格抬升幅度）
  cLeft: number,  // 拐点前平滑度（0~1，越大越平滑）
  cRight: number, // 拐点后平滑度（0~1，越小越陡）
  w: number       // 拐点过渡宽度（0~1，越小过渡越陡）
) {
  let sum = 0;
  const dx = (to - from) / steps;
  for (let i = 0; i < steps; i++) {
    const x = from + dx * (i + 0.5);
    sum += priceAtPercent(x, a, cLeft, cRight, w) * dx;
  }
  return sum * TOTAL_SUPPLY; // 还原到 token 数量
}

// 买函数：买 deltaTokens 个 token 花多少 SOL
function buy(
  currentSupply: number,
  deltaTokens: number,
  a: number,
  cLeft: number,
  cRight: number,
  w: number
) {
  const from = currentSupply / TOTAL_SUPPLY;
  const to = (currentSupply + deltaTokens) / TOTAL_SUPPLY;
  return integratePrice(from, to, 200, a, cLeft, cRight, w);
}

// 卖函数：卖 deltaTokens 个 token 拿回多少 SOL
function sell(
  currentSupply: number,
  deltaTokens: number,
  a: number,
  cLeft: number,
  cRight: number,
  w: number
) {
  const from = (currentSupply - deltaTokens) / TOTAL_SUPPLY;
  const to = currentSupply / TOTAL_SUPPLY;
  return integratePrice(from, to, 200, a, cLeft, cRight, w);
}

export default function SmoothBefore70Chart() {
  const [a, setA] = useState(1e-8);
  const [cLeft, setCLeft] = useState(0.2);
  const [cRight, setCRight] = useState(0.01);
  const [w, setW] = useState(0.03);
  const [cursorPercent, setCursorPercent] = useState(0.7);

  // 买卖输入
  const [buyAmount, setBuyAmount] = useState(1_000_000);  // 默认买100万
  const [sellAmount, setSellAmount] = useState(1_000_000); // 默认卖100万

  const { chartData, currentInfo, totalRaised, buyCost, sellReturn } = useMemo(() => {
    const labels: string[] = [];
    const prices: number[] = [];
    const step = 0.01;
    for (let i = 0; i <= 100; i++) {
      const x = i * step;
      labels.push(`${i}%`);
      prices.push(priceAtPercent(x, a, cLeft, cRight, w));
    }

    const chartData = {
      labels,
      datasets: [
        {
          label: "Token 价格 (SOL)",
          data: prices,
          borderColor: "rgb(99,102,241)",
          backgroundColor: "rgba(99,102,241,0.1)",
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.2,
        },
      ],
    };

    // 当前进度
    const x = Math.min(1, Math.max(0, cursorPercent));
    const price = priceAtPercent(x, a, cLeft, cRight, w);
    const sold = Math.round(TOTAL_SUPPLY * x);

    // 买卖计算
    const buyCost = buy(sold, buyAmount, a, cLeft, cRight, w);
    const sellReturn = sell(sold, sellAmount, a, cLeft, cRight, w);

    // 累积募集（卖完）
    const totalRaised = integratePrice(0, 1, 200, a, cLeft, cRight, w);

    return {
      chartData,
      currentInfo: { x, sold, price },
      totalRaised,
      buyCost,
      sellReturn,
    };
  }, [a, cLeft, cRight, w, cursorPercent, buyAmount, sellAmount]);

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 16 }}>
      <h2>Bonding Curve 买卖模拟</h2>

      {/* 参数调节 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}>
        <label>
          a（幅度）
          <input type="number" step="1e-10" value={a} onChange={(e) => setA(Number(e.target.value))} />
        </label>
        <label>
          c_left（70% 前平滑度）
          <input type="number" step="0.01" value={cLeft} onChange={(e) => setCLeft(Number(e.target.value))} />
        </label>
        <label>
          c_right（70% 后平滑度）
          <input type="number" step="0.001" value={cRight} onChange={(e) => setCRight(Number(e.target.value))} />
        </label>
        <label>
          过渡宽度 w
          <input type="number" step="0.005" value={w} onChange={(e) => setW(Number(e.target.value))} />
        </label>
        <label>
          观测位置（0~1）
          <input type="number" step="0.01" min="0" max="1" value={cursorPercent} onChange={(e) => setCursorPercent(Number(e.target.value))} />
        </label>
      </div>

      {/* 图表 */}
      <Line data={chartData} options={{
        responsive: true,
        interaction: { mode: "index", intersect: false },
        scales: {
          x: { title: { display: true, text: "销售进度 (%)" } },
          y: { 
            title: { display: true, text: "价格 (SOL)" }, 
            ticks: { 
              callback: function(tickValue: string | number) {
                if (typeof tickValue === "number") {
                  return tickValue.toFixed(9);
                }
                return tickValue;
              }
            } 
          }
        },
        plugins: { legend: { display: true } },
      }} />

      {/* 当前状态 */}
      <div style={{ marginTop: 16 }}>
        <div>当前位置：<b>{(currentInfo.x * 100).toFixed(2)}%</b></div>
        <div>已售 Token：<b>{currentInfo.sold.toLocaleString()}</b></div>
        <div>当前价格：<b>{currentInfo.price.toFixed(9)} SOL</b></div>
      </div>

      {/* 买卖输入 */}
      <div style={{ marginTop: 24 }}>
        <h3>买卖模拟</h3>
        <label>
          买入数量（Token）
          <input type="number" step="1000" value={buyAmount} onChange={(e) => setBuyAmount(Number(e.target.value))} />
        </label>
        <div>需要支付：<b>{buyCost.toFixed(6)} SOL</b></div>

        <label style={{ marginTop: 12, display: "block" }}>
          卖出数量（Token）
          <input type="number" step="1000" value={sellAmount} onChange={(e) => setSellAmount(Number(e.target.value))} />
        </label>
        <div>可获得：<b>{sellReturn.toFixed(6)} SOL</b></div>
      </div>

      <hr style={{ margin: "16px 0", opacity: 0.3 }} />
      <div>卖完（100%）累计募集：<b>{totalRaised.toFixed(6)} SOL</b></div>
    </div>
  );
}
