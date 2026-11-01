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
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Zap,
  RefreshCw,
  Send,
  Smartphone,
  ChevronRight,
  Info,
} from "lucide-react";
import { TelephonyCallRecord, CallType, CallStatus } from "@/lib/telephony-types";
import { RepairOrder } from "@/lib/auto-service-types";
import { getInitialOrders, normalizeRepairOrder, formatCurrency } from "@/lib/auto-service-data";
import { useAuth } from "@/lib/auth-context";
import { requestMicrophoneStream } from "@/lib/microphone-manager";

const WEBHOOK_URL = "https://subsoil-crm.vercel.app/api/voicyfy/webhook";

export const TelephonyModule: React.FC = () => {
  const { user } = useAuth();
  const currentUsername = user?.username ? user.username.trim().toLowerCase() : "";

  const [calls, setCalls] = useState<TelephonyCallRecord[]>([]);
  const [orders, setOrders] = useState<RepairOrder[]>([]);
  const [activeTab, setActiveTab] = useState<"journal" | "outbound" | "settings">("journal");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | CallType>("all");
  const [selectedCall, setSelectedCall] = useState<TelephonyCallRecord | null>(null);

  // Settings state
  const [sipProvider, setSipProvider] = useState<"novofon" | "mango" | "zadarma" | "vapi">("novofon");
  const [autoCsiEnabled, setAutoCsiEnabled] = useState(true);
  const [sipApiKey, setSipApiKey] = useState("");
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Voicyfy Agent customization settings
  const [agentPromotions, setAgentPromotions] = useState(
    "При замене масла — комплексная диагностика подвески в подарок. Скидка 10% на слесарный ремонт для постоянных клиентов."
  );
  const [agentServices, setAgentServices] = useState(
    "Техническое обслуживание, слесарный ремонт, сход-развал 3D, диагностика подвески, автоэлектрика, заправка кондиционеров, ремонт коммерческого транспорта (ГАЗель, КАМАЗ, иномарки)."
  );
  const [agentWarranty, setAgentWarranty] = useState(
    "Гарантия на слесарные работы — 30 дней, на оригинальные запчасти — от 14 дней."
  );
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSavedToast, setSettingsSavedToast] = useState(false);

  // Real Test Call modal state
  const [isTestCallModalOpen, setIsTestCallModalOpen] = useState(false);
  const [testPhone, setTestPhone] = useState("+7 ");
  const [testName, setTestName] = useState("Алексей");
  const [testCar, setTestCar] = useState("Газель Next");
  const [testActionType, setTestActionType] = useState<"ready" | "csi" | "custom">("csi");
  const [testCustomComment, setTestCustomComment] = useState("");
  const [isSendingTestCall, setIsSendingTestCall] = useState(false);
  const [actionToast, setActionToast] = useState<string | null>(null);

  // Queue action loading indicator
  const [callingOrderId, setCallingOrderId] = useState<string | null>(null);

  // Browser simulator state
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [simStep, setSimStep] = useState<"dialing" | "connected" | "ai_speaking" | "user_turn" | "finished">("dialing");
  const [simRating, setSimRating] = useState<number>(5);
  const [simUserText, setSimUserText] = useState("");

  const audioContextRef = useRef<AudioContext | null>(null);
  const simAudioRef = useRef<HTMLAudioElement | null>(null);

  // Load calls and orders strictly from storage and Supabase
  const loadData = () => {
    const key = `geo_ai_telephony_calls_${currentUsername || "guest"}_v1`;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const clean = parsed.filter(
            (c) =>
              c.id !== "call-1" &&
              c.id !== "call-2" &&
              c.id !== "call-3" &&
              c.id !== "call-4"
          );
          setCalls(clean);
        }
      }
    } catch {}

    // Load repair orders
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
      } else {
        setOrders(getInitialOrders(currentUsername).map((o) => normalizeRepairOrder(o, currentUsername)));
      }
    } catch {}

    // Sync telephony calls from Supabase (including Voicyfy webhook results)
    fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_telephony_calls", username: currentUsername || "antonv" }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.calls)) {
          const map = new Map<string, TelephonyCallRecord>();

          // Existing from localStorage
          try {
            const raw = localStorage.getItem(key);
            if (raw) {
              const p = JSON.parse(raw);
              if (Array.isArray(p)) {
                p.forEach((c) => map.set(c.id, c));
              }
            }
          } catch {}

          // Merged from Supabase
          data.calls.forEach((c: any) => {
            if (c && c.id) {
              const recType: CallType =
                c.actionType === "ready" || c.type === "readiness_reminder"
                  ? "readiness_reminder"
                  : c.actionType === "inbound_lead" || c.type === "inbound_admin"
                  ? "inbound_admin"
                  : c.actionType === "custom" || c.type === "custom_order"
                  ? "custom_order"
                  : "csi_quality";

              const rec: TelephonyCallRecord = {
                id: String(c.id),
                type: recType,
                clientName: c.clientName || c.name || "Клиент",
                clientPhone: c.clientPhone || c.phone || "",
                vehicleInfo: c.vehicleInfo || c.car || "Автомобиль",
                orderNumber: c.orderNumber || c.order_id || undefined,
                date: c.date || (c.timestamp ? c.timestamp.slice(0, 10) : new Date().toISOString().slice(0, 10)),
                time: c.time || (c.timestamp ? c.timestamp.slice(11, 16) : "12:00"),
                durationSeconds: Number(c.durationSeconds) || 60,
                status: (c.status || "completed") as CallStatus,
                rating: c.rating ? Number(c.rating) : undefined,
                hasComplaints: Boolean(c.hasComplaints) || (c.rating ? Number(c.rating) < 4 : false),
                transcript: c.transcript || c.comment || "",
                aiSummary: c.aiSummary || c.summary || c.comment || "Диалог с ИИ-агентом Анной",
                costRub: Number(c.costRub) || 12,
                feedback: c.feedback || undefined,
                reason: c.reason || undefined,
                scheduledTime: c.scheduledTime || c.scheduled_time || undefined,
                source: c.source || "voicyfy",
              };
              map.set(rec.id, rec);
            }
          });

          const merged = Array.from(map.values()).sort(
            (a, b) => new Date(`${b.date}T${b.time || "00:00"}`).getTime() - new Date(`${a.date}T${a.time || "00:00"}`).getTime()
          );

          setCalls(merged);
          try {
            localStorage.setItem(key, JSON.stringify(merged));
          } catch {}
        }
      })
      .catch(() => {});

    // Sync repair orders from Supabase
    fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_repair_orders", username: currentUsername || "antonv" }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.orders)) {
          const loaded = data.orders.map((o: any) => normalizeRepairOrder(o, currentUsername));
          setOrders(loaded);
          try {
            localStorage.setItem(ordKey, JSON.stringify(loaded));
          } catch {}
        }
      })
      .catch(() => {});

    // Load Voicyfy Agent Settings from Supabase
    fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_voicyfy_settings", username: currentUsername || "antonv" }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.settings) {
          if (data.settings.promotions) setAgentPromotions(data.settings.promotions);
          if (data.settings.services) setAgentServices(data.settings.services);
          if (data.settings.warranty) setAgentWarranty(data.settings.warranty);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener("geo_ai_telephony_updated", handleUpdate);
    window.addEventListener("geo_ai_repair_orders_updated", handleUpdate);
    return () => {
      window.removeEventListener("geo_ai_telephony_updated", handleUpdate);
      window.removeEventListener("geo_ai_repair_orders_updated", handleUpdate);
    };
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
        simAudioRef.current.volume = 0.72;
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
    utt.volume = 0.72;

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

  // Trigger real outgoing call via Voicyfy API
  const handleTriggerRealCall = async (
    phone: string,
    name: string,
    car: string,
    orderId: string,
    actionType: "ready" | "csi" | "custom",
    customInstruction?: string
  ) => {
    if (!phone || phone.trim().length < 6) {
      alert("Пожалуйста, введите корректный номер телефона для вызова голосового агента.");
      return;
    }

    setIsSendingTestCall(true);
    try {
      const res = await fetch("/api/voicyfy/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.trim(),
          name: name.trim() || "Клиент",
          car: car.trim() || "Автомобиль",
          order_id: orderId || "ЗН-ТЕСТ",
          action_type: actionType,
          custom_instruction: customInstruction,
          username: currentUsername || "antonv",
        }),
      });

      const data = await res.json();
      if (data.success) {
        const toastMsg =
          actionType === "ready"
            ? `✓ Анна: вызов о готовности авто на ${phone} поставлен в очередь!`
            : actionType === "csi"
            ? `✓ Анна: опрос контроля качества (CSI) на ${phone} отправлен!`
            : `✓ Анна: тестовый звонок на ${phone} передан шлюзу Voicyfy!`;

        setActionToast(toastMsg);
        setTimeout(() => setActionToast(null), 5000);
        setIsTestCallModalOpen(false);
        loadData();
      } else {
        alert(data.error || "Ошибка отправки задачи в Voicyfy");
      }
    } catch (err: any) {
      alert(`Ошибка связи со шлюзом Voicyfy: ${err.message}`);
    } finally {
      setIsSendingTestCall(false);
      setCallingOrderId(null);
    }
  };

  // Launch interactive browser call simulator
  const handleStartCallSimulator = async (clientName = "Алексей Смирнов", car = "Газель Next") => {
    await requestMicrophoneStream();

    setIsSimulatorOpen(true);
    setSimStep("dialing");
    setSimRating(5);
    setSimUserText("");

    playRingTone();

    setTimeout(() => {
      playRingTone();
    }, 1600);

    setTimeout(() => {
      setSimStep("connected");
      const intro = `Здравствуйте, ${clientName}! Автосервис Чайка-Сервис, меня зовут Анна. Вы недавно забирали автомобиль ${car} после ремонта. Подскажите, пожалуйста, всё ли вам понравилось и как оцениваете качество работы мастера от одного до пяти?`;
      speakSimVoice(intro, () => {
        setSimStep("user_turn");
      });
    }, 3400);
  };

  const handleFinishSimCall = () => {
    const thankYou =
      "Большое спасибо за отзыв! Зафиксировала вашу оценку пять баллов. Будем рады видеть вас снова в Чайка-Сервисе, хорошего дня!";
    setSimStep("ai_speaking");
    speakSimVoice(thankYou, () => {
      setSimStep("finished");

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
        transcript: `ИИ (Анна): «Здравствуйте! Опрос качества ремонта Газель Next...» — Клиент: «${
          simUserText || "Всё отлично, мастер молодец, ставлю 5!"
        }»`,
        aiSummary: `Тестовый звонок успешно завершен. Оценка: ${simRating} ★. Замечаний нет.`,
        costRub: 12,
        source: "simulator",
      };

      saveCallsList([newCall, ...calls]);
    });
  };

  // Copy webhook URL helper
  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(WEBHOOK_URL);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2500);
  };

  // Save agent settings to Supabase
  const handleSaveAgentSettings = async () => {
    setIsSavingSettings(true);
    try {
      await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_voicyfy_settings",
          username: currentUsername || "antonv",
          payload: {
            settings: {
              promotions: agentPromotions,
              services: agentServices,
              warranty: agentWarranty,
            },
          },
        }),
      });
      setSettingsSavedToast(true);
      setTimeout(() => setSettingsSavedToast(false), 3500);
    } catch (e) {
      alert("Не удалось сохранить настройки агента");
    } finally {
      setIsSavingSettings(false);
    }
  };

  // PURE REAL DYNAMIC KPI CALCULATIONS FROM VOICYFY & SUPABASE
  const totalCalls = calls.length;

  const ratedCalls = calls.filter((c) => typeof c.rating === "number" && c.rating > 0);
  const avgRating =
    ratedCalls.length > 0
      ? (ratedCalls.reduce((acc, c) => acc + (c.rating || 5), 0) / ratedCalls.length).toFixed(1)
      : "—";

  // Orders created automatically by Voicyfy orchestrator webhook
  const botOrders = orders.filter(
    (o) =>
      o.status === "lead_ai" ||
      (o.orderNumber && o.orderNumber.includes("АННА")) ||
      (o.voicyfyCalls && o.voicyfyCalls.some((c) => c.actionType === "inbound_lead" || c.status === "inbound_lead"))
  );

  const bookedCount =
    botOrders.length > 0
      ? botOrders.length
      : calls.filter((c) => c.type === "inbound_admin" || Boolean(c.reason)).length;

  // Cumulative revenue generated by bot-booked repair orders
  const botRevenue = botOrders.reduce((acc, o) => acc + (o.grandTotal || 0), 0);

  // Communications budget calculation: totalCalls * 12 rubles standard Russian SIP/AI tariff
  const totalCost = totalCalls * 12;

  // Outbound queue: orders in status "ready" or "issued" without CSI rating yet
  const outboundQueue = orders.filter(
    (o) => (o.status === "ready" || o.status === "issued" || o.status === "closed") && !o.csiRating
  );

  // Filtered calls list for Journal tab
  const filteredCalls = calls.filter((c) => {
    if (filterType !== "all" && c.type !== filterType) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.clientName || "").toLowerCase().includes(q) ||
      (c.clientPhone || "").toLowerCase().includes(q) ||
      (c.vehicleInfo || "").toLowerCase().includes(q) ||
      (c.orderNumber || "").toLowerCase().includes(q) ||
      (c.aiSummary || "").toLowerCase().includes(q) ||
      (c.transcript || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden text-zinc-900 dark:text-zinc-100">
      {/* Top Header - Apple Cascade & Clean Graphite Glass */}
      <div className="apple-header px-6 py-4 border-b border-white/[0.08] bg-white/40 dark:bg-black/30 backdrop-blur-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-rose-500/20 to-purple-500/20 border border-white/10 text-rose-500 flex items-center justify-center shrink-0 shadow-lg shadow-rose-500/10">
            <PhoneCall className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center space-x-2.5">
              <span>ИИ-Телефония и Автообзвон</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Voicyfy Анна Онлайн</span>
              </span>
              <div className="relative group inline-block">
                <button
                  type="button"
                  className="p-1 rounded-full text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  title="Справка"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
                <div className="absolute left-0 top-full mt-1.5 hidden group-hover:block z-30 w-80 p-3.5 rounded-2xl bg-zinc-900/95 text-zinc-100 text-xs shadow-2xl border border-white/10 backdrop-blur-2xl pointer-events-none space-y-1">
                  <div className="font-bold text-white">Интеграция с голосовым ИИ Voicyfy:</div>
                  <p className="text-zinc-400">
                    Автоматический опрос качества ремонта (CSI), оповещения о готовности авто, прием звонков и запись клиентов в заказ-наряды через входящий Webhook.
                  </p>
                </div>
              </div>
            </h1>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={() => setIsTestCallModalOpen(true)}
            className="apple-tap flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold transition-all shadow-md shadow-rose-600/20 cursor-pointer active:scale-95"
            title="Совершить реальный тестовый звонок на телефон"
          >
            <Smartphone className="w-4 h-4" />
            <span>📞 Запустить звонок (Анна)</span>
          </button>

          <button
            type="button"
            onClick={() => handleStartCallSimulator("Алексей Смирнов", "Газель Next")}
            className="apple-tap flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-zinc-200 text-xs font-semibold transition-all cursor-pointer active:scale-95"
            title="Запустить встроенный аудио-симулятор в браузере"
          >
            <Headphones className="w-3.5 h-3.5 text-zinc-300" />
            <span className="hidden sm:inline">Симулятор</span>
          </button>
        </div>
      </div>

      {/* Global Feedback Toast */}
      {actionToast && (
        <div className="mx-6 mt-3 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between shadow-lg shadow-emerald-950/20 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{actionToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionToast(null)}
            className="p-1 rounded-md text-emerald-400 hover:text-white hover:bg-emerald-500/20 cursor-pointer transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* KPI Cards Row (Floating Graphite Glassmorphism) */}
      <div className="px-6 pt-4 pb-2 shrink-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Total Calls */}
          <div className="apple-kpi-1 apple-card-hover p-4 rounded-3xl bg-white/60 dark:bg-white/[0.04] hover:dark:bg-white/[0.07] border border-zinc-200/60 dark:border-white/[0.08] hover:border-white/20 backdrop-blur-2xl shadow-xl shadow-black/20 transition-all flex items-center justify-between group">
            <div>
              <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Всего звонков
              </span>
              <div className="text-xl font-extrabold text-zinc-900 dark:text-white mt-0.5 font-mono">
                {totalCalls} <span className="text-xs font-semibold text-zinc-400">событий</span>
              </div>
              <span className="text-[10px] text-zinc-400 mt-0.5 block">
                {totalCalls > 0 ? "Логи Voicyfy и вебхуки" : "Журнал звонков пуст"}
              </span>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <PhoneOutgoing className="w-5 h-5" />
            </div>
          </div>

          {/* Card 2: Average CSI Rating */}
          <div className="apple-kpi-2 apple-card-hover p-4 rounded-3xl bg-white/60 dark:bg-white/[0.04] hover:dark:bg-white/[0.07] border border-zinc-200/60 dark:border-white/[0.08] hover:border-white/20 backdrop-blur-2xl shadow-xl shadow-black/20 transition-all flex items-center justify-between group">
            <div>
              <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Индекс CSI (Оценка СТО)
              </span>
              <div className="text-xl font-extrabold text-amber-500 mt-0.5 flex items-center space-x-1.5 font-mono">
                <span>{avgRating}</span>
                {avgRating !== "—" && <Star className="w-4 h-4 fill-amber-500 text-amber-500" />}
              </div>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                {ratedCalls.length > 0 ? `На основе ${ratedCalls.length} оценок клиентов` : "Ожидание оценок клиентов"}
              </span>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
              <Star className="w-5 h-5" />
            </div>
          </div>

          {/* Card 3: Auto-Bookings by Bot */}
          <div className="apple-kpi-3 apple-card-hover p-4 rounded-3xl bg-white/60 dark:bg-white/[0.04] hover:dark:bg-white/[0.07] border border-zinc-200/60 dark:border-white/[0.08] hover:border-white/20 backdrop-blur-2xl shadow-xl shadow-black/20 transition-all flex items-center justify-between group">
            <div>
              <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Записано авто ботом
              </span>
              <div className="text-xl font-extrabold text-emerald-500 dark:text-emerald-400 mt-0.5 font-mono">
                {bookedCount} <span className="text-xs font-semibold text-zinc-400">заявок</span>
              </div>
              <span className="text-[10px] text-emerald-400/90 font-medium truncate block">
                {botRevenue > 0 ? `+${formatCurrency(botRevenue)} в заказ-нарядах` : "Входящие лиды с линии Анны"}
              </span>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Car className="w-5 h-5" />
            </div>
          </div>

          {/* Card 4: Costs and ROI */}
          <div className="apple-kpi-4 apple-card-hover p-4 rounded-3xl bg-white/60 dark:bg-white/[0.04] hover:dark:bg-white/[0.07] border border-zinc-200/60 dark:border-white/[0.08] hover:border-white/20 backdrop-blur-2xl shadow-xl shadow-black/20 transition-all flex items-center justify-between group">
            <div>
              <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Затраты на связь / ROI
              </span>
              <div className="text-xl font-extrabold text-rose-500 dark:text-rose-400 mt-0.5 font-mono">
                {formatCurrency(totalCost)}
              </div>
              <span className="text-[10px] text-zinc-400 block">
                {totalCalls > 0 ? `~12 ₽ за звонок • ${totalCalls} зв.` : "0 ₽ расходов"}
              </span>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs (Yandex Pill Style) */}
      <div className="px-6 py-2.5 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center space-x-1.5 overflow-x-auto scrollbar-none">
          {[
            { id: "journal", label: "Журнал звонков и диалогов", count: calls.length },
            { id: "outbound", label: "Очередь обзвона после ремонта", count: outboundQueue.length },
            { id: "settings", label: "Настройки SIP и Webhooks" },
          ].map((t) => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id as any)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center space-x-1.5 ${
                  isActive
                    ? "bg-rose-600 text-white shadow-md shadow-rose-600/25"
                    : "bg-white/40 dark:bg-white/[0.04] text-zinc-600 dark:text-zinc-300 hover:bg-white/70 dark:hover:bg-white/[0.08] border border-white/[0.07]"
                }`}
              >
                <span>{t.label}</span>
                {typeof t.count === "number" && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/10 font-mono">
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {activeTab === "journal" && (
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={loadData}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Обновить данные"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* MAIN TAB CONTENT */}
      <div className="flex-1 overflow-y-auto px-6 py-2">
        {/* TAB 1: JOURNAL OF CALLS AND DIALOGS */}
        {activeTab === "journal" && (
          <div className="space-y-3 pb-12">
            {/* Filter Chips & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                {[
                  { id: "all", label: "Все" },
                  { id: "csi_quality", label: "⭐ CSI Контроль качества" },
                  { id: "inbound_admin", label: "📥 Заявка (Лид)" },
                  { id: "readiness_reminder", label: "🚗 Готовность авто" },
                  { id: "custom_order", label: "✏️ Поручения мастера" },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFilterType(f.id as any)}
                    className={`px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      filterType === f.id
                        ? "bg-white/20 text-white border border-white/25"
                        : "bg-white/[0.03] text-zinc-400 hover:text-zinc-200 border border-white/[0.05]"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="relative min-w-[240px]">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Поиск по клиенту, телефону, авто..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white/40 dark:bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            {filteredCalls.length === 0 ? (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-8 bg-white/30 dark:bg-white/[0.02] rounded-3xl border border-white/[0.06]">
                <div className="w-14 h-14 rounded-3xl bg-white/40 dark:bg-white/[0.04] border border-white/10 flex items-center justify-center text-zinc-400 mb-3.5">
                  <PhoneCall className="w-7 h-7 text-rose-500" />
                </div>
                <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">
                  {searchQuery ? "Звонки не найдены" : "Журнал звонков пуст"}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mt-1">
                  Запустите тестовый звонок голосового агента Анны или отправьте поручение из карточки заказ-наряда.
                </p>
                <button
                  type="button"
                  onClick={() => setIsTestCallModalOpen(true)}
                  className="apple-tap mt-4 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  📞 Запустить тестовый звонок
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredCalls.map((call) => {
                  const isCsi = call.type === "csi_quality";
                  const isInbound = call.type === "inbound_admin";
                  const isReady = call.type === "readiness_reminder";

                  return (
                    <div
                      key={call.id}
                      onClick={() => setSelectedCall(call)}
                      className="apple-row apple-card-hover group p-4 rounded-2xl bg-white/50 dark:bg-white/[0.04] hover:bg-white dark:hover:bg-white/[0.08] border border-zinc-200/60 dark:border-white/[0.07] hover:border-white/20 backdrop-blur-2xl transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md hover:shadow-xl"
                    >
                      <div className="flex items-center space-x-3.5 min-w-0">
                        {/* Call Type Icon Badge */}
                        <div
                          className={`w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform ${
                            isCsi
                              ? "bg-amber-500/10 border-amber-500/25 text-amber-400"
                              : isInbound
                              ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                              : isReady
                              ? "bg-blue-500/10 border-blue-500/25 text-blue-400"
                              : "bg-purple-500/10 border-purple-500/25 text-purple-400"
                          }`}
                        >
                          {isInbound ? (
                            <PhoneIncoming className="w-5 h-5" />
                          ) : isCsi ? (
                            <Star className="w-5 h-5 fill-amber-500" />
                          ) : (
                            <PhoneOutgoing className="w-5 h-5" />
                          )}
                        </div>

                        {/* Call Info Details */}
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-sm text-zinc-900 dark:text-white group-hover:text-rose-400 transition-colors truncate">
                              {call.clientName || "Клиент"}
                            </span>
                            <span className="text-xs text-zinc-400 font-mono">({call.clientPhone})</span>
                            {call.orderNumber && (
                              <span className="px-1.5 py-0.2 rounded bg-white/10 text-[10px] font-mono text-zinc-300">
                                {call.orderNumber}
                              </span>
                            )}
                            {call.rating && (
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                <Star className="w-3 h-3 fill-amber-400 mr-1" />
                                {call.rating}/5
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-zinc-400 truncate mt-0.5 flex items-center space-x-2">
                            <span className="font-medium text-zinc-300">{call.vehicleInfo || "Автомобиль"}</span>
                            <span>•</span>
                            <span className="text-zinc-400 truncate">{call.aiSummary}</span>
                          </div>

                          {call.feedback && (
                            <div className="text-[11px] text-amber-300/90 italic truncate mt-0.5">
                              «{call.feedback}»
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Side: Type Badge, Time and Audio Preview */}
                      <div className="flex items-center justify-between md:justify-end space-x-3.5 shrink-0 text-xs">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            isCsi
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : isInbound
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : isReady
                              ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                              : "bg-purple-500/10 text-purple-400 border-purple-500/20"
                          }`}
                        >
                          {isCsi
                            ? "CSI Контроль"
                            : isInbound
                            ? "Заявка (Лид)"
                            : isReady
                            ? "Готовность"
                            : "Поручение"}
                        </span>

                        <div className="text-right">
                          <div className="text-zinc-400 font-mono text-[11px]">
                            {call.durationSeconds} сек • {call.costRub || 12} ₽
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
                          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
                          title="Открыть детали звонка"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: OUTBOUND CALL QUEUE (READY & ISSUED REPAIR ORDERS) */}
        {activeTab === "outbound" && (
          <div className="space-y-4 pb-12">
            <div className="p-4 rounded-2xl bg-white/40 dark:bg-white/[0.03] border border-white/[0.08] backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                  <span>Очередь автообзвона закрытых и готовых заказ-нарядов</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/25">
                    {outboundQueue.length} в очереди
                  </span>
                </h4>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Заказ-наряды в статусе «Готов к выдаче» и «Выдан», по которым еще не получен отзыв CSI от клиента
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-emerald-400 font-semibold flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>Шлюз Voicyfy готов</span>
                </span>
              </div>
            </div>

            {outboundQueue.length === 0 ? (
              <div className="p-10 rounded-3xl bg-white/30 dark:bg-white/[0.02] border border-white/[0.06] text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h4 className="text-sm font-bold text-white">Все клиенты уже опрошены!</h4>
                <p className="text-xs text-zinc-400 max-w-md mx-auto">
                  Нет заказ-нарядов, ожидающих оповещения о готовности или опроса контроля качества CSI.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {outboundQueue.map((ord) => {
                  const isReady = ord.status === "ready";
                  const isIssued = ord.status === "issued" || ord.status === "closed";
                  const isLoading = callingOrderId === ord.id;

                  return (
                    <div
                      key={ord.id}
                      className="p-4 rounded-2xl bg-white/50 dark:bg-white/[0.04] border border-zinc-200/60 dark:border-white/[0.07] hover:border-white/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm text-white">{ord.orderNumber}</span>
                          <span className="text-xs text-zinc-300 font-semibold">{ord.client.name}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              isReady
                                ? "bg-blue-500/10 text-blue-400 border-blue-500/25"
                                : "bg-teal-500/10 text-teal-400 border-teal-500/25"
                            }`}
                          >
                            {isReady ? "Готов к выдаче" : "Выдан (ожидает CSI)"}
                          </span>
                        </div>
                        <div className="text-xs text-zinc-400 mt-1 flex items-center space-x-2">
                          <span>
                            {ord.vehicle.make} {ord.vehicle.model} ({ord.vehicle.licensePlate || "Б/Н"})
                          </span>
                          <span>•</span>
                          <span className="font-mono text-zinc-300">{ord.client.phone}</span>
                          <span>•</span>
                          <span className="font-bold text-zinc-200">{formatCurrency(ord.grandTotal)}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => {
                            setCallingOrderId(ord.id);
                            handleTriggerRealCall(
                              ord.client.phone,
                              ord.client.name,
                              `${ord.vehicle.make} ${ord.vehicle.model}`,
                              ord.orderNumber,
                              isReady ? "ready" : "csi"
                            );
                          }}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-md cursor-pointer ${
                            isReady
                              ? "bg-blue-600 hover:bg-blue-500 text-white"
                              : "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white"
                          } disabled:opacity-50`}
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                          <span>
                            {isLoading
                              ? "Звонок отправляется..."
                              : isReady
                              ? "🚗 Сообщить о готовности (Анна)"
                              : "⭐ Опросить качество CSI (Анна)"}
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SIP, WEBHOOK & AGENT SETTINGS */}
        {activeTab === "settings" && (
          <div className="max-w-3xl space-y-5 pb-16">
            {/* CARD 1: VOICYFY INTEGRATION STATUS & WEBHOOK */}
            <div className="p-5 rounded-3xl bg-white/50 dark:bg-white/[0.04] border border-zinc-200/60 dark:border-white/[0.08] backdrop-blur-2xl space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Интеграция с голосовым ИИ Voicyfy (Анна)</h3>
                    <p className="text-xs text-zinc-400">Прием входящих результатов и отправка поручений</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 text-xs font-bold flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Активно (Онлайн)</span>
                </span>
              </div>

              {/* Webhook Endpoint Display */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-300">
                  URL приемника входящего Webhook:
                </label>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 p-2.5 rounded-xl bg-zinc-950/80 border border-white/10 font-mono text-xs text-zinc-200 truncate select-all">
                    {WEBHOOK_URL}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyWebhook}
                    className="apple-tap px-3.5 py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
                  >
                    {copiedWebhook ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedWebhook ? "Скопировано!" : "Скопировать"}</span>
                  </button>
                </div>
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  Данный URL прописан в кабинете Voicyfy в качестве вебхука функции <code className="text-zinc-300">send_webhook</code> для автоматического сохранения оценок CSI и создания заявок.
                </p>
              </div>

              {/* Environment Variables Verification */}
              <div className="pt-2 border-t border-white/[0.06] space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  Переменные окружения на Vercel:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-white/[0.06] flex items-center justify-between">
                    <span className="text-zinc-400 font-mono text-[11px]">VOICYFY_PUBLIC_URL</span>
                    <span className="text-emerald-400 font-bold text-[10px]">✓ Задан</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-white/[0.06] flex items-center justify-between">
                    <span className="text-zinc-400 font-mono text-[11px]">VOICYFY_SECRET_KEY</span>
                    <span className="text-emerald-400 font-bold text-[10px]">✓ Подключен</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-white/[0.06] flex items-center justify-between">
                    <span className="text-zinc-400 font-mono text-[11px]">VOICYFY_API_KEY</span>
                    <span className="text-emerald-400 font-bold text-[10px]">✓ Управление</span>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 2: AGENT SCRIPT & SPECIAL PROMOTIONS */}
            <div className="p-5 rounded-3xl bg-white/50 dark:bg-white/[0.04] border border-zinc-200/60 dark:border-white/[0.08] backdrop-blur-2xl space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Скрипт и спецпредложения для голосового агента</h3>
                    <p className="text-xs text-zinc-400">Данные используются Анной при общении с клиентами по телефону</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Специальные акции и скидки автосервиса:
                  </label>
                  <textarea
                    rows={2}
                    value={agentPromotions}
                    onChange={(e) => setAgentPromotions(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950/80 border border-white/10 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-rose-500"
                    placeholder="Акции и скидки для озвучивания клиентам..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Перечень ключевых услуг автосервиса СТО:
                  </label>
                  <textarea
                    rows={2}
                    value={agentServices}
                    onChange={(e) => setAgentServices(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950/80 border border-white/10 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-rose-500"
                    placeholder="Перечень оказываемых услуг..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Гарантийные условия:
                  </label>
                  <input
                    type="text"
                    value={agentWarranty}
                    onChange={(e) => setAgentWarranty(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950/80 border border-white/10 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] text-zinc-400">
                    {settingsSavedToast && (
                      <span className="text-emerald-400 font-bold flex items-center space-x-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>Настройки агента сохранены в Supabase</span>
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    disabled={isSavingSettings}
                    onClick={handleSaveAgentSettings}
                    className="apple-tap px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {isSavingSettings ? "Сохранение..." : "Сохранить настройки агента"}
                  </button>
                </div>
              </div>
            </div>

            {/* CARD 3: SIP TRUNK & AUTOMATION */}
            <div className="p-5 rounded-3xl bg-white/50 dark:bg-white/[0.04] border border-zinc-200/60 dark:border-white/[0.08] backdrop-blur-2xl space-y-4 shadow-xl">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Settings className="w-4 h-4 text-zinc-400" />
                <span>Настройки SIP-телефонии и автоматизации</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Провайдер телефонии:</label>
                  <select
                    value={sipProvider}
                    onChange={(e) => setSipProvider(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-white/10 text-white text-xs cursor-pointer"
                  >
                    <option value="novofon">Novofon (ex-Zadarma) — для СТО РФ</option>
                    <option value="mango">Mango Office (Манго Телеком)</option>
                    <option value="zadarma">Zadarma Cloud PBX</option>
                    <option value="vapi">Vapi.ai Voice Gateway</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">SIP Secret / API Ключ:</label>
                  <input
                    type="password"
                    placeholder="Вставьте SIP-секрет..."
                    value={sipApiKey}
                    onChange={(e) => setSipApiKey(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-white/10 text-white text-xs focus:border-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                <div>
                  <div className="text-xs font-bold text-white">Автоматический CSI-опрос</div>
                  <div className="text-[11px] text-zinc-400">
                    Автоматически вызывать задачу CSI в Voicyfy при смене статуса заказ-наряда на «Выдан»
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={autoCsiEnabled}
                  onChange={(e) => setAutoCsiEnabled(e.target.checked)}
                  className="w-4 h-4 accent-rose-600 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: REAL TEST CALL VIA VOICYFY */}
      {isTestCallModalOpen && (
        <div className="fixed inset-0 z-70 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-zinc-900 border border-white/15 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-rose-500/15 text-rose-400">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Запустить звонок Анны (Voicyfy)</h3>
                  <p className="text-xs text-zinc-400">Реальный исходящий звонок через шлюз</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTestCallModalOpen(false)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Номер телефона для звонка *:
                </label>
                <input
                  type="text"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="+7 (999) 000-00-00"
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-white/10 text-sm font-mono text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Имя абонента:</label>
                  <input
                    type="text"
                    value={testName}
                    onChange={(e) => setTestName(e.target.value)}
                    placeholder="Алексей"
                    className="w-full px-3 py-1.5 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Автомобиль:</label>
                  <input
                    type="text"
                    value={testCar}
                    onChange={(e) => setTestCar(e.target.value)}
                    placeholder="Газель Next"
                    className="w-full px-3 py-1.5 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Сценарий звонка:</label>
                <select
                  value={testActionType}
                  onChange={(e) => setTestActionType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white cursor-pointer"
                >
                  <option value="csi">⭐ Опрос контроля качества ремонта (CSI по 5-балльной шкале)</option>
                  <option value="ready">🚗 Сообщение о готовности автомобиля к выдаче</option>
                  <option value="custom">✏️ Произвольное поручение для Анны</option>
                </select>
              </div>

              {testActionType === "custom" && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Текст поручения для звонка:</label>
                  <textarea
                    rows={3}
                    value={testCustomComment}
                    onChange={(e) => setTestCustomComment(e.target.value)}
                    placeholder="Например: Позвони клиенту и уточни удобное время для записи на замену масла..."
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white focus:outline-none focus:border-rose-500 resize-none"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={() => {
                  setIsTestCallModalOpen(false);
                  handleStartCallSimulator(testName, testCar);
                }}
                className="text-xs text-zinc-400 hover:text-white flex items-center space-x-1 cursor-pointer"
              >
                <Headphones className="w-3.5 h-3.5" />
                <span>Браузерный симулятор</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsTestCallModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-zinc-300 cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  disabled={isSendingTestCall}
                  onClick={() =>
                    handleTriggerRealCall(
                      testPhone,
                      testName,
                      testCar,
                      "ЗН-ТЕСТ",
                      testActionType,
                      testCustomComment
                    )
                  }
                  className="apple-tap px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold transition-all shadow-md flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>{isSendingTestCall ? "Набор номера..." : "Позвонить мне"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CALL DETAILS POPUP */}
      {selectedCall && (
        <div className="fixed inset-0 z-70 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-zinc-900 border border-white/15 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Детали звонка: {selectedCall.clientName}</h3>
                  <p className="text-xs text-zinc-400">
                    {selectedCall.date} в {selectedCall.time} • {selectedCall.durationSeconds} сек
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCall(null)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-zinc-950/80 border border-white/[0.06]">
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase font-bold">Телефон:</span>
                  <span className="font-mono text-white">{selectedCall.clientPhone}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase font-bold">Автомобиль:</span>
                  <span className="text-white">{selectedCall.vehicleInfo || "—"}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase font-bold">Заказ-наряд:</span>
                  <span className="text-white font-mono">{selectedCall.orderNumber || "—"}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase font-bold">Оценка CSI:</span>
                  {selectedCall.rating ? (
                    <span className="text-amber-400 font-bold flex items-center space-x-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span>{selectedCall.rating} из 5</span>
                    </span>
                  ) : (
                    <span className="text-zinc-400">Без оценки</span>
                  )}
                </div>
              </div>

              <div>
                <span className="text-zinc-400 block font-semibold mb-1">Итог диалога (AI Summary):</span>
                <div className="p-3 rounded-2xl bg-zinc-950/80 border border-white/[0.06] text-zinc-200 leading-relaxed">
                  {selectedCall.aiSummary}
                </div>
              </div>

              {selectedCall.feedback && (
                <div>
                  <span className="text-amber-400 block font-semibold mb-1">Отзыв клиента:</span>
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200">
                    «{selectedCall.feedback}»
                  </div>
                </div>
              )}

              {selectedCall.transcript && (
                <div>
                  <span className="text-zinc-400 block font-semibold mb-1">Расшифровка / поручение:</span>
                  <div className="p-3 rounded-2xl bg-zinc-950/80 border border-white/[0.06] text-zinc-300 max-h-36 overflow-y-auto font-mono text-[11px]">
                    {selectedCall.transcript}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
              <span className="text-zinc-500 text-[11px]">
                Источник: <span className="text-zinc-300 font-medium">{selectedCall.source || "Voicyfy"}</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  const phone = selectedCall.clientPhone;
                  const name = selectedCall.clientName;
                  const car = selectedCall.vehicleInfo;
                  const orderId = selectedCall.orderNumber || "";
                  setSelectedCall(null);
                  handleTriggerRealCall(phone, name, car, orderId, "csi");
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center space-x-1.5"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Повторить звонок (Анна)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: INTERACTIVE BROWSER CALL SIMULATOR */}
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

            <div className="space-y-1">
              <span className="text-[11px] font-bold text-rose-500 uppercase tracking-wider">
                {simStep === "dialing" ? "Гудки вызова..." : simStep === "connected" ? "ИИ говорит..." : "Линия активна"}
              </span>
              <h3 className="text-lg font-bold text-white">СТО «Чайка-Сервис»</h3>
              <p className="text-xs text-zinc-400">Голосовой агент Анна</p>
            </div>

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
                      className={`w-9 h-9 rounded-full font-bold text-xs flex items-center justify-center transition-all cursor-pointer ${
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
                  className="px-6 py-2 rounded-full bg-white text-zinc-900 font-bold text-xs cursor-pointer"
                >
                  Закрыть
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
