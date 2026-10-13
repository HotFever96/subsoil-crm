"use client";

import React, { useState } from "react";
import { Check, Copy } from "lucide-react";

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
  const codeBlockRegex = /```([a-zA-Z0-9_\-#+]*)\n([\s\S]*?)```/g;
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
    // Render inline formatting: **bold**, `code`, links
    const tokens: React.ReactNode[] = [];
    let remaining = text;
    let keyIdx = 0;

    // Regex for bold or inline code
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
            className="px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-white/[0.08] text-amber-600 dark:text-amber-400 font-mono text-[13px]"
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

    lines.forEach((rawLine, idx) => {
      const line = rawLine.trim();

      // Heading 1 (# )
      if (line.startsWith("# ")) {
        flushList();
        elements.push(
          <h1 key={`h1-${idx}`} className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-4 mb-2">
            {renderInlineFormatted(line.slice(2))}
          </h1>
        );
        return;
      }

      // Heading 2 (## )
      if (line.startsWith("## ")) {
        flushList();
        elements.push(
          <h2 key={`h2-${idx}`} className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-3 mb-1.5">
            {renderInlineFormatted(line.slice(3))}
          </h2>
        );
        return;
      }

      // Heading 3 (### )
      if (line.startsWith("### ")) {
        flushList();
        elements.push(
          <h3 key={`h3-${idx}`} className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-2.5 mb-1">
            {renderInlineFormatted(line.slice(4))}
          </h3>
        );
        return;
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
        return;
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
        return;
      }

      // Blockquote (> )
      if (line.startsWith("> ")) {
        flushList();
        elements.push(
          <blockquote
            key={`bq-${idx}`}
            className="border-l-2 border-amber-500/60 pl-3 my-2 italic text-slate-600 dark:text-slate-300"
          >
            {renderInlineFormatted(line.slice(2))}
          </blockquote>
        );
        return;
      }

      // Empty line
      if (!line) {
        flushList();
        return;
      }

      // Regular paragraph line
      flushList();
      elements.push(
        <p key={`p-${idx}`} className="my-1.5 leading-relaxed text-slate-800 dark:text-slate-200">
          {renderInlineFormatted(line)}
        </p>
      );
    });

    flushList();

    return <div key={`block-${blockIndex}`}>{elements}</div>;
  };

  let codeBlockCounter = 0;

  return (
    <div className={`space-y-3 leading-relaxed text-sm ${className}`}>
      {parts.map((part, pIdx) => {
        if (part.type === "code") {
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
                  className="flex items-center space-x-1 hover:text-white transition-colors"
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
