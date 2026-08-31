import React from "react";
import { motion } from "motion/react";
import { TabType } from "../../types";

interface SideNavBarProps {
  currentTab?: TabType;
  activeTab?: TabType;
  onSelectTab: (tab: TabType) => void;
  activeAlertsCount?: number;
  activeAlertCount?: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  onOpenAiAdvisor?: () => void;
}

export const SideNavBar: React.FC<SideNavBarProps> = ({
  currentTab,
  activeTab,
  onSelectTab,
  activeAlertsCount = 0,
  activeAlertCount = 0,
  isOpenMobile = false,
  onCloseMobile,
  onOpenAiAdvisor,
}) => {
  const selectedTab = currentTab || activeTab || "overview";
  const totalAlerts = activeAlertsCount || activeAlertCount || 0;
  const navItems: { id: TabType; label: string; icon: string; badge?: number }[] = [
    { id: "overview", label: "Overview", icon: "dashboard" },
    { id: "shoppers", label: "Shoppers", icon: "group" },
    { id: "inventory", label: "Inventory", icon: "inventory_2" },
    { id: "queues", label: "Queues", icon: "hourglass_top" },
    { id: "analytics", label: "Analytics", icon: "analytics" },
    { id: "devices", label: "Devices", icon: "devices" },
    { id: "camera", label: "Edge AI Camera", icon: "videocam" },
    { id: "settings", label: "Settings", icon: "settings" },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        id="side-navigation-bar"
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-[#D9DDD8] flex flex-col justify-between transition-transform duration-200 ease-in-out ${
          isOpenMobile ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Top Header */}
        <div>
          <div className="p-5 border-b border-[#D9DDD8] flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 bg-[#202522] rounded-md flex items-center justify-center text-white">
                <span className="material-symbols-outlined text-[20px]">storefront</span>
              </div>
              <div>
                <h1 className="text-[14px] font-bold tracking-tight text-[#202522] uppercase">
                  Retail Intelligence
                </h1>
                <p className="text-[11px] text-[#58605b] font-medium">SIH-26179 • Edge Command</p>
              </div>
            </div>
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1 text-[#58605b] hover:text-[#202522]"
              aria-label="Close menu"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* Store Info Pill */}
          <div className="px-4 pt-4 pb-2">
            <div className="bg-[#f9faf8] border border-[#D9DDD8] rounded-md p-2.5 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-[#166534] animate-pulse"></span>
                <div>
                  <div className="text-[12px] font-bold text-[#202522]">Downtown Flagship</div>
                  <div className="text-[11px] text-[#58605b]">Store ID: 92841</div>
                </div>
              </div>
              <span className="text-[10px] font-semibold uppercase bg-white border border-[#D9DDD8] px-1.5 py-0.5 rounded text-[#58605b]">
                Live
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 relative">
            {navItems.map((item) => {
              const isActive = selectedTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-item-${item.id}`}
                  onClick={() => {
                    onSelectTab(item.id);
                    onCloseMobile?.();
                  }}
                  className={`relative w-full flex items-center justify-between px-3 py-2.5 rounded-md text-[13px] font-medium transition-colors cursor-pointer group ${
                    isActive
                      ? "text-white font-semibold"
                      : "text-[#58605b] hover:bg-[#f9faf8] hover:text-[#202522]"
                  }`}
                >
                  {/* Sliding active pill indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="activeSideNavIndicator"
                      className="absolute inset-0 bg-[#202522] rounded-md shadow-xs -z-0"
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 32,
                      }}
                    />
                  )}

                  <div className="relative z-10 flex items-center space-x-3">
                    <span
                      className={`material-symbols-outlined text-[20px] transition-colors duration-150 ${
                        isActive
                          ? "text-white fill"
                          : "text-[#58605b] group-hover:text-[#202522]"
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span className="tracking-tight">{item.label}</span>
                  </div>

                  <div className="relative z-10 flex items-center space-x-1.5">
                    {item.id === "overview" && totalAlerts > 0 && (
                      <span className="bg-[#991B1B] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-xs">
                        {totalAlerts}
                      </span>
                    )}

                    {item.id === "camera" && (
                      <span className="bg-[#166534] text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                        AI
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer / System Status */}
        <div className="p-4 border-t border-[#D9DDD8] bg-[#fdfdfd]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-[#166534]"></span>
              <span className="text-[11px] font-bold tracking-wider uppercase text-[#166534]">
                System Operational
              </span>
            </div>
            <span className="text-[11px] font-medium text-[#58605b]">42ms</span>
          </div>

          <div className="text-[11px] text-[#58605b] flex justify-between items-center">
            <span>Edge Nodes: 138/142</span>
            <span className="text-[#166534] font-medium">97.2%</span>
          </div>

          <div className="w-full bg-[#edeeec] rounded-full h-1.5 mt-1.5 overflow-hidden">
            <div className="bg-[#166534] h-1.5 rounded-full w-[97.2%]"></div>
          </div>
        </div>
      </aside>
    </>
  );
};
