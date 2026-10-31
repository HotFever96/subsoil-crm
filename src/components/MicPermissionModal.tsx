"use client";

import React from "react";
import { MicOff, RotateCw, X, SlidersHorizontal } from "lucide-react";

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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-80 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="apple-sheet w-full max-w-md bg-zinc-950/95 border border-white/10 rounded-3xl p-6 shadow-2xl text-center space-y-4 text-white relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-14 h-14 mx-auto rounded-3xl bg-rose-500/15 border border-rose-500/30 text-rose-500 flex items-center justify-center shadow-lg shadow-rose-500/20">
          <MicOff className="w-7 h-7" />
        </div>

        <div className="space-y-1.5">
          <h3 className="text-base font-bold text-white">Доступ к микрофону заблокирован</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Браузер ограничил доступ к микрофону для этого сайта. Чтобы общаться голосом с ИИ:
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-xs text-zinc-300 flex items-center space-x-3 text-left">
          <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center shrink-0">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div className="text-[12px] leading-snug">
            Нажмите на значок настроек <span className="text-white font-semibold">🎚️ / 🔒</span> слева от адресной строки сайта и включите <span className="text-white font-semibold">Микрофон</span>.
          </div>
        </div>

        <div className="flex items-center justify-center space-x-3 pt-2">
          <button
            type="button"
            onClick={onRetry}
            className="apple-tap flex items-center space-x-2 px-5 py-2.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-lg shadow-rose-600/25 cursor-pointer"
          >
            <RotateCw className="w-4 h-4" />
            <span>🔄 Запросить доступ к микрофону снова</span>
          </button>
        </div>
      </div>
    </div>
  );
};
