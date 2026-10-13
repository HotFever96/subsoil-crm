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
} from "lucide-react";
import { ChatMessage } from "@/lib/supabase";
import { MarkdownView } from "@/components/MarkdownView";

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
}

const INITIAL_SESSIONS: ChatSession[] = [
  {
    id: "session-1",
    title: "Консультация по лицензиям",
    createdAt: "Сегодня",
    messages: [
      {
        id: "msg-1",
        role: "assistant",
        content: "Здравствуйте! Я универсальный ИИ-ассистент. Могу помочь с программированием, анализом документов, законодательством, формулировками или любыми другими задачами. О чем хотите поговорить?",
        created_at: "10:00",
      },
    ],
  },
  {
    id: "session-2",
    title: "Составление отчета по добыче",
    createdAt: "Вчера",
    messages: [
      {
        id: "msg-2-1",
        role: "user",
        content: "Помоги составить структуру квартального отчета по отработке карьера ОПИ.",
        created_at: "14:20",
      },
      {
        id: "msg-2-2",
        role: "assistant",
        content: "Вот типовая структура квартального отчета:\n1. Фактические объемы выемки горной массы и вскрыши\n2. Сверка с утвержденным планом развития горных работ (ПРГР)\n3. Состояние откосов бортов и уступов по данным маркшейдерской съемки\n4. Меры безопасности и экологический контроль",
        created_at: "14:21",
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
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentSession?.messages]);

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

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || inputPrompt;
    if (!text.trim() || isLoading || !currentSession) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: text,
      created_at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    // Update session title if first user message
    const updatedMessages = [...currentSession.messages, userMsg];
    const isFirstUserMsg = currentSession.messages.filter((m) => m.role === "user").length === 0;
    const newTitle = isFirstUserMsg ? text.slice(0, 30) + (text.length > 30 ? "..." : "") : currentSession.title;

    setSessions((prev) =>
      prev.map((s) =>
        s.id === currentSession.id
          ? { ...s, title: newTitle, messages: updatedMessages }
          : s
      )
    );

    setInputPrompt("");
    setIsLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const storedKey = typeof window !== "undefined" ? localStorage.getItem("geonedra_openrouter_key") : null;
      const res = await fetch("/api/legal-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
          userMessage: text,
          apiKey: storedKey || undefined,
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
    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
  };

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-white dark:bg-[#12161c] transition-colors">
      {/* Secondary Sub-Sidebar: Chat History (like ChatGPT / Gemini) */}
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
                  <span>ИИ формулирует ответ...</span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Floating Center Input Box */}
        <div className="w-full max-w-3xl mx-auto px-4 pb-6 pt-2">
          <div className="relative rounded-2xl bg-slate-100 dark:bg-[#181d24] border border-slate-200 dark:border-white/[0.1] shadow-2xs focus-within:border-amber-500/50 transition-colors">
            <textarea
              ref={textareaRef}
              value={inputPrompt}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Спросите что-нибудь (код, текст, анализ, бизнес)..."
              rows={1}
              className="w-full pt-3.5 pb-11 px-4 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none resize-none max-h-48 leading-relaxed"
            />

            <div className="absolute left-3 right-3 bottom-2 flex items-center justify-between pointer-events-none">
              <div className="flex items-center space-x-1 pointer-events-auto">
                <button
                  type="button"
                  onClick={() => alert("Прикрепить документ или файл")}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-white/[0.06] transition-colors"
                  title="Прикрепить файл"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
              </div>

              <div className="pointer-events-auto">
                <button
                  type="button"
                  onClick={() => handleSend()}
                  disabled={!inputPrompt.trim() || isLoading}
                  className={`p-1.5 rounded-lg transition-all ${
                    inputPrompt.trim() && !isLoading
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
