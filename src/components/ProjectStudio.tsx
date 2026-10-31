"use client";

import React, { useState, useEffect } from "react";
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
import { useAuth } from "@/lib/auth-context";

export const ProjectStudio: React.FC = () => {
  const { user } = useAuth();
  const currentUsername = user?.username ? user.username.trim().toLowerCase() : "";
  const storageKey = `geo_ai_project_categories_${currentUsername || "guest"}_v3`;

  const [metadata, setMetadata] = useState<MiningProjectMetadata>(DEFAULT_MINING_PROJECT);
  const [categories, setCategories] = useState<ProjectCategory[]>(INITIAL_PROJECT_CATEGORIES);
  const [activeSubSectionId, setActiveSubSectionId] = useState<string>("sub-1-1");
  const [openCategoryIds, setOpenCategoryIds] = useState<string[]>([
    "cat-1",
    "cat-2",
    "cat-3",
    "cat-4",
    "cat-5",
    "cat-6",
  ]);
  const [isExporting, setIsExporting] = useState(false);
  const [viewMode, setViewMode] = useState<"INTERACTIVE" | "FULL_PREVIEW">("INTERACTIVE");

  // Load user-saved categories or initial clean tree
  useEffect(() => {
    if (!currentUsername) {
      setCategories(INITIAL_PROJECT_CATEGORIES);
      return;
    }
    try {
      localStorage.removeItem(`geo_ai_project_categories_${currentUsername}_v1`);
      localStorage.removeItem(`geo_ai_project_categories_${currentUsername}_v2`);
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === INITIAL_PROJECT_CATEGORIES.length) {
          setCategories(parsed);
          return;
        }
      }
    } catch {}
    setCategories(INITIAL_PROJECT_CATEGORIES);

    const handleRemoteProjectUpdate = () => {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length === INITIAL_PROJECT_CATEGORIES.length) {
            setCategories(parsed);
          }
        }
      } catch {}
    };

    window.addEventListener("geo_ai_project_updated", handleRemoteProjectUpdate);
    return () => {
      window.removeEventListener("geo_ai_project_updated", handleRemoteProjectUpdate);
    };
  }, [currentUsername, storageKey]);

  const saveCategories = (newCategories: ProjectCategory[]) => {
    setCategories(newCategories);
    if (currentUsername) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(newCategories));
      } catch {}
    }
  };

  const allSubsections = categories.flatMap((c) => c.subsections);
  const approvedCount = allSubsections.filter((s) => s.status === "APPROVED").length;
  const progressPercent = allSubsections.length > 0 ? Math.round((approvedCount / allSubsections.length) * 100) : 0;

  const activeSubSection = allSubsections.find((s) => s.id === activeSubSectionId) || allSubsections[0];

  const toggleCategory = (catId: string) => {
    setOpenCategoryIds((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  const handleUpdateSubSection = (updated: ProjectSubSection) => {
    const updatedCategories = categories.map((cat) => ({
      ...cat,
      subsections: cat.subsections.map((sub) => (sub.id === updated.id ? updated : sub)),
    }));
    saveCategories(updatedCategories);
  };

  const handleApproveSubSection = (id: string) => {
    const updatedCategories = categories.map((cat) => ({
      ...cat,
      subsections: cat.subsections.map((sub) =>
        sub.id === id ? { ...sub, status: "APPROVED" as SectionStatus } : sub
      ),
    }));
    saveCategories(updatedCategories);
  };

  const handleFullDocxExport = async () => {
    setIsExporting(true);
    try {
      await exportProjectToDocx(metadata, categories);

      // Auto-register exported project in user's Electronic Archive
      if (currentUsername) {
        const docName = `ТПР_ОПИ_${metadata.depositName && metadata.depositName !== "—" ? metadata.depositName : "Месторождение"}_${new Date().toISOString().slice(0, 10)}.docx`;
        const item = {
          id: `arch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: docName,
          category: "project_doc" as const,
          fileType: "word" as const,
          size: "4.8 МБ",
          source: "project_studio" as const,
          createdAt: new Date().toISOString().slice(0, 10),
          username: currentUsername,
          metadata: {
            licenseNumber: metadata.licenseCode,
            description: `Сводный технический проект разработки (${metadata.depositName || "ОПИ"}), готовность ${progressPercent}%`,
            tags: ["ТПР", "Проектирование"],
          },
        };
        const archKey = `geo_ai_archive_${currentUsername}_v1`;
        try {
          const raw = localStorage.getItem(archKey);
          const existing = raw ? JSON.parse(raw) : [];
          localStorage.setItem(archKey, JSON.stringify([item, ...(Array.isArray(existing) ? existing : [])]));
          window.dispatchEvent(new Event("geo_ai_archive_updated"));
        } catch {}

        fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "save_archive_file",
            username: currentUsername,
            payload: item,
          }),
        }).catch(() => {});
      }
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
        return <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" title="Черновик на проверку" />;
      case "NEEDS_DATA":
        return <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" title="Ожидает исходных данных" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-transparent transition-colors">
      {/* Top Header */}
      <div className="px-6 py-4.5 bg-white/40 dark:bg-black/30 border-b border-black/[0.04] dark:border-white/[0.08] backdrop-blur-2xl flex items-center justify-between">
        <div>
          <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-xl">
            {metadata.title}
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {metadata.depositName && metadata.depositName !== "—"
              ? `${metadata.depositName} • ${metadata.licenseCode} • ${metadata.holderCompany}`
              : "Новый проект • данные месторождения и лицензии ожидают ввода"}
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex items-center space-x-3">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            Готовность: <span className="font-semibold text-zinc-900 dark:text-zinc-100">{progressPercent}%</span>
          </div>

          <div className="flex items-center bg-zinc-100 dark:bg-white/[0.06] p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setViewMode("INTERACTIVE")}
              className={`px-3 py-1 rounded-md transition-colors ${
                viewMode === "INTERACTIVE"
                  ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-medium shadow-2xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              Чек-лист
            </button>
            <button
              onClick={() => setViewMode("FULL_PREVIEW")}
              className={`px-3 py-1 rounded-md transition-colors ${
                viewMode === "FULL_PREVIEW"
                  ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-medium shadow-2xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              Сводный том
            </button>
          </div>

          <button
            onClick={handleFullDocxExport}
            disabled={isExporting}
            className="px-3.5 py-1.5 rounded-lg bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium flex items-center space-x-1.5 transition-colors disabled:opacity-50"
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
          <div className="w-80 border-r border-zinc-200 dark:border-white/[0.08] bg-white/40 dark:bg-black/20 backdrop-blur-xl flex flex-col justify-between overflow-y-auto shrink-0">
            <div className="p-3 space-y-1.5">
              {categories.map((cat) => {
                const isOpen = openCategoryIds.includes(cat.id);
                return (
                  <div key={cat.id} className="rounded-lg bg-white dark:bg-[#181d24] border border-zinc-200/80 dark:border-white/[0.06] overflow-hidden">
                    <button
                      onClick={() => toggleCategory(cat.id)}
                      className="w-full text-left px-3 py-2 flex items-center justify-between text-xs font-medium text-zinc-900 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-center space-x-2 truncate">
                        {isOpen ? (
                          <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        )}
                        <span className="truncate">{cat.title}</span>
                      </div>
                      <span className="text-[11px] text-zinc-400 ml-2 shrink-0">
                        {cat.subsections.filter((s) => s.status === "APPROVED").length}/{cat.subsections.length}
                      </span>
                    </button>

                    {isOpen && (
                      <div className="px-1.5 pb-1.5 space-y-0.5 border-t border-zinc-100 dark:border-white/[0.04]">
                        {cat.subsections.map((sub) => {
                          const isSelected = sub.id === activeSubSection?.id;
                          return (
                            <button
                              key={sub.id}
                              onClick={() => setActiveSubSectionId(sub.id)}
                              className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors flex items-center space-x-2.5 ${
                                isSelected
                                  ? "bg-zinc-100 dark:bg-white/[0.08] text-zinc-900 dark:text-white font-medium"
                                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/[0.03]"
                              }`}
                            >
                              {getStatusIndicator(sub.status)}
                              <span className="truncate">
                                <span className="font-mono text-zinc-400 mr-1 text-[11px]">{sub.code}</span>
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
            <div className="flex-1 flex items-center justify-center text-zinc-400 text-sm">
              Выберите подраздел
            </div>
          )}
        </div>
      ) : (
        /* FULL PREVIEW */
        <div className="flex-1 overflow-y-auto p-8 bg-zinc-50 dark:bg-[#0e1217] flex justify-center">
          <div className="max-w-3xl w-full space-y-6 bg-white dark:bg-[#181d24] p-8 rounded-2xl border border-zinc-200 dark:border-white/[0.08]">
            <div className="text-center space-y-2 pb-6 border-b border-zinc-200 dark:border-white/[0.08]">
              <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {metadata.title}
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Лицензия {metadata.licenseCode} • {metadata.holderCompany}
              </p>
            </div>

            <div className="space-y-6">
              {categories.map((cat) => (
                <div key={cat.id} className="space-y-4">
                  <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-200 border-b border-zinc-200 dark:border-white/[0.08] pb-1.5">
                    {cat.code}: {cat.title}
                  </h2>

                  <div className="space-y-4">
                    {cat.subsections.map((sub) => (
                      <div key={sub.id} className="p-4 rounded-xl bg-zinc-50 dark:bg-[#12161c] border border-zinc-200/80 dark:border-white/[0.06] space-y-2">
                        <div className="flex items-center justify-between text-xs text-zinc-500">
                          <span className="font-medium text-zinc-900 dark:text-zinc-200">
                            {sub.code}. {sub.title}
                          </span>
                          <span className="text-[11px]">{sub.status === "APPROVED" ? "Утверждено" : "Черновик"}</span>
                        </div>
                        <div className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
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
