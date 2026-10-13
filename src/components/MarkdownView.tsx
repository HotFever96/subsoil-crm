"use client";

import React, { useState } from "react";
import { Check, Copy, FileSpreadsheet, Download } from "lucide-react";
import { FileArtifactCard } from "@/components/FileArtifactCard";
import { exportToExcel } from "@/lib/file-generator";

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
    parts.push({ type: "text", content: content.slice(lastIndex) });
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
          <strong key={`b-${keyIdx++}`} className="font-semibold text-slate-900 dark:text-slate-100">
            {inlineMatch[2]}
          </strong>
        );
      } else if (inlineMatch[0].startsWith("`")) {
        tokens.push(
          <code
            key={`c-${keyIdx++}`}
            className="px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-white/[0.08] text-sky-600 dark:text-sky-400 font-mono text-[13px]"
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
            <p key={`p-fallback-${elements.length}-${i}`} className="my-1.5 leading-relaxed text-slate-800 dark:text-slate-200">
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
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span className="font-medium text-slate-500 dark:text-slate-400 flex items-center space-x-1">
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

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/[0.08] shadow-2xs">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-100 dark:bg-white/[0.04] text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-white/[0.08]">
                <tr>
                  {headers.map((h, i) => (
                    <th key={i} className="py-2.5 px-3 font-semibold border-r border-slate-200 dark:border-white/[0.08] last:border-r-0 whitespace-nowrap">
                      {renderInlineFormatted(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/[0.06] text-slate-800 dark:text-slate-200">
                {dataRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="py-2 px-3 border-r border-slate-200 dark:border-white/[0.08] last:border-r-0 whitespace-nowrap">
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
          <ul key={`list-${elements.length}`} className="my-2 space-y-1 pl-5 list-disc text-slate-800 dark:text-slate-200">
            {currentList.items.map((item, idx) => (
              <li key={idx} className="leading-relaxed">
                {renderInlineFormatted(item)}
              </li>
            ))}
          </ul>
        );
      } else {
        elements.push(
          <ol key={`list-${elements.length}`} className="my-2 space-y-1 pl-5 list-decimal text-slate-800 dark:text-slate-200">
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
          <h1 key={`h1-${idx}`} className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-4 mb-2">
            {renderInlineFormatted(line.slice(2))}
          </h1>
        );
        continue;
      }

      // Heading 2 (## )
      if (line.startsWith("## ")) {
        flushList();
        elements.push(
          <h2 key={`h2-${idx}`} className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-3 mb-1.5">
            {renderInlineFormatted(line.slice(3))}
          </h2>
        );
        continue;
      }

      // Heading 3 (### )
      if (line.startsWith("### ")) {
        flushList();
        elements.push(
          <h3 key={`h3-${idx}`} className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-2.5 mb-1">
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
            className="border-l-2 border-sky-500/60 pl-3 my-2 italic text-slate-600 dark:text-slate-300"
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

      // Regular paragraph line
      flushList();
      elements.push(
        <p key={`p-${idx}`} className="my-1.5 leading-relaxed text-slate-800 dark:text-slate-200">
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
            lang === "document"
          ) {
            try {
              const cleanType = lang.replace("file:", "").trim();
              const parsed = JSON.parse(part.content);
              if (cleanType === "excel" || cleanType === "xlsx") {
                return <FileArtifactCard key={`art-${pIdx}`} type="excel" excelData={parsed} />;
              }
              if (cleanType === "presentation" || cleanType === "pptx") {
                return (
                  <FileArtifactCard
                    key={`art-${pIdx}`}
                    type="presentation"
                    presentationData={parsed}
                  />
                );
              }
              if (cleanType === "document" || cleanType === "pdf" || cleanType === "docx") {
                return <FileArtifactCard key={`art-${pIdx}`} type="document" documentData={parsed} />;
              }
            } catch (err) {
              // fallback to regular code block
            }
          }

          const codeIdx = codeBlockCounter++;
          const isCopied = copiedCodeIdx === codeIdx;
          return (
            <div
              key={`code-${pIdx}`}
              className="my-3 rounded-xl overflow-hidden border border-slate-300 dark:border-white/[0.1] bg-slate-900 text-slate-100 font-mono text-xs shadow-md"
            >
              <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-950/80 border-b border-white/[0.08] text-[11px] text-slate-400">
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
