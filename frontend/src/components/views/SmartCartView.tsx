import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CartSessionData, MemberData, RecommendationItem } from "../../types";

interface SmartCartViewProps {
  djangoApiBase?: string;
}

export const SmartCartView: React.FC<SmartCartViewProps> = ({
  djangoApiBase = "http://127.0.0.1:8000",
}) => {
  const [cart, setCart] = useState<CartSessionData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Admin Membership Tab State
  const [activeBottomTab, setActiveBottomTab] = useState<"directory" | "register">("directory");
  const [membersList, setMembersList] = useState<MemberData[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isRegisteringMember, setIsRegisteringMember] = useState<boolean>(false);

  // New Member Form State
  const [newMemberForm, setNewMemberForm] = useState({
    memberId: `MEM-${Math.floor(100 + Math.random() * 900)}`,
    name: "",
    phone: "",
    email: "",
    tier: "Gold" as "Bronze" | "Silver" | "Gold" | "Platinum",
    loyaltyPoints: 50,
  });

  // ESP32-CAM Live Camera Stream & Vision Inspector State (Wireless over Wi-Fi)
  const [esp32Ip, setEsp32Ip] = useState<string>("10.1.7.65");
  const [isLiveStreamActive, setIsLiveStreamActive] = useState<boolean>(false);
  const [isCapturingVision, setIsCapturingVision] = useState<boolean>(false);
  const [latestVisionResult, setLatestVisionResult] = useState<{
    productName: string;
    sku: string;
    confidence: number;
    method: string;
    timestamp: string;
  } | null>(null);

  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [lastScannedFeedback, setLastScannedFeedback] = useState<string | null>(null);

  // Voice Chat & 1.3" OLED Interactive Voice State
  const [voiceMessages, setVoiceMessages] = useState<Array<{ sender: "shopper" | "ai"; text: string; time: string }>>([
    { sender: "ai", text: "Namaste! Speak or ask me anything: product locations, prices, cart totals, or recommendations.", time: "Ready" },
  ]);
  const [isRecordingVoice, setIsRecordingVoice] = useState<boolean>(false);
  const [voiceInputText, setVoiceInputText] = useState<string>("");
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [oledDisplayMode, setOledDisplayMode] = useState<"cart" | "voice">("cart");
  const [voiceOledLines, setVoiceOledLines] = useState<{ line1: string; line2: string; line3: string; line4: string } | null>(null);

  // Send Voice Query to Retail AI Assistant (Audio Blob or Text)
  const handleSendVoiceQuery = async (queryText?: string, audioBlob?: Blob) => {
    try {
      const q = queryText || voiceInputText;
      if (!q && !audioBlob) return;

      if (q) {
        setVoiceMessages(prev => [...prev, { sender: "shopper", text: q, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
        setVoiceInputText("");
      }

      let res;
      if (audioBlob) {
        const formData = new FormData();
        formData.append("audio", audioBlob, "voice_input.wav");
        res = await fetch(`${djangoApiBase}/api/cart/voice-chat/?cart_id=${cart?.cartId || "CART-01"}`, {
          method: "POST",
          body: formData,
        });
      } else {
        res = await fetch(`${djangoApiBase}/api/cart/voice-chat/?cart_id=${cart?.cartId || "CART-01"}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: q }),
        });
      }

      if (res.ok) {
        const data = await res.json();
        if (data.transcript && !q) {
          setVoiceMessages(prev => [...prev, { sender: "shopper", text: data.transcript, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
        }
        setVoiceMessages(prev => [...prev, { sender: "ai", text: data.reply, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
        if (data.oled) {
          setVoiceOledLines(data.oled);
          setOledDisplayMode("voice");
        }
        setSuccessToast(`Voice Assistant: Answered query`);
      }
    } catch (err) {
      console.error("Voice chat error:", err);
    }
  };

  // Toggle Browser / PC Microphone Recording
  const handleToggleVoiceRecord = async () => {
    if (isRecordingVoice) {
      if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
      }
      setIsRecordingVoice(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        const chunks: BlobPart[] = [];
        recorder.ondataavailable = (e) => chunks.push(e.data);
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: "audio/wav" });
          handleSendVoiceQuery(undefined, blob);
          stream.getTracks().forEach(t => t.stop());
        };
        recorder.start();
        setMediaRecorder(recorder);
        setIsRecordingVoice(true);
      } catch (err) {
        setErrorMessage("Microphone access denied or unavailable. You can type or click the quick voice query buttons!");
      }
    }
  };

  // Auto-clear toast
  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => setSuccessToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successToast]);

  // Fetch Cart Session
  const fetchCart = async (cartId: string = "CART-01") => {
    try {
      setIsLoading(true);
      const res = await fetch(`${djangoApiBase}/api/cart/session/?cart_id=${cartId}`);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data: CartSessionData = await res.json();
      setCart(data);
      setErrorMessage(null);
    } catch (err: any) {
      console.error("Failed to load cart:", err);
      setErrorMessage("Could not connect to Smart Cart backend. Verify Django is running on port 8000.");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch Members for Admin Tab
  const fetchMembers = async (search: string = "") => {
    try {
      const res = await fetch(`${djangoApiBase}/api/cart/members/?search=${encodeURIComponent(search)}`);
      if (res.ok) {
        const data = await res.json();
        setMembersList(data.members || []);
      }
    } catch (err) {
      console.error("Failed to load members:", err);
    }
  };

  useEffect(() => {
    fetchCart("CART-01");
    fetchMembers();
  }, []);

  // Handle Add Item to Cart
  const handleAddItem = async (sku: string) => {
    setIsScanning(true);
    try {
      const res = await fetch(`${djangoApiBase}/api/cart/scan/?cart_id=${cart?.cartId || "CART-01"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku }),
      });
      if (!res.ok) throw new Error("Item scan failed");
      const updatedCart: CartSessionData = await res.json();
      setCart(updatedCart);
      const itemName = updatedCart.lastScanned?.name || sku;
      setLastScannedFeedback(`Scanned: ${itemName}`);
      setSuccessToast(`Added ${itemName} to Cart`);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to scan item");
    } finally {
      setIsScanning(false);
    }
  };

  // Handle uploading an image or file to test backend AI Vision analysis
  const handleImageVisionScan = async (file: File) => {
    setIsCapturingVision(true);
    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch(`${djangoApiBase}/api/cart/scan/?cart_id=${cart?.cartId || "CART-01"}`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Vision scan failed");
      }

      const updatedCart: CartSessionData = await res.json();
      setCart(updatedCart);

      const scanned = (updatedCart as any).lastScanned;
      if (scanned) {
        setLatestVisionResult({
          productName: scanned.name,
          sku: scanned.sku,
          confidence: scanned.confidence || 95.0,
          method: scanned.method || "AI Vision Signature",
          timestamp: new Date().toLocaleTimeString(),
        });
        setLastScannedFeedback(`AI Vision Identified: ${scanned.name}`);
        setSuccessToast(`AI Vision Detected: ${scanned.name} (${scanned.confidence || 95}%)`);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to analyze image with AI");
    } finally {
      setIsCapturingVision(false);
    }
  };

  // Wirelessly pull and analyze frame from ESP32-CAM (No wired connections, 100% Wi-Fi)
  const handleWirelessCapture = async () => {
    setIsCapturingVision(true);
    try {
      const res = await fetch(`${djangoApiBase}/api/cart/wireless-capture/?cart_id=${cart?.cartId || "CART-01"}&esp32_ip=${encodeURIComponent(esp32Ip)}`, {
        method: "POST",
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Wireless capture failed");
      }
      const updatedCart: CartSessionData = await res.json();
      setCart(updatedCart);
      const scanned = (updatedCart as any).lastScanned;
      if (scanned) {
        setLatestVisionResult({
          productName: scanned.name,
          sku: scanned.sku,
          confidence: scanned.confidence || 98.0,
          method: scanned.method || "Wireless AI Vision",
          timestamp: new Date().toLocaleTimeString(),
        });
        setLastScannedFeedback(`Wireless Scanned: ${scanned.name}`);
        setSuccessToast(`Wireless Detected: ${scanned.name} (₹${scanned.price})`);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to wirelessly capture from ESP32");
    } finally {
      setIsCapturingVision(false);
    }
  };

  // Handle Remove / Decrement Item
  const handleRemoveItem = async (itemId: number) => {
    try {
      const res = await fetch(`${djangoApiBase}/api/cart/items/?cart_id=${cart?.cartId || "CART-01"}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: itemId }),
      });
      if (res.ok) {
        const updated = await res.json();
        setCart(updated);
        setSuccessToast("Item removed from cart");
      }
    } catch (err) {
      console.error("Failed to remove item:", err);
    }
  };

  // Handle Clear Cart
  const handleClearCart = async () => {
    try {
      const res = await fetch(`${djangoApiBase}/api/cart/session/?cart_id=${cart?.cartId || "CART-01"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear_cart" }),
      });
      if (res.ok) {
        const updated = await res.json();
        setCart(updated);
        setSuccessToast("Cart cleared");
      }
    } catch (err) {
      console.error("Failed to clear cart:", err);
    }
  };

  // Switch Active Member
  const handleSwitchMember = async (memberId: string | null) => {
    try {
      const res = await fetch(`${djangoApiBase}/api/cart/session/?cart_id=${cart?.cartId || "CART-01"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_member",
          member_id: memberId,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setCart(updated);
        const name = updated.member ? updated.member.name : "Guest Shopper";
        setSuccessToast(`Cart assigned to: ${name}`);
      }
    } catch (err) {
      console.error("Failed to switch member:", err);
    }
  };

  // Handle Checkout
  const handleCheckout = async () => {
    if (!cart || cart.items.length === 0) return;
    try {
      setIsLoading(true);
      const res = await fetch(`${djangoApiBase}/api/cart/checkout/?cart_id=${cart.cartId}`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setSuccessToast(`Order ${data.orderId} Completed! Saved to AI Learning Database.`);
        // Reload fresh empty cart
        await fetchCart(cart.cartId);
        await fetchMembers();
      }
    } catch (err) {
      console.error("Checkout failed:", err);
      setErrorMessage("Checkout failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Register New Member
  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberForm.name.trim()) return;
    setIsRegisteringMember(true);
    try {
      const res = await fetch(`${djangoApiBase}/api/cart/members/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          member_id: newMemberForm.memberId,
          name: newMemberForm.name,
          phone: newMemberForm.phone,
          email: newMemberForm.email,
          tier: newMemberForm.tier,
          loyalty_points: newMemberForm.loyaltyPoints,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to register member");
      }

      setSuccessToast(`Registered Member: ${newMemberForm.name} (${newMemberForm.tier})`);
      setNewMemberForm({
        memberId: `MEM-${Math.floor(100 + Math.random() * 900)}`,
        name: "",
        phone: "",
        email: "",
        tier: "Gold",
        loyaltyPoints: 50,
      });
      setActiveBottomTab("directory");
      await fetchMembers();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to register member");
    } finally {
      setIsRegisteringMember(false);
    }
  };

  // Quick preset Indian retail products to scan
  const demoScanProducts = [
    { sku: "MILK-AMUL-01", name: "Amul Taaza Milk", price: "₹54", icon: "water_drop", color: "bg-blue-50 text-blue-700 border-blue-200" },
    { sku: "BISC-PARLE-01", name: "Parle-G Biscuits", price: "₹25", icon: "bakery_dining", color: "bg-amber-50 text-amber-800 border-amber-200" },
    { sku: "BISC-GOODDAY-01", name: "Good Day Cookies", price: "₹40", icon: "cookie", color: "bg-yellow-50 text-yellow-800 border-yellow-200" },
    { sku: "NOOD-MAGGI-01", name: "Maggi Noodles", price: "₹50", icon: "ramen_dining", color: "bg-orange-50 text-orange-800 border-orange-200" },
    { sku: "TEA-TATAGOLD-01", name: "Tata Tea Gold", price: "₹310", icon: "emoji_food_beverage", color: "bg-emerald-50 text-emerald-800 border-emerald-200" },
    { sku: "ATTA-AASHIR-01", name: "Aashirvaad Atta", price: "₹275", icon: "grain", color: "bg-stone-50 text-stone-800 border-stone-200" },
    { sku: "OIL-FORTUNE-01", name: "Fortune Oil", price: "₹145", icon: "oil_barrel", color: "bg-amber-50 text-amber-900 border-amber-200" },
    { sku: "BUTTER-AMUL-01", name: "Amul Butter", price: "₹275", icon: "egg", color: "bg-yellow-50 text-yellow-900 border-yellow-200" },
    { sku: "CHOC-DAIRYMILK-01", name: "Dairy Milk Silk", price: "₹45", icon: "cake", color: "bg-purple-50 text-purple-800 border-purple-200" },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 z-50 bg-[#166534] text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 text-sm font-medium"
          >
            <span className="material-symbols-outlined text-base">check_circle</span>
            <span>{successToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Banner */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <span className="material-symbols-outlined text-red-600">error</span>
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-red-500 hover:text-red-700 font-bold">
            ×
          </button>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white border border-[#D9DDD8] rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-lg bg-[#202522] text-white flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">shopping_cart</span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold tracking-tight text-[#202522]">
                  Smart Cart Command
                </h1>
                <span className="bg-emerald-100 text-emerald-800 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-emerald-300">
                  ESP32-CAM Live
                </span>
              </div>
              <p className="text-xs text-[#58605b]">
                Real-time edge vision product scanning & personalized market basket recommendations
              </p>
            </div>
          </div>
        </div>

        {/* Cart Session & Member Info Selector */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Active Shopper Pill */}
          <div className="flex items-center bg-[#f9faf8] border border-[#D9DDD8] rounded-lg px-3 py-1.5">
            <div className="text-xs mr-2 text-[#58605b]">Active Shopper:</div>
            {cart?.member ? (
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-xs text-[#202522]">{cart.member.name}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                  cart.member.tier === "Platinum" ? "bg-purple-100 text-purple-800 border border-purple-200" :
                  cart.member.tier === "Gold" ? "bg-amber-100 text-amber-900 border border-amber-300" :
                  cart.member.tier === "Silver" ? "bg-slate-100 text-slate-800 border border-slate-300" :
                  "bg-stone-100 text-stone-700"
                }`}>
                  {cart.member.tier} ({cart.member.discountPercent}% OFF)
                </span>
                <button
                  onClick={() => handleSwitchMember(null)}
                  className="text-[10px] text-red-600 hover:underline ml-1 cursor-pointer"
                  title="Switch to Guest Shopper"
                >
                  (Guest)
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-xs text-[#58605b]">Guest Shopper</span>
                <span className="text-[10px] bg-gray-200 text-gray-700 px-1.5 rounded">No Member</span>
              </div>
            )}
          </div>

          {/* Member Quick Switch dropdown */}
          <select
            aria-label="Select Active Shopper Profile"
            value={cart?.member ? cart.member.memberId : "guest"}
            onChange={(e) => handleSwitchMember(e.target.value === "guest" ? null : e.target.value)}
            className="text-xs bg-white border border-[#D9DDD8] rounded-lg px-2.5 py-2 font-medium text-[#202522] focus:ring-1 focus:ring-[#202522] cursor-pointer"
          >
            <option value="guest">👤 Guest (Normal Customer)</option>
            {membersList.map((m) => (
              <option key={m.memberId} value={m.memberId}>
                ⭐ {m.name} ({m.tier} Member)
              </option>
            ))}
          </select>

          {/* Clear Cart Button */}
          <button
            onClick={handleClearCart}
            disabled={!cart || cart.items.length === 0}
            className="text-xs px-3 py-2 border border-[#D9DDD8] rounded-lg text-[#58605b] hover:bg-gray-50 disabled:opacity-40 cursor-pointer flex items-center space-x-1"
          >
            <span className="material-symbols-outlined text-sm">restart_alt</span>
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Grid: Left Column (Hardware & Virtual OLED & Simulator) + Right Column (Active Basket & AI Recommendations) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT COLUMN: Hardware Simulator & Virtual 1.3" OLED Screen (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Virtual 1.3" OLED Display Widget */}
          <div className="bg-[#181a19] border border-[#2b302d] rounded-xl p-5 text-white shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-xs font-mono font-bold tracking-wider text-emerald-400 uppercase">
                  1.3" OLED Screen (128×64)
                </span>
              </div>
              <div className="flex items-center bg-white/10 p-0.5 rounded text-[10px] font-mono">
                <button
                  onClick={() => setOledDisplayMode("cart")}
                  className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${oledDisplayMode === "cart" ? "bg-emerald-500 text-black font-bold" : "text-white/60 hover:text-white"}`}
                >
                  Cart
                </button>
                <button
                  onClick={() => setOledDisplayMode("voice")}
                  className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${oledDisplayMode === "voice" ? "bg-emerald-500 text-black font-bold" : "text-white/60 hover:text-white"}`}
                >
                  Voice Chat
                </button>
              </div>
            </div>

            {/* Simulated Monochrome OLED Glass Bezel */}
            <div className="bg-[#050806] border-4 border-[#262c28] rounded-lg p-4 font-mono shadow-inner min-h-[170px] flex flex-col justify-between relative">
              {/* Scanline / Pixel Grid Effect */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.35)_50%)] bg-[length:100%_4px] pointer-events-none rounded"></div>

              {oledDisplayMode === "voice" && voiceOledLines ? (
                <>
                  {/* OLED Voice Chat Header */}
                  <div className="bg-[#34d399] text-black px-1.5 py-0.5 text-xs font-black tracking-wide rounded-xs uppercase flex justify-between">
                    <span>{voiceOledLines.line1}</span>
                    <span className="text-[9px] font-semibold opacity-80">VOICE</span>
                  </div>

                  {/* Customer Voice Query */}
                  <div className="text-emerald-300 font-bold text-xs tracking-tight my-1 truncate">
                    {voiceOledLines.line2}
                  </div>

                  {/* AI Assistant Answer */}
                  <div className="text-emerald-200 text-xs py-1 border-t border-emerald-900/50 font-semibold truncate">
                    {voiceOledLines.line3}
                  </div>

                  {/* OLED Line 4 Ticker */}
                  <div className="bg-emerald-950/60 border border-emerald-800/40 rounded px-1.5 py-1 text-[10px] text-emerald-300 truncate">
                    {voiceOledLines.line4}
                  </div>
                </>
              ) : (
                <>
                  {/* OLED Line 1 (Header with inverted bar look) */}
                  <div className="bg-[#34d399] text-black px-1.5 py-0.5 text-xs font-black tracking-wide rounded-xs uppercase flex justify-between">
                    <span>{cart?.oled?.line1 || "CART #01 [READY]"}</span>
                    <span className="text-[9px] font-semibold opacity-80">128x64</span>
                  </div>

                  {/* OLED Line 2 (Last item scanned) */}
                  <div className="text-emerald-300 font-bold text-sm tracking-tight my-2">
                    {cart?.oled?.line2 || "READY TO SCAN"}
                  </div>

                  {/* OLED Line 3 (Total & Count) */}
                  <div className="text-emerald-400/90 text-xs flex justify-between items-center py-1 border-t border-emerald-900/50">
                    <span>{cart?.oled?.line3 || "TOT: ₹0.00 (0 items)"}</span>
                    <span className="text-[10px] text-emerald-500">Wi-Fi OK</span>
                  </div>

                  {/* OLED Line 4 (Dynamic Recommendations Ticker) */}
                  <div className="bg-emerald-950/60 border border-emerald-800/40 rounded px-1.5 py-1 text-[11px] text-emerald-200 truncate flex items-center space-x-1">
                    <span className="text-emerald-400 font-black">»</span>
                    <span className="font-semibold tracking-wide">
                      {cart?.oled?.line4 || "REC: MILK -> PARLE-G"}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Hardware Status Indicators & Live Stream Controls */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 flex items-center bg-white/5 px-2.5 py-1.5 rounded border border-white/10 text-xs font-mono">
                  <span className="text-white/60 mr-2 text-[11px]">ESP32 IP:</span>
                  <input
                    type="text"
                    value={esp32Ip}
                    onChange={(e) => setEsp32Ip(e.target.value.trim())}
                    className="bg-transparent text-emerald-400 font-bold w-full outline-hidden text-xs"
                    placeholder="10.70.52.191"
                  />
                </div>
                <button
                  onClick={() => setIsLiveStreamActive(!isLiveStreamActive)}
                  className={`px-3 py-1.5 rounded text-xs font-bold font-mono transition-all cursor-pointer flex items-center space-x-1 ${
                    isLiveStreamActive
                      ? "bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30"
                      : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30"
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">
                    {isLiveStreamActive ? "videocam_off" : "videocam"}
                  </span>
                  <span>{isLiveStreamActive ? "Hide Feed" : "View Camera"}</span>
                </button>
              </div>

              {/* Live MJPEG Stream Viewfinder for testing */}
              {isLiveStreamActive && (
                <div className="rounded-lg overflow-hidden border border-emerald-500/40 bg-black relative">
                  <div className="absolute top-2 left-2 z-10 bg-black/70 px-2 py-0.5 rounded text-[10px] font-mono text-emerald-400 flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                    <span>LIVE STREAM: http://{esp32Ip}/stream</span>
                  </div>
                  <img
                    src={`http://${esp32Ip}/stream`}
                    alt="ESP32-CAM Live Stream"
                    className="w-full h-48 object-cover bg-black"
                    onError={(e) => {
                      (e.target as any).src = "";
                      (e.target as any).alt = "Connecting to ESP32-CAM stream at " + esp32Ip + "... (Check Wi-Fi and power)";
                    }}
                  />
                  <div className="p-2 bg-[#121513] flex justify-between items-center">
                    <span className="text-[10px] text-white/60 font-mono">Real-time OV2640 Lens View</span>
                    <button
                      onClick={handleWirelessCapture}
                      disabled={isCapturingVision}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded text-xs font-bold cursor-pointer flex items-center space-x-1"
                    >
                      <span className="material-symbols-outlined text-sm">wifi</span>
                      <span>{isCapturingVision ? "Analyzing..." : "Snap & Scan with AI"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AI Vision Inspector (Shows what AI analyzed) */}
          <div className="bg-white border border-[#D9DDD8] rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className="material-symbols-outlined text-base text-[#166534]">lens_blur</span>
                <h2 className="text-xs font-bold tracking-tight text-[#202522] uppercase">
                  AI Product Vision Inspector
                </h2>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                Auto-Detection
              </span>
            </div>

            <p className="text-xs text-[#58605b] mb-3">
              The camera frame is analyzed by the backend to identify which product was picked and trigger recommendations:
            </p>

            {/* Test with photo upload / phone camera */}
            <div className="flex items-center space-x-2 mb-3">
              <label className="flex-1 bg-[#f9faf8] hover:bg-[#f0f2ef] border border-dashed border-[#D9DDD8] rounded-lg p-2 text-center cursor-pointer transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageVisionScan(file);
                  }}
                />
                <div className="flex items-center justify-center space-x-1 text-xs text-[#202522] font-semibold">
                  <span className="material-symbols-outlined text-sm">upload_file</span>
                  <span>Upload / Snap Photo to Test AI</span>
                </div>
              </label>

              <button
                onClick={handleWirelessCapture}
                disabled={isCapturingVision}
                className="bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1 whitespace-nowrap shadow-xs"
                title="Wirelessly takes a photo from the ESP32-CAM via Wi-Fi and analyzes it with local AI"
              >
                <span className="material-symbols-outlined text-sm">wifi</span>
                <span>{isCapturingVision ? "Analyzing..." : "Wireless Wi-Fi Scan"}</span>
              </button>
            </div>

            {/* Latest Vision Result Card */}
            {latestVisionResult ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-900 flex items-center space-x-1">
                    <span className="material-symbols-outlined text-sm text-emerald-700">check_circle</span>
                    <span>AI Recognized: {latestVisionResult.productName}</span>
                  </span>
                  <span className="font-mono font-bold text-emerald-800 bg-white px-1.5 py-0.5 rounded border border-emerald-200">
                    {latestVisionResult.confidence}% Conf
                  </span>
                </div>
                <div className="text-[11px] text-emerald-800 flex justify-between">
                  <span>Method: <strong>{latestVisionResult.method}</strong></span>
                  <span className="text-emerald-700 font-mono">SKU: {latestVisionResult.sku}</span>
                </div>
                <div className="text-[11px] text-emerald-900 pt-1 border-t border-emerald-200">
                  ✨ <strong>AI Recommendation Triggered:</strong> Suggesting pairings based on {cart?.member ? `${cart.member.name}'s history + store trends` : "previous shopper trends"}!
                </div>
              </div>
            ) : (
              <div className="bg-[#f9faf8] border border-[#D9DDD8] rounded-lg p-3 text-xs text-[#58605b] text-center">
                Aim the camera at a product (e.g. Milk) and press the button on the ESP32 (or click <strong>ESP32 Scan</strong> above).
              </div>
            )}
          </div>

          {/* AI Voice Assistant & OLED Chat Widget */}
          <div className="bg-white border border-[#D9DDD8] rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className="material-symbols-outlined text-base text-blue-600">mic</span>
                <h2 className="text-xs font-bold tracking-tight text-[#202522] uppercase">
                  Voice Assistant & 1.3" OLED Chat
                </h2>
              </div>
              <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded">
                Local STT Model
              </span>
            </div>

            <p className="text-xs text-[#58605b] mb-3">
              Speak into the microphone to ask about product locations, prices, cart totals, or recommendations:
            </p>

            {/* Microphone Recording Button & Text Input */}
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={handleToggleVoiceRecord}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap shadow-xs ${
                  isRecordingVoice
                    ? "bg-red-600 hover:bg-red-700 text-white animate-pulse"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
                title={isRecordingVoice ? "Click to stop recording and send" : "Click to speak into microphone"}
              >
                <span className="material-symbols-outlined text-base">
                  {isRecordingVoice ? "mic_off" : "mic"}
                </span>
                <span>{isRecordingVoice ? "Listening..." : "Speak Query"}</span>
              </button>

              <div className="flex-1 flex items-center bg-[#f9faf8] border border-[#D9DDD8] rounded-lg px-2 py-1">
                <input
                  type="text"
                  value={voiceInputText}
                  onChange={(e) => setVoiceInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSendVoiceQuery();
                  }}
                  placeholder="Ask: 'Where is Amul Milk?' or 'Cart total?'"
                  className="bg-transparent text-xs text-[#202522] w-full outline-hidden"
                />
                <button
                  onClick={() => handleSendVoiceQuery()}
                  className="text-blue-600 hover:text-blue-800 p-1 cursor-pointer"
                  title="Send text query"
                >
                  <span className="material-symbols-outlined text-sm">send</span>
                </button>
              </div>
            </div>

            {/* Quick Voice Chips */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {[
                "Where is Amul Milk?",
                "How much is Parle-G?",
                "What is my cart total?",
                "Recommend pairings",
                "What is my discount?",
              ].map((query) => (
                <button
                  key={query}
                  onClick={() => handleSendVoiceQuery(query)}
                  className="text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-800 px-2 py-1 rounded-full cursor-pointer transition-colors"
                >
                  💬 {query}
                </button>
              ))}
            </div>

            {/* Chat Messages Container */}
            <div className="bg-[#f9faf8] border border-[#D9DDD8] rounded-lg p-3 max-h-48 overflow-y-auto space-y-2 text-xs">
              {voiceMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${
                    msg.sender === "shopper" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-1.5 ${
                      msg.sender === "shopper"
                        ? "bg-blue-600 text-white rounded-br-none"
                        : "bg-white border border-[#D9DDD8] text-[#202522] rounded-bl-none shadow-xs"
                    }`}
                  >
                    <div className="font-semibold text-[10px] opacity-75 mb-0.5">
                      {msg.sender === "shopper" ? "🗣️ You (Voice / Query)" : "🤖 Retail Assistant"}
                    </div>
                    <div>{msg.text}</div>
                  </div>
                  <span className="text-[9px] text-gray-400 mt-0.5 px-1">{msg.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Barcode / Vision Product Scanner Simulator */}
          <div className="bg-white border border-[#D9DDD8] rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className="material-symbols-outlined text-base text-[#202522]">photo_camera</span>
                <h2 className="text-xs font-bold tracking-tight text-[#202522] uppercase">
                  Hardware Scanner Simulator
                </h2>
              </div>
              <span className="text-[10px] text-[#58605b]">Click to trigger ESP32 vision</span>
            </div>

            <p className="text-xs text-[#58605b] mb-3">
              Simulate customer placing items into the smart cart or camera capturing shelf tags:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {demoScanProducts.map((p) => (
                <button
                  key={p.sku}
                  onClick={() => handleAddItem(p.sku)}
                  disabled={isScanning}
                  className={`p-2.5 rounded-lg border text-left transition-all hover:shadow-xs cursor-pointer flex flex-col justify-between ${p.color}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="material-symbols-outlined text-lg">{p.icon}</span>
                    <span className="text-[9px] font-bold opacity-60 font-mono">{p.sku.split("-")[0]}</span>
                  </div>
                  <div className="text-xs font-bold truncate">{p.name}</div>
                  <div className="text-[10px] opacity-75 mt-0.5">+ Add to Cart</div>
                </button>
              ))}
            </div>

            {lastScannedFeedback && (
              <div className="mt-3 p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded text-xs flex items-center space-x-1.5">
                <span className="material-symbols-outlined text-sm">qr_code_scanner</span>
                <span>{lastScannedFeedback}</span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Active Cart Basket & AI Recommendations (7 cols) */}
        <div className="lg:col-span-7 space-y-6">

          {/* Active Cart Basket */}
          <div className="bg-white border border-[#D9DDD8] rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#D9DDD8] mb-4">
              <div className="flex items-center space-x-2">
                <span className="material-symbols-outlined text-xl text-[#202522]">shopping_basket</span>
                <h2 className="text-sm font-bold text-[#202522] tracking-tight uppercase">
                  Current Basket ({cart?.itemCount || 0} items)
                </h2>
              </div>
              <span className="text-xs font-medium text-[#58605b]">
                Cart ID: <strong className="text-[#202522]">{cart?.cartId || "CART-01"}</strong>
              </span>
            </div>

            {/* Cart Items List */}
            {cart?.items && cart.items.length > 0 ? (
              <div className="divide-y divide-[#D9DDD8] max-h-[260px] overflow-y-auto pr-1">
                {cart.items.map((item) => (
                  <div key={item.id} className="py-2.5 flex items-center justify-between group">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded bg-[#f0f2ef] flex items-center justify-center text-[#202522]">
                        <span className="material-symbols-outlined text-sm">inventory_2</span>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#202522]">{item.name}</div>
                        <div className="text-[11px] text-[#58605b]">
                          {item.shelfLocation} • ${item.price.toFixed(2)} each
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className="text-xs font-mono font-semibold text-[#58605b]">
                        Qty: <strong className="text-[#202522]">{item.quantity}</strong>
                      </span>
                      <span className="text-xs font-mono font-bold text-[#202522] min-w-[50px] text-right">
                        ${item.lineTotal.toFixed(2)}
                      </span>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-[#58605b] hover:text-red-600 p-1 cursor-pointer transition-colors"
                        title="Remove item"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border-2 border-dashed border-[#D9DDD8] rounded-lg">
                <span className="material-symbols-outlined text-4xl text-[#58605b]/40">shopping_cart</span>
                <p className="text-xs font-medium text-[#58605b] mt-1">
                  Cart is currently empty. Scan items using the buttons on the left or ESP32-CAM.
                </p>
              </div>
            )}

            {/* Financial Summary & Checkout */}
            {cart && cart.items.length > 0 && (
              <div className="mt-4 pt-3 border-t border-[#D9DDD8] space-y-1.5">
                <div className="flex justify-between text-xs text-[#58605b]">
                  <span>Subtotal:</span>
                  <span className="font-mono">${cart.subtotal.toFixed(2)}</span>
                </div>

                {cart.member && cart.discountAmount > 0 && (
                  <div className="flex justify-between text-xs text-emerald-700 font-medium">
                    <span>
                      {cart.member.tier} Member Discount ({cart.discountPercent}%):
                    </span>
                    <span className="font-mono">-${cart.discountAmount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between items-baseline pt-2 border-t border-[#D9DDD8]">
                  <span className="text-sm font-bold text-[#202522]">Total Due:</span>
                  <span className="text-xl font-bold font-mono text-[#202522]">
                    ${cart.total.toFixed(2)}
                  </span>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={isLoading}
                  className="w-full mt-3 bg-[#202522] hover:bg-black text-white py-2.5 px-4 rounded-lg font-bold text-xs tracking-wide transition-all shadow-xs cursor-pointer flex items-center justify-center space-x-2"
                >
                  <span className="material-symbols-outlined text-base">point_of_sale</span>
                  <span>Complete Checkout & Learn Basket Patterns</span>
                </button>
              </div>
            )}
          </div>

          {/* AI Recommendation Engine Rail */}
          <div className="bg-white border border-[#D9DDD8] rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="material-symbols-outlined text-emerald-700">psychology</span>
                <h2 className="text-sm font-bold text-[#202522] tracking-tight uppercase">
                  Smart Recommendations
                </h2>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                Market Basket AI
              </span>
            </div>

            {/* Explanation / Mode Banner */}
            <div className="mb-4 bg-[#f9faf8] border border-[#D9DDD8] rounded-lg p-2.5 flex items-center space-x-2 text-xs">
              <span className="material-symbols-outlined text-sm text-[#166534]">insights</span>
              <div className="flex-1 text-[11px] text-[#58605b]">
                <strong className="text-[#202522]">Logic Mode: </strong>
                {cart?.recommendations?.modeLabel || "Analyzing aggregate customer baskets..."}
              </div>
            </div>

            {/* Recommendation Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {cart?.recommendations?.recommendations && cart.recommendations.recommendations.length > 0 ? (
                cart.recommendations.recommendations.map((rec) => (
                  <div
                    key={rec.sku}
                    className="p-3.5 rounded-lg border border-[#D9DDD8] bg-white hover:border-[#202522] transition-all flex flex-col justify-between group shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                          rec.badge === "Personal Favorite"
                            ? "bg-purple-100 text-purple-800"
                            : rec.badge === "Customer Favorite"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-blue-50 text-blue-800"
                        }`}>
                          {rec.badge}
                        </span>
                        <span className="text-[11px] font-mono font-bold text-[#166534]">
                          {rec.score}% Match
                        </span>
                      </div>

                      <div className="font-bold text-xs text-[#202522] group-hover:text-black">
                        {rec.name}
                      </div>

                      <div className="text-[11px] text-[#58605b] mt-1 leading-snug">
                        {rec.reason}
                      </div>

                      <div className="text-[10px] text-gray-400 mt-1">
                        📍 {rec.shelfLocation || "Store Shelf"}
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-[#f0f2ef] flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-[#202522]">
                        ${rec.price.toFixed(2)}
                      </span>
                      <button
                        onClick={() => handleAddItem(rec.sku)}
                        className="bg-[#202522] group-hover:bg-emerald-700 text-white text-[11px] font-bold px-2.5 py-1 rounded transition-colors cursor-pointer flex items-center space-x-1"
                      >
                        <span>+ Add</span>
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-center py-6 text-xs text-[#58605b]">
                  Add items like <strong>Whole Milk</strong> or <strong>Coffee</strong> to see smart co-occurrence recommendations.
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* =========================================================================
          ADMIN MEMBERSHIP SYSTEM (Tab at Bottom)
          Requested by user: "for the there will be a membership system for now make it like admin can enter it in a new tab at bottom for it"
          ========================================================================= */}
      <div className="bg-white border border-[#D9DDD8] rounded-xl shadow-xs overflow-hidden mt-8">
        {/* Admin Section Header & Tab Controls */}
        <div className="p-4 sm:p-5 bg-[#fbfcfb] border-b border-[#D9DDD8] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-md bg-[#202522] text-white flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">badge</span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-[#202522] uppercase tracking-tight">
                  Admin Membership Center
                </h3>
                <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded">
                  Admin Portal
                </span>
              </div>
              <p className="text-xs text-[#58605b]">
                Register customer memberships, assign cards, and view personalized purchase history
              </p>
            </div>
          </div>

          {/* Sub-tabs switch */}
          <div className="flex items-center bg-white border border-[#D9DDD8] rounded-lg p-0.5">
            <button
              onClick={() => setActiveBottomTab("directory")}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer flex items-center space-x-1.5 ${
                activeBottomTab === "directory"
                  ? "bg-[#202522] text-white"
                  : "text-[#58605b] hover:text-[#202522]"
              }`}
            >
              <span className="material-symbols-outlined text-sm">groups</span>
              <span>Members Directory ({membersList.length})</span>
            </button>
            <button
              onClick={() => setActiveBottomTab("register")}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer flex items-center space-x-1.5 ${
                activeBottomTab === "register"
                  ? "bg-[#202522] text-white"
                  : "text-[#58605b] hover:text-[#202522]"
              }`}
            >
              <span className="material-symbols-outlined text-sm">person_add</span>
              <span>+ Register New Member</span>
            </button>
          </div>
        </div>

        {/* TAB 1: MEMBERS DIRECTORY */}
        {activeBottomTab === "directory" && (
          <div className="p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="relative max-w-sm w-full">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#58605b] text-base">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search by Name, Phone, or Member ID..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    fetchMembers(e.target.value);
                  }}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#D9DDD8] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#202522]"
                />
              </div>

              <div className="text-xs text-[#58605b]">
                Click <strong>"Set Active in Cart"</strong> to simulate shopping as that member.
              </div>
            </div>

            <div className="overflow-x-auto border border-[#D9DDD8] rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f9faf8] text-[#58605b] uppercase font-bold border-b border-[#D9DDD8]">
                  <tr>
                    <th className="px-4 py-3">Member ID</th>
                    <th className="px-4 py-3">Full Name</th>
                    <th className="px-4 py-3">Tier</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Discount</th>
                    <th className="px-4 py-3">Points</th>
                    <th className="px-4 py-3">Past Orders</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D9DDD8] bg-white">
                  {membersList.map((m) => (
                    <tr key={m.memberId} className="hover:bg-[#f9faf8] transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-[#202522]">
                        {m.memberId}
                      </td>
                      <td className="px-4 py-3 font-bold text-[#202522]">
                        {m.name}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          m.tier === "Platinum" ? "bg-purple-100 text-purple-800" :
                          m.tier === "Gold" ? "bg-amber-100 text-amber-800" :
                          m.tier === "Silver" ? "bg-slate-100 text-slate-700" :
                          "bg-stone-100 text-stone-700"
                        }`}>
                          {m.tier}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#58605b]">
                        <div>{m.phone || "—"}</div>
                        <div className="text-[10px] text-gray-400">{m.email}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-emerald-700 font-bold">
                        {m.discountPercent}% OFF
                      </td>
                      <td className="px-4 py-3 font-mono text-[#202522]">
                        {m.loyaltyPoints} pts
                      </td>
                      <td className="px-4 py-3 text-[#58605b]">
                        {m.ordersCount || 0} orders
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleSwitchMember(m.memberId)}
                          className={`text-xs px-2.5 py-1 rounded font-bold transition-colors cursor-pointer ${
                            cart?.member?.memberId === m.memberId
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : "bg-[#202522] text-white hover:bg-black"
                          }`}
                        >
                          {cart?.member?.memberId === m.memberId ? "✓ Active" : "Set Active in Cart"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: REGISTER NEW MEMBER FORM */}
        {activeBottomTab === "register" && (
          <div className="p-4 sm:p-6 max-w-2xl">
            <form onSubmit={handleCreateMember} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#202522] mb-1">
                    Member ID / Card Tag
                  </label>
                  <input
                    type="text"
                    required
                    value={newMemberForm.memberId}
                    onChange={(e) => setNewMemberForm({ ...newMemberForm, memberId: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-[#D9DDD8] rounded-lg font-mono focus:ring-1 focus:ring-[#202522]"
                    placeholder="e.g. MEM-105 or RFID Tag"
                  />
                  <span className="text-[10px] text-[#58605b]">Unique card or barcode identifier</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#202522] mb-1">
                    Full Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newMemberForm.name}
                    onChange={(e) => setNewMemberForm({ ...newMemberForm, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-[#D9DDD8] rounded-lg focus:ring-1 focus:ring-[#202522]"
                    placeholder="e.g. Emma Watson"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#202522] mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={newMemberForm.phone}
                    onChange={(e) => setNewMemberForm({ ...newMemberForm, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-[#D9DDD8] rounded-lg focus:ring-1 focus:ring-[#202522]"
                    placeholder="+91 98765 00000"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#202522] mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={newMemberForm.email}
                    onChange={(e) => setNewMemberForm({ ...newMemberForm, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-[#D9DDD8] rounded-lg focus:ring-1 focus:ring-[#202522]"
                    placeholder="customer@example.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#202522] mb-1">
                    Membership Tier
                  </label>
                  <select
                    value={newMemberForm.tier}
                    onChange={(e: any) => setNewMemberForm({ ...newMemberForm, tier: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-[#D9DDD8] rounded-lg bg-white focus:ring-1 focus:ring-[#202522]"
                  >
                    <option value="Bronze">Bronze (0% Discount)</option>
                    <option value="Silver">Silver (5% Discount)</option>
                    <option value="Gold">Gold (10% Discount)</option>
                    <option value="Platinum">Platinum (15% Discount)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#202522] mb-1">
                    Initial Loyalty Points
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newMemberForm.loyaltyPoints}
                    onChange={(e) => setNewMemberForm({ ...newMemberForm, loyaltyPoints: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs border border-[#D9DDD8] rounded-lg focus:ring-1 focus:ring-[#202522]"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center space-x-3">
                <button
                  type="submit"
                  disabled={isRegisteringMember}
                  className="bg-[#202522] hover:bg-black text-white px-5 py-2.5 rounded-lg text-xs font-bold tracking-wide transition-all shadow-xs cursor-pointer flex items-center space-x-1.5"
                >
                  <span className="material-symbols-outlined text-sm">how_to_reg</span>
                  <span>{isRegisteringMember ? "Registering..." : "Complete Member Registration"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveBottomTab("directory")}
                  className="text-xs px-4 py-2 border border-[#D9DDD8] rounded-lg text-[#58605b] hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
