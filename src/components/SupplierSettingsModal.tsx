"use client";

import React, { useState } from "react";
import {
  X,
  Check,
  Save,
  Globe,
  Key,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  ShieldAlert,
  Building2,
} from "lucide-react";
import { SupplierIntegrationConfig } from "@/lib/parts-procurement-types";
import { useAuth } from "@/lib/auth-context";

interface SupplierSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  integrations: SupplierIntegrationConfig[];
  onSave: (updated: SupplierIntegrationConfig[]) => void;
}

export const SupplierSettingsModal: React.FC<SupplierSettingsModalProps> = ({
  isOpen,
  onClose,
  integrations,
  onSave,
}) => {
  const { user } = useAuth();
  const currentUsername = user?.username ? user.username.trim().toLowerCase() : "admin";

  const [configs, setConfigs] = useState<SupplierIntegrationConfig[]>(integrations);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<{
    [id: string]: { success: boolean; message: string };
  }>({});
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  React.useEffect(() => {
    if (integrations && integrations.length > 0) {
      setConfigs(integrations);
    }
  }, [integrations]);

  if (!isOpen) return null;

  const handleToggle = (id: string) => {
    setConfigs((prev) =>
      prev.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c))
    );
  };

  const handleUpdateField = (id: string, field: keyof SupplierIntegrationConfig, value: any) => {
    setConfigs((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
    // Clear test status on field update
    if (testResults[id]) {
      setTestResults((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const handleTestConnection = async (id: string) => {
    const config = configs.find((c) => c.id === id);
    if (!config) return;

    setTestingId(id);
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test_supplier_connection",
          username: currentUsername,
          payload: { supplierConfig: config },
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestResults((prev) => ({
          ...prev,
          [id]: { success: true, message: data.message || "✓ Шлюз активен (Онлайн)" },
        }));
      } else {
        setTestResults((prev) => ({
          ...prev,
          [id]: {
            success: false,
            message: data.error || "❌ Ошибка авторизации: введите действующий API-ключ",
          },
        }));
      }
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [id]: { success: false, message: `❌ Ошибка сети: ${err.message}` },
      }));
    } finally {
      setTestingId(null);
    }
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      if (currentUsername) {
        await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "save_supplier_integrations",
            username: currentUsername,
            payload: { integrations: configs },
          }),
        });
      }
      onSave(configs);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 700);
    } catch (e) {
      console.error("Failed to save supplier configs:", e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="relative w-full max-w-3xl rounded-3xl bg-zinc-900/90 backdrop-blur-2xl border border-white/[0.08] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-white/[0.07] bg-white/[0.02]">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-red-500/10 text-red-500">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Шлюзы API поставщиков автозапчастей
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Официальные учетные записи дистрибьюторов (Росско, Армтек, Автодок, Берг)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/[0.06] text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Supplier List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 divide-y divide-white/[0.04]">
          {configs.map((supp) => {
            const isTesting = testingId === supp.id;
            const result = testResults[supp.id];
            const hasKeys =
              Boolean(supp.apiKey1?.trim()) ||
              Boolean(supp.apiToken?.trim()) ||
              Boolean(supp.login?.trim());

            return (
              <div key={supp.id} className="pt-4 first:pt-0 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => handleToggle(supp.id)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0 ${
                        supp.enabled ? "bg-red-600" : "bg-zinc-700"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          supp.enabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-white">{supp.name}</span>
                        {/* Honest Gateway Status */}
                        {!supp.enabled ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-medium">
                            ⚪ Отключен
                          </span>
                        ) : result ? (
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              result.success
                                ? "bg-emerald-500/15 text-emerald-400"
                                : "bg-rose-500/15 text-rose-400"
                            }`}
                          >
                            {result.success ? "🟢 Онлайн" : "❌ Ошибка"}
                          </span>
                        ) : hasKeys ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-medium">
                            🟡 Не проверен
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-medium">
                            ⚪ Не подключен (Введите API-ключ)
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">{supp.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      type="button"
                      disabled={!supp.enabled || isTesting}
                      onClick={() => handleTestConnection(supp.id)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 border border-white/[0.08] disabled:opacity-40"
                    >
                      {isTesting ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Globe className="w-3.5 h-3.5" />
                      )}
                      <span>{isTesting ? "Проверка..." : "Тест API"}</span>
                    </button>
                  </div>
                </div>

                {/* Status Result Message */}
                {result && (
                  <div
                    className={`p-2.5 rounded-xl text-xs font-medium flex items-center space-x-2 ${
                      result.success
                        ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-300 border border-rose-500/20"
                    }`}
                  >
                    {result.success ? (
                      <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                    ) : (
                      <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                    )}
                    <span>{result.message}</span>
                  </div>
                )}

                {/* Specific Fields depending on supplier */}
                {supp.enabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                    {supp.supplier === "rossko" && (
                      <>
                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                            Rossko API Key 1
                          </label>
                          <input
                            type="text"
                            value={supp.apiKey1 || ""}
                            onChange={(e) => handleUpdateField(supp.id, "apiKey1", e.target.value)}
                            placeholder="Например: rk_live_xxxxxxxxxxxx"
                            className="w-full px-3 py-1.5 rounded-xl border border-white/[0.08] bg-zinc-950 text-white font-mono text-[11px] focus:outline-none focus:border-red-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                            Rossko API Key 2 (Secret)
                          </label>
                          <input
                            type="password"
                            value={supp.apiKey2 || ""}
                            onChange={(e) => handleUpdateField(supp.id, "apiKey2", e.target.value)}
                            placeholder="Секретный ключ партнера"
                            className="w-full px-3 py-1.5 rounded-xl border border-white/[0.08] bg-zinc-950 text-white font-mono text-[11px] focus:outline-none focus:border-red-500"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                            Адрес склада / Филиал получения
                          </label>
                          <input
                            type="text"
                            value={supp.deliveryAddress || ""}
                            onChange={(e) => handleUpdateField(supp.id, "deliveryAddress", e.target.value)}
                            placeholder="Адрес вашего автосервиса для доставки"
                            className="w-full px-3 py-1.5 rounded-xl border border-white/[0.08] bg-zinc-950 text-white focus:outline-none focus:border-red-500"
                          />
                        </div>
                      </>
                    )}

                    {supp.supplier === "armtek" && (
                      <>
                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                            Логин / Учетная запись Armtek
                          </label>
                          <input
                            type="text"
                            value={supp.login || ""}
                            onChange={(e) => handleUpdateField(supp.id, "login", e.target.value)}
                            placeholder="Ваш логин в Armtek"
                            className="w-full px-3 py-1.5 rounded-xl border border-white/[0.08] bg-zinc-950 text-white font-mono text-[11px] focus:outline-none focus:border-red-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                            Код сбытовой организации (VKORG)
                          </label>
                          <input
                            type="text"
                            value={supp.vkorg || ""}
                            onChange={(e) => handleUpdateField(supp.id, "vkorg", e.target.value)}
                            placeholder="Например: 4001"
                            className="w-full px-3 py-1.5 rounded-xl border border-white/[0.08] bg-zinc-950 text-white font-mono text-[11px] focus:outline-none focus:border-red-500"
                          />
                        </div>
                      </>
                    )}

                    {(supp.supplier === "autodoc" ||
                      supp.supplier === "berg" ||
                      supp.supplier === "forum_auto") && (
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                          API Token / Ключ доступа
                        </label>
                        <input
                          type="password"
                          value={supp.apiToken || ""}
                          onChange={(e) => handleUpdateField(supp.id, "apiToken", e.target.value)}
                          placeholder="Введите токен из личного кабинета дистрибьютора"
                          className="w-full px-3 py-1.5 rounded-xl border border-white/[0.08] bg-zinc-950 text-white font-mono text-[11px] focus:outline-none focus:border-red-500"
                        />
                      </div>
                    )}

                    {supp.supplier === "custom_rest" && (
                      <>
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                            URL REST эндпоинта поиска
                          </label>
                          <input
                            type="text"
                            value={supp.endpointUrl || ""}
                            onChange={(e) => handleUpdateField(supp.id, "endpointUrl", e.target.value)}
                            placeholder="https://api.parts-supplier.ru/v1/search"
                            className="w-full px-3 py-1.5 rounded-xl border border-white/[0.08] bg-zinc-950 text-white font-mono text-[11px] focus:outline-none focus:border-red-500"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                            Bearer Token авторизации
                          </label>
                          <input
                            type="password"
                            value={supp.apiToken || ""}
                            onChange={(e) => handleUpdateField(supp.id, "apiToken", e.target.value)}
                            placeholder="Токен авторизации (если требуется)"
                            className="w-full px-3 py-1.5 rounded-xl border border-white/[0.08] bg-zinc-950 text-white font-mono text-[11px] focus:outline-none focus:border-red-500"
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.07] bg-white/[0.02]">
          <div className="text-xs text-zinc-400">
            {configs.filter((c) => c.enabled).length} из {configs.length} шлюзов включено
          </div>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveAll}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : savedSuccess ? (
                <Check className="w-3.5 h-3.5 text-white" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>{savedSuccess ? "Сохранено!" : isSaving ? "Сохранение..." : "Сохранить настройки"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
