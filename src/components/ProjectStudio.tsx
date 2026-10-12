"use client";

import React, { useState } from "react";
import {
  FolderGit2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  Download,
  Filter,
  Wrench,
  Scale,
  Leaf,
  Layers,
  Sparkles,
  Printer,
  FileText,
  Building,
  RotateCw,
} from "lucide-react";
import { ProjectCategory, ProjectSubSection, MiningProjectMetadata, SubAgentRole, SectionStatus } from "@/lib/project-types";
import { DEFAULT_MINING_PROJECT, INITIAL_PROJECT_CATEGORIES } from "@/lib/mock-project-tree";
import { AGENT_PROFILES } from "@/lib/agent-profiles";
import { SubAgentWorkspace } from "./SubAgentWorkspace";
import { exportProjectToDocx } from "@/lib/docx-export";

export const ProjectStudio: React.FC = () => {
  const [metadata, setMetadata] = useState<MiningProjectMetadata>(DEFAULT_MINING_PROJECT);
  const [categories, setCategories] = useState<ProjectCategory[]>(INITIAL_PROJECT_CATEGORIES);
  const [activeSubSectionId, setActiveSubSectionId] = useState<string>("sub-2-2"); // Default to NEEDS_DATA sub
  const [openCategoryIds, setOpenCategoryIds] = useState<string[]>(["cat-1", "cat-2", "cat-3", "cat-4", "cat-5"]);
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<SubAgentRole | "ALL">("ALL");
  const [isExporting, setIsExporting] = useState(false);
  const [viewMode, setViewMode] = useState<"INTERACTIVE" | "FULL_PREVIEW">("INTERACTIVE");

  // Calculate overall stats
  const allSubsections = categories.flatMap((c) => c.subsections);
  const approvedCount = allSubsections.filter((s) => s.status === "APPROVED").length;
  const draftCount = allSubsections.filter((s) => s.status === "AI_DRAFT").length;
  const needsDataCount = allSubsections.filter((s) => s.status === "NEEDS_DATA").length;
  const progressPercent = Math.round((approvedCount / allSubsections.length) * 100);

  // Find currently active subsection
  const activeSubSection = allSubsections.find((s) => s.id === activeSubSectionId) || allSubsections[0];

  const toggleCategory = (catId: string) => {
    setOpenCategoryIds((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  const handleUpdateSubSection = (updated: ProjectSubSection) => {
    setCategories((prev) =>
      prev.map((cat) => ({
        ...cat,
        subsections: cat.subsections.map((sub) => (sub.id === updated.id ? updated : sub)),
      }))
    );
  };

  const handleApproveSubSection = (id: string) => {
    setCategories((prev) =>
      prev.map((cat) => ({
        ...cat,
        subsections: cat.subsections.map((sub) =>
          sub.id === id ? { ...sub, status: "APPROVED" as SectionStatus } : sub
        ),
      }))
    );
  };

  const handleBatchGeneratePending = async () => {
    // Generate AI drafts for all NEEDS_DATA subsections
    for (const sub of allSubsections.filter((s) => s.status === "NEEDS_DATA")) {
      try {
        const res = await fetch("/api/agent-execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: sub.responsibleAgent,
            subSectionCode: sub.code,
            subSectionTitle: sub.title,
            currentContent: sub.content,
            instruction: "Сформировать исчерпывающий первичный инженерный расчет и обоснование для прохождения экспертизы.",
            projectMetadata: metadata,
          }),
        });
        const data = await res.json();
        if (data.content) {
          handleUpdateSubSection({
            ...sub,
            content: data.content,
            agentExplanation: data.explanation || sub.agentExplanation,
            normativeBase: data.normativeBase || sub.normativeBase,
            status: "AI_DRAFT",
          });
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleFullDocxExport = async () => {
    setIsExporting(true);
    try {
      await exportProjectToDocx(metadata, categories);
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusIcon = (status: SectionStatus) => {
    switch (status) {
      case "APPROVED":
        return <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0 shadow-sm shadow-emerald-400/50" title="Утверждено" />;
      case "AI_DRAFT":
        return <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0 shadow-sm shadow-amber-400/50" title="Черновик ИИ" />;
      case "NEEDS_DATA":
        return <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0 shadow-sm shadow-rose-500/50" title="Требует данных" />;
    }
  };

  const getAgentBadge = (role: SubAgentRole) => {
    switch (role) {
      case "ENGINEER":
        return (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/50 text-amber-300 border border-amber-800/30 font-mono flex items-center space-x-1">
            <Wrench className="w-2.5 h-2.5" />
            <span>ГИП</span>
          </span>
        );
      case "LEGAL":
        return (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-950/50 text-blue-300 border border-blue-800/30 font-mono flex items-center space-x-1">
            <Scale className="w-2.5 h-2.5" />
            <span>Юрист</span>
          </span>
        );
      case "ECOLOGIST":
        return (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/50 text-emerald-300 border border-emerald-800/30 font-mono flex items-center space-x-1">
            <Leaf className="w-2.5 h-2.5" />
            <span>Эколог</span>
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-gradient-to-b from-[#0a1019] via-[#0d1421] to-[#111620]">
      {/* Top Header & Project Passport Bar */}
      <div className="px-8 py-4 border-b border-[#b8860b]/15 bg-[#0a1019]/80 backdrop-blur-md flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-[#161e2c] border border-[#b8860b]/30 text-[#b8860b]">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-base sm:text-lg font-semibold tracking-tight text-slate-100 truncate max-w-xl">
                  {metadata.title}
                </h1>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#b8860b]/15 text-amber-300 border border-[#b8860b]/30">
                  {metadata.licenseCode}
                </span>
              </div>
              <div className="flex items-center space-x-4 text-xs text-slate-400 mt-0.5 font-mono">
                <span>{metadata.holderCompany}</span>
                <span>•</span>
                <span>ОПИ: {metadata.depositName}</span>
                <span>•</span>
                <span className="text-[#b8860b]">Мощность: {metadata.annualCapacityThousandM3} тыс. м³/год</span>
              </div>
            </div>
          </div>
        </div>

        {/* Global Pipeline Metrics & Export Controls */}
        <div className="flex items-center space-x-4">
          {/* Progress Indicator */}
          <div className="bg-[#111620] px-4 py-2 rounded-xl border border-[#b8860b]/20 flex items-center space-x-3">
            <div>
              <div className="flex items-center space-x-2 text-xs font-mono justify-between">
                <span className="text-slate-400">Готовность ТПР:</span>
                <span className="text-amber-200 font-bold">{progressPercent}%</span>
              </div>
              <div className="w-32 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
                <div
                  className="h-full bg-gradient-to-r from-[#b8860b] to-emerald-400 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Toggle view mode */}
          <div className="flex items-center bg-[#111620] p-1 rounded-xl border border-[#b8860b]/20 text-xs">
            <button
              onClick={() => setViewMode("INTERACTIVE")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === "INTERACTIVE"
                  ? "bg-[#1c2738] text-amber-200 border border-[#b8860b]/30 shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Интерактивный мастер
            </button>
            <button
              onClick={() => setViewMode("FULL_PREVIEW")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === "FULL_PREVIEW"
                  ? "bg-[#1c2738] text-amber-200 border border-[#b8860b]/30 shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Сводный том проекта
            </button>
          </div>

          {/* Export Full Document Button */}
          <button
            onClick={handleFullDocxExport}
            disabled={isExporting}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#b8860b] to-[#996515] text-slate-950 font-bold text-xs flex items-center space-x-2 hover:from-[#d4af37] hover:to-[#b8860b] shadow-lg shadow-[#b8860b]/20 transition-all disabled:opacity-50"
          >
            {isExporting ? (
              <RotateCw className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>Экспорт тома .DOCX</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Layout */}
      {viewMode === "INTERACTIVE" ? (
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Pipeline Tree & Checkboxes (ГОСТ Tree) */}
          <div className="w-[380px] border-r border-[#b8860b]/15 bg-[#0a1019]/80 flex flex-col justify-between overflow-hidden">
            {/* Header & Subagent Filters */}
            <div className="p-4 border-b border-[#b8860b]/15 space-y-3 bg-[#0d1421]/60">
              <div className="flex items-center justify-between text-xs text-slate-300 font-mono">
                <span className="uppercase tracking-wider font-semibold">Дерево разделов проекта</span>
                <span className="text-[11px] text-slate-400">
                  {approvedCount}/{allSubsections.length} утв.
                </span>
              </div>

              {/* Agent Filter Tabs */}
              <div className="flex items-center space-x-1 overflow-x-auto text-xs">
                {(["ALL", "ENGINEER", "LEGAL", "ECOLOGIST"] as const).map((agentKey) => (
                  <button
                    key={agentKey}
                    onClick={() => setSelectedAgentFilter(agentKey)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all ${
                      selectedAgentFilter === agentKey
                        ? "bg-[#182335] text-amber-200 border border-[#b8860b]/40"
                        : "text-slate-400 hover:text-slate-200 bg-[#111620]/40"
                    }`}
                  >
                    {agentKey === "ALL"
                      ? "Все"
                      : agentKey === "ENGINEER"
                      ? "Инженер"
                      : agentKey === "LEGAL"
                      ? "Юрист"
                      : "Эколог"}
                  </button>
                ))}
              </div>

              {/* Legend Bar */}
              <div className="flex items-center justify-between pt-1 text-[10px] font-mono text-slate-400 border-t border-[#b8860b]/10">
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Утверждено ({approvedCount})</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>Черновик ({draftCount})</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>Данные ({needsDataCount})</span>
                </span>
              </div>
            </div>

            {/* Tree Navigation List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {categories.map((cat) => {
                const isOpen = openCategoryIds.includes(cat.id);
                const filteredSubs = cat.subsections.filter(
                  (s) => selectedAgentFilter === "ALL" || s.responsibleAgent === selectedAgentFilter
                );

                if (filteredSubs.length === 0 && selectedAgentFilter !== "ALL") {
                  return null;
                }

                return (
                  <div key={cat.id} className="rounded-xl bg-[#0f1622]/50 border border-[#b8860b]/15 overflow-hidden">
                    {/* Category Header */}
                    <div
                      onClick={() => toggleCategory(cat.id)}
                      className="px-3.5 py-2.5 bg-[#111824]/80 flex items-center justify-between cursor-pointer hover:bg-[#162133] transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        {isOpen ? (
                          <ChevronDown className="w-3.5 h-3.5 text-[#b8860b]" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        <span className="text-xs font-semibold text-slate-200">
                          {cat.code}: {cat.title}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">
                        {cat.subsections.filter((s) => s.status === "APPROVED").length}/{cat.subsections.length}
                      </span>
                    </div>

                    {/* Subsections */}
                    {isOpen && (
                      <div className="p-1 space-y-1">
                        {filteredSubs.map((sub) => {
                          const isSelected = sub.id === activeSubSection?.id;
                          return (
                            <div
                              key={sub.id}
                              onClick={() => setActiveSubSectionId(sub.id)}
                              className={`px-3 py-2.5 rounded-lg cursor-pointer transition-all flex items-center justify-between border ${
                                isSelected
                                  ? "bg-[#182335] border-[#b8860b]/50 shadow-inner"
                                  : "border-transparent hover:bg-[#111620]/60 hover:border-[#b8860b]/15"
                              }`}
                            >
                              <div className="flex items-center space-x-2.5 min-w-0">
                                {getStatusIcon(sub.status)}
                                <div className="min-w-0">
                                  <div className="flex items-center space-x-1.5">
                                    <span className="font-mono text-[11px] font-bold text-[#b8860b]">
                                      {sub.code}
                                    </span>
                                    <span
                                      className={`text-xs truncate ${
                                        isSelected ? "text-slate-100 font-semibold" : "text-slate-300"
                                      }`}
                                    >
                                      {sub.title}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="shrink-0 ml-2">
                                {getAgentBadge(sub.responsibleAgent)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom Quick Trigger */}
            <div className="p-3 border-t border-[#b8860b]/15 bg-[#0a1019]">
              <button
                onClick={handleBatchGeneratePending}
                className="w-full py-2 rounded-xl bg-[#161e2c] border border-[#b8860b]/30 text-amber-200 hover:border-[#b8860b]/60 text-xs font-mono flex items-center justify-center space-x-2 transition-all shadow"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#b8860b]" />
                <span>Автозапуск всех черновиков ИИ</span>
              </button>
            </div>
          </div>

          {/* Right Column: Interactive SubAgent Workspace */}
          {activeSubSection ? (
            <SubAgentWorkspace
              subsection={activeSubSection}
              metadata={metadata}
              onUpdateSubSection={handleUpdateSubSection}
              onApproveSubSection={handleApproveSubSection}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
              Выберите подраздел проекта в дереве
            </div>
          )}
        </div>
      ) : (
        /* FULL PROJECT PREVIEW VIEW */
        <div className="flex-1 overflow-y-auto p-12 bg-[#090e17] flex justify-center">
          <div className="max-w-4xl w-full space-y-8 bg-[#0f1622] p-12 rounded-3xl border border-[#b8860b]/30 shadow-2xl">
            {/* Title Page */}
            <div className="text-center space-y-4 pb-12 border-b border-[#b8860b]/20">
              <p className="text-xs font-mono uppercase tracking-widest text-[#b8860b]">
                МИНИСТЕРСТВО ПРИРОДНЫХ РЕСУРСОВ И ЭКОЛОГИИ РОССИЙСКОЙ ФЕДЕРАЦИИ
              </p>
              <p className="text-xs font-mono uppercase text-slate-400">
                НЕДРОПОЛЬЗОВАТЕЛЬ: {metadata.holderCompany}
              </p>
              <h1 className="text-2xl font-bold text-slate-100 uppercase tracking-tight py-4">
                {metadata.title}
              </h1>
              <p className="text-sm font-mono text-amber-300">
                Лицензия на право пользования недрами: {metadata.licenseCode}
              </p>
              <p className="text-xs text-slate-400 font-mono">
                {metadata.region} • 2026 год
              </p>
            </div>

            {/* Passport Table */}
            <div className="p-6 rounded-2xl bg-[#0a1019] border border-[#b8860b]/20 space-y-3">
              <h3 className="text-xs font-mono uppercase tracking-wider text-amber-300 font-bold">
                Сводные показатели технического проекта:
              </h3>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="flex justify-between border-b border-slate-800 pb-1 text-slate-300">
                  <span className="text-slate-500">Полезное ископаемое:</span>
                  <span>{metadata.mineralType}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-1 text-slate-300">
                  <span className="text-slate-500">Площадь горного отвода:</span>
                  <span>{metadata.subsoilPlotAreaHa} га</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-1 text-slate-300">
                  <span className="text-slate-500">Годовая проектная мощность:</span>
                  <span>{metadata.annualCapacityThousandM3} тыс. м³/год</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-1 text-slate-300">
                  <span className="text-slate-500">Глубина карьера:</span>
                  <span>{metadata.quarryDepthM} м</span>
                </div>
              </div>
            </div>

            {/* All Sections Sequentially */}
            <div className="space-y-10">
              {categories.map((cat) => (
                <div key={cat.id} className="space-y-6">
                  <h2 className="text-lg font-bold text-slate-100 uppercase tracking-wide border-b border-[#b8860b]/30 pb-2 flex items-center justify-between">
                    <span>
                      {cat.code}: {cat.title}
                    </span>
                  </h2>

                  <div className="space-y-6">
                    {cat.subsections.map((sub) => (
                      <div key={sub.id} className="p-6 rounded-2xl bg-[#0c121d] border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                          <span className="font-bold text-amber-300">
                            Подраздел {sub.code}: {sub.title}
                          </span>
                          <span>{sub.status === "APPROVED" ? "🟢 Утверждено" : "🟡 Черновик"}</span>
                        </div>
                        <div className="prose prose-invert max-w-none text-xs sm:text-sm text-slate-300 font-serif leading-relaxed whitespace-pre-wrap">
                          {sub.content}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
