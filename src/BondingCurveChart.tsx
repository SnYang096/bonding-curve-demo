import { useMemo, useState } from "react";
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
import { formatNumber } from "./utils";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const DEFAULT_TOTAL_SUPPLY = 7_000_000_000;
const P0 = 1e-8;
const B = 0.7;

function logistic(t: number) {
  return 1 / (1 + Math.exp(-t));
}

function priceAtPercent(x: number, a: number, cLeft: number, cRight: number, w: number) {
  const t = (x - B) / Math.max(w, 1e-9);
  const blend = logistic(t);
  const c = cLeft + (cRight - cLeft) * blend;
  const dx = x - B;
  return P0 + a * (dx / Math.sqrt(c + dx * dx) + 1);
}

function integratePrice(from: number, to: number, steps: number, a: number, cLeft: number, cRight: number, w: number, totalSupply: number) {
  let sum = 0;
  const dx = (to - from) / steps;
  for (let i = 0; i < steps; i++) {
    const x = from + dx * (i + 0.5);
    sum += priceAtPercent(x, a, cLeft, cRight, w) * dx;
  }
  return sum * totalSupply;
}

function buy(currentSupply: number, deltaTokens: number, a: number, cLeft: number, cRight: number, w: number, totalSupply: number) {
  const from = currentSupply / totalSupply;
  const to = (currentSupply + deltaTokens) / totalSupply;
  return integratePrice(from, to, 200, a, cLeft, cRight, w, totalSupply);
}

function sell(currentSupply: number, deltaTokens: number, a: number, cLeft: number, cRight: number, w: number, totalSupply: number) {
  const from = (currentSupply - deltaTokens) / totalSupply;
  const to = currentSupply / totalSupply;
  return integratePrice(from, to, 200, a, cLeft, cRight, w, totalSupply);
}

export default function SmoothBefore70Chart() {
  const [totalSupply, setTotalSupply] = useState(DEFAULT_TOTAL_SUPPLY);
  const [a, setA] = useState(1e-8);
  const [cLeft, setCLeft] = useState(0.2);
  const [cRight, setCRight] = useState(0.01);
  const [w, setW] = useState(0.03);

  const [soldTokens, setSoldTokens] = useState(0);
  const [buyAmount, setBuyAmount] = useState(1_000_00_00);
  const [sellAmount, setSellAmount] = useState(1_000_00_00);

  const cursorPercent = soldTokens / totalSupply;

  const { chartData, totalRaised, buyCost, sellReturn } = useMemo(() => {
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
          label: "Token Price (SOL)",
          data: prices,
          borderColor: "rgb(99,102,241)",
          backgroundColor: "rgba(99,102,241,0.1)",
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.2,
        },
      ],
    };

    const buyCost = buy(soldTokens, Math.min(buyAmount, totalSupply - soldTokens), a, cLeft, cRight, w, totalSupply);
    const sellReturn = sell(soldTokens, Math.min(sellAmount, soldTokens), a, cLeft, cRight, w, totalSupply);
    const totalRaised = integratePrice(0, 1, 200, a, cLeft, cRight, w, totalSupply);

    return { chartData, totalRaised, buyCost, sellReturn };
  }, [a, cLeft, cRight, w, soldTokens, buyAmount, sellAmount, totalSupply]);

  const handleBuy = () => {
    const actualBuy = Math.min(buyAmount, totalSupply - soldTokens);
    setSoldTokens(soldTokens + actualBuy);
  };

  const handleSell = () => {
    const actualSell = Math.min(sellAmount, soldTokens);
    setSoldTokens(soldTokens - actualSell);
  };

  const currentPrice = priceAtPercent(cursorPercent, a, cLeft, cRight, w);

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 16 }}>
      <h2>Bonding Curve Buy/Sell Simulation</h2>

      {/* 设置总供应量 */}
      <div style={{ marginBottom: 16 }}>
        <label>
          Total Token Supply: <br />
          <input
            type="number"
            step={1_000_000}
            value={totalSupply}
            onChange={e => {
              const val = Number(e.target.value);
              setTotalSupply(val);
              if (soldTokens > val) setSoldTokens(val);
            }}
          />
        </label>
      </div>

      {/* 参数调节 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}>
        <label>
          Amplitude (a) <br />
          <small>Controls the overall price rise of the bonding curve.</small>
          <input type="number" step="1e-10" value={a} onChange={e => setA(Number(e.target.value))} />
        </label>

        <label>
          Pre-70% Smoothness (c_left) <br />
          <small>Higher values make the curve before 70% flatter / smoother.</small>
          <input type="number" step="0.01" value={cLeft} onChange={e => setCLeft(Number(e.target.value))} />
        </label>

        <label>
          Post-70% Steepness (c_right) <br />
          <small>Smaller values make the curve after 70% steeper / sharper.</small>
          <input type="number" step="0.001" value={cRight} onChange={e => setCRight(Number(e.target.value))} />
        </label>

        <label>
          Transition Width (w) <br />
          <small>Controls how smooth the transition is at the 70% point. Smaller = sharper transition.</small>
          <input type="number" step="0.005" value={w} onChange={e => setW(Number(e.target.value))} />
        </label>
      </div>

      {/* 图表 */}
      <Line
        data={chartData}
        options={{
          responsive: true,
          interaction: { mode: "index", intersect: false },
          plugins: {
            legend: { display: true },
            tooltip: {
              callbacks: {
                label: function (tooltipItem) {
                  const price = tooltipItem.raw as number;
                  return `Price: ${formatNumber(price)} SOL`;
                },
              },
            },
          },
          scales: {
            x: { title: { display: true, text: "Percent (%)" } },
            y: {
              title: { display: true, text: "Price (SOL)" },
              ticks: {
                callback: function (value) {
                  if (typeof value === "number") return formatNumber(value);
                  return value;
                },
              },
            },
          },
        }}
      />

      {/* 当前状态 */}
      <div style={{ marginTop: 16 }}>
        <div>Observation Position: <b>{(cursorPercent * 100).toFixed(2)}%</b></div>
        <div>Sold Tokens: <b>{soldTokens.toLocaleString()}</b></div>
        <div>Current Price: <b>{currentPrice.toFixed(9)} SOL</b></div>
      </div>

      {/* 买卖输入 */}
      <div style={{ marginTop: 24 }}>
        <h3>Buy / Sell Simulation</h3>
        <label>
          Buy Amount (Token)
          <input type="number" step="1000" value={buyAmount} onChange={e => setBuyAmount(Number(e.target.value))} />
        </label>
        <div>Cost: <b>{buyCost.toFixed(6)} SOL</b></div>
        <button onClick={handleBuy} style={{ marginTop: 8 }}>Buy</button>

        <label style={{ marginTop: 12, display: "block" }}>
          Sell Amount (Token)
          <input type="number" step="1000" value={sellAmount} onChange={e => setSellAmount(Number(e.target.value))} />
        </label>
        <div>Return: <b>{sellReturn.toFixed(6)} SOL</b></div>
        <button onClick={handleSell} style={{ marginTop: 8 }}>Sell</button>
      </div>

      <hr style={{ margin: "16px 0", opacity: 0.3 }} />
      <div>Total Raised (100% sold): <b>{totalRaised.toFixed(6)} SOL</b></div>
    </div>
  );
}
