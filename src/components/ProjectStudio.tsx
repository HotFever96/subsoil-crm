"use client";

import React, { useState } from "react";
import {
  FolderGit2,
  ChevronDown,
  ChevronRight,
  Download,
  RotateCw,
} from "lucide-react";
import { ProjectCategory, ProjectSubSection, MiningProjectMetadata, SubAgentRole, SectionStatus } from "@/lib/project-types";
import { DEFAULT_MINING_PROJECT, INITIAL_PROJECT_CATEGORIES } from "@/lib/mock-project-tree";
import { SubAgentWorkspace } from "./SubAgentWorkspace";
import { exportProjectToDocx } from "@/lib/docx-export";

export const ProjectStudio: React.FC = () => {
  const [metadata, setMetadata] = useState<MiningProjectMetadata>(DEFAULT_MINING_PROJECT);
  const [categories, setCategories] = useState<ProjectCategory[]>(INITIAL_PROJECT_CATEGORIES);
  const [activeSubSectionId, setActiveSubSectionId] = useState<string>("sub-2-2");
  const [openCategoryIds, setOpenCategoryIds] = useState<string[]>(["cat-1", "cat-2", "cat-3", "cat-4", "cat-5"]);
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<SubAgentRole | "ALL">("ALL");
  const [isExporting, setIsExporting] = useState(false);
  const [viewMode, setViewMode] = useState<"INTERACTIVE" | "FULL_PREVIEW">("INTERACTIVE");

  const allSubsections = categories.flatMap((c) => c.subsections);
  const approvedCount = allSubsections.filter((s) => s.status === "APPROVED").length;
  const draftCount = allSubsections.filter((s) => s.status === "AI_DRAFT").length;
  const needsDataCount = allSubsections.filter((s) => s.status === "NEEDS_DATA").length;
  const progressPercent = Math.round((approvedCount / allSubsections.length) * 100);

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

  const getStatusDot = (status: SectionStatus) => {
    switch (status) {
      case "APPROVED":
        return <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" title="Утверждено" />;
      case "AI_DRAFT":
        return <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" title="Черновик" />;
      case "NEEDS_DATA":
        return <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" title="Требует данных" />;
    }
  };

  const getAgentLabel = (role: SubAgentRole) => {
    switch (role) {
      case "ENGINEER":
        return "Инженер";
      case "LEGAL":
        return "Юрист";
      case "ECOLOGIST":
        return "Эколог";
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0a0f18]">
      {/* Top Header & Project Passport Bar */}
      <div className="px-6 py-4 border-b border-slate-800/80 bg-[#0e1522] flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-sm font-semibold text-slate-100 truncate max-w-xl">
              {metadata.title}
            </h1>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
              {metadata.licenseCode}
            </span>
          </div>
          <div className="flex items-center space-x-3 text-xs text-slate-400 mt-1">
            <span>{metadata.holderCompany}</span>
            <span>•</span>
            <span>{metadata.depositName}</span>
            <span>•</span>
            <span>{metadata.annualCapacityThousandM3} тыс. м³/год</span>
          </div>
        </div>

        {/* Global Pipeline Metrics & Export Controls */}
        <div className="flex items-center space-x-3">
          {/* Progress Indicator */}
          <div className="flex items-center space-x-2 text-xs text-slate-300 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="text-slate-400">Готовность:</span>
            <span className="font-medium text-amber-300">{progressPercent}%</span>
            <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Toggle view mode */}
          <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setViewMode("INTERACTIVE")}
              className={`px-3 py-1 rounded-md transition-colors ${
                viewMode === "INTERACTIVE"
                  ? "bg-slate-800 text-amber-300 font-medium"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Чек-лист
            </button>
            <button
              onClick={() => setViewMode("FULL_PREVIEW")}
              className={`px-3 py-1 rounded-md transition-colors ${
                viewMode === "FULL_PREVIEW"
                  ? "bg-slate-800 text-amber-300 font-medium"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Сводный документ
            </button>
          </div>

          {/* Export Full Document Button */}
          <button
            onClick={handleFullDocxExport}
            disabled={isExporting}
            className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-medium text-xs flex items-center space-x-1.5 transition-colors disabled:opacity-50"
          >
            {isExporting ? (
              <RotateCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>Экспорт .DOCX</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Layout */}
      {viewMode === "INTERACTIVE" ? (
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Pipeline Tree */}
          <div className="w-80 border-r border-slate-800/80 bg-[#0b111c] flex flex-col justify-between overflow-hidden">
            {/* Header & Subagent Filters */}
            <div className="p-3.5 border-b border-slate-800/80 space-y-2.5">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="font-medium">Разделы проекта</span>
                <span className="text-[11px] text-slate-400">
                  {approvedCount} из {allSubsections.length} утверждено
                </span>
              </div>

              {/* Agent Filter Tabs */}
              <div className="flex items-center space-x-1 text-xs">
                {(["ALL", "ENGINEER", "LEGAL", "ECOLOGIST"] as const).map((agentKey) => (
                  <button
                    key={agentKey}
                    onClick={() => setSelectedAgentFilter(agentKey)}
                    className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                      selectedAgentFilter === agentKey
                        ? "bg-slate-800 text-amber-300 font-medium"
                        : "text-slate-400 hover:text-slate-200"
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
            </div>

            {/* Tree Navigation List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {categories.map((cat) => {
                const isOpen = openCategoryIds.includes(cat.id);
                const filteredSubs = cat.subsections.filter(
                  (s) => selectedAgentFilter === "ALL" || s.responsibleAgent === selectedAgentFilter
                );

                if (filteredSubs.length === 0 && selectedAgentFilter !== "ALL") {
                  return null;
                }

                return (
                  <div key={cat.id} className="rounded-lg bg-[#0e1522] border border-slate-800/80 overflow-hidden">
                    {/* Category Header */}
                    <div
                      onClick={() => toggleCategory(cat.id)}
                      className="px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        {isOpen ? (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                        )}
                        <span className="text-xs font-medium text-slate-200">
                          {cat.title}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {cat.subsections.filter((s) => s.status === "APPROVED").length}/{cat.subsections.length}
                      </span>
                    </div>

                    {/* Subsections */}
                    {isOpen && (
                      <div className="p-1 space-y-0.5 border-t border-slate-800/60">
                        {filteredSubs.map((sub) => {
                          const isSelected = sub.id === activeSubSection?.id;
                          return (
                            <div
                              key={sub.id}
                              onClick={() => setActiveSubSectionId(sub.id)}
                              className={`px-2.5 py-2 rounded-md cursor-pointer transition-colors flex items-center justify-between ${
                                isSelected
                                  ? "bg-slate-800 text-slate-100"
                                  : "hover:bg-slate-900/60 text-slate-400"
                              }`}
                            >
                              <div className="flex items-center space-x-2 min-w-0">
                                {getStatusDot(sub.status)}
                                <div className="text-xs truncate">
                                  <span className="mr-1 text-slate-400 font-mono text-[11px]">{sub.code}</span>
                                  <span>{sub.title}</span>
                                </div>
                              </div>
                              <span className="text-[10px] text-slate-500 shrink-0 ml-1.5">
                                {getAgentLabel(sub.responsibleAgent)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: SubAgent Workspace */}
          {activeSubSection ? (
            <SubAgentWorkspace
              subsection={activeSubSection}
              metadata={metadata}
              onUpdateSubSection={handleUpdateSubSection}
              onApproveSubSection={handleApproveSubSection}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
              Выберите подраздел проекта
            </div>
          )}
        </div>
      ) : (
        /* FULL PROJECT PREVIEW VIEW */
        <div className="flex-1 overflow-y-auto p-8 bg-[#0a0f18] flex justify-center">
          <div className="max-w-3xl w-full space-y-6 bg-[#0e1522] p-8 rounded-2xl border border-slate-800">
            {/* Title Page */}
            <div className="text-center space-y-2 pb-6 border-b border-slate-800">
              <h1 className="text-lg font-semibold text-slate-100">
                {metadata.title}
              </h1>
              <p className="text-xs text-slate-400">
                Лицензия {metadata.licenseCode} • {metadata.holderCompany} • {metadata.region}
              </p>
            </div>

            {/* All Sections Sequentially */}
            <div className="space-y-6">
              {categories.map((cat) => (
                <div key={cat.id} className="space-y-4">
                  <h2 className="text-sm font-semibold text-slate-200 border-b border-slate-800 pb-1.5">
                    {cat.code}: {cat.title}
                  </h2>

                  <div className="space-y-4">
                    {cat.subsections.map((sub) => (
                      <div key={sub.id} className="p-4 rounded-xl bg-[#0a0f18] border border-slate-800/80 space-y-2">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span className="font-medium text-slate-200">
                            {sub.code}. {sub.title}
                          </span>
                          <span className="text-[11px]">{sub.status === "APPROVED" ? "Утверждено" : "Черновик"}</span>
                        </div>
                        <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
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
