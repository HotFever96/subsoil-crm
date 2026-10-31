"use client";

import React, { useState, useEffect } from "react";
import { Mic, MicOff, RotateCw, X, SlidersHorizontal, RefreshCw, CheckCircle2 } from "lucide-react";

interface MicPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry: () => void;
}

export const MicPermissionModal: React.FC<MicPermissionModalProps> = ({
  isOpen,
  onClose,
  onRetry,
}) => {
  const [isGrantedInChrome, setIsGrantedInChrome] = useState(false);

  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return;

    let permissionObj: PermissionStatus | null = null;

    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "microphone" as any })
        .then((p) => {
          permissionObj = p;
          setIsGrantedInChrome(p.state === "granted");
          p.onchange = () => {
            setIsGrantedInChrome(p.state === "granted");
          };
        })
        .catch(() => {});
    }

    return () => {
      if (permissionObj) {
        permissionObj.onchange = null;
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRetryClick = () => {
    onClose();
    setTimeout(() => {
      onRetry();
    }, 50);
  };

  const handleReloadClick = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 z-80 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="apple-sheet w-full max-w-md bg-zinc-950/95 border border-white/10 rounded-3xl p-6 shadow-2xl text-center space-y-4 text-white relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Закрыть"
        >
          <X className="w-5 h-5" />
        </button>

        {isGrantedInChrome ? (
          <div className="w-14 h-14 mx-auto rounded-3xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <CheckCircle2 className="w-7 h-7" />
          </div>
        ) : (
          <div className="w-14 h-14 mx-auto rounded-3xl bg-rose-500/15 border border-rose-500/30 text-rose-500 flex items-center justify-center shadow-lg shadow-rose-500/20">
            <MicOff className="w-7 h-7" />
          </div>
        )}

        <div className="space-y-1.5">
          <h3 className="text-base font-bold text-white">
            {isGrantedInChrome ? "Доступ к микрофону включен в Chrome" : "Требуется доступ к микрофону"}
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            {isGrantedInChrome
              ? "Разрешение успешно включено в настройках сайта. Чтобы применить его к текущей вкладке, обновите страницу."
              : "Браузер ограничил доступ к микрофону для этого сайта. Чтобы общаться голосом с ИИ:"}
          </p>
        </div>

        {isGrantedInChrome ? (
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-300 flex items-center space-x-3 text-left">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div className="text-[12px] leading-snug">
              Chrome требует однократной перезагрузки открытой вкладки после изменения переключателя.
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-xs text-zinc-300 flex items-center space-x-3 text-left">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center shrink-0">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div className="text-[12px] leading-snug">
              Нажмите на значок <span className="text-white font-semibold">🎚️ / 🔒</span> слева от адресной строки сайта и включите тумблер <span className="text-white font-semibold">«Микрофон»</span>.
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
          {isGrantedInChrome ? (
            <button
              type="button"
              onClick={handleReloadClick}
              className="w-full sm:w-auto apple-tap flex items-center justify-center space-x-2 px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/25 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Обновить страницу</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleRetryClick}
              className="w-full sm:w-auto apple-tap flex items-center justify-center space-x-2 px-5 py-2.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-lg shadow-rose-600/25 cursor-pointer"
            >
              <RotateCw className="w-4 h-4" />
              <span>Запросить доступ снова</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleRetryClick}
            className="w-full sm:w-auto px-4 py-2.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white text-xs font-medium transition-all cursor-pointer"
          >
            Попробовать без перезагрузки
          </button>
        </div>
      </div>
    </div>
  );
};
