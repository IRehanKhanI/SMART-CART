import React, { useState } from "react";

interface AiAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AiAdvisorModal: React.FC<AiAdvisorModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversation, setConversation] = useState<
    { role: "user" | "assistant"; text: string; time: string }[]
  >([
    {
      role: "assistant",
      text: "Hello! I am your Edge-AI Retail Operations Advisor. Based on real-time sensor and optical feeds, I can assist with queue mitigation, stockout prevention, staff reallocation, and footprint conversion.",
      time: "Just now",
    },
  ]);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    const userText = query;
    setQuery("");
    setConversation((prev) => [
      ...prev,
      {
        role: "user",
        text: userText,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);
    setLoading(true);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/store/operational-advice",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: userText }),
        },
      );

      if (!response.ok) throw new Error("Local advisor unavailable");
      const data = await response.json();
      setConversation((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data.advice,
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    } catch (err) {
      setConversation((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Live operational advice is unavailable because the local backend could not be reached.",
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white border border-[#D9DDD8] rounded-lg w-full max-w-xl shadow-2xl flex flex-col h-[550px] animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-[#D9DDD8] flex items-center justify-between bg-[#202522] text-white">
          <div className="flex items-center space-x-2.5">
            <span className="material-symbols-outlined text-[20px] text-emerald-400">
              psychology
            </span>
            <div>
              <h3 className="text-[14px] font-bold">
                Edge-AI Retail Operations Copilot
              </h3>
              <p className="text-[11px] text-gray-300">
                Grounded with live store telemetry & optical data
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-white">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#f9faf8]">
          {conversation.map((msg, i) => (
            <div
              key={i}
              className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-lg p-3 text-[13px] leading-relaxed shadow-xs ${
                  msg.role === "user"
                    ? "bg-[#202522] text-white"
                    : "bg-white border border-[#D9DDD8] text-[#202522]"
                }`}
              >
                {msg.text}
              </div>
              <span className="text-[10px] text-[#58605b] mt-1 px-1">
                {msg.time}
              </span>
            </div>
          ))}
          {loading && (
            <div className="flex items-center space-x-2 text-[12px] text-[#58605b] p-2 bg-white border border-[#D9DDD8] rounded-lg w-fit">
              <span className="material-symbols-outlined text-[16px] animate-spin">
                autorenew
              </span>
              <span>Synthesizing store intelligence...</span>
            </div>
          )}
        </div>

        {/* Quick Prompts */}
        <div className="px-4 py-2 border-t border-[#D9DDD8] bg-white flex items-center space-x-1.5 overflow-x-auto text-[11px]">
          <span className="text-[#58605b] shrink-0 font-medium">
            Quick Query:
          </span>
          <button
            onClick={() =>
              setQuery("How can we reduce checkout queue wait times right now?")
            }
            className="px-2.5 py-1 bg-[#f9faf8] hover:bg-[#edeeec] border border-[#D9DDD8] rounded-full text-[#202522] shrink-0"
          >
            Reduce Queue Times
          </button>
          <button
            onClick={() =>
              setQuery(
                "What are the highest risk stockouts in Produce & Dairy?",
              )
            }
            className="px-2.5 py-1 bg-[#f9faf8] hover:bg-[#edeeec] border border-[#D9DDD8] rounded-full text-[#202522] shrink-0"
          >
            Critical Stockouts
          </button>
          <button
            onClick={() =>
              setQuery(
                "Analyze footfall conversion between Grocery and Electronics.",
              )
            }
            className="px-2.5 py-1 bg-[#f9faf8] hover:bg-[#edeeec] border border-[#D9DDD8] rounded-full text-[#202522] shrink-0"
          >
            Footfall Conversion
          </button>
        </div>

        {/* Input Form */}
        <form
          onSubmit={handleSend}
          className="p-3 border-t border-[#D9DDD8] bg-white flex items-center space-x-2"
        >
          <input
            type="text"
            placeholder="Ask AI Copilot about store operations, inventory, or queue optimization..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-[#f9faf8] border border-[#D9DDD8] rounded-md px-3 py-2 text-[13px] text-[#202522] placeholder-[#58605b] focus:outline-none focus:border-[#202522]"
          />
          <button
            type="submit"
            disabled={!query.trim() || loading}
            className="px-4 py-2 bg-[#202522] hover:bg-black text-white text-[12px] font-bold rounded-md transition-colors disabled:opacity-40 flex items-center gap-1"
          >
            <span>Send</span>
            <span className="material-symbols-outlined text-[16px]">send</span>
          </button>
        </form>
      </div>
    </div>
  );
};
