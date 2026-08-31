import React, { useState } from "react";

interface ManualTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (task: { title: string; location: string; priority: string; sku?: string }) => void;
}

export const ManualTaskModal: React.FC<ManualTaskModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("Aisle 4, Dairy");
  const [priority, setPriority] = useState("Urgent");
  const [sku, setSku] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ title, location, priority, sku });
    setTitle("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white border border-[#D9DDD8] rounded-lg w-full max-w-md shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 border-b border-[#D9DDD8] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="material-symbols-outlined text-[20px] text-[#202522]">assignment_add</span>
            <h3 className="text-[14px] font-bold text-[#202522]">Create Manual Store Task</h3>
          </div>
          <button onClick={onClose} className="text-[#58605b] hover:text-[#202522]">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-[12px]">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#58605b] block mb-1">
              Task Description
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Restock almond milk from backroom chiller"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#f9faf8] border border-[#D9DDD8] rounded-md px-3 py-2 text-[13px] text-[#202522] focus:outline-none focus:border-[#202522]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#58605b] block mb-1">
                Store Location / Aisle
              </label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-[#f9faf8] border border-[#D9DDD8] rounded-md px-3 py-2 text-[13px] text-[#202522] focus:outline-none focus:border-[#202522]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#58605b] block mb-1">
                Priority Level
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full bg-[#f9faf8] border border-[#D9DDD8] rounded-md px-3 py-2 text-[13px] text-[#202522] focus:outline-none focus:border-[#202522]"
              >
                <option value="Urgent">Urgent (Immediate)</option>
                <option value="Standard">Standard (Within 1 hr)</option>
                <option value="Low">Low (Next shift)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#58605b] block mb-1">
              Related Product SKU (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. 849201"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="w-full bg-[#f9faf8] border border-[#D9DDD8] rounded-md px-3 py-2 text-[13px] text-[#202522] font-mono focus:outline-none focus:border-[#202522]"
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
              Dispatch Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
