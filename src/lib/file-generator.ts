"use client";

import * as XLSX from "xlsx";
import pptxgen from "pptxgenjs";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } from "docx";
import saveAs from "file-saver";

export interface ExcelSheetData {
  name: string;
  headers: string[];
  rows: (string | number)[][];
}

export interface ExcelFileData {
  filename: string;
  sheets: ExcelSheetData[];
  summary?: string;
}

export interface SlideData {
  title: string;
  bullets?: string[];
  content?: string;
  badge?: string;
}

export interface PresentationFileData {
  filename: string;
  title: string;
  subtitle?: string;
  slides: SlideData[];
}

export interface DocumentSection {
  heading?: string;
  text?: string;
  bullets?: string[];
  table?: {
    headers: string[];
    rows: (string | number)[][];
  };
}

export interface DocumentFileData {
  filename: string;
  title: string;
  subtitle?: string;
  sections: DocumentSection[];
}

// ----------------------------------------------------------------------
// 1. EXCEL EXPORT (.xlsx)
// ----------------------------------------------------------------------
export function exportToExcel(data: ExcelFileData) {
  const wb = XLSX.utils.book_new();

  for (const sheet of data.sheets) {
    const sheetData: (string | number)[][] = [];
    if (sheet.headers && sheet.headers.length > 0) {
      sheetData.push(sheet.headers);
    }
    for (const row of sheet.rows) {
      sheetData.push(row);
    }
    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    // Auto column widths
    const colWidths = (sheet.headers || []).map((h, i) => {
      let maxLen = String(h || "").length;
      for (const row of sheet.rows) {
        const cellLen = String(row[i] || "").length;
        if (cellLen > maxLen) maxLen = cellLen;
      }
      return { wch: Math.min(Math.max(maxLen + 4, 12), 50) };
    });
    ws["!cols"] = colWidths;

    const sheetName = (sheet.name || "Лист 1").slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  const finalName = data.filename.endsWith(".xlsx") ? data.filename : `${data.filename}.xlsx`;
  XLSX.writeFile(wb, finalName);
}

// ----------------------------------------------------------------------
// 2. POWERPOINT PRESENTATION EXPORT (.pptx)
// ----------------------------------------------------------------------
export async function exportToPresentation(data: PresentationFileData) {
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_16x9";
  pptx.author = "Geo AI Subsoil CRM";
  pptx.title = data.title;

  // Slide 1: Cover Slide
  const coverSlide = pptx.addSlide();
  coverSlide.background = { color: "0A101D" };

  // Accent Line
  coverSlide.addShape(pptx.ShapeType.rect, {
    x: 1.0,
    y: 1.8,
    w: 0.15,
    h: 3.2,
    fill: { color: "0284C7" },
  });

  coverSlide.addText(data.title, {
    x: 1.4,
    y: 1.8,
    w: 10.5,
    h: 1.8,
    fontSize: 34,
    bold: true,
    color: "FFFFFF",
    fontFace: "Arial",
  });

  if (data.subtitle) {
    coverSlide.addText(data.subtitle, {
      x: 1.4,
      y: 3.8,
      w: 10.5,
      h: 0.8,
      fontSize: 18,
      color: "94A3B8",
      fontFace: "Arial",
    });
  }

  coverSlide.addText("Сгенерировано в Geo AI | Интеллектуальный помощник недропользования", {
    x: 1.4,
    y: 6.2,
    w: 10.5,
    h: 0.5,
    fontSize: 11,
    color: "64748B",
    fontFace: "Arial",
  });

  // Content Slides
  data.slides.forEach((slide, index) => {
    const s = pptx.addSlide();
    s.background = { color: "0F172A" };

    // Slide Header
    s.addShape(pptx.ShapeType.rect, {
      x: 0.8,
      y: 0.6,
      w: 0.08,
      h: 0.6,
      fill: { color: "38BDF8" },
    });

    s.addText(slide.title, {
      x: 1.0,
      y: 0.6,
      w: 10.0,
      h: 0.6,
      fontSize: 22,
      bold: true,
      color: "F8FAFC",
      fontFace: "Arial",
    });

    // Slide Number & Tag
    s.addText(`${index + 1} / ${data.slides.length}`, {
      x: 11.2,
      y: 0.6,
      w: 1.5,
      h: 0.4,
      fontSize: 12,
      color: "64748B",
      align: "right",
      fontFace: "Arial",
    });

    // Content Box
    if (slide.bullets && slide.bullets.length > 0) {
      const bulletItems = slide.bullets.map((b) => ({
        text: `  ${b}`,
        options: {
          fontSize: 15,
          color: "E2E8F0",
          breakLine: true,
          fontFace: "Arial",
          bullet: { type: "bullet", code: "2022" },
        },
      }));

      s.addText(bulletItems, {
        x: 1.0,
        y: 1.6,
        w: 11.0,
        h: 4.8,
        valign: "top",
        lineSpacing: 28,
      });
    } else if (slide.content) {
      s.addText(slide.content, {
        x: 1.0,
        y: 1.6,
        w: 11.0,
        h: 4.8,
        fontSize: 15,
        color: "E2E8F0",
        valign: "top",
        lineSpacing: 24,
        fontFace: "Arial",
      });
    }

    // Footer
    s.addText("Geo AI • Недропользование РФ", {
      x: 1.0,
      y: 6.8,
      w: 5.0,
      h: 0.3,
      fontSize: 10,
      color: "475569",
      fontFace: "Arial",
    });
  });

  const finalName = data.filename.endsWith(".pptx") ? data.filename : `${data.filename}.pptx`;
  await pptx.writeFile({ fileName: finalName });
}

// ----------------------------------------------------------------------
// 3. WORD DOCUMENT EXPORT (.docx)
// ----------------------------------------------------------------------
export async function exportToDocx(data: DocumentFileData) {
  const children: (Paragraph | Table)[] = [];

  // Title
  children.push(
    new Paragraph({
      text: data.title,
      heading: HeadingLevel.TITLE,
      spacing: { after: 200 },
    })
  );

  if (data.subtitle) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: data.subtitle,
            italics: true,
            color: "64748B",
          }),
        ],
        spacing: { after: 300 },
      })
    );
  }

  // Sections
  for (const sec of data.sections) {
    if (sec.heading) {
      children.push(
        new Paragraph({
          text: sec.heading,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 120 },
        })
      );
    }

    if (sec.text) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: sec.text,
              size: 24, // 12pt
            }),
          ],
          spacing: { after: 160 },
        })
      );
    }

    if (sec.bullets && sec.bullets.length > 0) {
      for (const bullet of sec.bullets) {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            children: [
              new TextRun({
                text: bullet,
                size: 24,
              }),
            ],
            spacing: { after: 80 },
          })
        );
      }
    }

    if (sec.table && sec.table.headers.length > 0) {
      const tableRows: TableRow[] = [];

      // Header row
      tableRows.push(
        new TableRow({
          children: sec.table.headers.map(
            (h) =>
              new TableCell({
                children: [new Paragraph({ text: h, style: "strong" })],
                width: { size: Math.floor(100 / sec.table!.headers.length), type: WidthType.PERCENTAGE },
              })
          ),
        })
      );

      // Data rows
      for (const row of sec.table.rows) {
        tableRows.push(
          new TableRow({
            children: row.map(
              (cell) =>
                new TableCell({
                  children: [new Paragraph({ text: String(cell ?? "") })],
                  width: { size: Math.floor(100 / sec.table!.headers.length), type: WidthType.PERCENTAGE },
                })
            ),
          })
        );
      }

      children.push(
        new Table({
          rows: tableRows,
          width: { size: 100, type: WidthType.PERCENTAGE },
        })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const finalName = data.filename.endsWith(".docx") ? data.filename : `${data.filename}.docx`;
  saveAs(blob, finalName);
}

// ----------------------------------------------------------------------
// 4. PRINTABLE VECTOR PDF EXPORT / WINDOW PRINT
// ----------------------------------------------------------------------
export function printOrSaveToPdf(title: string, htmlContent: string) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Пожалуйста, разрешите всплывающие окна для печати и сохранения в PDF.");
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          line-height: 1.6;
          color: #09090b;
          margin: 40px;
          background: #ffffff;
        }
        h1, h2, h3 { color: #0284c7; }
        h1 { border-bottom: 2px solid #0284c7; padding-bottom: 8px; margin-bottom: 20px; font-size: 24px; }
        h2 { font-size: 18px; margin-top: 24px; margin-bottom: 12px; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
        th, td { border: 1px solid #e4e4e7; padding: 8px 12px; text-align: left; }
        th { background: #f4f4f5; font-weight: 600; color: #18181b; }
        tr:nth-child(even) { background: #fafafa; }
        ul, ol { padding-left: 24px; margin: 12px 0; }
        li { margin-bottom: 6px; }
        .meta { color: #71717a; font-size: 12px; margin-bottom: 24px; }
        @media print {
          body { margin: 20px; }
          @page { margin: 1.5cm; }
        }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <div class="meta">Документ подготовлен в Geo AI Subsoil CRM • Дата: ${new Date().toLocaleDateString("ru-RU")}</div>
      ${htmlContent}
      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

// ----------------------------------------------------------------------
// 5. HELPER: PARSE MARKDOWN TABLE INTO EXCEL DATA
// ----------------------------------------------------------------------
export function extractMarkdownTables(markdown: string): ExcelFileData | null {
  const lines = markdown.split("\n");
  const tables: Array<{ headers: string[]; rows: string[][] }> = [];

  let currentHeaders: string[] | null = null;
  let currentRows: string[][] = [];
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("|") && line.endsWith("|")) {
      const cells = line
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim());

      // Is it a separator line |---|---|
      const isSeparator = cells.every((c) => /^:?-+:?$/.test(c));

      if (isSeparator && !inTable && i > 0) {
        // Previous line was header
        const prevLine = lines[i - 1].trim();
        if (prevLine.startsWith("|") && prevLine.endsWith("|")) {
          currentHeaders = prevLine
            .slice(1, -1)
            .split("|")
            .map((c) => c.trim());
          inTable = true;
          currentRows = [];
        }
      } else if (inTable) {
        currentRows.push(cells);
      }
    } else {
      if (inTable && currentHeaders) {
        tables.push({ headers: currentHeaders, rows: currentRows });
        currentHeaders = null;
        currentRows = [];
        inTable = false;
      }
    }
  }

  if (inTable && currentHeaders) {
    tables.push({ headers: currentHeaders, rows: currentRows });
  }

  if (tables.length === 0) return null;

  return {
    filename: `Таблица_GeoAI_${new Date().toISOString().slice(0, 10)}.xlsx`,
    sheets: tables.map((t, idx) => ({
      name: `Таблица ${idx + 1}`,
      headers: t.headers,
      rows: t.rows,
    })),
  };
}

// ----------------------------------------------------------------------
// 6. HELPER: PARSE SPECIAL ARTIFACT BLOCKS (```file:excel, ```file:presentation, etc.)
// ----------------------------------------------------------------------
export interface ParsedArtifact {
  type: "excel" | "presentation" | "document";
  rawJson: string;
  excelData?: ExcelFileData;
  presentationData?: PresentationFileData;
  documentData?: DocumentFileData;
}

export function extractArtifactBlocks(content: string): ParsedArtifact[] {
  const artifacts: ParsedArtifact[] = [];
  const regex = /```file:(excel|presentation|document|pdf)\s*([\s\S]*?)```/gi;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const rawType = match[1].toLowerCase();
    const jsonStr = match[2].trim();

    try {
      const parsed = JSON.parse(jsonStr);
      if (rawType === "excel" || rawType === "xlsx") {
        artifacts.push({
          type: "excel",
          rawJson: jsonStr,
          excelData: parsed as ExcelFileData,
        });
      } else if (rawType === "presentation" || rawType === "pptx") {
        artifacts.push({
          type: "presentation",
          rawJson: jsonStr,
          presentationData: parsed as PresentationFileData,
        });
      } else if (rawType === "document" || rawType === "pdf" || rawType === "docx") {
        artifacts.push({
          type: "document",
          rawJson: jsonStr,
          documentData: parsed as DocumentFileData,
        });
      }
    } catch (e) {
      console.warn("Could not parse file artifact block:", e);
    }
  }

  return artifacts;
}
