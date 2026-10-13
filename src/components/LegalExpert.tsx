"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Scale,
  Send,
  Copy,
  Check,
  BookOpen,
} from "lucide-react";
import { ChatMessage } from "@/lib/supabase";
import { INITIAL_CHAT_MESSAGES } from "@/lib/mock-data";

export const LegalExpert: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_CHAT_MESSAGES);
  const [inputPrompt, setInputPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const quickQuestions = [
    "Основания для отзыва лицензии по ст. 20 Закона «О недрах»",
    "Согласование отклонений от проектной добычи в ЦКР",
    "Переоформление лицензии на дочернее общество (ст. 17.1)",
    "Нормативы потерь полезных ископаемых и ставка НДПИ",
  ];

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
        content: data.content || "Не удалось сформировать правовой ответ.",
        created_at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        citations: [
          { law_article: "Закон РФ «О недрах» № 2395-1", title: "Ст. 20, 21, 22" },
          { law_article: "Постановление Правительства РФ № 2498", title: "Лицензирование недр" },
        ],
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

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0a0f18]">
      {/* Top Header */}
      <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between bg-[#0e1522]">
        <div>
          <h1 className="text-base font-semibold text-slate-100">
            Правовой консультант по недропользованию
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Консультации по Закону РФ «О недрах», лицензионным соглашениям и проверкам
          </p>
        </div>
      </div>

      {/* Chat Area + Side Knowledge Hub */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Stream */}
        <div className="flex-1 flex flex-col h-full justify-between">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((msg) => {
              const isAssistant = msg.role === "assistant";
              return (
                <div
                  key={msg.id}
                  className={`flex ${isAssistant ? "justify-start" : "justify-end"} max-w-3xl ${
                    isAssistant ? "mr-auto" : "ml-auto"
                  }`}
                >
                  <div
                    className={`rounded-xl p-4 transition-all text-xs sm:text-sm leading-relaxed ${
                      isAssistant
                        ? "bg-[#0e1522] border border-slate-800 text-slate-200"
                        : "bg-slate-800 text-slate-100"
                    }`}
                  >
                    {/* Header info */}
                    <div className="flex items-center justify-between mb-2 text-xs text-slate-400 pb-1.5 border-b border-slate-800/80">
                      <span className="font-medium">
                        {isAssistant ? "Юридический консультант" : "Вы"}
                      </span>
                      <div className="flex items-center space-x-2">
                        <span>{msg.created_at}</span>
                        {isAssistant && (
                          <button
                            onClick={() => handleCopy(msg.id, msg.content)}
                            className="hover:text-sky-300 transition-colors"
                            title="Копировать"
                          >
                            {copiedId === msg.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Message Body */}
                    <div className="whitespace-pre-wrap leading-relaxed text-slate-200 font-sans">
                      {msg.content}
                    </div>

                    {/* Citations if assistant */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center space-x-2 flex-wrap">
                        <span className="text-[11px] text-slate-500 mr-1">
                          Ссылки:
                        </span>
                        {msg.citations.map((cite, i) => (
                          <span
                            key={i}
                            className="text-[11px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400"
                          >
                            {cite.law_article} ({cite.title})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex justify-start max-w-xl">
                <div className="rounded-xl p-3.5 bg-[#0e1522] border border-slate-800 flex items-center space-x-2.5 text-slate-400 text-xs">
                  <div className="w-3.5 h-3.5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                  <span>Формирование правового анализа...</span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Prompt input with quick chips */}
          <div className="p-4 bg-[#0e1522] border-t border-slate-800/80 space-y-2.5">
            {/* Quick chips */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
              {quickQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(q)}
                  className="px-2.5 py-1 rounded-md bg-slate-800/60 hover:bg-slate-800 text-slate-300 text-xs whitespace-nowrap transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Input bar */}
            <div className="flex items-center space-x-2">
              <textarea
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Задайте вопрос по праву недропользования..."
                rows={2}
                className="flex-1 px-3.5 py-2.5 rounded-lg bg-[#0a0f18] border border-slate-800 text-xs sm:text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-500/60 resize-none"
              />

              <button
                onClick={() => handleSend()}
                disabled={isLoading || !inputPrompt.trim()}
                className="px-4 py-3 rounded-lg bg-sky-500 text-slate-950 font-medium hover:bg-sky-400 transition-colors disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Reference Pillar */}
        <div className="w-72 border-l border-slate-800/80 bg-[#0b111c] p-5 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center space-x-1.5">
                <BookOpen className="w-3.5 h-3.5 text-sky-400" />
                <span>Нормативные акты</span>
              </h3>
              <div className="space-y-1.5 text-xs">
                <div className="p-2.5 rounded-lg bg-[#0e1522] border border-slate-800/80">
                  <div className="font-medium text-slate-200">Закон РФ «О недрах» № 2395-1</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Ст. 20 (Прекращение права), Ст. 17.1 (Переоформление)
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-[#0e1522] border border-slate-800/80">
                  <div className="font-medium text-slate-200">ПП РФ № 2498</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Положение о лицензировании недр
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-[#0e1522] border border-slate-800/80">
                  <div className="font-medium text-slate-200">Приказ МПР России № 352</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Состав и содержание техпроектов
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Судебная практика
              </h3>
              <div className="p-3 rounded-lg bg-[#0e1522] border border-slate-800/80 text-xs text-slate-400 leading-relaxed">
                Нарушение сроков геологоразведки при объективных ограничениях не влечет досрочного отзыва лицензии без предварительного предписания со сроком не менее 3 месяцев.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
