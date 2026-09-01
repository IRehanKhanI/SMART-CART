import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { SideNavBar } from "./components/layout/SideNavBar";
import { TopAppBar } from "./components/layout/TopAppBar";
import { BottomTabBar } from "./components/layout/BottomTabBar";
import { OverviewView } from "./components/views/OverviewView";
import { ShoppersView } from "./components/views/ShoppersView";
import { InventoryView } from "./components/views/InventoryView";
import { QueuesView } from "./components/views/QueuesView";
import { AnalyticsView } from "./components/views/AnalyticsView";
import { DevicesView } from "./components/views/DevicesView";
import { SettingsView } from "./components/views/SettingsView";
import { EdgeCameraView } from "./components/views/EdgeCameraView";

import { ManualTaskModal } from "./components/modals/ManualTaskModal";
import { RegisterDeviceModal } from "./components/modals/RegisterDeviceModal";
import { AddZoneModal } from "./components/modals/AddZoneModal";
import { NotificationsDrawer } from "./components/modals/NotificationsDrawer";
import { AiAdvisorModal } from "./components/modals/AiAdvisorModal";

import {
  NavigationTab,
  StoreMetrics,
  CriticalAlert,
  ShopperMetrics,
  InventoryItem,
  LowStockAlert,
  ReplenishmentStats,
  QueueData,
  ReportItem,
  EdgeDevice,
  DeviceStats,
  StoreProfile,
  StoreZone,
  NotificationSettings,
  VisionAnalysisResult,
} from "./types";

const djangoApiBase = "http://127.0.0.1:8000";

export default function App() {
  const [activeTab, setActiveTab] = useState<NavigationTab>("overview");
  const [lastSyncTime, setLastSyncTime] = useState<string>("Just now");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Modals state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isAddZoneModalOpen, setIsAddZoneModalOpen] = useState(false);
  const [isNotificationsDrawerOpen, setIsNotificationsDrawerOpen] =
    useState(false);
  const [isAiAdvisorOpen, setIsAiAdvisorOpen] = useState(false);

  const [dataError, setDataError] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [metrics, setMetrics] = useState<StoreMetrics>({
    activeShoppers: 0,
    activeShoppersDiff: "No observations",
    avgDwellTime: "0m 0s",
    avgDwellDiff: "No observations",
    checkoutQueueAvg: "0.0",
    checkoutQueueDiff: "No observations",
    shelfStockoutRate: "0.0%",
    shelfStockoutDiff: "No inventory data",
  });
  const [alerts, setAlerts] = useState<CriticalAlert[]>([]);
  const [shoppersData, setShoppersData] = useState<ShopperMetrics>({
    totalEntries: 0,
    totalExits: 0,
    entriesTrendPercent: 0,
    avgDwellMinutes: 0,
    avgDwellSeconds: 0,
    checkoutQueueAvg: 0,
    hourlyTrend: [],
    weeklyTrend: [],
    zonePopularity: [],
  });
  const [criticalOOS, setCriticalOOS] = useState<
    Array<{ sku: string; name: string; location: string; oosDuration: string }>
  >([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlert[]>([]);
  const [tasksStats, setTasksStats] = useState<ReplenishmentStats>({
    urgentTasks: 0,
    inProgressTasks: 0,
    completedToday: 0,
  });
  const [shelfItems, setShelfItems] = useState<InventoryItem[]>([]);
  const [queueData, setQueueData] = useState<QueueData>({
    predictedRisk: "LOW",
    peakExpectedMinutes: 0,
    aiRecommendation: {
      title: "No queue observations",
      description: "Waiting for local camera events.",
      actionLabel: "Execute Recommendation",
      executed: false,
    },
    avgWaitTime: "0m 0s",
    avgWaitDiff: "No observations",
    avgServiceTime: "0m 0s",
    avgServiceDiff: "No observations",
    counters: [],
  });
  const [deviceStats, setDeviceStats] = useState<DeviceStats>({
    totalDevices: 0,
    onlineCount: 0,
    offlineCount: 0,
    avgProcessingDelayMs: 0,
  });
  const [deviceFleet, setDeviceFleet] = useState<EdgeDevice[]>([]);
  const [recentReports, setRecentReports] = useState<ReportItem[]>([]);
  const [zoneBreakdown, setZoneBreakdown] = useState<
    Array<{ name: string; visits: string; avgDwell: string; status: string }>
  >([]);
  const [heatmapGrid, setHeatmapGrid] = useState<number[][]>([]);
  const [storeProfile, setStoreProfile] = useState<StoreProfile>({
    storeName: "",
    storeId: "",
    managerName: "",
    address: "",
    city: "",
    zipCode: "",
    operatingHours: [],
  });
  const [storeZones, setStoreZones] = useState<StoreZone[]>([]);
  const [notificationSettings, setNotificationSettings] =
    useState<NotificationSettings>({
      queueThreshold: 0,
      inventoryThreshold: "",
      dwellAnomaliesEnabled: false,
    });

  // Fetch telemetry from server
  const fetchStoreData = async () => {
    try {
      const res = await fetch(`${djangoApiBase}/api/store/metrics`);
      if (!res.ok) {
        throw new Error(`Backend returned ${res.status}`);
      }
      const data = await res.json();
      setMetrics(data.metrics);
      setAlerts(data.alerts);
      setShoppersData(data.shoppers);
      setShelfItems(data.inventory.shelfItems);
      setCriticalOOS(data.inventory.criticalOOS);
      setLowStockAlerts(data.inventory.lowStockAlerts);
      setTasksStats(data.inventory.tasksStats);
      setQueueData(data.queues);
      setDeviceFleet(data.devices.fleet);
      setDeviceStats(data.devices.stats);
      setRecentReports(data.reports);
      setZoneBreakdown(data.zoneBreakdown);
      setStoreProfile(data.settings.profile);
      setStoreZones(data.settings.zones);
      setNotificationSettings(data.settings.notifications);
      const heatmapResponse = await fetch(`${djangoApiBase}/api/ai/heatmap/`);
      if (heatmapResponse.ok) {
        const heatmap = await heatmapResponse.json();
        setHeatmapGrid(heatmap.grid);
      }
      setDataError(null);
      setLastSyncTime(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    } catch (err) {
      console.error("Django backend unavailable:", err);
      setDataError(
        "Live store data is unavailable. Start the local Django backend and retry.",
      );
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    fetchStoreData();
    const timer = setInterval(fetchStoreData, 8000);
    return () => clearInterval(timer);
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchStoreData();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const mutateStore = async (path: string, options: RequestInit) => {
    try {
      const response = await fetch(`${djangoApiBase}${path}`, options);
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          error.detail || `Request failed with ${response.status}`,
        );
      }
      await fetchStoreData();
    } catch (err) {
      console.error(err);
      setDataError(
        err instanceof Error ? err.message : "The store action failed.",
      );
    }
  };

  const handleAcknowledgeAlert = async (id: string) => {
    await mutateStore("/api/store/alerts/acknowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alertId: id }),
    });
  };

  const handleDispatchItem = async (sku: string) => {
    await mutateStore("/api/store/inventory/dispatch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sku }),
    });
  };

  const handleToggleCounter = async (id: number) => {
    await mutateStore("/api/store/queues/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ counterId: id }),
    });
  };

  const handleExecuteAiRecommendation = async () => {
    await mutateStore("/api/store/queues/execute-recommendation", {
      method: "POST",
    });
  };

  const handleCreateManualTask = async (task: {
    title: string;
    location: string;
    priority: string;
    sku?: string;
  }) => {
    await mutateStore("/api/store/tasks/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(task),
    });
  };

  const handleRegisterDevice = async (device: {
    name: string;
    type: any;
    location: string;
  }) => {
    await mutateStore("/api/store/devices/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(device),
    });
  };

  const handleAddZone = async (zone: {
    name: string;
    type: string;
    sensorCount: number;
    statusColor?: string;
  }) => {
    await mutateStore("/api/store/zones/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(zone),
    });
  };

  const handleSaveSettings = async (newSettings: {
    profile: StoreProfile;
    zones: StoreZone[];
    notifications: NotificationSettings;
  }) => {
    await mutateStore("/api/store/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newSettings),
    });
  };

  const handleGenerateReport = async (config: any) => {
    await mutateStore("/api/store/reports/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
  };

  const handleSyncVisionData = (_result: VisionAnalysisResult) => {
    fetchStoreData();
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f9faf8] text-[#202522]">
      {/* Left Navigation Sidebar */}
      <SideNavBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        activeAlertCount={alerts.filter((a) => !a.isAcknowledged).length}
        onOpenAiAdvisor={() => setIsAiAdvisorOpen(true)}
        storeName={storeProfile.storeName}
        storeId={storeProfile.storeId}
        backendAvailable={!dataError && !isLoadingData}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main App Container */}
      <div className="flex flex-col flex-1 h-full min-w-0 overflow-hidden relative">
        {/* Top Header Bar */}
        <TopAppBar
          activeTab={activeTab}
          alertCount={alerts.filter((a) => !a.isAcknowledged).length}
          lastSyncTime={lastSyncTime}
          isRefreshing={isRefreshing}
          onRefresh={handleManualRefresh}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onOpenNotifications={() => setIsNotificationsDrawerOpen(true)}
          onOpenCopilot={() => setIsAiAdvisorOpen(true)}
          onOpenSettings={() => setActiveTab("settings")}
        />

        {/* Scrollable View Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8">
          <div className="max-w-7xl mx-auto">
            {dataError && (
              <div
                role="alert"
                className="mb-4 border border-[#991B1B]/30 bg-[#991B1B]/5 px-4 py-3 text-[13px] text-[#991B1B] rounded-md"
              >
                {dataError}
              </div>
            )}
            {isLoadingData && (
              <div className="mb-4 border border-[#D9DDD8] bg-white px-4 py-3 text-[13px] text-[#58605b] rounded-md">
                Loading live store observations...
              </div>
            )}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: "easeInOut" }}
              >
                {activeTab === "overview" && (
                  <OverviewView
                    metrics={metrics}
                    criticalAlerts={alerts}
                    shoppers={shoppersData}
                    inventory={shelfItems}
                    queues={queueData}
                    onSelectTab={setActiveTab}
                    onDispatchRestock={handleDispatchItem}
                    onAcknowledgeAlert={handleAcknowledgeAlert}
                  />
                )}

                {activeTab === "shoppers" && (
                  <ShoppersView data={shoppersData} heatmapGrid={heatmapGrid} />
                )}

                {activeTab === "inventory" && (
                  <InventoryView
                    criticalOOS={criticalOOS}
                    lowStockAlerts={lowStockAlerts}
                    tasksStats={tasksStats}
                    shelfItems={shelfItems}
                    onDispatchItem={handleDispatchItem}
                    onOpenManualTaskModal={() => setIsTaskModalOpen(true)}
                    onExportReport={() => setActiveTab("analytics")}
                  />
                )}

                {activeTab === "queues" && (
                  <QueuesView
                    data={queueData}
                    onToggleCounter={handleToggleCounter}
                    onExecuteRecommendation={handleExecuteAiRecommendation}
                  />
                )}

                {activeTab === "camera" && (
                  <EdgeCameraView onSyncVisionData={handleSyncVisionData} />
                )}

                {activeTab === "analytics" && (
                  <AnalyticsView
                    recentReports={recentReports}
                    weeklyTrend={shoppersData.weeklyTrend}
                    zoneBreakdown={zoneBreakdown}
                    inventory={shelfItems}
                    queues={queueData}
                    storeProfile={storeProfile}
                    onGenerateReport={handleGenerateReport}
                  />
                )}

                {activeTab === "devices" && (
                  <DevicesView
                    stats={deviceStats}
                    fleet={deviceFleet}
                    onOpenRegisterModal={() => setIsRegisterModalOpen(true)}
                  />
                )}

                {activeTab === "settings" && (
                  <SettingsView
                    profile={storeProfile}
                    zones={storeZones}
                    notifications={notificationSettings}
                    onSaveSettings={handleSaveSettings}
                    onOpenAddZoneModal={() => setIsAddZoneModalOpen(true)}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <BottomTabBar
          currentTab={activeTab}
          onSelectTab={setActiveTab}
          onOpenMoreMenu={() => setIsMobileMenuOpen(true)}
          activeAlertsCount={alerts.filter((a) => !a.isAcknowledged).length}
        />
      </div>

      {/* Modals & Slide-Overs */}
      <ManualTaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSubmit={handleCreateManualTask}
      />

      <RegisterDeviceModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onRegister={handleRegisterDevice}
      />

      <AddZoneModal
        isOpen={isAddZoneModalOpen}
        onClose={() => setIsAddZoneModalOpen(false)}
        onAddZone={handleAddZone}
      />

      <NotificationsDrawer
        isOpen={isNotificationsDrawerOpen}
        onClose={() => setIsNotificationsDrawerOpen(false)}
        alerts={alerts}
        onAcknowledgeAlert={handleAcknowledgeAlert}
      />

      <AiAdvisorModal
        isOpen={isAiAdvisorOpen}
        onClose={() => setIsAiAdvisorOpen(false)}
      />
    </div>
  );
}
