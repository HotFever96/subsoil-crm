"use client";

import React, { useState } from "react";
import { Sidebar, NavTab } from "@/components/Sidebar";
import { AIChat } from "@/components/AIChat";
import { SmartMail } from "@/components/SmartMail";
import { ProjectStudio } from "@/components/ProjectStudio";
import { LoginScreen } from "@/components/LoginScreen";
import { useAuth } from "@/lib/auth-context";
import { INITIAL_MAILS } from "@/lib/mock-data";
import { MailItem } from "@/lib/supabase";

export default function Home() {
  const { user, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavTab>("ai-chat");
  const [mails, setMails] = useState<MailItem[]>(INITIAL_MAILS);

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#f8fafc] dark:bg-[#12161c]">
        <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
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
            ai_draft: {
              ...m.ai_draft,
              reply_body: finalReplyText || m.ai_draft.reply_body,
            },
          };
        }
        return m;
      })
    );
  };

  const pendingCount = mails.filter((m) => m.status === "PENDING_APPROVAL").length;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white dark:bg-[#12161c] text-slate-900 dark:text-slate-100 transition-colors">
      {/* 3-item Narrow Minimal Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        pendingMailsCount={pendingCount}
      />

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {currentTab === "ai-chat" && <AIChat />}

        {currentTab === "smart-mail" && (
          <SmartMail mails={mails} onApproveMail={handleApproveMail} />
        )}

        {currentTab === "project-studio" && <ProjectStudio />}
      </main>
    </div>
  );
}
