"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  Car,
  Wrench,
  Plus,
  User,
  CheckCircle2,
  X,
  Trash2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  FileText,
} from "lucide-react";
import { ServiceBay, BayAppointment, RepairOrder } from "@/lib/auto-service-types";
import { DEFAULT_SERVICE_BAYS, getStoRequisites } from "@/lib/auto-service-data";
import { useAuth } from "@/lib/auth-context";

const HOURS = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
];

export const BaySchedulerModule: React.FC = () => {
  const { user } = useAuth();
  const currentUsername = user?.username ? user.username.trim().toLowerCase() : "";
  const storageKey = `geo_ai_bays_appointments_${currentUsername || "guest"}_v2`;
  const ordersStorageKey = `geo_ai_repair_orders_${currentUsername || "guest"}_v2`;

  const [bays] = useState<ServiceBay[]>(DEFAULT_SERVICE_BAYS);
  const [appointments, setAppointments] = useState<BayAppointment[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Add Appointment Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBayId, setNewBayId] = useState("bay-1");
  const [newClientName, setNewClientName] = useState("");
  const [newVehicle, setNewVehicle] = useState("");
  const [newLicensePlate, setNewLicensePlate] = useState("");
  const [newStartTime, setNewStartTime] = useState("09:00");
  const [newEndTime, setNewEndTime] = useState("11:00");
  const [newDescription, setNewDescription] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    if (!currentUsername) {
      setAppointments([]);
      return;
    }

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Filter out any old mock records with ИП Смирнов if needed
          setAppointments(parsed);
          return;
        }
      }
      setAppointments([]);
      localStorage.setItem(storageKey, JSON.stringify([]));
    } catch {
      setAppointments([]);
    }
  }, [currentUsername, storageKey]);

  const saveAppointments = (list: BayAppointment[]) => {
    setAppointments(list);
    try {
      localStorage.setItem(storageKey, JSON.stringify(list));
    } catch {}
  };

  const handleOpenSlot = (bayId: string, hour: string) => {
    setNewBayId(bayId);
    setNewStartTime(hour);
    const startHourInt = parseInt(hour.slice(0, 2), 10);
    const endHourInt = Math.min(21, startHourInt + 2);
    setNewEndTime(`${endHourInt < 10 ? "0" : ""}${endHourInt}:00`);
    setNewClientName("");
    setNewVehicle("");
    setNewLicensePlate("");
    setNewDescription("");
    setIsModalOpen(true);
  };

  const handleAddAppointment = () => {
    if (!newClientName.trim() || !newLicensePlate.trim()) {
      alert("Укажите клиента и госномер автомобиля");
      return;
    }

    const newApt: BayAppointment = {
      id: `apt-${Date.now()}`,
      bayId: newBayId,
      clientName: newClientName.trim(),
      vehicle: newVehicle.trim() || "Транспортное средство",
      licensePlate: newLicensePlate.trim().toUpperCase(),
      date: selectedDate,
      startTime: newStartTime,
      endTime: newEndTime,
      description: newDescription.trim() || "Диагностика и ремонт",
      status: "scheduled",
      username: currentUsername,
    };

    const updated = [...appointments, newApt];
    saveAppointments(updated);
    setIsModalOpen(false);
    showToast(`Запись создана: ${newApt.vehicle} (${newApt.licensePlate}) на ${newApt.startTime}`);
  };

  const handleDeleteAppointment = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Удалить эту запись с поста?")) return;
    const updated = appointments.filter((a) => a.id !== id);
    saveAppointments(updated);
    showToast("Запись удалена");
  };

  const handleCreateOrderFromApt = (apt: BayAppointment, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const requisites = getStoRequisites();
      const currentYear = new Date().getFullYear();
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const orderNumber = `ЗН-${currentYear}-${randomNum}`;

      const newOrder: RepairOrder = {
        id: `ord-${Date.now()}`,
        orderNumber,
        status: "in_progress",
        createdAt: selectedDate || new Date().toISOString().slice(0, 10),
        scheduledDate: apt.date,
        scheduledTime: apt.startTime,
        bayId: apt.bayId,
        client: {
          type: "individual",
          name: apt.clientName,
          phone: "+7 (999) 000-00-00",
        },
        vehicle: {
          make: apt.vehicle.split(" ")[0] || "ГАЗ",
          model: apt.vehicle.split(" ").slice(1).join(" ") || "",
          licensePlate: apt.licensePlate,
          vin: "X7L00000000000000",
          year: new Date().getFullYear() - 3,
          mileage: 0,
          complaints: apt.description,
        },
        works: [
          {
            id: `w-${Date.now()}`,
            name: apt.description || "Диагностика и регламентные работы",
            mechanic: requisites.mechanics?.[0] || "Мастер СТО",
            laborHours: 1.5,
            ratePerHour: requisites.defaultRatePerHour || 2200,
            discountPercent: 0,
            total: 1.5 * (requisites.defaultRatePerHour || 2200),
          },
        ],
        parts: [],
        recommendations: "",
        totalWorks: 1.5 * (requisites.defaultRatePerHour || 2200),
        totalParts: 0,
        grandTotal: 1.5 * (requisites.defaultRatePerHour || 2200),
        paidAmount: 0,
        username: currentUsername,
      };

      // Load existing orders and prepend
      let existingOrders: RepairOrder[] = [];
      const savedOrders = localStorage.getItem(ordersStorageKey);
      if (savedOrders) {
        try {
          existingOrders = JSON.parse(savedOrders);
        } catch {}
      }
      const updatedOrders = [newOrder, ...existingOrders];
      localStorage.setItem(ordersStorageKey, JSON.stringify(updatedOrders));
      window.dispatchEvent(new CustomEvent("geo_ai_repair_orders_updated"));

      // Update appointment with order number
      const updatedApts = appointments.map((a) =>
        a.id === apt.id ? { ...a, orderId: newOrder.id, orderNumber: newOrder.orderNumber, status: "in_progress" as const } : a
      );
      saveAppointments(updatedApts);

      showToast(`Создан Заказ-наряд ${newOrder.orderNumber} для ${apt.vehicle}!`);
    } catch (err) {
      console.error(err);
      alert("Не удалось создать заказ-наряд");
    }
  };

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const dayAppointments = appointments.filter((a) => a.date === selectedDate);

  return (
    <div className="flex-1 flex flex-col h-full bg-transparent overflow-hidden">
      {/* Toast alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center space-x-2.5 px-4 py-3 rounded-full bg-emerald-600 text-white shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="px-6 py-4.5 bg-white/40 dark:bg-black/30 border-b border-black/[0.04] dark:border-white/[0.08] backdrop-blur-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-rose-500/20 to-amber-500/20 border border-white/10 text-rose-500 flex items-center justify-center shrink-0 shadow-lg shadow-rose-500/10">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center space-x-2.5">
              <span>Пост-планировщик</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-500">
                {bays.length} постов
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-200/60 dark:bg-white/[0.06] text-slate-600 dark:text-zinc-400">
                {dayAppointments.length} записей на день
              </span>
            </h1>
          </div>
        </div>

        {/* Date Controls & Add Button */}
        <div className="flex items-center space-x-2.5">
          <div className="flex items-center bg-white/60 dark:bg-white/[0.06] border border-black/[0.05] dark:border-white/[0.08] rounded-full px-1 py-0.5 backdrop-blur-md shadow-xs">
            <button
              type="button"
              onClick={handlePrevDay}
              className="p-1.5 rounded-full hover:bg-slate-200/60 dark:hover:bg-white/[0.08] text-slate-600 dark:text-zinc-300 transition-colors cursor-pointer"
              title="Предыдущий день"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2 py-1 text-xs font-semibold bg-transparent text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
            />
            <button
              type="button"
              onClick={handleNextDay}
              className="p-1.5 rounded-full hover:bg-slate-200/60 dark:hover:bg-white/[0.08] text-slate-600 dark:text-zinc-300 transition-colors cursor-pointer"
              title="Следующий день"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setNewBayId("bay-1");
              setNewStartTime("09:00");
              setNewEndTime("11:00");
              setNewClientName("");
              setNewVehicle("");
              setNewLicensePlate("");
              setNewDescription("");
              setIsModalOpen(true);
            }}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/25 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Записать на пост</span>
          </button>
        </div>
      </div>

      {/* Hourly Timeline Grid */}
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="min-w-[900px] border border-black/[0.05] dark:border-white/[0.08] rounded-3xl overflow-hidden bg-white/70 dark:bg-white/[0.03] backdrop-blur-2xl shadow-2xl shadow-black/20">
          {/* Header Row: Bays as columns */}
          <div className="grid grid-cols-[100px_repeat(4,1fr)] bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.08] text-xs font-bold text-slate-700 dark:text-slate-300 sticky top-0 z-10">
            <div className="p-3.5 border-r border-slate-200 dark:border-white/[0.08] flex items-center justify-center text-slate-400 font-mono">
              Время
            </div>
            {bays.map((bay) => (
              <div
                key={bay.id}
                className="p-3.5 border-r border-slate-200 dark:border-white/[0.08] last:border-r-0 flex items-center justify-between"
                style={{ borderTop: `3px solid ${bay.color}` }}
              >
                <div className="truncate">
                  <span className="font-extrabold text-slate-900 dark:text-white">{bay.name}</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400">
                  {dayAppointments.filter((a) => a.bayId === bay.id).length} ТС
                </span>
              </div>
            ))}
          </div>

          {/* Hourly Rows */}
          <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
            {HOURS.map((hour) => {
              const currentHourNum = parseInt(hour.slice(0, 2), 10);

              return (
                <div key={hour} className="grid grid-cols-[100px_repeat(4,1fr)] min-h-[68px]">
                  {/* Time label */}
                  <div className="p-3 border-r border-slate-200 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.01] flex items-start justify-center">
                    <span className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-red-500" />
                      <span>{hour}</span>
                    </span>
                  </div>

                  {/* Bay columns for this hour */}
                  {bays.map((bay) => {
                    // Check if an appointment starts in this hour slot
                    const matchingApt = dayAppointments.find((a) => {
                      if (a.bayId !== bay.id) return false;
                      const aptStartHour = parseInt(a.startTime.slice(0, 2), 10);
                      return aptStartHour === currentHourNum;
                    });

                    // Check if an appointment is in-progress through this hour (started earlier, finishes later)
                    const spanningApt = dayAppointments.find((a) => {
                      if (a.bayId !== bay.id) return false;
                      const aptStartHour = parseInt(a.startTime.slice(0, 2), 10);
                      const aptEndHour = parseInt(a.endTime.slice(0, 2), 10);
                      return currentHourNum > aptStartHour && currentHourNum < aptEndHour;
                    });

                    if (matchingApt) {
                      const hasOrder = Boolean(matchingApt.orderNumber);

                      return (
                        <div
                          key={bay.id}
                          className="p-2 border-r border-slate-200 dark:border-white/[0.08] last:border-r-0 bg-red-500/[0.04] flex flex-col justify-between group relative"
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div className="min-w-0">
                              <div className="flex items-center space-x-1.5">
                                <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                  {matchingApt.vehicle}
                                </span>
                                <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-slate-200/80 dark:bg-white/[0.1] text-slate-900 dark:text-slate-100">
                                  {matchingApt.licensePlate}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                Клиент: {matchingApt.clientName}
                              </div>
                              {matchingApt.description && (
                                <div className="text-[10px] text-slate-600 dark:text-slate-300 italic truncate mt-0.5">
                                  {matchingApt.description}
                                </div>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={(e) => handleDeleteAppointment(matchingApt.id, e)}
                              className="text-slate-400 hover:text-rose-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0"
                              title="Удалить запись"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="mt-2 pt-1.5 border-t border-slate-200/60 dark:border-white/[0.06] flex items-center justify-between text-[10px]">
                            <span className="font-semibold text-red-600 dark:text-red-400 flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>{matchingApt.startTime} - {matchingApt.endTime}</span>
                            </span>

                            {hasOrder ? (
                              <span className="inline-flex items-center space-x-1 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                                <FileText className="w-3 h-3" />
                                <span>{matchingApt.orderNumber}</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => handleCreateOrderFromApt(matchingApt, e)}
                                className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold transition-colors cursor-pointer shadow-2xs"
                                title="Сформировать заказ-наряд на основе этой записи"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Создать ЗН</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    }

                    if (spanningApt) {
                      return (
                        <div
                          key={bay.id}
                          className="p-2 border-r border-slate-200 dark:border-white/[0.08] last:border-r-0 bg-red-500/[0.02] flex items-center justify-center"
                        >
                          <span className="text-[10px] text-slate-400 italic font-medium flex items-center space-x-1">
                            <Wrench className="w-3 h-3 text-red-400" />
                            <span>Продолжение работ: {spanningApt.vehicle} ({spanningApt.licensePlate})</span>
                          </span>
                        </div>
                      );
                    }

                    // Empty slot
                    return (
                      <div
                        key={bay.id}
                        onClick={() => handleOpenSlot(bay.id, hour)}
                        className="p-2 border-r border-slate-200 dark:border-white/[0.08] last:border-r-0 hover:bg-slate-100/70 dark:hover:bg-white/[0.02] transition-colors cursor-pointer flex items-center justify-center group"
                        title={`Нажмите, чтобы записать ТС на ${bay.name} в ${hour}`}
                      >
                        <span className="text-[11px] text-slate-300 dark:text-white/[0.1] group-hover:text-red-500 font-semibold flex items-center space-x-1 transition-colors">
                          <Plus className="w-3.5 h-3.5" />
                          <span className="opacity-0 group-hover:opacity-100">Записать</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Appointment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#0e141e] border border-slate-200 dark:border-white/[0.1] rounded-2xl shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/[0.08] pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                <CalendarIcon className="w-4 h-4 text-red-500" />
                <span>Запись на пост ремзоны</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-slate-500 font-semibold">Пост ремзоны *</label>
              <select
                value={newBayId}
                onChange={(e) => setNewBayId(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                {bays.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-500 font-semibold">Время начала *</label>
                <input
                  type="time"
                  value={newStartTime}
                  onChange={(e) => setNewStartTime(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>
              <div>
                <label className="text-slate-500 font-semibold">Окончание *</label>
                <input
                  type="time"
                  value={newEndTime}
                  onChange={(e) => setNewEndTime(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-500 font-semibold">Клиент (ФИО / Название организации) *</label>
              <input
                type="text"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                placeholder="ФИО владельца или название компании"
                className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-500 font-semibold">Марка и Модель авто *</label>
                <input
                  type="text"
                  value={newVehicle}
                  onChange={(e) => setNewVehicle(e.target.value)}
                  placeholder="Например: ГАЗ 3302"
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="text-slate-500 font-semibold">Госномер *</label>
                <input
                  type="text"
                  value={newLicensePlate}
                  onChange={(e) => setNewLicensePlate(e.target.value.toUpperCase())}
                  placeholder="А000АА77"
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-500 font-semibold">Вид работ / Жалобы клиента</label>
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Замена масла, диагностика ходовой, стук в подвеске..."
                className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleAddAppointment}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold cursor-pointer shadow-sm"
              >
                Записать
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
