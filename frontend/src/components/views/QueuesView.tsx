import React from "react";
import { QueueData } from "../../types";

interface QueuesViewProps {
  data: QueueData;
  onToggleCounter: (id: number) => void;
  onExecuteRecommendation: () => void;
}

export const QueuesView: React.FC<QueuesViewProps> = ({
  data,
  onToggleCounter,
  onExecuteRecommendation,
}) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Normal":
        return "bg-[#166534]/10 text-[#166534] border-[#166534]/20";
      case "Elevated":
        return "bg-[#B45309]/10 text-[#B45309] border-[#B45309]/20";
      case "Congested":
        return "bg-[#991B1B]/10 text-[#991B1B] border-[#991B1B]/20";
      case "Offline":
        return "bg-[#58605b]/10 text-[#58605b] border-[#58605b]/20";
      default:
        return "bg-[#58605b]/10 text-[#58605b] border-[#58605b]/20";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top 3 Cards: Congestion Risk, AI Recommendation, Wait Time KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Predicted Congestion Risk */}
        <div className="bg-white border border-[#D9DDD8] rounded-lg p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] font-semibold uppercase tracking-wider text-[#58605b]">
                Predicted Congestion Risk
              </span>
              <span className="material-symbols-outlined text-[20px] text-[#B45309]">trending_up</span>
            </div>

            <div className="flex items-baseline space-x-2">
              <span
                className={`text-[32px] font-bold tracking-tight leading-none ${
                  data.predictedRisk === "HIGH"
                    ? "text-[#991B1B]"
                    : data.predictedRisk === "MEDIUM"
                    ? "text-[#B45309]"
                    : "text-[#166534]"
                }`}
              >
                {data.predictedRisk}
              </span>
              <span className="text-[12px] font-medium text-[#58605b]">
                Peak in {data.peakExpectedMinutes} mins
              </span>
            </div>

            <p className="text-[12px] text-[#58605b] mt-2 leading-relaxed">
              Optical sensors detect 32 shoppers heading toward the front checkout area.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-[#D9DDD8]/60 flex items-center justify-between text-[11px] text-[#58605b]">
            <span>Model: Time-Series Queue ARIMA</span>
            <span className="font-mono text-[#166534]">96.4% confidence</span>
          </div>
        </div>

        {/* Card 2: AI Operational Recommendation */}
        <div className="bg-white border border-[#D9DDD8] rounded-lg p-5 shadow-xs flex flex-col justify-between border-l-4 border-l-[#202522]">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-1.5">
                <span className="material-symbols-outlined text-[18px] text-[#166534]">smart_toy</span>
                <span className="text-[12px] font-bold uppercase tracking-wider text-[#202522]">
                  AI Recommendation
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold bg-[#166534]/10 text-[#166534] px-2 py-0.5 rounded">
                High Priority
              </span>
            </div>

            <h4 className="text-[16px] font-bold text-[#202522] mt-1">
              {data.aiRecommendation.title}
            </h4>
            <p className="text-[12px] text-[#58605b] mt-1 leading-relaxed">
              {data.aiRecommendation.description}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-[#D9DDD8]/60 flex items-center justify-between">
            {data.aiRecommendation.executed ? (
              <span className="text-[12px] font-bold text-[#166534] flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                Counter 4 Activated (Congestion Resolving)
              </span>
            ) : (
              <button
                id="execute-ai-recommendation-btn"
                onClick={onExecuteRecommendation}
                className="w-full py-2 bg-[#202522] hover:bg-black text-white text-[12px] font-bold rounded-md transition-colors flex items-center justify-center gap-1.5 shadow-xs"
              >
                <span className="material-symbols-outlined text-[16px]">bolt</span>
                Execute Recommendation
              </button>
            )}
          </div>
        </div>

        {/* Card 3: Avg Wait & Service Times */}
        <div className="bg-white border border-[#D9DDD8] rounded-lg p-5 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <div className="text-[12px] font-semibold uppercase tracking-wider text-[#58605b] mb-1">
                Avg Wait Time
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-[28px] font-bold text-[#202522] font-mono leading-none">
                  {data.avgWaitTime}
                </span>
                <span className="text-[11px] font-bold text-[#991B1B] bg-[#991B1B]/10 px-1.5 py-0.5 rounded">
                  {data.avgWaitDiff}
                </span>
              </div>
            </div>

            <div>
              <div className="text-[12px] font-semibold uppercase tracking-wider text-[#58605b] mb-1">
                Avg Service Time
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-[28px] font-bold text-[#202522] font-mono leading-none">
                  {data.avgServiceTime}
                </span>
                <span className="text-[11px] font-bold text-[#166534] bg-[#166534]/10 px-1.5 py-0.5 rounded">
                  {data.avgServiceDiff}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#D9DDD8]/60 text-[11px] text-[#58605b]">
            Service throughput: 28 items / min average
          </div>
        </div>
      </div>

      {/* Main Table: Active Counters Telemetry */}
      <div className="bg-white border border-[#D9DDD8] rounded-lg shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#D9DDD8] flex items-center justify-between">
          <div>
            <h3 className="text-[14px] font-bold text-[#202522]">Active Checkout Registers</h3>
            <p className="text-[12px] text-[#58605b]">Real-time camera queue line tracking</p>
          </div>
          <span className="text-[11px] font-mono text-[#58605b]">
            4 total lanes configured
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-[#f9faf8] border-b border-[#D9DDD8] text-[11px] uppercase tracking-wider text-[#58605b] font-bold">
              <tr>
                <th className="py-2.5 px-4">Lane ID</th>
                <th className="py-2.5 px-4">Counter Name</th>
                <th className="py-2.5 px-4">Type</th>
                <th className="py-2.5 px-4 w-60">Queue Length (Capacity)</th>
                <th className="py-2.5 px-4">Est. Wait</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D9DDD8]">
              {data.counters.map((counter) => {
                const isOnline = counter.status !== "Offline";
                const qLen = counter.queueLength || 0;

                return (
                  <tr key={counter.id} className="hover:bg-[#f9faf8] transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#202522]">
                      #0{counter.id}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#202522]">
                      {counter.name}
                    </td>
                    <td className="py-3.5 px-4 text-[#58605b] font-medium">
                      {counter.type}
                    </td>
                    <td className="py-3.5 px-4">
                      {isOnline ? (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] font-mono">
                            <span className="font-bold text-[#202522]">
                              {qLen} / {counter.capacity} shoppers
                            </span>
                            <span className="text-[#58605b]">
                              {Math.round((qLen / counter.capacity) * 100)}%
                            </span>
                          </div>
                          {/* Visual Dots Queue Representation */}
                          <div className="flex items-center space-x-1">
                            {Array.from({ length: counter.capacity }).map((_, idx) => (
                              <div
                                key={idx}
                                className={`h-2 flex-1 rounded-xs transition-colors ${
                                  idx < qLen
                                    ? counter.status === "Congested"
                                      ? "bg-[#991B1B]"
                                      : counter.status === "Elevated"
                                      ? "bg-[#B45309]"
                                      : "bg-[#166534]"
                                    : "bg-[#edeeec]"
                                }`}
                              ></div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[12px] text-[#58605b] italic">
                          Lane Closed • Ready on standby
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-[#202522]">
                      {isOnline ? `${counter.estWaitMins} mins` : "—"}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded border ${getStatusBadge(
                          counter.status
                        )}`}
                      >
                        {counter.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => onToggleCounter(counter.id)}
                        className={`px-3 py-1 text-[11px] font-bold rounded transition-colors ${
                          isOnline
                            ? "bg-[#f9faf8] text-[#991B1B] hover:bg-[#991B1B] hover:text-white border border-[#D9DDD8]"
                            : "bg-[#202522] text-white hover:bg-black"
                        }`}
                      >
                        {isOnline ? "Close Lane" : "Open Lane"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
