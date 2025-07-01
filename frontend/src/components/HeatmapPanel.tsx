import React, { useState, useEffect } from 'react';

interface HeatmapResp {
  spots: number[];          // e.g. [80, 90, 100, …]
  vols: number[];           // e.g. [0.1, 0.16, …]
  call_prices: number[][];  // [volIdx][spotIdx]
  put_prices: number[][];   // same dimensions
}

interface HeatmapPanelProps {
  strike: number;
  expiration: string;       // 'YYYY-MM-DD'
  rate: number;             // decimal (e.g. 0.01)
  dividend_yield: number;   // decimal
  spotCenter: number;
  spotSpread?: number;      // ± fraction around center (default 0.2)
  volCenter: number;        // decimal
  volSpread?: number;       // ± fraction around center (default 0.5)
  steps?: number;           // grid size (default 10)
}

// map [min,max]→HSL(blue→yellow)
function valueToColor(v: number, min: number, max: number) {
  const f = (v - min) / (max - min);
  const hue = 240 - 180 * Math.max(0, Math.min(1, f)); // 240=blue→60=yellow
  return `hsl(${hue},70%,50%)`;
}

export default function HeatmapPanel({
  strike,
  expiration,
  rate,
  dividend_yield,
  spotCenter,
  spotSpread = 0.2,
  volCenter,
  volSpread = 0.5,
  steps = 10,
}: HeatmapPanelProps) {
  const [data, setData] = useState<HeatmapResp | null>(null);

  // compute numerical ranges
  const spotMin = spotCenter * (1 - spotSpread);
  const spotMax = spotCenter * (1 + spotSpread);
  const volMin = volCenter * (1 - volSpread);
  const volMax = volCenter * (1 + volSpread);

  // fetch on any input change
  useEffect(() => {
    setData(null);
    fetch('/api/bs/heatmap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        strike,
        expiration,
        rate,
        dividend_yield,
        spot_min: spotMin,
        spot_max: spotMax,
        spot_steps: steps,
        vol_min: volMin,
        vol_max: volMax,
        vol_steps: steps,
      }),
    })
      .then(r => r.json())
      .then((resp: HeatmapResp) => setData(resp))
      .catch(console.error);
  }, [strike, expiration, rate, dividend_yield, spotMin, spotMax, volMin, volMax, steps]);

  if (!data) {
    return <div className="p-6"><em>Loading heatmaps…</em></div>;
  }

  // find global min/max across both matrices for consistent coloring
  let globalMin = Infinity, globalMax = -Infinity;
  [...data.call_prices, ...data.put_prices].forEach(row =>
    row.forEach(v => {
      if (v < globalMin) globalMin = v;
      if (v > globalMax) globalMax = v;
    })
  );

  const renderTable = (title: string, matrix: number[][]) => (
    <div className="overflow-auto bg-bg-panel p-4 rounded-lg w-full">
      <h3 className="font-semibold mb-2">{title}</h3>
      <table className="table-fixed w-full text-xs border-collapse">
        <thead>
          <tr>
            <th className="p-1"></th>
            {data.spots.map((s, j) => (
              <th key={j} className="p-1 text-center">
                ${s.toFixed(0)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.vols.map((v, i) => (
            <tr key={i}>
              <td className="p-1 text-right font-medium">
                {(v * 100).toFixed(0)}%
              </td>
              {matrix[i].map((val, j) => (
                <td
                  key={j}
                  className="p-1 text-center"
                  style={{ backgroundColor: valueToColor(val, globalMin, globalMax) }}
                >
                  {val.toFixed(2)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="grid grid-cols-2 gap-4">
      {renderTable('Call Price Heatmap', data.call_prices)}
      {renderTable('Put Price Heatmap',  data.put_prices)}
    </div>
  );
}
