"use client";

import React, { useState, useEffect } from "react";
import {
  Download,
  Edit3,
  Copy,
  Check,
  RotateCw,
  HelpCircle,
  Calculator,
  FileText,
  MessageSquare,
  Sparkles,
  ChevronRight,
  BookOpen,
  Send,
  AlertCircle,
  Sliders,
} from "lucide-react";
import { ProjectSubSection, MiningProjectMetadata, SectionStatus } from "@/lib/project-types";
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
  // Main state
  const [instruction, setInstruction] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEditingManually, setIsEditingManually] = useState(false);
  const [editableContent, setEditableContent] = useState(subsection.content);
  const [copied, setCopied] = useState(false);
  const [activeViewTab, setActiveViewTab] = useState<"DOCUMENT" | "QUESTIONNAIRE">("DOCUMENT");
  const [rightPanelTab, setRightPanelTab] = useState<"INTERVIEW" | "CHAT">("INTERVIEW");

  // User answers to the subagent's questionnaire
  const [answers, setAnswers] = useState<Record<string, string | number>>(() => {
    const initial: Record<string, string | number> = { ...(subsection.parameters || {}) };
    if (subsection.interviewQuestions) {
      subsection.interviewQuestions.forEach((q) => {
        if (initial[q.id] === undefined && q.defaultValue !== undefined) {
          initial[q.id] = q.defaultValue;
        }
      });
    }
    return initial;
  });

  useEffect(() => {
    setEditableContent(subsection.content);
    setIsEditingManually(false);
    setInstruction("");

    // Initialize answers from subsection or defaults
    const initial: Record<string, string | number> = { ...(subsection.parameters || {}) };
    if (subsection.interviewQuestions) {
      subsection.interviewQuestions.forEach((q) => {
        if (initial[q.id] === undefined && q.defaultValue !== undefined) {
          initial[q.id] = q.defaultValue;
        }
      });
    }
    setAnswers(initial);

    // If section needs data, default to questionnaire
    if (!subsection.content || subsection.status === "NEEDS_DATA") {
      setActiveViewTab("QUESTIONNAIRE");
    } else {
      setActiveViewTab("DOCUMENT");
    }
  }, [subsection.id, subsection.content, subsection.status]);

  const agent = AGENT_PROFILES[subsection.responsibleAgent] || AGENT_PROFILES.ENGINEER;

  const handleAnswerChange = (fieldId: string, value: string | number) => {
    setAnswers((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  const handleFillDefaults = () => {
    if (!subsection.interviewQuestions) return;
    const filled: Record<string, string | number> = {};
    subsection.interviewQuestions.forEach((q) => {
      filled[q.id] = q.defaultValue !== undefined ? q.defaultValue : "";
    });
    setAnswers(filled);
  };

  // Execute calculation & generation by subagent using questionnaire answers
  const handleCalculateAndGenerate = async (customPrompt?: string) => {
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
          instruction: customPrompt || instruction || "Произвести расчет раздела на основе предоставленных данных",
          parameters: answers,
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
          status: "AI_DRAFT" as SectionStatus,
          parameters: answers,
          revisionsCount: (subsection.revisionsCount || 0) + 1,
        };
        setEditableContent(data.content);
        onUpdateSubSection(updated);
        setInstruction("");
        setActiveViewTab("DOCUMENT");
      }
    } catch (e) {
      console.error("Agent execution error:", e);
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

  const getStatusBadge = () => {
    switch (subsection.status) {
      case "APPROVED":
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Утверждено</span>
          </span>
        );
      case "AI_DRAFT":
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Черновик на проверку</span>
          </span>
        );
      case "NEEDS_DATA":
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Ожидает исходных данных</span>
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-[#12161c] overflow-hidden">
      {/* Top Header Bar */}
      <div className="px-6 py-3.5 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between shrink-0 bg-[#f8fafc] dark:bg-[#0e1217]">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500 font-mono text-xs font-semibold shrink-0">
            {subsection.code}
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                {subsection.title}
              </h2>
              {getStatusBadge()}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
              {subsection.summary}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* View Mode Switcher: Document vs Questionnaire */}
          <div className="flex items-center bg-slate-200/70 dark:bg-white/[0.06] p-0.5 rounded-lg text-xs mr-1">
            <button
              onClick={() => setActiveViewTab("DOCUMENT")}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center space-x-1.5 ${
                activeViewTab === "DOCUMENT"
                  ? "bg-white dark:bg-[#181d24] text-slate-900 dark:text-slate-100 font-semibold shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Документ</span>
            </button>
            <button
              onClick={() => setActiveViewTab("QUESTIONNAIRE")}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center space-x-1.5 ${
                activeViewTab === "QUESTIONNAIRE"
                  ? "bg-white dark:bg-[#181d24] text-slate-900 dark:text-slate-100 font-semibold shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-sky-500" />
              <span>Опросник</span>
            </button>
          </div>

          <button
            onClick={handleCopy}
            disabled={!editableContent}
            className="px-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-[#181d24] hover:bg-slate-100 dark:hover:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 transition-colors flex items-center space-x-1 cursor-pointer disabled:opacity-40"
            title="Копировать текст"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? "Скопировано" : "Копировать"}</span>
          </button>

          <button
            onClick={() => exportSingleSubSectionToDocx(subsection, metadata)}
            disabled={!editableContent}
            className="px-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-[#181d24] hover:bg-slate-100 dark:hover:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 transition-colors flex items-center space-x-1 cursor-pointer disabled:opacity-40"
            title="Экспорт в DOCX"
          >
            <Download className="w-3.5 h-3.5" />
            <span>.DOCX</span>
          </button>

          {activeViewTab === "DOCUMENT" && (
            <>
              {isEditingManually ? (
                <button
                  onClick={handleSaveManualEdit}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 dark:bg-white text-white dark:text-slate-900 transition-colors cursor-pointer"
                >
                  Сохранить
                </button>
              ) : (
                <button
                  onClick={() => setIsEditingManually(true)}
                  disabled={!editableContent}
                  className="px-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-[#181d24] hover:bg-slate-100 dark:hover:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 transition-colors flex items-center space-x-1 cursor-pointer disabled:opacity-40"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Править</span>
                </button>
              )}
            </>
          )}

          {subsection.status !== "APPROVED" ? (
            <button
              onClick={() => onApproveSubSection(subsection.id)}
              disabled={!editableContent}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer shadow-2xs disabled:opacity-40"
            >
              Утвердить раздел
            </button>
          ) : (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              ✓ Утвержден
            </span>
          )}
        </div>
      </div>

      {/* Main Split: Left Content/Questionnaire, Right Subagent Expert Panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: DOCUMENT or QUESTIONNAIRE View */}
        <div className="flex-1 flex flex-col overflow-y-auto p-6 bg-white dark:bg-[#12161c]">
          {activeViewTab === "QUESTIONNAIRE" ? (
            /* SUB-AGENT INTERVIEWER / QUESTIONNAIRE INTERFACE */
            <div className="max-w-3xl mx-auto w-full space-y-6">
              {/* Agent Greeting Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-sky-500/[0.06] via-transparent to-blue-500/[0.04] border border-sky-500/20 shadow-2xs space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-500 font-semibold text-sm">
                    {subsection.responsibleAgent === "ENGINEER" ? "ГИ" : subsection.responsibleAgent === "LEGAL" ? "ЮР" : "ЭК"}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                      <span>{agent.title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 font-medium">
                        {agent.badge}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Режим инженерного интервьюера и формульных расчетов
                    </div>
                  </div>
                </div>

                <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-white/70 dark:bg-[#181d24]/70 p-3 rounded-xl border border-slate-200/60 dark:border-white/[0.06]">
                  {subsection.agentExplanation}
                </div>
              </div>

              {/* Questions List */}
              <div className="p-5 rounded-2xl bg-slate-50/70 dark:bg-[#181d24]/70 border border-slate-200/80 dark:border-white/[0.06] space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-white/[0.06] pb-3">
                  <div className="flex items-center space-x-2">
                    <Calculator className="w-4 h-4 text-sky-500" />
                    <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                      Опросный лист исходных данных ({subsection.interviewQuestions?.length || 0} вопросов)
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={handleFillDefaults}
                    className="text-xs text-sky-600 dark:text-sky-400 hover:underline flex items-center space-x-1 cursor-pointer font-medium"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Подставить типовые параметры</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 text-xs">
                  {subsection.interviewQuestions && subsection.interviewQuestions.length > 0 ? (
                    subsection.interviewQuestions.map((q, idx) => (
                      <div key={q.id} className="space-y-1.5">
                        <label className="block text-slate-700 dark:text-slate-300 font-medium flex items-center justify-between">
                          <span>
                            {idx + 1}. {q.label}
                          </span>
                          {q.unit && (
                            <span className="text-[11px] font-mono text-slate-400">
                              ед. изм.: [{q.unit}]
                            </span>
                          )}
                        </label>

                        <div className="relative">
                          <input
                            type="text"
                            value={answers[q.id] !== undefined ? String(answers[q.id]) : ""}
                            onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                            placeholder={q.placeholder || "Введите значение..."}
                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#12161c] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500/50 shadow-2xs"
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-400 text-xs py-4 text-center">
                      Для данного подраздела отсутствуют специальные вопросы. Введите примечание или нажмите «Рассчитать».
                    </div>
                  )}
                </div>

                {/* Calculate & Generate Button */}
                <div className="pt-4 border-t border-slate-200/60 dark:border-white/[0.06] flex items-center justify-between">
                  <div className="text-[11px] text-slate-400 flex items-center space-x-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>Расчет формируется по нормам ФНиП Ростехнадзора № 505 и ГОСТам РФ</span>
                  </div>

                  <button
                    onClick={() => handleCalculateAndGenerate()}
                    disabled={isProcessing}
                    className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-medium text-xs flex items-center space-x-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <RotateCw className="w-4 h-4 animate-spin" />
                        <span>Произвожу расчет по формулам...</span>
                      </>
                    ) : (
                      <>
                        <Calculator className="w-4 h-4" />
                        <span>Произвести расчет и составить раздел</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* DOCUMENT VIEW */
            <>
              {isEditingManually ? (
                <textarea
                  value={editableContent}
                  onChange={(e) => setEditableContent(e.target.value)}
                  rows={24}
                  className="w-full flex-1 p-4 rounded-xl bg-slate-50 dark:bg-[#181d24] border border-slate-300 dark:border-white/[0.15] text-xs sm:text-sm text-slate-900 dark:text-slate-100 leading-relaxed focus:outline-none focus:border-sky-500 resize-none font-mono"
                />
              ) : editableContent ? (
                <div className="p-6 rounded-xl bg-slate-50 dark:bg-[#181d24] border border-slate-200/80 dark:border-white/[0.06] text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {editableContent}
                </div>
              ) : (
                <div className="p-12 text-center rounded-2xl bg-slate-50/50 dark:bg-[#181d24]/50 border border-dashed border-slate-300 dark:border-white/[0.1] flex flex-col items-center justify-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center">
                    <Sliders className="w-6 h-6" />
                  </div>
                  <div className="max-w-md">
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      Раздел ожидает заполнения опросника
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Субагент не придумывает данные. Перейдите во вкладку «Опросник», укажите горнотехнические параметры и нажмите «Произвести расчет».
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveViewTab("QUESTIONNAIRE")}
                    className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-medium text-xs transition-colors shadow-2xs inline-flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Открыть опросник субагента</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right Subagent Expert Panel */}
        <div className="w-84 border-l border-slate-200 dark:border-white/[0.08] bg-slate-50/60 dark:bg-[#0e1217] flex flex-col justify-between overflow-y-auto shrink-0">
          <div className="p-4 space-y-4">
            {/* Expert Profile Card */}
            <div className="flex items-center space-x-2.5 p-3 rounded-xl bg-white dark:bg-[#181d24] border border-slate-200/80 dark:border-white/[0.06]">
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-500 text-xs font-semibold shrink-0">
                {subsection.responsibleAgent === "ENGINEER" ? "ГИ" : subsection.responsibleAgent === "LEGAL" ? "ЮР" : "ЭК"}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {agent.title}
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  {agent.badge}
                </div>
              </div>
            </div>

            {/* Subagent Explanation / Rationale */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-[#181d24] border border-slate-200/80 dark:border-white/[0.06] space-y-1.5">
              <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                <BookOpen className="w-3.5 h-3.5 text-sky-500" />
                <span>Обоснование субагента:</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {subsection.agentExplanation}
              </p>
            </div>

            {/* Normative Base Tags */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block">
                Нормативно-правовая база РФ:
              </span>
              <div className="space-y-1">
                {subsection.normativeBase.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-lg bg-white dark:bg-[#181d24] border border-slate-200/80 dark:border-white/[0.06] text-[11px] text-slate-700 dark:text-slate-300 leading-snug flex items-start space-x-1.5"
                  >
                    <span className="text-sky-500 mt-0.5">•</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Prompts & Dialogue with Subagent */}
          <div className="p-4 bg-white dark:bg-[#181d24] border-t border-slate-200 dark:border-white/[0.08] space-y-2.5 shrink-0">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1">
                <MessageSquare className="w-3.5 h-3.5 text-sky-500" />
                <span>Диалог и правки специалисту:</span>
              </span>
            </div>

            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="Укажите замечание (например: измени угол борта на 30° или пересчитай парк самосвалов)..."
              rows={3}
              className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-[#12161c] border border-slate-200 dark:border-white/[0.1] text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-sky-500 resize-none leading-relaxed"
            />

            <button
              onClick={() => handleCalculateAndGenerate(instruction)}
              disabled={isProcessing || !instruction.trim()}
              className="w-full py-2 rounded-lg bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 font-medium text-xs flex items-center justify-center space-x-1.5 transition-colors disabled:opacity-40 cursor-pointer shadow-2xs"
            >
              {isProcessing ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Пересчет...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Пересчитать с правкой</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
