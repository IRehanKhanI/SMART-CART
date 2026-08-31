import React, { useState } from "react";
import { EdgeDevice, DeviceStats } from "../../types";

interface DevicesViewProps {
  stats: DeviceStats;
  fleet: EdgeDevice[];
  onOpenRegisterModal: () => void;
}

export const DevicesView: React.FC<DevicesViewProps> = ({
  stats,
  fleet,
  onOpenRegisterModal,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pingingId, setPingingId] = useState<string | null>(null);
  const [pingResult, setPingResult] = useState<{ id: string; ms: number } | null>(null);

  const filteredFleet = fleet.filter((device) => {
    const matchesSearch =
      device.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || device.type.toLowerCase().includes(typeFilter.toLowerCase());
    const matchesStatus = statusFilter === "all" || device.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesType && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Online":
        return "bg-[#166534]/10 text-[#166534] border-[#166534]/20";
      case "Syncing":
        return "bg-[#1E40AF]/10 text-[#1E40AF] border-[#1E40AF]/20";
      case "Local Mode":
        return "bg-[#B45309]/10 text-[#B45309] border-[#B45309]/20";
      case "Offline":
        return "bg-[#991B1B]/10 text-[#991B1B] border-[#991B1B]/20";
      default:
        return "bg-[#58605b]/10 text-[#58605b] border-[#58605b]/20";
    }
  };

  const [restartingId, setRestartingId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const handlePing = (id: string) => {
    setPingingId(id);
    setTimeout(() => {
      setPingingId(null);
      setPingResult({ id, ms: Math.floor(12 + Math.random() * 25) });
      setTimeout(() => setPingResult(null), 3000);
    }, 600);
  };

  const handleRestart = (id: string) => {
    setRestartingId(id);
    setActionFeedback(`Reboot signal dispatched to edge device ${id}. Telemetry recovering...`);
    setTimeout(() => {
      setRestartingId(null);
      setTimeout(() => setActionFeedback(null), 3500);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* 4 Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#D9DDD8] rounded-lg p-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between text-[#58605b] mb-2">
              <span className="text-[12px] font-semibold uppercase tracking-wider">
                Total Devices
              </span>
              <span className="material-symbols-outlined text-[20px]">devices</span>
            </div>
            <div className="text-[36px] font-bold text-[#202522] tracking-tight leading-none font-mono">
              {stats.totalDevices}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#D9DDD8]/60 text-[11px] text-[#58605b]">
            Cameras, ESP32 sensors & edge nodes
          </div>
        </div>

        <div className="bg-white border border-[#D9DDD8] rounded-lg p-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between text-[#58605b] mb-2">
              <span className="text-[12px] font-semibold uppercase tracking-wider">
                Online & Synced
              </span>
              <span className="material-symbols-outlined text-[20px] text-[#166534]">sensors</span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-[36px] font-bold text-[#166534] tracking-tight leading-none font-mono">
                {stats.onlineCount}
              </span>
              <span className="text-[12px] font-semibold text-[#166534] bg-[#166534]/10 px-1.5 py-0.5 rounded">
                97.2% Fleet Health
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#D9DDD8]/60 text-[11px] text-[#58605b]">
            Heartbeat Interval: 5 seconds
          </div>
        </div>

        <div className="bg-white border border-[#D9DDD8] rounded-lg p-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between text-[#58605b] mb-2">
              <span className="text-[12px] font-semibold uppercase tracking-wider">
                Offline / Issues
              </span>
              <span className="material-symbols-outlined text-[20px] text-[#991B1B]">error</span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-[36px] font-bold text-[#991B1B] tracking-tight leading-none font-mono">
                {stats.offlineCount}
              </span>
              <span className="text-[12px] font-semibold text-[#991B1B] bg-[#991B1B]/10 px-1.5 py-0.5 rounded">
                1 Requires Inspection
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#D9DDD8]/60 text-[11px] text-[#58605b]">
            CAM-CHK-03 disconnected
          </div>
        </div>

        <div className="bg-white border border-[#D9DDD8] rounded-lg p-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between text-[#58605b] mb-2">
              <span className="text-[12px] font-semibold uppercase tracking-wider">
                Avg Processing Delay
              </span>
              <span className="material-symbols-outlined text-[20px]">speed</span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-[36px] font-bold text-[#202522] tracking-tight leading-none font-mono">
                {stats.avgProcessingDelayMs}
              </span>
              <span className="text-[14px] font-bold text-[#58605b]">ms</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#D9DDD8]/60 text-[11px] text-[#166534] font-medium">
            Ultra-low edge AI execution
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {actionFeedback && (
        <div className="p-3 bg-[#166534]/10 text-[#166534] text-[12px] font-semibold rounded-md border border-[#166534]/20 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Main Table: Edge Fleet Status */}
      <div className="bg-white border border-[#D9DDD8] rounded-lg shadow-xs overflow-hidden">
        {/* Table Controls */}
        <div className="p-4 border-b border-[#D9DDD8] flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-[14px] font-bold text-[#202522]">Edge Fleet Device Status</h3>
            <p className="text-[12px] text-[#58605b]">
              Local IoT hardware telemetry and remote gateway management
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[#58605b] text-[16px]">
                search
              </span>
              <input
                type="text"
                placeholder="Search device ID or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#f9faf8] border border-[#D9DDD8] rounded-md pl-8 pr-3 py-1.5 text-[12px] text-[#202522] placeholder-[#58605b] focus:outline-none focus:border-[#202522]"
              />
            </div>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-[#f9faf8] border border-[#D9DDD8] rounded-md px-2.5 py-1.5 text-[12px] text-[#202522] focus:outline-none focus:border-[#202522]"
            >
              <option value="all">All Hardware Types</option>
              <option value="Camera">AI Cameras</option>
              <option value="ESP32">ESP32 Sensors</option>
              <option value="Compute">Edge Compute Nodes</option>
            </select>

            {/* Register Device Button */}
            <button
              id="register-device-btn"
              onClick={onOpenRegisterModal}
              className="px-3 py-1.5 bg-[#202522] hover:bg-black text-white text-[12px] font-semibold rounded-md transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              Register Device
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-[#f9faf8] border-b border-[#D9DDD8] text-[11px] uppercase tracking-wider text-[#58605b] font-bold">
              <tr>
                <th className="py-2.5 px-4">Device ID</th>
                <th className="py-2.5 px-4">Friendly Name & Location</th>
                <th className="py-2.5 px-4">Type</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">CPU / Temp</th>
                <th className="py-2.5 px-4">Signal / Comms</th>
                <th className="py-2.5 px-4">Heartbeat</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D9DDD8]">
              {filteredFleet.map((device) => {
                const isPinged = pingResult?.id === device.id;
                const isPinging = pingingId === device.id;

                return (
                  <tr key={device.id} className="hover:bg-[#f9faf8] transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#202522]">
                      {device.id}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#202522]">{device.name}</div>
                      <div className="text-[11px] text-[#58605b]">{device.location}</div>
                    </td>
                    <td className="py-3.5 px-4 text-[#58605b] font-medium">
                      {device.type}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded border ${getStatusBadge(
                          device.status
                        )}`}
                      >
                        {device.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[12px]">
                      {device.cpuPercent !== undefined ? (
                        <span>
                          <span className={device.cpuPercent > 80 ? "text-[#991B1B] font-bold" : "text-[#202522]"}>
                            {device.cpuPercent}%
                          </span>{" "}
                          • <span className="text-[#58605b]">{device.tempCelsius}°C</span>
                        </span>
                      ) : (
                        <span className="text-[#58605b]">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[12px] text-[#58605b]">
                      {device.signalDbm}
                    </td>
                    <td className="py-3.5 px-4 text-[12px] text-[#58605b]">
                      {device.lastHeartbeat}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => handlePing(device.id)}
                          disabled={isPinging || device.status === "Offline"}
                          className="px-2 py-1 text-[11px] font-semibold text-[#202522] bg-[#f9faf8] hover:bg-[#edeeec] border border-[#D9DDD8] rounded transition-colors disabled:opacity-40"
                          title="Ping Test"
                        >
                          {isPinging ? "..." : isPinged ? `${pingResult.ms}ms` : "Ping"}
                        </button>
                        <button
                          onClick={() => handleRestart(device.id)}
                          className="p-1 text-[#58605b] hover:text-[#202522] rounded hover:bg-[#edeeec]"
                          title="Restart Node"
                        >
                          <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                        </button>
                      </div>
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
