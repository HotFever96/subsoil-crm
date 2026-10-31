"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneOff,
  Headphones,
  Star,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  Settings,
  Sparkles,
  TrendingUp,
  DollarSign,
  Users,
  Search,
  Filter,
  Car,
  Clock,
  Mic,
  MicOff,
  Volume2,
  X,
  HelpCircle,
} from "lucide-react";
import { TelephonyCallRecord, CallType, CallStatus } from "@/lib/telephony-types";
import { RepairOrder } from "@/lib/auto-service-types";
import { getInitialOrders, normalizeRepairOrder, formatCurrency } from "@/lib/auto-service-data";
import { useAuth } from "@/lib/auth-context";
import { requestMicrophoneStream } from "@/lib/microphone-manager";
import { MicPermissionModal } from "@/components/MicPermissionModal";

// Zero mock data: initial list is strictly empty
const INITIAL_CALLS: TelephonyCallRecord[] = [];

export const TelephonyModule: React.FC = () => {
  const { user } = useAuth();
  const currentUsername = user?.username ? user.username.trim().toLowerCase() : "";

  const [calls, setCalls] = useState<TelephonyCallRecord[]>([]);
  const [orders, setOrders] = useState<RepairOrder[]>([]);
  const [activeTab, setActiveTab] = useState<"journal" | "outbound" | "settings">("journal");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCall, setSelectedCall] = useState<TelephonyCallRecord | null>(null);
  const [showMicBlockedModal, setShowMicBlockedModal] = useState(false);

  // Settings state
  const [sipProvider, setSipProvider] = useState<"novofon" | "mango" | "zadarma" | "vapi">("novofon");
  const [autoCsiEnabled, setAutoCsiEnabled] = useState(true);
  const [sipApiKey, setSipApiKey] = useState("");

  // Call simulator state
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [simStep, setSimStep] = useState<"dialing" | "connected" | "ai_speaking" | "user_turn" | "finished">("dialing");
  const [simRating, setSimRating] = useState<number>(5);
  const [simUserText, setSimUserText] = useState("");

  const audioContextRef = useRef<AudioContext | null>(null);
  const simAudioRef = useRef<HTMLAudioElement | null>(null);

  // Load calls strictly from storage without fake entries
  useEffect(() => {
    const key = `geo_ai_telephony_calls_${currentUsername || "guest"}_v1`;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // Filter out legacy hardcoded fake call IDs
          const clean = parsed.filter(
            (c) =>
              c.id !== "call-1" &&
              c.id !== "call-2" &&
              c.id !== "call-3" &&
              c.id !== "call-4"
          );
          if (clean.length !== parsed.length) {
            localStorage.setItem(key, JSON.stringify(clean));
          }
          setCalls(clean);
          return;
        }
      }
    } catch {}
    setCalls([]);

    // Load repair orders for outbound list
    const ordKey = `geo_ai_repair_orders_${currentUsername || "guest"}_v2`;
    try {
      const raw = localStorage.getItem(ordKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setOrders(parsed.map((o) => normalizeRepairOrder(o, currentUsername)));
        } else {
          setOrders(getInitialOrders(currentUsername).map((o) => normalizeRepairOrder(o, currentUsername)));
        }
      }
    } catch {}
  }, [currentUsername]);

  const saveCallsList = (updated: TelephonyCallRecord[]) => {
    setCalls(updated);
    try {
      localStorage.setItem(`geo_ai_telephony_calls_${currentUsername || "guest"}_v1`, JSON.stringify(updated));
    } catch {}
  };

  // Play realistic telephone ring tone via Web Audio API
  const playRingTone = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = ctx;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      // Russian standard PBX ring frequencies: 425 Hz
      osc1.frequency.value = 425;
      osc2.frequency.value = 425;

      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.12, ctx.currentTime + 1.2);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.3);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();

      setTimeout(() => {
        try {
          osc1.stop();
          osc2.stop();
        } catch {}
      }, 1500);
    } catch (e) {
      console.warn("AudioContext tone error:", e);
    }
  };

  // Speak AI text in simulator using ElevenLabs /api/tts streaming with browser speech fallback
  const speakSimVoice = async (text: string, onDone: () => void) => {
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const contentType = res.headers.get("content-type") || "";
      if (res.ok && contentType.includes("audio")) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        if (!simAudioRef.current) {
          simAudioRef.current = new Audio();
        }
        simAudioRef.current.src = url;
        simAudioRef.current.onended = () => {
          URL.revokeObjectURL(url);
          onDone();
        };
        simAudioRef.current.onerror = () => {
          URL.revokeObjectURL(url);
          onDone();
        };
        await simAudioRef.current.play();
        return;
      }
    } catch (e) {
      console.warn("Telephony ElevenLabs TTS fallback to browser:", e);
    }

    // Fallback to browser SpeechSynthesis
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      onDone();
      return;
    }
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = "ru-RU";
    utt.rate = 1.05;
    utt.pitch = 1.2;

    const voices = window.speechSynthesis.getVoices();
    const femaleRu = voices.find(
      (v) =>
        v.lang.startsWith("ru") &&
        (v.name.toLowerCase().includes("svetl") ||
          v.name.toLowerCase().includes("milena") ||
          v.name.toLowerCase().includes("female") ||
          v.name.toLowerCase().includes("google"))
    );
    if (femaleRu) utt.voice = femaleRu;

    utt.onend = onDone;
    utt.onerror = onDone;
    window.speechSynthesis.speak(utt);
  };

  // Launch live interactive phone simulator with explicit getUserMedia click gesture
  const handleStartCallSimulator = async (clientName = "Алексей Смирнов", car = "Газель Next") => {
    // Direct getUserMedia in click gesture
    const micRes = await requestMicrophoneStream();
    if (!micRes.ok && micRes.errorType === "not_allowed") {
      setShowMicBlockedModal(true);
      return;
    }

    setIsSimulatorOpen(true);
    setSimStep("dialing");
    setSimRating(5);
    setSimUserText("");

    // Step 1: Dial tone
    playRingTone();

    // Step 2: Connect after 1.8s
    setTimeout(() => {
      playRingTone();
    }, 1600);

    setTimeout(() => {
      setSimStep("connected");
      // Step 3: Robot speaks
      const intro = `Здравствуйте, ${clientName}! Автосервис Чайка-Сервис, меня зовут Алина. Вы недавно забирали автомобиль ${car} после ремонта. Подскажите, пожалуйста, всё ли вам понравилось и как оцениваете качество работы мастера от одного до пяти?`;
      speakSimVoice(intro, () => {
        setSimStep("user_turn");
      });
    }, 3400);
  };

  const handleFinishSimCall = () => {
    const thankYou = "Большое спасибо за отзыв! Зафиксировала вашу оценку пять баллов. Будем рады видеть вас снова в Чайка-Сервисе, хорошего дня!";
    setSimStep("ai_speaking");
    speakSimVoice(thankYou, () => {
      setSimStep("finished");

      // Add actual call to journal
      const newCall: TelephonyCallRecord = {
        id: `call-${Date.now()}`,
        type: "csi_quality",
        clientName: "Алексей Смирнов (Тестовый звонок)",
        clientPhone: "+7 (922) 111-22-33",
        vehicleInfo: "Газель Next",
        date: new Date().toISOString().slice(0, 10),
        time: new Date().toTimeString().slice(0, 5),
        durationSeconds: 52,
        status: "completed",
        rating: simRating,
        hasComplaints: simRating < 4,
        transcript: `ИИ (Алина): «Здравствуйте! Опрос качества ремонта Газель Next...» — Клиент: «${simUserText || "Всё отлично, мастер молодец, ставлю 5!"}»`,
        aiSummary: `Тестовый звонок успешно завершен. Оценка: ${simRating} ★. Замечаний нет.`,
        costRub: 2.6,
      };

      saveCallsList([newCall, ...calls]);
    });
  };

  // Pure dynamic KPI Calculations (strictly 0 when no calls exist)
  const totalCalls = calls.length;
  const ratedCalls = calls.filter((c) => c.rating);
  const avgRating =
    ratedCalls.length > 0
      ? (ratedCalls.reduce((acc, c) => acc + (c.rating || 5), 0) / ratedCalls.length).toFixed(1)
      : "0.0";
  const totalCost = calls.reduce((acc, c) => acc + (c.costRub || 0), 0);
  const bookedCount = calls.filter((c) => c.type === "inbound_admin").length;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden text-zinc-900 dark:text-zinc-100">
      {/* Top Header - Yandex Pill Aesthetic */}
      <div className="apple-header px-6 py-4.5 border-b border-white/[0.08] bg-white/40 dark:bg-black/30 backdrop-blur-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-rose-500/20 to-purple-500/20 border border-white/10 text-rose-500 flex items-center justify-center shrink-0 shadow-lg shadow-rose-500/10">
            <PhoneCall className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center space-x-2.5">
              <span>ИИ-Телефония и Автообзвон</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20">
                Контроль качества CSI
              </span>
              <div className="relative group inline-block">
                <button
                  type="button"
                  className="p-1 rounded-full text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  title="Справка"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
                <div className="absolute left-0 top-full mt-1.5 hidden group-hover:block z-30 w-72 p-3 rounded-2xl bg-zinc-900/95 text-zinc-100 text-xs shadow-2xl border border-white/10 backdrop-blur-2xl pointer-events-none">
                  Автоматический обзвон клиентов после ремонта, измерение индекса удовлетворенности (CSI), напоминания о готовности авто и умный круглосуточный автоответчик.
                </div>
              </div>
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={() => handleStartCallSimulator("Алексей Смирнов", "Газель Next")}
            className="apple-tap flex items-center space-x-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white text-xs font-bold transition-all shadow-lg shadow-rose-600/25 cursor-pointer active:scale-95"
          >
            <Headphones className="w-4 h-4" />
            <span>🎧 Протестировать звонок ИИ-бота (Симулятор)</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row (Floating Glassmorphism) */}
      <div className="px-6 pt-5 pb-3 shrink-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Total Calls */}
          <div className="apple-kpi-1 apple-card-hover p-4 rounded-3xl bg-white/60 dark:bg-white/[0.05] hover:dark:bg-white/[0.08] border border-zinc-200/60 dark:border-white/[0.1] hover:border-white/20 backdrop-blur-2xl shadow-xl shadow-black/20 transition-all flex items-center justify-between group">
            <div>
              <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Всего звонков
              </span>
              <div className="text-xl font-extrabold text-zinc-900 dark:text-white mt-0.5 font-mono">
                {totalCalls} <span className="text-xs font-semibold text-zinc-400">звонков</span>
              </div>
              <span className="text-[10px] text-zinc-400 mt-0.5 block">
                {totalCalls > 0 ? "Успешные дозвоны" : "Журнал звонков пуст"}
              </span>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center shrink-0">
              <PhoneOutgoing className="w-5 h-5" />
            </div>
          </div>

          {/* Card 2: Average Rating */}
          <div className="apple-kpi-2 apple-card-hover p-4 rounded-3xl bg-white/60 dark:bg-white/[0.05] hover:dark:bg-white/[0.08] border border-zinc-200/60 dark:border-white/[0.1] hover:border-white/20 backdrop-blur-2xl shadow-xl shadow-black/20 transition-all flex items-center justify-between group">
            <div>
              <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Индекс CSI (Оценка СТО)
              </span>
              <div className="text-xl font-extrabold text-amber-500 mt-0.5 flex items-center space-x-1 font-mono">
                <span>{avgRating}</span>
                <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
              </div>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                На основе {ratedCalls.length} оценок
              </span>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
              <Star className="w-5 h-5" />
            </div>
          </div>

          {/* Card 3: Auto-Bookings */}
          <div className="apple-kpi-3 apple-card-hover p-4 rounded-3xl bg-white/60 dark:bg-white/[0.05] hover:dark:bg-white/[0.08] border border-zinc-200/60 dark:border-white/[0.1] hover:border-white/20 backdrop-blur-2xl shadow-xl shadow-black/20 transition-all flex items-center justify-between group">
            <div>
              <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Записано авто ботом
              </span>
              <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">
                {bookedCount} <span className="text-xs font-semibold text-zinc-400">записей</span>
              </div>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                Передано в Пост-планировщик
              </span>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
              <Car className="w-5 h-5" />
            </div>
          </div>

          {/* Card 4: Costs and ROI */}
          <div className="apple-kpi-4 apple-card-hover p-4 rounded-3xl bg-white/60 dark:bg-white/[0.05] hover:dark:bg-white/[0.08] border border-zinc-200/60 dark:border-white/[0.1] hover:border-white/20 backdrop-blur-2xl shadow-xl shadow-black/20 transition-all flex items-center justify-between group">
            <div>
              <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Затраты на связь / ROI
              </span>
              <div className="text-xl font-extrabold text-rose-600 dark:text-rose-400 mt-0.5 font-mono">
                {formatCurrency(totalCost)}
              </div>
              <span className="text-[10px] text-emerald-400 font-bold block">
                {totalCalls > 0 ? "Оптимизация расходов СТО" : "0 ₽ расходов"}
              </span>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Pills */}
      <div className="px-6 py-2.5 flex items-center space-x-2 shrink-0">
        {[
          { id: "journal", label: "Журнал звонков и диалогов" },
          { id: "outbound", label: "Очередь обзвона после ремонта" },
          { id: "settings", label: "Настройки SIP и Webhooks" },
        ].map((t) => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id as any)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? "bg-rose-600 text-white shadow-md shadow-rose-600/25"
                  : "bg-white/40 dark:bg-white/[0.05] text-zinc-600 dark:text-zinc-300 hover:bg-white/70 dark:hover:bg-white/[0.1] border border-white/[0.07]"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-6 py-2">
        {activeTab === "journal" && (
          <div className="space-y-2 pb-12">
            {calls.length === 0 ? (
              <div className="h-full min-h-[320px] flex flex-col items-center justify-center text-center p-8">
                <div className="w-14 h-14 rounded-3xl bg-white/40 dark:bg-white/[0.04] border border-white/10 flex items-center justify-center text-zinc-400 mb-3.5">
                  <PhoneCall className="w-7 h-7 text-rose-500" />
                </div>
                <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">
                  Журнал звонков пуст
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mt-1">
                  Запустите тестовый звонок ИИ-бота или проведите автообзвон по закрытому заказ-наряду.
                </p>
                <button
                  type="button"
                  onClick={() => handleStartCallSimulator("Тестовый клиент", "Автомобиль")}
                  className="apple-tap mt-4 px-5 py-2.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  🎧 Запустить тестовый звонок
                </button>
              </div>
            ) : (
              calls.map((call) => (
                <div
                  key={call.id}
                  onClick={() => setSelectedCall(call)}
                  className="apple-row apple-card-hover group p-4 rounded-2xl bg-white/50 dark:bg-white/[0.05] hover:bg-white dark:hover:bg-white/[0.09] border border-zinc-200/60 dark:border-white/[0.08] hover:border-white/20 backdrop-blur-2xl transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md hover:shadow-xl"
                >
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      {call.type === "inbound_admin" ? (
                        <PhoneIncoming className="w-5 h-5 text-blue-400" />
                      ) : (
                        <PhoneOutgoing className="w-5 h-5 text-rose-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-zinc-900 dark:text-white group-hover:text-rose-500 transition-colors truncate">
                          {call.clientName}
                        </span>
                        <span className="text-xs text-zinc-400 font-mono">({call.clientPhone})</span>
                        {call.rating && (
                          <span className="flex items-center text-xs font-bold text-amber-400">
                            <Star className="w-3.5 h-3.5 fill-amber-400 mr-0.5" />
                            {call.rating}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                        {call.aiSummary}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end space-x-4 shrink-0 text-xs">
                    <div className="text-right">
                      <div className="text-zinc-400">
                        {call.durationSeconds} сек • {call.costRub.toFixed(2)} ₽
                      </div>
                      <div className="text-[10px] text-zinc-500">
                        {call.date} в {call.time}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCall(call);
                      }}
                      className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                      title="Слушать транскрипцию"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "outbound" && (
          <div className="space-y-3 pb-12">
            <div className="p-4 rounded-2xl bg-white/40 dark:bg-white/[0.04] border border-white/[0.08] backdrop-blur-md flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">Автообзвон закрытых заказ-нарядов</h4>
                <p className="text-xs text-zinc-400">
                  Робот автоматически звонит клиенту через 24 часа после выдачи авто и сохраняет оценку в журнал
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-emerald-400 font-semibold">● Активен</span>
              </div>
            </div>

            <div className="space-y-2">
              {orders
                .filter((o) => o.status === "closed" || o.status === "ready")
                .map((ord) => (
                  <div
                    key={ord.id}
                    className="p-4 rounded-2xl bg-white/50 dark:bg-white/[0.04] border border-zinc-200/60 dark:border-white/[0.08] flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-sm text-white">
                        {ord.orderNumber} • {ord.client.name}
                      </div>
                      <div className="text-xs text-zinc-400">
                        {ord.vehicle.make} {ord.vehicle.model} ({ord.vehicle.licensePlate}) • Тел: {ord.client.phone}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleStartCallSimulator(ord.client.name, `${ord.vehicle.make} ${ord.vehicle.model}`)}
                      className="px-4 py-2 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                    >
                      Позвонить сейчас
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="max-w-xl space-y-4 pb-12">
            <div className="p-6 rounded-3xl bg-white/50 dark:bg-white/[0.04] border border-zinc-200/60 dark:border-white/[0.08] backdrop-blur-2xl space-y-4">
              <h3 className="text-sm font-bold text-white">Подключение SIP-телефонии</h3>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Провайдер телефонии:</label>
                <select
                  value={sipProvider}
                  onChange={(e) => setSipProvider(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-zinc-900 border border-white/10 text-white text-xs"
                >
                  <option value="novofon">Novofon (ex-Zadarma) — рекомендовано для СТО</option>
                  <option value="mango">Mango Office (Манго Телеком)</option>
                  <option value="zadarma">Zadarma Cloud PBX</option>
                  <option value="vapi">Vapi.ai Voice Webhook Gateway</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">API Ключ провайдера / SIP Secret:</label>
                <input
                  type="password"
                  placeholder="Вставьте API-ключ телефонии..."
                  value={sipApiKey}
                  onChange={(e) => setSipApiKey(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-zinc-900 border border-white/10 text-white text-xs focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <div className="text-xs font-bold text-white">Автоматический CSI-опрос</div>
                  <div className="text-[11px] text-zinc-400">Звонить роботом после каждого закрытого заказ-наряда</div>
                </div>
                <input
                  type="checkbox"
                  checked={autoCsiEnabled}
                  onChange={(e) => setAutoCsiEnabled(e.target.checked)}
                  className="w-4 h-4 accent-rose-600 rounded"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: INTERACTIVE LIVE TELEPHONE CALL SIMULATOR */}
      {isSimulatorOpen && (
        <div className="fixed inset-0 z-70 bg-black/85 backdrop-blur-3xl flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="apple-sheet w-full max-w-sm rounded-3xl bg-zinc-900/95 border border-white/15 p-6 shadow-2xl flex flex-col items-center text-center space-y-6 text-white relative">
            <button
              onClick={() => {
                setIsSimulatorOpen(false);
                if (simAudioRef.current) {
                  simAudioRef.current.pause();
                  simAudioRef.current.currentTime = 0;
                }
                window.speechSynthesis?.cancel();
              }}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Calling Header */}
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-rose-500 uppercase tracking-wider">
                {simStep === "dialing" ? "Гудки вызова..." : simStep === "connected" ? "ИИ говорит..." : "Линия активна"}
              </span>
              <h3 className="text-lg font-bold text-white">СТО «Чайка-Сервис»</h3>
              <p className="text-xs text-zinc-400">Робот-оператор Алина</p>
            </div>

            {/* Animated Call Avatar */}
            <div className="relative">
              <div
                className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 ${
                  simStep === "dialing"
                    ? "bg-rose-500/20 border border-rose-500/30 animate-pulse"
                    : simStep === "connected" || simStep === "ai_speaking"
                    ? "bg-rose-600 shadow-xl shadow-rose-600/40 animate-wave-sphere"
                    : "bg-emerald-600 shadow-xl shadow-emerald-600/30 scale-105"
                }`}
              >
                {simStep === "user_turn" ? (
                  <Mic className="w-10 h-10 text-white animate-bounce" />
                ) : (
                  <PhoneCall className="w-10 h-10 text-white" />
                )}
              </div>
            </div>

            {/* Interaction step controls */}
            {simStep === "dialing" && (
              <p className="text-xs text-zinc-400 animate-pulse">Соединение с абонентом...</p>
            )}

            {(simStep === "connected" || simStep === "ai_speaking") && (
              <p className="text-xs text-zinc-300 italic">«Здравствуйте! Опрос качества ремонта Чайка-Сервис...»</p>
            )}

            {simStep === "user_turn" && (
              <div className="w-full space-y-4">
                <p className="text-xs text-emerald-400 font-semibold">Ваш ответ роботу (выберите оценку):</p>
                <div className="flex justify-center space-x-2">
                  {[1, 2, 3, 4, 5].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setSimRating(st)}
                      className={`w-9 h-9 rounded-full font-bold text-xs flex items-center justify-center transition-all ${
                        simRating === st
                          ? "bg-amber-400 text-black scale-110 shadow-lg"
                          : "bg-white/10 text-zinc-400 hover:text-white"
                      }`}
                    >
                      {st} ★
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Ваш комментарий (например: Всё супер, спасибо)..."
                  value={simUserText}
                  onChange={(e) => setSimUserText(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-800 border border-white/10 text-xs text-white placeholder:text-zinc-500"
                />

                <button
                  type="button"
                  onClick={handleFinishSimCall}
                  className="w-full py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md cursor-pointer"
                >
                  Ответить и завершить звонок
                </button>
              </div>
            )}

            {simStep === "finished" && (
              <div className="space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <p className="text-xs text-white font-bold">Звонок успешно зафиксирован в журнале!</p>
                <button
                  type="button"
                  onClick={() => setIsSimulatorOpen(false)}
                  className="px-6 py-2 rounded-full bg-white text-zinc-900 font-bold text-xs"
                >
                  Закрыть
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selected Call Detail Modal */}
      {selectedCall && (
        <div className="fixed inset-0 z-70 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="apple-sheet w-full max-w-lg rounded-3xl bg-zinc-900 border border-white/10 p-6 shadow-2xl space-y-4 text-white relative">
            <button onClick={() => setSelectedCall(null)} className="absolute top-4 right-4 text-zinc-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center">
                <PhoneCall className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">{selectedCall.clientName}</h3>
                <p className="text-xs text-zinc-400">{selectedCall.clientPhone} • {selectedCall.date}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-1.5">
              <span className="text-[11px] font-bold text-zinc-400 uppercase">ИИ-Резюме разговора:</span>
              <p className="text-xs text-zinc-200 leading-relaxed">{selectedCall.aiSummary}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-2">
              <span className="text-[11px] font-bold text-zinc-400 uppercase">Полная стенограмма:</span>
              <p className="text-xs text-zinc-300 font-mono leading-relaxed whitespace-pre-wrap">{selectedCall.transcript}</p>
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-400 pt-2">
              <span>Длительность: {selectedCall.durationSeconds} сек</span>
              <span>Стоимость: {selectedCall.costRub.toFixed(2)} ₽</span>
            </div>
          </div>
        </div>
      )}

      {/* Microphone Permission Modal */}
      <MicPermissionModal
        isOpen={showMicBlockedModal}
        onClose={() => setShowMicBlockedModal(false)}
        onRetry={() => {
          setShowMicBlockedModal(false);
          handleStartCallSimulator();
        }}
      />
    </div>
  );
};
