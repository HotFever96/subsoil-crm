"use client";

import React, { useState } from "react";
import {
  Download,
  Edit3,
  Copy,
  Check,
  RotateCw,
} from "lucide-react";
import { ProjectSubSection, MiningProjectMetadata } from "@/lib/project-types";
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

  React.useEffect(() => {
    setEditableContent(subsection.content);
    setIsEditingManually(false);
    setInstruction("");
  }, [subsection.id, subsection.content]);

  const agent = AGENT_PROFILES[subsection.responsibleAgent] || AGENT_PROFILES.ENGINEER;

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
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-[#12161c] overflow-hidden">
      {/* Subsection Header Bar */}
      <div className="px-6 py-3.5 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <span className="text-slate-400 font-mono">{subsection.code}</span>
            <span>{subsection.title}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {subsection.summary}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopy}
            className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-300 transition-colors flex items-center space-x-1"
            title="Копировать"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Скопировано" : "Копировать"}</span>
          </button>

          <button
            onClick={() => exportSingleSubSectionToDocx(subsection, metadata)}
            className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-300 transition-colors flex items-center space-x-1"
            title="Экспорт в DOCX"
          >
            <Download className="w-3.5 h-3.5" />
            <span>.DOCX</span>
          </button>

          {isEditingManually ? (
            <button
              onClick={handleSaveManualEdit}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 dark:bg-white text-white dark:text-slate-900 transition-colors"
            >
              Сохранить
            </button>
          ) : (
            <button
              onClick={() => setIsEditingManually(true)}
              className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-300 transition-colors flex items-center space-x-1"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Править</span>
            </button>
          )}

          {subsection.status !== "APPROVED" ? (
            <button
              onClick={() => onApproveSubSection(subsection.id)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 transition-colors"
            >
              Утвердить
            </button>
          ) : (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium px-2.5 py-1 rounded-lg bg-emerald-500/10">
              Утверждено
            </span>
          )}
        </div>
      </div>

      {/* Main Split: Left Document Workspace, Right Subagent Expert Panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Document Content View */}
        <div className="flex-1 flex flex-col overflow-y-auto p-6 bg-white dark:bg-[#12161c]">
          {isEditingManually ? (
            <textarea
              value={editableContent}
              onChange={(e) => setEditableContent(e.target.value)}
              rows={22}
              className="w-full flex-1 p-4 rounded-xl bg-slate-50 dark:bg-[#181d24] border border-slate-300 dark:border-white/[0.15] text-xs sm:text-sm text-slate-900 dark:text-slate-100 leading-relaxed focus:outline-none focus:border-sky-500 resize-none"
            />
          ) : (
            <div className="p-6 rounded-xl bg-slate-50 dark:bg-[#181d24] border border-slate-200/80 dark:border-white/[0.06] text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
              {editableContent}
            </div>
          )}
        </div>

        {/* Right Subagent Panel */}
        <div className="w-80 border-l border-slate-200 dark:border-white/[0.08] bg-slate-50/60 dark:bg-[#0e1217] flex flex-col justify-between overflow-y-auto shrink-0">
          <div className="p-5 border-b border-slate-200 dark:border-white/[0.08] space-y-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-500 text-xs font-semibold shrink-0">
                {subsection.responsibleAgent === "ENGINEER" ? "ГИ" : subsection.responsibleAgent === "LEGAL" ? "ЮР" : "ЭК"}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {agent.title}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {agent.badge}
                </div>
              </div>
            </div>

            {/* Agent Rationale Box */}
            <div className="p-3.5 rounded-lg bg-white dark:bg-[#181d24] border border-slate-200/80 dark:border-white/[0.06] space-y-1">
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Комментарий специалиста:
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {subsection.agentExplanation}
              </p>
            </div>

            {/* Normative Base Tags */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                Нормативная основа:
              </span>
              <div className="space-y-1">
                {subsection.normativeBase.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded bg-white dark:bg-[#181d24] border border-slate-200/80 dark:border-white/[0.06] text-[11px] text-slate-700 dark:text-slate-300 leading-snug"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Prompts & Task Input to Subagent */}
          <div className="p-4 bg-white dark:bg-[#181d24] border-t border-slate-200 dark:border-white/[0.08] space-y-2.5">
            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="Задание специалисту (например: скорректировать расчет уступов)..."
              rows={3}
              className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-[#12161c] border border-slate-200 dark:border-white/[0.1] text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-sky-500 resize-none"
            />
            <button
              onClick={() => handleExecutePrompt()}
              disabled={isProcessing || !instruction.trim()}
              className="w-full py-2 rounded-lg bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 font-medium text-xs flex items-center justify-center space-x-1.5 transition-colors disabled:opacity-40"
            >
              {isProcessing ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Расчет...</span>
                </>
              ) : (
                <span>Отправить правку</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
