"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Upload,
  Sliders,
  Sparkles,
  RotateCcw,
  Trash2,
  Check,
  Eye,
  FileImage,
} from "lucide-react";
import {
  processFacsimileImage,
  generateDefaultStampDataUrl,
  generateDefaultSignatureDataUrl,
} from "@/lib/canvas-image-processor";

interface FacsimileUploaderProps {
  label: string;
  type: "stamp" | "signature";
  currentValue?: string;
  onChange: (value: string) => void;
  description?: string;
}

export const FacsimileUploader: React.FC<FacsimileUploaderProps> = ({
  label,
  type,
  currentValue,
  onChange,
  description,
}) => {
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(currentValue || null);
  const [sensitivity, setSensitivity] = useState<number>(55);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [previewMode, setPreviewMode] = useState<"after" | "before">("after");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (currentValue && !processedUrl) {
      setProcessedUrl(currentValue);
    }
  }, [currentValue]);

  // Re-process when sensitivity changes
  const runProcessing = async (source: string, sens: number) => {
    setIsProcessing(true);
    try {
      const res = await processFacsimileImage(source, {
        type,
        sensitivity: sens,
        inkEnhance: true,
      });
      setProcessedUrl(res);
      onChange(res);
    } catch (err) {
      console.error("Facsimile processing error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSensitivityChange = (newVal: number) => {
    setSensitivity(newVal);
    const src = originalUrl || processedUrl;
    if (!src) return;

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      runProcessing(src, newVal);
    }, 150);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setOriginalUrl(dataUrl);
      runProcessing(dataUrl, sensitivity);
    };
    reader.readAsDataURL(file);
  };

  const handleUseDefault = () => {
    const def = type === "stamp" ? generateDefaultStampDataUrl() : generateDefaultSignatureDataUrl();
    setOriginalUrl(null);
    setProcessedUrl(def);
    onChange(def);
  };

  const handleClear = () => {
    setOriginalUrl(null);
    setProcessedUrl(null);
    onChange("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const isSquare = type === "stamp";

  return (
    <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-bold text-zinc-900 dark:text-zinc-100 text-xs flex items-center space-x-1.5">
            <span>{label}</span>
            {processedUrl && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold flex items-center space-x-0.5">
                <Check className="w-3 h-3" />
                <span>Готово</span>
              </span>
            )}
          </span>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            {description || (type === "stamp" ? "Скан или фото круглой печати на белом листе" : "Скан или фото росписи ручкой на белом листе")}
          </p>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            type="button"
            onClick={handleUseDefault}
            className="text-[10px] px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold flex items-center space-x-1 cursor-pointer transition-colors"
            title="Использовать официальный цифровой образец СТО"
          >
            <Sparkles className="w-3 h-3 text-rose-500" />
            <span>Образец СТО</span>
          </button>

          {processedUrl && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-md text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer"
              title="Удалить"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Preview and Upload Area */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
        {/* Preview box with transparency checkerboard */}
        <div className="sm:col-span-5 flex flex-col items-center justify-center">
          <div
            className={`w-full ${
              isSquare ? "h-36 max-w-[144px]" : "h-24 max-w-[240px]"
            } rounded-lg border border-zinc-300 dark:border-zinc-700 overflow-hidden relative flex items-center justify-center p-2 shadow-inner bg-[linear-gradient(45deg,#e2e8f0_25%,transparent_25%),linear-gradient(-45deg,#e2e8f0_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e2e8f0_75%),linear-gradient(-45deg,transparent_75%,#e2e8f0_75%)] dark:bg-[linear-gradient(45deg,#1f2937_25%,transparent_25%),linear-gradient(-45deg,#1f2937_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#1f2937_75%),linear-gradient(-45deg,transparent_75%,#1f2937_75%)] bg-[size:14px_14px] bg-[position:0_0,0_7px,7px_-7px,-7px_0]`}
          >
            {isProcessing && (
              <div className="absolute inset-0 bg-white/70 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center z-20 text-[11px] font-bold text-zinc-700 dark:text-zinc-200">
                Очистка фона...
              </div>
            )}

            {processedUrl ? (
              <img
                src={previewMode === "before" && originalUrl ? originalUrl : processedUrl}
                alt={label}
                className="max-w-full max-h-full object-contain filter drop-shadow-xs"
              />
            ) : (
              <div className="text-center p-2 text-zinc-400">
                <FileImage className="w-6 h-6 mx-auto mb-1 opacity-40" />
                <span className="text-[10px]">Файл не загружен</span>
              </div>
            )}
          </div>

          {originalUrl && (
            <div className="mt-1.5 flex items-center space-x-2 text-[10px]">
              <button
                type="button"
                onClick={() => setPreviewMode(previewMode === "after" ? "before" : "after")}
                className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 underline cursor-pointer"
              >
                {previewMode === "after" ? "Показать оригинал (До)" : "Показать без фона (После)"}
              </button>
            </div>
          )}
        </div>

        {/* Controls: Upload & Sensitivity */}
        <div className="sm:col-span-7 space-y-3">
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2 px-3 rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-rose-500 dark:hover:border-rose-500 bg-zinc-50 dark:bg-zinc-800/40 hover:bg-rose-500/5 transition-colors flex items-center justify-center space-x-2 text-xs font-semibold cursor-pointer text-zinc-700 dark:text-zinc-300"
            >
              <Upload className="w-4 h-4 text-rose-500" />
              <span>{processedUrl ? "Загрузить другое фото / скан" : "Загрузить скан (JPG, PNG)"}</span>
            </button>
          </div>

          {processedUrl && (
            <div className="space-y-1.5 p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-zinc-600 dark:text-zinc-400 flex items-center space-x-1">
                  <Sliders className="w-3 h-3 text-rose-500" />
                  <span>Чувствительность очистки:</span>
                </span>
                <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{sensitivity}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={95}
                value={sensitivity}
                onChange={(e) => handleSensitivityChange(Number(e.target.value))}
                className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-rose-600"
              />
              <div className="flex justify-between text-[9px] text-zinc-400">
                <span>Мягче (сохранить детали)</span>
                <span>Агрессивнее (удалить серый шум)</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
