import React, { useState } from "react";

interface RegisterDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegister: (device: { name: string; type: any; location: string }) => void;
}

export const RegisterDeviceModal: React.FC<RegisterDeviceModalProps> = ({
  isOpen,
  onClose,
  onRegister,
}) => {
  const [name, setName] = useState("");
  const [type, setType] = useState<any>("AI Camera (4K)");
  const [location, setLocation] = useState("Aisle 1 - Beverages");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onRegister({ name, type, location });
    setName("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white border border-[#D9DDD8] rounded-lg w-full max-w-md shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 border-b border-[#D9DDD8] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="material-symbols-outlined text-[20px] text-[#202522]">add_to_queue</span>
            <h3 className="text-[14px] font-bold text-[#202522]">Register Edge Fleet Node</h3>
          </div>
          <button onClick={onClose} className="text-[#58605b] hover:text-[#202522]">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-[12px]">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#58605b] block mb-1">
              Friendly Device Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Produce Overhead Cam 03"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#f9faf8] border border-[#D9DDD8] rounded-md px-3 py-2 text-[13px] text-[#202522] focus:outline-none focus:border-[#202522]"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#58605b] block mb-1">
              Hardware Device Class
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full bg-[#f9faf8] border border-[#D9DDD8] rounded-md px-3 py-2 text-[13px] text-[#202522] focus:outline-none focus:border-[#202522]"
            >
              <option value="AI Camera (4K)">AI Camera (4K 60FPS RTSP)</option>
              <option value="AI Camera (1080p)">AI Camera (1080p Standard)</option>
              <option value="IoT Sensor (ESP32)">IoT Sensor (ESP32 BLE/WiFi Matrix)</option>
              <option value="Edge Compute Node">Edge Compute Node (NVIDIA Jetson / x86)</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#58605b] block mb-1">
              Store Physical Location
            </label>
            <input
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-[#f9faf8] border border-[#D9DDD8] rounded-md px-3 py-2 text-[13px] text-[#202522] focus:outline-none focus:border-[#202522]"
            />
          </div>

          <div className="pt-2 flex items-center justify-end space-x-2 border-t border-[#D9DDD8]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-[12px] font-medium text-[#58605b] hover:text-[#202522]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#202522] hover:bg-black text-white text-[12px] font-bold rounded-md transition-colors"
            >
              Provision Device
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
