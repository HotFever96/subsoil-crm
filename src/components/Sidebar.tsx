"use client";

import React, { useState } from "react";
import {
  MessageSquareText,
  Mail,
  FileText,
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

export type NavTab = "ai-chat" | "smart-mail" | "project-studio";

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  pendingMailsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  pendingMailsCount = 2,
}) => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { sessions, activeSessionId, selectSession, deleteSession, createNewChat } = useChat();
  const [showSettingsModal, setShowSettingsModal] = useState(false);

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
      id: "project-studio" as NavTab,
      label: "Проектирование",
      icon: FileText,
    },
  ];

  const handleNewChatClick = () => {
    createNewChat();
    onSelectTab("ai-chat");
  };

  return (
    <>
      <aside className="w-64 border-r border-slate-200 dark:border-white/[0.08] bg-[#f8fafc] dark:bg-[#0e1217] flex flex-col justify-between shrink-0 select-none transition-colors h-full">
        <div className="flex flex-col flex-1 min-h-0">
          {/* Brand Header with adapted user logo */}
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between">
            <img
              src={theme === "dark" ? "/geo-ai-logo-dark.png" : "/geo-ai-logo-light.png"}
              alt="Geo AI"
              className="h-10 w-auto object-contain transition-all"
            />
          </div>

          {/* New Chat Button (Prominent like ChatGPT / Gemini) */}
          <div className="p-3">
            <button
              onClick={handleNewChatClick}
              className="w-full py-2.5 px-3 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#181d24] hover:bg-slate-100 dark:hover:bg-white/[0.06] text-xs font-medium text-slate-800 dark:text-slate-100 flex items-center justify-between transition-all shadow-2xs group cursor-pointer"
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-5 h-5 rounded-md bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:scale-105 transition-transform">
                  <Plus className="w-3.5 h-3.5" />
                </div>
                <span>Новый чат</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/[0.06]">
                ⌘N
              </span>
            </button>
          </div>

          {/* Navigation Section */}
          <nav className="px-3 pb-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                    isActive
                      ? "bg-slate-200/80 dark:bg-white/[0.08] text-slate-900 dark:text-slate-100"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/40 dark:hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-amber-500 dark:text-amber-400" : "text-slate-400 dark:text-slate-500"}`} />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className="text-[11px] px-2 py-0.2 rounded-full bg-orange-500/15 text-orange-600 dark:text-orange-400 font-medium ml-2 shrink-0">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Divider */}
          <div className="mx-3 border-t border-slate-200 dark:border-white/[0.06] my-1" />

          {/* Dialogue History List (ChatGPT style inside single main sidebar) */}
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
                    onClick={() => {
                      selectSession(sess.id);
                      onSelectTab("ai-chat");
                    }}
                    className={`group w-full px-2.5 py-2 rounded-lg text-xs cursor-pointer flex items-center justify-between transition-colors ${
                      isActive
                        ? "bg-slate-200/90 dark:bg-white/[0.08] text-slate-950 dark:text-slate-100 font-medium shadow-2xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/40 dark:hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex items-center space-x-2 min-w-0 pr-1">
                      <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-amber-500" : "text-slate-400"}`} />
                      <span className="truncate text-xs">{sess.title}</span>
                    </div>

                    {sessions.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSession(sess.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 p-0.5 rounded transition-opacity"
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
          <div className="px-3 py-2 rounded-lg bg-slate-200/60 dark:bg-white/[0.04] flex items-center justify-between">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-7 h-7 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 shrink-0">
                <User className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                  {user?.name || "Пользователь"}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  {user?.role === "admin" ? "Администратор" : "Клиент"}
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
              onClick={() => setShowSettingsModal(true)}
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
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
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
          <div className="w-full max-w-md bg-white dark:bg-[#181d24] border border-slate-200 dark:border-white/[0.08] rounded-xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.08] pb-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Настройки системы
              </h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1">
                  Подключение к ИИ (OpenRouter API):
                </label>
                <input
                  id="openrouter-key-input"
                  type="password"
                  placeholder="sk-or-v1-..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#12161c] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500/50"
                  defaultValue={typeof window !== "undefined" ? localStorage.getItem("geonedra_openrouter_key") || "" : ""}
                />
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1">
                  Основная модель ИИ:
                </label>
                <select
                  id="openrouter-model-select"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#12161c] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500/50 text-xs"
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

              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1">
                  Адрес базы Supabase:
                </label>
                <input
                  type="text"
                  placeholder="https://your-project.supabase.co"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#12161c] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500/50"
                  defaultValue="https://hrdchbltqfakgxxkjroy.supabase.co"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  const input = document.getElementById("openrouter-key-input") as HTMLInputElement | null;
                  const modelSelect = document.getElementById("openrouter-model-select") as HTMLSelectElement | null;
                  if (typeof window !== "undefined") {
                    if (input) localStorage.setItem("geonedra_openrouter_key", input.value.trim());
                    if (modelSelect) localStorage.setItem("geonedra_openrouter_model", modelSelect.value);
                  }
                  setShowSettingsModal(false);
                }}
                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-medium text-xs transition-colors cursor-pointer"
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
