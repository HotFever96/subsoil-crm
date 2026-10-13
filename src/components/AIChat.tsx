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
  Globe,
  Zap,
  BookOpen,
  ThumbsUp,
  ThumbsDown,
  RotateCw,
  Mic,
  MicOff,
  AlertCircle,
} from "lucide-react";
import { ChatMessage } from "@/lib/supabase";
import { MarkdownView } from "@/components/MarkdownView";
import { useChat } from "@/lib/chat-context";
import { useAuth } from "@/lib/auth-context";

interface AttachedFile {
  id: string;
  name: string;
  type: "image" | "text";
  size: string;
  previewUrl?: string;
  content?: string;
}

export const AIChat: React.FC = () => {
  const { user } = useAuth();
  const { activeSession, setSessionMessages } = useChat();

  const [inputPrompt, setInputPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  // Process uploaded files (images or text)
  const processFiles = (files: FileList | File[]) => {
    const fileList = Array.from(files);
    fileList.forEach((file) => {
      const isImg = file.type.startsWith("image/");
      const sizeStr =
        file.size > 1024 * 1024
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
      .filter((f) => f.type === "text" && f.content)
      .map((f) => ({ name: f.name, content: f.content as string }));

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
        content: data.content || "Ответ сформирован.",
        created_at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setSessionMessages(activeSession.id, [...updatedMessages, assistantMsg]);
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
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-[#0c1015] transition-colors relative">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.txt,.md,.csv,.json,.js,.ts,.tsx,.jsx,.py,.html,.css,.sql,.doc,.docx,.pdf"
        onChange={handleFileInputChange}
        className="hidden"
      />

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
        <div className="flex-1 flex flex-col items-center justify-center px-4 overflow-y-auto relative bg-[radial-gradient(ellipse_70%_50%_at_50%_35%,rgba(14,165,233,0.09),transparent_75%)] dark:bg-[radial-gradient(ellipse_75%_55%_at_50%_35%,rgba(14,165,233,0.12),transparent_75%)]">
          <div className="w-full max-w-xl flex flex-col items-center text-center -mt-6">
            <h1 className="text-3xl sm:text-4xl font-medium tracking-tight text-slate-800 dark:text-slate-100 mb-8 select-none">
              {user?.name ? `${user.name}, чем я могу помочь?` : "Чем я могу помочь сегодня?"}
            </h1>

            {/* Central Narrower Rounded Pill Input Box (Gemini / ChatGPT Screen 3 style) */}
            <div className={`w-full relative rounded-3xl bg-slate-50/90 dark:bg-[#131821]/90 backdrop-blur-md border transition-all text-left shadow-lg shadow-sky-950/5 dark:shadow-2xl dark:shadow-sky-950/20 ${
              isListening
                ? "border-rose-500/70 ring-4 ring-rose-500/20"
                : "border-slate-200/90 dark:border-white/[0.1] focus-within:border-sky-500/60 focus-within:ring-4 focus-within:ring-sky-500/10"
            }`}>
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
                  {attachedFiles.map((file) => (
                    <div
                      key={file.id}
                      className="group relative flex items-center space-x-2 rounded-xl bg-white dark:bg-[#1a212d] border border-slate-200 dark:border-white/[0.1] px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 shadow-2xs"
                    >
                      {file.type === "image" && file.previewUrl ? (
                        <img
                          src={file.previewUrl}
                          alt={file.name}
                          className="w-7 h-7 object-cover rounded-lg"
                        />
                      ) : (
                        <FileText className="w-4 h-4 text-sky-500 shrink-0" />
                      )}
                      <div className="flex flex-col min-w-0 pr-4">
                        <span className="truncate max-w-[130px] font-medium">{file.name}</span>
                        <span className="text-[10px] text-slate-400">{file.size}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAttachment(file.id)}
                        className="absolute right-1 top-1 text-slate-400 hover:text-rose-500 p-0.5 rounded-full transition-colors cursor-pointer"
                        title="Удалить"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <textarea
                ref={textareaRef}
                value={inputPrompt}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder={isListening ? "Слушаю вас..." : "Спросите что-нибудь или надиктуйте запрос..."}
                rows={2}
                className="w-full pt-4 pb-12 px-5 bg-transparent text-[15px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none resize-none max-h-48 leading-relaxed"
              />

              <div className="absolute left-3.5 right-3.5 bottom-2.5 flex items-center justify-between pointer-events-none">
                <div className="flex items-center space-x-1 pointer-events-auto">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-white/[0.06] transition-colors flex items-center space-x-1 cursor-pointer"
                    title="Прикрепить файл или фото"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                </div>

                <div className="pointer-events-auto flex items-center space-x-2">
                  {/* Microphone Button (Speech-to-Text) */}
                  <button
                    type="button"
                    onClick={toggleVoiceInput}
                    className={`p-2 rounded-full transition-all cursor-pointer ${
                      isListening
                        ? "bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/25 ring-2 ring-rose-400/50"
                        : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-white/[0.06]"
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
                        ? "bg-slate-900 dark:bg-sky-500 text-white dark:text-slate-950 hover:opacity-90 shadow-2xs"
                        : "bg-slate-200 dark:bg-white/[0.08] text-slate-400 dark:text-slate-600 cursor-not-allowed"
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
              <button
                type="button"
                onClick={() => setWebSearchEnabled((prev) => !prev)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-full text-xs border transition-all cursor-pointer shadow-2xs ${
                  webSearchEnabled
                    ? "bg-sky-500/15 border-sky-500/50 text-sky-600 dark:text-sky-400 font-medium"
                    : "bg-white/80 dark:bg-[#131821]/80 backdrop-blur-xs border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 hover:border-sky-500/40 hover:text-sky-600 dark:hover:text-sky-400"
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
                    : "bg-white/80 dark:bg-[#131821]/80 backdrop-blur-xs border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 hover:border-sky-500/40 hover:text-sky-600 dark:hover:text-sky-400"
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
                    : "bg-white/80 dark:bg-[#131821]/80 backdrop-blur-xs border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 hover:border-sky-500/40 hover:text-sky-600 dark:hover:text-sky-400"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-sky-500" />
                <span>Развернутый анализ</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center space-x-2 px-4 py-2 rounded-full text-xs border bg-white/80 dark:bg-[#131821]/80 backdrop-blur-xs border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 hover:border-sky-500/40 hover:text-sky-600 dark:hover:text-sky-400 shadow-2xs transition-all cursor-pointer"
              >
                <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                <span>Анализ файлов и фото</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* CASE 2: ACTIVE DIALOGUE (Centered stream + floating bottom bar) */
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Scrollable messages container */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 py-8 space-y-7">
              {activeSession.messages.map((msg) => {
                const isAssistant = msg.role === "assistant";
                return (
                  <div
                    key={msg.id}
                    className={`flex space-x-4 ${
                      isAssistant ? "justify-start" : "justify-end"
                    }`}
                  >
                    {isAssistant && (
                      <div className="w-8 h-8 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-500 dark:text-sky-400 flex items-center justify-center shrink-0 mt-1">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    <div
                      className={`group relative rounded-2xl px-4 py-3.5 max-w-2xl text-[15px] leading-relaxed ${
                        isAssistant
                          ? "bg-transparent text-slate-900 dark:text-slate-100 w-full"
                          : "bg-slate-900 dark:bg-[#18212e] border border-transparent dark:border-white/[0.06] text-white dark:text-slate-100"
                      }`}
                    >
                      {/* Attached files preview in user message */}
                      {!isAssistant && msg.attachments && msg.attachments.length > 0 && (
                        <div className="mb-2.5 flex flex-wrap gap-2">
                          {msg.attachments.map((att, idx) => (
                            <div
                              key={idx}
                              className="flex items-center space-x-1.5 rounded-lg bg-black/25 px-2.5 py-1.5 text-xs text-slate-200 border border-white/10"
                            >
                              {att.type === "image" && att.previewUrl ? (
                                <img
                                  src={att.previewUrl}
                                  alt={att.name}
                                  className="w-14 h-14 object-cover rounded-lg"
                                />
                              ) : (
                                <>
                                  <FileText className="w-3.5 h-3.5 text-sky-400" />
                                  <span className="max-w-[160px] truncate">{att.name}</span>
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

                      {/* Action buttons under assistant message */}
                      {isAssistant && (
                        <div className="mt-3 pt-1 flex items-center space-x-2 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleCopy(msg.id, msg.content)}
                            className="p-1 rounded hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                            title="Копировать"
                          >
                            {copiedId === msg.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            className="p-1 rounded hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                            title="Хороший ответ"
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            className="p-1 rounded hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                            title="Плохой ответ"
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleSend(activeSession.messages.filter(m => m.role === "user").slice(-1)[0]?.content)}
                            className="p-1 rounded hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                            title="Перегенерировать"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {!isAssistant && (
                      <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-200 flex items-center justify-center shrink-0 mt-1">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex space-x-4 justify-start">
                  <div className="w-8 h-8 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-500 dark:text-sky-400 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="rounded-2xl px-4 py-3 bg-slate-100 dark:bg-[#131821] border border-slate-200/60 dark:border-white/[0.06] text-xs text-slate-400 flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                    <span>ИИ формирует ответ...</span>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          </div>

          {/* Floating Center Bottom Input Box */}
          <div className="w-full max-w-3xl mx-auto px-4 pb-4 pt-1">
            <div className={`relative rounded-3xl bg-slate-100/90 dark:bg-[#131821]/90 backdrop-blur-md border transition-colors ${
              isListening
                ? "border-rose-500/70 ring-4 ring-rose-500/20 shadow-md shadow-rose-500/10"
                : "border-slate-200 dark:border-white/[0.1] shadow-2xs focus-within:border-sky-500/60 focus-within:ring-4 focus-within:ring-sky-500/10"
            }`}>
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
                  {attachedFiles.map((file) => (
                    <div
                      key={file.id}
                      className="group relative flex items-center space-x-2 rounded-xl bg-white dark:bg-[#1a212d] border border-slate-200 dark:border-white/[0.1] px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 shadow-2xs"
                    >
                      {file.type === "image" && file.previewUrl ? (
                        <img
                          src={file.previewUrl}
                          alt={file.name}
                          className="w-7 h-7 object-cover rounded-lg"
                        />
                      ) : (
                        <FileText className="w-4 h-4 text-sky-500 shrink-0" />
                      )}
                      <div className="flex flex-col min-w-0 pr-4">
                        <span className="truncate max-w-[130px] font-medium">{file.name}</span>
                        <span className="text-[10px] text-slate-400">{file.size}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAttachment(file.id)}
                        className="absolute right-1 top-1 text-slate-400 hover:text-rose-500 p-0.5 rounded-full transition-colors cursor-pointer"
                        title="Удалить"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <textarea
                ref={textareaRef}
                value={inputPrompt}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder={isListening ? "Слушаю вас..." : "Спросите что-нибудь (код, текст, анализ, бизнес)..."}
                rows={1}
                className="w-full pt-3.5 pb-11 px-5 bg-transparent text-[15px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none resize-none max-h-48 leading-relaxed"
              />

              <div className="absolute left-3.5 right-3.5 bottom-2.5 flex items-center justify-between pointer-events-none">
                <div className="flex items-center space-x-1 pointer-events-auto">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                    title="Прикрепить файл или фото"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                  {webSearchEnabled && (
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-500 font-medium">
                      Поиск в сети
                    </span>
                  )}
                  {styleMode === "brief" && (
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-500 font-medium">
                      Кратко
                    </span>
                  )}
                </div>

                <div className="pointer-events-auto flex items-center space-x-1.5">
                  {/* Microphone Button (Speech-to-Text) */}
                  <button
                    type="button"
                    onClick={toggleVoiceInput}
                    className={`p-1.5 rounded-full transition-all cursor-pointer ${
                      isListening
                        ? "bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/25 ring-2 ring-rose-400/50"
                        : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-white/[0.06]"
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
                        ? "bg-slate-900 dark:bg-sky-500 text-white dark:text-slate-950 hover:opacity-90"
                        : "bg-slate-200 dark:bg-white/[0.08] text-slate-400 dark:text-slate-600 cursor-not-allowed"
                    }`}
                    title="Отправить"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="text-center mt-2">
              <span className="text-[11px] text-slate-400 dark:text-slate-500 select-none">
                Geo AI может допускать ошибки. Проверяйте важную информацию.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
