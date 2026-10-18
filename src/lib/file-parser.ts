"use client";

import * as XLSX from "xlsx";
import mammoth from "mammoth";
import { extractText } from "unpdf";

export interface ParsedFileResult {
  id: string;
  name: string;
  type: "image" | "pdf" | "excel" | "word" | "text";
  size: string;
  previewUrl?: string; // For images
  extractedText?: string; // For documents / tables / text
  tableData?: {
    sheets: Array<{
      name: string;
      headers: string[];
      rows: string[][];
      rowCount: number;
    }>;
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes > 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} КБ`;
}

export function downloadUploadedFile(file: { name: string; previewUrl?: string; content?: string }) {
  if (typeof window === "undefined") return;
  const target = file.previewUrl || file.content;
  if (!target) return;
  const link = document.createElement("a");
  if (target.startsWith("data:") || target.startsWith("blob:")) {
    link.href = target;
  } else {
    const blob = new Blob([target], { type: "text/plain;charset=utf-8" });
    link.href = URL.createObjectURL(blob);
  }
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function parseUploadedFile(file: File): Promise<ParsedFileResult> {
  const fileName = file.name;
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  const size = formatFileSize(file.size);
  const id = `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  // Generate a base64 DataURL so the file can be downloaded or previewed anywhere
  const fileDataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string) || "");
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });

  // 1. IMAGES
  if (file.type.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif", "bmp"].includes(ext)) {
    return {
      id,
      name: fileName,
      type: "image",
      size,
      previewUrl: fileDataUrl,
      extractedText: `[Изображение: ${fileName}, размер: ${size}]`,
    };
  }

  // 2. PDF
  if (file.type === "application/pdf" || ext === "pdf") {
    try {
      const buffer = await file.arrayBuffer();
      const { text, totalPages } = await extractText(new Uint8Array(buffer));
      const cleanText = (Array.isArray(text) ? text.join("\n\n") : String(text || "")).trim();

      const extracted = cleanText
        ? `--- ДОКУМЕНТ PDF: ${fileName} (Всего страниц: ${totalPages}) ---\n\n${cleanText}`
        : `--- ДОКУМЕНТ PDF: ${fileName} (Страниц: ${totalPages}) ---\n[Текстовый слой пуст или документ является отсканированным изображением]`;

      return {
        id,
        name: fileName,
        type: "pdf",
        size,
        previewUrl: fileDataUrl,
        extractedText: extracted,
      };
    } catch (err: any) {
      console.warn("PDF parsing fallback:", err);
      return {
        id,
        name: fileName,
        type: "pdf",
        size,
        previewUrl: fileDataUrl,
        extractedText: `[PDF документ: ${fileName}, размер: ${size}. Не удалось извлечь текст напрямую: ${err?.message || "ошибка чтения"}]`,
      };
    }
  }

  // 3. EXCEL / CSV (.xlsx, .xls, .csv)
  if (
    ext === "xlsx" ||
    ext === "xls" ||
    ext === "csv" ||
    file.type.includes("sheet") ||
    file.type.includes("excel") ||
    file.type.includes("csv")
  ) {
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetsData: Array<{
        name: string;
        headers: string[];
        rows: string[][];
        rowCount: number;
      }> = [];

      let fullText = `--- ЭЛЕКТРОННАЯ ТАБЛИЦА: ${fileName} ---\n`;

      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const rawJson: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

        if (rawJson.length > 0) {
          const headers = (rawJson[0] || []).map((h) => String(h ?? ""));
          const rows = rawJson.slice(1).map((row) => (row || []).map((cell) => String(cell ?? "")));
          sheetsData.push({
            name: sheetName,
            headers,
            rows,
            rowCount: rows.length,
          });

          fullText += `\n[Лист: "${sheetName}", строк: ${rows.length}]\n`;
          // Formatted text table representation for AI
          if (headers.length > 0) {
            fullText += `| ${headers.join(" | ")} |\n`;
            fullText += `| ${headers.map(() => "---").join(" | ")} |\n`;
          }
          // Limit to first 150 rows in prompt preview if too huge, but note total
          const displayRows = rows.slice(0, 150);
          for (const row of displayRows) {
            fullText += `| ${row.join(" | ")} |\n`;
          }
          if (rows.length > 150) {
            fullText += `... (показано 150 строк из ${rows.length})\n`;
          }
        }
      }

      return {
        id,
        name: fileName,
        type: "excel",
        size,
        previewUrl: fileDataUrl,
        extractedText: fullText,
        tableData: { sheets: sheetsData },
      };
    } catch (err: any) {
      console.warn("Excel parsing fallback:", err);
      // Fallback to text reading for CSV
      try {
        const text = await file.text();
        return {
          id,
          name: fileName,
          type: "excel",
          size,
          previewUrl: fileDataUrl,
          extractedText: `--- ТАБЛИЦА CSV: ${fileName} ---\n${text}`,
        };
      } catch {
        return {
          id,
          name: fileName,
          type: "excel",
          size,
          previewUrl: fileDataUrl,
          extractedText: `[Таблица: ${fileName}, размер: ${size}]`,
        };
      }
    }
  }

  // 4. WORD (.docx)
  if (ext === "docx" || file.type.includes("wordprocessingml")) {
    try {
      const buffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer: buffer });
      const rawText = result.value.trim();

      return {
        id,
        name: fileName,
        type: "word",
        size,
        previewUrl: fileDataUrl,
        extractedText: `--- ДОКУМЕНТ WORD (.docx): ${fileName} ---\n\n${rawText}`,
      };
    } catch (err: any) {
      console.warn("Word parsing fallback:", err);
      return {
        id,
        name: fileName,
        type: "word",
        size,
        previewUrl: fileDataUrl,
        extractedText: `[Документ Word: ${fileName}, размер: ${size}]`,
      };
    }
  }

  // 5. TEXT / CODE / OTHER DOCUMENTS
  try {
    const text = await file.text();
    return {
      id,
      name: fileName,
      type: "text",
      size,
      previewUrl: fileDataUrl,
      extractedText: `--- ФАЙЛ: ${fileName} ---\n\n${text}`,
    };
  } catch (err) {
    return {
      id,
      name: fileName,
      type: "text",
      size,
      previewUrl: fileDataUrl,
      extractedText: `[Файл: ${fileName}, размер: ${size}]`,
    };
  }
}
