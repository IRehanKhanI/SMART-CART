import React, { useState } from "react";
import { StoreProfile, StoreZone, NotificationSettings } from "../../types";

interface SettingsViewProps {
  profile: StoreProfile;
  zones: StoreZone[];
  notifications: NotificationSettings;
  onSaveSettings: (settings: { profile: StoreProfile; zones: StoreZone[]; notifications: NotificationSettings }) => void;
  onOpenAddZoneModal: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  profile: initialProfile,
  zones: initialZones,
  notifications: initialNotifications,
  onSaveSettings,
  onOpenAddZoneModal,
}) => {
  const [profile, setProfile] = useState<StoreProfile>(initialProfile);
  const [zones, setZones] = useState<StoreZone[]>(initialZones);
  const [notifications, setNotifications] = useState<NotificationSettings>(initialNotifications);
  const [activeTab, setActiveTab] = useState<"profile" | "zones" | "notifications">("profile");
  const [saveToast, setSaveToast] = useState(false);

  const handleSave = () => {
    onSaveSettings({ profile, zones, notifications });
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Settings Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-[#D9DDD8] pb-3">
        <div className="flex items-center space-x-2 bg-[#f9faf8] border border-[#D9DDD8] rounded-md p-1">
          <button
            onClick={() => setActiveTab("profile")}
            className={`px-3 py-1.5 text-[12px] font-bold rounded-md transition-colors ${
              activeTab === "profile"
                ? "bg-[#202522] text-white shadow-xs"
                : "text-[#58605b] hover:text-[#202522]"
            }`}
          >
            Store Profile & Hours
          </button>
          <button
            onClick={() => setActiveTab("zones")}
            className={`px-3 py-1.5 text-[12px] font-bold rounded-md transition-colors ${
              activeTab === "zones"
                ? "bg-[#202522] text-white shadow-xs"
                : "text-[#58605b] hover:text-[#202522]"
            }`}
          >
            Zone Configuration
          </button>
          <button
            onClick={() => setActiveTab("notifications")}
            className={`px-3 py-1.5 text-[12px] font-bold rounded-md transition-colors ${
              activeTab === "notifications"
                ? "bg-[#202522] text-white shadow-xs"
                : "text-[#58605b] hover:text-[#202522]"
            }`}
          >
            Alert Thresholds
          </button>
        </div>

        <div className="flex items-center space-x-3">
          {saveToast && (
            <span className="text-[12px] font-bold text-[#166534] flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              Settings saved!
            </span>
          )}
          <button
            id="save-settings-btn"
            onClick={handleSave}
            className="px-4 py-2 bg-[#202522] hover:bg-black text-white text-[12px] font-bold rounded-md transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <span className="material-symbols-outlined text-[16px]">save</span>
            Save Configuration
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "profile" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Store Information */}
          <div className="bg-white border border-[#D9DDD8] rounded-lg p-5 shadow-xs space-y-4">
            <h3 className="text-[14px] font-bold text-[#202522] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px]">store</span>
              General Store Information
            </h3>

            <div className="space-y-3 text-[12px]">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#58605b] block mb-1">
                  Store Display Name
                </label>
                <input
                  type="text"
                  value={profile.storeName}
                  onChange={(e) => setProfile({ ...profile, storeName: e.target.value })}
                  className="w-full bg-[#f9faf8] border border-[#D9DDD8] rounded-md px-3 py-2 text-[13px] text-[#202522] focus:outline-none focus:border-[#202522]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#58605b] block mb-1">
                    Store ID
                  </label>
                  <input
                    type="text"
                    value={profile.storeId}
                    disabled
                    className="w-full bg-[#edeeec] border border-[#D9DDD8] rounded-md px-3 py-2 text-[13px] text-[#58605b] font-mono cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#58605b] block mb-1">
                    Manager Name
                  </label>
                  <input
                    type="text"
                    value={profile.managerName}
                    onChange={(e) => setProfile({ ...profile, managerName: e.target.value })}
                    className="w-full bg-[#f9faf8] border border-[#D9DDD8] rounded-md px-3 py-2 text-[13px] text-[#202522] focus:outline-none focus:border-[#202522]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#58605b] block mb-1">
                  Physical Address
                </label>
                <input
                  type="text"
                  value={profile.address}
                  onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                  className="w-full bg-[#f9faf8] border border-[#D9DDD8] rounded-md px-3 py-2 text-[13px] text-[#202522] focus:outline-none focus:border-[#202522]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#58605b] block mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={profile.city}
                    onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                    className="w-full bg-[#f9faf8] border border-[#D9DDD8] rounded-md px-3 py-2 text-[13px] text-[#202522] focus:outline-none focus:border-[#202522]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#58605b] block mb-1">
                    Zip Code
                  </label>
                  <input
                    type="text"
                    value={profile.zipCode}
                    onChange={(e) => setProfile({ ...profile, zipCode: e.target.value })}
                    className="w-full bg-[#f9faf8] border border-[#D9DDD8] rounded-md px-3 py-2 text-[13px] text-[#202522] focus:outline-none focus:border-[#202522]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Operating Hours */}
          <div className="bg-white border border-[#D9DDD8] rounded-lg p-5 shadow-xs space-y-4">
            <h3 className="text-[14px] font-bold text-[#202522] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px]">schedule</span>
              Store Operating Schedule
            </h3>

            <div className="space-y-2">
              {profile.operatingHours.map((hour, idx) => (
                <div
                  key={hour.day}
                  className="p-2.5 bg-[#f9faf8] border border-[#D9DDD8] rounded-md flex items-center justify-between text-[12px]"
                >
                  <span className="font-bold text-[#202522] w-24">{hour.day}</span>
                  <div className="flex items-center space-x-2">
                    <input
                      type="time"
                      value={hour.open}
                      onChange={(e) => {
                        const newHours = [...profile.operatingHours];
                        newHours[idx].open = e.target.value;
                        setProfile({ ...profile, operatingHours: newHours });
                      }}
                      className="bg-white border border-[#D9DDD8] rounded px-2 py-1 text-[#202522]"
                    />
                    <span className="text-[#58605b]">to</span>
                    <input
                      type="time"
                      value={hour.close}
                      onChange={(e) => {
                        const newHours = [...profile.operatingHours];
                        newHours[idx].close = e.target.value;
                        setProfile({ ...profile, operatingHours: newHours });
                      }}
                      className="bg-white border border-[#D9DDD8] rounded px-2 py-1 text-[#202522]"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Zones */}
      {activeTab === "zones" && (
        <div className="bg-white border border-[#D9DDD8] rounded-lg shadow-xs overflow-hidden">
          <div className="p-4 border-b border-[#D9DDD8] flex items-center justify-between">
            <div>
              <h3 className="text-[14px] font-bold text-[#202522]">Configured Store Zones</h3>
              <p className="text-[12px] text-[#58605b]">
                Optical flow boundary definitions for headcount & dwell tracking
              </p>
            </div>
            <button
              onClick={onOpenAddZoneModal}
              className="px-3 py-1.5 bg-[#202522] hover:bg-black text-white text-[12px] font-semibold rounded-md transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              Add Zone
            </button>
          </div>

          <table className="w-full text-left text-[13px]">
            <thead className="bg-[#f9faf8] border-b border-[#D9DDD8] text-[11px] uppercase tracking-wider text-[#58605b] font-bold">
              <tr>
                <th className="py-2.5 px-4">Zone ID</th>
                <th className="py-2.5 px-4">Zone Name</th>
                <th className="py-2.5 px-4">Department Type</th>
                <th className="py-2.5 px-4">Active Sensors</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D9DDD8]">
              {zones.map((zone) => (
                <tr key={zone.id} className="hover:bg-[#f9faf8]">
                  <td className="py-3 px-4 font-mono font-bold text-[#202522]">{zone.id}</td>
                  <td className="py-3 px-4 font-bold text-[#202522]">{zone.name}</td>
                  <td className="py-3 px-4 text-[#58605b]">{zone.type}</td>
                  <td className="py-3 px-4 font-mono font-semibold text-[#166534]">
                    {zone.sensorCount} sensors
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => {
                        setZones(zones.filter((z) => z.id !== zone.id));
                      }}
                      className="text-[11px] font-semibold text-[#991B1B] hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Notification & Threshold Preferences */}
      {activeTab === "notifications" && (
        <div className="bg-white border border-[#D9DDD8] rounded-lg p-6 shadow-xs space-y-6 max-w-3xl">
          <h3 className="text-[14px] font-bold text-[#202522] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px]">notifications_active</span>
            Automated Alert & Operational Thresholds
          </h3>

          <div className="space-y-5 text-[13px]">
            {/* Queue Length Threshold */}
            <div className="p-4 bg-[#f9faf8] border border-[#D9DDD8] rounded-md space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-[#202522]">Queue Length Alert Threshold</div>
                  <div className="text-[11px] text-[#58605b]">
                    Trigger critical alert when lane queue exceeds:
                  </div>
                </div>
                <span className="text-[14px] font-bold font-mono text-[#202522] bg-white border border-[#D9DDD8] px-2.5 py-1 rounded">
                  {notifications.queueThreshold} customers
                </span>
              </div>
              <input
                type="range"
                min="2"
                max="12"
                value={notifications.queueThreshold}
                onChange={(e) =>
                  setNotifications({ ...notifications, queueThreshold: Number(e.target.value) })
                }
                className="w-full accent-[#202522] cursor-pointer"
              />
            </div>

            {/* Inventory Depletion Threshold */}
            <div className="p-4 bg-[#f9faf8] border border-[#D9DDD8] rounded-md flex items-center justify-between">
              <div>
                <div className="font-bold text-[#202522]">Inventory Depletion Trigger</div>
                <div className="text-[11px] text-[#58605b]">
                  Automate replenishment task when facing capacity drops below:
                </div>
              </div>
              <select
                value={notifications.inventoryThreshold}
                onChange={(e) =>
                  setNotifications({ ...notifications, inventoryThreshold: e.target.value })
                }
                className="bg-white border border-[#D9DDD8] rounded px-3 py-1.5 text-[12px] font-bold text-[#202522]"
              >
                <option value="10% capacity">10% capacity</option>
                <option value="20% capacity">20% capacity (Recommended)</option>
                <option value="30% capacity">30% capacity</option>
              </select>
            </div>

            {/* Dwell Time Anomaly Detection */}
            <div className="p-4 bg-[#f9faf8] border border-[#D9DDD8] rounded-md flex items-center justify-between">
              <div>
                <div className="font-bold text-[#202522]">Dwell Time Anomaly Detection</div>
                <div className="text-[11px] text-[#58605b]">
                  Notify store team if customer stationary duration exceeds 45 mins in high-value zones
                </div>
              </div>
              <button
                onClick={() =>
                  setNotifications({
                    ...notifications,
                    dwellAnomaliesEnabled: !notifications.dwellAnomaliesEnabled,
                  })
                }
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  notifications.dwellAnomaliesEnabled ? "bg-[#166534]" : "bg-[#D9DDD8]"
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    notifications.dwellAnomaliesEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                ></div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
