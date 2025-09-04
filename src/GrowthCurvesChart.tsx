import React from 'react';
import { Chart as ChartJS, registerables } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(...registerables);

const GrowthCurvesChart = () => {
  // 定义x轴范围
  const x = Array.from({ length: 100 }, (_, i) => i / 10); // 0到10，步长0.1

  // 计算三种曲线
  const calculateExponential = (x) => 1 * Math.exp(0.5 * x);
  const calculatePowerLaw = (x) => 0.5 * Math.pow(x, 2);
  const calculateLogistic = (x) => 100 / (1 + Math.exp(-1 * (x - 5)));

  const data = {
    labels: x,
    datasets: [
      {
        label: '指数增长 (y = e^(0.5x))',
        data: x.map(calculateExponential),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        tension: 0.1,
      },
      {
        label: '幂律增长 (y = 0.5x²)',
        data: x.map(calculatePowerLaw),
        borderColor: 'rgb(54, 162, 235)',
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
        tension: 0.1,
      },
      {
        label: '调整的Logistic (L=100, k=1, x₀=5)',
        data: x.map(calculateLogistic),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        tension: 0.1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: '三种增长曲线比较',
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: '增长值',
        },
      },
      x: {
        title: {
          display: true,
          text: '时间',
        },
      },
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
  };

  return (
    <div style={{ width: '80%', margin: '0 auto' }}>
      <Line data={data} options={options} />
      <div style={{ marginTop: '20px' }}>
        <h3>曲线说明：</h3>
        <ul>
          <li><strong>指数增长</strong>：初期增长缓慢，随后加速越来越快，无上限（红色曲线）</li>
          <li><strong>幂律增长</strong>：增长速率恒定比例增加，表现为抛物线形状（蓝色曲线）</li>
          <li><strong>调整的Logistic</strong>：初期类似指数增长，但最终会趋于饱和（绿色曲线）</li>
        </ul>
      </div>
    </div>
  );
};

export default GrowthCurvesChart;