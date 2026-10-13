"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import { useTheme } from "@/lib/theme-context";
import { useAuth } from "@/lib/auth-context";
import { useChat } from "@/lib/chat-context";

export type NavTab = "ai-chat" | "smart-mail" | "project-studio" | "calendar";

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
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [nameInput, setNameInput] = useState("");

  const navItems = [
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
  ];

  const handleNewChatClick = () => {
    createNewChat();
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
          {/* Brand Header with adapted wide horizontal user logo and mobile close button */}
          <div className="px-5 py-4 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between">
            <img
              src={theme === "dark" ? "/geo-ai-logo-dark.png" : "/geo-ai-logo-light.png"}
              alt="Geo AI"
              className="h-8 w-auto max-w-[190px] object-contain transition-all"
            />

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

          {/* New Chat Button (Clean, modern, harmonious with nav items) */}
          <div className="px-3 pt-3 pb-1">
            <button
              onClick={handleNewChatClick}
              className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center space-x-3 cursor-pointer bg-white dark:bg-[#131821] hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-800 dark:text-slate-100 border border-slate-200/90 dark:border-white/[0.08] shadow-2xs group"
            >
              <div className="w-5 h-5 rounded-lg bg-sky-500/10 dark:bg-sky-500/15 flex items-center justify-center text-sky-500 shrink-0 group-hover:scale-110 transition-transform">
                <Plus className="w-3.5 h-3.5" />
              </div>
              <span className="font-medium text-slate-800 dark:text-slate-100">Новый чат</span>
            </button>
          </div>

          {/* Navigation Section (4 tabs: Чат с ИИ, Умная почта, Календарь, Проектирование) */}
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
                      ? "bg-slate-200/80 dark:bg-white/[0.08] text-slate-900 dark:text-slate-100 shadow-2xs font-semibold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/40 dark:hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-sky-500 dark:text-sky-400" : "text-slate-400 dark:text-slate-500"}`} />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400 font-medium ml-2 shrink-0">
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
            <div className="px-2 py-1 text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Диалоги
            </div>

            <div className="space-y-0.5">
              {sessions.map((sess) => {
                const isActive = currentTab === "ai-chat" && sess.id === activeSessionId;
                return (
                  <div
                    key={sess.id}
                    onClick={() => handleSelectSession(sess.id)}
                    className={`group w-full px-2.5 py-2 rounded-xl text-xs cursor-pointer flex items-center justify-between transition-colors ${
                      isActive
                        ? "bg-slate-200/90 dark:bg-white/[0.08] text-slate-950 dark:text-slate-100 font-medium shadow-2xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/40 dark:hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0 pr-1">
                      <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-sky-500" : "text-slate-400"}`} />
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
              })}
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
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0c1015] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500/50 text-xs"
                  defaultValue={typeof window !== "undefined" ? localStorage.getItem("geonedra_openrouter_model") || "anthropic/claude-3.7-sonnet" : "anthropic/claude-3.7-sonnet"}
                >
                  <option value="anthropic/claude-3.7-sonnet">Claude 3.7 Sonnet (Флагман, рекомендуется)</option>
                  <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet</option>
                  <option value="anthropic/claude-3.5-haiku">Claude 3.5 Haiku (Быстрая и экономичная)</option>
                  <option value="google/gemini-2.5-flash">Google Gemini 2.5 Flash</option>
                  <option value="openai/gpt-4o">OpenAI GPT-4o</option>
                  <option value="deepseek/deepseek-chat">DeepSeek V3</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Если у модели нет свободных серверов, система автоматически переключится на резервные.
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
                onClick={() => {
                  if (nameInput.trim()) {
                    updateName(nameInput.trim());
                  }
                  const modelSelect = document.getElementById("openrouter-model-select") as HTMLSelectElement | null;
                  if (typeof window !== "undefined" && modelSelect) {
                    localStorage.setItem("geonedra_openrouter_model", modelSelect.value);
                  }
                  setShowSettingsModal(false);
                }}
                className="px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-medium text-xs transition-colors cursor-pointer"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
