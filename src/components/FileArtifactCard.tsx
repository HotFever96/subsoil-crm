"use client";

import React, { useState } from "react";
import {
  FileSpreadsheet,
  Presentation,
  FileText,
  Download,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  FileDown,
  Printer,
  Table as TableIcon,
  Check,
} from "lucide-react";
import {
  ExcelFileData,
  PresentationFileData,
  DocumentFileData,
  exportToExcel,
  exportToPresentation,
  exportToDocx,
  printOrSaveToPdf,
} from "@/lib/file-generator";

interface FileArtifactCardProps {
  type: "excel" | "presentation" | "document";
  excelData?: ExcelFileData;
  presentationData?: PresentationFileData;
  documentData?: DocumentFileData;
}

export const FileArtifactCard: React.FC<FileArtifactCardProps> = ({
  type,
  excelData,
  presentationData,
  documentData,
}) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const triggerDownloadSuccess = () => {
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2500);
  };

  // 1. EXCEL CARD
  if (type === "excel" && excelData) {
    const totalRows = excelData.sheets.reduce((acc, s) => acc + s.rows.length, 0);
    const activeSheet = excelData.sheets[activeSheetIndex] || excelData.sheets[0];

    const handleDownload = () => {
      exportToExcel(excelData);
      triggerDownloadSuccess();
    };

    return (
      <>
        <div className="my-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 dark:bg-emerald-500/10 p-4 transition-all hover:border-emerald-500/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {excelData.filename}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Таблица Excel (.xlsx) • {excelData.sheets.length} лист(ов) • {totalRows} строк
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/[0.1] hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Просмотр</span>
              </button>

              <button
                type="button"
                onClick={handleDownload}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer shadow-sm"
              >
                {downloadSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Скачано!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>Скачать .xlsx</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Excel Preview Modal */}
        {isPreviewOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-4xl max-h-[85vh] bg-white dark:bg-[#131821] border border-slate-200 dark:border-white/[0.1] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-500 shrink-0" />
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {excelData.filename}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Предварительный просмотр таблицы • Всего {totalRows} записей
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleDownload}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Скачать .xlsx</span>
                  </button>
                  <button
                    onClick={() => setIsPreviewOpen(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Sheet tabs if multiple */}
              {excelData.sheets.length > 1 && (
                <div className="px-5 pt-2 border-b border-slate-100 dark:border-white/[0.04] flex space-x-2 overflow-x-auto shrink-0 bg-slate-50 dark:bg-[#0e1218]">
                  {excelData.sheets.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveSheetIndex(idx)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-t-lg border-b-2 cursor-pointer transition-colors ${
                        activeSheetIndex === idx
                          ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-[#131821]"
                          : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                      }`}
                    >
                      {s.name} ({s.rows.length})
                    </button>
                  ))}
                </div>
              )}

              {/* Table Data */}
              <div className="flex-1 overflow-auto p-4 min-h-0">
                {activeSheet ? (
                  <div className="overflow-x-auto border border-slate-200 dark:border-white/[0.08] rounded-xl">
                    <table className="w-full text-xs text-left border-collapse">
                      {activeSheet.headers && activeSheet.headers.length > 0 && (
                        <thead className="bg-slate-100 dark:bg-white/[0.04] text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-white/[0.08] sticky top-0">
                          <tr>
                            <th className="py-2.5 px-3 font-semibold w-10 text-slate-400 text-center border-r border-slate-200 dark:border-white/[0.08]">
                              #
                            </th>
                            {activeSheet.headers.map((h, i) => (
                              <th key={i} className="py-2.5 px-3 font-semibold border-r border-slate-200 dark:border-white/[0.08] last:border-r-0 whitespace-nowrap">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                      )}
                      <tbody className="divide-y divide-slate-200 dark:divide-white/[0.06] text-slate-800 dark:text-slate-200">
                        {activeSheet.rows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                            <td className="py-2 px-3 text-center text-slate-400 font-mono border-r border-slate-200 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.01]">
                              {rIdx + 1}
                            </td>
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} className="py-2 px-3 border-r border-slate-200 dark:border-white/[0.08] last:border-r-0 whitespace-nowrap">
                                {String(cell ?? "")}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-8">Нет данных для отображения</p>
                )}
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // 2. PRESENTATION CARD
  if (type === "presentation" && presentationData) {
    const handleDownload = () => {
      exportToPresentation(presentationData);
      triggerDownloadSuccess();
    };

    const currentSlide = presentationData.slides[activeSlideIndex] || presentationData.slides[0];

    return (
      <>
        <div className="my-3 rounded-2xl border border-amber-500/25 bg-amber-500/5 dark:bg-amber-500/10 p-4 transition-all hover:border-amber-500/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Presentation className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {presentationData.filename}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Презентация PowerPoint (.pptx) • {presentationData.slides.length} слайдов • Формат 16:9
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/[0.1] hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Смотреть слайды</span>
              </button>

              <button
                type="button"
                onClick={handleDownload}
                className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer shadow-sm"
              >
                {downloadSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Скачано!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>Скачать .pptx</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Presentation Slide Carousel Modal */}
        {isPreviewOpen && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-4xl bg-[#0f172a] border border-white/[0.1] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-white">
              <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between shrink-0 bg-[#0a101d]">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <Presentation className="w-5 h-5 text-amber-400 shrink-0" />
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold truncate text-slate-100">
                      {presentationData.title}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Слайд {activeSlideIndex + 1} из {presentationData.slides.length}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleDownload}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Скачать .pptx</span>
                  </button>
                  <button
                    onClick={() => setIsPreviewOpen(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Active Slide Canvas Preview */}
              <div className="p-8 sm:p-12 flex flex-col justify-center min-h-[380px] bg-gradient-to-br from-[#0f172a] to-[#1e293b] relative">
                {currentSlide && (
                  <div className="max-w-2xl mx-auto w-full space-y-6">
                    <div className="border-l-4 border-sky-400 pl-4">
                      <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                        {currentSlide.title}
                      </h2>
                    </div>

                    {currentSlide.bullets && currentSlide.bullets.length > 0 ? (
                      <ul className="space-y-3 pl-2">
                        {currentSlide.bullets.map((b, idx) => (
                          <li key={idx} className="flex items-start space-x-3 text-slate-200 text-base leading-relaxed">
                            <span className="w-2 h-2 rounded-full bg-sky-400 mt-2 shrink-0" />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    ) : currentSlide.content ? (
                      <p className="text-slate-200 text-base leading-relaxed pl-2 whitespace-pre-wrap">
                        {currentSlide.content}
                      </p>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Navigation controls */}
              <div className="px-6 py-4 border-t border-white/[0.08] bg-[#0a101d] flex items-center justify-between shrink-0">
                <button
                  disabled={activeSlideIndex === 0}
                  onClick={() => setActiveSlideIndex((prev) => Math.max(0, prev - 1))}
                  className="px-3.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-medium flex items-center space-x-1 cursor-pointer transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Предыдущий</span>
                </button>

                <div className="flex space-x-1.5 overflow-x-auto px-2">
                  {presentationData.slides.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveSlideIndex(idx)}
                      className={`w-6 h-6 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                        activeSlideIndex === idx
                          ? "bg-amber-500 text-slate-950 font-bold"
                          : "bg-white/10 text-slate-400 hover:bg-white/20 hover:text-white"
                      }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>

                <button
                  disabled={activeSlideIndex === presentationData.slides.length - 1}
                  onClick={() => setActiveSlideIndex((prev) => Math.min(presentationData.slides.length - 1, prev + 1))}
                  className="px-3.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-medium flex items-center space-x-1 cursor-pointer transition-colors"
                >
                  <span>Следующий</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // 3. DOCUMENT (WORD / PDF) CARD
  if (type === "document" && documentData) {
    const handleDownloadDocx = () => {
      exportToDocx(documentData);
      triggerDownloadSuccess();
    };

    const handlePrintPdf = () => {
      let html = `<p class="lead">${documentData.subtitle || ""}</p>`;
      for (const sec of documentData.sections) {
        if (sec.heading) html += `<h2>${sec.heading}</h2>`;
        if (sec.text) html += `<p>${sec.text}</p>`;
        if (sec.bullets && sec.bullets.length > 0) {
          html += `<ul>${sec.bullets.map((b) => `<li>${b}</li>`).join("")}</ul>`;
        }
        if (sec.table && sec.table.headers.length > 0) {
          html += `<table><thead><tr>${sec.table.headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>`;
          for (const row of sec.table.rows) {
            html += `<tr>${row.map((c) => `<td>${c}</td>`).join("")}</tr>`;
          }
          html += `</tbody></table>`;
        }
      }
      printOrSaveToPdf(documentData.title, html);
    };

    return (
      <>
        <div className="my-3 rounded-2xl border border-sky-500/25 bg-sky-500/5 dark:bg-sky-500/10 p-4 transition-all hover:border-sky-500/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {documentData.filename}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Документ • {documentData.sections.length} раздел(ов) • Доступен экспорт в Word и PDF
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/[0.1] hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Просмотр</span>
              </button>

              <button
                type="button"
                onClick={handlePrintPdf}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer shadow-sm"
                title="Печать и сохранение в векторный PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>В PDF</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadDocx}
                className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer shadow-sm"
              >
                {downloadSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Скачано!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>Скачать .docx</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Document Preview Modal */}
        {isPreviewOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-3xl max-h-[85vh] bg-white dark:bg-[#131821] border border-slate-200 dark:border-white/[0.1] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <FileText className="w-5 h-5 text-sky-500 shrink-0" />
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {documentData.title}
                    </h3>
                    <p className="text-xs text-slate-400">Предварительный просмотр документа</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handlePrintPdf}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>В PDF</span>
                  </button>
                  <button
                    onClick={handleDownloadDocx}
                    className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Скачать .docx</span>
                  </button>
                  <button
                    onClick={() => setIsPreviewOpen(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Document Body */}
              <div className="flex-1 overflow-auto p-6 space-y-6 text-sm text-slate-800 dark:text-slate-200 min-h-0 bg-slate-50/50 dark:bg-[#0c1015]">
                <div className="max-w-2xl mx-auto bg-white dark:bg-[#131821] p-8 rounded-xl border border-slate-200/80 dark:border-white/[0.08] shadow-sm space-y-5">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                      {documentData.title}
                    </h1>
                    {documentData.subtitle && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 italic">
                        {documentData.subtitle}
                      </p>
                    )}
                  </div>

                  <div className="border-t border-slate-100 dark:border-white/[0.06] pt-4 space-y-5">
                    {documentData.sections.map((sec, idx) => (
                      <div key={idx} className="space-y-2">
                        {sec.heading && (
                          <h3 className="text-base font-semibold text-sky-600 dark:text-sky-400">
                            {sec.heading}
                          </h3>
                        )}
                        {sec.text && <p className="leading-relaxed text-xs sm:text-sm">{sec.text}</p>}
                        {sec.bullets && sec.bullets.length > 0 && (
                          <ul className="list-disc list-inside space-y-1 pl-2 text-xs sm:text-sm">
                            {sec.bullets.map((b, bIdx) => (
                              <li key={bIdx}>{b}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
