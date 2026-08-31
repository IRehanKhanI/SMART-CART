import React from "react";
import { motion } from "motion/react";
import { TabType } from "../../types";

interface BottomTabBarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  onOpenMoreMenu: () => void;
  activeAlertsCount: number;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  currentTab,
  onSelectTab,
  onOpenMoreMenu,
  activeAlertsCount,
}) => {
  const mainTabs: { id: TabType; label: string; icon: string; isAi?: boolean }[] = [
    { id: "overview", label: "Overview", icon: "dashboard" },
    { id: "shoppers", label: "Shoppers", icon: "group" },
    { id: "queues", label: "Queues", icon: "hourglass_top" },
    { id: "inventory", label: "Inventory", icon: "inventory_2" },
    { id: "camera", label: "AI Vision", icon: "videocam", isAi: true },
  ];

  const isMoreActive = ["analytics", "devices", "settings"].includes(currentTab);

  return (
    <nav
      id="mobile-bottom-navigation"
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#D9DDD8] shadow-[0_-4px_16px_rgba(0,0,0,0.06)] lg:hidden safe-area-bottom"
    >
      <div className="flex items-center justify-around px-2 py-1.5 max-w-lg mx-auto">
        {mainTabs.map((tab) => {
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              id={`bottom-tab-${tab.id}`}
              onClick={() => onSelectTab(tab.id)}
              className="relative flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-lg transition-colors cursor-pointer group min-h-[52px]"
            >
              {/* Animated active pill background */}
              {isActive && (
                <motion.div
                  layoutId="activeBottomNavIndicator"
                  className="absolute inset-0 bg-[#202522] rounded-lg -z-0"
                  transition={{ type: "spring", stiffness: 450, damping: 32 }}
                />
              )}

              <div className="relative z-10 flex flex-col items-center">
                <div className="relative flex items-center justify-center">
                  <span
                    className={`material-symbols-outlined text-[20px] transition-transform duration-200 ${
                      isActive
                        ? "text-white scale-110"
                        : "text-[#58605b] group-hover:text-[#202522]"
                    }`}
                  >
                    {tab.icon}
                  </span>

                  {/* Overview Alert Badge */}
                  {tab.id === "overview" && activeAlertsCount > 0 && (
                    <span
                      className={`absolute -top-1 -right-2.5 w-4 h-4 text-[9px] font-bold flex items-center justify-center rounded-full ${
                        isActive
                          ? "bg-red-400 text-black border border-white"
                          : "bg-[#991B1B] text-white"
                      }`}
                    >
                      {activeAlertsCount}
                    </span>
                  )}

                  {/* AI Pill Badge */}
                  {tab.isAi && !isActive && (
                    <span className="absolute -top-1.5 -right-3 bg-[#166534] text-white text-[8px] font-bold px-1 rounded">
                      AI
                    </span>
                  )}
                </div>

                <span
                  className={`text-[10px] font-medium mt-0.5 tracking-tight transition-colors ${
                    isActive
                      ? "text-white font-bold"
                      : "text-[#58605b] group-hover:text-[#202522]"
                  }`}
                >
                  {tab.label}
                </span>
              </div>
            </button>
          );
        })}

        {/* More Menu Trigger */}
        <button
          id="bottom-tab-more"
          onClick={onOpenMoreMenu}
          className="relative flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-lg transition-colors cursor-pointer group min-h-[52px]"
          title="More tools (Devices, Analytics, Settings)"
        >
          {isMoreActive && (
            <motion.div
              layoutId="activeBottomNavIndicator"
              className="absolute inset-0 bg-[#202522] rounded-lg -z-0"
              transition={{ type: "spring", stiffness: 450, damping: 32 }}
            />
          )}
          <div className="relative z-10 flex flex-col items-center">
            <span
              className={`material-symbols-outlined text-[20px] transition-transform duration-200 ${
                isMoreActive
                  ? "text-white scale-110"
                  : "text-[#58605b] group-hover:text-[#202522]"
              }`}
            >
              more_horiz
            </span>
            <span
              className={`text-[10px] font-medium mt-0.5 tracking-tight transition-colors ${
                isMoreActive
                  ? "text-white font-bold"
                  : "text-[#58605b] group-hover:text-[#202522]"
              }`}
            >
              {isMoreActive ? currentTab.charAt(0).toUpperCase() + currentTab.slice(1) : "More"}
            </span>
          </div>
        </button>
      </div>
    </nav>
  );
};
