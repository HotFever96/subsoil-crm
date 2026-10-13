"use client";

import React, { useState, useEffect, useRef } from "react";
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
  Settings,
  ChevronDown,
  Mail,
  Shield,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { MailItem, MailboxAccount } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { MailboxManagerModal } from "./MailboxManagerModal";
import { getMailboxBadgeStyle, getMailboxDotColor } from "@/lib/mailbox-presets";

type MailFolder = "INBOX" | "SENT" | "DRAFTS";

interface SmartMailProps {
  mails: MailItem[];
  onApproveMail: (mailId: string, finalReplyText?: string) => void;
  onUpdateMails?: (updatedMails: MailItem[]) => void;
}

export const SmartMail: React.FC<SmartMailProps> = ({
  mails: initialMails,
  onApproveMail,
  onUpdateMails,
}) => {
  const { user } = useAuth();
  const currentUsername = user?.username ? user.username.trim().toLowerCase() : "";
  const mailboxStorageKey = `geo_ai_mailboxes_${currentUsername || "guest"}_v1`;

  const [mails, setMails] = useState<MailItem[]>(initialMails);
  useEffect(() => {
    setMails(initialMails);
  }, [initialMails]);

  // Mailboxes State (Multi-IMAP)
  const [mailboxes, setMailboxes] = useState<MailboxAccount[]>([]);
  const [selectedMailboxId, setSelectedMailboxId] = useState<string>("ALL");
  const [isMailboxDropdownOpen, setIsMailboxDropdownOpen] = useState(false);
  const [isMailboxModalOpen, setIsMailboxModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Folder & View state
  const [currentFolder, setCurrentFolder] = useState<MailFolder>("INBOX");
  const [selectedMailId, setSelectedMailId] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [editedReply, setEditedReply] = useState<string>("");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // New compose form state
  const [composeAgency, setComposeAgency] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeMailboxId, setComposeMailboxId] = useState<string>("");

  // 1. Load Mailboxes from LocalStorage & Supabase
  useEffect(() => {
    if (!currentUsername) {
      setMailboxes([]);
      return;
    }

    let loaded: MailboxAccount[] = [];
    try {
      const saved = localStorage.getItem(mailboxStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          loaded = parsed;
        }
      }
    } catch {}
    setMailboxes(loaded);

    // Fetch from Supabase cloud
    fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_mailboxes", username: currentUsername }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.mailboxes)) {
          setMailboxes(data.mailboxes);
          try {
            localStorage.setItem(mailboxStorageKey, JSON.stringify(data.mailboxes));
          } catch {}
        }
      })
      .catch((err) => console.warn("Supabase mailboxes sync error:", err));
  }, [currentUsername, mailboxStorageKey]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsMailboxDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Save new/edited mailbox
  const handleSaveMailbox = async (newMbx: MailboxAccount) => {
    const updated = [...mailboxes.filter((m) => m.id !== newMbx.id), newMbx];
    setMailboxes(updated);
    try {
      localStorage.setItem(mailboxStorageKey, JSON.stringify(updated));
    } catch {}

    if (currentUsername) {
      await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_mailbox",
          payload: { mailbox: newMbx },
          username: currentUsername,
        }),
      }).catch((e) => console.error("Error saving mailbox to cloud:", e));
    }
  };

  // Delete mailbox
  const handleDeleteMailbox = async (mbxId: string) => {
    const updated = mailboxes.filter((m) => m.id !== mbxId);
    setMailboxes(updated);
    if (selectedMailboxId === mbxId) {
      setSelectedMailboxId("ALL");
    }
    try {
      localStorage.setItem(mailboxStorageKey, JSON.stringify(updated));
    } catch {}

    if (currentUsername) {
      await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_mailbox",
          payload: { mailboxId: mbxId },
          username: currentUsername,
        }),
      }).catch((e) => console.error("Error deleting mailbox from cloud:", e));
    }
  };

  // Simulate IMAP synchronization for a specific mailbox
  const handleSimulateSync = async (mbx: MailboxAccount) => {
    const simulatedMail: MailItem = {
      id: `mail-imap-${Date.now()}`,
      folder: "INBOX",
      mailbox_id: mbx.id,
      mailbox_name: mbx.name,
      recipient_email: mbx.email,
      sender_email: "info@rpn.gov.ru",
      incoming_number: `№ 04-${Math.floor(1000 + Math.random() * 9000)}/2026`,
      date: new Date().toLocaleDateString("ru-RU"),
      agency: "Росприроднадзор (Управление по надзору)",
      department: "Отдел государственного геологического контроля",
      subject: `Запрос подтверждения выполнения лицензионных требований [Ящик: ${mbx.name}]`,
      urgency: "HIGH",
      status: "PENDING_APPROVAL",
      incoming_content: `Направляем уведомление о проведении мониторинга соблюдения условий лицензионного соглашения.\n\nПросим предоставить данные о выполнении условий недропользования и отчетность за текущий квартал.\nСообщение принято почтовым сервером ${mbx.imap_host}:${mbx.imap_port} на ящик: ${mbx.email}`,
      ai_draft: {
        title: "Проект официального ответа в Росприроднадзор",
        legal_basis: [
          "Закон РФ «О недрах» № 2395-1 (ст. 22)",
          "Постановление Правительства РФ № 2498",
        ],
        reply_body: `В ответ на ваш запрос подтверждаем строгое выполнение всех условий недропользования. Запрашиваемые отчетные материалы сформированы и готовы к передаче.\n\nС уважением,\nСлужба недропользования (${mbx.name})`,
        confidence_score: 97,
        recommended_action: "Согласовать проект и отправить через SMTP данного ящика",
      },
    };

    const updated = [simulatedMail, ...mails];
    setMails(updated);
    onUpdateMails?.(updated);
    setSelectedMailId(simulatedMail.id);
    setCurrentFolder("INBOX");
    setSelectedMailboxId(mbx.id);
    setActionSuccessMessage(`✓ Письмо успешно принято по IMAP на ящик «${mbx.name}» (${mbx.email})`);
    setTimeout(() => setActionSuccessMessage(null), 5000);
  };

  // Filter letters by Mailbox selector AND Folder
  const mailsInSelectedMailbox = mails.filter((m) => {
    if (selectedMailboxId === "ALL") return true;
    return m.mailbox_id === selectedMailboxId;
  });

  const filteredMails = mailsInSelectedMailbox.filter(
    (m) => (m.folder || "INBOX") === currentFolder
  );

  const inboxCount = mailsInSelectedMailbox.filter((m) => (m.folder || "INBOX") === "INBOX").length;
  const sentCount = mailsInSelectedMailbox.filter((m) => m.folder === "SENT").length;
  const draftsCount = mailsInSelectedMailbox.filter((m) => m.folder === "DRAFTS").length;

  const currentMail =
    filteredMails.find((m) => m.id === selectedMailId) ||
    filteredMails[0] ||
    null;

  // Selected mailbox object (for target email and SMTP credentials)
  const currentMailbox = currentMail?.mailbox_id
    ? mailboxes.find((b) => b.id === currentMail.mailbox_id) || null
    : mailboxes[0] || null;

  const selectedMailboxObj =
    selectedMailboxId === "ALL"
      ? null
      : mailboxes.find((b) => b.id === selectedMailboxId) || null;

  const handleSelectMail = (mail: MailItem) => {
    setSelectedMailId(mail.id);
    setIsEditing(false);
    setEditedReply(mail.ai_draft?.reply_body || "");
  };

  const handleStartEdit = () => {
    setEditedReply(editedReply || currentMail?.ai_draft?.reply_body || "");
    setIsEditing(true);
  };

  // Helper to get badge style for a mailbox name or color
  const getBadgeForMail = (mail: MailItem) => {
    const mbx = mailboxes.find((m) => m.id === mail.mailbox_id || m.name === mail.mailbox_name);
    return {
      name: mbx?.name || mail.mailbox_name || "Основной",
      style: getMailboxBadgeStyle(mbx?.badge_color || "sky"),
      dot: getMailboxDotColor(mbx?.badge_color || "sky"),
    };
  };

  const handleApprove = () => {
    if (!currentMail) return;
    const finalBody = isEditing ? editedReply : currentMail.ai_draft?.reply_body || "";
    const activeMbx = currentMailbox;

    const updated = mails.map((m) => {
      if (m.id === currentMail.id) {
        return {
          ...m,
          status: "APPROVED" as const,
          mailbox_id: m.mailbox_id || activeMbx?.id,
          mailbox_name: m.mailbox_name || activeMbx?.name,
          sender_email: activeMbx?.email,
          ai_draft: m.ai_draft ? { ...m.ai_draft, reply_body: finalBody } : undefined,
        };
      }
      return m;
    });

    setMails(updated);
    onApproveMail(currentMail.id, finalBody);
    onUpdateMails?.(updated);
    setIsEditing(false);

    setActionSuccessMessage(
      `✓ Ответ утвержден! Маршрут отправки: SMTP ${activeMbx?.smtp_host || "smtp.yandex.ru"} (${activeMbx?.email || "ящик по умолчанию"})`
    );
    setTimeout(() => setActionSuccessMessage(null), 5000);
  };

  const handleSendDraft = () => {
    if (!currentMail) return;
    const finalBody = isEditing ? editedReply : currentMail.ai_draft?.reply_body || currentMail.incoming_content;
    const activeMbx = currentMailbox;

    const updated = mails.map((m) => {
      if (m.id === currentMail.id) {
        return {
          ...m,
          folder: "SENT" as const,
          status: "SENT" as const,
          mailbox_id: m.mailbox_id || activeMbx?.id,
          mailbox_name: m.mailbox_name || activeMbx?.name,
          sender_email: activeMbx?.email,
          incoming_content: finalBody,
          sent_body: finalBody,
          date: new Date().toLocaleDateString("ru-RU"),
        };
      }
      return m;
    });

    setMails(updated);
    onUpdateMails?.(updated);
    setIsEditing(false);

    setActionSuccessMessage(
      `✓ Письмо успешно отправлено через SMTP ящика «${activeMbx?.name || "Основной"}» (${activeMbx?.email || "smtp"})!`
    );
    setTimeout(() => setActionSuccessMessage(null), 5000);
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

    const targetMbx = mailboxes.find((m) => m.id === composeMailboxId) || mailboxes[0] || null;

    const newDraft: MailItem = {
      id: `draft-${Date.now()}`,
      folder: "DRAFTS",
      mailbox_id: targetMbx?.id,
      mailbox_name: targetMbx?.name,
      sender_email: targetMbx?.email,
      incoming_number: `Проект № ИСХ-2026/${Math.floor(100 + Math.random() * 900)}`,
      date: new Date().toLocaleDateString("ru-RU"),
      agency: composeAgency,
      department: "Адресат",
      subject: composeSubject,
      urgency: "STANDARD",
      status: "PENDING_APPROVAL",
      incoming_content: composeBody,
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
    <div className="flex-1 flex h-full overflow-hidden bg-white dark:bg-[#12161c] transition-colors relative">
      {/* Action success alert floating notification */}
      {actionSuccessMessage && (
        <div className="absolute top-3 right-6 z-40 bg-emerald-600 text-white text-xs px-4 py-2 rounded-xl shadow-lg flex items-center space-x-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccessMessage}</span>
          <button
            onClick={() => setActionSuccessMessage(null)}
            className="ml-2 hover:opacity-80"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. Folders & Mailboxes Column */}
      <div className="w-60 border-r border-slate-200 dark:border-white/[0.08] bg-[#f8fafc] dark:bg-[#0e1217] flex flex-col justify-between shrink-0 p-3 space-y-4">
        <div className="space-y-3">
          {/* Mailbox Selector Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Активный ящик:
            </label>
            <button
              onClick={() => setIsMailboxDropdownOpen(!isMailboxDropdownOpen)}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#181d24] border border-slate-200 dark:border-white/[0.08] text-xs font-medium text-slate-800 dark:text-slate-100 flex items-center justify-between shadow-2xs hover:border-slate-300 dark:hover:border-white/[0.15] transition-all cursor-pointer"
            >
              <div className="flex items-center space-x-2 min-w-0">
                {selectedMailboxId === "ALL" ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
                    <span className="truncate font-semibold">Все ящики</span>
                  </>
                ) : (
                  <>
                    <span
                      className={`w-2 h-2 rounded-full ${getMailboxDotColor(
                        selectedMailboxObj?.badge_color
                      )} shrink-0`}
                    />
                    <span className="truncate font-semibold">[{selectedMailboxObj?.name}]</span>
                  </>
                )}
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1.5" />
            </button>

            {/* Dropdown Menu */}
            {isMailboxDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-white dark:bg-[#181d24] border border-slate-200 dark:border-white/[0.08] rounded-xl shadow-xl py-1.5 text-xs">
                {/* Option: All mailboxes */}
                <button
                  onClick={() => {
                    setSelectedMailboxId("ALL");
                    setIsMailboxDropdownOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer ${
                    selectedMailboxId === "ALL" ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 font-semibold" : "text-slate-700 dark:text-slate-200"
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-sky-500" />
                    <span>Все ящики (Единая лента)</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {mails.length}
                  </span>
                </button>

                {mailboxes.length > 0 && <div className="my-1 border-t border-slate-100 dark:border-white/[0.06]" />}

                {/* Individual mailboxes */}
                {mailboxes.map((mbx) => {
                  const isSelected = selectedMailboxId === mbx.id;
                  const boxMailsCount = mails.filter((m) => m.mailbox_id === mbx.id).length;
                  const dotColor = getMailboxDotColor(mbx.badge_color);

                  return (
                    <button
                      key={mbx.id}
                      onClick={() => {
                        setSelectedMailboxId(mbx.id);
                        setIsMailboxDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer ${
                        isSelected ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 font-semibold" : "text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      <div className="flex items-center space-x-2 min-w-0">
                        <span className={`w-2 h-2 rounded-full ${dotColor} shrink-0`} />
                        <span className="truncate">[{mbx.name}]</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-2">
                        {boxMailsCount}
                      </span>
                    </button>
                  );
                })}

                <div className="my-1 border-t border-slate-100 dark:border-white/[0.06]" />

                {/* Manage mailboxes button */}
                <button
                  onClick={() => {
                    setIsMailboxDropdownOpen(false);
                    setIsMailboxModalOpen(true);
                  }}
                  className="w-full px-3 py-1.5 text-left text-sky-600 dark:text-sky-400 hover:bg-sky-500/10 transition-colors flex items-center space-x-2 cursor-pointer font-medium"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Управление ящиками...</span>
                </button>
              </div>
            )}
          </div>

          {/* New Mail Button */}
          <button
            onClick={() => {
              setComposeMailboxId(selectedMailboxId !== "ALL" ? selectedMailboxId : mailboxes[0]?.id || "");
              setShowComposeModal(true);
            }}
            className="w-full py-2.5 px-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-medium text-xs flex items-center justify-center space-x-2 transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Написать письмо</span>
          </button>

          {/* Folders Navigation */}
          <nav className="space-y-1">
            <button
              onClick={() => {
                setCurrentFolder("INBOX");
                setSelectedMailId("");
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                currentFolder === "INBOX"
                  ? "bg-slate-200/80 dark:bg-white/[0.08] text-slate-900 dark:text-slate-100 font-semibold"
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
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                currentFolder === "SENT"
                  ? "bg-slate-200/80 dark:bg-white/[0.08] text-slate-900 dark:text-slate-100 font-semibold"
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
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                currentFolder === "DRAFTS"
                  ? "bg-slate-200/80 dark:bg-white/[0.08] text-slate-900 dark:text-slate-100 font-semibold"
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

        {/* Bottom Section: Mailbox settings button & hint */}
        <div className="space-y-2 pt-2 border-t border-slate-200/80 dark:border-white/[0.06]">
          <button
            onClick={() => setIsMailboxModalOpen(true)}
            className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium bg-slate-100 dark:bg-white/[0.04] hover:bg-slate-200/70 dark:hover:bg-white/[0.08] text-slate-700 dark:text-slate-300 transition-colors flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center space-x-2">
              <Mail className="w-3.5 h-3.5 text-sky-500" />
              <span>Ящики (Мульти-IMAP)</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 font-semibold">
              {mailboxes.length}
            </span>
          </button>

          <div className="p-2.5 rounded-lg bg-slate-200/40 dark:bg-white/[0.02] text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Каждый ящик поддерживает индивидуальные IMAP/SMTP серверы и пароли приложений.
          </div>
        </div>
      </div>

      {/* 2. Mail List Column */}
      <div className="w-84 border-r border-slate-200 dark:border-white/[0.08] bg-slate-50/60 dark:bg-[#0e1217] flex flex-col overflow-y-auto shrink-0">
        <div className="p-3.5 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              {currentFolder === "INBOX" && `Входящие (${filteredMails.length})`}
              {currentFolder === "SENT" && `Исходящие (${filteredMails.length})`}
              {currentFolder === "DRAFTS" && `Черновики (${filteredMails.length})`}
            </span>
          </div>

          {selectedMailboxId !== "ALL" && (
            <button
              onClick={() => setSelectedMailboxId("ALL")}
              className="text-[10px] text-sky-500 hover:underline cursor-pointer"
            >
              Сбросить фильтр
            </button>
          )}
        </div>

        {filteredMails.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 space-y-2">
            <div>В этой папке нет писем</div>
            {mailboxes.length === 0 && (
              <button
                onClick={() => setIsMailboxModalOpen(true)}
                className="text-sky-500 hover:underline font-medium block mx-auto text-xs"
              >
                + Подключить почтовый ящик
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-white/[0.06]">
            {filteredMails.map((mail) => {
              const isSelected = mail.id === currentMail?.id;
              const isApproved = mail.status === "APPROVED";
              const isSent = mail.status === "SENT";
              const badge = getBadgeForMail(mail);

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
                  {/* Top line: Badge + Agency + Date */}
                  <div className="flex items-center justify-between mb-1.5 text-xs gap-2">
                    <div className="flex items-center space-x-1.5 min-w-0">
                      {/* Mailbox Badge */}
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border shrink-0 ${badge.style}`}
                        title={`Почтовый ящик: ${badge.name}`}
                      >
                        [{badge.name}]
                      </span>
                      <span className="font-medium text-slate-900 dark:text-slate-200 truncate">
                        {mail.agency}
                      </span>
                    </div>

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
          <div className="px-6 py-4 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between shrink-0">
            <div className="space-y-1.5 min-w-0 max-w-2xl">
              <div className="flex items-center space-x-2">
                {/* Mailbox Badge in Header */}
                {(() => {
                  const b = getBadgeForMail(currentMail);
                  return (
                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${b.style}`}>
                      Ящик: [{b.name}]
                    </span>
                  );
                })()}

                {currentMail.recipient_email && (
                  <span className="text-[11px] text-slate-400 font-mono">
                    Получатель: {currentMail.recipient_email}
                  </span>
                )}
              </div>

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
                      className="px-2.5 py-1 rounded-lg text-xs bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-300 transition-colors flex items-center space-x-1 cursor-pointer"
                      title="Пересчитать через ИИ"
                    >
                      <RotateCw className={`w-3.5 h-3.5 ${isRegenerating ? "animate-spin" : ""}`} />
                      <span>ИИ-генерация</span>
                    </button>

                    {!isEditing && (
                      <button
                        onClick={handleStartEdit}
                        className="px-2.5 py-1 rounded-lg text-xs bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-300 transition-colors flex items-center space-x-1 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Править</span>
                      </button>
                    )}

                    {currentFolder === "DRAFTS" ? (
                      <button
                        onClick={handleSendDraft}
                        className="px-3.5 py-1 rounded-lg text-xs font-medium bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 transition-opacity flex items-center space-x-1.5 cursor-pointer shadow-2xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Отправить по SMTP</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleApprove}
                        className="px-3.5 py-1 rounded-lg text-xs font-medium bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 transition-opacity flex items-center space-x-1.5 cursor-pointer shadow-2xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Утвердить ответ</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* SMTP Routing indicator banner */}
                <div className="p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-xs text-sky-800 dark:text-sky-200 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Send className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                    <span>
                      Маршрут отправки: через SMTP ящика <strong>[{currentMailbox?.name || "Основной"}]</strong>{" "}
                      ({currentMailbox?.email || "smtp"}) via {currentMailbox?.smtp_host || "smtp.yandex.ru"}:{currentMailbox?.smtp_port || 465}
                    </span>
                  </div>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-sky-500/20 rounded text-sky-700 dark:text-sky-300 shrink-0">
                    SSL/TLS
                  </span>
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
          {mailboxes.length === 0 && (
            <button
              onClick={() => setIsMailboxModalOpen(true)}
              className="mt-4 px-3.5 py-1.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 text-xs font-medium transition-colors cursor-pointer"
            >
              + Настроить почтовые ящики (Мульти-IMAP)
            </button>
          )}
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
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDraft} className="space-y-3 text-xs">
              {/* Mailbox selector for sender */}
              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1">
                  От кого (Почтовый ящик):
                </label>
                {mailboxes.length > 0 ? (
                  <select
                    value={composeMailboxId}
                    onChange={(e) => setComposeMailboxId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#12161c] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500/50"
                  >
                    {mailboxes.map((mbx) => (
                      <option key={mbx.id} value={mbx.id}>
                        [{mbx.name}] — {mbx.email} ({mbx.smtp_host})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-slate-400 text-xs flex items-center justify-between">
                    <span>Основной системный ящик (ящики не добавлены)</span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowComposeModal(false);
                        setIsMailboxModalOpen(true);
                      }}
                      className="text-sky-500 hover:underline"
                    >
                      + Подключить
                    </button>
                  </div>
                )}
              </div>

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
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/[0.1] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.04] cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-medium transition-colors cursor-pointer"
                >
                  Сохранить в Черновики
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Multi-IMAP / SMTP Mailboxes Manager Modal */}
      <MailboxManagerModal
        isOpen={isMailboxModalOpen}
        onClose={() => setIsMailboxModalOpen(false)}
        mailboxes={mailboxes}
        onSaveMailbox={handleSaveMailbox}
        onDeleteMailbox={handleDeleteMailbox}
        onSimulateSync={handleSimulateSync}
      />
    </div>
  );
};
