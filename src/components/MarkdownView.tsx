"use client";

import React, { useState } from "react";
import { Check, Copy, FileSpreadsheet, Download, FileText, Presentation, FileCheck } from "lucide-react";
import { FileArtifactCard } from "@/components/FileArtifactCard";
import { exportToExcel } from "@/lib/file-generator";
import { tryRepairAndParseJson, extractFileMetadataFallback } from "@/lib/json-repair";

interface MarkdownViewProps {
  content: string;
  className?: string;
}

export const MarkdownView: React.FC<MarkdownViewProps> = ({ content, className = "" }) => {
  const [copiedCodeIdx, setCopiedCodeIdx] = useState<number | null>(null);

  const handleCopyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeIdx(idx);
    setTimeout(() => setCopiedCodeIdx(null), 2000);
  };

  // Split by code blocks first
  const parts: Array<{ type: "code" | "text"; content: string; lang?: string }> = [];
  const codeBlockRegex = /```([a-zA-Z0-9_\-:#+]*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", content: content.slice(lastIndex, match.index) });
    }
    parts.push({
      type: "code",
      lang: match[1] || "text",
      content: match[2].trimEnd(),
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    const leftover = content.slice(lastIndex);
    // Check if leftover starts with or contains an unclosed code block, e.g. ```file:document\n...
    const unclosedMatch = /(?:^|\n)```([a-zA-Z0-9_\-:#+]*)\n([\s\S]*)$/.exec(leftover);
    if (unclosedMatch) {
      const textBefore = leftover.slice(0, unclosedMatch.index);
      if (textBefore.trim()) {
        parts.push({ type: "text", content: textBefore });
      }
      parts.push({
        type: "code",
        lang: unclosedMatch[1] || "text",
        content: unclosedMatch[2].trimEnd(),
      });
    } else {
      parts.push({ type: "text", content: leftover });
    }
  }

  const renderInlineFormatted = (text: string) => {
    const tokens: React.ReactNode[] = [];
    let remaining = text;
    let keyIdx = 0;

    const inlineRegex = /(\*\*([^*]+)\*\*|`([^`]+)`)/g;
    let inlineLastIdx = 0;
    let inlineMatch: RegExpExecArray | null;

    while ((inlineMatch = inlineRegex.exec(remaining)) !== null) {
      if (inlineMatch.index > inlineLastIdx) {
        tokens.push(remaining.slice(inlineLastIdx, inlineMatch.index));
      }

      if (inlineMatch[0].startsWith("**")) {
        tokens.push(
          <strong key={`b-${keyIdx++}`} className="font-semibold text-zinc-900 dark:text-zinc-100">
            {inlineMatch[2]}
          </strong>
        );
      } else if (inlineMatch[0].startsWith("`")) {
        tokens.push(
          <code
            key={`c-${keyIdx++}`}
            className="px-1.5 py-0.5 rounded bg-zinc-200/70 dark:bg-white/[0.08] text-sky-600 dark:text-sky-400 font-mono text-[13px]"
          >
            {inlineMatch[3]}
          </code>
        );
      }

      inlineLastIdx = inlineMatch.index + inlineMatch[0].length;
    }

    if (inlineLastIdx < remaining.length) {
      tokens.push(remaining.slice(inlineLastIdx));
    }

    return tokens.length > 0 ? tokens : [text];
  };

  const renderTextBlock = (text: string, blockIndex: number) => {
    const lines = text.split("\n");
    const elements: React.ReactNode[] = [];
    let currentList: { type: "ul" | "ol"; items: string[] } | null = null;
    let tableBuffer: string[] = [];

    const flushTable = () => {
      if (tableBuffer.length < 2) {
        // Not a valid table, render as normal paragraphs
        tableBuffer.forEach((l, i) => {
          elements.push(
            <p key={`p-fallback-${elements.length}-${i}`} className="my-1.5 leading-relaxed text-zinc-800 dark:text-zinc-200">
              {renderInlineFormatted(l)}
            </p>
          );
        });
        tableBuffer = [];
        return;
      }

      // Parse markdown table
      const headerLine = tableBuffer[0].trim();
      const headers = headerLine
        .slice(1, -1)
        .split("|")
        .map((h) => h.trim());

      const dataRows = tableBuffer.slice(2).map((rowLine) =>
        rowLine
          .trim()
          .slice(1, -1)
          .split("|")
          .map((c) => c.trim())
      );

      const handleDownloadTableExcel = () => {
        exportToExcel({
          filename: `Таблица_${new Date().toISOString().slice(0, 10)}.xlsx`,
          sheets: [
            {
              name: "Таблица",
              headers,
              rows: dataRows,
            },
          ],
        });
      };

      elements.push(
        <div key={`table-${elements.length}`} className="my-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
            <span className="font-medium text-zinc-500 dark:text-zinc-400 flex items-center space-x-1">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
              <span>Таблица ({dataRows.length} строк)</span>
            </span>
            <button
              type="button"
              onClick={handleDownloadTableExcel}
              className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 transition-colors font-medium cursor-pointer"
            >
              <Download className="w-3 h-3" />
              <span>Скачать в Excel (.xlsx)</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-white/[0.08] shadow-2xs">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-zinc-100 dark:bg-white/[0.04] text-zinc-800 dark:text-zinc-200 border-b border-zinc-200 dark:border-white/[0.08]">
                <tr>
                  {headers.map((h, i) => (
                    <th key={i} className="py-2.5 px-3 font-semibold border-r border-zinc-200 dark:border-white/[0.08] last:border-r-0 whitespace-nowrap">
                      {renderInlineFormatted(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-white/[0.06] text-zinc-800 dark:text-zinc-200">
                {dataRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-zinc-50 dark:hover:bg-white/[0.02]">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="py-2 px-3 border-r border-zinc-200 dark:border-white/[0.08] last:border-r-0 whitespace-nowrap">
                        {renderInlineFormatted(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );

      tableBuffer = [];
    };

    const flushList = () => {
      if (!currentList) return;
      if (currentList.type === "ul") {
        elements.push(
          <ul key={`list-${elements.length}`} className="my-2 space-y-1 pl-5 list-disc text-zinc-800 dark:text-zinc-200">
            {currentList.items.map((item, idx) => (
              <li key={idx} className="leading-relaxed">
                {renderInlineFormatted(item)}
              </li>
            ))}
          </ul>
        );
      } else {
        elements.push(
          <ol key={`list-${elements.length}`} className="my-2 space-y-1 pl-5 list-decimal text-zinc-800 dark:text-zinc-200">
            {currentList.items.map((item, idx) => (
              <li key={idx} className="leading-relaxed">
                {renderInlineFormatted(item)}
              </li>
            ))}
          </ol>
        );
      }
      currentList = null;
    };

    for (let idx = 0; idx < lines.length; idx++) {
      const rawLine = lines[idx];
      const line = rawLine.trim();

      // Check if line is part of a markdown table (| ... |)
      if (line.startsWith("|") && line.endsWith("|")) {
        flushList();
        tableBuffer.push(line);
        continue;
      } else if (tableBuffer.length > 0) {
        flushTable();
      }

      // Heading 1 (# )
      if (line.startsWith("# ")) {
        flushList();
        elements.push(
          <h1 key={`h1-${idx}`} className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-4 mb-2">
            {renderInlineFormatted(line.slice(2))}
          </h1>
        );
        continue;
      }

      // Heading 2 (## )
      if (line.startsWith("## ")) {
        flushList();
        elements.push(
          <h2 key={`h2-${idx}`} className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mt-3 mb-1.5">
            {renderInlineFormatted(line.slice(3))}
          </h2>
        );
        continue;
      }

      // Heading 3 (### )
      if (line.startsWith("### ")) {
        flushList();
        elements.push(
          <h3 key={`h3-${idx}`} className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mt-2.5 mb-1">
            {renderInlineFormatted(line.slice(4))}
          </h3>
        );
        continue;
      }

      // Unordered list item (- or *)
      if (/^[-*]\s+/.test(line)) {
        const itemText = line.replace(/^[-*]\s+/, "");
        if (currentList && currentList.type === "ul") {
          currentList.items.push(itemText);
        } else {
          flushList();
          currentList = { type: "ul", items: [itemText] };
        }
        continue;
      }

      // Ordered list item (1. 2. etc)
      if (/^\d+\.\s+/.test(line)) {
        const itemText = line.replace(/^\d+\.\s+/, "");
        if (currentList && currentList.type === "ol") {
          currentList.items.push(itemText);
        } else {
          flushList();
          currentList = { type: "ol", items: [itemText] };
        }
        continue;
      }

      // Blockquote (> )
      if (line.startsWith("> ")) {
        flushList();
        elements.push(
          <blockquote
            key={`bq-${idx}`}
            className="border-l-2 border-sky-500/60 pl-3 my-2 italic text-zinc-600 dark:text-zinc-300"
          >
            {renderInlineFormatted(line.slice(2))}
          </blockquote>
        );
        continue;
      }

      // Empty line
      if (!line) {
        flushList();
        continue;
      }

      // Hide stray JSON artifacts from leaking into regular chat paragraphs
      if (/^\s*"(?:heading|sections|text|title|filename|subtitle|slides|sheets)"\s*:/i.test(line)) {
        continue;
      }
      if (/^\s*[{}\[\],]+\s*$/.test(line)) {
        continue;
      }

      // Regular paragraph line
      flushList();
      elements.push(
        <p key={`p-${idx}`} className="my-1.5 leading-relaxed text-zinc-800 dark:text-zinc-200">
          {renderInlineFormatted(line)}
        </p>
      );
    }

    flushList();
    if (tableBuffer.length > 0) {
      flushTable();
    }

    return <div key={`block-${blockIndex}`}>{elements}</div>;
  };

  let codeBlockCounter = 0;

  return (
    <div className={`space-y-3 leading-relaxed text-sm ${className}`}>
      {parts.map((part, pIdx) => {
        if (part.type === "code") {
          const lang = (part.lang || "").toLowerCase();

          // Check for file artifacts
          if (
            lang.startsWith("file:") ||
            lang === "excel" ||
            lang === "presentation" ||
            lang === "document" ||
            lang === "docx" ||
            lang === "pdf" ||
            lang === "xlsx" ||
            lang === "pptx"
          ) {
            const cleanType = lang.replace("file:", "").trim();
            const parsed = tryRepairAndParseJson(part.content);

            if (parsed) {
              if (cleanType === "excel" || cleanType === "xlsx" || parsed.sheets) {
                return <FileArtifactCard key={`art-${pIdx}`} type="excel" excelData={parsed} />;
              }
              if (cleanType === "presentation" || cleanType === "pptx" || parsed.slides) {
                return (
                  <FileArtifactCard
                    key={`art-${pIdx}`}
                    type="presentation"
                    presentationData={parsed}
                  />
                );
              }
              if (cleanType === "document" || cleanType === "pdf" || cleanType === "docx" || parsed.sections) {
                return <FileArtifactCard key={`art-${pIdx}`} type="document" documentData={parsed} />;
              }
            }

            // If JSON parsing could not be completed even after repair,
            // render a graceful in-progress / archived document card instead of dumping raw JSON code!
            const meta = extractFileMetadataFallback(part.content);
            const isExcelType = cleanType === "excel" || cleanType === "xlsx";
            const isPptxType = cleanType === "presentation" || cleanType === "pptx";

            return (
              <div
                key={`art-fallback-${pIdx}`}
                className="my-3 rounded-2xl border border-sky-500/25 bg-sky-500/5 dark:bg-sky-500/10 p-4 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                      {isExcelType ? (
                        <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
                      ) : isPptxType ? (
                        <Presentation className="w-5 h-5 text-amber-500" />
                      ) : (
                        <FileText className="w-5 h-5 text-sky-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {meta.title}
                      </h4>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {isExcelType ? "Таблица Excel" : isPptxType ? "Презентация" : "Проектный документ"}{" "}
                        • {meta.approxSectionsCount > 0 ? `${meta.approxSectionsCount} разделов структурировано` : "Параметры зафиксированы"} • Сохранен в Электронном архиве
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <span className="px-3 py-1 rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400 text-xs font-medium flex items-center space-x-1.5">
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>В архиве</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          }

          const codeIdx = codeBlockCounter++;
          const isCopied = copiedCodeIdx === codeIdx;
          return (
            <div
              key={`code-${pIdx}`}
              className="my-3 rounded-xl overflow-hidden border border-zinc-300 dark:border-white/[0.1] bg-zinc-900 text-zinc-100 font-mono text-xs shadow-md"
            >
              <div className="flex items-center justify-between px-3.5 py-1.5 bg-zinc-950/80 border-b border-white/[0.08] text-[11px] text-zinc-400">
                <span className="font-semibold uppercase tracking-wider">{part.lang || "code"}</span>
                <button
                  type="button"
                  onClick={() => handleCopyCode(part.content, codeIdx)}
                  className="flex items-center space-x-1 hover:text-white transition-colors cursor-pointer"
                  title="Копировать код"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Скопировано</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Копировать</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3.5 overflow-x-auto leading-relaxed">
                <code>{part.content}</code>
              </pre>
            </div>
          );
        }

        return renderTextBlock(part.content, pIdx);
      })}
    </div>
  );
};
