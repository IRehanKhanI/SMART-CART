import React, { useState, useEffect } from "react";
import { TabType } from "../../types";

interface TopAppBarProps {
  currentTab?: TabType;
  activeTab?: TabType;
  onOpenMobileMenu?: () => void;
  onOpenAlerts?: () => void;
  onOpenNotifications?: () => void;
  onOpenCopilot?: () => void;
  onOpenSettings?: () => void;
  activeAlertsCount?: number;
  alertCount?: number;
  lastSyncTime?: string;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  onSearchQuery?: (q: string) => void;
}

export const TopAppBar: React.FC<TopAppBarProps> = ({
  currentTab,
  activeTab,
  onOpenMobileMenu,
  onOpenAlerts,
  onOpenNotifications,
  onOpenCopilot,
  onOpenSettings,
  activeAlertsCount = 0,
  alertCount = 0,
  lastSyncTime = "",
  isRefreshing = false,
  onRefresh,
  onSearchQuery,
}) => {
  const selectedTab = currentTab || activeTab || "overview";
  const totalAlerts = activeAlertsCount || alertCount || 0;
  const handleAlertsClick = onOpenAlerts || onOpenNotifications || (() => {});
  const [currentTime, setCurrentTime] = useState("");
  const [searchVal, setSearchVal] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setCurrentTime(
        d.toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const tabTitles: Record<TabType, { title: string; subtitle: string }> = {
    overview: {
      title: "Command Center Overview",
      subtitle: "Real-time edge telemetry and store operational summary",
    },
    cart: {
      title: "Smart Cart & AI Recommendation Command",
      subtitle: "ESP32-CAM vision scanning, 1.3\" OLED telemetry & customer membership",
    },
    shoppers: {
      title: "Shopper Analytics",
      subtitle: "Footfall trend, dwell duration and zone heatmaps",
    },
    inventory: {
      title: "Inventory & Shelf Intelligence",
      subtitle: "Out-of-stock monitoring and automated replenishment",
    },
    queues: {
      title: "Queue & Checkout Intelligence",
      subtitle: "Predictive congestion risk and counter allocation",
    },
    analytics: {
      title: "Reports & Performance Audit",
      subtitle: "Custom telemetry analysis and operational export",
    },
    devices: {
      title: "Edge Fleet & IoT Devices",
      subtitle: "AI cameras, ESP32 sensors and edge gateway status",
    },
    camera: {
      title: "Edge AI Live Vision Engine",
      subtitle: "Computer vision inference on replaceable camera feeds",
    },
    settings: {
      title: "Store & Zone Configuration",
      subtitle: "Profile, operational hours and alert threshold parameters",
    },
  };

  const currentInfo = tabTitles[selectedTab] || {
    title: "Retail Operations Command",
    subtitle: "SIH-26179",
  };

  return (
    <header
      id="top-app-bar"
      className="bg-white border-b border-[#D9DDD8] sticky top-0 z-30 px-4 lg:px-6 py-3.5 flex items-center justify-between"
    >
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-1.5 text-[#58605b] hover:text-[#202522] rounded-md hover:bg-[#f9faf8] cursor-pointer"
          aria-label="Open menu"
        >
          <span className="material-symbols-outlined text-[24px]">menu</span>
        </button>

        <div>
          <h2 className="text-[16px] font-bold text-[#202522] tracking-tight flex items-center gap-2">
            {currentInfo.title}
          </h2>
          <p className="text-[12px] text-[#58605b] hidden sm:block">
            {currentInfo.subtitle}
          </p>
        </div>
      </div>

      {/* Center/Right Actions */}
      <div className="flex items-center space-x-2.5 sm:space-x-4">
        {/* Search Box */}
        <div className="relative hidden md:block w-56 lg:w-72">
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[#58605b] text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder="Search SKUs, zones, devices..."
            value={searchVal}
            onChange={(e) => {
              setSearchVal(e.target.value);
              onSearchQuery?.(e.target.value);
            }}
            className="w-full bg-[#f9faf8] border border-[#D9DDD8] rounded-md pl-9 pr-8 py-1.5 text-[13px] text-[#202522] placeholder-[#58605b] focus:outline-none focus:border-[#202522] transition-colors"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#58605b] bg-white border border-[#D9DDD8] px-1 rounded">
            ⌘K
          </kbd>
        </div>

        {/* Sync Status Badge / Refresh */}
        <button
          onClick={onRefresh}
          className={`hidden sm:flex items-center space-x-2 bg-[#f9faf8] hover:bg-[#edeeec] border border-[#D9DDD8] px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
            isRefreshing ? "opacity-70" : ""
          }`}
          title="Click to refresh telemetry"
        >
          <span
            className={`w-2 h-2 rounded-full bg-[#166534] ${isRefreshing ? "animate-spin" : "animate-pulse"}`}
          ></span>
          <span className="text-[11px] font-medium text-[#58605b]">
            SYNC:{" "}
            <span className="font-semibold text-[#202522]">
              {lastSyncTime || currentTime}
            </span>
          </span>
        </button>

        {/* AI Copilot Advisor Button */}
        <button
          id="copilot-advisor-btn"
          onClick={onOpenCopilot}
          className="flex items-center space-x-1.5 bg-[#f9faf8] hover:bg-[#edeeec] border border-[#D9DDD8] text-[#202522] px-2.5 py-1.5 rounded-md text-[12px] font-semibold transition-colors cursor-pointer"
          title="AI Retail Operations Advisor"
        >
          <span className="material-symbols-outlined text-[16px] text-[#166534]">
            smart_toy
          </span>
          <span className="hidden sm:inline">AI Advisor</span>
        </button>

        {/* Notifications Bell */}
        <button
          id="notifications-bell-btn"
          onClick={handleAlertsClick}
          className="relative p-1.5 text-[#58605b] hover:text-[#202522] hover:bg-[#f9faf8] rounded-md transition-colors cursor-pointer"
          aria-label="View alerts"
        >
          <span className="material-symbols-outlined text-[22px]">
            notifications
          </span>
          {totalAlerts > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-[#991B1B] text-white text-[9px] font-bold flex items-center justify-center rounded-full">
              {totalAlerts}
            </span>
          )}
        </button>

        {/* User Profile Chip */}
        <div
          onClick={onOpenSettings}
          className="flex items-center space-x-2 pl-2 border-l border-[#D9DDD8] cursor-pointer hover:opacity-80 transition-opacity"
          title="Store Settings & Profile"
        >
          <div className="w-8 h-8 rounded-full bg-[#202522] text-white flex items-center justify-center text-[12px] font-bold">
            SM
          </div>
          <div className="hidden xl:block text-left">
            <div className="text-[12px] font-bold text-[#202522] leading-tight">
              Store Manager
            </div>
            <div className="text-[10px] text-[#58605b]">
              Local operations user
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
