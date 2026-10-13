"use client";

import React, { useState } from "react";
import { Sidebar, NavTab } from "@/components/Sidebar";
import { AIChat } from "@/components/AIChat";
import { SmartMail } from "@/components/SmartMail";
import { ProjectStudio } from "@/components/ProjectStudio";
import { CalendarModule } from "@/components/CalendarModule";
import { LoginScreen } from "@/components/LoginScreen";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { INITIAL_MAILS } from "@/lib/mock-data";
import { MailItem } from "@/lib/supabase";
import { Menu, Plus } from "lucide-react";
import { useChat } from "@/lib/chat-context";

export default function Home() {
  const { user, isLoading } = useAuth();
  const { theme } = useTheme();
  const { createNewChat } = useChat();
  const [currentTab, setCurrentTab] = useState<NavTab>("ai-chat");
  const [mails, setMails] = useState<MailItem[]>(INITIAL_MAILS);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#f8fafc] dark:bg-[#0c1015]">
        <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  const handleApproveMail = (mailId: string, finalReplyText?: string) => {
    setMails((prev) =>
      prev.map((m) => {
        if (m.id === mailId) {
          return {
            ...m,
            status: "APPROVED",
            ai_draft: m.ai_draft
              ? {
                  ...m.ai_draft,
                  reply_body: finalReplyText || m.ai_draft.reply_body,
                }
              : undefined,
          };
        }
        return m;
      })
    );
  };

  const pendingCount = mails.filter((m) => m.status === "PENDING_APPROVAL").length;

  const getTabTitle = (tab: NavTab) => {
    switch (tab) {
      case "ai-chat":
        return "Чат с ИИ";
      case "smart-mail":
        return "Умная почта";
      case "calendar":
        return "Календарь";
      case "project-studio":
        return "Проектирование";
      default:
        return "Geo AI";
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen overflow-hidden bg-white dark:bg-[#0c1015] text-slate-900 dark:text-slate-100 transition-colors">
      {/* Mobile Top Header (Visible only on mobile < md) */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-white/[0.08] bg-[#f8fafc] dark:bg-[#090d12] shrink-0 z-30">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
            title="Открыть меню"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            {getTabTitle(currentTab)}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {currentTab === "ai-chat" && (
            <button
              onClick={() => createNewChat()}
              className="p-1.5 rounded-lg bg-sky-500/10 text-sky-500 hover:bg-sky-500/20 transition-colors cursor-pointer"
              title="Новый диалог"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}

          <img
            src={theme === "dark" ? "/geo-ai-logo-dark.png" : "/geo-ai-logo-light.png"}
            alt="Geo AI"
            className="h-6 w-auto max-w-[110px] object-contain ml-1"
          />
        </div>
      </header>

      {/* Responsive Sidebar (Permanent on desktop, drawer on mobile) */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        pendingMailsCount={pendingCount}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {currentTab === "ai-chat" && <AIChat />}

        {currentTab === "smart-mail" && (
          <SmartMail mails={mails} onApproveMail={handleApproveMail} />
        )}

        {currentTab === "calendar" && <CalendarModule />}

        {currentTab === "project-studio" && <ProjectStudio />}
      </main>
    </div>
  );
}
