"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Bot,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCw,
  Scale,
  Wrench,
  Leaf,
  FileCheck,
  Download,
  BookOpen,
  Edit3,
  Copy,
  Check,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { ProjectSubSection, MiningProjectMetadata, SubAgentRole } from "@/lib/project-types";
import { AGENT_PROFILES } from "@/lib/agent-profiles";
import { exportSingleSubSectionToDocx } from "@/lib/docx-export";

interface SubAgentWorkspaceProps {
  subsection: ProjectSubSection;
  metadata: MiningProjectMetadata;
  onUpdateSubSection: (updated: ProjectSubSection) => void;
  onApproveSubSection: (id: string) => void;
}

export const SubAgentWorkspace: React.FC<SubAgentWorkspaceProps> = ({
  subsection,
  metadata,
  onUpdateSubSection,
  onApproveSubSection,
}) => {
  const [instruction, setInstruction] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEditingManually, setIsEditingManually] = useState(false);
  const [editableContent, setEditableContent] = useState(subsection.content);
  const [copied, setCopied] = useState(false);

  // Sync content when active subsection changes
  React.useEffect(() => {
    setEditableContent(subsection.content);
    setIsEditingManually(false);
    setInstruction("");
  }, [subsection.id, subsection.content]);

  const agent = AGENT_PROFILES[subsection.responsibleAgent] || AGENT_PROFILES.ENGINEER;

  const getAgentIcon = (role: SubAgentRole) => {
    switch (role) {
      case "ENGINEER":
        return <Wrench className="w-4 h-4 text-amber-400" />;
      case "LEGAL":
        return <Scale className="w-4 h-4 text-blue-400" />;
      case "ECOLOGIST":
        return <Leaf className="w-4 h-4 text-emerald-400" />;
    }
  };

  const handleExecutePrompt = async (overridePrompt?: string) => {
    const promptToSend = overridePrompt || instruction;
    if (!promptToSend.trim() && !overridePrompt) return;

    setIsProcessing(true);
    try {
      const res = await fetch("/api/agent-execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: subsection.responsibleAgent,
          subSectionCode: subsection.code,
          subSectionTitle: subsection.title,
          currentContent: editableContent,
          instruction: promptToSend,
          projectMetadata: metadata,
        }),
      });

      const data = await res.json();
      if (data.content) {
        const updated: ProjectSubSection = {
          ...subsection,
          content: data.content,
          agentExplanation: data.explanation || subsection.agentExplanation,
          normativeBase: data.normativeBase || subsection.normativeBase,
          status: "AI_DRAFT",
          revisionsCount: (subsection.revisionsCount || 0) + 1,
        };
        setEditableContent(data.content);
        onUpdateSubSection(updated);
        setInstruction("");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveManualEdit = () => {
    const updated: ProjectSubSection = {
      ...subsection,
      content: editableContent,
      revisionsCount: (subsection.revisionsCount || 0) + 1,
    };
    onUpdateSubSection(updated);
    setIsEditingManually(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(editableContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a1019] overflow-hidden">
      {/* Subsection Header Bar */}
      <div className="px-8 py-4 border-b border-[#b8860b]/15 bg-[#0d1421]/90 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="font-mono text-sm font-bold text-[#b8860b] px-2.5 py-1 rounded bg-[#161e2c] border border-[#b8860b]/30">
              {subsection.code}
            </span>
            <div>
              <h2 className="text-base font-semibold text-slate-100 flex items-center space-x-2">
                <span>{subsection.title}</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                {subsection.summary}
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3">
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-lg text-xs font-mono bg-[#161e2c] border border-[#b8860b]/20 text-slate-300 hover:text-amber-200 flex items-center space-x-1.5"
            title="Копировать в буфер"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Скопировано" : "Копировать"}</span>
          </button>

          <button
            onClick={() => exportSingleSubSectionToDocx(subsection, metadata)}
            className="px-3 py-1.5 rounded-lg text-xs font-mono bg-[#161e2c] border border-[#b8860b]/20 text-slate-300 hover:text-amber-200 flex items-center space-x-1.5"
            title="Экспорт выписки подраздела в DOCX"
          >
            <Download className="w-3.5 h-3.5 text-[#b8860b]" />
            <span>.DOCX</span>
          </button>

          {isEditingManually ? (
            <button
              onClick={handleSaveManualEdit}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-600 text-slate-100 flex items-center space-x-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Сохранить правки</span>
            </button>
          ) : (
            <button
              onClick={() => setIsEditingManually(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-mono bg-[#161e2c] border border-[#b8860b]/20 text-slate-300 hover:text-amber-200 flex items-center space-x-1.5"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#b8860b]" />
              <span>Редактировать</span>
            </button>
          )}

          {subsection.status !== "APPROVED" ? (
            <button
              onClick={() => onApproveSubSection(subsection.id)}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-[#b8860b] to-[#996515] text-slate-950 hover:from-[#d4af37] hover:to-[#b8860b] transition-all flex items-center space-x-2 shadow-lg shadow-[#b8860b]/20"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Утвердить подраздел</span>
            </button>
          ) : (
            <div className="flex items-center space-x-1.5 text-xs text-emerald-400 font-mono bg-emerald-950/60 px-3 py-1.5 rounded-lg border border-emerald-800/40">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Утверждено ГИПом</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Split: Left Document Workspace, Right Subagent Expert Panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Document Content View */}
        <div className="flex-1 flex flex-col overflow-y-auto p-8 bg-[#0c121d]">
          {isEditingManually ? (
            <div className="flex-1 flex flex-col space-y-3">
              <div className="text-xs text-amber-300/80 font-mono">
                Режим прямого ручного редактирования текста и таблиц:
              </div>
              <textarea
                value={editableContent}
                onChange={(e) => setEditableContent(e.target.value)}
                rows={22}
                className="w-full flex-1 p-5 rounded-2xl bg-[#090e17] border border-[#b8860b]/40 text-xs sm:text-sm text-slate-200 font-serif leading-relaxed focus:outline-none focus:ring-1 focus:ring-[#b8860b] resize-none"
              />
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-[#0f1622] border border-[#b8860b]/25 shadow-2xl space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-[#b8860b]/15 text-xs font-mono text-slate-400">
                <span className="flex items-center space-x-2">
                  <span className="text-[#b8860b]">ГОСТ 21.101-2020</span>
                  <span>•</span>
                  <span>Версия редакции: #{subsection.revisionsCount || 1}</span>
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                    subsection.status === "APPROVED"
                      ? "bg-emerald-950/60 text-emerald-400 border-emerald-700/40"
                      : subsection.status === "AI_DRAFT"
                      ? "bg-amber-950/60 text-amber-300 border-amber-700/40"
                      : "bg-rose-950/60 text-rose-300 border-rose-700/40"
                  }`}
                >
                  {subsection.status === "APPROVED"
                    ? "🟢 УТВЕРЖДЕНО"
                    : subsection.status === "AI_DRAFT"
                    ? "🟡 ЧЕРНОВИК ИИ"
                    : "🔴 ТРЕБУЕТ ДАННЫХ"}
                </span>
              </div>

              {/* Rendered Document Text */}
              <div className="prose prose-invert max-w-none text-xs sm:text-sm text-slate-200 font-serif leading-relaxed whitespace-pre-wrap">
                {editableContent}
              </div>
            </div>
          )}
        </div>

        {/* Right Subagent Panel */}
        <div className="w-96 border-l border-[#b8860b]/15 bg-[#0a1019]/95 flex flex-col justify-between overflow-y-auto">
          {/* Agent Persona Bar */}
          <div className="p-6 border-b border-[#b8860b]/15 space-y-4">
            <div className="flex items-start space-x-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#161e2c] to-[#0a1019] border border-[#b8860b]/30 shadow-md">
                {getAgentIcon(subsection.responsibleAgent)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-100 truncate">
                    {agent.name}
                  </span>
                </div>
                <div className="text-[11px] text-[#b8860b] font-medium truncate">
                  {agent.title}
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  Ядро: Claude 3.5 Sonnet
                </div>
              </div>
            </div>

            {/* Agent Rationale Box */}
            <div className="p-3.5 rounded-xl bg-[#111620] border border-[#b8860b]/20 space-y-2">
              <div className="text-[11px] uppercase tracking-wider font-mono text-amber-300 flex items-center space-x-1.5">
                <Bot className="w-3.5 h-3.5" />
                <span>Обоснование субагента:</span>
              </div>
              <p className="text-xs text-slate-300 font-serif leading-relaxed">
                {subsection.agentExplanation}
              </p>
            </div>

            {/* Normative Base Tags */}
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase tracking-wider font-mono text-slate-400 block">
                Нормативно-правовая база раздела:
              </span>
              <div className="space-y-1">
                {subsection.normativeBase.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-lg bg-[#111620]/60 border border-[#b8860b]/15 text-[11px] text-slate-300 font-mono flex items-start space-x-1.5"
                  >
                    <BookOpen className="w-3 h-3 text-[#b8860b] shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Prompts & Task Input to Subagent */}
          <div className="p-6 bg-[#0d1421]/90 border-t border-[#b8860b]/15 space-y-3">
            <div className="text-[11px] uppercase tracking-wider font-mono text-slate-400">
              Быстрые правки субагенту:
            </div>
            <div className="space-y-1.5">
              {[
                "Пересчитать параметры с учетом углубления карьера до 20 м",
                "Усилить ссылки на Приказ Минприроды № 449/08 и ФНиП",
                "Добавить в расчет дополнительный резервный самосвал",
              ].map((qp, i) => (
                <button
                  key={i}
                  onClick={() => handleExecutePrompt(qp)}
                  disabled={isProcessing}
                  className="w-full text-left p-2 rounded-lg bg-[#111620] border border-[#b8860b]/15 hover:border-[#b8860b]/40 text-[11px] text-slate-300 hover:text-amber-200 transition-all truncate"
                >
                  ⚡ {qp}
                </button>
              ))}
            </div>

            {/* User instruction textarea */}
            <div className="space-y-2 pt-2">
              <textarea
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="Дайте задачу субагенту (например: «Перепиши расчет уступов с учетом глубины 20 метров»)..."
                rows={3}
                className="w-full p-3 rounded-xl bg-[#111620] border border-[#b8860b]/30 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#b8860b] resize-none"
              />
              <button
                onClick={() => handleExecutePrompt()}
                disabled={isProcessing || !instruction.trim()}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#b8860b] to-[#996515] text-slate-950 font-semibold text-xs flex items-center justify-center space-x-2 hover:from-[#d4af37] hover:to-[#b8860b] transition-all disabled:opacity-40 shadow-lg shadow-[#b8860b]/20"
              >
                {isProcessing ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Claude 3.5 Sonnet выполняет расчет...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Поставить задачу субагенту</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
