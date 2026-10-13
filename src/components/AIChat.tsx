"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Mic,
  Plus,
  Paperclip,
  Copy,
  Check,
  Bot,
  User,
} from "lucide-react";
import { ChatMessage } from "@/lib/supabase";

export const AIChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "msg-init",
      role: "assistant",
      content: "Здравствуйте. Я ИИ-секретарь по вопросам недропользования. Чем могу помочь?",
      created_at: "10:00",
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || inputPrompt;
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: text,
      created_at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt("");
    setIsLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const res = await fetch("/api/legal-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          userMessage: text,
        }),
      });

      const data = await res.json();
      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: "assistant",
        content: data.content || "Не удалось сформировать ответ. Пожалуйста, повторите запрос.",
        created_at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error(err);
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

  const isInitialState = messages.length <= 1;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-[#12161c] transition-colors relative">
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
          {/* Welcoming state if only 1 message */}
          {isInitialState && (
            <div className="text-center py-16 space-y-3">
              <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 tracking-tight">
                Чем я могу помочь по недропользованию?
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Задайте вопрос по закону «О недрах», лицензиям, проверкам Роснедр или составлению технических проектов.
              </p>
            </div>
          )}

          {messages.map((msg) => {
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
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </div>

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

      {/* ChatGPT-style Floating Center Input Box */}
      <div className="w-full max-w-3xl mx-auto px-4 pb-6 pt-2">
        <div className="relative rounded-2xl bg-slate-100 dark:bg-[#181d24] border border-slate-200 dark:border-white/[0.1] shadow-xs focus-within:border-amber-500/50 transition-colors">
          <textarea
            ref={textareaRef}
            value={inputPrompt}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Спросите что-нибудь..."
            rows={1}
            className="w-full pt-3.5 pb-12 px-4 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none resize-none max-h-48 leading-relaxed"
          />

          {/* Bottom Controls Bar inside Input */}
          <div className="absolute left-3 right-3 bottom-2.5 flex items-center justify-between pointer-events-none">
            <div className="flex items-center space-x-1 pointer-events-auto">
              <button
                type="button"
                onClick={() => alert("Прикрепить файл (геологический отчет, лицензия, предписание)")}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-white/[0.06] transition-colors"
                title="Прикрепить файл"
              >
                <Paperclip className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center space-x-1.5 pointer-events-auto">
              <button
                type="button"
                onClick={() => alert("Голосовой ввод доступен в поддерживаемых браузерах")}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-white/[0.06] transition-colors"
                title="Голосовой ввод"
              >
                <Mic className="w-4 h-4" />
              </button>

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
  );
};
