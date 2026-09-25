import React, { useState, useRef, useEffect } from "react";
import { StockAnalysisResult, VisionAnalysisResult } from "../../types";

interface EdgeCameraViewProps {
  onSyncVisionData: (result: VisionAnalysisResult) => void;
}

export const EdgeCameraView: React.FC<EdgeCameraViewProps> = ({
  onSyncVisionData,
}) => {
  const [cameraSource, setCameraSource] = useState<"webcam" | "upload">(
    "webcam",
  );
  const [cameraPurpose, setCameraPurpose] = useState<"people" | "stock">(
    "people",
  );
  const [isStreaming, setIsStreaming] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [autoInference, setAutoInference] = useState(true);
  const [analysisResult, setAnalysisResult] =
    useState<VisionAnalysisResult | null>(null);
  const [stockResult, setStockResult] = useState<StockAnalysisResult | null>(
    null,
  );
  const [selectedZone, setSelectedZone] = useState("Checkout Area");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [uploadedMediaUrl, setUploadedMediaUrl] = useState<string | null>(null);
  const [uploadedMediaType, setUploadedMediaType] = useState<
    "image" | "video" | null
  >(null);
  const [isUploadedMediaReady, setIsUploadedMediaReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const uploadedVideoRef = useRef<HTMLVideoElement | null>(null);
  const uploadedImageRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inferenceGenerationRef = useRef(0);

  // Start real device camera (Phone or Laptop Webcam)
  const startRealCamera = async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "environment",
        },
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
      setCameraError(
        "Camera permission was denied or no camera was found. Select Upload image to analyze a local frame.",
      );
      setCameraSource("upload");
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

  useEffect(() => {
    setAnalysisResult(null);
    setStockResult(null);
    setIsUploadedMediaReady(false);
    inferenceGenerationRef.current += 1;
    const canvas = overlayCanvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
  }, [cameraSource, uploadedMediaUrl]);

  // Capture frame and run AI Vision inference
  const captureAndAnalyze = async () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);

    try {
      const inferenceGeneration = inferenceGenerationRef.current;
      let base64Image = "";

      if (cameraSource === "webcam" && videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Unable to prepare the camera frame.");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        base64Image = canvas.toDataURL("image/jpeg", 0.85);
      } else if (
        cameraSource === "upload" &&
        uploadedMediaUrl &&
        canvasRef.current
      ) {
        const media =
          uploadedMediaType === "video"
            ? uploadedVideoRef.current
            : uploadedImageRef.current;
        if (!media) throw new Error("The uploaded media is still loading.");
        const mediaWidth =
          "videoWidth" in media ? media.videoWidth : media.naturalWidth;
        const mediaHeight =
          "videoHeight" in media ? media.videoHeight : media.naturalHeight;
        if (!mediaWidth || !mediaHeight)
          throw new Error("The uploaded media is not ready.");
        const canvas = canvasRef.current;
        canvas.width = mediaWidth;
        canvas.height = mediaHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Unable to prepare the uploaded frame.");
        ctx.drawImage(media, 0, 0, canvas.width, canvas.height);
        base64Image = canvas.toDataURL("image/jpeg", 0.85);
      } else {
        throw new Error("Start the camera or choose an image/video file.");
      }

      const response = await fetch(
        `http://127.0.0.1:8000/api/ai/${cameraPurpose === "people" ? "vision-analysis" : "stock-analysis"}/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: base64Image,
            contextZone: selectedZone,
            purpose: cameraPurpose,
          }),
        },
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || "Local vision analysis failed");
      }

      if (inferenceGeneration !== inferenceGenerationRef.current) return;
      if (cameraPurpose === "people") {
        const result: VisionAnalysisResult = await response.json();
        setAnalysisResult(result);
        setStockResult(null);
        drawBoundingBoxes(result.detectedPeople);
        onSyncVisionData(result);
      } else {
        const result: StockAnalysisResult = await response.json();
        setStockResult(result);
        setAnalysisResult(null);
        drawBoundingBoxes(result.detectedProducts);
      }
    } catch (err) {
      console.error("AI Vision processing error:", err);
      setCameraError(
        err instanceof Error ? err.message : "Local vision analysis failed.",
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Draw overlay bounding boxes
  const drawBoundingBoxes = (
    people: {
      x: number;
      y: number;
      width: number;
      height: number;
      label: string;
      confidence: number;
    }[],
  ) => {
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
      ctx.fillText(
        `${p.label} ${Math.round(p.confidence * 100)}%`,
        x + 4,
        y - 6,
      );
    });
  };

  // Auto inference loop
  useEffect(() => {
    let cancelled = false;
    let timeout: number | undefined;
    const processNextFrame = async () => {
      if (cancelled) return;
      await captureAndAnalyze();
      if (!cancelled) timeout = window.setTimeout(processNextFrame, 100);
    };
    if (autoInference && cameraSource === "webcam" && isStreaming) {
      processNextFrame();
    }
    return () => {
      cancelled = true;
      if (timeout !== undefined) window.clearTimeout(timeout);
    };
  }, [autoInference, cameraSource, cameraPurpose, selectedZone, isStreaming]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedMediaUrl(URL.createObjectURL(file));
    setUploadedMediaType(file.type.startsWith("video/") ? "video" : "image");
    setIsUploadedMediaReady(false);
    setCameraSource("upload");
    setCameraError(null);
    e.target.value = "";
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
              Frames are processed by the local YOLO and ByteTrack service; raw
              images are not stored.
            </p>
          </div>
        </div>

        {/* Source Controls */}
        <div className="flex items-center space-x-2 flex-wrap justify-end">
          <button
            onClick={() => setCameraPurpose("people")}
            className={`px-3 py-1.5 text-[12px] font-bold rounded-md transition-colors ${cameraPurpose === "people" ? "bg-[#166534] text-white" : "bg-[#f9faf8] border border-[#D9DDD8] text-[#58605b]"}`}
          >
            People tracking
          </button>
          <button
            onClick={() => setCameraPurpose("stock")}
            className={`px-3 py-1.5 text-[12px] font-bold rounded-md transition-colors ${cameraPurpose === "stock" ? "bg-[#B45309] text-white" : "bg-[#f9faf8] border border-[#D9DDD8] text-[#58605b]"}`}
          >
            Stock monitoring
          </button>
          <button
            onClick={() => setCameraSource("webcam")}
            className={`px-3 py-1.5 text-[12px] font-bold rounded-md transition-colors flex items-center gap-1.5 ${
              cameraSource === "webcam"
                ? "bg-[#166534] text-white"
                : "bg-[#f9faf8] border border-[#D9DDD8] text-[#58605b] hover:text-[#202522]"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">
              videocam
            </span>
            Live camera
          </button>
          <button
            onClick={() => setCameraSource("upload")}
            className={`px-3 py-1.5 text-[12px] font-bold rounded-md transition-colors ${
              cameraSource === "upload"
                ? "bg-[#202522] text-white"
                : "bg-[#f9faf8] border border-[#D9DDD8] text-[#58605b] hover:text-[#202522]"
            }`}
          >
            Image / Video
          </button>
        </div>
      </div>

      {cameraError && (
        <div className="p-3 bg-[#991B1B]/10 border border-[#991B1B]/20 text-[#991B1B] text-[12px] font-medium rounded-md flex items-center justify-between">
          <span>{cameraError}</span>
          <button
            onClick={() => setCameraError(null)}
            className="font-bold underline"
          >
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
                  {cameraSource === "webcam"
                    ? cameraPurpose === "people"
                      ? "LIVE PEOPLE CAMERA"
                      : "LIVE STOCK CAMERA"
                    : uploadedMediaType === "video"
                      ? "LOCAL VIDEO"
                      : "LOCAL IMAGE"}
                </span>
              </div>
              <div className="flex items-center space-x-2 text-[11px] font-mono text-gray-300">
                <span>
                  {analysisResult
                    ? `LATENCY: ${analysisResult.latencyMs}ms`
                    : "AWAITING INFERENCE"}
                </span>
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
              ) : uploadedMediaUrl && uploadedMediaType === "video" ? (
                <video
                  ref={uploadedVideoRef}
                  src={uploadedMediaUrl}
                  controls
                  muted
                  playsInline
                  onLoadedMetadata={() => setIsUploadedMediaReady(true)}
                  className="w-full h-full object-contain"
                />
              ) : uploadedMediaUrl ? (
                <img
                  ref={uploadedImageRef}
                  src={uploadedMediaUrl}
                  alt="Uploaded retail frame"
                  onLoad={() => setIsUploadedMediaReady(true)}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center text-gray-300 px-6">
                  <span className="material-symbols-outlined text-[42px]">
                    upload_file
                  </span>
                  <p className="text-[13px] mt-2">
                    Choose an image or video below to run edge inference.
                  </p>
                </div>
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
                      <div className="text-[13px] font-bold">
                        Edge AI Model Processing...
                      </div>
                      <div className="text-[11px] text-gray-300">
                        Detecting persons & inventory facings
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Stream Controls Bar */}
            <div className="p-3 bg-[#191c1b] border-t border-[#333] flex flex-wrap items-center justify-between gap-3 text-white">
              {/* Upload Snapshot input */}
              <label className="cursor-pointer px-2.5 py-1 bg-[#333] hover:bg-[#444] rounded text-[11px] font-semibold text-gray-200 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">
                  upload_file
                </span>
                Choose Image / Video
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {/* Inference Actions */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setAutoInference(!autoInference)}
                  disabled={cameraSource !== "webcam" || !isStreaming}
                  className={`px-3 py-1 text-[11px] font-bold rounded flex items-center gap-1.5 transition-colors ${
                    autoInference
                      ? "bg-emerald-600 text-white"
                      : "bg-[#333] text-gray-300"
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {autoInference ? "sync" : "sync_disabled"}
                  </span>
                  Live tracking
                </button>

                <button
                  id="run-ai-inference-btn"
                  onClick={captureAndAnalyze}
                  disabled={
                    isAnalyzing ||
                    (cameraSource === "webcam"
                      ? !isStreaming
                      : !uploadedMediaUrl || !isUploadedMediaReady)
                  }
                  className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-[12px] rounded transition-colors flex items-center gap-1 shadow-sm disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    play_arrow
                  </span>
                  {cameraPurpose === "people"
                    ? "Track people now"
                    : "Scan stock now"}
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
                <span className="material-symbols-outlined text-[18px] text-emerald-700">
                  analytics
                </span>
                Computer Vision Metrics
              </h4>
            
            </div>

            {stockResult ? (
              <div className="space-y-4 text-[13px]">
                <div className="p-3 bg-[#f9faf8] border border-[#D9DDD8] rounded-md flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-bold uppercase text-[#58605b]">
                      Products detected
                    </div>
                    <div className="text-[24px] font-bold text-[#202522] font-mono leading-tight">
                      {stockResult.productCount}
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-[28px] text-[#B45309]">
                    inventory_2
                  </span>
                </div>
                <div className="p-3 bg-[#f9faf8] border border-[#D9DDD8] rounded-md text-[12px] text-[#58605b]">
                  Retail detector scan completed in {stockResult.latencyMs}ms.
                  Configure shelf regions to calculate availability and
                  replenishment status.
                </div>
              </div>
            ) : analysisResult ? (
              <div className="space-y-4 text-[13px]">
                {/* Headcount Metric */}
                <div className="p-3 bg-[#f9faf8] border border-[#D9DDD8] rounded-md flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-bold uppercase text-[#58605b]">
                      Detected Headcount
                    </div>
                    <div className="text-[24px] font-bold text-[#202522] font-mono leading-tight">
                      {analysisResult.crowdCount} persons
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-[28px] text-[#202522]">
                    groups
                  </span>
                </div>

                <div className="p-3 bg-[#f9faf8] border border-[#D9DDD8] rounded-md space-y-1.5">
                  <div className="text-[11px] font-bold text-[#58605b]">
                    Shelf Analysis
                  </div>
                  {analysisResult.shelfAnalysis.stockLevelPercent === null ? (
                    <div className="text-[12px] text-[#58605b]">
                      {analysisResult.shelfAnalysis.facingCondition}
                    </div>
                  ) : (
                    <div className="text-[16px] font-bold text-[#202522]">
                      {analysisResult.shelfAnalysis.stockLevelPercent}% full
                    </div>
                  )}
                </div>

                {/* Queue Length Estimation */}
                <div className="p-3 bg-[#f9faf8] border border-[#D9DDD8] rounded-md flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-bold uppercase text-[#58605b]">
                      Queue Line Estimation
                    </div>
                    <div className="text-[16px] font-bold text-[#202522]">
                      {analysisResult.queueEstimation.queueLength === null
                        ? "Checkout ROI not configured"
                        : `${analysisResult.queueEstimation.queueLength} in line (Est. ${analysisResult.queueEstimation.estimatedWaitMinutes}m wait)`}
                    </div>
                  </div>
                </div>

                {/* Operational Advice */}
                <div className="p-3 bg-[#202522] text-white rounded-md space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">
                      psychology
                    </span>
                    Operational Recommendation
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
                <p className="text-[12px]">
                  Click "Run AI Vision Analysis" to process current camera
                  frame.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
