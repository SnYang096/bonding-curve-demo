import React, { useState } from 'react';
import { Scatter } from 'react-chartjs-2';
import { Slider, Title } from '@mantine/core';
import { 
  Chart as ChartJS, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Tooltip, 
  Legend 
} from 'chart.js';

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend);

// 基础参数
const BASE_PRICE = 1e-9;        // 初始价格
const TOTAL_SUPPLY = 7e9;       // 总量 70亿
const THRESHOLD_TOKENS = 4.83e9;// 阈值 (69%)
// const K = 3.5;
const K = 4.5;
const TARGET_RAISE = 84;        // 总募集金额 84 SOL

// 根据目标募集金额反推 ALPHA
function calculateAlpha(): number {
  const delta = TOTAL_SUPPLY - THRESHOLD_TOKENS;
  const baseRaised = BASE_PRICE * TOTAL_SUPPLY;
  const numerator = TARGET_RAISE - baseRaised;
  const denominator = Math.pow(delta, K + 1) / (K + 1);
  return numerator / denominator;
}

const ALPHA = calculateAlpha();

// 价格计算函数
function calculatePrice(sold: number): number {
  if (sold <= THRESHOLD_TOKENS) return BASE_PRICE;
  return BASE_PRICE + ALPHA * Math.pow(sold - THRESHOLD_TOKENS, K);
}

// 成本计算函数（积分）
function calculateCost(s: number, delta: number): number {
  const P0 = BASE_PRICE;
  const Sstar = THRESHOLD_TOKENS;

  // 完全在阈值之前
  if (s + delta <= Sstar) {
    return P0 * delta;
  }

  // 完全在阈值之后
  if (s >= Sstar) {
    return (
      P0 * delta +
      (ALPHA / (K + 1)) *
        (Math.pow(s + delta - Sstar, K + 1) - Math.pow(s - Sstar, K + 1))
    );
  }

  // 跨过阈值
  const before = P0 * (Sstar - s);
  const after =
    P0 * (s + delta - Sstar) +
    (ALPHA / (K + 1)) * Math.pow(s + delta - Sstar, K + 1);
  return before + after;
}

const BondingCurveVisualizer = () => {
  const [tokensSold, setTokensSold] = useState<number>(THRESHOLD_TOKENS);
  const [buyAmount, setBuyAmount] = useState<number>(1e6); // 默认购买 1M tokens

  // 生成曲线数据
  const generateCurveData = () => {
    const points = [];
    const step = 100000000; // 每 1e8 tokens 一个点
    for (let s = 0; s <= TOTAL_SUPPLY; s += step) {
      points.push({
        x: s / 1e9, // 转换为 "亿" 展示
        y: calculatePrice(s),
      });
    }
    return points;
  };

  const currentPrice = calculatePrice(tokensSold);
  const nextPrice = calculatePrice(tokensSold + buyAmount);

  // 图表数据
  const data = {
    datasets: [
      {
        label: '代币价格 (SOL)',
        data: generateCurveData(),
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        borderWidth: 2,
        showLine: true,
      },
    ],
  };

  const options = {
    scales: {
      x: {
        title: { display: true, text: '已售出代币 (亿)' },
        ticks: { callback: (val: number) => `${val}亿` }
      },
      y: {
        title: { display: true, text: '价格 (SOL)' },
        ticks: { callback: (val: number) => val.toFixed(9) }
      },
    },
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 20 }}>
      <Title order={2} mb="xl">Meme Token Bonding Curve</Title>

      <Scatter data={data} options={options} />

      <div style={{ marginTop: 40 }}>
        <Slider
          label="模拟代币销量 (亿)"
          min={0}
          max={7}
          step={0.01}
          value={tokensSold / 1e9}
          onChange={(val) => setTokensSold(val * 1e9)}
          marks={[
            { value: 0, label: '0' },
            { value: 4.83, label: '4.83亿 (69%)' },
            { value: 7, label: '7亿' }
          ]}
        />

        <Slider
          label="模拟购买量 (百万)"
          min={1}
          max={100}
          step={1}
          value={buyAmount / 1e6}
          onChange={(val) => setBuyAmount(val * 1e6)}
          marks={[
            { value: 1, label: '1M' },
            { value: 50, label: '50M' },
            { value: 100, label: '100M' }
          ]}
        />

        <div style={{ marginTop: 20 }}>
          <p>当前价格: <strong>{currentPrice.toFixed(9)} SOL</strong></p>
          <p>购买 {buyAmount.toLocaleString()} 代币后价格: 
            <strong>{nextPrice.toFixed(9)} SOL</strong></p>
          <p>需支付: <strong>{calculateCost(tokensSold, buyAmount).toFixed(6)} SOL</strong></p>
          <p>目标总募集: <strong>{TARGET_RAISE} SOL</strong></p>
          <p>反推 ALPHA: <strong>{ALPHA.toExponential(6)}</strong></p>
        </div>
      </div>
    </div>
  );
};

export default BondingCurveVisualizer;
