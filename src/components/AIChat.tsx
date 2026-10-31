"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Paperclip,
  Copy,
  Check,
  Bot,
  User,
  X,
  FileText,
  FileSpreadsheet,
  UploadCloud,
  Printer,
  Download,
  Globe,
  Zap,
  BookOpen,
  ThumbsUp,
  ThumbsDown,
  RotateCw,
  Mic,
  MicOff,
  AlertCircle,
  Calendar,
  Mail,
  Sparkles,
  Sliders,
  CheckCircle2,
  Trash2,
  Wrench,
  SearchCheck,
  Radio,
} from "lucide-react";
import { VoiceLiveModal } from "@/components/VoiceLiveModal";
import { ChatMessage, ChatActionPayload } from "@/lib/supabase";
import { MarkdownView } from "@/components/MarkdownView";
import { useChat } from "@/lib/chat-context";
import { useAuth } from "@/lib/auth-context";
import { useBusiness } from "@/lib/business-context";
import { parseUploadedFile, downloadUploadedFile } from "@/lib/file-parser";
import { tryRepairAndParseJson } from "@/lib/json-repair";
import {
  exportToExcel,
  exportToDocx,
  printOrSaveToPdf,
  extractMarkdownTables,
} from "@/lib/file-generator";

interface AttachedFile {
  id: string;
  name: string;
  type: "image" | "pdf" | "excel" | "word" | "text" | string;
  size: string;
  previewUrl?: string;
  content?: string;
}

const renderActionDetails = (details?: string | Record<string, any>) => {
  if (!details) return "";
  return typeof details === "string" ? details : JSON.stringify(details);
};

const ActionCardView: React.FC<{ action: ChatActionPayload }> = ({ action }) => {
  if (action.type === "CALENDAR_CREATED") {
    return (
      <div className="flex items-start space-x-3 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-950 dark:text-emerald-200 shadow-2xs my-2">
        <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
          <Calendar className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Событие добавлено в Календарь</span>
          </div>
          <div className="text-sm font-bold text-zinc-900 dark:text-white truncate mt-0.5">
            {action.title}
          </div>
          {action.details && (
            <div className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5">
              📅 {renderActionDetails(action.details)}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (action.type === "CALENDAR_UPDATED") {
    return (
      <div className="flex items-start space-x-3 p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-950 dark:text-sky-200 shadow-2xs my-2">
        <div className="p-2 rounded-xl bg-sky-500/20 text-sky-600 dark:text-sky-400 shrink-0">
          <RotateCw className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Событие перенесено в Календаре</span>
          </div>
          <div className="text-sm font-bold text-zinc-900 dark:text-white truncate mt-0.5">
            {action.title}
          </div>
          {action.details && (
            <div className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5">
              🕒 {renderActionDetails(action.details)}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (action.type === "CALENDAR_DELETED") {
    return (
      <div className="flex items-start space-x-3 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-950 dark:text-rose-200 shadow-2xs my-2">
        <div className="p-2 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 shrink-0">
          <Trash2 className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Событие удалено из Календаря</span>
          </div>
          <div className="text-sm font-bold text-zinc-900 dark:text-white truncate mt-0.5">
            {action.title}
          </div>
        </div>
      </div>
    );
  }

  if (action.type === "MAIL_DRAFT_CREATED") {
    return (
      <div className="flex items-start space-x-3 p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-950 dark:text-purple-200 shadow-2xs my-2">
        <div className="p-2 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-400 shrink-0">
          <Mail className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Черновик сохранен в «Умной почте»</span>
          </div>
          <div className="text-sm font-bold text-zinc-900 dark:text-white truncate mt-0.5">
            {action.title}
          </div>
          {action.details && (
            <div className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5 truncate">
              ✉️ Тема: {renderActionDetails(action.details)}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (action.type === "NOTE_SAVED") {
    return (
      <div className="flex items-start space-x-3 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-950 dark:text-amber-200 shadow-2xs my-2">
        <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Заметка сохранена в долгосрочную память</span>
          </div>
          <div className="text-sm font-bold text-zinc-900 dark:text-white truncate mt-0.5">
            {action.title}
          </div>
          {action.details && (
            <div className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5 whitespace-pre-wrap">
              📌 {renderActionDetails(action.details)}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (action.type === "PROJECT_SECTION_UPDATED") {
    return (
      <div className="flex items-start space-x-3 p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-950 dark:text-indigo-200 shadow-2xs my-2">
        <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 shrink-0">
          <Sliders className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Параметры переданы в модуль «Проектирование»</span>
          </div>
          <div className="text-sm font-bold text-zinc-900 dark:text-white truncate mt-0.5">
            {action.title}
          </div>
          {action.details && (
            <div className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5">
              🏗️ {renderActionDetails(action.details)}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (action.type === "REPAIR_ORDER_CREATED") {
    return (
      <div className="flex items-start space-x-3 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-950 dark:text-rose-200 shadow-2xs my-2">
        <div className="p-2 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 shrink-0">
          <Wrench className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Заказ-наряд оформлен и сохранен в базе СТО</span>
          </div>
          <div className="text-sm font-bold text-zinc-900 dark:text-white truncate mt-0.5">
            {action.title}
          </div>
          {action.details && (
            <div className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5">
              🔧 {renderActionDetails(action.details)}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (action.type === "PARTS_PROCUREMENT_QUOTE") {
    const qData = action.data;
    return (
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-red-500/10 via-amber-500/10 to-orange-500/10 border border-red-500/30 text-zinc-900 dark:text-zinc-100 shadow-2xs my-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-red-500/20 text-red-500 shrink-0">
              <SearchCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-red-500 flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>ИИ-Проценка поставщиков автозапчастей</span>
              </div>
              <div className="text-sm font-bold mt-0.5">{action.title}</div>
            </div>
          </div>
          {qData?.oem && (
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-black/5 dark:bg-white/10 text-zinc-600 dark:text-zinc-300">
              OEM: {qData.oem}
            </span>
          )}
        </div>
        {action.details && (
          <div className="text-xs text-zinc-600 dark:text-zinc-300 mt-2">
            📦 {renderActionDetails(action.details)}
          </div>
        )}
        {Array.isArray(qData?.quotes) && qData.quotes.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 pt-3 border-t border-zinc-200/50 dark:border-white/[0.08]">
            {qData.quotes.map((q: any, i: number) => (
              <div key={i} className="p-2.5 rounded-xl bg-white/70 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.06] text-xs">
                <div className="flex items-center justify-between font-bold text-zinc-800 dark:text-zinc-200">
                  <span>{q.brand}</span>
                  <span className="text-red-500 font-mono">
                    {(q.clientPrice || q.purchasePrice || 0).toLocaleString()} ₽
                  </span>
                </div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                  {q.supplierName || "Поставщик"} • {q.deliveryDays === 0 ? "Сегодня" : `${q.deliveryDays} дн.`}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
};

export const AIChat: React.FC = () => {
  const { user } = useAuth();
  const { activeSession, setSessionMessages } = useChat();
  const { currentBusiness } = useBusiness();
  const isChaika = currentBusiness === "chaika-service";

  const [inputPrompt, setInputPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Drag and Drop & file upload state
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const dragCounter = useRef(0);

  // Voice Speech-to-Text State
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const baseTextRef = useRef<string>("");

  // Quick mode toggles
  const [styleMode, setStyleMode] = useState<"normal" | "brief" | "detailed">("normal");
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);

  // Attached files/images
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasUserMessages = activeSession?.messages?.some((m) => m.role === "user");

  useEffect(() => {
    if (hasUserMessages) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeSession?.messages, isLoading, hasUserMessages]);

  // Clean up speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // Live Voice Mode («Моя волна» / Hands-Free)
  const [isVoiceLiveOpen, setIsVoiceLiveOpen] = useState(false);

  // Voice input toggle (Speech-to-Text with ru-RU)
  const toggleVoiceInput = () => {
    if (typeof window === "undefined") return;

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setSpeechError("Голосовой ввод не поддерживается данным браузером. Рекомендуется использовать Chrome, Edge или Safari.");
      setTimeout(() => setSpeechError(null), 5000);
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.lang = "ru-RU";
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      baseTextRef.current = inputPrompt.trim();

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        const fullText = baseTextRef.current
          ? `${baseTextRef.current} ${transcript.trim()}`
          : transcript.trim();

        setInputPrompt(fullText);

        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
          textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 220)}px`;
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setSpeechError("Доступ к микрофону заблокирован. Пожалуйста, разрешите доступ в настройках браузера.");
        } else if (event.error === "no-speech") {
          return;
        } else {
          setSpeechError(`Ошибка распознавания речи: ${event.error}`);
        }
        setIsListening(false);
        setTimeout(() => setSpeechError(null), 5000);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Speech recognition startup error:", err);
      setSpeechError("Не удалось запустить микрофон. Проверьте разрешения браузера.");
      setIsListening(false);
      setTimeout(() => setSpeechError(null), 5000);
    }
  };

  // Process uploaded files with smart parser (PDF, Excel, Word, Images, Text)
  const processFiles = async (files: FileList | File[]) => {
    const fileList = Array.from(files);
    if (fileList.length === 0) return;
    setIsProcessingFiles(true);
    try {
      const parsedResults = await Promise.all(fileList.map((f) => parseUploadedFile(f)));
      setAttachedFiles((prev) => [
        ...prev,
        ...parsedResults.map((p) => ({
          id: p.id,
          name: p.name,
          type: p.type,
          size: p.size,
          previewUrl: p.previewUrl,
          content: p.extractedText,
        })),
      ]);

      // Automatically preserve uploaded file in the user's isolated Electronic Archive
      if (user?.username) {
        const username = user.username.trim().toLowerCase();
        const storageKey = `geo_ai_archive_${username}_v1`;
        try {
          const existingRaw = localStorage.getItem(storageKey);
          const existing = existingRaw ? JSON.parse(existingRaw) : [];
          const newArchiveItems = parsedResults.map((p) => ({
            id: `arch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: p.name,
            category: p.type === "excel" ? "table_calc" : "license",
            fileType: p.type === "image" ? "image" : p.type === "excel" ? "excel" : p.type === "word" ? "word" : "pdf",
            size: p.size,
            source: "chat_upload",
            createdAt: new Date().toISOString().slice(0, 10),
            url: p.previewUrl,
            content: p.extractedText,
            username,
            metadata: {
              description: `Файл прикреплен пользователем в чате с ИИ`,
              tags: ["Чат", "Вложение"],
            },
          }));

          const updatedArchive = [...newArchiveItems, ...(Array.isArray(existing) ? existing : [])];
          localStorage.setItem(storageKey, JSON.stringify(updatedArchive));
          window.dispatchEvent(new Event("geo_ai_archive_updated"));

          // Sync to Supabase in background
          newArchiveItems.forEach((item) => {
            fetch("/api/sync", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "save_archive_file",
                username,
                payload: item,
              }),
            }).catch(() => {});
          });
        } catch (e) {
          console.warn("Error auto-saving uploaded files to archive:", e);
        }
      }
    } catch (err) {
      console.error("Error parsing uploaded files:", err);
    } finally {
      setIsProcessingFiles(false);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      setIsDraggingOver(false);
      dragCounter.current = 0;
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    dragCounter.current = 0;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      e.preventDefault();
      processFiles(e.clipboardData.files);
    }
  };

  const removeAttachment = (id: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSend = async (textToSend?: string) => {
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
    }

    const text = (textToSend !== undefined ? textToSend : inputPrompt).trim();
    if ((!text && attachedFiles.length === 0) || isLoading || !activeSession) return;

    const msgAttachments = attachedFiles.map((f) => ({
      name: f.name,
      type: f.type,
      previewUrl: f.previewUrl,
    }));

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: text || (attachedFiles.length > 0 ? "Проанализируй прикрепленные файлы" : ""),
      created_at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      attachments: msgAttachments.length > 0 ? msgAttachments : undefined,
    };

    const isFirstUserMsg = !hasUserMessages;
    const newTitle = isFirstUserMsg
      ? text
        ? text.slice(0, 32) + (text.length > 32 ? "..." : "")
        : attachedFiles[0]?.name || "Новый диалог"
      : undefined;

    const currentMessages = activeSession.messages || [];
    const updatedMessages = [...currentMessages, userMsg];

    setSessionMessages(activeSession.id, updatedMessages, newTitle);

    const imagesPayload = attachedFiles
      .filter((f) => f.type === "image" && f.previewUrl)
      .map((f) => f.previewUrl as string);

    const textAttachmentsPayload = attachedFiles
      .filter((f) => f.type !== "image" && f.content)
      .map((f) => ({ name: f.name, content: f.content as string, type: f.type }));

    setInputPrompt("");
    setAttachedFiles([]);
    setIsLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const storedKey = typeof window !== "undefined" ? localStorage.getItem("geonedra_openrouter_key") : null;
      const storedModel = typeof window !== "undefined" ? localStorage.getItem("geonedra_openrouter_model") : null;

      const res = await fetch("/api/legal-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
          userMessage: text,
          userName: user?.name,
          username: user?.username,
          userId: user?.username,
          apiKey: storedKey || undefined,
          model: storedModel || undefined,
          mode: styleMode,
          webSearch: webSearchEnabled,
          images: imagesPayload,
          attachments: textAttachmentsPayload,
          businessMode: currentBusiness,
        }),
      });

      const data = await res.json();
      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: "assistant",
        content: data.content || "Ответ сформирован.",
        created_at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        actions: data.actions && Array.isArray(data.actions) && data.actions.length > 0 ? data.actions : undefined,
      };

      setSessionMessages(activeSession.id, [...updatedMessages, assistantMsg]);

      // Auto-archive generated files from assistant response
      if (data.content && typeof data.content === "string") {
        const fileBlockRegex = /```(?:file:)?([a-zA-Z0-9_\-]+)\s*([\s\S]*?)```/gi;
        let match;
        const currentUsername = user?.username ? user.username.trim().toLowerCase() : "";
        while ((match = fileBlockRegex.exec(data.content)) !== null) {
          const rawType = match[1].toLowerCase().replace("file:", "").trim();
          if (["excel", "presentation", "document", "docx", "pdf", "xlsx", "pptx"].includes(rawType)) {
            const jsonContent = match[2].trim();
            const parsed = tryRepairAndParseJson(jsonContent);
            const title = parsed?.title || parsed?.filename || "Сгенерированный документ";
            const isExcel = rawType === "excel" || rawType === "xlsx" || parsed?.sheets;
            const isPptx = rawType === "presentation" || rawType === "pptx" || parsed?.slides;
            const filename = title.includes(".")
              ? title
              : isExcel
              ? `${title}.xlsx`
              : isPptx
              ? `${title}.pptx`
              : `${title}.docx`;

            const archiveItem = {
              id: `arch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              name: filename,
              category: isExcel ? ("table_calc" as const) : ("project_doc" as const),
              fileType: isExcel ? ("excel" as const) : isPptx ? ("presentation" as const) : ("word" as const),
              size: "1.5 МБ",
              source: "chat_generated" as const,
              createdAt: new Date().toISOString().slice(0, 10),
              rawContent: parsed,
              username: currentUsername,
              metadata: {
                description: parsed?.subtitle || "Документ сгенерирован ИИ-ассистентом в чате",
                tags: ["ИИ", "Чат", isExcel ? "Таблица" : "Проект"],
              },
            };

            const archKey = `geo_ai_archive_${currentUsername || "guest"}_v1`;
            try {
              const existingRaw = localStorage.getItem(archKey);
              const existing = existingRaw ? JSON.parse(existingRaw) : [];
              localStorage.setItem(archKey, JSON.stringify([archiveItem, ...(Array.isArray(existing) ? existing : [])]));
              window.dispatchEvent(new Event("geo_ai_archive_updated"));
            } catch {}

            if (currentUsername) {
              fetch("/api/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "save_archive_file",
                  username: currentUsername,
                  payload: archiveItem,
                }),
              }).catch(() => {});
            }
          }
        }
      }

      // Synchronize local caches and notify other CRM modules immediately
      if (data.actions && Array.isArray(data.actions) && data.actions.length > 0) {
        const currentUsername = user?.username ? user.username.trim().toLowerCase() : "";
        data.actions.forEach((act: ChatActionPayload) => {
          if ((act.type === "CALENDAR_CREATED" || act.type === "CALENDAR_UPDATED") && act.data) {
            const calKey = `geo_ai_calendar_events_${currentUsername || "guest"}_v4`;
            try {
              const raw = localStorage.getItem(calKey);
              const existing = raw ? JSON.parse(raw) : [];
              const merged = [act.data, ...existing.filter((e: any) => e.id !== act.data.id)];
              localStorage.setItem(calKey, JSON.stringify(merged));
            } catch {}
            window.dispatchEvent(new CustomEvent("geo_ai_calendar_updated", { detail: act.data }));
          } else if (act.type === "CALENDAR_DELETED" && act.data) {
            const calKey = `geo_ai_calendar_events_${currentUsername || "guest"}_v4`;
            try {
              const raw = localStorage.getItem(calKey);
              const existing = raw ? JSON.parse(raw) : [];
              const filtered = existing.filter((e: any) => e.id !== act.data.id);
              localStorage.setItem(calKey, JSON.stringify(filtered));
            } catch {}
            window.dispatchEvent(new CustomEvent("geo_ai_calendar_updated", { detail: act.data }));
          } else if (act.type === "PROJECT_SECTION_UPDATED" && act.data) {
            const projKey = `geo_ai_project_categories_${currentUsername || "guest"}_v3`;
            try {
              const raw = localStorage.getItem(projKey);
              if (raw) {
                const cats = JSON.parse(raw);
                if (Array.isArray(cats)) {
                  const secCode = act.data.sectionCode;
                  const updatedCats = cats.map((cat: any) => ({
                    ...cat,
                    subsections: cat.subsections.map((sub: any) => {
                      if (sub.code === secCode || sub.title?.includes(secCode)) {
                        return {
                          ...sub,
                          parameters: { ...(sub.parameters || {}), ...(act.data.parameters || {}) },
                          status: "AI_DRAFT",
                        };
                      }
                      return sub;
                    }),
                  }));
                  localStorage.setItem(projKey, JSON.stringify(updatedCats));
                }
              }
            } catch {}
            window.dispatchEvent(new CustomEvent("geo_ai_project_updated", { detail: act.data }));
          } else if (act.type === "MAIL_DRAFT_CREATED") {
            window.dispatchEvent(new CustomEvent("geo_ai_mail_updated", { detail: act.data }));
          } else if (act.type === "NOTE_SAVED") {
            window.dispatchEvent(new CustomEvent("geo_ai_note_updated", { detail: act.data }));
          }
        });
      }
    } catch (err) {
      console.error("Chat error:", err);
      const fallbackMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: "assistant",
        content: "⚠️ Не удалось связаться с сервером. Пожалуйста, проверьте подключение к сети и настройки API-ключа.",
        created_at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setSessionMessages(activeSession.id, [...updatedMessages, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceLiveSend = async (text: string): Promise<string> => {
    if (!text.trim() || !activeSession) return "";

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: text.trim(),
      created_at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const currentMessages = activeSession.messages || [];
    const updatedMessages = [...currentMessages, userMsg];
    setSessionMessages(activeSession.id, updatedMessages);

    try {
      const storedKey = typeof window !== "undefined" ? localStorage.getItem("geonedra_openrouter_key") : null;
      const storedModel = typeof window !== "undefined" ? localStorage.getItem("geonedra_openrouter_model") : null;

      const res = await fetch("/api/legal-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
          userMessage: text.trim(),
          userName: user?.name,
          username: user?.username,
          apiKey: storedKey || undefined,
          model: storedModel || undefined,
          businessMode: currentBusiness,
          voiceMode: true,
        }),
      });

      const data = await res.json();
      const content = data.content || "Извините, не удалось сформировать ответ.";

      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: "assistant",
        content,
        created_at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        actions: data.actions && Array.isArray(data.actions) && data.actions.length > 0 ? data.actions : undefined,
      };

      setSessionMessages(activeSession.id, [...updatedMessages, assistantMsg]);

      // Strip code blocks and action tags for smooth speech
      const cleanVoiceText = content
        .replace(/```[\s\S]*?```/g, "")
        .replace(/#+\s*/g, "")
        .replace(/[*_`]/g, "")
        .trim();

      return cleanVoiceText || "Действие успешно выполнено.";
    } catch (e) {
      console.error("Live voice dialogue error:", e);
      return "Ошибка связи с сервером. Пожалуйста, повторите фразу.";
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputPrompt(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 220)}px`;
  };

  const renderFileChip = (file: AttachedFile) => {
    return (
      <div
        key={file.id}
        className="group relative flex items-center space-x-2.5 rounded-xl bg-white dark:bg-[#1a212d] border border-zinc-200 dark:border-white/[0.1] px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 shadow-2xs"
      >
        {file.type === "image" && file.previewUrl ? (
          <img
            src={file.previewUrl}
            alt={file.name}
            className="w-7 h-7 object-cover rounded-lg shrink-0"
          />
        ) : file.type === "excel" ? (
          <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
        ) : file.type === "pdf" ? (
          <div className="w-7 h-7 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4" />
          </div>
        ) : file.type === "word" ? (
          <div className="w-7 h-7 rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4" />
          </div>
        ) : (
          <div className="w-7 h-7 rounded-lg bg-zinc-500/15 text-zinc-500 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4" />
          </div>
        )}
        <div className="flex flex-col min-w-0 pr-4">
          <span className="truncate max-w-[130px] font-medium">{file.name}</span>
          <span className="text-[10px] text-zinc-400">
            {file.type === "excel" ? "Excel" : file.type === "pdf" ? "PDF" : file.type === "word" ? "Word" : file.size} • {file.size}
          </span>
        </div>
        <button
          type="button"
          onClick={() => removeAttachment(file.id)}
          className="absolute right-1 top-1 text-zinc-400 hover:text-rose-500 p-0.5 rounded-full transition-colors cursor-pointer"
          title="Удалить"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="flex-1 flex flex-col h-full overflow-hidden bg-white/60 dark:bg-transparent backdrop-blur-xs transition-colors relative"
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.txt,.md,.csv,.json,.js,.ts,.tsx,.jsx,.py,.html,.css,.sql,.doc,.docx,.xls,.xlsx,.pdf"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Drag & Drop Visual Glow Overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-50 bg-sky-500/10 dark:bg-sky-500/20 backdrop-blur-xs border-2 border-dashed border-sky-500 m-3 rounded-3xl flex flex-col items-center justify-center p-6 transition-all pointer-events-none shadow-2xl animate-in fade-in duration-150">
          <div className="w-16 h-16 rounded-2xl bg-sky-500/20 border border-sky-500/40 text-sky-500 dark:text-sky-400 flex items-center justify-center mb-4 shadow-lg animate-bounce">
            <UploadCloud className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-1.5">
            Перетащите файлы сюда
          </h3>
          <p className="text-xs text-zinc-600 dark:text-zinc-300 text-center max-w-sm mb-4">
            Полноценное распознавание PDF, таблиц Excel, документов Word, картинок и текстовых файлов
          </p>
          <div className="flex flex-wrap justify-center gap-2 text-[11px]">
            <span className="px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400 font-medium">📄 PDF</span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-medium">📊 Excel (.xlsx, .csv)</span>
            <span className="px-2.5 py-1 rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400 font-medium">📑 Word (.docx)</span>
            <span className="px-2.5 py-1 rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400 font-medium">🖼️ Картинки</span>
          </div>
        </div>
      )}

      {/* File processing progress indicator */}
      {isProcessingFiles && (
        <div className="absolute top-4 right-6 z-40 flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-600 dark:text-sky-400 text-xs shadow-md backdrop-blur-xs animate-pulse">
          <div className="w-3.5 h-3.5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          <span>Считывание и разбор файлов...</span>
        </div>
      )}

      {/* Gentle speech error notice */}
      {speechError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center space-x-2 px-4 py-2.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs shadow-lg backdrop-blur-xs transition-all">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{speechError}</span>
          <button
            onClick={() => setSpeechError(null)}
            className="p-0.5 rounded-full hover:bg-rose-500/20 text-rose-500 ml-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* CASE 1: EMPTY / NEW CHAT STATE (Gemini / ChatGPT aesthetic with glowing ambient gradient) */}
      {!hasUserMessages ? (
        <div
          className={`flex-1 flex flex-col items-center justify-center px-4 overflow-y-auto relative ${
            isChaika
              ? "bg-[radial-gradient(ellipse_70%_50%_at_50%_35%,rgba(239,68,68,0.1),transparent_75%)] dark:bg-[radial-gradient(ellipse_75%_55%_at_50%_35%,rgba(239,68,68,0.14),transparent_75%)]"
              : "bg-[radial-gradient(ellipse_70%_50%_at_50%_35%,rgba(14,165,233,0.09),transparent_75%)] dark:bg-[radial-gradient(ellipse_75%_55%_at_50%_35%,rgba(14,165,233,0.12),transparent_75%)]"
          }`}
        >
          <div className="w-full max-w-xl flex flex-col items-center text-center -mt-6">
            <h1 className="text-3xl sm:text-4xl font-medium tracking-tight text-zinc-800 dark:text-zinc-100 mb-8 select-none">
              {isChaika
                ? user?.name
                  ? `${user.name}, чем могу помочь по автосервису?`
                  : "Шеф-мастер СТО Чайка-Сервис"
                : user?.name
                ? `${user.name}, чем я могу помочь?`
                : "Чем я могу помочь сегодня?"}
            </h1>

            {/* Central Narrower Rounded Pill Input Box */}
            <div
              className={`w-full relative rounded-3xl bg-white/80 dark:bg-zinc-900/70 backdrop-blur-2xl border transition-all text-left shadow-lg ${
                isChaika
                  ? "shadow-rose-950/5 dark:shadow-2xl dark:shadow-rose-950/20"
                  : "shadow-sky-950/5 dark:shadow-2xl dark:shadow-sky-950/20"
              } ${
                isListening
                  ? "border-rose-500/70 ring-4 ring-rose-500/20"
                  : isChaika
                  ? "border-black/[0.06] dark:border-white/[0.09] focus-within:border-white/20 focus-within:ring-4 focus-within:ring-rose-500/10"
                  : "border-black/[0.06] dark:border-white/[0.09] focus-within:border-white/20 focus-within:ring-4 focus-within:ring-sky-500/10"
              }`}
            >
              {/* Voice recording live indicator */}
              {isListening && (
                <div className="px-5 pt-3 flex items-center space-x-2 text-xs font-medium text-rose-500 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <span>Идет запись голоса (ru-RU)... Говорите в микрофон</span>
                </div>
              )}

              {/* Attached files chips inside input box */}
              {attachedFiles.length > 0 && (
                <div className="px-5 pt-3 flex flex-wrap gap-2">
                  {attachedFiles.map((file) => renderFileChip(file))}
                </div>
              )}

              <textarea
                ref={textareaRef}
                value={inputPrompt}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder={
                  isListening
                    ? "Слушаю вас..."
                    : isChaika
                    ? "Спросите шеф-мастера СТО или продиктуйте заказ-наряд..."
                    : "Спросите что-нибудь или надиктуйте запрос..."
                }
                rows={2}
                className="w-full pt-4 pb-12 px-5 bg-transparent text-[15px] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none resize-none max-h-48 leading-relaxed"
              />

              <div className="absolute left-3.5 right-3.5 bottom-2.5 flex items-center justify-between pointer-events-none">
                <div className="flex items-center space-x-1 pointer-events-auto">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-white/[0.06] transition-colors flex items-center space-x-1 cursor-pointer"
                    title="Прикрепить файл или фото"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                </div>

                <div className="pointer-events-auto flex items-center space-x-2">
                  {/* Live Voice Mode Pill button */}
                  <button
                    type="button"
                    onClick={() => setIsVoiceLiveOpen(true)}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full transition-all text-xs font-semibold cursor-pointer ${
                      isChaika
                        ? "bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400"
                        : "bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-400"
                    }`}
                    title="Живой непрерывный голосовой диалог (Live)"
                  >
                    <Radio className="w-3.5 h-3.5 animate-pulse" />
                    <span>Live</span>
                  </button>

                  {/* Microphone Button (Speech-to-Text) */}
                  <button
                    type="button"
                    onClick={toggleVoiceInput}
                    className={`p-2 rounded-full transition-all cursor-pointer ${
                      isListening
                        ? "bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/25 ring-2 ring-rose-400/50"
                        : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-white/[0.06]"
                    }`}
                    title={isListening ? "Остановить запись голоса" : "Голосовой ввод (Speech-to-Text ru-RU)"}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSend()}
                    disabled={(!inputPrompt.trim() && attachedFiles.length === 0) || isLoading}
                    className={`p-2 rounded-full transition-all cursor-pointer ${
                      (inputPrompt.trim() || attachedFiles.length > 0) && !isLoading
                        ? isChaika
                          ? "bg-rose-500 hover:bg-rose-600 text-white shadow-2xs"
                          : "bg-zinc-900 dark:bg-sky-500 text-white dark:text-zinc-950 hover:opacity-90 shadow-2xs"
                        : "bg-zinc-200 dark:bg-white/[0.08] text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
                    }`}
                    title="Отправить"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Pills (Pure rounded-full capsules, Screen 3 Gemini style) */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-5 max-w-xl">
              {isChaika ? (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      handleSend(
                        "Открой заказ-наряд на ТО ГАЗель NEXT А123ВС777: замена масла в ДВС и передних тормозных колодок"
                      )
                    }
                    className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full text-xs border bg-white/80 dark:bg-white/[0.04] hover:dark:bg-white/[0.09] backdrop-blur-md border-black/[0.06] dark:border-white/[0.07] text-zinc-700 dark:text-zinc-200 hover:border-rose-500/50 hover:text-rose-500 transition-all cursor-pointer shadow-2xs"
                  >
                    <Wrench className="w-3.5 h-3.5 text-rose-500" />
                    <span>Оформить заказ-наряд</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleSend(
                        "Рассчитай нормо-часы и стоимость ремонта КамАЗ 65115: замена корзины сцепления и выжимного подшипника"
                      )
                    }
                    className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full text-xs border bg-white/80 dark:bg-white/[0.04] hover:dark:bg-white/[0.09] backdrop-blur-md border-black/[0.06] dark:border-white/[0.07] text-zinc-700 dark:text-zinc-200 hover:border-rose-500/50 hover:text-rose-500 transition-all cursor-pointer shadow-2xs"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-rose-500" />
                    <span>Нормо-часы КамАЗ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleSend(
                        "Подготовь дефектовочную ведомость для проверки передней подвески и рулевого управления ГАЗель NEXT"
                      )
                    }
                    className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full text-xs border bg-white/80 dark:bg-white/[0.04] hover:dark:bg-white/[0.09] backdrop-blur-md border-black/[0.06] dark:border-white/[0.07] text-zinc-700 dark:text-zinc-200 hover:border-rose-500/50 hover:text-rose-500 transition-all cursor-pointer shadow-2xs"
                  >
                    <FileText className="w-3.5 h-3.5 text-rose-500" />
                    <span>Дефектовка подвески</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWebSearchEnabled((prev) => !prev)}
                    className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-full text-xs border transition-all cursor-pointer shadow-2xs ${
                      webSearchEnabled
                        ? "bg-rose-500/15 border-rose-500/50 text-rose-600 dark:text-rose-400 font-medium"
                        : "bg-white/80 dark:bg-white/[0.04] hover:dark:bg-white/[0.09] backdrop-blur-md border-black/[0.06] dark:border-white/[0.07] text-zinc-700 dark:text-zinc-200 hover:border-rose-500/40 hover:text-rose-500"
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5 text-rose-500" />
                    <span>Поиск регламентов</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setWebSearchEnabled((prev) => !prev)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-full text-xs border transition-all cursor-pointer shadow-2xs ${
                      webSearchEnabled
                        ? "bg-sky-500/15 border-sky-500/50 text-sky-600 dark:text-sky-400 font-medium"
                        : "bg-white/80 dark:bg-white/[0.04] hover:dark:bg-white/[0.09] backdrop-blur-md border-black/[0.06] dark:border-white/[0.07] text-zinc-700 dark:text-zinc-200 hover:border-sky-500/40 hover:text-sky-600 dark:hover:text-sky-400"
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5 text-sky-500" />
                    <span>Поиск в сети</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStyleMode((prev) => (prev === "brief" ? "normal" : "brief"))}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-full text-xs border transition-all cursor-pointer shadow-2xs ${
                      styleMode === "brief"
                        ? "bg-sky-500/15 border-sky-500/50 text-sky-600 dark:text-sky-400 font-medium"
                        : "bg-white/80 dark:bg-white/[0.04] hover:dark:bg-white/[0.09] backdrop-blur-md border-black/[0.06] dark:border-white/[0.07] text-zinc-700 dark:text-zinc-200 hover:border-sky-500/40 hover:text-sky-600 dark:hover:text-sky-400"
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5 text-sky-500" />
                    <span>Краткий ответ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStyleMode((prev) => (prev === "detailed" ? "normal" : "detailed"))}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-full text-xs border transition-all cursor-pointer shadow-2xs ${
                      styleMode === "detailed"
                        ? "bg-sky-500/15 border-sky-500/50 text-sky-600 dark:text-sky-400 font-medium"
                        : "bg-white/80 dark:bg-white/[0.04] hover:dark:bg-white/[0.09] backdrop-blur-md border-black/[0.06] dark:border-white/[0.07] text-zinc-700 dark:text-zinc-200 hover:border-sky-500/40 hover:text-sky-600 dark:hover:text-sky-400"
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5 text-sky-500" />
                    <span>Развернутый анализ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center space-x-2 px-4 py-2 rounded-full text-xs border bg-white/80 dark:bg-white/[0.04] hover:dark:bg-white/[0.09] backdrop-blur-md border-black/[0.06] dark:border-white/[0.07] text-zinc-700 dark:text-zinc-200 hover:border-sky-500/40 hover:text-sky-600 dark:hover:text-sky-400 shadow-2xs transition-all cursor-pointer"
                  >
                    <Paperclip className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Анализ файлов и фото</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* CASE 2: ACTIVE DIALOGUE (Centered stream + floating bottom bar) */
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Scrollable messages container */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 py-8 space-y-7">
              {activeSession.messages
                .filter((msg) => {
                  // In active dialogue, NEVER render welcome greetings
                  const isWelcome =
                    msg.id?.startsWith("msg-welcome-") ||
                    msg.content?.includes("Я интеллектуальный помощник системы") ||
                    msg.content?.includes("Я — Шеф-мастер СТО");
                  return !isWelcome;
                })
                .map((msg) => {
                const isAssistant = msg.role === "assistant";
                return (
                  <div
                    key={msg.id}
                    className={`flex space-x-4 ${
                      isAssistant ? "justify-start" : "justify-end"
                    }`}
                  >
                    {isAssistant && (
                      <div
                        className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 mt-1 ${
                          isChaika
                            ? "bg-rose-500/10 border-rose-500/20 text-rose-500 dark:text-rose-400"
                            : "bg-sky-500/10 border border-sky-500/20 text-sky-500 dark:text-sky-400"
                        }`}
                      >
                        {isChaika ? <Wrench className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                      </div>
                    )}

                    <div
                      className={`group relative rounded-2xl px-4 py-3.5 max-w-2xl text-[15px] leading-relaxed ${
                        isAssistant
                          ? "bg-transparent text-zinc-900 dark:text-zinc-100 w-full"
                          : "bg-zinc-900 dark:bg-[#18212e] border border-transparent dark:border-white/[0.06] text-white dark:text-zinc-100"
                      }`}
                    >
                      {/* Attached files preview in user message */}
                      {!isAssistant && msg.attachments && msg.attachments.length > 0 && (
                        <div className="mb-2.5 flex flex-wrap gap-2">
                          {msg.attachments.map((att, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => downloadUploadedFile({ name: att.name, previewUrl: att.previewUrl })}
                              className="flex items-center space-x-2 rounded-xl bg-black/30 hover:bg-black/50 px-3 py-1.5 text-xs text-zinc-200 border border-white/10 hover:border-white/25 transition-all cursor-pointer group/att"
                              title="Нажмите, чтобы скачать файл"
                            >
                              {att.type === "image" && att.previewUrl ? (
                                <img
                                  src={att.previewUrl}
                                  alt={att.name}
                                  className="w-10 h-10 object-cover rounded-lg"
                                />
                              ) : att.type === "excel" ? (
                                <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                              ) : att.type === "pdf" ? (
                                <FileText className="w-4 h-4 text-rose-400 shrink-0" />
                              ) : att.type === "word" ? (
                                <FileText className="w-4 h-4 text-sky-400 shrink-0" />
                              ) : (
                                <FileText className="w-4 h-4 text-zinc-400 shrink-0" />
                              )}
                              <span className="max-w-[170px] truncate">{att.name}</span>
                              <Download className="w-3.5 h-3.5 text-zinc-400 group-hover/att:text-white transition-colors ml-1 shrink-0" />
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Action Cards (CRM Function Calling visual badges) */}
                      {isAssistant && msg.actions && msg.actions.length > 0 && (
                        <div className="mb-3 space-y-2">
                          {msg.actions.map((act, aIdx) => (
                            <ActionCardView key={aIdx} action={act} />
                          ))}
                        </div>
                      )}

                      {isAssistant ? (
                        <MarkdownView content={msg.content} />
                      ) : (
                        <div className="whitespace-pre-wrap leading-relaxed">
                          {msg.content}
                        </div>
                      )}

                      {/* Action buttons under assistant message */}
                      {isAssistant && (
                        <div className="mt-3 pt-1 flex flex-wrap items-center gap-1.5 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleCopy(msg.id, msg.content)}
                            className="p-1 rounded hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                            title="Копировать"
                          >
                            {copiedId === msg.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            className="p-1 rounded hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                            title="Хороший ответ"
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            className="p-1 rounded hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                            title="Плохой ответ"
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleSend(activeSession.messages.filter(m => m.role === "user").slice(-1)[0]?.content)}
                            className="p-1 rounded hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                            title="Перегенерировать"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                          </button>

                          <div className="h-3 w-px bg-zinc-300 dark:bg-white/10 mx-1" />

                          {/* 1-click Export to PDF */}
                          <button
                            onClick={() => printOrSaveToPdf("Документ Geo AI", msg.content.replace(/\n/g, "<br/>"))}
                            className="px-2 py-0.5 rounded text-[11px] text-zinc-500 dark:text-zinc-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center space-x-1 cursor-pointer font-medium"
                            title="Печать или сохранение в PDF"
                          >
                            <Printer className="w-3 h-3" />
                            <span>PDF</span>
                          </button>

                          {/* 1-click Export to Word */}
                          <button
                            onClick={() => exportToDocx({
                              filename: "Документ_GeoAI.docx",
                              title: "Документ Geo AI",
                              sections: [{ text: msg.content }]
                            })}
                            className="px-2 py-0.5 rounded text-[11px] text-zinc-500 dark:text-zinc-400 hover:text-sky-500 dark:hover:text-sky-400 hover:bg-sky-500/10 transition-colors flex items-center space-x-1 cursor-pointer font-medium"
                            title="Скачать документ Word (.docx)"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Word</span>
                          </button>

                          {/* 1-click Export to Excel if table present */}
                          {extractMarkdownTables(msg.content) && (
                            <button
                              onClick={() => {
                                const tbl = extractMarkdownTables(msg.content);
                                if (tbl) exportToExcel(tbl);
                              }}
                              className="px-2 py-0.5 rounded text-[11px] text-zinc-500 dark:text-zinc-400 hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors flex items-center space-x-1 cursor-pointer font-medium"
                              title="Скачать таблицу в Excel (.xlsx)"
                            >
                              <FileSpreadsheet className="w-3 h-3" />
                              <span>Excel</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {!isAssistant && (
                      <div className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-200 flex items-center justify-center shrink-0 mt-1">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex space-x-4 justify-start">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                      isChaika
                        ? "bg-rose-500/10 border-rose-500/20 text-rose-500 dark:text-rose-400"
                        : "bg-sky-500/10 border-sky-500/20 text-sky-500 dark:text-sky-400"
                    }`}
                  >
                    {isChaika ? <Wrench className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div className="rounded-2xl px-4 py-3 bg-zinc-100/90 dark:bg-zinc-900/70 backdrop-blur-md border border-zinc-200/60 dark:border-white/[0.08] text-xs text-zinc-400 flex items-center space-x-2">
                    <div
                      className={`w-2 h-2 rounded-full animate-pulse ${
                        isChaika ? "bg-rose-500" : "bg-sky-500"
                      }`}
                    />
                    <span>{isChaika ? "Шеф-мастер рассчитывает заказ-наряд..." : "ИИ формирует ответ..."}</span>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          </div>

          {/* Floating Center Bottom Input Box */}
          <div className="w-full max-w-3xl mx-auto px-4 pb-4 pt-1">
            <div
              className={`relative rounded-3xl bg-white/80 dark:bg-zinc-900/70 backdrop-blur-2xl border transition-colors ${
                isListening
                  ? "border-rose-500/70 ring-4 ring-rose-500/20 shadow-md shadow-rose-500/10"
                  : isChaika
                  ? "border-black/[0.06] dark:border-white/[0.09] shadow-2xs focus-within:border-white/20 focus-within:ring-4 focus-within:ring-rose-500/10"
                  : "border-black/[0.06] dark:border-white/[0.09] shadow-2xs focus-within:border-white/20 focus-within:ring-4 focus-within:ring-sky-500/10"
              }`}
            >
              {/* Voice recording live indicator */}
              {isListening && (
                <div className="px-4 pt-2.5 flex items-center space-x-2 text-xs font-medium text-rose-500 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <span>Идет запись голоса... Говорите в микрофон</span>
                </div>
              )}

              {/* Attached files preview inside input */}
              {attachedFiles.length > 0 && (
                <div className="px-4 pt-3 flex flex-wrap gap-2">
                  {attachedFiles.map((file) => renderFileChip(file))}
                </div>
              )}

              <textarea
                ref={textareaRef}
                value={inputPrompt}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder={
                  isListening
                    ? "Слушаю вас..."
                    : isChaika
                    ? "Спросите шеф-мастера СТО или продиктуйте заказ-наряд..."
                    : "Спросите что-нибудь (код, текст, анализ, бизнес)..."
                }
                rows={1}
                className="w-full pt-3.5 pb-11 px-5 bg-transparent text-[15px] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none resize-none max-h-48 leading-relaxed"
              />

              <div className="absolute left-3.5 right-3.5 bottom-2.5 flex items-center justify-between pointer-events-none">
                <div className="flex items-center space-x-1 pointer-events-auto">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                    title="Прикрепить файл или фото"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                  {webSearchEnabled && (
                    <span
                      className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${
                        isChaika
                          ? "bg-rose-500/10 text-rose-500"
                          : "bg-sky-500/10 text-sky-500"
                      }`}
                    >
                      Поиск в сети
                    </span>
                  )}
                  {styleMode === "brief" && (
                    <span
                      className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${
                        isChaika
                          ? "bg-rose-500/10 text-rose-500"
                          : "bg-sky-500/10 text-sky-500"
                      }`}
                    >
                      Кратко
                    </span>
                  )}
                </div>

                <div className="pointer-events-auto flex items-center space-x-1.5">
                  {/* Live Voice Mode Pill button */}
                  <button
                    type="button"
                    onClick={() => setIsVoiceLiveOpen(true)}
                    className={`flex items-center space-x-1 px-2.5 py-1 rounded-full transition-all text-[11px] font-semibold cursor-pointer ${
                      isChaika
                        ? "bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400"
                        : "bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-400"
                    }`}
                    title="Живой непрерывный голосовой диалог (Live)"
                  >
                    <Radio className="w-3 h-3 animate-pulse" />
                    <span>Live</span>
                  </button>

                  {/* Microphone Button (Speech-to-Text) */}
                  <button
                    type="button"
                    onClick={toggleVoiceInput}
                    className={`p-1.5 rounded-full transition-all cursor-pointer ${
                      isListening
                        ? "bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/25 ring-2 ring-rose-400/50"
                        : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-white/[0.06]"
                    }`}
                    title={isListening ? "Остановить запись голоса" : "Голосовой ввод (Speech-to-Text ru-RU)"}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSend()}
                    disabled={(!inputPrompt.trim() && attachedFiles.length === 0) || isLoading}
                    className={`p-1.5 rounded-full transition-all cursor-pointer ${
                      (inputPrompt.trim() || attachedFiles.length > 0) && !isLoading
                        ? isChaika
                          ? "bg-rose-500 hover:bg-rose-600 text-white"
                          : "bg-zinc-900 dark:bg-sky-500 text-white dark:text-zinc-950 hover:opacity-90"
                        : "bg-zinc-200 dark:bg-white/[0.08] text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
                    }`}
                    title="Отправить"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="text-center mt-2">
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500 select-none">
                {isChaika
                  ? "Чайка-Сервис CRM может допускать неточности в нормах времени. Проверяйте данные по заказ-нарядам."
                  : "Geo AI может допускать ошибки. Проверяйте важную информацию."}
              </span>
            </div>
          </div>
        </div>
      )}
      {/* Live Voice Mode («Моя волна» / Hands-Free) Modal */}
      <VoiceLiveModal
        isOpen={isVoiceLiveOpen}
        onClose={() => setIsVoiceLiveOpen(false)}
        onSendMessage={handleVoiceLiveSend}
      />
    </div>
  );
};
