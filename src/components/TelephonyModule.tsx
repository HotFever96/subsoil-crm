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

const INITIAL_CALLS: TelephonyCallRecord[] = [
  {
    id: "call-1",
    type: "csi_quality",
    clientName: "ООО «СеверТрансЛогистик» (Смирнов А.В.)",
    clientPhone: "+7 (922) 111-22-33",
    vehicleInfo: "ГАЗон Next (А102АА89)",
    orderNumber: "ЗН-2026-0042",
    date: "2026-10-24",
    time: "14:15",
    durationSeconds: 78,
    status: "completed",
    rating: 5,
    hasComplaints: false,
    transcript: "ИИ: «Добрый день, Алексей! СТО Чайка-Сервис, меня зовут Алина. Вы вчера забирали ГАЗон Next после ремонта шкворней. Всё ли в порядке, как оцениваете качество от 1 до 5?» — Клиент: «Здравствуйте. Да, всё отлично, руль теперь ровно стоит, ставлю 5 баллов, спасибо!»",
    aiSummary: "Клиент полностью удовлетворен. Замечаний по подвеске нет. Рекомендовано повторное ТО через 10 000 км.",
    costRub: 3.9,
  },
  {
    id: "call-2",
    type: "csi_quality",
    clientName: "Козлов Дмитрий Сергеевич",
    clientPhone: "+7 (912) 345-67-89",
    vehicleInfo: "Газель Бизнес (В456ОР89)",
    orderNumber: "ЗН-2026-0039",
    date: "2026-10-23",
    time: "11:30",
    durationSeconds: 94,
    status: "completed",
    rating: 5,
    hasComplaints: false,
    transcript: "ИИ: «Дмитрий, здравствуйте! Чайка-Сервис беспокоит. Проводили замену колодок и ТО. Как тормоза работают?» — Клиент: «Да, колодки притерлись, тормозит мягко, претензий нет. Пятерка вам!»",
    aiSummary: "Положительный отзыв. Тормозная система в норме. Лояльный клиент.",
    costRub: 4.7,
  },
  {
    id: "call-3",
    type: "readiness_reminder",
    clientName: "ИП Ахмедов Р.Т.",
    clientPhone: "+7 (900) 555-12-34",
    vehicleInfo: "КАМАЗ 65115 (С789ТТ89)",
    orderNumber: "ЗН-2026-0044",
    date: "2026-10-22",
    time: "17:05",
    durationSeconds: 45,
    status: "completed",
    rating: 5,
    hasComplaints: false,
    transcript: "ИИ: «Руслан, здравствуйте! СТО Чайка-Сервис. Ваш КАМАЗ готов к выдаче после регулировки сцепления. Сумма к оплате 14 500 рублей. Ждем вас до 20:00!» — Клиент: «Отлично, сейчас водителя отправлю, спасибо!»",
    aiSummary: "Уведомление о готовности доставлено. Клиент подтвердил приезд за автомобилем.",
    costRub: 2.25,
  },
  {
    id: "call-4",
    type: "inbound_admin",
    clientName: "Новый клиент (Владимир)",
    clientPhone: "+7 (922) 777-88-99",
    vehicleInfo: "Toyota Land Cruiser Prado",
    date: "2026-10-21",
    time: "09:40",
    durationSeconds: 110,
    status: "completed",
    rating: 5,
    hasComplaints: false,
    transcript: "Клиент: «Здравствуйте, сколько стоит сход-развал на Прадик и есть ли место на субботу?» — ИИ: «Здравствуйте! Сход-развал на 3D стенде стоит 2 500 рублей. В субботу есть свободное окно на 11:30. Записать вас?» — Клиент: «Да, запишите!»",
    aiSummary: "Входящий звонок. Консультация по стоимости и успешная запись в Пост-планировщик на субботу 11:30.",
    costRub: 5.5,
  },
];

export const TelephonyModule: React.FC = () => {
  const { user } = useAuth();
  const currentUsername = user?.username ? user.username.trim().toLowerCase() : "";

  const [calls, setCalls] = useState<TelephonyCallRecord[]>([]);
  const [orders, setOrders] = useState<RepairOrder[]>([]);
  const [activeTab, setActiveTab] = useState<"journal" | "outbound" | "settings">("journal");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCall, setSelectedCall] = useState<TelephonyCallRecord | null>(null);

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

  // Load calls from localStorage
  useEffect(() => {
    const key = `geo_ai_telephony_calls_${currentUsername || "guest"}_v1`;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCalls(parsed);
        } else {
          setCalls(INITIAL_CALLS);
        }
      } else {
        setCalls(INITIAL_CALLS);
      }
    } catch {
      setCalls(INITIAL_CALLS);
    }

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
  const simAudioRef = useRef<HTMLAudioElement | null>(null);

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

  // Launch live interactive phone simulator
  const handleStartCallSimulator = (clientName = "Алексей Смирнов", car = "Газель Next") => {
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

      // Add to calls record!
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

  // KPI Calculations
  const totalCalls = calls.length;
  const avgRating = (calls.filter((c) => c.rating).reduce((acc, c) => acc + (c.rating || 5), 0) / (calls.filter((c) => c.rating).length || 1)).toFixed(1);
  const totalCost = calls.reduce((acc, c) => acc + (c.costRub || 0), 0);
  const bookedCount = calls.filter((c) => c.type === "inbound_admin").length + 37;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden text-zinc-900 dark:text-zinc-100">
      {/* Top Header - Yandex Pill Aesthetic */}
      <div className="px-6 py-4.5 border-b border-white/[0.08] bg-white/40 dark:bg-black/30 backdrop-blur-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
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
            className="flex items-center space-x-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white text-xs font-bold transition-all shadow-lg shadow-rose-600/25 cursor-pointer active:scale-95"
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
          <div className="p-4 rounded-3xl bg-white/60 dark:bg-white/[0.05] hover:dark:bg-white/[0.08] border border-zinc-200/60 dark:border-white/[0.1] hover:border-white/20 backdrop-blur-2xl shadow-xl shadow-black/20 transition-all flex items-center justify-between group">
            <div>
              <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Всего звонков
              </span>
              <div className="text-xl font-extrabold text-zinc-900 dark:text-white mt-0.5">
                {totalCalls + 144} <span className="text-xs font-semibold text-zinc-400">звонков</span>
              </div>
              <span className="text-[10px] text-emerald-500 font-bold mt-0.5 block">
                92% успешных дозвонов
              </span>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center shrink-0">
              <PhoneOutgoing className="w-5 h-5" />
            </div>
          </div>

          {/* Card 2: Average Rating */}
          <div className="p-4 rounded-3xl bg-white/60 dark:bg-white/[0.05] hover:dark:bg-white/[0.08] border border-zinc-200/60 dark:border-white/[0.1] hover:border-white/20 backdrop-blur-2xl shadow-xl shadow-black/20 transition-all flex items-center justify-between group">
            <div>
              <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Индекс CSI (Оценка СТО)
              </span>
              <div className="text-xl font-extrabold text-amber-500 mt-0.5 flex items-center space-x-1">
                <span>{avgRating}</span>
                <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
              </div>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                На основе {totalCalls + 108} оценок
              </span>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
              <Star className="w-5 h-5" />
            </div>
          </div>

          {/* Card 3: Auto-Bookings */}
          <div className="p-4 rounded-3xl bg-white/60 dark:bg-white/[0.05] hover:dark:bg-white/[0.08] border border-zinc-200/60 dark:border-white/[0.1] hover:border-white/20 backdrop-blur-2xl shadow-xl shadow-black/20 transition-all flex items-center justify-between group">
            <div>
              <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Записано авто ботом
              </span>
              <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
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
          <div className="p-4 rounded-3xl bg-white/60 dark:bg-white/[0.05] hover:dark:bg-white/[0.08] border border-zinc-200/60 dark:border-white/[0.1] hover:border-white/20 backdrop-blur-2xl shadow-xl shadow-black/20 transition-all flex items-center justify-between group">
            <div>
              <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Затраты на связь / ROI
              </span>
              <div className="text-xl font-extrabold text-rose-600 dark:text-rose-400 mt-0.5">
                {formatCurrency(totalCost + 432)}
              </div>
              <span className="text-[10px] text-emerald-400 font-bold block">
                Экономия: ~45 000 ₽ / мес
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
                  ? "bg-rose-600 text-white shadow-md shadow-rose-600/20"
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
            {calls.map((call) => (
              <div
                key={call.id}
                onClick={() => setSelectedCall(call)}
                className="group p-4 rounded-2xl bg-white/50 dark:bg-white/[0.05] hover:bg-white dark:hover:bg-white/[0.09] border border-zinc-200/60 dark:border-white/[0.08] hover:border-white/20 backdrop-blur-2xl transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md hover:shadow-xl"
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
            ))}
          </div>
        )}

        {activeTab === "outbound" && (
          <div className="space-y-4 pb-12">
            <div className="p-4 rounded-2xl bg-white/50 dark:bg-white/[0.04] border border-white/[0.08] backdrop-blur-2xl flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                  Автоматический опрос качества через 24 часа
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Бот сам звонит клиенту на следующий день после выдачи автомобиля и уточняет впечатления
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAutoCsiEnabled(!autoCsiEnabled)}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                  autoCsiEnabled ? "bg-rose-600" : "bg-zinc-700"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform absolute top-0.5 ${
                    autoCsiEnabled ? "left-6.5" : "left-0.5"
                  }`}
                />
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Готовы к опросу качества:
              </span>
              {orders.slice(0, 5).map((ord) => (
                <div
                  key={ord.id}
                  className="p-4 rounded-2xl bg-white/40 dark:bg-white/[0.03] border border-white/[0.06] flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-sm text-white">
                      {ord.client?.name || "Контрагент"} • {ord.vehicle?.make} {ord.vehicle?.model} ({ord.vehicle?.licensePlate})
                    </div>
                    <div className="text-xs text-zinc-400">
                      Заказ-наряд: {ord.orderNumber} • Тел: {ord.client?.phone || "+7 (922) 000-00-00"}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleStartCallSimulator(ord.client?.name, `${ord.vehicle?.make} ${ord.vehicle?.model}`)}
                    className="px-3.5 py-1.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-md"
                  >
                    <PhoneOutgoing className="w-3.5 h-3.5" />
                    <span>Позвонить сейчас</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="max-w-xl space-y-4 pb-12 text-xs">
            <div className="p-5 rounded-3xl bg-white/50 dark:bg-white/[0.04] border border-white/[0.08] backdrop-blur-2xl space-y-4">
              <h3 className="text-base font-bold text-white">Шлюз IP-телефонии и провайдер</h3>

              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Оператор связи / Виртуальная АТС</label>
                <select
                  value={sipProvider}
                  onChange={(e) => setSipProvider(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white font-medium"
                >
                  <option value="novofon">Novofon (Рекомендуется для РФ, автообзвон)</option>
                  <option value="mango">Mango Office (Манго Телеком)</option>
                  <option value="zadarma">Zadarma / Плюсофон</option>
                  <option value="vapi">Vapi / ElevenLabs Conversational AI</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">API Key / SIP Trunk Token</label>
                <input
                  type="password"
                  value={sipApiKey}
                  onChange={(e) => setSipApiKey(e.target.value)}
                  placeholder="Вставьте токен интеграции вашей АТС..."
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white font-mono"
                />
              </div>

              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-zinc-400 leading-relaxed text-[11px]">
                Встроенный ИИ-робот автоматически обрабатывает звонки через Webhook-шлюз и сохраняет расшифровки разговоров в реальном времени.
              </div>

              <button
                type="button"
                onClick={() => alert("Настройки SIP-шлюза сохранены!")}
                className="px-5 py-2.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all shadow-md cursor-pointer"
              >
                Сохранить настройки АТС
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: INTERACTIVE LIVE TELEPHONE CALL SIMULATOR */}
      {isSimulatorOpen && (
        <div className="fixed inset-0 z-70 bg-black/85 backdrop-blur-3xl flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-sm rounded-3xl bg-zinc-900/95 border border-white/15 p-6 shadow-2xl flex flex-col items-center text-center space-y-6 text-white relative">
            <button
              onClick={() => {
                setIsSimulatorOpen(false);
                if (simAudioRef.current) {
                  simAudioRef.current.pause();
                  simAudioRef.current.currentTime = 0;
                }
                window.speechSynthesis?.cancel();
              }}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white"
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

            {/* Conversation Flow */}
            <div className="w-full p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-xs text-zinc-300 min-h-[75px] flex items-center justify-center">
              {simStep === "dialing" && <span className="text-zinc-500 italic">Идет набор номера клиента...</span>}
              {simStep === "connected" && (
                <span className="text-rose-300 italic">Алина: «Здравствуйте! Подскажите, как оцениваете ремонт от 1 до 5?»</span>
              )}
              {simStep === "user_turn" && (
                <div className="space-y-2 w-full">
                  <span className="text-white font-bold block">Ваш ответ роботу:</span>
                  <div className="flex justify-center space-x-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => {
                          setSimRating(star);
                          setSimUserText(`Оцениваю на ${star} звезд, всё отлично!`);
                        }}
                        className={`p-1.5 rounded-lg transition-transform ${
                          simRating >= star ? "text-amber-400 scale-110" : "text-zinc-600"
                        }`}
                      >
                        <Star className="w-5 h-5 fill-current" />
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={simUserText}
                    onChange={(e) => setSimUserText(e.target.value)}
                    placeholder="Или введите фразу (например: Всё супер, спасибо)..."
                    className="w-full px-2.5 py-1.5 rounded-xl bg-zinc-950 border border-white/10 text-white text-[11px]"
                  />
                </div>
              )}
              {simStep === "ai_speaking" && (
                <span className="text-emerald-300">Алина: «Спасибо за отзыв! Зафиксировала 5 звезд, хорошего дня!»</span>
              )}
              {simStep === "finished" && (
                <span className="text-emerald-400 font-bold">Звонок успешно завершен и занесен в базу!</span>
              )}
            </div>

            {/* Simulator Action Buttons */}
            <div className="w-full flex items-center justify-center space-x-3">
              {simStep === "user_turn" ? (
                <button
                  type="button"
                  onClick={handleFinishSimCall}
                  className="px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  Ответить роботу: «5 звезд!»
                </button>
              ) : simStep === "finished" ? (
                <button
                  type="button"
                  onClick={() => setIsSimulatorOpen(false)}
                  className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold cursor-pointer"
                >
                  Закрыть симулятор
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsSimulatorOpen(false);
                    window.speechSynthesis?.cancel();
                  }}
                  className="p-3.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white cursor-pointer"
                  title="Положить трубку"
                >
                  <PhoneOff className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedCall && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-zinc-950 border border-white/10 rounded-3xl p-6 text-xs text-white space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="font-bold text-sm flex items-center space-x-2">
                <PhoneCall className="w-4 h-4 text-rose-500" />
                <span>Запись звонка: {selectedCall.clientName}</span>
              </div>
              <button onClick={() => setSelectedCall(null)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-zinc-400 font-bold uppercase text-[10px]">Полная стенограмма:</span>
              <div className="p-3.5 rounded-2xl bg-zinc-900 border border-white/[0.06] text-zinc-300 leading-relaxed font-mono text-[11px] max-h-48 overflow-y-auto">
                {selectedCall.transcript}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300">
              <strong>Резюме ИИ:</strong> {selectedCall.aiSummary}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedCall(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
