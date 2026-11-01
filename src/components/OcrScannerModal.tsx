"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Camera,
  UploadCloud,
  X,
  CheckCircle2,
  Sparkles,
  RotateCw,
  FileText,
  Car,
  User,
  Hash,
  AlertCircle,
  ScanLine,
} from "lucide-react";

export interface ScannedVehicleData {
  licensePlate?: string;
  vin?: string;
  make?: string;
  model?: string;
  year?: number | null;
  clientName?: string;
  clientPhone?: string;
  mileage?: number | string | null;
  documentType?: string;
}

interface OcrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (data: ScannedVehicleData) => void;
}

export const OcrScannerModal: React.FC<OcrScannerModalProps> = ({
  isOpen,
  onClose,
  onApply,
}) => {
  const [activeMode, setActiveMode] = useState<"camera" | "upload">("camera");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedResult, setScannedResult] = useState<ScannedVehicleData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera stream helper
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Start environment (rear) camera stream
  const startCamera = async () => {
    stopCamera();
    setCameraError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Камера не поддерживается вашим браузером");
        setActiveMode("upload");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.warn("Camera access failed:", err);
      setCameraError("Не удалось запустить камеру. Выберите режим загрузки фото с устройства.");
      setActiveMode("upload");
    }
  };

  useEffect(() => {
    if (isOpen && activeMode === "camera" && !previewImage) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, activeMode, previewImage]);

  if (!isOpen) return null;

  // Capture frame from active video element
  const handleSnapPhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setPreviewImage(dataUrl);
    stopCamera();
    processImageForOcr(dataUrl);
  };

  // Process chosen file from file input or drag-and-drop
  const handleFileChosen = (file: File) => {
    if (!file || !file.type.startsWith("image/")) {
      setErrorMessage("Пожалуйста, выберите файл изображения (JPG, PNG, WebP)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        setPreviewImage(dataUrl);
        processImageForOcr(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  // Call OCR vision API
  const processImageForOcr = async (base64Image: string) => {
    setIsScanning(true);
    setErrorMessage(null);
    setScannedResult(null);

    try {
      const res = await fetch("/api/scan-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64Image }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setScannedResult(json.data);
      } else {
        setErrorMessage(json.error || "Не удалось распознать документ. Попробуйте сделать более четкое фото.");
      }
    } catch (err: any) {
      console.error("Scan processing error:", err);
      setErrorMessage("Ошибка подключения к серверу распознавания");
    } finally {
      setIsScanning(false);
    }
  };

  const handleReset = () => {
    setPreviewImage(null);
    setScannedResult(null);
    setErrorMessage(null);
    if (activeMode === "camera") {
      startCamera();
    }
  };

  const handleConfirmApply = () => {
    if (scannedResult) {
      onApply(scannedResult);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="apple-sheet w-full max-w-xl bg-zinc-950/95 border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col text-white max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-zinc-900/50 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-600 text-white flex items-center justify-center shadow-lg shadow-rose-600/20">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-1.5">
                <span>Сканирование СТС / Авто</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/25">
                  AI Vision
                </span>
              </h3>
              <p className="text-[11px] text-zinc-400">
                Автоматическое заполнение заказ-наряда по фото
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher Tabs (Only when not viewing preview) */}
        {!previewImage && (
          <div className="px-5 pt-3 shrink-0 flex items-center space-x-2">
            <button
              type="button"
              onClick={() => {
                setActiveMode("camera");
                startCamera();
              }}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeMode === "camera"
                  ? "bg-rose-600 text-white shadow-md shadow-rose-600/20"
                  : "bg-white/[0.05] text-zinc-400 hover:text-white hover:bg-white/[0.08]"
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Камера в реальном времени</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveMode("upload");
                stopCamera();
              }}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeMode === "upload"
                  ? "bg-rose-600 text-white shadow-md shadow-rose-600/20"
                  : "bg-white/[0.05] text-zinc-400 hover:text-white hover:bg-white/[0.08]"
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              <span>Загрузить фото из файла</span>
            </button>
          </div>
        )}

        {/* Body Viewport */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* CAMERA LIVE STREAM MODE */}
          {!previewImage && activeMode === "camera" && (
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-4/3 flex items-center justify-center border border-white/10 shadow-inner group">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Viewfinder Target Guidelines */}
              <div className="absolute inset-8 border-2 border-dashed border-rose-500/70 rounded-2xl pointer-events-none flex flex-col items-center justify-between p-3">
                <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-[11px] font-semibold text-rose-300">
                  Поместите СТС или госномер в рамку
                </span>
                <span className="text-[10px] text-zinc-300 bg-black/50 px-2 py-0.5 rounded">
                  Убедитесь в хорошем освещении
                </span>
              </div>

              {/* Shutter Button */}
              <div className="absolute bottom-4 inset-x-0 flex items-center justify-center pointer-events-auto">
                <button
                  type="button"
                  onClick={handleSnapPhoto}
                  className="w-14 h-14 rounded-full border-4 border-white bg-rose-600 hover:bg-rose-500 active:scale-95 transition-all shadow-2xl flex items-center justify-center cursor-pointer"
                  title="Сделать снимок"
                >
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                </button>
              </div>

              {cameraError && (
                <div className="absolute inset-0 bg-black/90 p-6 flex flex-col items-center justify-center text-center space-y-3">
                  <AlertCircle className="w-8 h-8 text-rose-500" />
                  <p className="text-xs text-zinc-300 max-w-xs">{cameraError}</p>
                  <button
                    type="button"
                    onClick={() => setActiveMode("upload")}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold"
                  >
                    Перейти к загрузке файла
                  </button>
                </div>
              )}
            </div>
          )}

          {/* FILE UPLOAD MODE */}
          {!previewImage && activeMode === "upload" && (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files?.[0]) {
                  handleFileChosen(e.dataTransfer.files[0]);
                }
              }}
              className="rounded-2xl border-2 border-dashed border-white/20 hover:border-rose-500/60 bg-white/[0.02] hover:bg-rose-500/5 transition-all p-8 flex flex-col items-center justify-center text-center cursor-pointer space-y-3 min-h-[260px]"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleFileChosen(e.target.files[0]);
                  }
                }}
              />
              <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center shadow-lg">
                <UploadCloud className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-bold text-white">
                  Нажмите для выбора фото или перетащите файл
                </div>
                <div className="text-xs text-zinc-400 max-w-xs">
                  Поддерживаются фото СТС, ПТС, фото переда автомобиля с госномером или одометра (JPG, PNG, WebP)
                </div>
              </div>
              <div className="px-3.5 py-1.5 rounded-full bg-white/10 text-[11px] font-semibold text-zinc-200">
                📸 Камера смартфона / Галерея
              </div>
            </div>
          )}

          {/* CAPTURED PREVIEW & SCANNING RESULTS */}
          {previewImage && (
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden bg-black/60 border border-white/15 max-h-56 flex items-center justify-center">
                <img
                  src={previewImage}
                  alt="Captured document"
                  className="w-full h-auto max-h-56 object-contain"
                />

                {/* Laser Scanning Effect */}
                {isScanning && (
                  <div className="absolute inset-0 bg-rose-500/10 backdrop-blur-2xs flex flex-col items-center justify-center">
                    <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_15px_rgba(244,63,94,1)] animate-bounce" />
                    <div className="px-4 py-2 rounded-2xl bg-black/80 border border-white/15 backdrop-blur-md flex items-center space-x-2 text-xs font-bold text-white shadow-xl">
                      <div className="w-3.5 h-3.5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                      <span>Нейросеть считывает СТС и госномер...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Error Notice */}
              {errorMessage && (
                <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center space-x-3 text-xs text-rose-200">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <div className="flex-1">{errorMessage}</div>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="underline text-xs font-bold text-white hover:text-rose-300 cursor-pointer"
                  >
                    Повторить
                  </button>
                </div>
              )}

              {/* Scanned Fields Preview Grid */}
              {scannedResult && (
                <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                    <span className="text-xs font-bold text-emerald-400 flex items-center space-x-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Данные успешно распознаны</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleReset}
                      className="text-[11px] text-zinc-400 hover:text-white flex items-center space-x-1 cursor-pointer"
                    >
                      <RotateCw className="w-3 h-3" />
                      <span>Переснять</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    {/* Auto Plate */}
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.06] flex items-center justify-between">
                      <span className="text-zinc-400 flex items-center space-x-1.5">
                        <Hash className="w-3.5 h-3.5 text-rose-400" />
                        <span>Госномер:</span>
                      </span>
                      <span className="font-mono font-bold text-white bg-white/10 px-2 py-0.5 rounded">
                        {scannedResult.licensePlate || "Не определен"}
                      </span>
                    </div>

                    {/* Auto Vehicle Make & Model */}
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.06] flex items-center justify-between">
                      <span className="text-zinc-400 flex items-center space-x-1.5">
                        <Car className="w-3.5 h-3.5 text-sky-400" />
                        <span>Автомобиль:</span>
                      </span>
                      <span className="font-semibold text-white truncate max-w-[140px]">
                        {scannedResult.make || ""} {scannedResult.model || "Не определен"}
                      </span>
                    </div>

                    {/* VIN */}
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.06] flex items-center justify-between">
                      <span className="text-zinc-400 flex items-center space-x-1.5">
                        <FileText className="w-3.5 h-3.5 text-amber-400" />
                        <span>VIN:</span>
                      </span>
                      <span className="font-mono text-[11px] text-zinc-200 truncate max-w-[140px]">
                        {scannedResult.vin || "Не определен"}
                      </span>
                    </div>

                    {/* Client Owner */}
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.06] flex items-center justify-between">
                      <span className="text-zinc-400 flex items-center space-x-1.5">
                        <User className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Владелец:</span>
                      </span>
                      <span className="font-semibold text-white truncate max-w-[140px]">
                        {scannedResult.clientName || "Не указан"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-white/10 flex items-center justify-between bg-zinc-900/50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            Отмена
          </button>

          {scannedResult ? (
            <button
              type="button"
              onClick={handleConfirmApply}
              className="apple-tap flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/25 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Заполнить заказ-наряд</span>
            </button>
          ) : previewImage && !isScanning ? (
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Выбрать другое фото</span>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};
