"use client";

import React, { useState } from "react";
import {
  Download,
  RotateCw,
  ChevronDown,
  ChevronRight,
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
  const [isExporting, setIsExporting] = useState(false);
  const [viewMode, setViewMode] = useState<"INTERACTIVE" | "FULL_PREVIEW">("INTERACTIVE");

  const allSubsections = categories.flatMap((c) => c.subsections);
  const approvedCount = allSubsections.filter((s) => s.status === "APPROVED").length;
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

  const getStatusIndicator = (status: SectionStatus) => {
    switch (status) {
      case "APPROVED":
        return <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Утверждено" />;
      case "AI_DRAFT":
        return <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" title="Черновик ИИ" />;
      case "NEEDS_DATA":
        return <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" title="Требует данных" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-[#12161c] transition-colors">
      {/* Top Header */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between">
        <div>
          <h1 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate max-w-xl">
            {metadata.title}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {metadata.depositName} • {metadata.licenseCode} • {metadata.holderCompany}
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex items-center space-x-3">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Готовность: <span className="font-semibold text-slate-900 dark:text-slate-100">{progressPercent}%</span>
          </div>

          <div className="flex items-center bg-slate-100 dark:bg-white/[0.06] p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setViewMode("INTERACTIVE")}
              className={`px-3 py-1 rounded-md transition-colors ${
                viewMode === "INTERACTIVE"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Чек-лист
            </button>
            <button
              onClick={() => setViewMode("FULL_PREVIEW")}
              className={`px-3 py-1 rounded-md transition-colors ${
                viewMode === "FULL_PREVIEW"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Сводный том
            </button>
          </div>

          <button
            onClick={handleFullDocxExport}
            disabled={isExporting}
            className="px-3.5 py-1.5 rounded-lg bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium flex items-center space-x-1.5 transition-colors disabled:opacity-50"
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
          {/* Left Column: Clean ГОСТ Check-list */}
          <div className="w-80 border-r border-slate-200 dark:border-white/[0.08] bg-slate-50/60 dark:bg-[#0e1217] flex flex-col justify-between overflow-y-auto shrink-0">
            <div className="p-3 space-y-1.5">
              {categories.map((cat) => {
                const isOpen = openCategoryIds.includes(cat.id);
                return (
                  <div key={cat.id} className="rounded-lg bg-white dark:bg-[#181d24] border border-slate-200/80 dark:border-white/[0.06] overflow-hidden">
                    <button
                      onClick={() => toggleCategory(cat.id)}
                      className="w-full text-left px-3 py-2 flex items-center justify-between text-xs font-medium text-slate-900 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-center space-x-2 truncate">
                        {isOpen ? (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        )}
                        <span className="truncate">{cat.title}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 ml-2 shrink-0">
                        {cat.subsections.filter((s) => s.status === "APPROVED").length}/{cat.subsections.length}
                      </span>
                    </button>

                    {isOpen && (
                      <div className="px-1.5 pb-1.5 space-y-0.5 border-t border-slate-100 dark:border-white/[0.04]">
                        {cat.subsections.map((sub) => {
                          const isSelected = sub.id === activeSubSection?.id;
                          return (
                            <button
                              key={sub.id}
                              onClick={() => setActiveSubSectionId(sub.id)}
                              className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors flex items-center space-x-2.5 ${
                                isSelected
                                  ? "bg-slate-100 dark:bg-white/[0.08] text-slate-900 dark:text-white font-medium"
                                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                              }`}
                            >
                              {getStatusIndicator(sub.status)}
                              <span className="truncate">
                                <span className="font-mono text-slate-400 mr-1 text-[11px]">{sub.code}</span>
                                {sub.title}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Clean Workspace */}
          {activeSubSection ? (
            <SubAgentWorkspace
              subsection={activeSubSection}
              metadata={metadata}
              onUpdateSubSection={handleUpdateSubSection}
              onApproveSubSection={handleApproveSubSection}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
              Выберите подраздел
            </div>
          )}
        </div>
      ) : (
        /* FULL PREVIEW */
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50 dark:bg-[#0e1217] flex justify-center">
          <div className="max-w-3xl w-full space-y-6 bg-white dark:bg-[#181d24] p-8 rounded-2xl border border-slate-200 dark:border-white/[0.08]">
            <div className="text-center space-y-2 pb-6 border-b border-slate-200 dark:border-white/[0.08]">
              <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {metadata.title}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Лицензия {metadata.licenseCode} • {metadata.holderCompany}
              </p>
            </div>

            <div className="space-y-6">
              {categories.map((cat) => (
                <div key={cat.id} className="space-y-4">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-200 border-b border-slate-200 dark:border-white/[0.08] pb-1.5">
                    {cat.code}: {cat.title}
                  </h2>

                  <div className="space-y-4">
                    {cat.subsections.map((sub) => (
                      <div key={sub.id} className="p-4 rounded-xl bg-slate-50 dark:bg-[#12161c] border border-slate-200/80 dark:border-white/[0.06] space-y-2">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span className="font-medium text-slate-900 dark:text-slate-200">
                            {sub.code}. {sub.title}
                          </span>
                          <span className="text-[11px]">{sub.status === "APPROVED" ? "Утверждено" : "Черновик"}</span>
                        </div>
                        <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
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
