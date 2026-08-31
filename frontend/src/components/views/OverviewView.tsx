import React, { useState } from "react";
import { OverviewMetrics, CriticalAlert, TabType, StoreMetrics, ShopperMetrics, InventoryItem, QueueData } from "../../types";

interface OverviewViewProps {
  metrics?: OverviewMetrics | StoreMetrics | any;
  alerts?: CriticalAlert[];
  criticalAlerts?: CriticalAlert[];
  shoppers?: ShopperMetrics;
  inventory?: InventoryItem[];
  queues?: QueueData;
  onAcknowledgeAlert?: (id: string) => void;
  onNavigateTab?: (tab: TabType) => void;
  onSelectTab?: (tab: TabType) => void;
  onDispatchRestock?: (sku: string) => void;
  onExecuteQuickAction?: (action: string) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  metrics,
  alerts,
  criticalAlerts,
  shoppers,
  inventory,
  queues,
  onAcknowledgeAlert,
  onNavigateTab,
  onSelectTab,
  onDispatchRestock,
  onExecuteQuickAction,
}) => {
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  const effectiveAlerts: CriticalAlert[] = alerts || criticalAlerts || [];

  const handleNavigate = (tab: TabType) => {
    if (onNavigateTab) onNavigateTab(tab);
    else if (onSelectTab) onSelectTab(tab);
  };

  const handleAction = (action: string) => {
    if (onExecuteQuickAction) {
      onExecuteQuickAction(action);
    } else if (onDispatchRestock && action.startsWith("replenish-")) {
      onDispatchRestock("849201");
    }
  };

  const handleAck = (id: string) => {
    if (onAcknowledgeAlert) {
      onAcknowledgeAlert(id);
    }
  };

  // Safe metric resolution
  const currentOccupancy =
    typeof metrics?.currentOccupancy === "number"
      ? metrics.currentOccupancy
      : typeof metrics?.activeShoppers === "number"
      ? metrics.activeShoppers
      : shoppers?.totalEntries && shoppers?.totalExits
      ? Math.max(0, shoppers.totalEntries - shoppers.totalExits)
      : 342;

  const occupancyTrendPercent = metrics?.occupancyTrendPercent ?? shoppers?.entriesTrendPercent ?? 12;

  const dailyFootfall =
    typeof metrics?.dailyFootfall === "number"
      ? metrics.dailyFootfall
      : typeof shoppers?.totalEntries === "number"
      ? shoppers.totalEntries
      : 4281;

  const dailyFootfallTarget =
    typeof metrics?.dailyFootfallTarget === "number" ? metrics.dailyFootfallTarget : 5000;

  const activeAlertsCount =
    typeof metrics?.activeAlertsCount === "number"
      ? metrics.activeAlertsCount
      : effectiveAlerts.filter((a) => !a.isAcknowledged).length;

  const queueRisk =
    metrics?.queueRisk || queues?.predictedRisk || "High";

  const getAlertBadgeColor = (type: string) => {
    switch (type) {
      case "critical":
        return "bg-[#991B1B]/10 text-[#991B1B] border-[#991B1B]/20";
      case "warning":
        return "bg-[#B45309]/10 text-[#B45309] border-[#B45309]/20";
      default:
        return "bg-[#1E40AF]/10 text-[#1E40AF] border-[#1E40AF]/20";
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "critical":
        return "error";
      case "warning":
        return "warning";
      default:
        return "info";
    }
  };

  return (
    <div className="space-y-6">
      {/* 4 Primary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Current Occupancy */}
        <div className="bg-white border border-[#D9DDD8] rounded-lg p-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between text-[#58605b] mb-2">
              <span className="text-[12px] font-semibold uppercase tracking-wider">
                Current Occupancy
              </span>
              <span className="material-symbols-outlined text-[20px]">groups</span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-[36px] font-bold text-[#202522] tracking-tight leading-none">
                {currentOccupancy.toLocaleString()}
              </span>
              <span className="text-[12px] font-semibold text-[#166534] bg-[#166534]/10 px-1.5 py-0.5 rounded">
                +{occupancyTrendPercent}% vs last hr
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#D9DDD8]/60 flex items-center justify-between text-[11px] text-[#58605b]">
            <span>Store Capacity: 800 Max</span>
            <span className="font-medium">{((currentOccupancy / 800) * 100).toFixed(1)}% Full</span>
          </div>
        </div>

        {/* Metric 2: Daily Footfall */}
        <div className="bg-white border border-[#D9DDD8] rounded-lg p-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between text-[#58605b] mb-2">
              <span className="text-[12px] font-semibold uppercase tracking-wider">
                Daily Footfall
              </span>
              <span className="material-symbols-outlined text-[20px]">trending_up</span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-[36px] font-bold text-[#202522] tracking-tight leading-none">
                {dailyFootfall.toLocaleString()}
              </span>
              <span className="text-[12px] font-medium text-[#58605b]">
                / {dailyFootfallTarget.toLocaleString()} Target
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#D9DDD8]/60">
            <div className="w-full bg-[#edeeec] rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-[#202522] h-1.5 rounded-full"
                style={{ width: `${Math.min(100, (dailyFootfall / Math.max(1, dailyFootfallTarget)) * 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Metric 3: Active Alerts */}
        <div className="bg-white border border-[#D9DDD8] rounded-lg p-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between text-[#58605b] mb-2">
              <span className="text-[12px] font-semibold uppercase tracking-wider">
                Active Alerts
              </span>
              <span className="material-symbols-outlined text-[20px] text-[#991B1B]">notifications_active</span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-[36px] font-bold text-[#991B1B] tracking-tight leading-none">
                {activeAlertsCount}
              </span>
              <span className="text-[12px] font-semibold text-[#991B1B] bg-[#991B1B]/10 px-1.5 py-0.5 rounded">
                1 Critical
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#D9DDD8]/60 flex items-center justify-between text-[11px] text-[#58605b]">
            <span>1 Warning, 1 Info</span>
            <button
              onClick={() => handleNavigate("inventory")}
              className="text-[#202522] font-semibold hover:underline cursor-pointer"
            >
              Review all &rarr;
            </button>
          </div>
        </div>

        {/* Metric 4: Queue Risk */}
        <div className="bg-white border border-[#D9DDD8] rounded-lg p-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between text-[#58605b] mb-2">
              <span className="text-[12px] font-semibold uppercase tracking-wider">
                Queue Risk
              </span>
              <span className="material-symbols-outlined text-[20px] text-[#B45309]">hourglass_top</span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-[36px] font-bold text-[#B45309] tracking-tight leading-none">
                {String(queueRisk).toUpperCase()}
              </span>
              <span className="text-[12px] font-medium text-[#58605b]">
                Peak in 15m
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#D9DDD8]/60 flex items-center justify-between text-[11px]">
            <span className="text-[#58605b]">AI: Open Counter 4</span>
            <button
              onClick={() => handleNavigate("queues")}
              className="text-[#B45309] font-bold hover:underline cursor-pointer"
            >
              Take Action &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Alerts + Quick Actions & Zone Map */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Critical Alerts & Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Alerts Feed */}
          <div className="bg-white border border-[#D9DDD8] rounded-lg shadow-xs overflow-hidden">
            <div className="p-4 border-b border-[#D9DDD8] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="material-symbols-outlined text-[20px] text-[#202522]">warning</span>
                <h3 className="text-[14px] font-bold text-[#202522]">Recent Critical Alerts</h3>
              </div>
              <span className="text-[11px] text-[#58605b] font-medium">Real-time edge detections</span>
            </div>

            <div className="divide-y divide-[#D9DDD8]">
              {effectiveAlerts.length === 0 ? (
                <div className="p-6 text-center text-[12px] text-[#58605b]">
                  No active critical alerts detected across store zones.
                </div>
              ) : (
                effectiveAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 transition-colors ${alert.isAcknowledged ? "opacity-60 bg-[#fcfcfc]" : "hover:bg-[#f9faf8]"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start space-x-3">
                        <div
                          className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${getAlertBadgeColor(
                            alert.type
                          )}`}
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {getAlertIcon(alert.type)}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-[13px] font-bold text-[#202522]">{alert.title}</h4>
                            <span
                              className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${getAlertBadgeColor(
                                alert.type
                              )}`}
                            >
                              {alert.type}
                            </span>
                            <span className="text-[11px] font-medium text-[#58605b] bg-[#f9faf8] border border-[#D9DDD8] px-1.5 py-0.2 rounded">
                              {alert.zone}
                            </span>
                          </div>
                          <p className="text-[12px] text-[#58605b] mt-1 leading-relaxed">
                            {alert.description}
                          </p>
                          <div className="text-[11px] text-[#858d88] mt-1.5 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[14px]">schedule</span>
                            <span>{alert.timeAgo}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        {!alert.isAcknowledged ? (
                          <button
                            onClick={() => handleAck(alert.id)}
                            className="px-2.5 py-1 text-[12px] font-medium text-[#202522] bg-[#f9faf8] hover:bg-[#edeeec] border border-[#D9DDD8] rounded transition-colors cursor-pointer"
                          >
                            Acknowledge
                          </button>
                        ) : (
                          <span className="text-[11px] text-[#166534] font-medium flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">check</span> Acked
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Operations Actions Panel */}
          <div className="bg-white border border-[#D9DDD8] rounded-lg p-5 shadow-xs">
            <h3 className="text-[14px] font-bold text-[#202522] mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">bolt</span>
              Store Operations Quick Actions
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <button
                onClick={() => {
                  handleAction("open-counter");
                  handleNavigate("queues");
                }}
                className="p-3 bg-[#f9faf8] hover:bg-[#202522] hover:text-white border border-[#D9DDD8] rounded-md text-left transition-colors group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="material-symbols-outlined text-[18px] text-[#B45309] group-hover:text-white">
                    add_circle
                  </span>
                  <span className="text-[10px] font-mono uppercase bg-white group-hover:bg-[#333] px-1 rounded border border-[#D9DDD8] group-hover:border-transparent text-[#58605b] group-hover:text-white">
                    Queues
                  </span>
                </div>
                <div className="text-[13px] font-bold text-[#202522] group-hover:text-white">Open Counter 4</div>
                <div className="text-[11px] text-[#58605b] group-hover:text-gray-300">Resolve congestion spike</div>
              </button>

              <button
                onClick={() => {
                  handleAction("replenish-aisle-12");
                  handleNavigate("inventory");
                }}
                className="p-3 bg-[#f9faf8] hover:bg-[#202522] hover:text-white border border-[#D9DDD8] rounded-md text-left transition-colors group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="material-symbols-outlined text-[18px] text-[#1E40AF] group-hover:text-white">
                    inventory
                  </span>
                  <span className="text-[10px] font-mono uppercase bg-white group-hover:bg-[#333] px-1 rounded border border-[#D9DDD8] group-hover:border-transparent text-[#58605b] group-hover:text-white">
                    Stock
                  </span>
                </div>
                <div className="text-[13px] font-bold text-[#202522] group-hover:text-white">Restock Aisle 12</div>
                <div className="text-[11px] text-[#58605b] group-hover:text-gray-300">Dispatch backroom staff</div>
              </button>

              <button
                onClick={() => handleAction("dispatch-cleaner")}
                className="p-3 bg-[#f9faf8] hover:bg-[#202522] hover:text-white border border-[#D9DDD8] rounded-md text-left transition-colors group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="material-symbols-outlined text-[18px] text-[#166534] group-hover:text-white">
                    cleaning_services
                  </span>
                  <span className="text-[10px] font-mono uppercase bg-white group-hover:bg-[#333] px-1 rounded border border-[#D9DDD8] group-hover:border-transparent text-[#58605b] group-hover:text-white">
                    Safety
                  </span>
                </div>
                <div className="text-[13px] font-bold text-[#202522] group-hover:text-white">Dispatch Cleaning</div>
                <div className="text-[11px] text-[#58605b] group-hover:text-gray-300">Produce spill zone</div>
              </button>

              <button
                onClick={() => handleNavigate("camera")}
                className="p-3 bg-[#202522] text-white border border-[#202522] rounded-md text-left transition-colors hover:bg-black group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="material-symbols-outlined text-[18px] text-emerald-400">
                    center_focus_strong
                  </span>
                  <span className="text-[10px] font-mono uppercase bg-[#333] px-1 rounded text-emerald-300">
                    AI Vision
                  </span>
                </div>
                <div className="text-[13px] font-bold text-white">Live AI Vision</div>
                <div className="text-[11px] text-gray-300">Run phone/cam inference</div>
              </button>
            </div>
          </div>
        </div>

        {/* Right 1 Column: Floorplan Zone Map Mini-Overview */}
        <div className="space-y-6">
          <div className="bg-white border border-[#D9DDD8] rounded-lg p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-bold text-[#202522] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px]">map</span>
                Store Zone Map
              </h3>
              <button
                onClick={() => handleNavigate("shoppers")}
                className="text-[11px] font-semibold text-[#58605b] hover:text-[#202522] cursor-pointer"
              >
                Full Heatmap &rarr;
              </button>
            </div>

            {/* Interactive Blueprint Schematic SVG */}
            <div className="relative bg-[#f9faf8] border border-[#D9DDD8] rounded-md p-3 aspect-[4/3] flex flex-col justify-between">
              {/* Floorplan zones SVG layout */}
              <svg viewBox="0 0 400 300" className="w-full h-full">
                {/* Store Outline */}
                <rect x="10" y="10" width="380" height="280" fill="#fdfdfd" stroke="#D9DDD8" strokeWidth="2" rx="4" />
                
                {/* Entrance */}
                <rect x="160" y="280" width="80" height="10" fill="#166534" rx="2" />
                <text x="200" y="275" textAnchor="middle" fontSize="9" fill="#166534" fontWeight="600">
                  MAIN ENTRANCE
                </text>

                {/* Zone 1: Produce */}
                <g
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setSelectedZone("Produce")}
                >
                  <rect x="25" y="25" width="160" height="90" fill="#166534" fillOpacity="0.12" stroke="#166534" strokeWidth="1.5" strokeDasharray="3 2" rx="3" />
                  <text x="35" y="45" fontSize="11" fontWeight="700" fill="#166534">Fresh Produce</text>
                  <text x="35" y="60" fontSize="9" fill="#58605b">Occupancy: 84</text>
                  <circle cx="165" cy="42" r="4" fill="#166534" />
                </g>

                {/* Zone 2: Electronics */}
                <g
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setSelectedZone("Electronics")}
                >
                  <rect x="215" y="25" width="160" height="90" fill="#B45309" fillOpacity="0.12" stroke="#B45309" strokeWidth="1.5" rx="3" />
                  <text x="225" y="45" fontSize="11" fontWeight="700" fill="#B45309">Electronics</text>
                  <text x="225" y="60" fontSize="9" fill="#58605b">Occupancy: 89 (Dwell High)</text>
                  <circle cx="355" cy="42" r="4" fill="#B45309" className="animate-ping" />
                </g>

                {/* Zone 3: Grocery & Pantry */}
                <g
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setSelectedZone("Grocery")}
                >
                  <rect x="25" y="130" width="160" height="100" fill="#1E40AF" fillOpacity="0.1" stroke="#1E40AF" strokeWidth="1.5" rx="3" />
                  <text x="35" y="150" fontSize="11" fontWeight="700" fill="#1E40AF">Grocery & Pantry</text>
                  <text x="35" y="165" fontSize="9" fill="#58605b">Occupancy: 142</text>
                  <text x="35" y="180" fontSize="9" fill="#991B1B">Low Stock: Aisle 12</text>
                </g>

                {/* Zone 4: Apparel & Seasonal */}
                <g
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setSelectedZone("Apparel")}
                >
                  <rect x="215" y="130" width="160" height="100" fill="#58605b" fillOpacity="0.08" stroke="#58605b" strokeWidth="1.5" strokeDasharray="3 2" rx="3" />
                  <text x="225" y="150" fontSize="11" fontWeight="700" fill="#202522">Apparel & Seasonal</text>
                  <text x="225" y="165" fontSize="9" fill="#58605b">Occupancy: 45</text>
                </g>

                {/* Checkout Lane */}
                <g
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setSelectedZone("Checkout")}
                >
                  <rect x="25" y="245" width="120" height="30" fill="#991B1B" fillOpacity="0.15" stroke="#991B1B" strokeWidth="1.5" rx="2" />
                  <text x="85" y="263" textAnchor="middle" fontSize="10" fontWeight="700" fill="#991B1B">
                    Checkout: Congested
                  </text>
                </g>
              </svg>

              {/* Status footer for floorplan */}
              <div className="mt-2 pt-2 border-t border-[#D9DDD8] flex items-center justify-between text-[11px] text-[#58605b]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#166534]"></span>
                  <span>Produce</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#1E40AF]"></span>
                  <span>Grocery</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#B45309]"></span>
                  <span>Electronics</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#991B1B]"></span>
                  <span>Checkout</span>
                </div>
              </div>
            </div>

            {selectedZone && (
              <div className="mt-3 p-2.5 bg-[#f9faf8] border border-[#D9DDD8] rounded text-[12px] flex items-center justify-between">
                <div>
                  <span className="font-bold text-[#202522]">{selectedZone} Zone Selected</span>
                  <div className="text-[11px] text-[#58605b]">Cameras & Sensors operating at 60 FPS</div>
                </div>
                <button
                  onClick={() => handleNavigate("shoppers")}
                  className="px-2 py-1 bg-[#202522] text-white text-[11px] font-semibold rounded hover:bg-black cursor-pointer"
                >
                  View Details
                </button>
              </div>
            )}
          </div>

          {/* Edge Ingestion Telemetry Card */}
          <div className="bg-white border border-[#D9DDD8] rounded-lg p-4 shadow-xs space-y-3">
            <h4 className="text-[13px] font-bold text-[#202522] flex items-center justify-between">
              <span>Edge Telemetry Feed</span>
              <span className="text-[10px] font-mono text-[#166534] bg-[#166534]/10 px-1.5 py-0.5 rounded">
                LIVE 60Hz
              </span>
            </h4>

            <div className="space-y-2 text-[12px]">
              <div className="flex justify-between items-center py-1 border-b border-[#D9DDD8]/50">
                <span className="text-[#58605b]">Camera Ingress Rate</span>
                <span className="font-mono font-semibold text-[#202522]">1,240 frames/sec</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-[#D9DDD8]/50">
                <span className="text-[#58605b]">ESP32 IoT Heartbeats</span>
                <span className="font-mono font-semibold text-[#166534]">100% OK (38 nodes)</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-[#D9DDD8]/50">
                <span className="text-[#58605b]">Edge Inference Latency</span>
                <span className="font-mono font-semibold text-[#202522]">14.2 ms / frame</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-[#58605b]">Privacy Scrub Mode</span>
                <span className="font-mono font-semibold text-[#166534]">Active (No PII Stored)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
