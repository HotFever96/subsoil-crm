"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  FolderArchive,
  Search,
  Download,
  UploadCloud,
  Trash2,
  Eye,
  FileText,
  FileSpreadsheet,
  Presentation,
  FileCheck,
  Tag,
  Calendar,
  X,
  Plus,
  RefreshCw,
  HardDrive,
  CheckCircle2,
  File,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  ArchiveItem,
  ArchiveCategory,
  getInitialArchiveFiles,
  downloadArchiveFile,
} from "@/lib/archive-service";
import { parseUploadedFile } from "@/lib/file-parser";

export const ElectronicArchive: React.FC = () => {
  const { user } = useAuth();
  const currentUsername = user?.username ? user.username.trim().toLowerCase() : "";
  const storageKey = `geo_ai_archive_${currentUsername || "guest"}_v1`;

  const [items, setItems] = useState<ArchiveItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<ArchiveCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [previewItem, setPreviewItem] = useState<ArchiveItem | null>(null);
  const [downloadSuccessId, setDownloadSuccessId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load items on mount and on username change
  useEffect(() => {
    if (!currentUsername) {
      setItems([]);
      return;
    }

    let loaded = getInitialArchiveFiles(currentUsername);
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          loaded = parsed;
        }
      } else {
        localStorage.setItem(storageKey, JSON.stringify(loaded));
      }
    } catch (e) {
      console.warn("Error loading archive from localStorage:", e);
    }
    setItems(loaded);

    // Sync from Supabase
    setIsSyncing(true);
    fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_archive_files", username: currentUsername }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.files) && data.files.length > 0) {
          setItems((prev) => {
            const map = new Map<string, ArchiveItem>();
            prev.forEach((item) => map.set(item.id, item));
            data.files.forEach((remote: ArchiveItem) => map.set(remote.id, remote));
            const merged = Array.from(map.values());
            try {
              localStorage.setItem(storageKey, JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      })
      .catch((err) => console.warn("Supabase archive sync failed:", err))
      .finally(() => setIsSyncing(false));

    // Listen to external events (e.g. from chat file generation)
    const handleArchiveUpdate = () => {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) setItems(parsed);
        }
      } catch {}
    };

    window.addEventListener("geo_ai_archive_updated", handleArchiveUpdate);
    return () => window.removeEventListener("geo_ai_archive_updated", handleArchiveUpdate);
  }, [currentUsername, storageKey]);

  const saveItems = (updated: ArchiveItem[]) => {
    setItems(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {}
  };

  const handleDownload = (item: ArchiveItem) => {
    downloadArchiveFile(item);
    setDownloadSuccessId(item.id);
    setTimeout(() => setDownloadSuccessId(null), 2500);
  };

  const handleDelete = (id: string) => {
    const updated = items.filter((i) => i.id !== id);
    saveItems(updated);

    if (currentUsername) {
      fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_archive_file",
          username: currentUsername,
          payload: { fileId: id },
        }),
      }).catch((err) => console.warn("Delete archive file remote error:", err));
    }
  };

  const handleFileUpload = async (files: FileList | File[]) => {
    const fileList = Array.from(files);
    if (fileList.length === 0 || !currentUsername) return;
    setIsUploading(true);

    try {
      const newItems: ArchiveItem[] = [];
      for (const file of fileList) {
        const parsed = await parseUploadedFile(file);
        const ext = file.name.split(".").pop()?.toLowerCase() || "";

        let cat: ArchiveItem["category"] = "license";
        if (["xlsx", "xls", "csv"].includes(ext)) cat = "table_calc";
        else if (["doc", "docx", "pdf"].includes(ext) && file.name.toLowerCase().includes("проект")) {
          cat = "project_doc";
        }

        const newItem: ArchiveItem = {
          id: `arch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: parsed.name,
          category: cat,
          fileType: parsed.type === "image" ? "image" : parsed.type === "excel" ? "excel" : parsed.type === "word" ? "word" : "pdf",
          size: parsed.size,
          source: "archive_upload",
          createdAt: new Date().toISOString().slice(0, 10),
          url: parsed.previewUrl,
          content: parsed.extractedText,
          username: currentUsername,
          metadata: {
            description: "Загружено пользователем в Электронный архив",
            tags: ["Архив", "Исходник"],
          },
        };

        newItems.push(newItem);

        // Sync to cloud
        fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "save_archive_file",
            username: currentUsername,
            payload: newItem,
          }),
        }).catch((err) => console.warn("Sync save archive file error:", err));
      }

      saveItems([...newItems, ...items]);
    } catch (err) {
      console.error("Archive file upload error:", err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Filter items by category and search
  const filteredItems = items.filter((item) => {
    if (activeCategory !== "all" && item.category !== activeCategory) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const matchName = item.name.toLowerCase().includes(query);
    const matchDesc = item.metadata?.description?.toLowerCase().includes(query);
    const matchTags = item.metadata?.tags?.some((t) => t.toLowerCase().includes(query));
    return matchName || matchDesc || matchTags;
  });

  const getCategoryCount = (cat: ArchiveCategory) => {
    if (cat === "all") return items.length;
    return items.filter((i) => i.category === cat).length;
  };

  const getSourceBadge = (source: ArchiveItem["source"]) => {
    switch (source) {
      case "chat_upload":
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-sky-500/10 text-sky-600 dark:text-sky-400">Вложение из чата</span>;
      case "chat_generated":
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">Сгенерировано ИИ</span>;
      case "project_studio":
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">Проектирование ТПР</span>;
      case "mail":
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400">Умная почта</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-500/10 text-slate-600 dark:text-slate-400">Загружено вручную</span>;
    }
  };

  const getFileTypeIcon = (type: ArchiveItem["fileType"]) => {
    switch (type) {
      case "excel":
        return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
      case "presentation":
        return <Presentation className="w-5 h-5 text-amber-500" />;
      case "word":
        return <FileText className="w-5 h-5 text-sky-500" />;
      case "pdf":
        return <FileText className="w-5 h-5 text-rose-500" />;
      default:
        return <File className="w-5 h-5 text-slate-400" />;
    }
  };

  const categories: Array<{ id: ArchiveCategory; label: string }> = [
    { id: "all", label: "Все файлы" },
    { id: "license", label: "Лицензии и исходники" },
    { id: "project_doc", label: "Сгенерированные проекты" },
    { id: "table_calc", label: "Таблицы и расчеты" },
    { id: "mail_attachment", label: "Файлы из почты" },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] dark:bg-[#090d12] overflow-hidden">
      {/* Top Header Bar */}
      <div className="px-6 py-5 border-b border-slate-200 dark:border-white/[0.08] bg-white/70 dark:bg-[#0c121a]/80 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/25 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 shadow-2xs">
            <FolderArchive className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
              <span>Электронный архив</span>
              <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-white/[0.08] text-slate-600 dark:text-slate-300">
                {items.length} файлов
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Единый изолированный сейф документов, исходников и расчетов ({currentUsername})
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            <UploadCloud className="w-4 h-4" />
            <span>{isUploading ? "Загрузка..." : "Загрузить документ"}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
          />
        </div>
      </div>

      {/* Categories & Search Bar */}
      <div className="px-6 py-3.5 border-b border-slate-200 dark:border-white/[0.06] bg-slate-50/50 dark:bg-[#0c121a]/40 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        {/* Category Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0">
          {categories.map((cat) => {
            const count = getCategoryCount(cat.id);
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer flex items-center space-x-1.5 ${
                  isActive
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-950 shadow-2xs font-semibold"
                    : "bg-white dark:bg-white/[0.04] text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/[0.08] border border-slate-200/80 dark:border-white/[0.06]"
                }`}
              >
                <span>{cat.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isActive ? "bg-white/20 dark:bg-slate-900/20 text-white dark:text-slate-900" : "bg-slate-200 dark:bg-white/[0.1] text-slate-500 dark:text-slate-400"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search input */}
        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Поиск по названию или тегам..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 rounded-lg bg-white dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-sky-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Files List / Grid Container */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredItems.length === 0 ? (
          <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-8">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] flex items-center justify-center text-slate-400 mb-3.5">
              <FolderArchive className="w-7 h-7" />
            </div>
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
              {searchQuery ? "Ничего не найдено" : "В этой категории пока нет документов"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
              {searchQuery
                ? `По запросу «${searchQuery}» совпадений не обнаружено. Попробуйте изменить формулировку.`
                : "Загрузите исходную лицензию или сгенерируйте документ через ИИ-чат или студию проектирования."}
            </p>
            {!searchQuery && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Добавить файл</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredItems.map((item) => {
              const isDownloaded = downloadSuccessId === item.id;
              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200/90 dark:border-white/[0.08] bg-white dark:bg-[#111722] p-4.5 hover:border-sky-500/40 hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div>
                    {/* Header: File icon + Source badge + Menu */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200/60 dark:border-white/[0.06] flex items-center justify-center shrink-0">
                          {getFileTypeIcon(item.fileType)}
                        </div>
                        <div className="min-w-0">
                          <h4
                            className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate cursor-pointer hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
                            onClick={() => setPreviewItem(item)}
                            title={item.name}
                          >
                            {item.name}
                          </h4>
                          <p className="text-[11px] text-slate-400 flex items-center space-x-1.5 mt-0.5">
                            <span>{item.size}</span>
                            <span>•</span>
                            <span>{item.createdAt}</span>
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-slate-400 hover:text-rose-500 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        title="Удалить из архива"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Description & Tags */}
                    {item.metadata?.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mb-3 leading-relaxed">
                        {item.metadata.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-1.5 mb-4">
                      {getSourceBadge(item.source)}
                      {item.metadata?.licenseNumber && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400">
                          {item.metadata.licenseNumber}
                        </span>
                      )}
                      {item.metadata?.tags?.map((t, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded text-[11px] bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-slate-400"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-3 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewItem(item)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Свойства</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownload(item)}
                      className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-2xs cursor-pointer"
                    >
                      {isDownloaded ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                          <span>Скачано!</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5" />
                          <span>Скачать</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Preview / Metadata Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-[#0e141e] border border-slate-200 dark:border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between bg-slate-50 dark:bg-[#0a0f18]">
              <div className="flex items-center space-x-3 min-w-0">
                {getFileTypeIcon(previewItem.fileType)}
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                    {previewItem.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Паспорт документа в архиве
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPreviewItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <span className="text-slate-400 font-medium uppercase tracking-wider text-[10px]">Описание</span>
                <p className="text-slate-800 dark:text-slate-200 text-sm leading-relaxed">
                  {previewItem.metadata?.description || "Описание не указано"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06]">
                  <span className="text-slate-400 text-[10px] font-semibold uppercase">Размер</span>
                  <p className="text-slate-900 dark:text-white font-medium mt-0.5">{previewItem.size}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06]">
                  <span className="text-slate-400 text-[10px] font-semibold uppercase">Дата создания</span>
                  <p className="text-slate-900 dark:text-white font-medium mt-0.5">{previewItem.createdAt}</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06] space-y-1">
                <span className="text-slate-400 text-[10px] font-semibold uppercase">Источник данных</span>
                <div>{getSourceBadge(previewItem.source)}</div>
              </div>

              {previewItem.content && (
                <div className="space-y-1 pt-1">
                  <span className="text-slate-400 font-medium uppercase tracking-wider text-[10px]">
                    Текстовый слой / Превью
                  </span>
                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-[#070b10] text-slate-700 dark:text-slate-300 max-h-36 overflow-y-auto font-mono text-[11px] leading-relaxed">
                    {previewItem.content.slice(0, 500)}
                    {previewItem.content.length > 500 ? "..." : ""}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-3.5 border-t border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#0a0f18] flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
              >
                Закрыть
              </button>
              <button
                type="button"
                onClick={() => {
                  handleDownload(previewItem);
                }}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold flex items-center space-x-1.5 transition-all shadow-sm cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Скачать файл</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
