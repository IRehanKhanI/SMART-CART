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

  // Store telemetry state
  const [metrics, setMetrics] = useState<StoreMetrics>({
    activeShoppers: 342,
    activeShoppersDiff: "+14% vs avg",
    avgDwellTime: "24m 18s",
    avgDwellDiff: "-2m vs bench",
    checkoutQueueAvg: "3.4",
    checkoutQueueDiff: "+0.8 vs bench",
    shelfStockoutRate: "1.2%",
    shelfStockoutDiff: "-0.4% vs bench",
  });

  const [alerts, setAlerts] = useState<CriticalAlert[]>([
    {
      id: "alert-1",
      title: "Self-Checkout Queue Length Exceeded",
      description:
        "6+ customers waiting in Lane 2. Automatic recommendation: Open Counter 4.",
      timeAgo: "2 mins ago",
      type: "critical",
      zone: "Checkout West",
      isAcknowledged: false,
    },
    {
      id: "alert-2",
      title: "Produce Shelf Stockout Imminent",
      description:
        "Organic Avocados facing capacity below 15%. Restock dispatched.",
      timeAgo: "14 mins ago",
      type: "warning",
      zone: "Produce Section",
      isAcknowledged: false,
    },
    {
      id: "alert-3",
      title: "Electronics High Dwell Alert",
      description:
        "Average customer dwell duration reached 28.4 mins in OLED TV aisle.",
      timeAgo: "32 mins ago",
      type: "info",
      zone: "Electronics",
      isAcknowledged: true,
    },
  ]);

  const [shoppersData, setShoppersData] = useState<ShopperMetrics>({
    totalEntries: 4281,
    totalExits: 3904,
    entriesTrendPercent: 12,
    avgDwellMinutes: 24,
    avgDwellSeconds: 18,
    checkoutQueueAvg: 3.4,
    hourlyTrend: [
      { time: "08:00", count: 120 },
      { time: "10:00", count: 480 },
      { time: "12:00", count: 320 },
      { time: "14:00", count: 650 },
      { time: "16:00", count: 820 },
      { time: "Now", count: 910 },
    ],
    weeklyTrend: [
      { day: "Mon", count: 3200 },
      { day: "Tue", count: 3450 },
      { day: "Wed", count: 3100 },
      { day: "Thu", count: 3800 },
      { day: "Fri", count: 4900 },
      { day: "Sat", count: 5400 },
      { day: "Sun", count: 4100 },
    ],
    zonePopularity: [
      {
        id: 1,
        zone: "Grocery",
        activeCount: 142,
        avgDwellMinutes: 15.2,
        statusColor: "info",
      },
      {
        id: 2,
        zone: "Electronics",
        activeCount: 89,
        avgDwellMinutes: 28.4,
        statusColor: "warning",
      },
      {
        id: 3,
        zone: "Household",
        activeCount: 76,
        avgDwellMinutes: 12.1,
        statusColor: "tint",
      },
      {
        id: 4,
        zone: "Apparel",
        activeCount: 45,
        avgDwellMinutes: 18.5,
        statusColor: "dim",
      },
      {
        id: 5,
        zone: "Checkout",
        activeCount: 25,
        avgDwellMinutes: 3.4,
        statusColor: "error",
      },
    ],
  });

  const [criticalOOS, setCriticalOOS] = useState([
    {
      sku: "849201",
      name: "Organic Almond Milk, 1L",
      location: "Aisle 4, Dairy",
      oosDuration: "OOS - 2hrs",
    },
    {
      sku: "291044",
      name: "Premium Paper Towels, 6pk",
      location: "Aisle 9, Household",
      oosDuration: "OOS - 45m",
    },
    {
      sku: "637281",
      name: "Avocados, Large Hass",
      location: "Produce, Bin 3",
      oosDuration: "OOS - 15m",
    },
  ]);

  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlert[]>([
    {
      sku: "482019",
      name: "Sparkling Water, Lemon 12pk",
      remainingUnits: 3,
      threshold: 10,
      icon: "local_drink",
    },
    {
      sku: "119284",
      name: "Sourdough Bread Loaf",
      remainingUnits: 1,
      threshold: 5,
      icon: "bakery_dining",
    },
    {
      sku: "938201",
      name: "Free Range Eggs, Dozen",
      remainingUnits: 5,
      threshold: 15,
      icon: "egg",
    },
  ]);

  const [tasksStats, setTasksStats] = useState<ReplenishmentStats>({
    urgentTasks: 12,
    inProgressTasks: 8,
    completedToday: 45,
  });

  const [shelfItems, setShelfItems] = useState<InventoryItem[]>([
    {
      sku: "849201",
      name: "Organic Almond Milk, 1L",
      category: "Dairy",
      location: "Aisle 4, Shelf 2",
      currentStock: 0,
      maxStock: 50,
      status: "Out of Stock",
    },
    {
      sku: "291044",
      name: "Premium Paper Towels, 6pk",
      category: "Household",
      location: "Aisle 9, Pallet B",
      currentStock: 0,
      maxStock: 30,
      status: "Out of Stock",
    },
    {
      sku: "637281",
      name: "Avocados, Large Hass",
      category: "Pantry",
      location: "Produce, Bin 3",
      currentStock: 2,
      maxStock: 40,
      status: "Low Stock",
    },
    {
      sku: "482019",
      name: "Sparkling Water, Lemon 12pk",
      category: "Beverages",
      location: "Aisle 2, Shelf 1",
      currentStock: 3,
      maxStock: 20,
      status: "Low Stock",
    },
    {
      sku: "119284",
      name: "Sourdough Bread Loaf",
      category: "Pantry",
      location: "Bakery, Rack 1",
      currentStock: 1,
      maxStock: 15,
      status: "Low Stock",
    },
    {
      sku: "772819",
      name: "Whole Grain Rolled Oats, 1kg",
      category: "Pantry",
      location: "Aisle 3, Shelf 4",
      currentStock: 42,
      maxStock: 45,
      status: "Optimal",
    },
    {
      sku: "992812",
      name: "Cold Pressed Orange Juice, 1L",
      category: "Beverages",
      location: "Chiller 2, Shelf 1",
      currentStock: 28,
      maxStock: 30,
      status: "Optimal",
    },
    {
      sku: "551920",
      name: "Extra Virgin Olive Oil, 750ml",
      category: "Pantry",
      location: "Aisle 5, Shelf 3",
      currentStock: 35,
      maxStock: 40,
      status: "Optimal",
    },
  ]);

  const [queueData, setQueueData] = useState<QueueData>({
    predictedRisk: "HIGH",
    peakExpectedMinutes: 15,
    aiRecommendation: {
      title: "Open Counter 4",
      description:
        "Opening Counter 4 immediately will normalize queue wait times from 8.7m to <4m within 8 minutes.",
      actionLabel: "Execute Recommendation",
      executed: false,
    },
    avgWaitTime: "8m 42s",
    avgWaitDiff: "+2m vs avg",
    avgServiceTime: "3m 15s",
    avgServiceDiff: "-10s vs avg",
    counters: [
      {
        id: 1,
        name: "Self-Checkout 1",
        type: "Self-Service",
        queueLength: 2,
        capacity: 8,
        estWaitMins: 4,
        status: "Normal",
      },
      {
        id: 2,
        name: "Standard Lane 2",
        type: "Assisted",
        queueLength: 8,
        capacity: 8,
        estWaitMins: 15,
        status: "Congested",
      },
      {
        id: 3,
        name: "Express Lane 3",
        type: "Basket Only",
        queueLength: 5,
        capacity: 8,
        estWaitMins: 10,
        status: "Elevated",
      },
      {
        id: 4,
        name: "Standard Lane 4",
        type: "Assisted",
        queueLength: 0,
        capacity: 8,
        estWaitMins: 0,
        status: "Offline",
      },
    ],
  });

  const [deviceStats, setDeviceStats] = useState<DeviceStats>({
    totalDevices: 142,
    onlineCount: 138,
    offlineCount: 4,
    avgProcessingDelayMs: 42,
  });

  const [deviceFleet, setDeviceFleet] = useState<EdgeDevice[]>([
    {
      id: "CAM-ENT-01",
      name: "Main Ingress Gate Cam 01",
      location: "Entrance Turnstiles",
      type: "AI Camera (4K)",
      status: "Online",
      cpuPercent: 32,
      tempCelsius: 44,
      signalDbm: "-42 dBm",
      lastHeartbeat: "Just now",
    },
    {
      id: "CAM-CHK-02",
      name: "Checkout Line Tracker 02",
      location: "Lane 1-4 Overhead",
      type: "AI Camera (4K)",
      status: "Online",
      cpuPercent: 48,
      tempCelsius: 51,
      signalDbm: "-38 dBm",
      lastHeartbeat: "Just now",
    },
    {
      id: "SNS-TH-GRC-04",
      name: "Chiller Temperature/Optical Array",
      location: "Dairy & Produce Wall",
      type: "IoT Sensor (ESP32)",
      status: "Online",
      signalDbm: "-55 dBm",
      lastHeartbeat: "1s ago",
    },
    {
      id: "EDG-NODE-B1",
      name: "Backroom Inference Server A",
      location: "Edge Rack Room 1",
      type: "Edge Compute Node",
      status: "Online",
      cpuPercent: 64,
      tempCelsius: 58,
      signalDbm: "LAN (10GbE)",
      lastHeartbeat: "Just now",
    },
    {
      id: "CAM-CHK-03",
      name: "Checkout Aux Cam 03",
      location: "Express Lane 5",
      type: "AI Camera (1080p)",
      status: "Offline",
      signalDbm: "Disconnected",
      lastHeartbeat: "14m ago",
    },
  ]);

  const [recentReports, setRecentReports] = useState<ReportItem[]>([
    {
      id: "1",
      filename: "Weekly Footfall & Conversion.pdf",
      dateStr: "Oct 7, 09:41 AM",
      fileSize: "2.4 MB",
      type: "PDF",
    },
    {
      id: "2",
      filename: "Q3 Inventory Depletion Audit.csv",
      dateStr: "Oct 5, 14:22 PM",
      fileSize: "840 KB",
      type: "CSV",
    },
    {
      id: "3",
      filename: "Peak Queue Telemetry Log.pdf",
      dateStr: "Oct 2, 11:05 AM",
      fileSize: "1.1 MB",
      type: "PDF",
    },
    {
      id: "4",
      filename: "Shelf Stockout Root Cause Analysis.pdf",
      dateStr: "Sep 28, 16:30 PM",
      fileSize: "3.2 MB",
      type: "PDF",
    },
  ]);

  const [storeProfile, setStoreProfile] = useState<StoreProfile>({
    storeName: "Downtown Flagship #042",
    storeId: "92841",
    managerName: "Store Operations Team",
    address: "1200 Retail Ave, Innovation District",
    city: "Metropolis",
    zipCode: "90210",
    operatingHours: [
      { day: "Monday", open: "08:00", close: "22:00" },
      { day: "Tuesday", open: "08:00", close: "22:00" },
      { day: "Wednesday", open: "08:00", close: "22:00" },
      { day: "Thursday", open: "08:00", close: "22:00" },
      { day: "Friday", open: "08:00", close: "23:00" },
      { day: "Saturday", open: "08:00", close: "23:00" },
      { day: "Sunday", open: "09:00", close: "20:00" },
    ],
  });

  const [storeZones, setStoreZones] = useState<StoreZone[]>([
    {
      id: "ZN-01",
      name: "Fresh Produce",
      type: "Grocery",
      sensorCount: 6,
      statusColor: "status-info",
    },
    {
      id: "ZN-02",
      name: "Consumer Electronics",
      type: "High-Value",
      sensorCount: 4,
      statusColor: "status-warning",
    },
    {
      id: "ZN-03",
      name: "Self-Checkout West",
      type: "Checkout",
      sensorCount: 8,
      statusColor: "status-error",
    },
    {
      id: "ZN-04",
      name: "Apparel & Seasonal",
      type: "Retail",
      sensorCount: 5,
      statusColor: "status-dim",
    },
  ]);

  const [notificationSettings, setNotificationSettings] =
    useState<NotificationSettings>({
      queueThreshold: 5,
      inventoryThreshold: "20% capacity",
      dwellAnomaliesEnabled: true,
    });

  // Fetch telemetry from server
  const fetchStoreData = async () => {
    try {
      const res = await fetch(`${djangoApiBase}/api/store/metrics`);
      if (res.ok) {
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
        setLastSyncTime(
          new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
        );
      }
    } catch (err) {
      console.warn("Backend fetch fallback:", err);
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

  // Handlers for interactive actions
  const handleAcknowledgeAlert = async (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isAcknowledged: true } : a)),
    );
    try {
      await fetch(`${djangoApiBase}/api/store/alerts/acknowledge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId: id }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDispatchItem = async (sku: string) => {
    setShelfItems((prev) =>
      prev.map((item) =>
        item.sku === sku ? { ...item, status: "Restocking..." } : item,
      ),
    );
    setCriticalOOS((prev) => prev.filter((item) => item.sku !== sku));
    setTasksStats((prev) => ({
      ...prev,
      inProgressTasks: prev.inProgressTasks + 1,
      urgentTasks: Math.max(0, prev.urgentTasks - 1),
    }));

    try {
      await fetch(`${djangoApiBase}/api/store/inventory/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleCounter = async (id: number) => {
    setQueueData((prev) => ({
      ...prev,
      counters: prev.counters.map((c) =>
        c.id === id
          ? {
              ...c,
              status: c.status === "Offline" ? "Normal" : "Offline",
              queueLength: c.status === "Offline" ? 2 : 0,
              estWaitMins: c.status === "Offline" ? 3 : 0,
            }
          : c,
      ),
    }));

    try {
      await fetch(`${djangoApiBase}/api/store/queues/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ counterId: id }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleExecuteAiRecommendation = async () => {
    setQueueData((prev) => ({
      ...prev,
      predictedRisk: "LOW",
      avgWaitTime: "4m 12s",
      avgWaitDiff: "-4m vs bench",
      aiRecommendation: {
        ...prev.aiRecommendation,
        executed: true,
      },
      counters: prev.counters.map((c) =>
        c.id === 4
          ? { ...c, status: "Normal", queueLength: 1, estWaitMins: 2 }
          : c.id === 2
            ? { ...c, status: "Normal", queueLength: 3, estWaitMins: 5 }
            : c,
      ),
    }));

    try {
      await fetch(`${djangoApiBase}/api/store/queues/execute-recommendation`, {
        method: "POST",
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateManualTask = async (task: {
    title: string;
    location: string;
    priority: string;
    sku?: string;
  }) => {
    setTasksStats((prev) => ({
      ...prev,
      inProgressTasks: prev.inProgressTasks + 1,
    }));
    try {
      await fetch(`${djangoApiBase}/api/store/tasks/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(task),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleRegisterDevice = async (device: {
    name: string;
    type: any;
    location: string;
  }) => {
    const newId = `DEV-${Math.floor(100 + Math.random() * 900)}`;
    const newDev: EdgeDevice = {
      id: newId,
      name: device.name,
      location: device.location,
      type: device.type,
      status: "Online",
      cpuPercent: 28,
      tempCelsius: 42,
      signalDbm: "-45 dBm",
      lastHeartbeat: "Just now",
    };
    setDeviceFleet((prev) => [newDev, ...prev]);
    setDeviceStats((prev) => ({
      ...prev,
      totalDevices: prev.totalDevices + 1,
      onlineCount: prev.onlineCount + 1,
    }));
    try {
      await fetch(`${djangoApiBase}/api/store/devices/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDev),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddZone = (zone: {
    name: string;
    type: string;
    sensorCount: number;
    statusColor?: string;
  }) => {
    const newId = `ZN-0${storeZones.length + 1}`;
    setStoreZones((prev) => [...prev, { ...zone, id: newId }]);
  };

  const handleSaveSettings = async (newSettings: {
    profile: StoreProfile;
    zones: StoreZone[];
    notifications: NotificationSettings;
  }) => {
    setStoreProfile(newSettings.profile);
    setStoreZones(newSettings.zones);
    setNotificationSettings(newSettings.notifications);
    try {
      await fetch(`${djangoApiBase}/api/store/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSettings),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateReport = (config: any) => {
    const newReport: ReportItem = {
      id: String(Date.now()),
      filename: `${config.reportType.replace(/\s+/g, "_")}_${config.dateStart}.pdf`,
      dateStr: "Just now",
      fileSize: "1.8 MB",
      type: "PDF",
    };
    setRecentReports((prev) => [newReport, ...prev]);
  };

  // Sync Camera Vision Data to Dashboard
  const handleSyncVisionData = (result: VisionAnalysisResult) => {
    setMetrics((prev) => ({
      ...prev,
      activeShoppers: prev.activeShoppers + (result.crowdCount > 0 ? 1 : 0),
    }));
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f9faf8] text-[#202522]">
      {/* Left Navigation Sidebar */}
      <SideNavBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        activeAlertCount={alerts.filter((a) => !a.isAcknowledged).length}
        onOpenAiAdvisor={() => setIsAiAdvisorOpen(true)}
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
                  <ShoppersView data={shoppersData} />
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
                    zoneBreakdown={[
                      {
                        name: "Grocery & Pantry",
                        visits: "14,200",
                        avgDwell: "15.2m",
                        status: "optimal",
                      },
                      {
                        name: "Electronics",
                        visits: "4,820",
                        avgDwell: "28.4m",
                        status: "warning",
                      },
                      {
                        name: "Household & Supplies",
                        visits: "3,110",
                        avgDwell: "12.1m",
                        status: "optimal",
                      },
                      {
                        name: "Apparel & Seasonal",
                        visits: "1,940",
                        avgDwell: "18.5m",
                        status: "optimal",
                      },
                      {
                        name: "Checkout Zone",
                        visits: "24,070",
                        avgDwell: "3.4m",
                        status: "optimal",
                      },
                    ]}
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
