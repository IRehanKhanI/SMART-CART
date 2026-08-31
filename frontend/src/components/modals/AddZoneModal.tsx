import React, { useState } from "react";

interface AddZoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddZone: (zone: { name: string; type: string; sensorCount: number; statusColor?: string }) => void;
}

export const AddZoneModal: React.FC<AddZoneModalProps> = ({ isOpen, onClose, onAddZone }) => {
  const [name, setName] = useState("");
  const [type, setType] = useState("Retail");
  const [sensorCount, setSensorCount] = useState(4);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddZone({ name, type, sensorCount, statusColor: "status-info" });
    setName("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white border border-[#D9DDD8] rounded-lg w-full max-w-md shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 border-b border-[#D9DDD8] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="material-symbols-outlined text-[20px] text-[#202522]">add_location_alt</span>
            <h3 className="text-[14px] font-bold text-[#202522]">Add New Store Zone</h3>
          </div>
          <button onClick={onClose} className="text-[#58605b] hover:text-[#202522]">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-[12px]">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#58605b] block mb-1">
              Zone Identifier / Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Bakery & Delicatessen"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#f9faf8] border border-[#D9DDD8] rounded-md px-3 py-2 text-[13px] text-[#202522] focus:outline-none focus:border-[#202522]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#58605b] block mb-1">
                Department Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-[#f9faf8] border border-[#D9DDD8] rounded-md px-3 py-2 text-[13px] text-[#202522] focus:outline-none focus:border-[#202522]"
              >
                <option value="Grocery">Grocery</option>
                <option value="High-Value">High-Value</option>
                <option value="Checkout">Checkout</option>
                <option value="Retail">Retail</option>
                <option value="Storage">Storage / Backroom</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#58605b] block mb-1">
                Sensor Count
              </label>
              <input
                type="number"
                min="1"
                max="32"
                value={sensorCount}
                onChange={(e) => setSensorCount(Number(e.target.value))}
                className="w-full bg-[#f9faf8] border border-[#D9DDD8] rounded-md px-3 py-2 text-[13px] text-[#202522] focus:outline-none focus:border-[#202522]"
              />
            </div>
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
              Add Zone Definition
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
