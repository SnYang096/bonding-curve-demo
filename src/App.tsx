

import BondingCurveChart from "./BondingCurveChart";
import GrowthCurvesChart from "./GrowthCurvesChart";

import { Routes, Route, Link } from 'react-router-dom'

export default function App() {
  return (
    <div style={{display: 'flex', alignItems: 'center', padding: 20, width: '100%', flexDirection: 'column'}}>
      <nav>
        <Link to="/">首页</Link> | <Link to="/chart2">增长曲线比较</Link>
      </nav>
      <Routes>
        <Route path="/" element={<BondingCurveChart />} />
        <Route path="/chart2" element={<GrowthCurvesChart />} />
      </Routes>
    </div>
  )
}

