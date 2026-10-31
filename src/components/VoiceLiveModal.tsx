"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  X,
  Radio,
} from "lucide-react";
import { useBusiness } from "@/lib/business-context";

interface VoiceLiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendMessage: (text: string, options?: { voiceMode: boolean }) => Promise<string>;
}

export const VoiceLiveModal: React.FC<VoiceLiveModalProps> = ({
  isOpen,
  onClose,
  onSendMessage,
}) => {
  const { currentBusiness } = useBusiness();
  const isChaika = currentBusiness === "chaika-service";

  // Voice state: "idle" | "listening" | "thinking" | "speaking"
  const [voiceState, setVoiceState] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");
  const [transcript, setTranscript] = useState("");
  const [lastAiResponse, setLastAiResponse] = useState("");
  const [isMuted, setIsMuted] = useState(false);

  const recognitionRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const silenceTimerRef = useRef<any>(null);
  const isSpeakingRef = useRef(false);

  // Browser speech synthesis fallback with natural young Russian female voice
  const speakWithBrowserTts = (text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        resolve();
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "ru-RU";
      utterance.rate = 1.08;
      utterance.pitch = 1.15;

      const voices = window.speechSynthesis.getVoices();
      const ruVoices = voices.filter((v) => v.lang.startsWith("ru"));
      const femaleRu = ruVoices.find(
        (v) =>
          v.name.toLowerCase().includes("svetl") ||
          v.name.toLowerCase().includes("milena") ||
          v.name.toLowerCase().includes("tatiana") ||
          v.name.toLowerCase().includes("female") ||
          v.name.toLowerCase().includes("google")
      );

      if (femaleRu) {
        utterance.voice = femaleRu;
      } else if (ruVoices.length > 0) {
        utterance.voice = ruVoices[0];
      }

      utterance.onend = () => {
        isSpeakingRef.current = false;
        resolve();
      };
      utterance.onerror = () => {
        isSpeakingRef.current = false;
        resolve();
      };

      isSpeakingRef.current = true;
      window.speechSynthesis.speak(utterance);
    });
  };

  // Main TTS playback handler: ElevenLabs ultra-fast engine with seamless browser fallback
  const playAiVoice = async (text: string) => {
    setVoiceState("speaking");
    isSpeakingRef.current = true;

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const data = await res.json();
      if (data && data.audioUrl) {
        if (!audioPlayerRef.current) {
          audioPlayerRef.current = new Audio();
        }
        audioPlayerRef.current.src = data.audioUrl;
        audioPlayerRef.current.onended = () => {
          isSpeakingRef.current = false;
          resumeListening();
        };
        audioPlayerRef.current.onerror = () => {
          isSpeakingRef.current = false;
          resumeListening();
        };
        await audioPlayerRef.current.play();
        return;
      }
    } catch (err) {
      console.warn("ElevenLabs TTS silent fallback to Web Speech:", err);
    }

    // Silent seamless fallback to client Web Speech synthesis
    await speakWithBrowserTts(text);
    resumeListening();
  };

  const resumeListening = () => {
    if (!isOpen || isMuted) {
      setVoiceState("idle");
      return;
    }
    setVoiceState("listening");
    try {
      recognitionRef.current?.start();
    } catch {}
  };

  // Process user speech when silence is detected
  const handleUserSpoke = async (spokenText: string) => {
    if (!spokenText.trim() || isSpeakingRef.current) return;

    try {
      recognitionRef.current?.stop();
    } catch {}

    setVoiceState("thinking");
    setTranscript(spokenText);

    try {
      const reply = await onSendMessage(spokenText, { voiceMode: true });
      // Strip any markdown/action blocks for vocalization
      const vocalText = reply
        .replace(/```[\s\S]*?```/g, "")
        .replace(/[#*_~`]/g, "")
        .trim();

      setLastAiResponse(vocalText || "Принято, всё оформила!");
      await playAiVoice(vocalText || "Принято!");
    } catch (err) {
      console.error("AI speech error:", err);
      setLastAiResponse("Произошла ошибка связи, повторите, пожалуйста.");
      await playAiVoice("Произошла ошибка связи, повторите, пожалуйста.");
    }
  };

  // Setup Web Speech Recognition
  useEffect(() => {
    if (!isOpen) {
      try {
        recognitionRef.current?.stop();
        window.speechSynthesis?.cancel();
        if (audioPlayerRef.current) audioPlayerRef.current.pause();
      } catch {}
      setVoiceState("idle");
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "ru-RU";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognitionRef.current = recognition;

    let accumulatedText = "";

    recognition.onresult = (event: any) => {
      if (isSpeakingRef.current) return;

      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          accumulatedText += " " + event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      const currentSpeech = (accumulatedText + " " + interim).trim();
      setTranscript(currentSpeech);

      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

      // Trigger automatic turn after 1.2s silence
      if (currentSpeech.length > 2) {
        setVoiceState("listening");
        silenceTimerRef.current = setTimeout(() => {
          const finalPrompt = currentSpeech;
          accumulatedText = "";
          handleUserSpoke(finalPrompt);
        }, 1300);
      }
    };

    recognition.onerror = (e: any) => {
      if (e.error !== "no-speech") {
        console.warn("Speech recognition error:", e.error);
      }
    };

    recognition.onend = () => {
      if (!isSpeakingRef.current && isOpen && !isMuted) {
        try {
          recognition.start();
        } catch {}
      }
    };

    setVoiceState("listening");
    try {
      recognition.start();
    } catch {}

    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      try {
        recognition.stop();
        window.speechSynthesis?.cancel();
      } catch {}
    };
  }, [isOpen, isMuted]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-70 bg-zinc-950/95 backdrop-blur-3xl flex flex-col items-center justify-between p-6 sm:p-10 select-none animate-in fade-in duration-300">
      {/* Top Bar - Clean minimal pill status and close */}
      <div className="w-full max-w-4xl flex items-center justify-between z-20">
        <div className="flex items-center space-x-3">
          <div
            className={`w-9 h-9 rounded-2xl flex items-center justify-center shadow-lg ${
              isChaika
                ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                : "bg-sky-500/15 text-sky-400 border border-sky-500/30"
            }`}
          >
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-white font-bold text-sm tracking-tight">
                {isChaika ? "Шеф-мастер Live" : "Geo AI Live"}
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  voiceState === "speaking"
                    ? isChaika
                      ? "bg-rose-500 animate-ping"
                      : "bg-sky-500 animate-ping"
                    : voiceState === "thinking"
                    ? "bg-amber-400 animate-pulse"
                    : "bg-emerald-400 animate-pulse"
                }`}
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-2.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-zinc-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
          title="Закрыть голосовой режим"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* CENTER: YANDEX MUSIC "МОЯ ВОЛНА" MULTI-LAYER PULSATING ENERGY SPHERE (NO MIC ICON) */}
      <div className="relative flex flex-col items-center justify-center my-auto w-full max-w-xl">
        {/* Ambient surrounding glow aura */}
        <div
          className={`absolute w-72 h-72 sm:w-[420px] sm:h-[420px] rounded-full blur-[100px] pointer-events-none transition-all duration-700 ${
            voiceState === "speaking"
              ? isChaika
                ? "bg-rose-500/40 scale-125"
                : "bg-sky-500/40 scale-125"
              : voiceState === "thinking"
              ? "bg-amber-500/35 scale-110"
              : voiceState === "listening"
              ? isChaika
                ? "bg-rose-600/30 scale-105"
                : "bg-teal-500/30 scale-105"
              : "bg-white/10 scale-90 opacity-40"
          }`}
        />

        {/* Multi-layered organic energy sphere */}
        <div
          className="relative flex items-center justify-center cursor-pointer group"
          onClick={() => {
            if (voiceState === "speaking") {
              window.speechSynthesis?.cancel();
              if (audioPlayerRef.current) audioPlayerRef.current.pause();
              isSpeakingRef.current = false;
              resumeListening();
            }
          }}
          title={voiceState === "speaking" ? "Нажмите, чтобы перебить ассистента" : undefined}
        >
          {/* Outer Ripple Wave 1 */}
          <div
            className={`absolute w-56 h-56 sm:w-72 sm:h-72 rounded-full border transition-all duration-1000 ${
              voiceState === "speaking"
                ? isChaika
                  ? "border-rose-500/30 scale-125 animate-ping opacity-25"
                  : "border-sky-500/30 scale-125 animate-ping opacity-25"
                : voiceState === "thinking"
                ? "border-amber-500/20 scale-110 animate-pulse"
                : "border-white/5 scale-100 opacity-20"
            }`}
          />

          {/* Outer Rotating Wave Ring */}
          <div
            className={`absolute w-48 h-48 sm:w-64 sm:h-64 rounded-full border border-dashed transition-all duration-700 ${
              isChaika ? "border-rose-400/40" : "border-sky-400/40"
            } ${
              voiceState === "speaking"
                ? "animate-spin duration-3000 scale-115 opacity-70"
                : voiceState === "thinking"
                ? "animate-spin duration-2000 scale-105 opacity-50"
                : "animate-spin duration-10000 scale-100 opacity-30"
            }`}
          />

          {/* Central Living Sphere (No microphone inside - pure pulsating living light) */}
          <div
            className={`relative w-40 h-40 sm:w-56 sm:h-56 rounded-full overflow-hidden flex items-center justify-center shadow-2xl transition-all duration-500 ${
              voiceState === "speaking"
                ? "scale-110 shadow-rose-500/50"
                : voiceState === "thinking"
                ? "scale-105 shadow-amber-500/40"
                : voiceState === "listening"
                ? "scale-100 shadow-rose-500/30"
                : "scale-95 opacity-80"
            }`}
            style={{
              background: isChaika
                ? "radial-gradient(circle at 35% 35%, #f43f5e 0%, #e11d48 35%, #9f1239 70%, #09090b 100%)"
                : "radial-gradient(circle at 35% 35%, #38bdf8 0%, #0284c7 35%, #1e1b4b 70%, #09090b 100%)",
            }}
          >
            {/* Morphing Internal Plasma Layers */}
            <div
              className={`absolute inset-0 rounded-full blur-xl transition-all duration-700 ${
                voiceState === "speaking"
                  ? isChaika
                    ? "bg-rose-400/50 animate-pulse scale-110"
                    : "bg-sky-400/50 animate-pulse scale-110"
                  : voiceState === "thinking"
                  ? "bg-amber-400/40 animate-pulse scale-100"
                  : "bg-white/20 scale-90"
              }`}
            />

            {/* Glowing Core Wave */}
            <div
              className={`w-24 h-24 sm:w-32 sm:h-32 rounded-full blur-md transition-all duration-500 ${
                voiceState === "speaking"
                  ? isChaika
                    ? "bg-gradient-to-tr from-rose-300 via-amber-200 to-rose-400 animate-spin duration-5000 opacity-90 scale-110"
                    : "bg-gradient-to-tr from-sky-300 via-teal-200 to-indigo-400 animate-spin duration-5000 opacity-90 scale-110"
                  : voiceState === "thinking"
                  ? "bg-gradient-to-tr from-amber-300 to-orange-400 animate-spin duration-3000 opacity-80"
                  : "bg-white/30 animate-pulse opacity-60"
              }`}
            />

            {/* Inner Sparkle Center */}
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-white/40 blur-xs animate-ping duration-2000" />
          </div>
        </div>

        {/* State Title */}
        <div className="mt-8 text-center space-y-1">
          <div className="text-sm font-semibold tracking-wide text-white">
            {voiceState === "speaking"
              ? "ИИ отвечает голосом..."
              : voiceState === "thinking"
              ? "Обрабатываю запрос..."
              : voiceState === "listening"
              ? "Слушаю вас — говорите свободно"
              : "Микрофон отключен"}
          </div>
          <div className="text-xs text-zinc-400">
            {voiceState === "listening"
              ? "Сделайте паузу в конце фразы для мгновенного ответа"
              : voiceState === "speaking"
              ? "Нажмите на сферу, чтобы перебить ассистента"
              : ""}
          </div>
        </div>

        {/* Real-time Subtitles / Spoken Transcript */}
        <div className="mt-6 w-full min-h-[56px] p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl text-center text-xs text-zinc-200 font-medium leading-relaxed">
          {voiceState === "listening" && transcript && (
            <span className="text-white">«{transcript}»</span>
          )}
          {voiceState === "speaking" && lastAiResponse && (
            <span className={isChaika ? "text-rose-300" : "text-sky-300"}>«{lastAiResponse}»</span>
          )}
          {voiceState === "thinking" && (
            <span className="text-amber-400 italic">Формирую ответ и выполняю действия...</span>
          )}
          {!transcript && !lastAiResponse && voiceState === "listening" && (
            <span className="text-zinc-500">
              {isChaika
                ? "Назовите команду, например: «Создай заказ-наряд на замену масла Камри»"
                : "Задайте любой вопрос или назовите задачу..."}
            </span>
          )}
        </div>
      </div>

      {/* Bottom Minimalist Glass Pill Remote Control Bar */}
      <div className="z-20">
        <div className="flex items-center space-x-3 p-1.5 px-3 rounded-full bg-zinc-900/80 backdrop-blur-2xl border border-white/10 shadow-2xl">
          {/* Mute / Unmute Button */}
          <button
            type="button"
            onClick={() => {
              const nextMuted = !isMuted;
              setIsMuted(nextMuted);
              if (nextMuted) {
                try {
                  recognitionRef.current?.stop();
                  window.speechSynthesis?.cancel();
                } catch {}
                setVoiceState("idle");
              } else {
                resumeListening();
              }
            }}
            className={`p-3 rounded-full transition-all cursor-pointer ${
              isMuted
                ? "bg-zinc-800 text-zinc-400 hover:text-white"
                : isChaika
                ? "bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30"
                : "bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-600/30"
            }`}
            title={isMuted ? "Включить микрофон" : "Отключить микрофон (Mute)"}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <div className="h-5 w-px bg-white/10" />

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="p-3 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white transition-colors cursor-pointer"
            title="Завершить сеанс"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
