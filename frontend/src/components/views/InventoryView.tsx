import React, { useState } from "react";
import { InventoryItem, LowStockAlert, ReplenishmentStats } from "../../types";

interface InventoryViewProps {
  criticalOOS: { sku: string; name: string; location: string; oosDuration: string }[];
  lowStockAlerts: LowStockAlert[];
  tasksStats: ReplenishmentStats;
  shelfItems: InventoryItem[];
  onDispatchItem: (sku: string) => void;
  onOpenManualTaskModal: () => void;
  onExportReport: () => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  criticalOOS,
  lowStockAlerts,
  tasksStats,
  shelfItems,
  onDispatchItem,
  onOpenManualTaskModal,
  onExportReport,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredItems = shelfItems.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.includes(searchQuery) ||
      item.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = categoryFilter === "all" || item.category.toLowerCase() === categoryFilter.toLowerCase();
    const matchesStatus = statusFilter === "all" || item.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesCat && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Optimal":
        return "bg-[#166534]/10 text-[#166534] border-[#166534]/20";
      case "Low Stock":
        return "bg-[#B45309]/10 text-[#B45309] border-[#B45309]/20";
      case "Out of Stock":
        return "bg-[#991B1B]/10 text-[#991B1B] border-[#991B1B]/20";
      case "Restocking...":
        return "bg-[#1E40AF]/10 text-[#1E40AF] border-[#1E40AF]/20";
      default:
        return "bg-[#58605b]/10 text-[#58605b] border-[#58605b]/20";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Section: Critical Out of Stock, Low Stock, Tasks Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Critical OOS Card */}
        <div className="bg-white border border-[#D9DDD8] rounded-lg p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#991B1B] animate-pulse"></span>
              <h3 className="text-[14px] font-bold text-[#202522]">Critical Out of Stock</h3>
            </div>
            <span className="text-[11px] font-mono font-bold text-[#991B1B] bg-[#991B1B]/10 px-2 py-0.5 rounded">
              {criticalOOS.length} Items
            </span>
          </div>

          <div className="space-y-3">
            {criticalOOS.map((item) => (
              <div
                key={item.sku}
                className="p-3 bg-[#f9faf8] border border-[#D9DDD8] rounded-md flex items-center justify-between"
              >
                <div>
                  <div className="text-[13px] font-bold text-[#202522]">{item.name}</div>
                  <div className="text-[11px] text-[#58605b]">{item.location} • SKU: {item.sku}</div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-bold text-[#991B1B] bg-[#991B1B]/10 border border-[#991B1B]/20 px-2 py-0.5 rounded block mb-1">
                    {item.oosDuration}
                  </span>
                  <button
                    onClick={() => onDispatchItem(item.sku)}
                    className="text-[11px] font-bold text-[#202522] hover:underline"
                  >
                    Dispatch Restock &rarr;
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white border border-[#D9DDD8] rounded-lg p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <span className="material-symbols-outlined text-[18px] text-[#B45309]">warning</span>
              <h3 className="text-[14px] font-bold text-[#202522]">Low Stock Alerts</h3>
            </div>
            <span className="text-[11px] font-mono text-[#B45309] font-bold bg-[#B45309]/10 px-2 py-0.5 rounded">
              {lowStockAlerts.length} Warnings
            </span>
          </div>

          <div className="space-y-3">
            {lowStockAlerts.map((item) => (
              <div
                key={item.sku}
                className="p-3 bg-[#f9faf8] border border-[#D9DDD8] rounded-md flex items-center justify-between"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded bg-white border border-[#D9DDD8] flex items-center justify-center text-[#58605b]">
                    <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                  </div>
                  <div>
                    <div className="text-[13px] font-bold text-[#202522]">{item.name}</div>
                    <div className="text-[11px] text-[#58605b]">
                      Threshold: &lt;{item.threshold} units
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[13px] font-bold text-[#B45309] font-mono block">
                    {item.remainingUnits} left
                  </span>
                  <button
                    onClick={() => onDispatchItem(item.sku)}
                    className="text-[11px] font-semibold text-[#58605b] hover:text-[#202522]"
                  >
                    Restock
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Replenishment Tasks Summary */}
        <div className="bg-white border border-[#D9DDD8] rounded-lg p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-bold text-[#202522] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px]">assignment</span>
                Replenishment Tasks
              </h3>
              <button
                onClick={onOpenManualTaskModal}
                className="text-[11px] font-bold text-[#202522] hover:underline"
              >
                + New Task
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="p-3 bg-[#991B1B]/5 border border-[#991B1B]/20 rounded-md text-center">
                <div className="text-[24px] font-bold text-[#991B1B] leading-tight font-mono">
                  {tasksStats.urgentTasks}
                </div>
                <div className="text-[11px] font-semibold uppercase text-[#991B1B] mt-1">Urgent</div>
              </div>

              <div className="p-3 bg-[#1E40AF]/5 border border-[#1E40AF]/20 rounded-md text-center">
                <div className="text-[24px] font-bold text-[#1E40AF] leading-tight font-mono">
                  {tasksStats.inProgressTasks}
                </div>
                <div className="text-[11px] font-semibold uppercase text-[#1E40AF] mt-1">In Progress</div>
              </div>

              <div className="p-3 bg-[#166534]/5 border border-[#166534]/20 rounded-md text-center">
                <div className="text-[24px] font-bold text-[#166534] leading-tight font-mono">
                  {tasksStats.completedToday}
                </div>
                <div className="text-[11px] font-semibold uppercase text-[#166534] mt-1">Done Today</div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#D9DDD8] flex items-center justify-between text-[11px] text-[#58605b]">
            <span>Average task resolution time: 14 mins</span>
            <span className="font-semibold text-[#166534]">92% On-Time</span>
          </div>
        </div>
      </div>

      {/* Main Table: Live Shelf Monitoring */}
      <div className="bg-white border border-[#D9DDD8] rounded-lg shadow-xs overflow-hidden">
        {/* Table Header & Controls */}
        <div className="p-4 border-b border-[#D9DDD8] flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-[14px] font-bold text-[#202522]">Live Shelf Monitoring Table</h3>
            <p className="text-[12px] text-[#58605b]">
              Optical stock level verification & automated backroom dispatch
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
                placeholder="Filter SKU or item..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#f9faf8] border border-[#D9DDD8] rounded-md pl-8 pr-3 py-1.5 text-[12px] text-[#202522] placeholder-[#58605b] focus:outline-none focus:border-[#202522]"
              />
            </div>

            {/* Category Dropdown */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-[#f9faf8] border border-[#D9DDD8] rounded-md px-2.5 py-1.5 text-[12px] text-[#202522] focus:outline-none focus:border-[#202522]"
            >
              <option value="all">All Categories</option>
              <option value="dairy">Dairy</option>
              <option value="pantry">Pantry</option>
              <option value="household">Household</option>
              <option value="beverages">Beverages</option>
            </select>

            {/* Action Buttons */}
            <button
              onClick={onOpenManualTaskModal}
              className="px-3 py-1.5 bg-[#202522] hover:bg-black text-white text-[12px] font-semibold rounded-md transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              Manual Task
            </button>

            <button
              onClick={onExportReport}
              className="px-3 py-1.5 bg-[#f9faf8] hover:bg-[#edeeec] border border-[#D9DDD8] text-[#202522] text-[12px] font-semibold rounded-md transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              Export Report
            </button>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-[#f9faf8] border-b border-[#D9DDD8] text-[11px] uppercase tracking-wider text-[#58605b] font-bold">
              <tr>
                <th className="py-2.5 px-4">SKU</th>
                <th className="py-2.5 px-4">Product Name</th>
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-4">Location</th>
                <th className="py-2.5 px-4 w-52">Stock Capacity Level</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D9DDD8]">
              {filteredItems.map((item) => {
                const stockPercent = Math.round((item.currentStock / item.maxStock) * 100);
                const isLow = stockPercent <= 25;
                const isOOS = item.currentStock === 0;

                return (
                  <tr key={item.sku} className="hover:bg-[#f9faf8] transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#202522]">
                      {item.sku}
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#202522]">
                      {item.name}
                    </td>
                    <td className="py-3 px-4 text-[#58605b] font-medium">
                      {item.category}
                    </td>
                    <td className="py-3 px-4 text-[#58605b]">
                      {item.location}
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-mono">
                          <span className="font-bold text-[#202522]">
                            {item.currentStock} / {item.maxStock}
                          </span>
                          <span className={isOOS ? "text-[#991B1B] font-bold" : isLow ? "text-[#B45309] font-bold" : "text-[#166534]"}>
                            {stockPercent}%
                          </span>
                        </div>
                        <div className="w-full bg-[#edeeec] rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              isOOS
                                ? "bg-[#991B1B] w-0"
                                : isLow
                                ? "bg-[#B45309]"
                                : "bg-[#166534]"
                            }`}
                            style={{ width: `${stockPercent}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded border ${getStatusBadge(
                          item.status
                        )}`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {item.status === "Restocking..." ? (
                        <span className="text-[11px] font-semibold text-[#1E40AF] flex items-center justify-end gap-1">
                          <span className="material-symbols-outlined text-[14px] animate-spin">refresh</span>
                          In Transit
                        </span>
                      ) : (
                        <button
                          onClick={() => onDispatchItem(item.sku)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-[#202522] bg-[#f9faf8] hover:bg-[#202522] hover:text-white border border-[#D9DDD8] rounded transition-colors"
                        >
                          Dispatch
                        </button>
                      )}
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
