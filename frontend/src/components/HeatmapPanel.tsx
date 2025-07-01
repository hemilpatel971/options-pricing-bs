// src/components/HeatmapPanel.tsx
import React, { useState, useEffect } from 'react'
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip
} from 'recharts'

interface HeatmapResp {
  spots: number[]        // 1D spot array
  vols: number[]         // 1D vol array
  call_prices: number[][]// [volIdx][spotIdx]
  put_prices: number[][] // [volIdx][spotIdx]
}

interface HeatmapPanelProps {
  strike: number
  expiration: string       // YYYY-MM-DD
  rate: number             // e.g. 0.01
  dividend_yield: number   // e.g. 0.005
  spotCenter: number
  spotSpread?: number      // ± fraction around center
  volCenter: number
  volSpread?: number       // ± fraction around center
  steps?: number           // number of grid steps
}

const HeatmapPanel: React.FC<HeatmapPanelProps> = React.memo(({
  strike,
  expiration,
  rate,
  dividend_yield,
  spotCenter,
  spotSpread = 0.2,
  volCenter,
  volSpread  = 0.5,
  steps      = 10,
}) => {
  // dynamic ranges
  const [spotMin, setSpotMin] = useState(spotCenter * (1 - spotSpread))
  const [spotMax, setSpotMax] = useState(spotCenter * (1 + spotSpread))
  const [volMin,  setVolMin]  = useState(volCenter * (1 - volSpread))
  const [volMax,  setVolMax]  = useState(volCenter * (1 + volSpread))
  const [data,    setData]    = useState<HeatmapResp | null>(null)

  // fetch whenever filters change
  useEffect(() => {
    setData(null)
    fetch('/api/bs/heatmap', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        strike,
        expiration,
        rate,
        dividend_yield,
        spot_min:  spotMin,
        spot_max:  spotMax,
        spot_steps: steps,
        vol_min:   volMin,
        vol_max:   volMax,
        vol_steps: steps,
      }),
    })
      .then(r => r.json())
      .then((resp: HeatmapResp) => setData(resp))
      .catch(console.error)
  }, [
    strike, expiration, rate, dividend_yield,
    spotMin, spotMax, volMin, volMax, steps
  ])

  if (!data) {
    return <div className="p-6"><em>Loading heatmaps…</em></div>
  }

  // build flat data arrays for Recharts
  const callData = data.vols.flatMap((v, i) =>
    data.spots.map((s, j) => ({ x: s, y: v * 100, z: data.call_prices[i][j] }))
  )
  const putData = data.vols.flatMap((v, i) =>
    data.spots.map((s, j) => ({ x: s, y: v * 100, z: data.put_prices[i][j] }))
  )

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-6 p-4 bg-bg-panel rounded-lg">
        <div className="flex flex-col">
          <label className="text-xs font-medium">
            Spot Range (${spotMin.toFixed(2)} – ${spotMax.toFixed(2)})
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={spotMin.toFixed(0)}
              onChange={e => setSpotMin(Math.min(+e.target.value, spotMax))}
              className="w-20 px-2 py-1 bg-white dark:bg-black border rounded text-sm"
            />
            <span className="self-end">–</span>
            <input
              type="number"
              value={spotMax.toFixed(0)}
              onChange={e => setSpotMax(Math.max(+e.target.value, spotMin))}
              className="w-20 px-2 py-1 bg-white dark:bg-black border rounded text-sm"
            />
          </div>
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-medium">
            Vol Range ({(volMin*100).toFixed(1)}% – {(volMax*100).toFixed(1)}%)
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={(volMin*100).toFixed(1)}
              onChange={e => setVolMin(Math.max(0, +e.target.value)/100)}
              className="w-20 px-2 py-1 bg-white dark:bg-black border rounded text-sm"
            />
            <span className="self-end">–</span>
            <input
              type="number"
              value={(volMax*100).toFixed(1)}
              onChange={e => setVolMax(Math.max(0, +e.target.value)/100)}
              className="w-20 px-2 py-1 bg-white dark:bg-black border rounded text-sm"
            />
          </div>
        </div>
      </div>

      {/* Anchored info */}
      <p className="text-sm text-center">
        Anchored at Spot ${spotCenter.toFixed(2)} | Vol {(volCenter*100).toFixed(2)}%
      </p>

      {/* Two heatmaps */}
      <div className="grid grid-cols-2 gap-4">
        {/* Call Heatmap */}
        <div className="p-4 bg-bg-panel rounded-lg">
          <h4 className="mb-2 font-semibold text-green-500">Call Price Heatmap</h4>
          <ResponsiveContainer width="100%" height={240}>
            <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
              <CartesianGrid stroke="#444" />
              <XAxis
                type="number"
                dataKey="x"
                domain={[spotMin, spotMax]}
                tickFormatter={v => `$${v.toFixed(0)}`}
              />
              <YAxis
                type="number"
                dataKey="y"
                domain={[volMin*100, volMax*100]}
                tickFormatter={v => `${v.toFixed(0)}%`}
              />
              <ZAxis dataKey="z" range={[0, 200]} />
              <Tooltip formatter={(value: any) => `$${(+value).toFixed(2)}`} />
              <Scatter name="Call" data={callData} fill="#00C832" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Put Heatmap */}
        <div className="p-4 bg-bg-panel rounded-lg">
          <h4 className="mb-2 font-semibold text-red-500">Put Price Heatmap</h4>
          <ResponsiveContainer width="100%" height={240}>
            <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
              <CartesianGrid stroke="#444" />
              <XAxis
                type="number"
                dataKey="x"
                domain={[spotMin, spotMax]}
                tickFormatter={v => `$${v.toFixed(0)}`}
              />
              <YAxis
                type="number"
                dataKey="y"
                domain={[volMin*100, volMax*100]}
                tickFormatter={v => `${v.toFixed(0)}%`}
              />
              <ZAxis dataKey="z" range={[0, 200]} />
              <Tooltip formatter={(value: any) => `$${(+value).toFixed(2)}`} />
              <Scatter name="Put" data={putData} fill="#C80032" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
})

export default HeatmapPanel
