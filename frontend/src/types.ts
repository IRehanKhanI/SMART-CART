export type TabType = 
  | 'overview'
  | 'shoppers'
  | 'inventory'
  | 'queues'
  | 'analytics'
  | 'devices'
  | 'settings'
  | 'camera';

export type NavigationTab = TabType;

export interface OverviewMetrics {
  currentOccupancy: number;
  occupancyTrendPercent: number;
  dailyFootfall: number;
  dailyFootfallTarget: number;
  activeAlertsCount: number;
  queueRisk: 'Low' | 'Medium' | 'High' | 'Critical';
  lastSyncTime: string;
  systemOperational: boolean;
}

export interface StoreMetrics {
  activeShoppers: number;
  activeShoppersDiff: string;
  avgDwellTime: string;
  avgDwellDiff: string;
  checkoutQueueAvg: string;
  checkoutQueueDiff: string;
  shelfStockoutRate: string;
  shelfStockoutDiff: string;
}

export interface CriticalAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  timeAgo: string;
  timestamp?: string;
  zone: string;
  isAcknowledged?: boolean;
}

export interface ShopperMetrics {
  totalEntries: number;
  entriesTrendPercent: number;
  totalExits: number;
  netOccupancy?: number;
  avgDwellMinutes: number;
  avgDwellSeconds: number;
  dwellBenchmarkDiffMinutes?: number;
  checkoutQueueAvg: number;
  hourlyTrend: { time: string; count: number }[];
  weeklyTrend: { day: string; count: number }[];
  zonePopularity: ZonePopularityItem[];
}

export interface ZonePopularityItem {
  id: string | number;
  zone: string;
  activeCount: number;
  avgDwellMinutes: number;
  statusColor: 'info' | 'warning' | 'tint' | 'dim' | 'error' | 'success' | string;
}

export interface InventoryItem {
  sku: string;
  name: string;
  category: string;
  location: string;
  currentStock: number;
  maxStock: number;
  threshold?: number;
  status: 'Optimal' | 'Low Stock' | 'Out of Stock' | 'Restocking...' | string;
  oosDuration?: string;
  imageIcon?: string;
}

export interface LowStockAlert {
  sku: string;
  name: string;
  remainingUnits: number;
  threshold: number;
  icon: string;
}

export interface ReplenishmentStats {
  urgentTasks: number;
  inProgressTasks: number;
  completedToday: number;
}

export interface QueueCounter {
  id: number;
  name: string;
  type: string;
  queueLength: number | null;
  capacity: number;
  estWaitMins: number | null;
  status: 'Normal' | 'Elevated' | 'Congested' | 'Offline' | string;
}

export interface QueueData {
  predictedRisk: 'HIGH' | 'MEDIUM' | 'LOW' | string;
  peakExpectedMinutes: number;
  aiRecommendation: {
    title: string;
    description: string;
    actionTarget?: string;
    actionLabel?: string;
    executed: boolean;
  };
  avgWaitTime: string;
  avgWaitDiff: string;
  avgServiceTime: string;
  avgServiceDiff: string;
  counters: QueueCounter[];
}

export interface EdgeDevice {
  id: string;
  name: string;
  location: string;
  type: 'AI Camera (4K)' | 'IoT Sensor (ESP32)' | 'Edge Compute Node' | 'AI Camera (1080p)' | string;
  status: 'Online' | 'Syncing' | 'Local Mode' | 'Offline' | string;
  cpuPercent?: number;
  tempCelsius?: number;
  signalDbm: number | string; // e.g. -42 dBm or "LAN" or "Disconnected"
  lastHeartbeat: string;
  ipAddress?: string;
}

export interface DeviceStats {
  totalDevices: number;
  onlineCount: number;
  offlineCount: number;
  avgProcessingDelayMs: number;
}

export interface ReportItem {
  id: string;
  filename: string;
  dateStr: string;
  statusColor?: 'success' | 'info' | 'warning' | string;
  fileSize: string;
  type: string;
}

export interface StoreProfile {
  storeName: string;
  storeId: string;
  managerName: string;
  address: string;
  city: string;
  zipCode: string;
  operatingHours: {
    day: string;
    open: string;
    close: string;
    sameAsPrevious?: boolean;
  }[];
}

export interface StoreZone {
  id: string;
  name: string;
  type: string;
  sensorCount: number;
  statusColor?: string;
}

export interface NotificationSettings {
  queueThreshold: number;
  queueAlertEnabled?: boolean;
  inventoryThreshold: string;
  inventoryAlertEnabled?: boolean;
  dwellAnomaliesEnabled: boolean;
}

export interface VisionAnalysisResult {
  crowdCount: number;
  detectedPeople: { x: number; y: number; width: number; height: number; label: string; confidence: number }[];
  shelfAnalysis: {
    stockLevelPercent: number;
    emptySlotsDetected: number;
    facingCondition: string;
  };
  queueEstimation: {
    queueLength: number;
    estimatedWaitMinutes: number;
  };
  hazardsDetected: string[];
  operationalAdvice: string;
  latencyMs: number;
  timestamp: string;
}
