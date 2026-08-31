import React, { useState } from "react";
import { ShopperMetrics } from "../../types";

interface ShoppersViewProps {
  data: ShopperMetrics;
}

export const ShoppersView: React.FC<ShoppersViewProps> = ({ data }) => {
  const [timeRange, setTimeRange] = useState<"today" | "week">("today");
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  const getStatusBadge = (color: string) => {
    switch (color) {
      case "info":
        return "bg-[#1E40AF]/10 text-[#1E40AF] border-[#1E40AF]/20";
      case "warning":
        return "bg-[#B45309]/10 text-[#B45309] border-[#B45309]/20";
      case "error":
        return "bg-[#991B1B]/10 text-[#991B1B] border-[#991B1B]/20";
      case "tint":
        return "bg-[#166534]/10 text-[#166534] border-[#166534]/20";
      default:
        return "bg-[#58605b]/10 text-[#58605b] border-[#58605b]/20";
    }
  };

  const chartData = (timeRange === "today" ? data?.hourlyTrend : data?.weeklyTrend) || [];
  const maxCount = Math.max(...(chartData.map((d) => d.count || 0)), 1000);

  const totalEntries = data?.totalEntries ?? 4281;
  const totalExits = data?.totalExits ?? 3904;
  const entriesTrendPercent = data?.entriesTrendPercent ?? 12;
  const avgDwellMinutes = data?.avgDwellMinutes ?? 24;
  const avgDwellSeconds = data?.avgDwellSeconds ?? 18;
  const checkoutQueueAvg = data?.checkoutQueueAvg ?? 3.4;

  return (
    <div className="space-y-6">
      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Entries */}
        <div className="bg-white border border-[#D9DDD8] rounded-lg p-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between text-[#58605b] mb-2">
              <span className="text-[12px] font-semibold uppercase tracking-wider">
                Total Entries
              </span>
              <span className="material-symbols-outlined text-[20px] text-[#166534]">login</span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-[36px] font-bold text-[#202522] tracking-tight leading-none">
                {totalEntries.toLocaleString()}
              </span>
              <span className="text-[12px] font-semibold text-[#166534] bg-[#166534]/10 px-1.5 py-0.5 rounded">
                +{entriesTrendPercent}% vs yesterday
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#D9DDD8]/60 text-[11px] text-[#58605b]">
            Sensor ingress: 100% optical accuracy
          </div>
        </div>

        {/* Metric 2: Total Exits */}
        <div className="bg-white border border-[#D9DDD8] rounded-lg p-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between text-[#58605b] mb-2">
              <span className="text-[12px] font-semibold uppercase tracking-wider">
                Total Exits
              </span>
              <span className="material-symbols-outlined text-[20px] text-[#58605b]">logout</span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-[36px] font-bold text-[#202522] tracking-tight leading-none">
                {totalExits.toLocaleString()}
              </span>
              <span className="text-[12px] font-medium text-[#58605b]">
                Net Occupancy: {totalEntries - totalExits}
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#D9DDD8]/60 text-[11px] text-[#58605b]">
            Reconciled across 4 turnstile gates
          </div>
        </div>

        {/* Metric 3: Avg Dwell Time */}
        <div className="bg-white border border-[#D9DDD8] rounded-lg p-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between text-[#58605b] mb-2">
              <span className="text-[12px] font-semibold uppercase tracking-wider">
                Avg Dwell Time
              </span>
              <span className="material-symbols-outlined text-[20px]">timer</span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-[36px] font-bold text-[#202522] tracking-tight leading-none">
                {avgDwellMinutes}m {avgDwellSeconds}s
              </span>
              <span className="text-[12px] font-semibold text-[#58605b] bg-[#f9faf8] border border-[#D9DDD8] px-1.5 py-0.5 rounded">
                -2m vs bench
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#D9DDD8]/60 text-[11px] text-[#58605b]">
            Longest dwell: Electronics (28.4m)
          </div>
        </div>

        {/* Metric 4: Checkout Queue Avg */}
        <div className="bg-white border border-[#D9DDD8] rounded-lg p-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between text-[#58605b] mb-2">
              <span className="text-[12px] font-semibold uppercase tracking-wider">
                Checkout Queue Avg
              </span>
              <span className="material-symbols-outlined text-[20px] text-[#B45309]">people</span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-[36px] font-bold text-[#B45309] tracking-tight leading-none">
                {checkoutQueueAvg}
              </span>
              <span className="text-[12px] font-medium text-[#58605b]">
                shoppers / lane
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#D9DDD8]/60 text-[11px] text-[#B45309] font-medium">
            Threshold: Alert at &gt; 5 shoppers
          </div>
        </div>
      </div>

      {/* Main Grid: Footfall Trend & Zone Popularity vs Live Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Trend Chart and Zone Table */}
        <div className="lg:col-span-2 space-y-6">
          {/* Footfall Trend Card */}
          <div className="bg-white border border-[#D9DDD8] rounded-lg p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="text-[14px] font-bold text-[#202522]">Live Footfall Trend</h3>
                <p className="text-[12px] text-[#58605b]">In-store shopper volume by hour</p>
              </div>

              {/* Time Toggle */}
              <div className="flex items-center bg-[#f9faf8] border border-[#D9DDD8] rounded-md p-0.5 self-start sm:self-auto">
                <button
                  onClick={() => setTimeRange("today")}
                  className={`px-3 py-1 text-[12px] font-semibold rounded ${
                    timeRange === "today"
                      ? "bg-[#202522] text-white shadow-xs"
                      : "text-[#58605b] hover:text-[#202522]"
                  }`}
                >
                  Today
                </button>
                <button
                  onClick={() => setTimeRange("week")}
                  className={`px-3 py-1 text-[12px] font-semibold rounded ${
                    timeRange === "week"
                      ? "bg-[#202522] text-white shadow-xs"
                      : "text-[#58605b] hover:text-[#202522]"
                  }`}
                >
                  This Week
                </button>
              </div>
            </div>

            {/* Visual SVG & Bar Chart */}
            <div className="h-56 w-full flex items-end justify-between gap-3 pt-6 pb-2 px-2 border-b border-[#D9DDD8]">
              {chartData.map((item, idx) => {
                const label = "time" in item ? item.time : item.day;
                const heightPercent = Math.max(12, (item.count / maxCount) * 100);
                const isPeak = item.count === Math.max(...chartData.map((d) => d.count));

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative">
                    {/* Tooltip */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-[#202522] text-white text-[11px] font-mono px-2 py-0.5 rounded pointer-events-none whitespace-nowrap z-10">
                      {(item.count ?? 0).toLocaleString()} shoppers
                    </div>

                    <div className="w-full max-w-[48px] bg-[#f0f2f0] rounded-t flex items-end justify-center h-44 overflow-hidden">
                      <div
                        className={`w-full transition-all duration-500 rounded-t ${
                          isPeak ? "bg-[#202522]" : "bg-[#58605b] hover:bg-[#202522]"
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      ></div>
                    </div>

                    <span className={`text-[11px] font-medium ${isPeak ? "font-bold text-[#202522]" : "text-[#58605b]"}`}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#58605b] mt-3">
              <span>Peak Influx: 16:00 - Now (910 peak shoppers)</span>
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-[#202522] rounded-xs"></span> Peak Interval
                <span className="w-2.5 h-2.5 bg-[#58605b] rounded-xs"></span> Standard Traffic
              </span>
            </div>
          </div>

          {/* Zone Popularity Table */}
          <div className="bg-white border border-[#D9DDD8] rounded-lg shadow-xs overflow-hidden">
            <div className="p-4 border-b border-[#D9DDD8] flex items-center justify-between">
              <div>
                <h3 className="text-[14px] font-bold text-[#202522]">Zone Popularity & Dwell Analysis</h3>
                <p className="text-[12px] text-[#58605b]">Real-time customer distribution by department</p>
              </div>
              <span className="text-[11px] text-[#58605b] font-medium">5 active zones</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-[#f9faf8] border-b border-[#D9DDD8] text-[11px] uppercase tracking-wider text-[#58605b] font-bold">
                  <tr>
                    <th className="py-2.5 px-4">Zone</th>
                    <th className="py-2.5 px-4">Active Count</th>
                    <th className="py-2.5 px-4">Distribution</th>
                    <th className="py-2.5 px-4">Avg Dwell</th>
                    <th className="py-2.5 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D9DDD8]">
                  {data.zonePopularity.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-[#f9faf8] transition-colors cursor-pointer"
                      onClick={() => setSelectedZone(item.zone)}
                    >
                      <td className="py-3 px-4 font-bold text-[#202522] flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#202522]"></span>
                        {item.zone}
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#202522] font-mono">
                        {item.activeCount}
                      </td>
                      <td className="py-3 px-4 w-40">
                        <div className="w-full bg-[#edeeec] rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-[#202522] h-2 rounded-full"
                            style={{ width: `${Math.min(100, (item.activeCount / 160) * 100)}%` }}
                          ></div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[#58605b] font-medium">
                        {item.avgDwellMinutes} mins
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded border ${getStatusBadge(
                            item.statusColor
                          )}`}
                        >
                          {item.statusColor === "warning" ? "High Dwell" : item.statusColor === "error" ? "Turnover" : "Normal"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Live Heatmap Blueprint Overlay */}
        <div className="space-y-6">
          <div className="bg-white border border-[#D9DDD8] rounded-lg p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-[14px] font-bold text-[#202522]">Live Heatmap Overlay</h3>
                <p className="text-[11px] text-[#58605b]">Thermal density from 18 IoT optical sensors</p>
              </div>
              <span className="text-[10px] font-mono text-[#166534] bg-[#166534]/10 px-1.5 py-0.5 rounded">
                LIVE
              </span>
            </div>

            {/* Heatmap Blueprint Canvas */}
            <div className="relative bg-[#202522] rounded-md p-4 text-white aspect-[4/4] flex flex-col justify-between overflow-hidden">
              {/* Grid Background */}
              <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>

              {/* Heatmap Glow Circles */}
              <div className="absolute top-10 left-10 w-28 h-28 rounded-full bg-emerald-500/30 blur-xl pointer-events-none"></div>
              <div className="absolute top-8 right-8 w-32 h-32 rounded-full bg-amber-500/40 blur-xl pointer-events-none"></div>
              <div className="absolute bottom-16 left-12 w-36 h-36 rounded-full bg-blue-500/30 blur-xl pointer-events-none"></div>
              <div className="absolute bottom-6 left-6 w-24 h-16 rounded-full bg-red-500/50 blur-xl pointer-events-none"></div>

              {/* Blueprint vector overlays */}
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div className="grid grid-cols-2 gap-3 h-[75%]">
                  {/* Top Left: Produce */}
                  <div
                    onClick={() => setSelectedZone("Grocery")}
                    className="border border-emerald-500/40 bg-emerald-950/30 rounded p-2.5 hover:bg-emerald-900/40 cursor-pointer transition-colors"
                  >
                    <div className="text-[11px] font-bold text-emerald-400">Fresh Produce</div>
                    <div className="text-[10px] text-gray-300 font-mono mt-1">84 shoppers</div>
                    <div className="text-[9px] text-gray-400 mt-2">Dwell: 15.2m</div>
                  </div>

                  {/* Top Right: Electronics */}
                  <div
                    onClick={() => setSelectedZone("Electronics")}
                    className="border border-amber-500/50 bg-amber-950/30 rounded p-2.5 hover:bg-amber-900/40 cursor-pointer transition-colors"
                  >
                    <div className="text-[11px] font-bold text-amber-400">Electronics Zone</div>
                    <div className="text-[10px] text-amber-200 font-mono mt-1">89 shoppers</div>
                    <div className="text-[9px] text-amber-300/80 mt-2">High Dwell Peak</div>
                  </div>

                  {/* Bottom Left: Grocery */}
                  <div
                    onClick={() => setSelectedZone("Grocery")}
                    className="border border-blue-500/40 bg-blue-950/30 rounded p-2.5 hover:bg-blue-900/40 cursor-pointer transition-colors"
                  >
                    <div className="text-[11px] font-bold text-blue-400">Pantry & Grocery</div>
                    <div className="text-[10px] text-gray-300 font-mono mt-1">142 shoppers</div>
                    <div className="text-[9px] text-gray-400 mt-2">Dwell: 12.1m</div>
                  </div>

                  {/* Bottom Right: Apparel */}
                  <div
                    onClick={() => setSelectedZone("Apparel")}
                    className="border border-gray-600/50 bg-gray-900/40 rounded p-2.5 hover:bg-gray-800/40 cursor-pointer transition-colors"
                  >
                    <div className="text-[11px] font-bold text-gray-300">Apparel Section</div>
                    <div className="text-[10px] text-gray-400 font-mono mt-1">45 shoppers</div>
                    <div className="text-[9px] text-gray-400 mt-2">Dwell: 18.5m</div>
                  </div>
                </div>

                {/* Checkout Bar */}
                <div
                  onClick={() => setSelectedZone("Checkout")}
                  className="border border-red-500/60 bg-red-950/40 rounded p-2 flex items-center justify-between cursor-pointer hover:bg-red-900/40 transition-colors"
                >
                  <span className="text-[11px] font-bold text-red-400">Checkout Lanes 1-6</span>
                  <span className="text-[10px] font-mono text-red-300 font-semibold bg-red-900/60 px-1.5 py-0.5 rounded">
                    Congested (8 queue)
                  </span>
                </div>
              </div>
            </div>

            {/* Heatmap Legend */}
            <div className="mt-4 pt-3 border-t border-[#D9DDD8] flex items-center justify-between text-[11px] text-[#58605b]">
              <span>Heatmap Intensity:</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px]">Low</span>
                <div className="h-2 w-16 rounded bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500"></div>
                <span className="text-[10px]">High</span>
              </div>
            </div>

            {selectedZone && (
              <div className="mt-3 p-3 bg-[#f9faf8] border border-[#D9DDD8] rounded-md text-[12px]">
                <div className="font-bold text-[#202522] mb-1">{selectedZone} Metrics</div>
                <div className="text-[11px] text-[#58605b] space-y-1">
                  <div>• 4 Edge camera streams tracking zone</div>
                  <div>• Zero privacy violation: Raw video never leaves edge device</div>
                  <div>• Optical flow accuracy: 98.6%</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
