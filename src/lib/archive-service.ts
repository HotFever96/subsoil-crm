"use client";

import { downloadUploadedFile } from "./file-parser";
import { exportToDocx, exportToExcel, exportToPresentation, printOrSaveToPdf } from "./file-generator";

export type ArchiveCategory =
  | "all"
  | "license"
  | "project_doc"
  | "table_calc"
  | "mail_attachment";

export type ArchiveFileType = "pdf" | "word" | "excel" | "presentation" | "image" | "text" | "other";

export interface ArchiveItem {
  id: string;
  name: string;
  category: "license" | "project_doc" | "table_calc" | "mail_attachment";
  fileType: ArchiveFileType;
  size: string;
  source: "chat_upload" | "chat_generated" | "project_studio" | "mail" | "archive_upload";
  createdAt: string;
  url?: string; // base64 or blob url
  content?: string; // extracted text or document text
  rawContent?: any; // Structured JSON for docx/excel/pptx if generated
  metadata?: {
    licenseNumber?: string;
    description?: string;
    tags?: string[];
  };
  username: string;
}

export function getInitialArchiveFiles(username: string): ArchiveItem[] {
  const normUser = (username || "").trim().toLowerCase();
  const dateStr = new Date().toISOString().slice(0, 10);

  if (normUser === "antonv") {
    return [
      {
        id: "arch-antonv-1",
        name: "Лицензия СЕВ 04561 ТЭ (Северный).pdf",
        category: "license",
        fileType: "pdf",
        size: "3.8 МБ",
        source: "archive_upload",
        createdAt: "2026-09-15",
        username: "antonv",
        metadata: {
          licenseNumber: "СЕВ 04561 ТЭ",
          description: "Действующая лицензия на разведку и добычу ПГС",
          tags: ["Лицензия", "Северный"],
        },
      },
      {
        id: "arch-antonv-2",
        name: "ПГИН_Северный_Геологическое_изучение.docx",
        category: "project_doc",
        fileType: "word",
        size: "4.5 МБ",
        source: "chat_generated",
        createdAt: "2026-10-02",
        username: "antonv",
        metadata: {
          description: "Проект геологического изучения участка Северный",
          tags: ["ПГИН", "Геология"],
        },
      },
      {
        id: "arch-antonv-3",
        name: "Калькуляция_затрат_и_объемы_добычи.xlsx",
        category: "table_calc",
        fileType: "excel",
        size: "1.1 МБ",
        source: "chat_generated",
        createdAt: "2026-10-10",
        username: "antonv",
        metadata: {
          description: "Расчет себестоимости и планируемой выработки",
          tags: ["Финансы", "Смета"],
        },
      },
    ];
  }

  // Default admin files
  return [
    {
      id: "arch-admin-1",
      name: "Лицензия ХАН 01234 ТЭ (Хантинский).pdf",
      category: "license",
      fileType: "pdf",
      size: "4.2 МБ",
      source: "archive_upload",
      createdAt: "2026-08-20",
      username: "admin",
      metadata: {
        licenseNumber: "ХАН 01234 ТЭ",
        description: "Лицензия на право пользования недрами (песок, ПГС)",
        tags: ["Лицензия", "Хантинский"],
      },
    },
    {
      id: "arch-admin-2",
      name: "Горноотводный_акт_и_топоплан_Хантинский.docx",
      category: "license",
      fileType: "word",
      size: "2.8 МБ",
      source: "archive_upload",
      createdAt: "2026-09-01",
      username: "admin",
      metadata: {
        description: "Утвержденные границы горного отвода и топогеодезическая основа",
        tags: ["Горный отвод", "Маркшейдерия"],
      },
    },
    {
      id: "arch-admin-3",
      name: "ТПР_ОПИ_Хантинское_месторождение_2026.docx",
      category: "project_doc",
      fileType: "word",
      size: "5.1 МБ",
      source: "project_studio",
      createdAt: dateStr,
      username: "admin",
      metadata: {
        description: "Технический проект разработки месторождения (полный сводный том)",
        tags: ["ТПР", "Проектирование"],
      },
    },
    {
      id: "arch-admin-4",
      name: "Смета_геологоразведки_и_расчет_вскрыши.xlsx",
      category: "table_calc",
      fileType: "excel",
      size: "1.4 МБ",
      source: "chat_generated",
      createdAt: dateStr,
      username: "admin",
      metadata: {
        description: "Смета затрат на бурение и объемы вскрышных пород",
        tags: ["Смета", "Вскрыша"],
      },
    },
    {
      id: "arch-admin-5",
      name: "Уведомление_Роснедр_об_утверждении_запасов.pdf",
      category: "mail_attachment",
      fileType: "pdf",
      size: "980 КБ",
      source: "mail",
      createdAt: "2026-10-12",
      username: "admin",
      metadata: {
        description: "Протокол ТКЗ об утверждении балансовых запасов",
        tags: ["Роснедра", "ТКЗ", "Почта"],
      },
    },
  ];
}

export function downloadArchiveFile(item: ArchiveItem) {
  if (typeof window === "undefined") return;

  // 1. If structured JSON generator content exists
  if (item.rawContent) {
    if (item.fileType === "word") {
      exportToDocx(item.rawContent);
      return;
    }
    if (item.fileType === "excel") {
      exportToExcel(item.rawContent);
      return;
    }
    if (item.fileType === "presentation") {
      exportToPresentation(item.rawContent);
      return;
    }
  }

  // 2. If base64 or blob URL is available
  if (item.url) {
    downloadUploadedFile({ name: item.name, previewUrl: item.url });
    return;
  }

  // 3. Fallback: generate a text document blob
  const textContent =
    item.content ||
    `Документ: ${item.name}\nКатегория: ${item.category}\nИсточник: ${item.source}\nДата добавления: ${item.createdAt}\n${item.metadata?.description || ""}`;
  const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = item.name.endsWith(".txt") ? item.name : `${item.name}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
