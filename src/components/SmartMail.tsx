"use client";

import React, { useState, useEffect } from "react";
import {
  Inbox,
  Send,
  FileEdit,
  RotateCw,
  Check,
  Edit3,
  Calendar,
  Building,
  Plus,
  X,
  FileText,
} from "lucide-react";
import { MailItem } from "@/lib/supabase";

type MailFolder = "INBOX" | "SENT" | "DRAFTS";

interface SmartMailProps {
  mails: MailItem[];
  onApproveMail: (mailId: string, finalReplyText?: string) => void;
  onUpdateMails?: (updatedMails: MailItem[]) => void;
}

export const SmartMail: React.FC<SmartMailProps> = ({ mails: initialMails, onApproveMail, onUpdateMails }) => {
  const [mails, setMails] = useState<MailItem[]>(initialMails);

  useEffect(() => {
    setMails(initialMails);
  }, [initialMails]);
  const [currentFolder, setCurrentFolder] = useState<MailFolder>("INBOX");
  const [selectedMailId, setSelectedMailId] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [editedReply, setEditedReply] = useState<string>("");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showComposeModal, setShowComposeModal] = useState(false);

  // New compose form state
  const [composeAgency, setComposeAgency] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");

  const filteredMails = mails.filter((m) => (m.folder || "INBOX") === currentFolder);

  // Set default selected mail if not set or not in current folder
  const currentMail =
    filteredMails.find((m) => m.id === selectedMailId) ||
    filteredMails[0] ||
    null;

  const inboxCount = mails.filter((m) => (m.folder || "INBOX") === "INBOX").length;
  const sentCount = mails.filter((m) => m.folder === "SENT").length;
  const draftsCount = mails.filter((m) => m.folder === "DRAFTS").length;

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
    const finalBody = isEditing ? editedReply : currentMail.ai_draft?.reply_body || "";
    
    // Update mail status and create an entry in SENT if it was in INBOX or DRAFTS
    const updated = mails.map((m) => {
      if (m.id === currentMail.id) {
        return {
          ...m,
          status: "APPROVED" as const,
          ai_draft: m.ai_draft ? { ...m.ai_draft, reply_body: finalBody } : undefined,
        };
      }
      return m;
    });

    setMails(updated);
    onApproveMail(currentMail.id, finalBody);
    onUpdateMails?.(updated);
    setIsEditing(false);
  };

  const handleSendDraft = () => {
    if (!currentMail) return;
    const finalBody = isEditing ? editedReply : currentMail.ai_draft?.reply_body || currentMail.incoming_content;
    
    // Move draft to SENT
    const updated = mails.map((m) => {
      if (m.id === currentMail.id) {
        return {
          ...m,
          folder: "SENT" as const,
          status: "SENT" as const,
          incoming_content: finalBody,
          date: new Date().toLocaleDateString("ru-RU"),
        };
      }
      return m;
    });

    setMails(updated);
    onUpdateMails?.(updated);
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
          customInstructions: "Сформулировать официальный аргументированный ответ со ссылкой на Закон «О недрах» и нормативные акты РФ.",
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

  const handleCreateDraft = (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeAgency.trim() || !composeSubject.trim()) return;

    const newDraft: MailItem = {
      id: `draft-${Date.now()}`,
      folder: "DRAFTS",
      incoming_number: `Проект № ИСХ-2026/${Math.floor(100 + Math.random() * 900)}`,
      date: new Date().toLocaleDateString("ru-RU"),
      agency: composeAgency,
      department: "Адресат",
      subject: composeSubject,
      urgency: "STANDARD",
      status: "PENDING_APPROVAL",
      incoming_content: composeBody,
      license_code: "МСК 02841 ТЭ",
    };

    const updated = [newDraft, ...mails];
    setMails(updated);
    onUpdateMails?.(updated);
    setCurrentFolder("DRAFTS");
    setSelectedMailId(newDraft.id);
    setShowComposeModal(false);
    setComposeAgency("");
    setComposeSubject("");
    setComposeBody("");
  };

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-white dark:bg-[#12161c] transition-colors">
      {/* 1. Folders Column */}
      <div className="w-56 border-r border-slate-200 dark:border-white/[0.08] bg-[#f8fafc] dark:bg-[#0e1217] flex flex-col justify-between shrink-0 p-3 space-y-4">
        <div className="space-y-3">
          <button
            onClick={() => setShowComposeModal(true)}
            className="w-full py-2 px-3 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-medium text-xs flex items-center justify-center space-x-2 transition-colors shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>Написать письмо</span>
          </button>

          <nav className="space-y-1">
            <button
              onClick={() => {
                setCurrentFolder("INBOX");
                setSelectedMailId("");
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                currentFolder === "INBOX"
                  ? "bg-slate-200/80 dark:bg-white/[0.08] text-slate-900 dark:text-slate-100"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/40 dark:hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Inbox className="w-4 h-4 text-slate-400" />
                <span>Входящие</span>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-white/[0.1] text-slate-700 dark:text-slate-300 font-mono">
                {inboxCount}
              </span>
            </button>

            <button
              onClick={() => {
                setCurrentFolder("SENT");
                setSelectedMailId("");
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                currentFolder === "SENT"
                  ? "bg-slate-200/80 dark:bg-white/[0.08] text-slate-900 dark:text-slate-100"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/40 dark:hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Send className="w-4 h-4 text-slate-400" />
                <span>Исходящие</span>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-white/[0.1] text-slate-700 dark:text-slate-300 font-mono">
                {sentCount}
              </span>
            </button>

            <button
              onClick={() => {
                setCurrentFolder("DRAFTS");
                setSelectedMailId("");
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                currentFolder === "DRAFTS"
                  ? "bg-slate-200/80 dark:bg-white/[0.08] text-slate-900 dark:text-slate-100"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/40 dark:hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <FileEdit className="w-4 h-4 text-slate-400" />
                <span>Черновики</span>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-white/[0.1] text-slate-700 dark:text-slate-300 font-mono">
                {draftsCount}
              </span>
            </button>
          </nav>
        </div>

        <div className="p-3 rounded-lg bg-slate-200/50 dark:bg-white/[0.03] text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
          Юридический модуль проверяет корреспонденцию на соблюдение норм Закона «О недрах».
        </div>
      </div>

      {/* 2. Mail List Column */}
      <div className="w-80 border-r border-slate-200 dark:border-white/[0.08] bg-slate-50/60 dark:bg-[#0e1217] flex flex-col overflow-y-auto shrink-0">
        <div className="p-3.5 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
            {currentFolder === "INBOX" && `Входящие (${filteredMails.length})`}
            {currentFolder === "SENT" && `Исходящие (${filteredMails.length})`}
            {currentFolder === "DRAFTS" && `Черновики (${filteredMails.length})`}
          </span>
        </div>

        {filteredMails.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            В этой папке нет писем
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-white/[0.06]">
            {filteredMails.map((mail) => {
              const isSelected = mail.id === currentMail?.id;
              const isApproved = mail.status === "APPROVED";
              const isSent = mail.status === "SENT";

              return (
                <div
                  key={mail.id}
                  onClick={() => handleSelectMail(mail)}
                  className={`p-3.5 cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-white dark:bg-[#181d24] border-l-2 border-sky-500 shadow-2xs"
                      : "hover:bg-slate-100/60 dark:hover:bg-white/[0.03] border-l-2 border-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1 text-xs">
                    <span className="font-medium text-slate-900 dark:text-slate-200 truncate max-w-[170px]">
                      {mail.agency}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono shrink-0">
                      {mail.date}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                    {mail.subject}
                  </p>

                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-mono text-[10px]">
                      {mail.incoming_number}
                    </span>
                    <span
                      className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        isSent
                          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          : isApproved
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-sky-500/10 text-sky-600 dark:text-sky-400"
                      }`}
                    >
                      <span>
                        {isSent ? "Отправлено" : isApproved ? "Утверждено" : "Черновик"}
                      </span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Reading and Reply Pane */}
      {currentMail ? (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-[#12161c]">
          {/* Header of selected letter */}
          <div className="px-6 py-4 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between">
            <div className="space-y-1 min-w-0 max-w-2xl">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                {currentMail.subject}
              </h2>
              <div className="flex items-center space-x-4 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center space-x-1">
                  <Building className="w-3.5 h-3.5" />
                  <span>{currentMail.agency}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{currentMail.date}</span>
                </span>
                <span className="font-mono text-[11px]">{currentMail.incoming_number}</span>
              </div>
            </div>

            {currentMail.license_code && (
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/[0.06] text-xs font-mono text-slate-600 dark:text-slate-300">
                {currentMail.license_code}
              </span>
            )}
          </div>

          {/* Letter Body & AI Draft Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Original content */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#181d24] border border-slate-200/80 dark:border-white/[0.06]">
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-2">
                {currentFolder === "SENT" ? "Текст отправленного документа" : "Содержание письма"}
              </div>
              <div className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                {currentMail.incoming_content}
              </div>
            </div>

            {/* AI Assistant Draft Box (if present and not already purely sent) */}
            {currentMail.ai_draft && currentFolder !== "SENT" && (
              <div className="rounded-xl border border-sky-500/30 bg-sky-500/[0.03] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-sky-500" />
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {currentMail.ai_draft.title}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleRegenerateReply}
                      disabled={isRegenerating}
                      className="px-2.5 py-1 rounded-lg text-xs bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-300 transition-colors flex items-center space-x-1"
                      title="Пересчитать через ИИ"
                    >
                      <RotateCw className={`w-3.5 h-3.5 ${isRegenerating ? "animate-spin" : ""}`} />
                      <span>ИИ-генерация</span>
                    </button>

                    {!isEditing && (
                      <button
                        onClick={handleStartEdit}
                        className="px-2.5 py-1 rounded-lg text-xs bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-300 transition-colors flex items-center space-x-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Править</span>
                      </button>
                    )}

                    {currentFolder === "DRAFTS" ? (
                      <button
                        onClick={handleSendDraft}
                        className="px-3.5 py-1 rounded-lg text-xs font-medium bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 transition-opacity flex items-center space-x-1"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Отправить</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleApprove}
                        className="px-3.5 py-1 rounded-lg text-xs font-medium bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 transition-opacity flex items-center space-x-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Утвердить</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Legal basis list */}
                {currentMail.ai_draft.legal_basis && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-medium text-slate-400">
                      Нормативное правовое обоснование:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {currentMail.ai_draft.legal_basis.map((item, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded text-[11px] bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reply body */}
                {isEditing ? (
                  <textarea
                    value={editedReply}
                    onChange={(e) => setEditedReply(e.target.value)}
                    rows={12}
                    className="w-full p-3 rounded-lg bg-white dark:bg-[#12161c] border border-slate-300 dark:border-white/[0.1] text-xs sm:text-sm text-slate-900 dark:text-slate-100 leading-relaxed focus:outline-none focus:border-sky-500 resize-none"
                  />
                ) : (
                  <div className="p-4 rounded-lg bg-white dark:bg-[#12161c] border border-slate-200 dark:border-white/[0.08] text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {editedReply || currentMail.ai_draft.reply_body}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 bg-white dark:bg-[#12161c]">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/[0.04] flex items-center justify-center text-slate-400 mb-3">
            <Inbox className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Письмо не выбрано
          </p>
          <p className="text-xs text-slate-400 max-w-sm">
            Выберите письмо из списка слева или создайте новое официальное обращение, нажав «+ Написать».
          </p>
        </div>
      )}

      {/* Compose Letter Modal */}
      {showComposeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-[#181d24] border border-slate-200 dark:border-white/[0.08] rounded-xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.08] pb-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                <FileText className="w-4 h-4 text-sky-500" />
                <span>Новое официальное письмо / Черновик</span>
              </h3>
              <button
                onClick={() => setShowComposeModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDraft} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1">
                  Адресат (Ведомство / Организация):
                </label>
                <input
                  type="text"
                  required
                  placeholder="например: Департамент по недропользованию (Центрнедра)"
                  value={composeAgency}
                  onChange={(e) => setComposeAgency(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#12161c] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500/50"
                />
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1">
                  Тема письма:
                </label>
                <input
                  type="text"
                  required
                  placeholder="например: О направлении отчета по форме 70-тп"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#12161c] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500/50"
                />
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1">
                  Текст документа:
                </label>
                <textarea
                  rows={6}
                  placeholder="Введите текст или тезисы обращения..."
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#12161c] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500/50 resize-none leading-relaxed"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowComposeModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/[0.1] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.04]"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-medium transition-colors"
                >
                  Сохранить в Черновики
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
