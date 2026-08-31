import React, { useState, useRef, useEffect } from "react";
import { VisionAnalysisResult } from "../../types";

interface EdgeCameraViewProps {
  onSyncVisionData: (result: VisionAnalysisResult) => void;
}

export const EdgeCameraView: React.FC<EdgeCameraViewProps> = ({ onSyncVisionData }) => {
  const [cameraSource, setCameraSource] = useState<"webcam" | "simulated" | "upload">("simulated");
  const [simulatedScene, setSimulatedScene] = useState<"checkout" | "produce" | "shelf" | "entrance">("checkout");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [autoInference, setAutoInference] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<VisionAnalysisResult | null>(null);
  const [selectedZone, setSelectedZone] = useState("Checkout Area");
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Simulated scenes images (high quality retail stock visuals)
  const sceneImages: Record<string, string> = {
    checkout: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&auto=format&fit=crop&q=80",
    produce: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop&q=80",
    shelf: "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800&auto=format&fit=crop&q=80",
    entrance: "https://images.unsplash.com/photo-1580913428023-02c695666d61?w=800&auto=format&fit=crop&q=80",
  };

  // Start real device camera (Phone or Laptop Webcam)
  const startRealCamera = async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsStreaming(true);
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      setCameraError("Camera permission denied or camera device not found. You can use Simulated Feed or Upload Photo.");
      setCameraSource("simulated");
    }
  };

  const stopRealCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  };

  useEffect(() => {
    if (cameraSource === "webcam") {
      startRealCamera();
    } else {
      stopRealCamera();
    }
    return () => {
      stopRealCamera();
    };
  }, [cameraSource]);

  // Capture frame and run AI Vision inference
  const captureAndAnalyze = async () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);

    try {
      let base64Image = "";

      if (cameraSource === "webcam" && videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          base64Image = canvas.toDataURL("image/jpeg", 0.85);
        }
      } else {
        // Use simulated image
        const imgUrl = sceneImages[simulatedScene];
        const res = await fetch(imgUrl);
        const blob = await res.blob();
        base64Image = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }

      // Call server vision analysis API
      const response = await fetch("/api/ai/vision-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64Image,
          contextZone: selectedZone,
        }),
      });

      if (!response.ok) {
        throw new Error("Vision analysis failed");
      }

      const result: VisionAnalysisResult = await response.json();
      setAnalysisResult(result);
      drawBoundingBoxes(result.detectedPeople);
      onSyncVisionData(result);
    } catch (err) {
      console.error("AI Vision processing error:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Draw overlay bounding boxes
  const drawBoundingBoxes = (people: { x: number; y: number; width: number; height: number; label: string; confidence: number }[]) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    people.forEach((p) => {
      const x = p.x * canvas.width;
      const y = p.y * canvas.height;
      const w = p.width * canvas.width;
      const h = p.height * canvas.height;

      // Box
      ctx.strokeStyle = "#166534";
      ctx.lineWidth = 2.5;
      ctx.strokeRect(x, y, w, h);

      // Label background
      ctx.fillStyle = "#166534";
      ctx.fillRect(x, y - 20, Math.max(80, w * 0.8), 20);

      // Text
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px Inter, sans-serif";
      ctx.fillText(`${p.label} ${Math.round(p.confidence * 100)}%`, x + 4, y - 6);
    });
  };

  // Auto inference loop
  useEffect(() => {
    let interval: any;
    if (autoInference) {
      captureAndAnalyze();
      interval = setInterval(captureAndAnalyze, 5000);
    }
    return () => clearInterval(interval);
  }, [autoInference, cameraSource, simulatedScene, selectedZone]);

  // Handle image file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setIsAnalyzing(true);
      try {
        const response = await fetch("/api/ai/vision-analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: base64,
            contextZone: selectedZone,
          }),
        });
        const result: VisionAnalysisResult = await response.json();
        setAnalysisResult(result);
        drawBoundingBoxes(result.detectedPeople);
        onSyncVisionData(result);
      } catch (err) {
        console.error(err);
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Architecture Notice */}
      <div className="bg-white border border-[#D9DDD8] rounded-lg p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 bg-[#202522] rounded-md flex items-center justify-center text-white shrink-0">
            <span className="material-symbols-outlined text-[20px] text-emerald-400">
              center_focus_strong
            </span>
          </div>
          <div>
            <h3 className="text-[14px] font-bold text-[#202522]">
              Modular Edge-AI Camera Vision Pipeline (SIH 26179)
            </h3>
            <p className="text-[12px] text-[#58605b]">
              Decoupled edge layer: Swap between live mobile phone camera, webcam, RTSP stream, or simulated feeds.
            </p>
          </div>
        </div>

        {/* Source Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCameraSource("simulated")}
            className={`px-3 py-1.5 text-[12px] font-bold rounded-md transition-colors ${
              cameraSource === "simulated"
                ? "bg-[#202522] text-white"
                : "bg-[#f9faf8] border border-[#D9DDD8] text-[#58605b] hover:text-[#202522]"
            }`}
          >
            Simulated Streams
          </button>
          <button
            onClick={() => setCameraSource("webcam")}
            className={`px-3 py-1.5 text-[12px] font-bold rounded-md transition-colors flex items-center gap-1.5 ${
              cameraSource === "webcam"
                ? "bg-[#166534] text-white"
                : "bg-[#f9faf8] border border-[#D9DDD8] text-[#58605b] hover:text-[#202522]"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">videocam</span>
            Live Phone / Cam
          </button>
        </div>
      </div>

      {cameraError && (
        <div className="p-3 bg-[#991B1B]/10 border border-[#991B1B]/20 text-[#991B1B] text-[12px] font-medium rounded-md flex items-center justify-between">
          <span>{cameraError}</span>
          <button onClick={() => setCameraError(null)} className="font-bold underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid: Video Stream Box & AI Real-Time Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Camera & Visual Detection Canvas */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#202522] border border-[#202522] rounded-lg overflow-hidden relative shadow-md">
            {/* Camera Header Overlay */}
            <div className="absolute top-0 left-0 right-0 z-20 p-3 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between text-white">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                <span className="text-[12px] font-mono font-bold tracking-wider uppercase">
                  {cameraSource === "webcam" ? "DEVICE CAMERA [ACTIVE]" : `STREAM: ${simulatedScene.toUpperCase()}`}
                </span>
              </div>
              <div className="flex items-center space-x-2 text-[11px] font-mono text-gray-300">
                <span>FPS: 30</span>
                <span>•</span>
                <span>LATENCY: {analysisResult?.latencyMs || 18}ms</span>
              </div>
            </div>

            {/* Video View Container */}
            <div className="relative aspect-[16/9] w-full bg-black flex items-center justify-center">
              {cameraSource === "webcam" ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  src={sceneImages[simulatedScene]}
                  alt="Simulated Retail Camera Feed"
                  className="w-full h-full object-cover"
                />
              )}

              {/* Bounding Box Overlay Canvas */}
              <canvas
                ref={overlayCanvasRef}
                width={800}
                height={450}
                className="absolute inset-0 w-full h-full pointer-events-none z-10"
              />

              {/* Hidden Canvas for Frame Extraction */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Analyzing Spinner Overlay */}
              {isAnalyzing && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-30">
                  <div className="bg-[#202522] border border-[#D9DDD8] p-4 rounded-lg text-white flex items-center space-x-3 shadow-lg">
                    <span className="material-symbols-outlined text-[24px] animate-spin text-emerald-400">
                      autorenew
                    </span>
                    <div>
                      <div className="text-[13px] font-bold">Edge AI Model Processing...</div>
                      <div className="text-[11px] text-gray-300">Detecting persons & inventory facings</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Stream Controls Bar */}
            <div className="p-3 bg-[#191c1b] border-t border-[#333] flex flex-wrap items-center justify-between gap-3 text-white">
              {/* Scene Switcher if Simulated */}
              {cameraSource === "simulated" && (
                <div className="flex items-center space-x-1.5 text-[11px]">
                  <span className="text-gray-400">Scene:</span>
                  {(["checkout", "produce", "shelf", "entrance"] as const).map((sc) => (
                    <button
                      key={sc}
                      onClick={() => setSimulatedScene(sc)}
                      className={`px-2 py-1 rounded capitalize font-medium ${
                        simulatedScene === sc ? "bg-white text-black font-bold" : "bg-[#333] text-gray-300 hover:bg-[#444]"
                      }`}
                    >
                      {sc}
                    </button>
                  ))}
                </div>
              )}

              {/* Upload Snapshot input */}
              <label className="cursor-pointer px-2.5 py-1 bg-[#333] hover:bg-[#444] rounded text-[11px] font-semibold text-gray-200 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">upload_file</span>
                Upload Image
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {/* Inference Actions */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setAutoInference(!autoInference)}
                  className={`px-3 py-1 text-[11px] font-bold rounded flex items-center gap-1.5 transition-colors ${
                    autoInference ? "bg-emerald-600 text-white" : "bg-[#333] text-gray-300"
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {autoInference ? "sync" : "sync_disabled"}
                  </span>
                  Auto Loop (5s)
                </button>

                <button
                  id="run-ai-inference-btn"
                  onClick={captureAndAnalyze}
                  disabled={isAnalyzing}
                  className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-[12px] rounded transition-colors flex items-center gap-1 shadow-sm disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                  Run AI Vision Analysis
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Live AI Telemetry Result Panel */}
        <div className="space-y-4">
          <div className="bg-white border border-[#D9DDD8] rounded-lg p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#D9DDD8] pb-3">
              <h4 className="text-[14px] font-bold text-[#202522] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-emerald-700">analytics</span>
                Computer Vision Metrics
              </h4>
              <span className="text-[10px] font-mono bg-[#166534]/10 text-[#166534] px-1.5 py-0.5 rounded font-bold">
                Gemini 3.7 Vision
              </span>
            </div>

            {analysisResult ? (
              <div className="space-y-4 text-[13px]">
                {/* Headcount Metric */}
                <div className="p-3 bg-[#f9faf8] border border-[#D9DDD8] rounded-md flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-bold uppercase text-[#58605b]">Detected Headcount</div>
                    <div className="text-[24px] font-bold text-[#202522] font-mono leading-tight">
                      {analysisResult.crowdCount} persons
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-[28px] text-[#202522]">groups</span>
                </div>

                {/* Shelf Availability Meter */}
                <div className="p-3 bg-[#f9faf8] border border-[#D9DDD8] rounded-md space-y-1.5">
                  <div className="flex justify-between text-[11px] font-bold text-[#58605b]">
                    <span>Shelf Fullness Level</span>
                    <span className="font-mono text-[#202522]">
                      {analysisResult.shelfAnalysis.stockLevelPercent}%
                    </span>
                  </div>
                  <div className="w-full bg-[#edeeec] rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-[#166534] h-2 rounded-full"
                      style={{ width: `${analysisResult.shelfAnalysis.stockLevelPercent}%` }}
                    ></div>
                  </div>
                  <div className="text-[11px] text-[#58605b]">
                    Condition: {analysisResult.shelfAnalysis.facingCondition}
                  </div>
                </div>

                {/* Queue Length Estimation */}
                <div className="p-3 bg-[#f9faf8] border border-[#D9DDD8] rounded-md flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-bold uppercase text-[#58605b]">Queue Line Estimation</div>
                    <div className="text-[16px] font-bold text-[#202522]">
                      {analysisResult.queueEstimation.queueLength} in line (Est. {analysisResult.queueEstimation.estimatedWaitMinutes}m wait)
                    </div>
                  </div>
                </div>

                {/* Operational Advice */}
                <div className="p-3 bg-[#202522] text-white rounded-md space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">psychology</span>
                    Live Operational Copilot
                  </div>
                  <p className="text-[12px] text-gray-200 leading-relaxed">
                    {analysisResult.operationalAdvice}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-[#58605b] space-y-2">
                <span className="material-symbols-outlined text-[36px] text-[#D9DDD8]">
                  linked_camera
                </span>
                <p className="text-[12px]">Click "Run AI Vision Analysis" to process current camera frame.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
