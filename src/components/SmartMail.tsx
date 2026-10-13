"use client";

import React, { useState } from "react";
import {
  Mail,
  Edit3,
  RotateCw,
  UserCheck,
  Check,
} from "lucide-react";
import { MailItem } from "@/lib/supabase";

interface SmartMailProps {
  mails: MailItem[];
  onApproveMail: (mailId: string, finalReplyText?: string) => void;
}

export const SmartMail: React.FC<SmartMailProps> = ({ mails, onApproveMail }) => {
  const [selectedMailId, setSelectedMailId] = useState<string>(mails[0]?.id || "");
  const [isEditing, setIsEditing] = useState(false);
  const [editedReply, setEditedReply] = useState<string>("");
  const [isRegenerating, setIsRegenerating] = useState(false);

  const currentMail = mails.find((m) => m.id === selectedMailId) || mails[0];

  const handleSelectMail = (mail: MailItem) => {
    setSelectedMailId(mail.id);
    setIsEditing(false);
    setEditedReply(mail.ai_draft?.reply_body || "");
  };

  const handleStartEdit = () => {
    setEditedReply(editedReply || currentMail?.ai_draft?.reply_body || "");
    setIsEditing(true);
  };

  const handleApprove = () => {
    if (!currentMail) return;
    onApproveMail(currentMail.id, isEditing ? editedReply : currentMail.ai_draft?.reply_body);
    setIsEditing(false);
  };

  const handleRegenerateReply = async () => {
    if (!currentMail) return;
    setIsRegenerating(true);
    try {
      const res = await fetch("/api/generate-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incomingMail: currentMail,
          customInstructions: "Сформулировать официальный аргументированный ответ со ссылкой на Закон «О недрах».",
        }),
      });
      const data = await res.json();
      if (data.reply_body) {
        setEditedReply(data.reply_body);
        setIsEditing(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-white dark:bg-[#12161c] transition-colors">
      {/* Left Column: Clean Letters List (No noise, clean traffic-light badges) */}
      <div className="w-80 border-r border-slate-200 dark:border-white/[0.08] flex flex-col bg-slate-50/60 dark:bg-[#0e1217] overflow-y-auto shrink-0">
        <div className="p-4 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
            Входящие письма ({mails.length})
          </span>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-white/[0.06]">
          {mails.map((mail) => {
            const isSelected = mail.id === currentMail?.id;
            const isApproved = mail.status === "APPROVED";
            return (
              <div
                key={mail.id}
                onClick={() => handleSelectMail(mail)}
                className={`p-4 cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-white dark:bg-[#181d24] border-l-2 border-amber-500 shadow-2xs"
                    : "hover:bg-slate-100/60 dark:hover:bg-white/[0.03] border-l-2 border-transparent"
                }`}
              >
                {/* Traffic light status */}
                <div className="flex items-center justify-between mb-1 text-xs">
                  <span className="font-medium text-slate-900 dark:text-slate-200 truncate">
                    {mail.agency}
                  </span>
                  <span
                    className={`inline-flex items-center space-x-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${
                      isApproved
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isApproved ? "bg-emerald-500" : "bg-amber-500"
                      }`}
                    />
                    <span>{isApproved ? "Утверждено" : "Черновик ИИ"}</span>
                  </span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mt-1">
                  {mail.subject}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Column: Detailed View */}
      {currentMail ? (
        <div className="flex-1 flex flex-col h-full overflow-y-auto bg-white dark:bg-[#12161c]">
          {/* Header Bar */}
          <div className="px-6 py-4 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between">
            <div className="min-w-0 pr-4">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
                {currentMail.agency}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                {currentMail.subject}
              </p>
            </div>

            {/* Restrained UI Action Buttons */}
            <div className="flex items-center space-x-2 shrink-0">
              {currentMail.status !== "APPROVED" ? (
                <>
                  <button
                    onClick={handleRegenerateReply}
                    disabled={isRegenerating}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] transition-colors flex items-center space-x-1.5 disabled:opacity-50"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${isRegenerating ? "animate-spin" : ""}`} />
                    <span>Обновить</span>
                  </button>
                  {!isEditing ? (
                    <button
                      onClick={handleStartEdit}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] transition-colors flex items-center space-x-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Редактировать</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                    >
                      Отмена
                    </button>
                  )}
                  <button
                    onClick={handleApprove}
                    className="px-4 py-1.5 rounded-lg text-xs font-medium bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 transition-colors flex items-center space-x-1.5"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Утвердить</span>
                  </button>
                </>
              ) : (
                <span className="flex items-center space-x-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium px-3 py-1.5 rounded-lg bg-emerald-500/10">
                  <Check className="w-3.5 h-3.5" />
                  <span>Утверждено</span>
                </span>
              )}
            </div>
          </div>

          {/* Clean Dual Content View */}
          <div className="flex-1 p-6 grid grid-cols-2 gap-6 items-start">
            {/* Box 1: Original Request */}
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Текст входящего запроса
              </span>
              <div className="p-5 rounded-xl bg-slate-50 dark:bg-[#181d24] border border-slate-200 dark:border-white/[0.08] text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {currentMail.incoming_content}
              </div>
            </div>

            {/* Box 2: Response Draft */}
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Юридический ответ
              </span>
              <div className="p-5 rounded-xl bg-slate-50 dark:bg-[#181d24] border border-slate-200 dark:border-white/[0.08] space-y-3">
                {isEditing ? (
                  <textarea
                    value={editedReply}
                    onChange={(e) => setEditedReply(e.target.value)}
                    rows={14}
                    className="w-full p-3.5 rounded-lg bg-white dark:bg-[#12161c] border border-slate-300 dark:border-white/[0.15] text-xs sm:text-sm text-slate-900 dark:text-slate-100 leading-relaxed focus:outline-none focus:border-amber-500 resize-none"
                  />
                ) : (
                  <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto">
                    {editedReply || currentMail.ai_draft?.reply_body}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
          Выберите письмо
        </div>
      )}
    </div>
  );
};
