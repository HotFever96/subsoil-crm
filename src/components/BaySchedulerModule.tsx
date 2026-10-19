"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  Car,
  Wrench,
  Plus,
  ChevronLeft,
  ChevronRight,
  User,
  CheckCircle2,
  X,
  AlertCircle,
} from "lucide-react";
import { ServiceBay, BayAppointment } from "@/lib/auto-service-types";
import { DEFAULT_SERVICE_BAYS } from "@/lib/auto-service-data";
import { useAuth } from "@/lib/auth-context";

export const BaySchedulerModule: React.FC = () => {
  const { user } = useAuth();
  const currentUsername = user?.username ? user.username.trim().toLowerCase() : "";
  const storageKey = `geo_ai_bays_appointments_${currentUsername || "guest"}_v1`;

  const [bays] = useState<ServiceBay[]>(DEFAULT_SERVICE_BAYS);
  const [appointments, setAppointments] = useState<BayAppointment[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));

  // Add Appointment Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBayId, setNewBayId] = useState("bay-1");
  const [newClientName, setNewClientName] = useState("");
  const [newVehicle, setNewVehicle] = useState("ГАЗ Газель Next");
  const [newLicensePlate, setNewLicensePlate] = useState("");
  const [newStartTime, setNewStartTime] = useState("10:00");
  const [newEndTime, setNewEndTime] = useState("12:00");
  const [newDescription, setNewDescription] = useState("ТО и диагностика");

  useEffect(() => {
    if (!currentUsername) {
      setAppointments([]);
      return;
    }

    const initialAppointments: BayAppointment[] = [
      {
        id: "apt-1",
        bayId: "bay-1",
        orderNumber: "ЗН-2026-0042",
        clientName: "ИП Смирнов А.В.",
        vehicle: "ГАЗ Газель Next",
        licensePlate: "В456ОР89",
        date: selectedDate,
        startTime: "09:00",
        endTime: "11:30",
        description: "ТО-3, замена тормозных колодок",
        status: "in_progress",
        username: currentUsername,
      },
      {
        id: "apt-2",
        bayId: "bay-2",
        orderNumber: "ЗН-2026-0041",
        clientName: "ООО «Ханты-ТрансСервис»",
        vehicle: "КАМАЗ 65115",
        licensePlate: "К789ММ86",
        date: selectedDate,
        startTime: "12:00",
        endTime: "16:00",
        description: "Снятие КПП ZF, замена сцепления",
        status: "scheduled",
        username: currentUsername,
      },
      {
        id: "apt-3",
        bayId: "bay-3",
        orderNumber: "ЗН-2026-0043",
        clientName: "Ковалев С.Д.",
        vehicle: "Toyota Hilux",
        licensePlate: "Е123КХ89",
        date: selectedDate,
        startTime: "14:00",
        endTime: "15:30",
        description: "Диагностика подвески и балансировка",
        status: "scheduled",
        username: currentUsername,
      },
    ];

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAppointments(parsed);
          return;
        }
      }
      setAppointments(initialAppointments);
      localStorage.setItem(storageKey, JSON.stringify(initialAppointments));
    } catch {}
  }, [currentUsername, storageKey, selectedDate]);

  const saveAppointments = (list: BayAppointment[]) => {
    setAppointments(list);
    try {
      localStorage.setItem(storageKey, JSON.stringify(list));
    } catch {}
  };

  const handleAddAppointment = () => {
    if (!newClientName.trim() || !newLicensePlate.trim()) {
      alert("Укажите клиента и госномер ТС");
      return;
    }

    const newApt: BayAppointment = {
      id: `apt-${Date.now()}`,
      bayId: newBayId,
      clientName: newClientName.trim(),
      vehicle: newVehicle.trim(),
      licensePlate: newLicensePlate.trim().toUpperCase(),
      date: selectedDate,
      startTime: newStartTime,
      endTime: newEndTime,
      description: newDescription.trim(),
      status: "scheduled",
      username: currentUsername,
    };

    saveAppointments([...appointments, newApt]);
    setIsModalOpen(false);
    setNewClientName("");
    setNewLicensePlate("");
  };

  const timeSlots = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] dark:bg-[#090d12] overflow-hidden">
      {/* Top Header */}
      <div className="px-6 py-4.5 border-b border-slate-200 dark:border-white/[0.08] bg-white/70 dark:bg-[#0c121a]/80 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/25 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
              <span>Пост-планировщик (Ремзона СТО)</span>
              <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
                {bays.length} постов
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              График загрузки подъемников, ямы и диагностического поста по часам ({currentUsername})
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/[0.1] px-3 py-1.5 rounded-xl shadow-2xs">
            <CalendarIcon className="w-3.5 h-3.5 text-red-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-semibold bg-transparent text-slate-900 dark:text-slate-100 focus:outline-hidden cursor-pointer"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Записать на пост</span>
          </button>
        </div>
      </div>

      {/* Scheduler Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {bays.map((bay) => {
            const bayApts = appointments.filter((a) => a.bayId === bay.id && a.date === selectedDate);
            return (
              <div
                key={bay.id}
                className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0e141e] overflow-hidden flex flex-col shadow-2xs"
              >
                {/* Bay Header */}
                <div
                  className="px-4 py-3 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between"
                  style={{ borderTop: `4px solid ${bay.color}` }}
                >
                  <div className="min-w-0">
                    <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                      {bay.name}
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      Занято: {bayApts.length} авто
                    </p>
                  </div>
                </div>

                {/* Appointments in Bay */}
                <div className="p-3 space-y-2.5 flex-1 min-h-[350px] bg-slate-50/50 dark:bg-white/[0.01]">
                  {bayApts.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400">
                      <Clock className="w-6 h-6 mb-2 opacity-30" />
                      <p className="text-xs">Пост свободен на выбранную дату</p>
                      <button
                        onClick={() => {
                          setNewBayId(bay.id);
                          setIsModalOpen(true);
                        }}
                        className="mt-2 text-xs text-red-600 dark:text-red-400 font-semibold hover:underline cursor-pointer"
                      >
                        + Записать авто
                      </button>
                    </div>
                  ) : (
                    bayApts.map((apt) => (
                      <div
                        key={apt.id}
                        className="p-3 rounded-xl bg-white dark:bg-[#151b24] border border-slate-200 dark:border-white/[0.08] shadow-2xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-red-600 dark:text-red-400 flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{apt.startTime} – {apt.endTime}</span>
                          </span>
                          {apt.orderNumber && (
                            <span className="font-semibold text-slate-500 dark:text-slate-400">
                              {apt.orderNumber}
                            </span>
                          )}
                        </div>

                        <div className="font-bold text-xs text-slate-900 dark:text-slate-100">
                          {apt.vehicle}
                        </div>

                        <div className="inline-block px-1.5 py-0.2 rounded font-mono font-bold text-[10px] bg-slate-100 dark:bg-white/[0.06] text-slate-900 dark:text-white border border-slate-200 dark:border-white/[0.08]">
                          {apt.licensePlate}
                        </div>

                        <div className="text-[11px] text-slate-600 dark:text-slate-300">
                          Клиент: <span className="font-medium">{apt.clientName}</span>
                        </div>

                        <div className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-100 dark:border-white/[0.04]">
                          {apt.description}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
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
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-slate-500 font-semibold">Пост ремзоны *</label>
              <select
                value={newBayId}
                onChange={(e) => setNewBayId(e.target.value)}
                className="mt-1 w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                {bays.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-500 font-semibold">Начало *</label>
                <input
                  type="time"
                  value={newStartTime}
                  onChange={(e) => setNewStartTime(e.target.value)}
                  className="mt-1 w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="text-slate-500 font-semibold">Окончание *</label>
                <input
                  type="time"
                  value={newEndTime}
                  onChange={(e) => setNewEndTime(e.target.value)}
                  className="mt-1 w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-500 font-semibold">Клиент (ФИО / Компания) *</label>
              <input
                type="text"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                placeholder="ИП Смирнов А.В."
                className="mt-1 w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-500 font-semibold">Автомобиль *</label>
                <input
                  type="text"
                  value={newVehicle}
                  onChange={(e) => setNewVehicle(e.target.value)}
                  placeholder="ГАЗ Газель Next"
                  className="mt-1 w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="text-slate-500 font-semibold">Госномер *</label>
                <input
                  type="text"
                  value={newLicensePlate}
                  onChange={(e) => setNewLicensePlate(e.target.value.toUpperCase())}
                  placeholder="В456ОР89"
                  className="mt-1 w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-500 font-semibold">Планируемые работы</label>
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Замена сцепления, диагностика"
                className="mt-1 w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
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
