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
} from "lucide-react";
import { useTheme } from "@/lib/theme-context";
import { useAuth } from "@/lib/auth-context";
import { useChat } from "@/lib/chat-context";
import { useBusiness } from "@/lib/business-context";
import { StoSettingsModal } from "./StoSettingsModal";

export type NavTab =
  | "ai-chat"
  | "smart-mail"
  | "project-studio"
  | "calendar"
  | "archive"
  | "repair-orders"
  | "bay-scheduler"
  | "warehouse-parts"
  | "parts-procurement"
  | "garage-clients";

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
      if (["repair-orders", "bay-scheduler", "warehouse-parts", "parts-procurement", "garage-clients"].includes(currentTab)) {
        onSelectTab("ai-chat");
      }
    } else {
      // Switching to chaika-service
      if (["smart-mail", "project-studio", "calendar"].includes(currentTab)) {
        onSelectTab("repair-orders");
      }
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
      id: "parts-procurement" as NavTab,
      label: "Проценка автозапчастей",
      icon: SearchCheck,
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
    if (isChaika) {
      return s.workspace === "service";
    }
    return !s.workspace || s.workspace === "geo";
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
        className={`w-72 border-r border-slate-200 dark:border-white/[0.08] bg-[#f8fafc] dark:bg-[#090d12] flex flex-col justify-between shrink-0 select-none transition-all h-full z-50 ${
          isMobileOpen
            ? "fixed inset-y-0 left-0 shadow-2xl flex"
            : "hidden md:flex"
        }`}
      >
        <div className="flex flex-col flex-1 min-h-0">
          {/* Brand Header with Interactive Multi-Business Transformer Switcher */}
          <div className="px-4 py-3.5 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between">
            <button
              onClick={handleToggleBusiness}
              className={`flex items-center space-x-2.5 p-1.5 rounded-xl transition-all cursor-pointer group text-left max-w-[215px] border ${
                isChaika
                  ? "hover:bg-rose-500/10 border-rose-500/20 bg-rose-500/5 dark:bg-rose-950/20"
                  : "hover:bg-sky-500/10 border-slate-200/80 dark:border-white/[0.06] bg-white dark:bg-[#131821]"
              }`}
              title={isChaika ? "Переключить режим: Нажмите для перехода в GEO AI (Недропользование)" : "Переключить режим: Нажмите для перехода в ЧАЙКА-СЕРВИС (СТО и автопарк)"}
            >
              {isChaika ? (
                <div className="flex items-center space-x-2 min-w-0">
                  <div className="h-8 flex items-center shrink-0">
                    <img
                      src="/logo-chaika-white.png"
                      alt="Чайка-Сервис"
                      className="h-6 w-auto max-w-[130px] object-contain transition-all brightness-0 dark:brightness-100"
                    />
                  </div>
                  <div className="min-w-0 flex flex-col justify-center">
                    <span className="text-[9px] text-rose-600 dark:text-rose-400 truncate font-semibold tracking-wide uppercase">
                      СТО & Парк
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-2 min-w-0">
                  <img
                    src={theme === "dark" ? "/geo-ai-logo-dark.png" : "/geo-ai-logo-light.png"}
                    alt="Geo AI"
                    className="h-7 w-auto max-w-[140px] object-contain transition-all"
                  />
                </div>
              )}

              {/* Transformer Switcher Badge */}
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                  isChaika
                    ? "bg-rose-500/15 text-rose-500 group-hover:bg-rose-500 group-hover:text-white"
                    : "bg-slate-100 dark:bg-white/[0.08] text-slate-500 group-hover:bg-sky-500 group-hover:text-white"
                }`}
                title="Сменить бизнес-режим"
              >
                <ArrowLeftRight className="w-3 h-3 group-hover:rotate-180 transition-transform duration-300" />
              </div>
            </button>

            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                title="Закрыть меню"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* New Chat Button */}
          <div className="px-3 pt-3 pb-1">
            <button
              onClick={handleNewChatClick}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center space-x-3 cursor-pointer bg-white dark:bg-[#131821] hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-800 dark:text-slate-100 border border-slate-200/90 dark:border-white/[0.08] shadow-2xs group`}
            >
              <div
                className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform ${
                  isChaika
                    ? "bg-rose-500/10 dark:bg-rose-500/15 text-rose-500"
                    : "bg-sky-500/10 dark:bg-sky-500/15 text-sky-500"
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
              </div>
              <span className="font-medium text-slate-800 dark:text-slate-100">
                {isChaika ? "Новый запрос шефу" : "Новый чат"}
              </span>
            </button>
          </div>

          {/* Navigation Section */}
          <nav className="px-3 pt-1 pb-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                    isActive
                      ? isChaika
                        ? "bg-rose-500/10 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 shadow-2xs font-semibold"
                        : "bg-slate-200/80 dark:bg-white/[0.08] text-slate-900 dark:text-slate-100 shadow-2xs font-semibold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/40 dark:hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive
                          ? isChaika
                            ? "text-rose-500 dark:text-rose-400"
                            : "text-sky-500 dark:text-sky-400"
                          : "text-slate-400 dark:text-slate-500"
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full font-medium ml-2 shrink-0 ${
                        isChaika
                          ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
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
          <div className="mx-3 border-t border-slate-200 dark:border-white/[0.06] my-1" />

          {/* Dialogue History List */}
          <div className="flex-1 overflow-y-auto px-3 py-1 space-y-1 min-h-0">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-[11px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                {isChaika ? "Диалоги СТО" : "Диалоги"}
              </span>
              <button
                type="button"
                onClick={handleNewChatClick}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                title="Новый диалог"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-0.5">
              {visibleSessions.length === 0 ? (
                <div className="px-2 py-3 text-center text-xs text-slate-400 dark:text-zinc-600">
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
                            ? "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-300 font-semibold shadow-2xs"
                            : "bg-slate-200/90 dark:bg-white/[0.08] border-slate-300 dark:border-zinc-700 text-slate-950 dark:text-slate-100 font-medium shadow-2xs"
                          : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/40 dark:hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0 pr-1">
                        <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? (isChaika ? "text-rose-500" : "text-sky-500") : "text-slate-400"}`} />
                        <span className="truncate text-xs">{sess.title}</span>
                      </div>

                      {sessions.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSession(sess.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 p-0.5 rounded transition-opacity cursor-pointer"
                          title="Удалить чат"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer: User Profile, Settings, Theme & Logout */}
        <div className="p-3 border-t border-slate-200 dark:border-white/[0.08] space-y-2 shrink-0">
          {/* User Profile Info + Logout */}
          <div className="px-3 py-2 rounded-xl bg-slate-200/60 dark:bg-white/[0.04] flex items-center justify-between">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-7 h-7 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 shrink-0">
                <User className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                  {user?.name || "Пользователь"}
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              className="p-1.5 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
              title="Выйти из системы"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-0.5">
            {isChaika && (
              <button
                type="button"
                onClick={() => setIsStoSettingsOpen(true)}
                className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center space-x-2.5 cursor-pointer font-medium border border-rose-500/20 mb-1"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Реквизиты и сотрудники СТО</span>
              </button>
            )}

            <button
              onClick={() => {
                setNameInput(user?.name || "");
                setShowSettingsModal(true);
              }}
              className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-white/[0.04] transition-colors flex items-center space-x-2.5 cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-slate-400" />
              <span>Настройки</span>
            </button>

            <button
              onClick={toggleTheme}
              className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-white/[0.04] transition-colors flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center space-x-2.5">
                {theme === "dark" ? (
                  <Moon className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <Sun className="w-3.5 h-3.5 text-sky-500" />
                )}
                <span>{theme === "dark" ? "Темная тема" : "Светлая тема"}</span>
              </div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                {theme === "dark" ? "Dark" : "Light"}
              </span>
            </button>
          </div>
        </div>
      </aside>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#131821] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.08] pb-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Настройки профиля и системы
              </h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1.5">
                  Ваше имя:
                </label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Как к вам обращаться?"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0c1015] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500/50"
                />
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                  Логин аккаунта ({user?.username}) защищен. Имя отображается в панели и используется ИИ при обращении к вам.
                </p>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1.5">
                  Основная модель ИИ:
                </label>
                <select
                  id="openrouter-model-select"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0c1015] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500/50 text-xs font-medium cursor-pointer"
                >
                  <option value="anthropic/claude-sonnet-4.6">Claude Sonnet 4.6 (Основной флагман, рекомендуется)</option>
                  <option value="openai/gpt-5.4">OpenAI GPT-5.4 (Резервный флагман)</option>
                  <option value="google/gemini-3.8-flash">Google Gemini 4 Argon (Высокопроизводительный резерв)</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Выбранная модель сохраняется в облаке Supabase и используется как приоритетная с автоматическим отказоустойчивым резервированием.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0c1015] border border-slate-200 dark:border-white/[0.08] flex items-center justify-between">
                <div>
                  <div className="font-medium text-slate-800 dark:text-slate-200">
                    Почтовые ящики (Мульти-IMAP)
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Управление подключениями IMAP/SMTP для недропользования
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowSettingsModal(false);
                    onSelectTab("smart-mail");
                  }}
                  className="px-3 py-1.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 text-xs font-medium transition-colors cursor-pointer shrink-0 ml-2"
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
                className="px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-medium text-xs transition-colors cursor-pointer"
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
