import React, { useState } from "react";
import { CriticalAlert } from "../../types";

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: CriticalAlert[];
  onAcknowledgeAlert: (id: string) => void;
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({
  isOpen,
  onClose,
  alerts,
  onAcknowledgeAlert,
}) => {
  const [filter, setFilter] = useState<"all" | "critical" | "warning" | "info">("all");

  if (!isOpen) return null;

  const filteredAlerts = alerts.filter((a) => (filter === "all" ? true : a.type === filter));

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white border-l border-[#D9DDD8] shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200">
          <div>
            {/* Header */}
            <div className="p-4 border-b border-[#D9DDD8] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="material-symbols-outlined text-[20px] text-[#202522]">notifications</span>
                <h3 className="text-[14px] font-bold text-[#202522]">Store Telemetry Alerts</h3>
              </div>
              <button
                onClick={onClose}
                className="p-1 text-[#58605b] hover:text-[#202522] rounded hover:bg-[#f9faf8]"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Filter Pills */}
            <div className="p-3 bg-[#f9faf8] border-b border-[#D9DDD8] flex items-center space-x-1.5 text-[11px]">
              {(["all", "critical", "warning", "info"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-2.5 py-1 rounded capitalize font-semibold transition-colors ${
                    filter === f ? "bg-[#202522] text-white" : "bg-white border border-[#D9DDD8] text-[#58605b]"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Alert List */}
            <div className="divide-y divide-[#D9DDD8] max-h-[calc(100vh-140px)] overflow-y-auto">
              {filteredAlerts.length === 0 ? (
                <div className="p-8 text-center text-[#58605b] text-[13px]">
                  No active {filter !== "all" ? filter : ""} alerts.
                </div>
              ) : (
                filteredAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 transition-colors ${
                      alert.isAcknowledged ? "opacity-60 bg-[#fcfcfc]" : "hover:bg-[#f9faf8]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                              alert.type === "critical"
                                ? "bg-[#991B1B]/10 text-[#991B1B]"
                                : alert.type === "warning"
                                ? "bg-[#B45309]/10 text-[#B45309]"
                                : "bg-[#1E40AF]/10 text-[#1E40AF]"
                            }`}
                          >
                            {alert.type}
                          </span>
                          <span className="text-[11px] font-medium text-[#58605b]">{alert.zone}</span>
                        </div>
                        <h4 className="text-[13px] font-bold text-[#202522] mt-1">{alert.title}</h4>
                        <p className="text-[12px] text-[#58605b] mt-1 leading-relaxed">
                          {alert.description}
                        </p>
                        <div className="text-[11px] text-[#858d88] mt-1.5">{alert.timeAgo}</div>
                      </div>

                      {!alert.isAcknowledged && (
                        <button
                          onClick={() => onAcknowledgeAlert(alert.id)}
                          className="px-2.5 py-1 text-[11px] font-bold text-[#202522] bg-white border border-[#D9DDD8] hover:bg-[#edeeec] rounded shrink-0"
                        >
                          Ack
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="p-3 border-t border-[#D9DDD8] bg-[#f9faf8] text-[11px] text-[#58605b] text-center">
            Sensor telemetry updates automatically every 5 seconds.
          </div>
        </div>
      </div>
    </div>
  );
};
