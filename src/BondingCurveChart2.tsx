import React, { useState, useMemo } from "react";
import { Slider } from "antd";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface BondingCurveChartProps {
  totalSupply?: number; // 总 token 数，默认 7.75B
  basePrice?: number;   // 初始价格，默认 0.00000001 SOL
}

const BondingCurveChart: React.FC<BondingCurveChartProps> = ({
  totalSupply = 7_750_000_000,
  basePrice = 0.00000001,
}) => {
  const [c, setC] = useState(15); // 平滑度，越大越平滑
  const b = 0.7; // 阈值（70%）

  // 价格公式：在 0~70% 基本平滑，70~100% 急速增长
  const priceFunc = (x: number) => {
    // x ∈ [0,1]
    return basePrice * (1 + Math.pow(Math.max(0, (x - b) / (1 - b)), c));
  };

  // 生成数据
  const data = useMemo(() => {
    const arr = [];
    for (let i = 0; i <= 100; i++) {
      const progress = i / 100;
      const price = priceFunc(progress);
      arr.push({
        percent: i,
        sold: Math.round(totalSupply * progress),
        price: price,
      });
    }
    return arr;
  }, [c, totalSupply, basePrice]);

  return (
    <div style={{ width: "100%", height: 400, padding: 20 }}>
      <h3>Bonding Curve</h3>
      <p>平滑度参数 c: {c}</p>
      <Slider
        min={1}
        max={50}
        value={c}
        onChange={(val) => setC(val)}
        style={{ width: 300, marginBottom: 20 }}
      />
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="percent" tickFormatter={(v) => `${v}%`} />
          <YAxis />
          <Tooltip
            formatter={(value, name) => {
              if (name === "price") {
                return [`${value.toFixed(9)} SOL`, "Token 价格"];
              }
              if (name === "sold") {
                return [`${value.toLocaleString()}`, "已售 Token"];
              }
              return value;
            }}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#00f0ff"
            strokeWidth={2}
            dot={false}
            name="价格"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BondingCurveChart;
