import {
  Maximize2,
  SlidersHorizontal,
} from 'lucide-react'

type MockCandle = [
  number,
  number,
  number,
  number,
  boolean
]

const candles: MockCandle[] = [
  [18, 44, 58, 33, true],
  [36, 50, 67, 29, true],
  [54, 45, 64, 39, false],
  [70, 63, 77, 52, false],
  [86, 74, 90, 64, false],
  [102, 58, 82, 49, true],
  [118, 40, 67, 31, true],
  [134, 53, 72, 35, false],
  [150, 61, 78, 46, false],
  [166, 79, 84, 56, false],
  [182, 68, 91, 62, true],
  [198, 49, 74, 41, true],
  [214, 35, 61, 27, true],
  [230, 50, 65, 31, false],
  [246, 72, 82, 47, false],
  [262, 88, 96, 65, false],
  [278, 79, 98, 71, true],
  [294, 92, 104, 74, false],
  [310, 111, 118, 87, false],
  [326, 103, 122, 96, true],
  [342, 120, 128, 99, false],
  [358, 136, 143, 115, false],
  [374, 130, 147, 122, true],
  [390, 145, 154, 127, false],
  [406, 157, 165, 139, false],
  [422, 151, 171, 145, true],
  [438, 168, 178, 149, false],
  [454, 181, 188, 162, false],
  [470, 176, 194, 168, true],
]

export function MockChart({
  symbol,
  timeframe,
}: {
  symbol: string
  timeframe: string
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#090d13]">

      <div className="flex items-center justify-between border-b border-white/[0.05] px-4 py-3">

        <div className="flex items-center gap-3">

          <div>
            <div className="text-sm font-semibold text-white">
              {symbol}
            </div>

            <div className="text-[10px] text-slate-500">
              {timeframe} • Market structure + liquidity map
            </div>
          </div>

          <span className="rounded-md bg-emerald-400/10 px-2 py-1 text-[10px] font-semibold text-emerald-300">
            LIVE MOCK
          </span>

        </div>

        <div className="flex gap-1">

          <button className="icon-btn">
            <SlidersHorizontal size={15} />
          </button>

          <button className="icon-btn">
            <Maximize2 size={15} />
          </button>

        </div>

      </div>

      <div className="relative h-[420px] w-full bg-[linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] bg-[size:56px_56px]">

        <div className="absolute left-[8%] right-[3%] top-[31%] h-12 rounded-lg border border-emerald-400/20 bg-emerald-400/[0.045]">

          <span className="absolute -top-5 left-2 text-[9px] font-medium tracking-widest text-emerald-400/70">
            BULLISH FVG
          </span>

        </div>

        <div className="absolute bottom-[19%] left-[30%] right-[46%] h-14 rounded-lg border border-sky-400/20 bg-sky-400/[0.045]">

          <span className="absolute -top-5 left-2 text-[9px] font-medium tracking-widest text-sky-400/70">
            ORDER BLOCK
          </span>

        </div>

        <div className="absolute left-[4%] right-[4%] top-[18%] border-t border-dashed border-rose-400/30">

          <span className="absolute -top-5 right-0 text-[9px] tracking-wider text-rose-300/70">
            BUY-SIDE LIQUIDITY
          </span>

        </div>

        <svg
          viewBox="0 0 500 220"
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="none"
        >

          {candles.map(
            ([x, close, high, low, bull], i) => {
              const xPos = Number(x)
              const closePrice = Number(close)
              const highPrice = Number(high)
              const lowPrice = Number(low)

              const y = 205 - closePrice
              const h = 14 + (i % 4) * 3

              const fill = bull
                ? '#34d399'
                : '#fb7185'

              return (
                <g
                  key={i}
                  opacity=".88"
                >

                  <line
                    x1={xPos}
                    x2={xPos}
                    y1={205 - highPrice}
                    y2={205 - lowPrice}
                    stroke={fill}
                    strokeWidth="1"
                  />

                  <rect
                    x={xPos - 3.2}
                    y={y - h / 2}
                    width="6.4"
                    height={h}
                    rx="1"
                    fill={fill}
                  />

                </g>
              )
            }
          )}

          <path
            d="M16 176 C80 170, 95 161, 130 166 S205 145, 245 137 S305 113, 340 106 S418 71, 486 55"
            fill="none"
            stroke="#fbbf24"
            strokeWidth="1.2"
            opacity=".65"
            strokeDasharray="3 4"
          />

        </svg>

        <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">

          <span className="chart-tag text-emerald-300">
            CHoCH ↑
          </span>

          <span className="chart-tag text-sky-300">
            FVG
          </span>

          <span className="chart-tag text-amber-300">
            EMA 50
          </span>

          <span className="chart-tag text-violet-300">
            SSL swept
          </span>

        </div>

      </div>

    </div>
  )
}