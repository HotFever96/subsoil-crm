"use client";

import React, { useState } from "react";
import {
  Mail,
  ShieldAlert,
  Clock,
  Sparkles,
  CheckCircle2,
  Edit3,
  Send,
  Building,
  Scale,
  FileText,
  AlertTriangle,
  RotateCw,
  FileCheck,
  ChevronRight,
  ExternalLink,
  Bot,
  UserCheck,
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
  const [filter, setFilter] = useState<"ALL" | "PENDING_APPROVAL" | "APPROVED">("ALL");

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
          customInstructions: "Сформулировать официальный аргументированный ответ со ссылкой на ст. 20 и 21 Закона «О недрах».",
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

  const filteredMails = mails.filter((m) => {
    if (filter === "ALL") return true;
    return m.status === filter;
  });

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-gradient-to-b from-[#0a1019] via-[#0d1421] to-[#111620]">
      {/* Top Header */}
      <div className="px-8 py-5 border-b border-[#b8860b]/15 flex items-center justify-between bg-[#0a1019]/70 backdrop-blur-md">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-semibold tracking-tight text-slate-100 flex items-center space-x-2">
              <span>Деловая переписка с госорганами</span>
              <span className="text-xs font-mono font-normal px-2 py-0.5 rounded-full bg-[#b8860b]/15 text-[#b8860b] border border-[#b8860b]/30">
                Human-in-the-Loop Mode
              </span>
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Мониторинг предписаний Роснедр, Росприроднадзора, Ростехнадзора с автоматической выработкой правовой позиции
          </p>
        </div>

        {/* Status filters */}
        <div className="flex items-center space-x-2 bg-[#111620] p-1 rounded-xl border border-[#b8860b]/20">
          <button
            onClick={() => setFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === "ALL"
                ? "bg-[#1c2738] text-amber-200 border border-[#b8860b]/30 shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Все ({mails.length})
          </button>
          <button
            onClick={() => setFilter("PENDING_APPROVAL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === "PENDING_APPROVAL"
                ? "bg-[#1c2738] text-amber-200 border border-[#b8860b]/30 shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            На утверждении ({mails.filter((m) => m.status === "PENDING_APPROVAL").length})
          </button>
          <button
            onClick={() => setFilter("APPROVED")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === "APPROVED"
                ? "bg-[#1c2738] text-amber-200 border border-[#b8860b]/30 shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Утвержденные ({mails.filter((m) => m.status === "APPROVED").length})
          </button>
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Incoming Mails List */}
        <div className="w-[420px] border-r border-[#b8860b]/15 flex flex-col bg-[#0a1019]/50 overflow-y-auto">
          <div className="p-4 border-b border-[#b8860b]/10 bg-[#0d1421]/60 flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>ВХОДЯЩИЕ ДЕПЕШИ</span>
            <span>{filteredMails.length} ДОКУМЕНТОВ</span>
          </div>

          <div className="divide-y divide-[#b8860b]/10">
            {filteredMails.map((mail) => {
              const isSelected = mail.id === currentMail?.id;
              const isApproved = mail.status === "APPROVED";
              return (
                <div
                  key={mail.id}
                  onClick={() => handleSelectMail(mail)}
                  className={`p-5 cursor-pointer transition-all duration-200 border-l-2 ${
                    isSelected
                      ? "bg-[#141c2b] border-[#b8860b] shadow-inner"
                      : "border-transparent hover:bg-[#111620]/60 text-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] font-mono text-[#b8860b] font-medium">
                        {mail.incoming_number}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {mail.date}
                      </span>
                    </div>
                    {isApproved ? (
                      <span className="flex items-center space-x-1 text-[10px] px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-700/40 font-mono">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>УТВЕРЖДЕНО</span>
                      </span>
                    ) : (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-mono border ${
                          mail.urgency === "CRITICAL"
                            ? "bg-rose-950/60 text-rose-300 border-rose-800/40"
                            : "bg-amber-950/60 text-amber-300 border-amber-800/40"
                        }`}
                      >
                        ДО {mail.deadline}
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-semibold text-slate-200 mb-1 leading-snug line-clamp-2">
                    {mail.agency}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                    {mail.subject}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-2 border-t border-[#b8860b]/10">
                    <span className="text-slate-400 flex items-center space-x-1">
                      <span>Лицензия:</span>
                      <span className="text-amber-200/90 font-medium">{mail.license_code}</span>
                    </span>
                    <span className="flex items-center space-x-1 text-[#b8860b]">
                      <Sparkles className="w-3 h-3" />
                      <span>{mail.ai_draft?.confidence_score}% ИИ готов</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Human-in-the-Loop Dual Workspace */}
        {currentMail ? (
          <div className="flex-1 flex flex-col overflow-y-auto bg-[#0c121d]">
            {/* Header info bar */}
            <div className="px-8 py-4 border-b border-[#b8860b]/15 bg-[#101724]/90 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-2.5 rounded-xl bg-[#161f30] border border-[#b8860b]/20 text-[#b8860b]">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-3">
                    <h2 className="text-base font-semibold text-slate-100">
                      {currentMail.agency}
                    </h2>
                    <span className="text-xs px-2 py-0.5 rounded bg-[#161e2c] text-slate-300 border border-[#b8860b]/20 font-mono">
                      {currentMail.department}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 text-xs text-slate-400 mt-0.5 font-mono">
                    <span>Входящий: {currentMail.incoming_number}</span>
                    <span>•</span>
                    <span>Лицензия: {currentMail.license_code}</span>
                    <span>•</span>
                    <span className="text-amber-300">Крайний срок: {currentMail.deadline}</span>
                  </div>
                </div>
              </div>

              {/* Action buttons (Approve / Edit / Send) */}
              <div className="flex items-center space-x-3">
                {currentMail.status !== "APPROVED" ? (
                  <>
                    <button
                      onClick={handleRegenerateReply}
                      disabled={isRegenerating}
                      className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-300 bg-[#161e2c] border border-[#b8860b]/25 hover:border-[#b8860b]/50 hover:text-slate-100 flex items-center space-x-2 transition-all disabled:opacity-50"
                    >
                      <RotateCw className={`w-3.5 h-3.5 text-[#b8860b] ${isRegenerating ? "animate-spin" : ""}`} />
                      <span>Перегенерировать</span>
                    </button>
                    {!isEditing ? (
                      <button
                        onClick={handleStartEdit}
                        className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-300 bg-[#161e2c] border border-[#b8860b]/25 hover:border-[#b8860b]/50 hover:text-slate-100 flex items-center space-x-2 transition-all"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-[#b8860b]" />
                        <span>Редактировать</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setIsEditing(false)}
                        className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-400 bg-slate-800/40 hover:text-slate-200 transition-all"
                      >
                        Отмена
                      </button>
                    )}
                    <button
                      onClick={handleApprove}
                      className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-[#b8860b] to-[#996515] text-slate-950 hover:from-[#d4af37] hover:to-[#b8860b] transition-all flex items-center space-x-2 shadow-lg shadow-[#b8860b]/20"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Утвердить ответ</span>
                    </button>
                  </>
                ) : (
                  <div className="flex items-center space-x-3">
                    <span className="flex items-center space-x-1.5 text-xs text-emerald-400 font-mono bg-emerald-950/60 px-3 py-1.5 rounded-lg border border-emerald-800/40">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Ответ завизирован ЭЦП</span>
                    </span>
                    <button
                      onClick={() => alert("Документ экспортирован в ЕСЭДО / СМЭВ с цифровой подписью")}
                      className="px-4 py-2 rounded-xl text-xs font-medium bg-[#161e2c] border border-[#b8860b]/40 text-amber-200 flex items-center space-x-2 hover:bg-[#1f2b3e]"
                    >
                      <Send className="w-3.5 h-3.5 text-[#b8860b]" />
                      <span>Отправить в ведомство</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Split Content: Original Letter vs AI Legal Response */}
            <div className="flex-1 p-8 grid grid-cols-2 gap-8 items-start">
              {/* Box 1: Official Incoming Request */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#b8860b]/15">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <span className="text-xs uppercase font-mono tracking-wider text-slate-300 font-semibold">
                      Входящий документ госоргана
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    Официальный запрос
                  </span>
                </div>

                <div className="p-6 rounded-2xl bg-[#0f1622] border border-[#b8860b]/20 shadow-xl space-y-4">
                  <div className="text-sm font-semibold text-slate-200 leading-snug">
                    {currentMail.subject}
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#0a1019] border border-slate-800/80 text-xs text-slate-300 font-serif leading-relaxed whitespace-pre-wrap">
                    {currentMail.incoming_content}
                  </div>

                  <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-900/30 flex items-start space-x-3">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-300/90 leading-relaxed">
                      <span className="font-semibold text-amber-200 block mb-0.5">
                        Анализ правовых рисков:
                      </span>
                      {currentMail.ai_draft?.recommended_action}
                    </div>
                  </div>
                </div>
              </div>

              {/* Box 2: AI Synthesized Legal Defense (Human-in-the-Loop) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#b8860b]/15">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-[#b8860b]" />
                    <span className="text-xs uppercase font-mono tracking-wider text-[#b8860b] font-semibold">
                      Правовой ответ ИИ (Human-in-the-Loop)
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 flex items-center space-x-1">
                    <Bot className="w-3.5 h-3.5 text-[#b8860b]" />
                    <span>Степень точности: {currentMail.ai_draft?.confidence_score}%</span>
                  </span>
                </div>

                <div className="p-6 rounded-2xl bg-[#0f1622] border border-[#b8860b]/30 shadow-2xl space-y-4 relative">
                  {/* Legal basis tags */}
                  <div>
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider font-mono block mb-2">
                      Примененные нормы и прецеденты:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {currentMail.ai_draft?.legal_basis.map((basis, idx) => (
                        <span
                          key={idx}
                          className="text-[11px] px-2.5 py-1 rounded-lg bg-[#161e2c] border border-[#b8860b]/20 text-slate-300 font-mono"
                        >
                          {basis}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Body Editor or Display */}
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-amber-300/90">
                      {currentMail.ai_draft?.title}
                    </div>

                    {isEditing ? (
                      <textarea
                        value={editedReply}
                        onChange={(e) => setEditedReply(e.target.value)}
                        rows={14}
                        className="w-full p-4 rounded-xl bg-[#0a1019] border border-[#b8860b]/50 text-xs text-slate-200 font-serif leading-relaxed focus:outline-none focus:ring-1 focus:ring-[#b8860b] resize-none"
                      />
                    ) : (
                      <div className="p-4 rounded-xl bg-[#0a1019] border border-[#b8860b]/20 text-xs text-slate-300 font-serif leading-relaxed whitespace-pre-wrap max-h-[460px] overflow-y-auto">
                        {editedReply || currentMail.ai_draft?.reply_body}
                      </div>
                    )}
                  </div>

                  {/* Signature block */}
                  <div className="pt-3 border-t border-[#b8860b]/15 flex items-center justify-between text-xs text-slate-400 font-mono">
                    <div className="flex items-center space-x-2">
                      <ShieldAlert className="w-3.5 h-3.5 text-[#b8860b]" />
                      <span>Статус валидации: {currentMail.status === "APPROVED" ? "Одобрено юристом" : "Требуется акцепт"}</span>
                    </div>
                    <span>ГОСТ Р ИСО 15489-1-2019</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
            Выберите письмо из списка
          </div>
        )}
      </div>
    </div>
  );
};
