"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  AlertCircle,
  Tag,
  X,
  Trash2,
  Check,
  Edit2,
  CalendarDays,
  List,
} from "lucide-react";
import { CalendarEvent } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { getUserInitialEvents } from "@/lib/mock-data";

type CalendarViewMode = "month" | "week" | "day";

const MONTH_NAMES = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
];

const WEEKDAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export const CalendarModule: React.FC = () => {
  const { user } = useAuth();
  const currentUsername = user?.username ? user.username.trim().toLowerCase() : "";
  const storageKey = `geo_ai_calendar_events_${currentUsername || "guest"}_v4`;

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 9, 13)); // October 2026
  const [selectedDate, setSelectedDate] = useState<string>("2026-10-13");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState("");
  const [formDate, setFormDate] = useState("2026-10-15");
  const [formTime, setFormTime] = useState("10:00");
  const [formDescription, setFormDescription] = useState("");
  const [formTag, setFormTag] = useState<CalendarEvent["tag"]>("Дедлайн");
  const [formPriority, setFormPriority] = useState<CalendarEvent["priority"]>("HIGH");

  // 1. Initial Load & reload when active user changes: LocalStorage + Supabase Cloud Fetch
  useEffect(() => {
    if (!currentUsername) {
      setEvents([]);
      return;
    }

    // Clear legacy test/mock data caches from previous versions
    try {
      localStorage.removeItem(`geo_ai_calendar_events_${currentUsername}_v1`);
      localStorage.removeItem(`geo_ai_calendar_events_${currentUsername}_v2`);
      localStorage.removeItem(`geo_ai_calendar_events_${currentUsername}_v3`);
    } catch {}

    let loadedEvents: CalendarEvent[] = [];
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          loadedEvents = parsed;
        }
      }
    } catch (e) {
      console.warn("Failed to load calendar from localStorage:", e);
    }
    setEvents(loadedEvents);

    // Cloud fetch from Supabase strictly for currentUsername
    fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_calendar_events", username: currentUsername }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.events) && data.events.length > 0) {
          setEvents((prev) => {
            const idMap = new Map(prev.map((e) => [e.id, e]));
            data.events.forEach((cloudEvt: CalendarEvent) => {
              idMap.set(cloudEvt.id, cloudEvt);
            });
            const merged = Array.from(idMap.values());
            try {
              localStorage.setItem(storageKey, JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      })
      .catch((err) => console.warn("Supabase calendar sync error:", err));

    const handleRemoteUpdate = () => {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setEvents(parsed);
          }
        }
      } catch {}
    };

    window.addEventListener("geo_ai_calendar_updated", handleRemoteUpdate);
    return () => {
      window.removeEventListener("geo_ai_calendar_updated", handleRemoteUpdate);
    };
  }, [currentUsername, storageKey]);

  // 2. Save changes to user-scoped LocalStorage
  const persistEvents = (updated: CalendarEvent[]) => {
    setEvents(updated);
    if (!currentUsername) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save calendar to localStorage:", e);
    }
  };

  // Open Create Modal
  const handleOpenCreateModal = (dateStr?: string) => {
    setEditingEvent(null);
    setFormTitle("");
    setFormDate(dateStr || selectedDate || "2026-10-15");
    setFormTime("10:00");
    setFormDescription("");
    setFormTag("Дедлайн");
    setFormPriority("HIGH");
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (evt: CalendarEvent) => {
    setEditingEvent(evt);
    setFormTitle(evt.title);
    setFormDate(evt.date);
    setFormTime(evt.time || "10:00");
    setFormDescription(evt.description || "");
    setFormTag(evt.tag);
    setFormPriority(evt.priority);
    setIsModalOpen(true);
  };

  // Save Event (Create / Update)
  const handleSaveEvent = () => {
    if (!formTitle.trim()) return;

    const eventToSave: CalendarEvent = {
      id: editingEvent ? editingEvent.id : `evt-${Date.now()}`,
      title: formTitle.trim(),
      date: formDate,
      time: formTime || undefined,
      description: formDescription.trim() || undefined,
      tag: formTag,
      priority: formPriority,
    };

    let updated: CalendarEvent[];
    if (editingEvent) {
      updated = events.map((e) => (e.id === editingEvent.id ? eventToSave : e));
    } else {
      updated = [eventToSave, ...events];
    }

    persistEvents(updated);
    setIsModalOpen(false);

    // Sync to Supabase strictly for current user
    if (currentUsername) {
      fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_calendar_event",
          payload: { event: eventToSave, username: currentUsername },
        }),
      }).catch((err) => console.warn("Supabase save event error:", err));
    }
  };

  // Delete Event
  const handleDeleteEvent = (id: string) => {
    const updated = events.filter((e) => e.id !== id);
    persistEvents(updated);
    setIsModalOpen(false);

    // Delete in Supabase strictly for current user
    if (currentUsername) {
      fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_calendar_event",
          payload: { eventId: id, username: currentUsername },
        }),
      }).catch((err) => console.warn("Supabase delete event error:", err));
    }
  };

  // Date Navigation
  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === "month") {
      d.setMonth(d.getMonth() - 1);
    } else if (viewMode === "week") {
      d.setDate(d.getDate() - 7);
    } else {
      d.setDate(d.getDate() - 1);
    }
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewMode === "month") {
      d.setMonth(d.getMonth() + 1);
    } else if (viewMode === "week") {
      d.setDate(d.getDate() + 7);
    } else {
      d.setDate(d.getDate() + 1);
    }
    setCurrentDate(d);
  };

  const handleToday = () => {
    setCurrentDate(new Date(2026, 9, 13));
  };

  // Helper for priority badges
  const getPriorityStyle = (priority: CalendarEvent["priority"]) => {
    switch (priority) {
      case "CRITICAL":
        return "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30";
      case "HIGH":
        return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30";
      case "NORMAL":
      default:
        return "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30";
    }
  };

  // Month Grid Calculation
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  // Day of week: 0 for Monday in Russian calendar (0=Mon ... 6=Sun)
  let startDayOfWeek = firstDayOfMonth.getDay() - 1;
  if (startDayOfWeek === -1) startDayOfWeek = 6;

  const daysInMonth = lastDayOfMonth.getDate();

  // Days list for month view
  const calendarCells = [];
  // Trailing previous month days
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const pDate = new Date(year, month - 1, prevMonthLastDay - i);
    calendarCells.push({
      date: pDate,
      isCurrentMonth: false,
      dateString: pDate.toISOString().split("T")[0],
    });
  }
  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const cDate = new Date(year, month, i);
    calendarCells.push({
      date: cDate,
      isCurrentMonth: true,
      dateString: cDate.toISOString().split("T")[0],
    });
  }
  // Fill rest of the grid (up to 35 or 42 cells)
  const remainingCells = 35 - calendarCells.length >= 0 ? 35 - calendarCells.length : 42 - calendarCells.length;
  for (let i = 1; i <= remainingCells; i++) {
    const nDate = new Date(year, month + 1, i);
    calendarCells.push({
      date: nDate,
      isCurrentMonth: false,
      dateString: nDate.toISOString().split("T")[0],
    });
  }

  // Week days calculation
  const startOfWeek = new Date(currentDate);
  let curDay = startOfWeek.getDay() - 1;
  if (curDay === -1) curDay = 6;
  startOfWeek.setDate(startOfWeek.getDate() - curDay);
  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    weekDays.push({
      date: d,
      dateString: d.toISOString().split("T")[0],
      dayName: WEEKDAY_NAMES[i],
    });
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-transparent transition-colors">
      {/* Top Controls Header */}
      <div className="px-6 py-4.5 bg-white/40 dark:bg-black/30 border-b border-black/[0.04] dark:border-white/[0.08] backdrop-blur-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-500/20 to-teal-500/20 border border-white/10 text-sky-500 flex items-center justify-center shrink-0 shadow-lg shadow-sky-500/10">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                {MONTH_NAMES[month]} {year}
              </h2>
            </div>
          </div>
        </div>

        {/* View mode & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
          {/* Nav arrows */}
          <div className="flex items-center space-x-1 border border-black/[0.05] dark:border-white/[0.08] rounded-full p-1 bg-white/60 dark:bg-white/[0.06] backdrop-blur-md">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-full text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
              title="Назад"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1 text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:text-slate-950 dark:hover:text-white transition-colors cursor-pointer"
            >
              Сегодня
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 rounded-full text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
              title="Вперед"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* View switcher */}
          <div className="flex items-center space-x-1 border border-black/[0.05] dark:border-white/[0.08] rounded-full p-1 bg-white/60 dark:bg-white/[0.06] backdrop-blur-md text-xs">
            <button
              onClick={() => setViewMode("month")}
              className={`px-3 py-1 rounded-full font-semibold transition-all cursor-pointer ${
                viewMode === "month"
                  ? "bg-sky-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Месяц
            </button>
            <button
              onClick={() => setViewMode("week")}
              className={`px-3 py-1 rounded-full font-semibold transition-all cursor-pointer ${
                viewMode === "week"
                  ? "bg-sky-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Неделя
            </button>
            <button
              onClick={() => setViewMode("day")}
              className={`px-3 py-1 rounded-full font-semibold transition-all cursor-pointer ${
                viewMode === "day"
                  ? "bg-sky-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              День
            </button>
          </div>

          {/* Add Event Button */}
          <button
            onClick={() => handleOpenCreateModal()}
            className="flex items-center space-x-1.5 px-5 py-2.5 rounded-full bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-lg shadow-sky-600/25 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Новое событие</span>
          </button>
        </div>
      </div>

      {/* Main Calendar Workspace */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {/* VIEW 1: MONTH VIEW */}
        {viewMode === "month" && (
          <div className="h-full flex flex-col min-h-[580px] bg-white/70 dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.08] rounded-3xl overflow-hidden shadow-2xl backdrop-blur-2xl">
            {/* Weekdays header */}
            <div className="grid grid-cols-7 border-b border-slate-200 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.02]">
              {WEEKDAY_NAMES.map((w, idx) => (
                <div
                  key={idx}
                  className="py-2.5 text-center text-xs font-semibold text-slate-500 dark:text-slate-400"
                >
                  {w}
                </div>
              ))}
            </div>

            {/* Month grid */}
            <div className="flex-1 grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 dark:divide-white/[0.04]">
              {calendarCells.map((cell, idx) => {
                const cellEvents = events.filter((e) => e.date === cell.dateString);
                const isSelected = selectedDate === cell.dateString;
                const isToday = cell.dateString === "2026-10-13";

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedDate(cell.dateString)}
                    onDoubleClick={() => handleOpenCreateModal(cell.dateString)}
                    className={`min-h-[90px] p-1.5 sm:p-2 flex flex-col justify-between transition-colors cursor-pointer group ${
                      !cell.isCurrentMonth
                        ? "bg-slate-50/40 dark:bg-black/20 text-slate-300 dark:text-slate-600"
                        : "hover:bg-slate-50/70 dark:hover:bg-white/[0.02]"
                    } ${isSelected ? "ring-2 ring-inset ring-sky-500/40" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                          isToday
                            ? "bg-sky-500 text-white font-bold"
                            : cell.isCurrentMonth
                            ? "text-slate-700 dark:text-slate-300"
                            : "text-slate-400 dark:text-slate-600"
                        }`}
                      >
                        {cell.date.getDate()}
                      </span>

                      {cellEvents.length > 0 && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          {cellEvents.length}
                        </span>
                      )}
                    </div>

                    {/* Event badges */}
                    <div className="flex-1 space-y-1 overflow-y-auto max-h-24">
                      {cellEvents.slice(0, 3).map((evt) => (
                        <div
                          key={evt.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditModal(evt);
                          }}
                          className={`px-1.5 py-0.5 rounded-md text-[11px] truncate font-medium border transition-transform hover:scale-[1.02] ${getPriorityStyle(
                            evt.priority
                          )}`}
                          title={`${evt.title} (${evt.time || "Весь день"})`}
                        >
                          {evt.time && <span className="mr-1 opacity-75">{evt.time}</span>}
                          <span>{evt.title}</span>
                        </div>
                      ))}
                      {cellEvents.length > 3 && (
                        <div className="text-[10px] text-sky-500 font-medium pl-1">
                          + еще {cellEvents.length - 3}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 2: WEEK VIEW */}
        {viewMode === "week" && (
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3 min-h-[580px]">
            {weekDays.map((w, idx) => {
              const dayEvents = events.filter((e) => e.date === w.dateString);
              const isToday = w.dateString === "2026-10-13";

              return (
                <div
                  key={idx}
                  className="bg-white dark:bg-[#131821] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-3 flex flex-col justify-between shadow-2xs"
                >
                  <div className="border-b border-slate-100 dark:border-white/[0.06] pb-2.5 mb-2.5 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-slate-400">{w.dayName}</div>
                      <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {w.date.getDate()} {MONTH_NAMES[w.date.getMonth()].slice(0, 3)}
                      </div>
                    </div>
                    {isToday && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-500 font-medium">
                        Сегодня
                      </span>
                    )}
                  </div>

                  {/* Day Events list */}
                  <div className="flex-1 space-y-2 overflow-y-auto">
                    {dayEvents.map((evt) => (
                      <div
                        key={evt.id}
                        onClick={() => handleOpenEditModal(evt)}
                        className={`p-2.5 rounded-xl border text-xs cursor-pointer hover:shadow-xs transition-all ${getPriorityStyle(
                          evt.priority
                        )}`}
                      >
                        <div className="flex items-center justify-between mb-1 text-[10px] font-mono">
                          <span>{evt.time || "Весь день"}</span>
                          <span className="font-semibold uppercase tracking-wider">{evt.tag}</span>
                        </div>
                        <div className="font-medium text-slate-900 dark:text-slate-100 line-clamp-2">
                          {evt.title}
                        </div>
                        {evt.license_code && (
                          <div className="mt-1 text-[10px] text-slate-400 truncate">
                            {evt.license_code}
                          </div>
                        )}
                      </div>
                    ))}
                    {dayEvents.length === 0 && (
                      <div className="text-[11px] text-slate-400 italic text-center py-6">
                        Нет событий
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleOpenCreateModal(w.dateString)}
                    className="w-full mt-2 py-1.5 rounded-lg border border-dashed border-slate-200 dark:border-white/[0.1] text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Добавить</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* VIEW 3: DAY VIEW / AGENDA */}
        {viewMode === "day" && (
          <div className="max-w-3xl mx-auto bg-white dark:bg-[#131821] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-6 shadow-2xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.06] pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {currentDate.toLocaleDateString("ru-RU", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </h3>
                <p className="text-xs text-slate-500">
                  Список назначенных мероприятий и сроков на выбранную дату
                </p>
              </div>

              <button
                onClick={() => handleOpenCreateModal(currentDate.toISOString().split("T")[0])}
                className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-medium text-xs flex items-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Добавить</span>
              </button>
            </div>

            {/* Events for current date */}
            {(() => {
              const curDateStr = currentDate.toISOString().split("T")[0];
              const dayEvts = events.filter((e) => e.date === curDateStr);

              if (dayEvts.length === 0) {
                return (
                  <div className="text-center py-12 space-y-2">
                    <CalendarDays className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                    <p className="text-sm text-slate-500">На этот день запланированных событий нет</p>
                    <button
                      onClick={() => handleOpenCreateModal(curDateStr)}
                      className="text-xs text-sky-500 hover:underline font-medium"
                    >
                      Создать первое событие
                    </button>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {dayEvts.map((evt) => (
                    <div
                      key={evt.id}
                      onClick={() => handleOpenEditModal(evt)}
                      className="p-4 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02] hover:border-sky-500/50 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${getPriorityStyle(
                              evt.priority
                            )}`}
                          >
                            {evt.tag}
                          </span>
                          {evt.time && (
                            <span className="text-xs text-slate-500 flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>{evt.time}</span>
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {evt.title}
                        </h4>
                        {evt.description && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                            {evt.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditModal(evt);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-sky-500 hover:bg-sky-500/10 transition-colors"
                          title="Редактировать"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteEvent(evt.id);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                          title="Удалить"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* EVENT CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#131821] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.08] pb-3">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {editingEvent ? "Редактировать событие" : "Новое событие"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-600 dark:text-slate-300">
              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1">
                  Название события *
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Например, Плановая проверка Росприроднадзора"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0c1015] border border-slate-200 dark:border-white/[0.08] text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 mb-1">Дата *</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0c1015] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 mb-1">Время</label>
                  <input
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0c1015] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 mb-1">Категория</label>
                  <select
                    value={formTag}
                    onChange={(e) => setFormTag(e.target.value as CalendarEvent["tag"])}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0c1015] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                  >
                    <option value="Дедлайн">Дедлайн</option>
                    <option value="Проверка">Проверка</option>
                    <option value="Встреча">Встреча</option>
                    <option value="Отчет">Отчет</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 mb-1">Приоритет</label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as CalendarEvent["priority"])}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0c1015] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                  >
                    <option value="CRITICAL">Критический (Красный)</option>
                    <option value="HIGH">Высокий (Оранжевый)</option>
                    <option value="NORMAL">Обычный (Синий)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1">Описание</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                  placeholder="Дополнительные детали, требования, ответственные лица..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0c1015] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 resize-none leading-relaxed"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/[0.08]">
              {editingEvent ? (
                <button
                  type="button"
                  onClick={() => handleDeleteEvent(editingEvent.id)}
                  className="px-3 py-1.5 rounded-xl text-rose-500 hover:bg-rose-500/10 font-medium text-xs transition-colors cursor-pointer"
                >
                  Удалить
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/[0.1] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04] text-xs transition-colors cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleSaveEvent}
                  disabled={!formTitle.trim()}
                  className="px-4 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-medium text-xs transition-all cursor-pointer shadow-xs"
                >
                  {editingEvent ? "Сохранить" : "Создать"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
