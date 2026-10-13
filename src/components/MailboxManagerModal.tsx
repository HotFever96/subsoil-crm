"use client";

import React, { useState } from "react";
import {
  X,
  Plus,
  Mail,
  Server,
  Key,
  CheckCircle2,
  AlertCircle,
  Trash2,
  RefreshCw,
  Shield,
  Palette,
  ExternalLink,
} from "lucide-react";
import { MailboxAccount } from "@/lib/supabase";
import { MAILBOX_PRESETS, BADGE_COLORS, getMailboxBadgeStyle, getMailboxDotColor } from "@/lib/mailbox-presets";

interface MailboxManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  mailboxes: MailboxAccount[];
  onSaveMailbox: (mailbox: MailboxAccount) => Promise<void>;
  onDeleteMailbox: (mailboxId: string) => Promise<void>;
  onSimulateSync?: (mailbox: MailboxAccount) => Promise<void>;
}

export const MailboxManagerModal: React.FC<MailboxManagerModalProps> = ({
  isOpen,
  onClose,
  mailboxes,
  onSaveMailbox,
  onDeleteMailbox,
  onSimulateSync,
}) => {
  const [activeTab, setActiveTab] = useState<"list" | "add">("list");
  
  // Form State
  const [selectedPreset, setSelectedPreset] = useState<string>("yandex");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [imapHost, setImapHost] = useState("imap.yandex.ru");
  const [imapPort, setImapPort] = useState(993);
  const [imapSecure, setImapSecure] = useState(true);
  const [smtpHost, setSmtpHost] = useState("smtp.yandex.ru");
  const [smtpPort, setSmtpPort] = useState(465);
  const [smtpSecure, setSmtpSecure] = useState(true);
  const [badgeColor, setBadgeColor] = useState("sky");

  // Test Connection State
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    const preset = MAILBOX_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setImapHost(preset.imap_host);
      setImapPort(preset.imap_port);
      setImapSecure(preset.imap_secure);
      setSmtpHost(preset.smtp_host);
      setSmtpPort(preset.smtp_port);
      setSmtpSecure(preset.smtp_secure);
    }
  };

  const handleTestConnection = async () => {
    if (!email.trim() || !imapHost.trim() || !smtpHost.trim()) {
      setTestResult({
        success: false,
        message: "Пожалуйста, заполните email и адреса серверов перед проверкой.",
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/mail/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          imap_host: imapHost.trim(),
          imap_port: imapPort,
          smtp_host: smtpHost.trim(),
          smtp_port: smtpPort,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: data.message || "Соединение успешно проверено!",
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || "Ошибка подключения к почтовому серверу.",
        });
      }
    } catch (e: any) {
      setTestResult({
        success: false,
        message: e.message || "Сетевая ошибка при проверке подключения.",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setIsSaving(true);
    try {
      const newMailbox: MailboxAccount = {
        id: `mbx-${Date.now()}`,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        imap_host: imapHost.trim(),
        imap_port: Number(imapPort),
        imap_secure: imapSecure,
        smtp_host: smtpHost.trim(),
        smtp_port: Number(smtpPort),
        smtp_secure: smtpSecure,
        badge_color: badgeColor,
        created_at: new Date().toISOString(),
      };

      await onSaveMailbox(newMailbox);

      // Reset form
      setName("");
      setEmail("");
      setPassword("");
      setTestResult(null);
      setActiveTab("list");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncClick = async (mbx: MailboxAccount) => {
    if (!onSimulateSync) return;
    setSyncingId(mbx.id);
    try {
      await onSimulateSync(mbx);
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-[#131821] border border-slate-200 dark:border-white/[0.08] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-500">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Почтовые ящики (Мульти-IMAP & SMTP)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Подключение и управление несколькими адресами с раздельной маршрутизацией
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="px-6 pt-3 border-b border-slate-100 dark:border-white/[0.06] flex items-center space-x-2 shrink-0 bg-slate-50/50 dark:bg-[#0e1217]">
          <button
            onClick={() => setActiveTab("list")}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === "list"
                ? "border-sky-500 text-sky-600 dark:text-sky-400 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            Подключенные ящики ({mailboxes.length})
          </button>
          <button
            onClick={() => {
              setActiveTab("add");
              setTestResult(null);
            }}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors flex items-center space-x-1 cursor-pointer ${
              activeTab === "add"
                ? "border-sky-500 text-sky-600 dark:text-sky-400 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Добавить ящик</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "list" ? (
            <div className="space-y-4">
              {mailboxes.length === 0 ? (
                <div className="py-12 px-4 text-center space-y-4">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-500">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      Нет подключенных почтовых ящиков
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
                      Подключите почтовые ящики для недропользования (например: «Карьер-1», «Минприроды», «Основной»). Система сможет проверять входящие по IMAP и отправлять ответы строго через нужный SMTP.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab("add")}
                    className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-medium text-xs transition-colors shadow-2xs inline-flex items-center space-x-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Подключить первый ящик</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {mailboxes.map((mbx) => {
                    const badgeClass = getMailboxBadgeStyle(mbx.badge_color);
                    const dotClass = getMailboxDotColor(mbx.badge_color);
                    const isSyncing = syncingId === mbx.id;

                    return (
                      <div
                        key={mbx.id}
                        className="p-4 rounded-xl bg-slate-50/80 dark:bg-[#181d24] border border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between gap-4 transition-all hover:border-slate-300 dark:hover:border-white/[0.12]"
                      >
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${dotClass} shrink-0`} />
                            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {mbx.name}
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border ${badgeClass}`}>
                              [{mbx.name}]
                            </span>
                          </div>

                          <div className="text-xs text-slate-600 dark:text-slate-300 font-mono">
                            {mbx.email}
                          </div>

                          <div className="flex items-center space-x-3 text-[11px] text-slate-400">
                            <span>IMAP: {mbx.imap_host}:{mbx.imap_port}</span>
                            <span>•</span>
                            <span>SMTP: {mbx.smtp_host}:{mbx.smtp_port}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          {onSimulateSync && (
                            <button
                              onClick={() => handleSyncClick(mbx)}
                              disabled={isSyncing}
                              className="px-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-[#131821] hover:bg-slate-100 dark:hover:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 transition-colors flex items-center space-x-1 cursor-pointer"
                              title="Проверить входящие письма по IMAP"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-sky-500" : ""}`} />
                              <span className="hidden sm:inline">IMAP тест</span>
                            </button>
                          )}

                          <button
                            onClick={() => {
                              if (confirm(`Удалить почтовый ящик «${mbx.name}» (${mbx.email})?`)) {
                                onDeleteMailbox(mbx.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Удалить ящик"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5 text-xs">
              {/* Presets */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1.5">
                  Быстрый выбор провайдера:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {MAILBOX_PRESETS.map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => handleSelectPreset(p.id)}
                      className={`px-2.5 py-2 rounded-xl text-center border transition-all cursor-pointer ${
                        selectedPreset === p.id
                          ? "border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-400 font-semibold"
                          : "border-slate-200 dark:border-white/[0.08] bg-slate-50/50 dark:bg-[#181d24] text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      <div className="truncate">{p.title}</div>
                    </button>
                  ))}
                </div>
                {MAILBOX_PRESETS.find((p) => p.id === selectedPreset)?.hint && (
                  <p className="text-[11px] text-slate-400 mt-1.5 flex items-center space-x-1">
                    <Shield className="w-3 h-3 text-sky-500 shrink-0" />
                    <span>{MAILBOX_PRESETS.find((p) => p.id === selectedPreset)?.hint}</span>
                  </p>
                )}
              </div>

              {/* Main Fields: Name, Email, Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Название ящика / Метка *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="например: Карьер-1 или Минприроды"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#181d24] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500/50"
                  />
                  <span className="text-[10px] text-slate-400">
                    Будет отображаться в бейдже на письмах
                  </span>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Email адрес *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="career1@company.ru"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#181d24] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500/50"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Пароль приложения / Токен
                </label>
                <div className="relative">
                  <input
                    type="password"
                    placeholder="Пароль для внешних приложений (App password)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#181d24] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500/50 font-mono"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Для безопасности создайте специальный «Пароль приложений» в кабинете почты (не используйте основной пароль аккаунта).
                </p>
              </div>

              {/* Badge Color Picker */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1.5 flex items-center space-x-1.5">
                  <Palette className="w-3.5 h-3.5" />
                  <span>Цветовой бейдж ящика:</span>
                </label>
                <div className="flex items-center space-x-2">
                  {BADGE_COLORS.map((col) => (
                    <button
                      type="button"
                      key={col.id}
                      onClick={() => setBadgeColor(col.id)}
                      className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] transition-all cursor-pointer ${
                        badgeColor === col.id
                          ? "border-slate-900 dark:border-white ring-2 ring-sky-500/30 font-semibold"
                          : "border-slate-200 dark:border-white/[0.08] opacity-70 hover:opacity-100"
                      } ${col.bg} ${col.text}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                      <span>{col.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* IMAP & SMTP Server Details */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#181d24] border border-slate-200/80 dark:border-white/[0.06] space-y-3">
                <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                  <Server className="w-3.5 h-3.5 text-sky-500" />
                  <span>Серверные параметры (IMAP & SMTP)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* IMAP Settings */}
                  <div className="space-y-2 p-2.5 rounded-lg bg-white dark:bg-[#131821] border border-slate-200/60 dark:border-white/[0.04]">
                    <div className="font-medium text-slate-800 dark:text-slate-200 text-[11px]">
                      Входящая почта (IMAP):
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="imap.server.ru"
                        value={imapHost}
                        onChange={(e) => setImapHost(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded bg-slate-50 dark:bg-[#0c1015] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-slate-100 text-xs focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        value={imapPort}
                        onChange={(e) => setImapPort(Number(e.target.value))}
                        className="w-20 px-2.5 py-1.5 rounded bg-slate-50 dark:bg-[#0c1015] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-slate-100 text-xs focus:outline-none"
                      />
                      <label className="flex items-center space-x-1.5 text-[11px] text-slate-500 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={imapSecure}
                          onChange={(e) => setImapSecure(e.target.checked)}
                          className="rounded text-sky-500"
                        />
                        <span>SSL / TLS</span>
                      </label>
                    </div>
                  </div>

                  {/* SMTP Settings */}
                  <div className="space-y-2 p-2.5 rounded-lg bg-white dark:bg-[#131821] border border-slate-200/60 dark:border-white/[0.04]">
                    <div className="font-medium text-slate-800 dark:text-slate-200 text-[11px]">
                      Исходящая почта (SMTP):
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="smtp.server.ru"
                        value={smtpHost}
                        onChange={(e) => setSmtpHost(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded bg-slate-50 dark:bg-[#0c1015] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-slate-100 text-xs focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        value={smtpPort}
                        onChange={(e) => setSmtpPort(Number(e.target.value))}
                        className="w-20 px-2.5 py-1.5 rounded bg-slate-50 dark:bg-[#0c1015] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-slate-100 text-xs focus:outline-none"
                      />
                      <label className="flex items-center space-x-1.5 text-[11px] text-slate-500 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={smtpSecure}
                          onChange={(e) => setSmtpSecure(e.target.checked)}
                          className="rounded text-sky-500"
                        />
                        <span>SSL / TLS</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Test result message */}
              {testResult && (
                <div
                  className={`p-3 rounded-xl border flex items-start space-x-2.5 ${
                    testResult.success
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                      : "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  )}
                  <div className="text-xs leading-relaxed">{testResult.message}</div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/[0.06]">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/[0.1] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-colors flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? "animate-spin text-sky-500" : ""}`} />
                  <span>{isTesting ? "Проверка..." : "Проверить соединение"}</span>
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("list")}
                    className="px-3 py-2 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-medium transition-colors shadow-2xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <span>{isSaving ? "Сохранение..." : "Сохранить ящик"}</span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
