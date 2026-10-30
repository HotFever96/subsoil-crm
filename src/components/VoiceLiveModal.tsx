"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Settings,
  Sparkles,
  PhoneCall,
  Radio,
  Wrench,
  CheckCircle2,
  Car,
} from "lucide-react";
import { useBusiness } from "@/lib/business-context";
import { useAuth } from "@/lib/auth-context";

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
  const { user } = useAuth();
  const isChaika = currentBusiness === "chaika-service";

  // Voice state: "idle" | "listening" | "thinking" | "speaking"
  const [voiceState, setVoiceState] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");
  const [transcript, setTranscript] = useState("");
  const [lastAiResponse, setLastAiResponse] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Settings
  const [provider, setProvider] = useState<"browser" | "elevenlabs" | "fish_audio">("browser");
  const [ttsApiKey, setTtsApiKey] = useState("");
  const [voiceId, setVoiceId] = useState("");

  const recognitionRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const silenceTimerRef = useRef<any>(null);
  const isSpeakingRef = useRef(false);

  // Load saved TTS settings
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const savedProv = localStorage.getItem("geo_ai_tts_provider");
        if (savedProv) setProvider(savedProv as any);
        const savedKey = localStorage.getItem("geo_ai_tts_key");
        if (savedKey) setTtsApiKey(savedKey);
        const savedVoice = localStorage.getItem("geo_ai_tts_voice_id");
        if (savedVoice) setVoiceId(savedVoice);
      } catch {}
    }
  }, []);

  const saveTtsSettings = () => {
    try {
      localStorage.setItem("geo_ai_tts_provider", provider);
      localStorage.setItem("geo_ai_tts_key", ttsApiKey);
      localStorage.setItem("geo_ai_tts_voice_id", voiceId);
      setShowSettings(false);
    } catch {}
  };

  // Browser speech synthesis fallback with young lively female voice parameters
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
      utterance.pitch = 1.2; // Slightly higher pitch for a young lively female voice

      // Try to find the best Russian female voice
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

  // Main TTS playback handler
  const playAiVoice = async (text: string) => {
    setVoiceState("speaking");
    isSpeakingRef.current = true;

    // Call /api/tts
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          provider,
          apiKey: ttsApiKey,
          voiceId,
        }),
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
      console.warn("Server TTS error, fallback to browser:", err);
    }

    // Fallback to browser voice synthesis
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
      // Strip any action blocks for vocalization
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
      alert("Ваш браузер не поддерживает Web Speech Recognition API. Рекомендуем Google Chrome или Яндекс Браузер.");
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
      // Auto-restart if we are in listening mode
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
      {/* Top Bar */}
      <div className="w-full max-w-4xl flex items-center justify-between z-20">
        <div className="flex items-center space-x-3">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg ${
              isChaika
                ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                : "bg-sky-500/20 text-sky-400 border border-sky-500/30"
            }`}
          >
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-white font-bold text-sm tracking-tight">
                {isChaika ? "Шеф-мастер Live" : "Geo AI Live"}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500 text-white">
                Моя Волна
              </span>
            </div>
            <div className="text-[11px] text-zinc-400 flex items-center space-x-1.5">
              <Car className="w-3 h-3 text-amber-400" />
              <span>Режим Hands-Free (Разговор за рулем без кнопок)</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className="p-2.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
            title="Настройки голоса"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
            title="Закрыть голосовой режим"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Settings Flyout Modal */}
      {showSettings && (
        <div className="absolute top-20 right-6 sm:right-10 z-30 w-80 p-5 rounded-3xl bg-zinc-900/95 border border-white/10 shadow-2xl backdrop-blur-2xl text-xs space-y-3.5 text-zinc-200">
          <div className="flex items-center justify-between font-bold text-white border-b border-white/[0.08] pb-2">
            <span>Настройки синтеза речи</span>
            <button onClick={() => setShowSettings(false)} className="text-zinc-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-zinc-400">Провайдер голоса</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-white/10 text-white font-medium"
            >
              <option value="browser">Встроенный голос (Работает сразу, бесплатно)</option>
              <option value="elevenlabs">ElevenLabs API (Ультра-реалистичный)</option>
              <option value="fish_audio">Fish Audio API (Клонирование и тембры)</option>
            </select>
          </div>

          {provider !== "browser" && (
            <>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-400">API Key ({provider})</label>
                <input
                  type="password"
                  value={ttsApiKey}
                  onChange={(e) => setTtsApiKey(e.target.value)}
                  placeholder="sk_..."
                  className="w-full px-3 py-1.5 rounded-xl bg-zinc-950 border border-white/10 text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-400">Voice ID (ID тембра)</label>
                <input
                  type="text"
                  value={voiceId}
                  onChange={(e) => setVoiceId(e.target.value)}
                  placeholder="Например: 21m00Tcm4TlvDq8ikWAM"
                  className="w-full px-3 py-1.5 rounded-xl bg-zinc-950 border border-white/10 text-white font-mono"
                />
              </div>
            </>
          )}

          <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[10px] text-zinc-400 leading-relaxed">
            Пресет: <strong>Молодая девушка</strong> с живой разговорной речью, мягким тембром и легкой естественной картавинкой («р»).
          </div>

          <button
            type="button"
            onClick={saveTtsSettings}
            className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-md cursor-pointer"
          >
            Сохранить настройки
          </button>
        </div>
      )}

      {/* CENTER: YANDEX MUSIC "МОЯ ВОЛНА" PULSATING ENERGY SPHERE */}
      <div className="relative flex flex-col items-center justify-center my-auto">
        {/* Ambient surrounding glow aura */}
        <div
          className={`absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full blur-[100px] pointer-events-none transition-all duration-700 ${
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

        {/* Central Organic Morphing Sphere */}
        <div
          className={`relative w-44 h-44 sm:w-60 sm:h-60 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 cursor-pointer ${
            voiceState === "speaking"
              ? "animate-wave-sphere scale-110 shadow-rose-500/50"
              : voiceState === "thinking"
              ? "animate-spin scale-105 shadow-amber-500/40"
              : voiceState === "listening"
              ? "scale-100 shadow-rose-500/30"
              : "scale-95 opacity-70"
          }`}
          style={{
            background: isChaika
              ? "radial-gradient(circle at 35% 35%, #fb7185 0%, #e11d48 40%, #881337 75%, #09090b 100%)"
              : "radial-gradient(circle at 35% 35%, #38bdf8 0%, #0284c7 40%, #1e1b4b 75%, #09090b 100%)",
          }}
          onClick={() => {
            if (voiceState === "speaking") {
              window.speechSynthesis?.cancel();
              if (audioPlayerRef.current) audioPlayerRef.current.pause();
              isSpeakingRef.current = false;
              resumeListening();
            }
          }}
        >
          {/* Inner Light Core */}
          <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-white/20 blur-md animate-pulse" />

          {/* Central Status Icon */}
          <div className="absolute inset-0 flex items-center justify-center text-white drop-shadow-md">
            {voiceState === "speaking" ? (
              <Volume2 className="w-8 h-8 sm:w-10 sm:h-10 animate-bounce" />
            ) : voiceState === "thinking" ? (
              <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 animate-spin" />
            ) : voiceState === "listening" ? (
              <Mic className="w-8 h-8 sm:w-10 sm:h-10 animate-pulse text-white" />
            ) : (
              <MicOff className="w-8 h-8 sm:w-10 sm:h-10 text-zinc-400" />
            )}
          </div>
        </div>

        {/* State Title */}
        <div className="mt-8 text-center space-y-1">
          <div className="text-sm font-bold tracking-wide text-white uppercase">
            {voiceState === "speaking"
              ? "ИИ отвечает голосом..."
              : voiceState === "thinking"
              ? "Секунду, обрабатываю..."
              : voiceState === "listening"
              ? "Слушаю вас (говорите)..."
              : "Нажмите микрофон для старта"}
          </div>
          <div className="text-xs text-zinc-400 max-w-sm">
            {voiceState === "listening"
              ? "Сделайте паузу в конце фразы — ИИ ответит мгновенно"
              : voiceState === "speaking"
              ? "Нажмите на сферу, чтобы перебить ассистента"
              : ""}
          </div>
        </div>

        {/* Real-time Subtitles / Spoken Transcript */}
        <div className="mt-6 w-full max-w-md min-h-[50px] p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl text-center text-xs text-zinc-200 font-medium leading-relaxed">
          {voiceState === "listening" && transcript && (
            <span className="text-white">«{transcript}»</span>
          )}
          {voiceState === "speaking" && lastAiResponse && (
            <span className="text-rose-300">«{lastAiResponse}»</span>
          )}
          {voiceState === "thinking" && (
            <span className="text-amber-400 italic">Формирую ответ и выполняю действия...</span>
          )}
          {!transcript && !lastAiResponse && voiceState === "listening" && (
            <span className="text-zinc-500">Назовите команду, например: «Создай заказ-наряд на замену колодок Камри»</span>
          )}
        </div>
      </div>

      {/* Bottom Controls Bar */}
      <div className="w-full max-w-md flex items-center justify-center space-x-4 z-20">
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
          className={`p-4 rounded-full border transition-all cursor-pointer shadow-xl ${
            isMuted
              ? "bg-zinc-800 text-zinc-400 border-white/10"
              : "bg-rose-600 text-white border-rose-500 shadow-rose-600/30 scale-105"
          }`}
          title={isMuted ? "Включить микрофон" : "Отключить микрофон"}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>

        <button
          type="button"
          onClick={onClose}
          className="px-6 py-3 rounded-full bg-white/[0.08] hover:bg-white/[0.15] text-white text-xs font-bold border border-white/10 transition-all cursor-pointer"
        >
          Завершить сеанс
        </button>
      </div>
    </div>
  );
};
