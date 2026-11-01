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
  List,
  LayoutGrid,
  HelpCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useBusiness } from "@/lib/business-context";
import {
  ArchiveItem,
  ArchiveCategory,
  getInitialArchiveFiles,
  downloadArchiveFile,
} from "@/lib/archive-service";
import { parseUploadedFile } from "@/lib/file-parser";

const INITIAL_STO_FILES: ArchiveItem[] = [
  {
    id: "arch-sto-1",
    name: "Заказ-наряд_ЗН-00248_ГАЗон-Next_A102AA89.docx",
    category: "project_doc",
    fileType: "word",
    size: "1.2 МБ",
    source: "chat_generated",
    createdAt: "2026-10-25",
    username: "antonv",
    metadata: {
      description: "Заказ-наряд и Акт выполненных работ: Замена шкворней и рулевых наконечников",
      tags: ["Заказ-наряд", "Акт", "ГАЗон Next", "Чайка-Сервис"],
    },
  },
  {
    id: "arch-sto-2",
    name: "Акт_осмотра_и_приема_ТС_ЗН-00248.pdf",
    category: "license",
    fileType: "pdf",
    size: "820 КБ",
    source: "chat_generated",
    createdAt: "2026-10-25",
    username: "antonv",
    metadata: {
      description: "Акт приема-передачи и карта повреждений кузова с оттиском печати",
      tags: ["Акт осмотра", "Карта повреждений", "Чайка-Сервис"],
    },
  },
  {
    id: "arch-sto-3",
    name: "Счет_на_оплату_СФ-00192_ИП_Водоватовский.xlsx",
    category: "table_calc",
    fileType: "excel",
    size: "640 КБ",
    source: "chat_generated",
    createdAt: "2026-10-20",
    username: "antonv",
    metadata: {
      description: "Счет на оплату услуг автосервиса для ООО «СеверТранс»",
      tags: ["Счет", "Оплата", "ООО СеверТранс"],
    },
  },
  {
    id: "arch-sto-4",
    name: "Приходная_накладная_ПН-00812_РОССКО.xlsx",
    category: "table_calc",
    fileType: "excel",
    size: "1.4 МБ",
    source: "archive_upload",
    createdAt: "2026-10-18",
    username: "antonv",
    metadata: {
      description: "Поступление автозапчастей и расходных материалов на склад",
      tags: ["Склад", "Накладная", "РОССКО"],
    },
  },
];

function isGeoDocument(item: ArchiveItem): boolean {
  const str = [
    item.name,
    item.metadata?.description || "",
    item.metadata?.licenseNumber || "",
    ...(item.metadata?.tags || []),
  ].join(" ").toLowerCase();

  return (
    str.includes("сев 04561") ||
    str.includes("хан 01234") ||
    str.includes("пгин") ||
    str.includes("тпр") ||
    str.includes("недропольз") ||
    str.includes("лицензи") ||
    str.includes("геолог") ||
    str.includes("карьер") ||
    str.includes("месторожд") ||
    str.includes("горноотвод") ||
    str.includes("вскрыш") ||
    str.includes("северный") ||
    str.includes("хантинский") ||
    (item.category === "license" && !str.includes("заказ-наряд") && !str.includes("сто") && !str.includes("авто"))
  );
}

function isStoDocument(item: ArchiveItem): boolean {
  if (isGeoDocument(item)) return false;
  const str = [
    item.name,
    item.metadata?.description || "",
    item.metadata?.licenseNumber || "",
    ...(item.metadata?.tags || []),
  ].join(" ").toLowerCase();

  return (
    str.includes("заказ-наряд") ||
    str.includes("зн-") ||
    str.includes("акт") ||
    str.includes("счет") ||
    str.includes("накладн") ||
    str.includes("выработка") ||
    str.includes("зарплат") ||
    str.includes("чайка-сервис") ||
    str.includes("сто") ||
    str.includes("склад") ||
    str.includes("запчаст") ||
    str.includes("авто") ||
    str.includes("росско") ||
    str.includes("армтек") ||
    item.source === "archive_upload"
  );
}

export const ElectronicArchive: React.FC = () => {
  const { user } = useAuth();
  const { currentBusiness } = useBusiness();
  const isChaika = currentBusiness === "chaika-service";

  const currentUsername = user?.username ? user.username.trim().toLowerCase() : "";
  const storageKey = `geo_ai_archive_${currentUsername || "guest"}_v1`;

  const [items, setItems] = useState<ArchiveItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "grid">(isChaika ? "table" : "grid");
  const [isUploading, setIsUploading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [previewItem, setPreviewItem] = useState<ArchiveItem | null>(null);
  const [downloadSuccessId, setDownloadSuccessId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Switch default view mode when switching businesses
  useEffect(() => {
    setViewMode(isChaika ? "table" : "grid");
    setActiveCategory("all");
  }, [isChaika]);

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

    // Listen to external events (e.g. from chat file generation or order save)
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
            description: isChaika
              ? "Загружено пользователем в архив СТО «Чайка-Сервис»"
              : "Загружено пользователем в Электронный архив",
            tags: isChaika ? ["Архив СТО", "Чайка-Сервис", "Файл"] : ["Архив", "Исходник"],
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

  // Workspace strict file isolation
  const workspaceItems: ArchiveItem[] = React.useMemo(() => {
    if (isChaika) {
      const stoOnly = items.filter(isStoDocument);
      return stoOnly.length > 0 ? stoOnly : INITIAL_STO_FILES;
    }
    return items.filter((i) => !isStoDocument(i) || isGeoDocument(i));
  }, [items, isChaika]);

  // Categories definition per business mode
  const categories: Array<{ id: string; label: string }> = isChaika
    ? [
        { id: "all", label: "Все документы" },
        { id: "orders_acts", label: "Заказ-наряды и Акты" },
        { id: "invoices", label: "Счета и Квитанции" },
        { id: "warehouse", label: "Накладные и Склад" },
        { id: "uploads", label: "Загруженные файлы" },
      ]
    : [
        { id: "all", label: "Все файлы" },
        { id: "license", label: "Лицензии и исходники" },
        { id: "project_doc", label: "Сгенерированные проекты" },
        { id: "table_calc", label: "Таблицы и расчеты" },
        { id: "mail_attachment", label: "Файлы из почты" },
      ];

  // Filter items by category and search
  const filteredItems = workspaceItems.filter((item) => {
    if (isChaika) {
      if (activeCategory === "orders_acts") {
        const str = (item.name + " " + (item.metadata?.description || "")).toLowerCase();
        if (!str.includes("заказ-наряд") && !str.includes("акт") && !str.includes("зн-") && !str.includes("дефект")) return false;
      } else if (activeCategory === "invoices") {
        const str = (item.name + " " + (item.metadata?.description || "")).toLowerCase();
        if (!str.includes("счет") && !str.includes("квитанц") && !str.includes("оплат") && !str.includes("расчетн") && !str.includes("листок")) return false;
      } else if (activeCategory === "warehouse") {
        const str = (item.name + " " + (item.metadata?.description || "")).toLowerCase();
        if (!str.includes("накладн") && !str.includes("склад") && !str.includes("запчаст") && !str.includes("росско") && !str.includes("армтек")) return false;
      } else if (activeCategory === "uploads") {
        if (item.source !== "archive_upload" && item.source !== "chat_upload") return false;
      }
    } else {
      if (activeCategory !== "all" && item.category !== activeCategory) {
        return false;
      }
    }

    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const matchName = item.name.toLowerCase().includes(query);
    const matchDesc = item.metadata?.description?.toLowerCase().includes(query);
    const matchTags = item.metadata?.tags?.some((t) => t.toLowerCase().includes(query));
    return matchName || matchDesc || matchTags;
  });

  const getCategoryCount = (catId: string) => {
    if (catId === "all") return workspaceItems.length;
    if (isChaika) {
      return workspaceItems.filter((item) => {
        const str = (item.name + " " + (item.metadata?.description || "")).toLowerCase();
        if (catId === "orders_acts") {
          return str.includes("заказ-наряд") || str.includes("акт") || str.includes("зн-") || str.includes("дефект");
        }
        if (catId === "invoices") {
          return str.includes("счет") || str.includes("квитанц") || str.includes("оплат") || str.includes("расчетн") || str.includes("листок");
        }
        if (catId === "warehouse") {
          return str.includes("накладн") || str.includes("склад") || str.includes("запчаст") || str.includes("росско") || str.includes("армтек");
        }
        if (catId === "uploads") {
          return item.source === "archive_upload" || item.source === "chat_upload";
        }
        return false;
      }).length;
    }
    return workspaceItems.filter((i) => i.category === catId).length;
  };

  const getSourceBadge = (source: ArchiveItem["source"]) => {
    switch (source) {
      case "chat_upload":
        return (
          <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
            isChaika ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" : "bg-sky-500/10 text-sky-600 dark:text-sky-400"
          }`}>
            Вложение из чата
          </span>
        );
      case "chat_generated":
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            Сгенерировано ИИ
          </span>
        );
      case "project_studio":
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            {isChaika ? "Заказ-наряд СТО" : "Проектирование ТПР"}
          </span>
        );
      case "mail":
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400">
            Умная почта
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-500/10 text-zinc-600 dark:text-zinc-400">
            Загружено пользователем
          </span>
        );
    }
  };

  const getFileTypeIcon = (type: ArchiveItem["fileType"]) => {
    switch (type) {
      case "excel":
        return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
      case "presentation":
        return <Presentation className="w-5 h-5 text-amber-500" />;
      case "word":
        return <FileText className={`w-5 h-5 ${isChaika ? "text-rose-500" : "text-sky-500"}`} />;
      case "pdf":
        return <FileText className="w-5 h-5 text-rose-500" />;
      default:
        return <File className="w-5 h-5 text-zinc-400" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-transparent overflow-hidden">
      {/* Top Header Bar */}
      <div className="px-6 py-4.5 bg-white/40 dark:bg-black/30 border-b border-black/[0.04] dark:border-white/[0.08] backdrop-blur-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center space-x-3.5">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
              isChaika
                ? "bg-gradient-to-tr from-rose-500/20 to-amber-500/20 border border-white/10 text-rose-500 shadow-rose-500/10"
                : "bg-gradient-to-tr from-sky-500/20 to-teal-500/20 border border-white/10 text-sky-500 shadow-sky-500/10"
            }`}
          >
            <FolderArchive className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center space-x-2.5">
              <span>Электронный архив</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-zinc-200/60 dark:bg-white/[0.06] text-zinc-600 dark:text-zinc-400">
                {filteredItems.length} документов
              </span>
              <div className="relative group inline-block">
                <button
                  type="button"
                  className="p-1 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                  title="Справка"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
                <div className="absolute left-0 top-full mt-1.5 hidden group-hover:block z-30 w-72 p-2.5 rounded-2xl bg-zinc-900/95 text-zinc-100 text-xs shadow-2xl border border-white/10 backdrop-blur-2xl pointer-events-none">
                  {isChaika
                    ? "Изолированный сейф документов СТО: заказ-наряды, акты осмотра, счета-фактуры, зарплатные листки и накладные поставщиков автозапчастей."
                    : "Изолированный сейф горно-геологических документов: лицензии на право пользования недрами, технические проекты, топопланы и сметы."}
                </div>
              </div>
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-white/60 dark:bg-white/[0.06] p-1 rounded-full border border-black/[0.05] dark:border-white/[0.08] backdrop-blur-md">
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-full transition-all cursor-pointer ${
                viewMode === "table"
                  ? isChaika
                    ? "bg-rose-600 text-white shadow-md font-semibold"
                    : "bg-sky-600 text-white shadow-md font-semibold"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              }`}
              title="Таблица (компактный список)"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-full transition-all cursor-pointer ${
                viewMode === "grid"
                  ? isChaika
                    ? "bg-rose-600 text-white shadow-md font-semibold"
                    : "bg-sky-600 text-white shadow-md font-semibold"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              }`}
              title="Сетка карточек"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-full text-white text-xs font-bold shadow-lg transition-all cursor-pointer disabled:opacity-50 active:scale-95 ${
              isChaika
                ? "bg-rose-600 hover:bg-rose-500 shadow-rose-600/25"
                : "bg-sky-600 hover:bg-sky-500 shadow-sky-600/25"
            }`}
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
      <div className="px-6 py-3 border-b border-black/[0.04] dark:border-white/[0.06] bg-white/30 dark:bg-black/20 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        {/* Category Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {categories.map((cat) => {
            const count = getCategoryCount(cat.id);
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center space-x-1.5 ${
                  isActive
                    ? isChaika
                      ? "bg-rose-600 text-white shadow-md shadow-rose-600/20 font-bold"
                      : "bg-sky-600 text-white shadow-md shadow-sky-600/20 font-bold"
                    : "bg-white/50 dark:bg-white/[0.04] text-zinc-600 dark:text-zinc-400 hover:text-white border border-black/[0.04] dark:border-white/[0.06]"
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-zinc-200 dark:bg-white/[0.1] text-zinc-500 dark:text-zinc-400"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search input */}
        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Поиск по названию или тегам..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 rounded-full bg-white/60 dark:bg-white/[0.06] border border-black/[0.05] dark:border-white/[0.08] text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-hidden backdrop-blur-md"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
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
            <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.08] flex items-center justify-center text-zinc-400 mb-3.5">
              <FolderArchive className="w-7 h-7" />
            </div>
            <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
              {searchQuery ? "Ничего не найдено" : "В этой категории пока нет документов"}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mt-1">
              {searchQuery
                ? `По запросу «${searchQuery}» совпадений не обнаружено. Попробуйте изменить формулировку.`
                : isChaika
                ? "Создайте заказ-наряд, акт осмотра кузова или загрузите накладную вручную."
                : "Загрузите исходную лицензию или сгенерируйте документ через ИИ-чат или студию проектирования."}
            </p>
            {!searchQuery && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`mt-4 px-4 py-2 rounded-xl text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                  isChaika ? "bg-rose-600 hover:bg-rose-500" : "bg-sky-600 hover:bg-sky-500"
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Добавить файл</span>
              </button>
            )}
          </div>
        ) : viewMode === "table" ? (
          /* High-density compact table view (Auto-Dealer / 1C ERP standard) */
          <div className="bg-white/70 dark:bg-white/[0.03] rounded-3xl border border-black/[0.05] dark:border-white/[0.08] shadow-2xl backdrop-blur-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-900/60 text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                    <th className="p-3 font-semibold w-12 text-center">Формат</th>
                    <th className="p-3 font-semibold">Название документа</th>
                    <th className="p-3 font-semibold">Источник / Теги</th>
                    <th className="p-3 font-semibold text-right w-24">Размер</th>
                    <th className="p-3 font-semibold w-28 text-center">Дата</th>
                    <th className="p-3 font-semibold text-right w-36">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                  {filteredItems.map((item) => {
                    const isDownloaded = downloadSuccessId === item.id;
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors group cursor-pointer"
                        onClick={() => setPreviewItem(item)}
                      >
                        <td className="p-3 text-center">
                          <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-white/[0.05] border border-zinc-200/60 dark:border-white/[0.06] flex items-center justify-center mx-auto">
                            {getFileTypeIcon(item.fileType)}
                          </div>
                        </td>

                        <td className="p-3">
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors truncate max-w-md">
                            {item.name}
                          </div>
                          {item.metadata?.description && (
                            <div className="text-[11px] text-zinc-400 truncate max-w-md mt-0.5">
                              {item.metadata.description}
                            </div>
                          )}
                        </td>

                        <td className="p-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {getSourceBadge(item.source)}
                            {item.metadata?.tags?.slice(0, 2).map((t, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded text-[10px] bg-zinc-100 dark:bg-white/[0.04] text-zinc-500 dark:text-zinc-400"
                              >
                                #{t}
                              </span>
                            ))}
                          </div>
                        </td>

                        <td className="p-3 text-right font-mono text-zinc-600 dark:text-zinc-400">
                          {item.size}
                        </td>

                        <td className="p-3 text-center text-zinc-500 dark:text-zinc-400">
                          {item.createdAt}
                        </td>

                        <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              type="button"
                              onClick={() => setPreviewItem(item)}
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/[0.06] cursor-pointer"
                              title="Свойства"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownload(item)}
                              className={`p-1.5 rounded-lg text-white text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-all ${
                                isChaika ? "bg-rose-600 hover:bg-rose-500" : "bg-sky-600 hover:bg-sky-500"
                              }`}
                              title="Скачать"
                            >
                              {isDownloaded ? (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              ) : (
                                <Download className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(item.id)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                              title="Удалить"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredItems.map((item) => {
              const isDownloaded = downloadSuccessId === item.id;
              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border border-zinc-200/90 dark:border-white/[0.08] bg-white dark:bg-[#111722] p-4.5 transition-all flex flex-col justify-between group shadow-xs ${
                    isChaika ? "hover:border-rose-500/40" : "hover:border-sky-500/40"
                  }`}
                >
                  <div>
                    {/* Header: File icon + Source badge + Menu */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-white/[0.05] border border-zinc-200/60 dark:border-white/[0.06] flex items-center justify-center shrink-0">
                          {getFileTypeIcon(item.fileType)}
                        </div>
                        <div className="min-w-0">
                          <h4
                            className={`text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate cursor-pointer transition-colors ${
                              isChaika
                                ? "hover:text-rose-600 dark:hover:text-rose-400"
                                : "hover:text-sky-600 dark:hover:text-sky-400"
                            }`}
                            onClick={() => setPreviewItem(item)}
                            title={item.name}
                          >
                            {item.name}
                          </h4>
                          <p className="text-[11px] text-zinc-400 flex items-center space-x-1.5 mt-0.5">
                            <span>{item.size}</span>
                            <span>•</span>
                            <span>{item.createdAt}</span>
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-zinc-400 hover:text-rose-500 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        title="Удалить из архива"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Description & Tags */}
                    {item.metadata?.description && (
                      <p className="text-xs text-zinc-600 dark:text-zinc-300 line-clamp-2 mb-3 leading-relaxed">
                        {item.metadata.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-1.5 mb-4">
                      {getSourceBadge(item.source)}
                      {item.metadata?.tags?.map((t, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded text-[11px] bg-zinc-100 dark:bg-white/[0.04] text-zinc-500 dark:text-zinc-400"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-3 border-t border-zinc-100 dark:border-white/[0.06] flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewItem(item)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Свойства</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownload(item)}
                      className={`px-3.5 py-1.5 rounded-lg text-white text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-2xs cursor-pointer ${
                        isChaika ? "bg-rose-600 hover:bg-rose-500" : "bg-sky-600 hover:bg-sky-500"
                      }`}
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
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white/95 dark:bg-zinc-950/90 backdrop-blur-2xl border border-black/[0.08] dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-white/[0.08] flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/60">
              <div className="flex items-center space-x-3 min-w-0">
                {getFileTypeIcon(previewItem.fileType)}
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                    {previewItem.name}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Паспорт документа в архиве
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPreviewItem(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <span className="text-zinc-400 font-medium uppercase tracking-wider text-[10px]">Описание</span>
                <p className="text-zinc-800 dark:text-zinc-200 text-sm leading-relaxed">
                  {previewItem.metadata?.description || "Описание не указано"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200/60 dark:border-white/[0.06]">
                  <span className="text-zinc-400 text-[10px] font-semibold uppercase">Размер</span>
                  <p className="text-zinc-900 dark:text-white font-medium mt-0.5">{previewItem.size}</p>
                </div>
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200/60 dark:border-white/[0.06]">
                  <span className="text-zinc-400 text-[10px] font-semibold uppercase">Дата создания</span>
                  <p className="text-zinc-900 dark:text-white font-medium mt-0.5">{previewItem.createdAt}</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200/60 dark:border-white/[0.06] space-y-1">
                <span className="text-zinc-400 text-[10px] font-semibold uppercase">Источник данных</span>
                <div>{getSourceBadge(previewItem.source)}</div>
              </div>

              {previewItem.content && (
                <div className="space-y-1 pt-1">
                  <span className="text-zinc-400 font-medium uppercase tracking-wider text-[10px]">
                    Текстовый слой / Превью
                  </span>
                  <div className="p-3 rounded-xl bg-zinc-100 dark:bg-[#070b10] text-zinc-700 dark:text-zinc-300 max-h-36 overflow-y-auto font-mono text-[11px] leading-relaxed">
                    {previewItem.content.slice(0, 500)}
                    {previewItem.content.length > 500 ? "..." : ""}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-3.5 border-t border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-[#0a0f18] flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="px-4 py-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
              >
                Закрыть
              </button>
              <button
                type="button"
                onClick={() => handleDownload(previewItem)}
                className={`px-4 py-2 rounded-xl text-white font-semibold flex items-center space-x-1.5 transition-all shadow-sm cursor-pointer ${
                  isChaika ? "bg-rose-600 hover:bg-rose-500" : "bg-sky-600 hover:bg-sky-500"
                }`}
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
