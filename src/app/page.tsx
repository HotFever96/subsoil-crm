"use client";

import React, { useState } from "react";
import { Sidebar, NavTab } from "@/components/Sidebar";
import { SmartMail } from "@/components/SmartMail";
import { LegalExpert } from "@/components/LegalExpert";
import { ProjectStudio } from "@/components/ProjectStudio";
import { LicenseRegistry } from "@/components/LicenseRegistry";
import { INITIAL_MAILS } from "@/lib/mock-data";
import { MailItem } from "@/lib/supabase";

export default function Home() {
  const [currentTab, setCurrentTab] = useState<NavTab>("smart-mail");
  const [mails, setMails] = useState<MailItem[]>(INITIAL_MAILS);

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
    <div className="flex h-screen w-screen overflow-hidden bg-[#0a1019]">
      {/* Swiss Banking / Deep Navy Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        pendingMailsCount={pendingCount}
      />

      {/* Main Workspace Frame */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {currentTab === "smart-mail" && (
          <SmartMail mails={mails} onApproveMail={handleApproveMail} />
        )}

        {currentTab === "legal-expert" && <LegalExpert />}

        {currentTab === "project-studio" && <ProjectStudio />}

        {currentTab === "licenses" && <LicenseRegistry />}
      </main>
    </div>
  );
}
