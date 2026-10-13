"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Plus,
  Paperclip,
  Copy,
  Check,
  Bot,
  User,
  MessageSquare,
  Trash2,
  X,
  FileText,
  Globe,
  Zap,
  BookOpen,
} from "lucide-react";
import { ChatMessage } from "@/lib/supabase";
import { MarkdownView } from "@/components/MarkdownView";

interface AttachedFile {
  id: string;
  name: string;
  type: "image" | "text";
  size: string;
  previewUrl?: string;
  content?: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
}

const INITIAL_SESSIONS: ChatSession[] = [
  {
    id: "session-1",
    title: "Новый диалог",
    createdAt: "Сегодня",
    messages: [
      {
        id: "msg-1",
        role: "assistant",
        content: "Здравствуйте! Я универсальный ИИ-ассистент Geo AI.\n\nЧем я могу помочь? Могу проанализировать документы, написать программный код, составить прогноз или отчет, рассчитать данные или ответить на любые вопросы.",
        created_at: "10:00",
      },
    ],
  },
];

export const AIChat: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>(INITIAL_SESSIONS);
  const [activeSessionId, setActiveSessionId] = useState<string>("session-1");
  const [inputPrompt, setInputPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Quick mode pills
  const [styleMode, setStyleMode] = useState<"normal" | "brief" | "detailed">("normal");
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);

  // Attached files/images
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentSession?.messages, isLoading]);

  const handleNewChat = () => {
    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      title: "Новый чат",
      createdAt: "Сегодня",
      messages: [
        {
          id: `msg-${Date.now()}`,
          role: "assistant",
          content: "Здравствуйте! Чем я могу помочь сегодня?",
          created_at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ],
    };
    setSessions([newSession, ...sessions]);
    setActiveSessionId(newSession.id);
  };

  const handleDeleteSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (sessions.length <= 1) return;
    const remaining = sessions.filter((s) => s.id !== sessionId);
    setSessions(remaining);
    if (activeSessionId === sessionId) {
      setActiveSessionId(remaining[0].id);
    }
  };

  // Process uploaded files (images or text)
  const processFiles = (files: FileList | File[]) => {
    const fileList = Array.from(files);
    fileList.forEach((file) => {
      const isImg = file.type.startsWith("image/");
      const sizeStr = file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;

      const reader = new FileReader();
      if (isImg) {
        reader.onload = (e) => {
          const previewUrl = e.target?.result as string;
          setAttachedFiles((prev) => [
            ...prev,
            {
              id: `file-${Date.now()}-${Math.random()}`,
              name: file.name,
              type: "image",
              size: sizeStr,
              previewUrl,
            },
          ]);
        };
        reader.readAsDataURL(file);
      } else {
        reader.onload = (e) => {
          const content = e.target?.result as string;
          setAttachedFiles((prev) => [
            ...prev,
            {
              id: `file-${Date.now()}-${Math.random()}`,
              name: file.name,
              type: "text",
              size: sizeStr,
              content,
            },
          ]);
        };
        reader.readAsText(file);
      }
    });
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
    // reset input
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
    const text = (textToSend !== undefined ? textToSend : inputPrompt).trim();
    if ((!text && attachedFiles.length === 0) || isLoading || !currentSession) return;

    // Build user message with attachment metadata for UI rendering
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

    // Update session title if first user message
    const updatedMessages = [...currentSession.messages, userMsg];
    const isFirstUserMsg = currentSession.messages.filter((m) => m.role === "user").length === 0;
    const newTitle = isFirstUserMsg
      ? (text ? text.slice(0, 30) + (text.length > 30 ? "..." : "") : attachedFiles[0]?.name || "Новый диалог")
      : currentSession.title;

    setSessions((prev) =>
      prev.map((s) =>
        s.id === currentSession.id
          ? { ...s, title: newTitle, messages: updatedMessages }
          : s
      )
    );

    // Prepare payload
    const imagesPayload = attachedFiles.filter((f) => f.type === "image" && f.previewUrl).map((f) => f.previewUrl as string);
    const textAttachmentsPayload = attachedFiles
      .filter((f) => f.type === "text" && f.content)
      .map((f) => ({ name: f.name, content: f.content as string }));

    // Clear current inputs
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
          apiKey: storedKey || undefined,
          model: storedModel || undefined,
          mode: styleMode,
          webSearch: webSearchEnabled,
          images: imagesPayload,
          attachments: textAttachmentsPayload,
        }),
      });

      const data = await res.json();
      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: "assistant",
        content: data.content || "Ответ получен.",
        created_at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setSessions((prev) =>
        prev.map((s) =>
          s.id === currentSession.id
            ? { ...s, messages: [...updatedMessages, assistantMsg] }
            : s
        )
      );
    } catch (err) {
      console.error("Chat error:", err);
      const fallbackMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: "assistant",
        content: "⚠️ Не удалось связаться с сервером. Пожалуйста, проверьте подключение к сети и настройки API-ключа.",
        created_at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setSessions((prev) =>
        prev.map((s) =>
          s.id === currentSession.id
            ? { ...s, messages: [...updatedMessages, fallbackMsg] }
            : s
        )
      );
    } finally {
      setIsLoading(false);
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

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-white dark:bg-[#12161c] transition-colors">
      {/* Secondary Sub-Sidebar: Chat History (ChatGPT / Claude style) */}
      <div className="w-60 border-r border-slate-200 dark:border-white/[0.08] bg-slate-50/70 dark:bg-[#0e1217] flex flex-col justify-between shrink-0">
        <div className="p-3 border-b border-slate-200 dark:border-white/[0.08]">
          <button
            onClick={handleNewChat}
            className="w-full py-2 px-3 rounded-lg border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-[#181d24] hover:bg-slate-50 dark:hover:bg-white/[0.06] text-xs font-medium text-slate-800 dark:text-slate-100 flex items-center justify-center space-x-2 transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 text-amber-500" />
            <span>Новый чат</span>
          </button>
        </div>

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <div className="px-2 py-1 text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            История диалогов
          </div>
          {sessions.map((sess) => {
            const isActive = sess.id === activeSessionId;
            return (
              <div
                key={sess.id}
                onClick={() => setActiveSessionId(sess.id)}
                className={`group w-full px-2.5 py-2 rounded-lg text-xs cursor-pointer flex items-center justify-between transition-colors ${
                  isActive
                    ? "bg-slate-200/80 dark:bg-white/[0.08] text-slate-900 dark:text-slate-100 font-medium"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/40 dark:hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex items-center space-x-2 min-w-0">
                  <MessageSquare className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                  <span className="truncate">{sess.title}</span>
                </div>

                {sessions.length > 1 && (
                  <button
                    onClick={(e) => handleDeleteSession(e, sess.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 p-0.5 rounded transition-opacity"
                    title="Удалить чат"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Chat Workspace */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
            {currentSession?.messages.map((msg) => {
              const isAssistant = msg.role === "assistant";
              return (
                <div
                  key={msg.id}
                  className={`flex space-x-3.5 ${
                    isAssistant ? "justify-start" : "justify-end"
                  }`}
                >
                  {isAssistant && (
                    <div className="w-7 h-7 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`group relative rounded-2xl px-4 py-3 max-w-2xl text-sm leading-relaxed ${
                      isAssistant
                        ? "bg-slate-100/80 dark:bg-[#181d24] text-slate-900 dark:text-slate-100 border border-slate-200/60 dark:border-white/[0.06]"
                        : "bg-slate-900 dark:bg-slate-800 text-white dark:text-slate-100"
                    }`}
                  >
                    {/* User attachments display */}
                    {!isAssistant && msg.attachments && msg.attachments.length > 0 && (
                      <div className="mb-2.5 flex flex-wrap gap-2">
                        {msg.attachments.map((att, idx) => (
                          <div
                            key={idx}
                            className="flex items-center space-x-1.5 rounded-lg bg-black/25 px-2 py-1 text-xs text-slate-200 border border-white/10"
                          >
                            {att.type === "image" && att.previewUrl ? (
                              <img
                                src={att.previewUrl}
                                alt={att.name}
                                className="w-12 h-12 object-cover rounded"
                              />
                            ) : (
                              <>
                                <FileText className="w-3.5 h-3.5 text-amber-400" />
                                <span className="max-w-[150px] truncate">{att.name}</span>
                              </>
                            )}
                          </div>
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

                    {isAssistant && (
                      <div className="mt-2 pt-1 flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleCopy(msg.id, msg.content)}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded transition-colors"
                          title="Копировать"
                        >
                          {copiedId === msg.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {!isAssistant && (
                    <div className="w-7 h-7 rounded-full bg-slate-800 text-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {isLoading && (
              <div className="flex space-x-3.5 justify-start">
                <div className="w-7 h-7 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="rounded-2xl px-4 py-3 bg-slate-100/80 dark:bg-[#181d24] border border-slate-200/60 dark:border-white/[0.06] text-xs text-slate-400 flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span>ИИ формирует ответ...</span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Input area container */}
        <div className="w-full max-w-3xl mx-auto px-4 pb-6 pt-2">
          {/* Quick pills for style and features */}
          <div className="flex items-center space-x-2 mb-2 px-1 overflow-x-auto text-xs">
            <button
              type="button"
              onClick={() => setStyleMode((prev) => (prev === "brief" ? "normal" : "brief"))}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full border transition-all ${
                styleMode === "brief"
                  ? "bg-amber-500/15 border-amber-500 text-amber-600 dark:text-amber-400 font-medium"
                  : "bg-slate-100 dark:bg-[#181d24] border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/[0.2]"
              }`}
              title="Отвечать максимально кратко и тезисно"
            >
              <Zap className="w-3 h-3" />
              <span>Кратко</span>
            </button>

            <button
              type="button"
              onClick={() => setStyleMode((prev) => (prev === "detailed" ? "normal" : "detailed"))}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full border transition-all ${
                styleMode === "detailed"
                  ? "bg-amber-500/15 border-amber-500 text-amber-600 dark:text-amber-400 font-medium"
                  : "bg-slate-100 dark:bg-[#181d24] border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/[0.2]"
              }`}
              title="Развернутый, подробный и глубокий ответ"
            >
              <BookOpen className="w-3 h-3" />
              <span>Развернуто</span>
            </button>

            <button
              type="button"
              onClick={() => setWebSearchEnabled((prev) => !prev)}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full border transition-all ${
                webSearchEnabled
                  ? "bg-sky-500/15 border-sky-500 text-sky-600 dark:text-sky-400 font-medium"
                  : "bg-slate-100 dark:bg-[#181d24] border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/[0.2]"
              }`}
              title="Искать актуальную информацию в сети через OpenRouter Web Search"
            >
              <Globe className="w-3 h-3" />
              <span>Поиск в сети</span>
            </button>
          </div>

          {/* Floating Center Input Box */}
          <div className="relative rounded-2xl bg-slate-100 dark:bg-[#181d24] border border-slate-200 dark:border-white/[0.1] shadow-2xs focus-within:border-amber-500/50 transition-colors">
            {/* Attached files chips inside input box */}
            {attachedFiles.length > 0 && (
              <div className="px-3 pt-3 flex flex-wrap gap-2">
                {attachedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="group relative flex items-center space-x-2 rounded-lg bg-white dark:bg-[#202730] border border-slate-200 dark:border-white/[0.1] px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 shadow-2xs"
                  >
                    {file.type === "image" && file.previewUrl ? (
                      <img
                        src={file.previewUrl}
                        alt={file.name}
                        className="w-7 h-7 object-cover rounded"
                      />
                    ) : (
                      <FileText className="w-4 h-4 text-amber-500 shrink-0" />
                    )}
                    <div className="flex flex-col min-w-0 pr-4">
                      <span className="truncate max-w-[130px] font-medium">{file.name}</span>
                      <span className="text-[10px] text-slate-400">{file.size}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(file.id)}
                      className="absolute right-1 top-1 text-slate-400 hover:text-rose-500 p-0.5 rounded transition-colors"
                      title="Удалить"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.txt,.md,.csv,.json,.js,.ts,.tsx,.jsx,.py,.html,.css,.sql,.doc,.docx,.pdf"
              onChange={handleFileInputChange}
              className="hidden"
            />

            <textarea
              ref={textareaRef}
              value={inputPrompt}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder="Спросите что-нибудь, прикрепите файлы или вставьте картинку..."
              rows={1}
              className="w-full pt-3.5 pb-11 px-4 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none resize-none max-h-48 leading-relaxed"
            />

            <div className="absolute left-3 right-3 bottom-2 flex items-center justify-between pointer-events-none">
              <div className="flex items-center space-x-1 pointer-events-auto">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-white/[0.06] transition-colors flex items-center space-x-1"
                  title="Прикрепить файл или изображение"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
              </div>

              <div className="pointer-events-auto">
                <button
                  type="button"
                  onClick={() => handleSend()}
                  disabled={(!inputPrompt.trim() && attachedFiles.length === 0) || isLoading}
                  className={`p-1.5 rounded-lg transition-all ${
                    (inputPrompt.trim() || attachedFiles.length > 0) && !isLoading
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90"
                      : "bg-slate-200 dark:bg-white/[0.1] text-slate-400 cursor-not-allowed"
                  }`}
                  title="Отправить"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
