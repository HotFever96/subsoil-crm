"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Scale,
  Send,
  Sparkles,
  BookOpen,
  HelpCircle,
  FileText,
  Bookmark,
  Share2,
  Copy,
  Check,
  RotateCcw,
  Shield,
  Layers,
  ChevronRight,
  ExternalLink,
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
    "Основания для досрочного отзыва лицензии по ст. 20 Закона «О недрах»",
    "Регламент согласования отклонений от проектного уровня добычи в ЦКР",
    "Порядок переоформления лицензии на дочернее предприятие (ст. 17.1)",
    "Нормативы расчета потерь полезных ископаемых и ставка НДПИ 0%",
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
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-gradient-to-b from-[#0a1019] via-[#0d1421] to-[#111620]">
      {/* Top Header */}
      <div className="px-8 py-5 border-b border-[#b8860b]/15 flex items-center justify-between bg-[#0a1019]/70 backdrop-blur-md">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 rounded-xl bg-[#161e2c] border border-[#b8860b]/30 flex items-center justify-center text-[#b8860b] shadow-md shadow-[#b8860b]/10">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-semibold tracking-tight text-slate-100">
                AI Legal Expert • Недропользование РФ
              </h1>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-950/40 text-amber-300 border border-amber-700/30">
                База НПА: Редакция 2026
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Интеллектуальный советник по недропользованию, защите лицензий, проверкам Роснедр и судебной практике
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs font-mono text-slate-400">
          <span className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#111620] border border-[#b8860b]/20">
            <Shield className="w-3.5 h-3.5 text-[#b8860b]" />
            <span>Конфиденциальный юридический контур</span>
          </span>
        </div>
      </div>

      {/* Chat Area + Side Knowledge Hub */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Stream */}
        <div className="flex-1 flex flex-col h-full justify-between">
          <div className="flex-1 overflow-y-auto p-8 space-y-6">
            {messages.map((msg) => {
              const isAssistant = msg.role === "assistant";
              return (
                <div
                  key={msg.id}
                  className={`flex ${isAssistant ? "justify-start" : "justify-end"} max-w-4xl ${
                    isAssistant ? "mr-auto" : "ml-auto"
                  }`}
                >
                  <div
                    className={`rounded-2xl p-6 transition-all border ${
                      isAssistant
                        ? "bg-[#111824] border-[#b8860b]/25 shadow-xl text-slate-200"
                        : "bg-[#162133] border-[#b8860b]/40 text-amber-100 shadow-md"
                    }`}
                  >
                    {/* Header info */}
                    <div className="flex items-center justify-between mb-3 text-xs font-mono text-slate-400 pb-2 border-b border-[#b8860b]/10">
                      <div className="flex items-center space-x-2">
                        {isAssistant ? (
                          <span className="text-[#b8860b] font-semibold flex items-center space-x-1.5">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>AI LEGAL ADVISOR</span>
                          </span>
                        ) : (
                          <span className="text-slate-300 font-medium">ГЛАВНЫЙ ЮРИСКОНСУЛЬТ</span>
                        )}
                      </div>
                      <div className="flex items-center space-x-3">
                        <span>{msg.created_at}</span>
                        {isAssistant && (
                          <button
                            onClick={() => handleCopy(msg.id, msg.content)}
                            className="hover:text-amber-300 transition-colors"
                            title="Копировать правовое заключение"
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
                    <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-serif text-slate-200">
                      {msg.content}
                    </div>

                    {/* Citations if assistant */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-[#b8860b]/15 flex items-center space-x-2 flex-wrap">
                        <span className="text-[11px] font-mono text-slate-400 mr-2">
                          Правовые источники:
                        </span>
                        {msg.citations.map((cite, i) => (
                          <span
                            key={i}
                            className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#161e2c] border border-[#b8860b]/20 text-[#b8860b] flex items-center space-x-1"
                          >
                            <span>{cite.law_article} ({cite.title})</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex justify-start max-w-2xl">
                <div className="rounded-2xl p-5 bg-[#111824] border border-[#b8860b]/25 shadow-xl flex items-center space-x-3 text-slate-300 text-xs">
                  <div className="w-4 h-4 border-2 border-[#b8860b] border-t-transparent rounded-full animate-spin" />
                  <span>Анализирую Закон РФ «О недрах», регламенты Роснедр и судебные прецеденты...</span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Prompt input with quick chips */}
          <div className="p-6 bg-[#0a1019]/90 border-t border-[#b8860b]/15 space-y-3">
            {/* Quick chips */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
              <span className="text-slate-400 font-mono text-[11px] shrink-0">Частые вопросы:</span>
              {quickQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(q)}
                  className="px-3 py-1 rounded-lg bg-[#111620] border border-[#b8860b]/20 hover:border-[#b8860b]/50 text-slate-300 hover:text-amber-200 text-xs whitespace-nowrap transition-all"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Input bar */}
            <div className="flex items-center space-x-3">
              <div className="flex-1 relative">
                <textarea
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Задайте вопрос по недропользованию РФ (ст. 20, ЦКР, горный отвод, НДПИ, предписания)..."
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl bg-[#111620] border border-[#b8860b]/30 text-xs sm:text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#b8860b] focus:border-[#b8860b] resize-none"
                />
              </div>

              <button
                onClick={() => handleSend()}
                disabled={isLoading || !inputPrompt.trim()}
                className="px-5 py-4 rounded-xl bg-gradient-to-r from-[#b8860b] to-[#996515] text-slate-950 font-semibold hover:from-[#d4af37] hover:to-[#b8860b] transition-all disabled:opacity-40 flex items-center justify-center shadow-lg shadow-[#b8860b]/20"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Reference Pillar */}
        <div className="w-80 border-l border-[#b8860b]/15 bg-[#0d1421]/60 p-6 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-6">
            <div>
              <h3 className="text-xs uppercase font-mono tracking-wider text-[#b8860b] font-semibold flex items-center space-x-2 mb-3">
                <BookOpen className="w-4 h-4" />
                <span>Нормативный реестр РФ</span>
              </h3>
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-[#111620] border border-[#b8860b]/15 hover:border-[#b8860b]/40 cursor-pointer transition-all">
                  <div className="font-semibold text-slate-200">Закон РФ «О недрах» № 2395-1</div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Ст. 20 (Прекращение права), Ст. 17.1 (Переоформление)
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#111620] border border-[#b8860b]/15 hover:border-[#b8860b]/40 cursor-pointer transition-all">
                  <div className="font-semibold text-slate-200">ПП РФ № 2498</div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Положение о лицензировании пользования недрами
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#111620] border border-[#b8860b]/15 hover:border-[#b8860b]/40 cursor-pointer transition-all">
                  <div className="font-semibold text-slate-200">Приказ МПР России № 352</div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Требования к составу и содержанию техпроектов
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xs uppercase font-mono tracking-wider text-slate-400 font-semibold mb-3">
                Аудит судебных рисков
              </h3>
              <div className="p-4 rounded-xl bg-[#111620]/80 border border-amber-900/30 text-xs text-amber-200/90 leading-relaxed font-serif space-y-2">
                <p>
                  <strong>Практика ВС РФ 2025–2026:</strong> Формальное нарушение сроков геологоразведки при наличии объективных логистических ограничений не влечет безусловного аннулирования лицензии без предоставления 3 месяцев на устранение.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#b8860b]/15 text-[10px] text-slate-500 font-mono text-center">
            Юридический модуль сертифицирован по стандарту ISO 27001
          </div>
        </div>
      </div>
    </div>
  );
};
