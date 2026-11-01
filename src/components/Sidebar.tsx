"use client";

import React, { useState, useEffect } from "react";
import {
  MessageSquareText,
  Mail,
  FileText,
  Calendar,
  Settings,
  Sun,
  Moon,
  Plus,
  MessageSquare,
  Trash2,
  X,
  LogOut,
  User,
  FolderArchive,
  ArrowLeftRight,
  ClipboardList,
  CalendarClock,
  Package,
  Users,
  Wrench,
  Car,
  SearchCheck,
  DollarSign,
  ChevronDown,
  ChevronRight,
  Receipt,
  PhoneCall,
} from "lucide-react";
import { useTheme } from "@/lib/theme-context";
import { useAuth } from "@/lib/auth-context";
import { useChat, cleanChatTitle, detectChatWorkspace } from "@/lib/chat-context";
import { useBusiness } from "@/lib/business-context";
import { StoSettingsModal } from "./StoSettingsModal";

export type NavTab =
  | "ai-chat"
  | "smart-mail"
  | "project-studio"
  | "calendar"
  | "archive"
  | "repair-orders"
  | "invoices"
  | "telephony"
  | "bay-scheduler"
  | "warehouse-parts"
  | "parts-procurement"
  | "garage-clients"
  | "payroll";

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  pendingMailsCount?: number;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  pendingMailsCount = 2,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout, updateName } = useAuth();
  const { sessions, activeSessionId, selectSession, deleteSession, createNewChat } = useChat();
  const { currentBusiness, toggleBusiness } = useBusiness();
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isStoSettingsOpen, setIsStoSettingsOpen] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [selectedModel, setSelectedModel] = useState<string>("anthropic/claude-sonnet-4.6");
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isChatHistoryOpen, setIsChatHistoryOpen] = useState(true);
  const [isFlipping, setIsFlipping] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("geonedra_openrouter_model");
      if (saved) {
        setSelectedModel(saved);
      }
    }
    if (user?.username) {
      fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_user_settings", username: user.username }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.settings?.preferred_model) {
            setSelectedModel(data.settings.preferred_model);
            if (typeof window !== "undefined") {
              localStorage.setItem("geonedra_openrouter_model", data.settings.preferred_model);
            }
          }
        })
        .catch(() => {});
    }
  }, [user?.username]);

  const isChaika = currentBusiness === "chaika-service";

  const handleToggleBusiness = () => {
    setIsFlipping(true);
    setTimeout(() => setIsFlipping(false), 500);
    toggleBusiness();
    const nextIsChaika = !isChaika;
    const targetWorkspace = nextIsChaika ? "service" : "geo";
    const matchingSession = sessions.find((s) =>
      targetWorkspace === "service" ? s.workspace === "service" : (!s.workspace || s.workspace === "geo")
    );
    if (matchingSession) {
      selectSession(matchingSession.id);
    } else {
      createNewChat(targetWorkspace);
    }

    if (isChaika) {
      // Switching to geo-ai
      if (["repair-orders", "invoices", "telephony", "bay-scheduler", "warehouse-parts", "parts-procurement", "garage-clients", "payroll"].includes(currentTab)) {
        onSelectTab("ai-chat");
      }
    } else {
      // Switching to chaika-service
      if (["smart-mail", "project-studio", "calendar"].includes(currentTab)) {
        onSelectTab("repair-orders");
      }
    }
  };

  const handleOpenSettings = () => {
    if (isChaika) {
      setIsStoSettingsOpen(true);
    } else {
      setNameInput(user?.name || "");
      setShowSettingsModal(true);
    }
  };

  interface SidebarNavItem {
    id: NavTab;
    label: string;
    icon: any;
    badge?: string;
  }

  const geoNavItems: SidebarNavItem[] = [
    {
      id: "ai-chat" as NavTab,
      label: "Чат с ИИ",
      icon: MessageSquareText,
    },
    {
      id: "smart-mail" as NavTab,
      label: "Умная почта",
      icon: Mail,
      badge: pendingMailsCount > 0 ? `${pendingMailsCount}` : undefined,
    },
    {
      id: "calendar" as NavTab,
      label: "Календарь",
      icon: Calendar,
    },
    {
      id: "project-studio" as NavTab,
      label: "Проектирование",
      icon: FileText,
    },
    {
      id: "archive" as NavTab,
      label: "Электронный архив",
      icon: FolderArchive,
    },
  ];

  const chaikaNavItems: SidebarNavItem[] = [
    {
      id: "repair-orders" as NavTab,
      label: "Заказ-наряды",
      icon: ClipboardList,
    },
    {
      id: "invoices" as NavTab,
      label: "Счета на оплату",
      icon: Receipt,
    },
    {
      id: "parts-procurement" as NavTab,
      label: "Проценка автозапчастей",
      icon: SearchCheck,
    },
    {
      id: "telephony" as NavTab,
      label: "ИИ-Телефония и Звонки",
      icon: PhoneCall,
    },
    {
      id: "payroll" as NavTab,
      label: "Выработка и Зарплата",
      icon: DollarSign,
    },
    {
      id: "bay-scheduler" as NavTab,
      label: "Пост-планировщик",
      icon: CalendarClock,
    },
    {
      id: "warehouse-parts" as NavTab,
      label: "Складской учет",
      icon: Package,
    },
    {
      id: "garage-clients" as NavTab,
      label: "Контрагенты и Автопарк",
      icon: Users,
    },
    {
      id: "ai-chat" as NavTab,
      label: "Шеф-мастер (ИИ)",
      icon: MessageSquareText,
    },
    {
      id: "archive" as NavTab,
      label: "Электронный архив",
      icon: FolderArchive,
    },
  ];

  const navItems = isChaika ? chaikaNavItems : geoNavItems;

  const visibleSessions = sessions.filter((s) => {
    const ws = detectChatWorkspace(s);
    if (isChaika) {
      if (ws !== "service") return false;
      const t = (s.title || "").toLowerCase();
      if (
        t.includes("###") ||
        t.includes("сведения о н") ||
        t.includes("недропольз") ||
        t.includes("heading") ||
        t.includes("content\":") ||
        t.includes("лицензи")
      ) {
        return false;
      }
      return true;
    }
    return ws === "geo";
  });

  const handleNewChatClick = () => {
    createNewChat(isChaika ? "service" : "geo");
    onSelectTab("ai-chat");
    onCloseMobile?.();
  };

  const handleTabClick = (tab: NavTab) => {
    onSelectTab(tab);
    onCloseMobile?.();
  };

  const handleSelectSession = (sessionId: string) => {
    selectSession(sessionId);
    onSelectTab("ai-chat");
    onCloseMobile?.();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden transition-opacity"
        />
      )}

      {/* Main Sidebar (Fixed slide-out on mobile, static flex on desktop) */}
      <aside
        className={`w-72 border-r border-zinc-200/80 dark:border-white/[0.08] bg-white/80 dark:bg-[#09090b]/85 backdrop-blur-2xl flex flex-col justify-between shrink-0 select-none transition-all h-full z-50 ${
          isMobileOpen
            ? "fixed inset-y-0 left-0 shadow-2xl flex"
            : "hidden md:flex"
        }`}
      >
        <div className="flex flex-col flex-1 min-h-0">
          {/* Brand Header with Large Centered Logo and Flip Switcher */}
          <div className="relative px-3 py-4 border-b border-black/[0.04] dark:border-white/[0.06] flex items-center justify-center">
            <button
              type="button"
              onClick={handleToggleBusiness}
              className="group w-full flex items-center justify-center space-x-3 px-2 py-1.5 rounded-2xl hover:bg-zinc-200/50 dark:hover:bg-white/[0.04] transition-all cursor-pointer text-center select-none"
              title={isChaika ? "Нажмите для переключения в GEO AI (Недропользование)" : "Нажмите для переключения в ЧАЙКА-СЕРВИС (СТО и автопарк)"}
            >
              {/* Large Centered Logo with Flip Animation */}
              <div
                className={`flex items-center justify-center transition-all duration-500 transform ${
                  isFlipping ? "scale-90 [transform:rotateY(180deg)] opacity-60" : "scale-100 [transform:rotateY(0deg)] opacity-100"
                } group-hover:scale-105`}
              >
                {isChaika ? (
                  <img
                    src={theme === "dark" ? "/logo-chaika-white.png" : "/logo-chaika-dark.png"}
                    alt="Чайка-Сервис"
                    className="h-8 sm:h-8.5 w-auto max-w-[160px] object-contain transition-all drop-shadow-xs"
                  />
                ) : (
                  <img
                    src={theme === "dark" ? "/geo-ai-logo-dark.png" : "/geo-ai-logo-light.png"}
                    alt="Geo AI"
                    className="h-8 sm:h-8.5 w-auto max-w-[160px] object-contain transition-all drop-shadow-xs"
                  />
                )}
              </div>

              {/* Minimalist Switcher Icon */}
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all bg-zinc-200/60 dark:bg-white/[0.06] group-hover:bg-zinc-300 dark:group-hover:bg-white/[0.14] text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white shadow-2xs ${
                  isFlipping ? "rotate-180 scale-110" : ""
                }`}
                title="Сменить бизнес-режим"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500" />
              </div>
            </button>

            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className="absolute right-3 top-1/2 -translate-y-1/2 md:hidden p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                title="Закрыть меню"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* New Chat Button (Only in GEO mode to avoid duplication with "Шеф-мастер (ИИ)") */}
          {!isChaika && (
            <div className="px-3 pt-3 pb-1">
              <button
                onClick={handleNewChatClick}
                className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center space-x-3 cursor-pointer bg-white/80 dark:bg-white/[0.04] hover:bg-zinc-100 dark:hover:bg-white/[0.08] text-zinc-800 dark:text-zinc-100 border border-zinc-200/90 dark:border-white/[0.08] shadow-2xs group"
              >
                <div className="w-5 h-5 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform bg-sky-500/10 dark:bg-sky-500/15 text-sky-500">
                  <Plus className="w-3.5 h-3.5" />
                </div>
                <span className="font-medium text-zinc-800 dark:text-zinc-100">
                  Новый чат
                </span>
              </button>
            </div>
          )}

          {/* Navigation Section */}
          <nav className={`px-3 ${isChaika ? "pt-3" : "pt-1"} pb-2 space-y-1`}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={`w-full text-left px-3.5 py-2 rounded-2xl text-[14.5px] transition-all flex items-center justify-between cursor-pointer antialiased ${
                    isActive
                      ? isChaika
                        ? "bg-gradient-to-r from-red-500/20 to-red-500/5 border border-red-500/30 text-zinc-950 dark:text-white font-semibold shadow-xs backdrop-blur-md"
                        : "bg-gradient-to-r from-sky-500/20 to-sky-500/5 border border-sky-500/30 text-zinc-950 dark:text-white font-semibold shadow-xs backdrop-blur-md"
                      : "text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-white/[0.06] font-medium"
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive
                          ? isChaika
                            ? "text-red-500 dark:text-red-400"
                            : "text-sky-500 dark:text-sky-400"
                          : "text-zinc-400 dark:text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200"
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full font-medium ml-2 shrink-0 ${
                        isChaika
                          ? "bg-red-500/15 text-red-600 dark:text-red-400"
                          : "bg-sky-500/15 text-sky-600 dark:text-sky-400"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Divider */}
          <div className="mx-3 border-t border-zinc-200 dark:border-white/[0.06] my-1" />

          {/* Dialogue History Accordion */}
          <div className="flex-1 overflow-y-auto px-3 py-1 space-y-1 min-h-0">
            <div
              className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-zinc-200/50 dark:hover:bg-white/[0.04] transition-colors cursor-pointer select-none"
              onClick={() => setIsChatHistoryOpen(!isChatHistoryOpen)}
            >
              <div className="flex items-center space-x-1.5 text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                {isChatHistoryOpen ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
                <span>{isChaika ? "Диалоги СТО" : "История диалогов"}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-200/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-semibold lowercase">
                  {visibleSessions.length}
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNewChatClick();
                }}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
                title="Новый диалог"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {isChatHistoryOpen && (
              <div className="space-y-0.5 pt-0.5">
                {visibleSessions.length === 0 ? (
                  <div className="px-2 py-3 text-center text-xs text-zinc-400 dark:text-zinc-600">
                    Нет сохраненных диалогов
                  </div>
                ) : (
                  visibleSessions.map((sess) => {
                    const isActive = currentTab === "ai-chat" && sess.id === activeSessionId;
                    return (
                      <div
                        key={sess.id}
                        onClick={() => handleSelectSession(sess.id)}
                        className={`group w-full px-2.5 py-2 rounded-xl text-xs cursor-pointer flex items-center justify-between transition-colors border ${
                          isActive
                            ? isChaika
                              ? "bg-gradient-to-r from-red-500/20 to-red-500/5 border-red-500/30 text-zinc-950 dark:text-white font-semibold shadow-2xs"
                              : "bg-gradient-to-r from-sky-500/20 to-sky-500/5 border-sky-500/30 text-zinc-950 dark:text-white font-semibold shadow-2xs"
                            : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/40 dark:hover:bg-white/[0.04]"
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0 pr-1">
                          <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? (isChaika ? "text-red-500" : "text-sky-500") : "text-zinc-400"}`} />
                          <span className="truncate text-xs">{cleanChatTitle(sess.title)}</span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSession(sess.id);
                          }}
                          className="opacity-40 group-hover:opacity-100 text-zinc-400 hover:text-rose-500 p-1 rounded transition-opacity cursor-pointer shrink-0"
                          title="Удалить чат"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer: Compact Unified User Capsule with Icon Actions */}
        <div className="p-3 border-t border-black/[0.05] dark:border-white/[0.06] shrink-0">
          <div className="px-2.5 py-2 rounded-2xl bg-zinc-200/50 dark:bg-white/[0.05] border border-black/[0.04] dark:border-white/[0.06] backdrop-blur-xl flex items-center justify-between">
            {/* User Info (Clicking opens Settings) */}
            <button
              type="button"
              onClick={handleOpenSettings}
              className="flex items-center space-x-2 min-w-0 hover:opacity-80 transition-opacity cursor-pointer text-left mr-1.5 group"
              title="Настройки профиля и системы"
            >
              <div className="w-7 h-7 rounded-full bg-zinc-300/80 dark:bg-white/[0.1] flex items-center justify-center text-zinc-700 dark:text-zinc-200 shrink-0 group-hover:scale-105 transition-transform">
                <User className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                  {user?.name || "Пользователь"}
                </div>
              </div>
            </button>

            {/* Compact Action Icons: Settings, Theme Toggle, Logout */}
            <div className="flex items-center space-x-0.5 shrink-0">
              {/* Settings (Unified) */}
              <button
                type="button"
                onClick={handleOpenSettings}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-300/50 dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
                title={isChaika ? "Настройки реквизитов, сотрудников и профиля СТО" : "Настройки профиля и системы"}
              >
                <Settings className="w-3.5 h-3.5" />
              </button>

              {/* Theme Toggle */}
              <button
                type="button"
                onClick={toggleTheme}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-300/50 dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
                title={theme === "dark" ? "Переключить на светлую тему" : "Переключить на темную тему"}
              >
                {theme === "dark" ? (
                  <Moon className="w-3.5 h-3.5" />
                ) : (
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                )}
              </button>

              {/* Logout */}
              <button
                type="button"
                onClick={logout}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                title="Выйти из системы"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white/95 dark:bg-zinc-950/90 backdrop-blur-2xl border border-black/[0.08] dark:border-white/10 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-white/[0.08] pb-3">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Настройки профиля и системы
              </h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-zinc-600 dark:text-zinc-300">
              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-medium mb-1.5">
                  Ваше имя:
                </label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Как к вам обращаться?"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder:text-zinc-500 focus:outline-none focus:border-sky-500/50"
                />
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">
                  Логин аккаунта ({user?.username}) защищен. Имя отображается в панели и используется ИИ при обращении к вам.
                </p>
              </div>

              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-medium mb-1.5">
                  Основная модель ИИ:
                </label>
                <select
                  id="openrouter-model-select"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-sky-500/50 text-xs font-medium cursor-pointer"
                >
                  <option value="anthropic/claude-sonnet-4.6">Claude Sonnet 4.6 (Основной флагман, рекомендуется)</option>
                  <option value="openai/gpt-5.4">OpenAI GPT-5.4 (Резервный флагман)</option>
                  <option value="google/gemini-3.8-flash">Google Gemini 4 Argon (Высокопроизводительный резерв)</option>
                </select>
                <p className="text-[10px] text-zinc-400 mt-1">
                  Выбранная модель сохраняется в облаке Supabase и используется как приоритетная с автоматическим отказоустойчивым резервированием.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-white/10 flex items-center justify-between">
                <div>
                  <div className="font-medium text-zinc-800 dark:text-zinc-200">
                    Почтовые ящики (Мульти-IMAP)
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    Управление подключениями IMAP/SMTP для недропользования
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowSettingsModal(false);
                    onSelectTab("smart-mail");
                  }}
                  className="px-3 py-1.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 text-xs font-medium transition-colors cursor-pointer shrink-0 ml-2"
                >
                  В Умную почту
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                disabled={isSavingSettings}
                onClick={async () => {
                  setIsSavingSettings(true);
                  if (nameInput.trim()) {
                    updateName(nameInput.trim());
                  }
                  if (typeof window !== "undefined") {
                    localStorage.setItem("geonedra_openrouter_model", selectedModel);
                  }
                  if (user?.username) {
                    try {
                      await fetch("/api/sync", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          action: "save_user_settings",
                          username: user.username,
                          payload: {
                            preferred_model: selectedModel,
                            display_name: nameInput.trim() || user.name,
                          },
                        }),
                      });
                    } catch (e) {
                      console.warn("Failed to sync settings to Supabase:", e);
                    }
                  }
                  setIsSavingSettings(false);
                  setShowSettingsModal(false);
                }}
                className="px-5 py-2 rounded-full bg-sky-500 hover:bg-sky-400 text-white font-medium text-xs transition-colors cursor-pointer shadow-md shadow-sky-500/20"
              >
                {isSavingSettings ? "Сохранение..." : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STO Requisites and Staff Settings Modal */}
      <StoSettingsModal
        isOpen={isStoSettingsOpen}
        onClose={() => setIsStoSettingsOpen(false)}
      />
    </>
  );
};
