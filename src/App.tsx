import React from "react";
import BondingCurveChart from "./BondingCurveChart";

function App() {
  return (
    <div className="App" style={{ width: "900px", margin: "40px auto", textAlign: "center" }}>
      <h2>Bonding Curve Demo</h2>
      <BondingCurveChart />
    </div>
  );
}

export default App;
