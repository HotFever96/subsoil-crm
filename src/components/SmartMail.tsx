"use client";

import React, { useState } from "react";
import {
  Mail,
  CheckCircle2,
  Edit3,
  Send,
  RotateCw,
  Clock,
  ChevronRight,
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

  const filteredMails = mails.filter((m) => {
    if (filter === "ALL") return true;
    return m.status === filter;
  });

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0a0f18]">
      {/* Top Header */}
      <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between bg-[#0e1522]">
        <div>
          <h1 className="text-base font-semibold text-slate-100">
            Деловая переписка с госорганами
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Входящие предписания и подготовленные проекты ответов
          </p>
        </div>

        {/* Status filters */}
        <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setFilter("ALL")}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              filter === "ALL"
                ? "bg-slate-800 text-amber-300"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Все ({mails.length})
          </button>
          <button
            onClick={() => setFilter("PENDING_APPROVAL")}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              filter === "PENDING_APPROVAL"
                ? "bg-slate-800 text-amber-300"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            На утверждении ({mails.filter((m) => m.status === "PENDING_APPROVAL").length})
          </button>
          <button
            onClick={() => setFilter("APPROVED")}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              filter === "APPROVED"
                ? "bg-slate-800 text-amber-300"
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
        <div className="w-80 border-r border-slate-800/80 flex flex-col bg-[#0b111c] overflow-y-auto">
          <div className="divide-y divide-slate-800/60">
            {filteredMails.map((mail) => {
              const isSelected = mail.id === currentMail?.id;
              const isApproved = mail.status === "APPROVED";
              return (
                <div
                  key={mail.id}
                  onClick={() => handleSelectMail(mail)}
                  className={`p-4 cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-slate-800/60 border-l-2 border-amber-400"
                      : "hover:bg-slate-900/40 text-slate-300 border-l-2 border-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5 text-xs">
                    <span className="font-medium text-slate-300">
                      {mail.incoming_number}
                    </span>
                    {isApproved ? (
                      <span className="text-[11px] text-emerald-400 flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Утвержден</span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-amber-400 flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>До {mail.deadline}</span>
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-medium text-slate-100 mb-1 leading-snug line-clamp-1">
                    {mail.agency}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {mail.subject}
                  </p>

                  <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{mail.license_code}</span>
                    <span>{mail.date}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Dual Workspace */}
        {currentMail ? (
          <div className="flex-1 flex flex-col overflow-y-auto bg-[#0a0f18]">
            {/* Header info bar */}
            <div className="px-6 py-3.5 border-b border-slate-800/80 bg-[#0e1522] flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-100">
                  {currentMail.agency}
                </h2>
                <div className="flex items-center space-x-3 text-xs text-slate-400 mt-0.5">
                  <span>{currentMail.department}</span>
                  <span>•</span>
                  <span>Лицензия {currentMail.license_code}</span>
                  <span>•</span>
                  <span>Срок: {currentMail.deadline}</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center space-x-2">
                {currentMail.status !== "APPROVED" ? (
                  <>
                    <button
                      onClick={handleRegenerateReply}
                      disabled={isRegenerating}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors flex items-center space-x-1.5 disabled:opacity-50"
                    >
                      <RotateCw className={`w-3.5 h-3.5 ${isRegenerating ? "animate-spin" : ""}`} />
                      <span>Обновить</span>
                    </button>
                    {!isEditing ? (
                      <button
                        onClick={handleStartEdit}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors flex items-center space-x-1.5"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Править</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setIsEditing(false)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
                      >
                        Отмена
                      </button>
                    )}
                    <button
                      onClick={handleApprove}
                      className="px-4 py-1.5 rounded-lg text-xs font-medium bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors flex items-center space-x-1.5"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Утвердить</span>
                    </button>
                  </>
                ) : (
                  <span className="flex items-center space-x-1 text-xs text-emerald-400 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Ответ утвержден</span>
                  </span>
                )}
              </div>
            </div>

            {/* Split Content: Original Letter vs Legal Response */}
            <div className="flex-1 p-6 grid grid-cols-2 gap-6 items-start">
              {/* Box 1: Incoming Request */}
              <div className="space-y-3">
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Входящий запрос
                </div>

                <div className="p-5 rounded-xl bg-[#0e1522] border border-slate-800 space-y-4">
                  <div className="text-sm font-medium text-slate-200">
                    {currentMail.subject}
                  </div>

                  <div className="p-4 rounded-lg bg-[#0a0f18] border border-slate-800/80 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
                    {currentMail.incoming_content}
                  </div>

                  <div className="text-xs text-slate-400 leading-relaxed border-t border-slate-800/60 pt-3">
                    <span className="text-amber-400/90 font-medium mr-1.5">Правовая рекомендация:</span>
                    {currentMail.ai_draft?.recommended_action}
                  </div>
                </div>
              </div>

              {/* Box 2: Legal Response Draft */}
              <div className="space-y-3">
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Проект ответа
                </div>

                <div className="p-5 rounded-xl bg-[#0e1522] border border-slate-800 space-y-4">
                  {/* Normative tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {currentMail.ai_draft?.legal_basis.map((basis, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] px-2.5 py-1 rounded bg-slate-800/80 text-slate-300 border border-slate-700/60"
                      >
                        {basis}
                      </span>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-medium text-slate-300">
                      {currentMail.ai_draft?.title}
                    </div>

                    {isEditing ? (
                      <textarea
                        value={editedReply}
                        onChange={(e) => setEditedReply(e.target.value)}
                        rows={14}
                        className="w-full p-4 rounded-lg bg-[#0a0f18] border border-amber-500/40 text-xs text-slate-200 leading-relaxed focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
                      />
                    ) : (
                      <div className="p-4 rounded-lg bg-[#0a0f18] border border-slate-800/80 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap max-h-[460px] overflow-y-auto">
                        {editedReply || currentMail.ai_draft?.reply_body}
                      </div>
                    )}
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
