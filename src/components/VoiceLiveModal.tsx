"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Mic, MicOff, Radio } from "lucide-react";
import { useBusiness } from "@/lib/business-context";
import { requestMicrophoneStream, transcribeAudioWithServer } from "@/lib/microphone-manager";
import { MicPermissionModal } from "@/components/MicPermissionModal";

interface VoiceLiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendMessage: (text: string, options?: { voiceMode?: boolean }) => Promise<string>;
  initialStream?: MediaStream | null;
}

type VoiceState = "idle" | "listening" | "thinking" | "speaking";

export const VoiceLiveModal: React.FC<VoiceLiveModalProps> = ({
  isOpen,
  onClose,
  onSendMessage,
  initialStream,
}) => {
  const { currentBusiness } = useBusiness();
  const isChaika = currentBusiness === "chaika-service";

  const [voiceState, setVoiceState] = useState<VoiceState>("listening");
  const [transcript, setTranscript] = useState<string>("");
  const [lastAiResponse, setLastAiResponse] = useState<string>("");
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [liveVolume, setLiveVolume] = useState<number>(0);
  const [showMicBlockedModal, setShowMicBlockedModal] = useState<boolean>(false);

  const activeStreamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceTimerRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const isSpeakingRef = useRef<boolean>(false);

  // Web Audio Context & Frequency Analyser for living pulse
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);

  const setupAudioAnalyser = (audioEl: HTMLAudioElement) => {
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          audioCtxRef.current = new AudioContextClass();
        }
      }
      if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume();
      }
      if (audioCtxRef.current && !analyserRef.current) {
        const analyser = audioCtxRef.current.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.75;
        analyserRef.current = analyser;

        if (!sourceNodeRef.current) {
          const source = audioCtxRef.current.createMediaElementSource(audioEl);
          source.connect(analyser);
          analyser.connect(audioCtxRef.current.destination);
          sourceNodeRef.current = source;
        }
      }
    } catch (e) {
      console.warn("AudioContext setup warning:", e);
    }
  };

  // Real-time frequency meter loop for physical pulsating sphere
  useEffect(() => {
    let animId: number;
    const updateMeter = () => {
      if (analyserRef.current && isSpeakingRef.current) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length / 255;
        setLiveVolume(avg);
      } else {
        setLiveVolume((prev) => (prev > 0.01 ? prev * 0.85 : 0));
      }
      animId = requestAnimationFrame(updateMeter);
    };
    animId = requestAnimationFrame(updateMeter);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Silent fallback to Web Speech API
  const speakWithBrowserTts = (text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        isSpeakingRef.current = false;
        resolve();
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "ru-RU";
      utterance.rate = 1.05;
      utterance.pitch = 1.15;

      const voices = window.speechSynthesis.getVoices();
      const ruVoices = voices.filter((v) => v.lang.startsWith("ru"));
      const femaleRu = ruVoices.find(
        (v) =>
          v.name.toLowerCase().includes("svetl") ||
          v.name.toLowerCase().includes("milena") ||
          v.name.toLowerCase().includes("female") ||
          v.name.toLowerCase().includes("google") ||
          v.name.toLowerCase().includes("yandex")
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

  // Main streaming TTS playback handler: ElevenLabs ultra-fast engine with seamless browser fallback
  const playAiVoice = async (text: string) => {
    setVoiceState("speaking");
    isSpeakingRef.current = true;

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const contentType = res.headers.get("content-type") || "";
      if (res.ok && contentType.includes("audio")) {
        const audioBlob = await res.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        if (!audioPlayerRef.current) {
          audioPlayerRef.current = new Audio();
          audioPlayerRef.current.crossOrigin = "anonymous";
        }

        setupAudioAnalyser(audioPlayerRef.current);

        audioPlayerRef.current.src = audioUrl;
        audioPlayerRef.current.onended = () => {
          isSpeakingRef.current = false;
          URL.revokeObjectURL(audioUrl);
          resumeListening();
        };
        audioPlayerRef.current.onerror = () => {
          isSpeakingRef.current = false;
          URL.revokeObjectURL(audioUrl);
          resumeListening();
        };

        await audioPlayerRef.current.play();
        return;
      }
    } catch (err) {
      console.warn("ElevenLabs streaming failed, falling back to Web Speech:", err);
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
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    } catch {}

    setVoiceState("thinking");
    setTranscript(spokenText);

    try {
      const reply = await onSendMessage(spokenText, { voiceMode: true });
      // Strip markdown/action blocks for vocalization
      const vocalText = reply
        .replace(/```[\s\S]*?```/g, "")
        .replace(/https?:\/\/\S+/g, "")
        .replace(/[*#_~`>|]/g, "")
        .trim();

      setLastAiResponse(vocalText || "Принято, всё оформила!");
      await playAiVoice(vocalText || "Принято!");
    } catch (err) {
      console.error("AI speech error:", err);
      setLastAiResponse("Произошла ошибка связи, повторите, пожалуйста.");
      await playAiVoice("Произошла ошибка связи, повторите, пожалуйста.");
    }
  };

  // Setup Microphone Stream and Speech Recognition
  useEffect(() => {
    if (!isOpen) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.currentTime = 0;
      }
      try {
        window.speechSynthesis?.cancel();
        recognitionRef.current?.stop();
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
      } catch {}
      isSpeakingRef.current = false;
      return;
    }

    let isCancelled = false;

    const initMicrophone = async () => {
      let stream = initialStream || activeStreamRef.current;
      if (!stream) {
        const micRes = await requestMicrophoneStream();
        if (isCancelled) return;
        if (!micRes.ok) {
          if (micRes.errorType === "not_allowed") {
            setShowMicBlockedModal(true);
          }
          return;
        }
        stream = micRes.stream || null;
      }

      if (!stream) return;
      activeStreamRef.current = stream;

      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      // Start Server MediaRecorder STT Fallback
      const startRecorderFallback = () => {
        try {
          if (!stream) return;
          audioChunksRef.current = [];
          const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
            ? "audio/webm;codecs=opus"
            : MediaRecorder.isTypeSupported("audio/mp4")
            ? "audio/mp4"
            : "audio/webm";

          const rec = new MediaRecorder(stream, { mimeType });
          mediaRecorderRef.current = rec;

          rec.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              audioChunksRef.current.push(e.data);
            }
          };

          rec.onstop = async () => {
            if (audioChunksRef.current.length > 0 && !isSpeakingRef.current) {
              const blob = new Blob(audioChunksRef.current, { type: mimeType });
              try {
                const text = await transcribeAudioWithServer(blob);
                if (text && text.trim().length > 1) {
                  handleUserSpoke(text);
                }
              } catch (e) {
                console.warn("ElevenLabs Scribe STT error in live mode:", e);
              }
            }
          };

          rec.start(400);
        } catch (e) {
          console.warn("MediaRecorder init warning:", e);
        }
      };

      if (SpeechRecognition) {
        try {
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

            // Auto turn detection when user pauses speech
            if (currentSpeech.length > 2) {
              setVoiceState("listening");
              silenceTimerRef.current = setTimeout(() => {
                const finalPrompt = currentSpeech;
                accumulatedText = "";
                handleUserSpoke(finalPrompt);
              }, 1250);
            }
          };

          recognition.onerror = (e: any) => {
            // Strictly check for not-allowed; ignore normal silence/aborts
            if (e.error === "not-allowed" || e.error === "service-not-allowed") {
              setShowMicBlockedModal(true);
            } else if (e.error === "network") {
              // Switch to MediaRecorder + ElevenLabs Scribe STT
              startRecorderFallback();
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
          recognition.start();
        } catch (e) {
          console.warn("SpeechRecognition launch failed, falling back to MediaRecorder:", e);
          startRecorderFallback();
        }
      } else {
        startRecorderFallback();
      }
    };

    initMicrophone();

    return () => {
      isCancelled = true;
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      try {
        recognitionRef.current?.stop();
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
        window.speechSynthesis?.cancel();
        if (audioPlayerRef.current) {
          audioPlayerRef.current.pause();
        }
      } catch {}
    };
  }, [isOpen, isMuted, initialStream]);

  if (!isOpen) return null;

  return (
    <>
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

        {/* CENTER: YANDEX MUSIC "МОЯ ВОЛНА" MULTI-LAYER PULSATING ENERGY SPHERE */}
        <div className="relative flex flex-col items-center justify-center my-auto w-full max-w-xl">
          {/* Ambient surrounding glow aura */}
          <div
            className={`absolute w-72 h-72 sm:w-[460px] sm:h-[460px] rounded-full blur-[100px] pointer-events-none transition-all duration-300 ${
              voiceState === "speaking"
                ? isChaika
                  ? "bg-rose-500/45 scale-135"
                  : "bg-sky-500/45 scale-135"
                : voiceState === "thinking"
                ? "bg-amber-500/35 scale-110"
                : voiceState === "listening"
                ? isChaika
                  ? "bg-rose-600/30 scale-105"
                  : "bg-teal-500/30 scale-105"
                : "bg-white/10 scale-90 opacity-40"
            }`}
            style={{
              transform: voiceState === "speaking" ? `scale(${1.25 + liveVolume * 0.45})` : undefined,
            }}
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
              className={`absolute w-56 h-56 sm:w-72 sm:h-72 rounded-full border transition-all duration-500 ${
                voiceState === "speaking"
                  ? isChaika
                    ? "border-rose-500/40 scale-130 animate-ping opacity-35"
                    : "border-sky-500/40 scale-130 animate-ping opacity-35"
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
                  ? "animate-spin duration-3000 scale-120 opacity-80"
                  : voiceState === "thinking"
                  ? "animate-spin duration-2000 scale-105 opacity-50"
                  : "animate-spin duration-10000 scale-100 opacity-30"
              }`}
            />

            {/* Central Living Sphere - Pulses with voice frequencies in real-time */}
            <div
              className={`relative w-40 h-40 sm:w-56 sm:h-56 rounded-full overflow-hidden flex items-center justify-center shadow-2xl transition-transform duration-100 ${
                voiceState === "speaking"
                  ? "shadow-rose-500/60"
                  : voiceState === "thinking"
                  ? "scale-105 shadow-amber-500/40"
                  : voiceState === "listening"
                  ? "scale-100 shadow-rose-500/30"
                  : "scale-95 opacity-80"
              }`}
              style={{
                transform: voiceState === "speaking" ? `scale(${1.1 + liveVolume * 0.45})` : undefined,
                background: isChaika
                  ? "radial-gradient(circle at 35% 35%, #f43f5e 0%, #e11d48 35%, #9f1239 70%, #09090b 100%)"
                  : "radial-gradient(circle at 35% 35%, #38bdf8 0%, #0284c7 35%, #1e1b4b 70%, #09090b 100%)",
              }}
            >
              {/* Morphing Internal Plasma Layers */}
              <div
                className={`absolute inset-0 rounded-full blur-xl transition-all duration-300 ${
                  voiceState === "speaking"
                    ? isChaika
                      ? "bg-rose-400/60 animate-pulse scale-115"
                      : "bg-sky-400/60 animate-pulse scale-115"
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
                      ? "bg-gradient-to-tr from-rose-300 via-amber-200 to-rose-400 animate-spin duration-5000 opacity-95 scale-115"
                    : "bg-gradient-to-tr from-sky-300 via-teal-200 to-indigo-400 animate-spin duration-5000 opacity-95 scale-115"
                  : voiceState === "thinking"
                  ? "bg-gradient-to-tr from-amber-300 to-orange-400 animate-spin duration-3000 opacity-80"
                  : "bg-white/30 animate-pulse opacity-60"
                }`}
              />

              {/* Inner Sparkle Center */}
              <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-white/50 blur-xs animate-ping duration-2000" />
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

          {/* Dynamic Transcription / AI Response Card */}
          <div className="w-full mt-6 px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl text-center min-h-[56px] flex items-center justify-center">
            <p className="text-xs text-zinc-300 italic line-clamp-3">
              {voiceState === "speaking"
                ? lastAiResponse || "..."
                : transcript
                ? `«${transcript}»`
                : "Произнесите любую команду (например: «Рассчитай нормо-часы замены ГРМ на Газели»)"}
            </p>
          </div>
        </div>

        {/* Bottom Control Bar */}
        <div className="w-full max-w-sm flex items-center justify-center space-x-4 z-20 pb-4">
          <button
            type="button"
            onClick={async () => {
              const nextMuted = !isMuted;
              setIsMuted(nextMuted);
              if (nextMuted) {
                try {
                  recognitionRef.current?.stop();
                } catch {}
                setVoiceState("idle");
              } else {
                // Ensure permission on un-mute click
                const micRes = await requestMicrophoneStream();
                if (!micRes.ok && micRes.errorType === "not_allowed") {
                  setShowMicBlockedModal(true);
                  setIsMuted(true);
                  return;
                }
                setVoiceState("listening");
                try {
                  recognitionRef.current?.start();
                } catch {}
              }
            }}
            className={`flex items-center space-x-2 px-5 py-3 rounded-full text-xs font-semibold transition-all cursor-pointer shadow-lg active:scale-95 ${
              isMuted
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                : "bg-white/[0.08] hover:bg-white/[0.14] text-white border border-white/10"
            }`}
          >
            {isMuted ? <MicOff className="w-4 h-4 text-rose-400" /> : <Mic className="w-4 h-4" />}
            <span>{isMuted ? "Включить микрофон" : "Микрофон активен"}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 rounded-full bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-bold transition-all shadow-xl active:scale-95 cursor-pointer"
          >
            Завершить
          </button>
        </div>
      </div>

      <MicPermissionModal
        isOpen={showMicBlockedModal}
        onClose={() => setShowMicBlockedModal(false)}
        onRetry={async () => {
          setShowMicBlockedModal(false);
          const micRes = await requestMicrophoneStream();
          if (micRes.ok) {
            activeStreamRef.current = micRes.stream || null;
            setIsMuted(false);
            resumeListening();
          }
        }}
      />
    </>
  );
};
