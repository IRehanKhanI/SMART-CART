import React, { useState } from "react";
import {
  InventoryItem,
  QueueData,
  ReportItem,
  StoreProfile,
} from "../../types";

interface AnalyticsViewProps {
  recentReports: ReportItem[];
  weeklyTrend: { day: string; count: number }[];
  zoneBreakdown: {
    name: string;
    visits: string;
    avgDwell: string;
    status: string;
  }[];
  inventory: InventoryItem[];
  queues: QueueData;
  storeProfile: StoreProfile;
  onGenerateReport: (config: any) => Promise<void>;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  recentReports,
  weeklyTrend,
  zoneBreakdown,
  inventory,
  queues,
  storeProfile,
  onGenerateReport,
}) => {
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 6);
  const [dateStart, setDateStart] = useState(
    sevenDaysAgo.toISOString().slice(0, 10),
  );
  const [dateEnd, setDateEnd] = useState(today.toISOString().slice(0, 10));
  const [reportType, setReportType] = useState("Store Performance");
  const [selectedZone, setSelectedZone] = useState("All Store Zones");
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportGeneratedNotice, setReportGeneratedNotice] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await onGenerateReport({
        reportType,
        dateStart,
        dateEnd,
        zone: selectedZone,
      });
      setIsGenerating(false);
      setReportGeneratedNotice(true);
      setTimeout(() => setReportGeneratedNotice(false), 3000);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const maxWeeklyCount = Math.max(...weeklyTrend.map((d) => d.count), 1);
  const totalFootfall = weeklyTrend.reduce((sum, day) => sum + day.count, 0);
  const peakQueue = Math.max(
    ...queues.counters.map((counter) => counter.queueLength ?? 0),
    0,
  );
  const outOfStock = inventory.filter((item) => item.currentStock === 0).length;
  const shelfAvailability = inventory.length
    ? Math.round(((inventory.length - outOfStock) / inventory.length) * 1000) /
      10
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Report Parameters & Recent Reports */}
        <div className="space-y-6">
          {/* Report Parameters Form */}
          <div className="bg-white border border-[#D9DDD8] rounded-lg p-5 shadow-xs">
            <h3 className="text-[14px] font-bold text-[#202522] mb-4 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px]">
                tune
              </span>
              Report Parameters
            </h3>

            <div className="space-y-4">
              {/* Date Range */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#58605b] block mb-1.5">
                  Date Range
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={dateStart}
                    onChange={(e) => setDateStart(e.target.value)}
                    className="bg-[#f9faf8] border border-[#D9DDD8] rounded-md px-2.5 py-1.5 text-[12px] text-[#202522] focus:outline-none focus:border-[#202522]"
                  />
                  <input
                    type="date"
                    value={dateEnd}
                    onChange={(e) => setDateEnd(e.target.value)}
                    className="bg-[#f9faf8] border border-[#D9DDD8] rounded-md px-2.5 py-1.5 text-[12px] text-[#202522] focus:outline-none focus:border-[#202522]"
                  />
                </div>
              </div>

              {/* Report Type */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#58605b] block mb-1.5">
                  Report Type
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full bg-[#f9faf8] border border-[#D9DDD8] rounded-md px-2.5 py-1.5 text-[12px] text-[#202522] focus:outline-none focus:border-[#202522]"
                >
                  <option value="Store Performance">
                    Store Performance & Traffic
                  </option>
                  <option value="Inventory Audit">
                    Inventory & Stockout Audit
                  </option>
                  <option value="Queue Telemetry">
                    Queue & Checkout Telemetry
                  </option>
                  <option value="Dwell Heatmap">
                    Zone Dwell & Optical Flow
                  </option>
                </select>
              </div>

              {/* Zone / Location */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#58605b] block mb-1.5">
                  Zone / Department
                </label>
                <select
                  value={selectedZone}
                  onChange={(e) => setSelectedZone(e.target.value)}
                  className="w-full bg-[#f9faf8] border border-[#D9DDD8] rounded-md px-2.5 py-1.5 text-[12px] text-[#202522] focus:outline-none focus:border-[#202522]"
                >
                  <option value="All Store Zones">All Store Zones</option>
                  {zoneBreakdown.map((zone) => (
                    <option key={zone.name} value={zone.name}>
                      {zone.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center space-x-2">
                <button
                  id="generate-report-btn"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="flex-1 py-2 bg-[#202522] hover:bg-black text-white text-[12px] font-bold rounded-md transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <span className="material-symbols-outlined text-[16px] animate-spin">
                        refresh
                      </span>
                      Generating...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">
                        refresh
                      </span>
                      Update Preview
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    setDateStart("2023-10-01");
                    setDateEnd("2023-10-07");
                    setReportType("Store Performance");
                    setSelectedZone("All Store Zones");
                  }}
                  className="px-3 py-2 bg-[#f9faf8] hover:bg-[#edeeec] border border-[#D9DDD8] text-[#58605b] text-[12px] font-medium rounded-md transition-colors"
                >
                  Reset
                </button>
              </div>

              {reportGeneratedNotice && (
                <div className="p-2 bg-[#166534]/10 text-[#166534] text-[11px] font-bold rounded border border-[#166534]/20 text-center">
                  Report generated successfully!
                </div>
              )}
            </div>
          </div>

          {/* Recent Reports List */}
          <div className="bg-white border border-[#D9DDD8] rounded-lg p-5 shadow-xs">
            <h3 className="text-[14px] font-bold text-[#202522] mb-3 flex items-center justify-between">
              <span>Recent Generated Reports</span>
              <span className="text-[11px] text-[#58605b]">History</span>
            </h3>

            <div className="space-y-2.5">
              {recentReports.map((report) => (
                <div
                  key={report.id}
                  className="p-2.5 bg-[#f9faf8] border border-[#D9DDD8] rounded-md flex items-center justify-between hover:bg-[#f3f4f2] transition-colors"
                >
                  <div className="flex items-center space-x-2.5">
                    <span className="material-symbols-outlined text-[20px] text-[#58605b]">
                      description
                    </span>
                    <div>
                      <div className="text-[12px] font-bold text-[#202522]">
                        {report.filename}
                      </div>
                      <div className="text-[10px] text-[#58605b]">
                        {report.dateStr} • {report.fileSize}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setReportGeneratedNotice(true);
                      setTimeout(() => setReportGeneratedNotice(false), 3000);
                    }}
                    className="p-1 text-[#58605b] hover:text-[#202522] cursor-pointer"
                    title="Download Report"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      download
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Live Report Preview Document */}
        <div className="lg:col-span-2 space-y-4">
          {/* Top Actions Bar */}
          <div className="flex items-center justify-between bg-white border border-[#D9DDD8] rounded-lg p-3 px-4 shadow-xs">
            <div className="flex items-center space-x-2">
              <span className="text-[12px] font-bold text-[#202522]">
                Live Document Preview
              </span>
              <span className="text-[10px] font-mono bg-[#f9faf8] border border-[#D9DDD8] px-1.5 py-0.5 rounded text-[#58605b]">
                {reportType}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handlePrint}
                className="px-3 py-1.5 bg-[#f9faf8] hover:bg-[#edeeec] border border-[#D9DDD8] text-[#202522] text-[12px] font-semibold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">
                  print
                </span>
                Print
              </button>
              <button
                onClick={() => {
                  setReportGeneratedNotice(true);
                  setTimeout(() => setReportGeneratedNotice(false), 3000);
                }}
                className="px-3 py-1.5 bg-[#202522] hover:bg-black text-white text-[12px] font-semibold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">
                  picture_as_pdf
                </span>
                Print Report
              </button>
            </div>
          </div>

          {/* Report Document Sheet */}
          <div className="bg-white border border-[#D9DDD8] rounded-lg p-6 lg:p-8 shadow-sm space-y-6 text-[#202522]">
            {/* Document Header */}
            <div className="border-b border-[#D9DDD8] pb-5 flex flex-col sm:flex-row justify-between gap-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#58605b]">
                  Retail Intelligence Platform • SIH-26179
                </div>
                <h2 className="text-[20px] font-bold text-[#202522] mt-0.5">
                  Store Operations & Performance Audit
                </h2>
                <div className="text-[12px] text-[#58605b] mt-1">
                  Location: {storeProfile.storeName || "No store configured"} (
                  {storeProfile.storeId || "No ID"}) • Scope: {selectedZone}
                </div>
              </div>

              <div className="text-left sm:text-right text-[11px] text-[#58605b] space-y-0.5">
                <div>
                  Audit Period:{" "}
                  <span className="font-semibold text-[#202522]">
                    {dateStart} to {dateEnd}
                  </span>
                </div>
                <div>
                  Previewed:{" "}
                  <span className="font-semibold text-[#202522]">
                    {today.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Key Performance Indicators Summary */}
            <div>
              <h4 className="text-[12px] font-bold uppercase tracking-wider text-[#58605b] mb-3">
                1. Executive Summary Telemetry
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-[#f9faf8] border border-[#D9DDD8] rounded">
                  <div className="text-[11px] text-[#58605b]">
                    Total Footfall
                  </div>
                  <div className="text-[20px] font-bold text-[#202522] font-mono mt-1">
                    {totalFootfall.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-[#58605b] font-medium">
                    Stored entry events
                  </div>
                </div>
                <div className="p-3 bg-[#f9faf8] border border-[#D9DDD8] rounded">
                  <div className="text-[11px] text-[#58605b]">
                    Avg Dwell Duration
                  </div>
                  <div className="text-[20px] font-bold text-[#202522] font-mono mt-1">
                    {zoneBreakdown.length
                      ? zoneBreakdown[0].avgDwell
                      : "No data"}
                  </div>
                  <div className="text-[10px] text-[#58605b]">
                    First configured zone
                  </div>
                </div>
                <div className="p-3 bg-[#f9faf8] border border-[#D9DDD8] rounded">
                  <div className="text-[11px] text-[#58605b]">
                    Peak Queue Length
                  </div>
                  <div className="text-[20px] font-bold text-[#B45309] font-mono mt-1">
                    {peakQueue} shoppers
                  </div>
                  <div className="text-[10px] text-[#B45309]">
                    Avg wait: {queues.avgWaitTime}
                  </div>
                </div>
                <div className="p-3 bg-[#f9faf8] border border-[#D9DDD8] rounded">
                  <div className="text-[11px] text-[#58605b]">
                    Shelf Availability
                  </div>
                  <div className="text-[20px] font-bold text-[#166534] font-mono mt-1">
                    {shelfAvailability}%
                  </div>
                  <div className="text-[10px] text-[#166534]">
                    {outOfStock} out-of-stock items
                  </div>
                </div>
              </div>
            </div>

            {/* Weekly Traffic Trend Bar Chart */}
            <div>
              <h4 className="text-[12px] font-bold uppercase tracking-wider text-[#58605b] mb-3">
                2. Weekly Traffic Distribution
              </h4>
              <div className="p-4 bg-[#f9faf8] border border-[#D9DDD8] rounded">
                <div className="h-40 flex items-end justify-between gap-3 pt-4">
                  {weeklyTrend.map((item, idx) => {
                    const heightPercent = Math.max(
                      15,
                      (item.count / maxWeeklyCount) * 100,
                    );
                    return (
                      <div
                        key={idx}
                        className="flex-1 flex flex-col items-center gap-1.5"
                      >
                        <span className="text-[10px] font-mono text-[#58605b]">
                          {item.count.toLocaleString()}
                        </span>
                        <div className="w-full bg-[#D9DDD8] rounded-t flex items-end h-28">
                          <div
                            className="w-full bg-[#202522] rounded-t"
                            style={{ height: `${heightPercent}%` }}
                          ></div>
                        </div>
                        <span className="text-[11px] font-bold text-[#202522]">
                          {item.day}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Zone Breakdown Table */}
            <div>
              <h4 className="text-[12px] font-bold uppercase tracking-wider text-[#58605b] mb-3">
                3. Departmental Ingress & Conversion
              </h4>
              <div className="border border-[#D9DDD8] rounded overflow-hidden">
                <table className="w-full text-left text-[12px]">
                  <thead className="bg-[#f9faf8] border-b border-[#D9DDD8] text-[10px] uppercase font-bold text-[#58605b]">
                    <tr>
                      <th className="p-2.5 px-3">Zone / Department</th>
                      <th className="p-2.5 px-3">Total Ingress Visits</th>
                      <th className="p-2.5 px-3">Avg Dwell</th>
                      <th className="p-2.5 px-3 text-right">Compliance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D9DDD8]">
                    {zoneBreakdown.map((zone, i) => (
                      <tr key={i} className="hover:bg-[#f9faf8]">
                        <td className="p-2.5 px-3 font-bold text-[#202522]">
                          {zone.name}
                        </td>
                        <td className="p-2.5 px-3 font-mono">{zone.visits}</td>
                        <td className="p-2.5 px-3 text-[#58605b]">
                          {zone.avgDwell}
                        </td>
                        <td className="p-2.5 px-3 text-right">
                          <span
                            className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                              zone.status === "warning"
                                ? "bg-[#B45309]/10 text-[#B45309]"
                                : "bg-[#166534]/10 text-[#166534]"
                            }`}
                          >
                            {zone.status === "warning"
                              ? "Needs Review"
                              : "Optimal"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Operational findings */}
            <div className="p-4 bg-[#f9faf8] border-l-4 border-l-[#202522] rounded border border-[#D9DDD8] space-y-2 text-[12px]">
              <div className="font-bold text-[#202522] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#166534]">
                  psychology
                </span>
                Observed Operational Findings
              </div>
              <p className="text-[#58605b] leading-relaxed">
                Queue risk: {queues.predictedRisk}.{" "}
                {queues.aiRecommendation.description}
              </p>
              <p className="text-[#58605b] leading-relaxed">
                {zoneBreakdown.some((zone) => zone.status === "warning")
                  ? `${zoneBreakdown.filter((zone) => zone.status === "warning").length} zone(s) require review based on current capacity.`
                  : "No configured zones currently exceed capacity."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
