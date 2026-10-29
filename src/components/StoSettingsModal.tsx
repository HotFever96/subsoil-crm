"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Building,
  Wrench,
  DollarSign,
  Plus,
  Trash2,
  CheckCircle2,
  Save,
  Users,
} from "lucide-react";
import { StoCompanyRequisites } from "@/lib/auto-service-types";
import {
  SERVICE_COMPANY_REQUISITES,
  getStoRequisites,
  saveStoRequisites,
} from "@/lib/auto-service-data";
import { useAuth } from "@/lib/auth-context";

interface StoSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StoSettingsModal: React.FC<StoSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();
  const currentUsername = user?.username ? user.username.trim().toLowerCase() : "";

  const [form, setForm] = useState<StoCompanyRequisites>(SERVICE_COMPANY_REQUISITES);
  const [newMechanicName, setNewMechanicName] = useState("");
  const [isSavedToast, setIsSavedToast] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(getStoRequisites(currentUsername));
    }
  }, [isOpen, currentUsername]);

  if (!isOpen) return null;

  const handleSave = () => {
    saveStoRequisites(form, currentUsername);

    // Sync to Supabase
    if (currentUsername) {
      fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_user_settings",
          username: currentUsername,
          settings: {
            sto_requisites: form,
          },
        }),
      }).catch(() => {});
    }

    setIsSavedToast(true);
    setTimeout(() => {
      setIsSavedToast(false);
      onClose();
    }, 1200);
  };

  const addMechanic = () => {
    const trimmed = newMechanicName.trim();
    if (!trimmed) return;
    if (form.mechanics.includes(trimmed)) return;
    setForm({
      ...form,
      mechanics: [...form.mechanics, trimmed],
    });
    setNewMechanicName("");
  };

  const removeMechanic = (index: number) => {
    setForm({
      ...form,
      mechanics: form.mechanics.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#0c1015] w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 flex flex-col overflow-hidden text-slate-900 dark:text-zinc-100 text-xs">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50 dark:bg-zinc-900/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center">
              <Building className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold">Настройки реквизитов и сотрудников СТО</h2>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                Данные автоматически используются во всех бланках документов, заказ-нарядах и счетах
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 1. Legal Requisites */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-800 dark:text-zinc-200 text-xs uppercase tracking-wider flex items-center space-x-1.5">
              <Building className="w-3.5 h-3.5 text-rose-500" />
              <span>Юридическое лицо и контактные данные</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-500">Полное наименование организации *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="ИП Водоватовский Антон Игоревич"
                  className="mt-1 w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-medium"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500">Бренд / Торговое название</label>
                <input
                  type="text"
                  value={form.brandName}
                  onChange={(e) => setForm({ ...form, brandName: e.target.value })}
                  placeholder="ИП Водоватовский А.И. (СТО «Чайка-Сервис»)"
                  className="mt-1 w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-medium"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-semibold text-slate-500">Юридический и фактический адрес *</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="629804, ЯНАО, г. Ноябрьск, ул. Магистральная"
                  className="mt-1 w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500">Телефон ресепшн / мастера</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+7 (900) 400-09-00"
                  className="mt-1 w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500">Email для счетов и актов</label>
                <input
                  type="text"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="vodovatovskiy@list.ru"
                  className="mt-1 w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-500">ИНН *</label>
                <input
                  type="text"
                  value={form.inn}
                  onChange={(e) => setForm({ ...form, inn: e.target.value })}
                  placeholder="263112957774"
                  className="mt-1 w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500">ОГРНИП / ОГРН *</label>
                <input
                  type="text"
                  value={form.ogrn}
                  onChange={(e) => setForm({ ...form, ogrn: e.target.value })}
                  placeholder="309264819700017"
                  className="mt-1 w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500">ОКПО</label>
                <input
                  type="text"
                  value={form.okpo || ""}
                  onChange={(e) => setForm({ ...form, okpo: e.target.value })}
                  placeholder="0165990910"
                  className="mt-1 w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500">ОКТМО</label>
                <input
                  type="text"
                  value={form.oktmo || ""}
                  onChange={(e) => setForm({ ...form, oktmo: e.target.value })}
                  placeholder="71958000001"
                  className="mt-1 w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-[11px] font-semibold text-slate-500">ОКВЭД</label>
                <input
                  type="text"
                  value={form.okved || ""}
                  onChange={(e) => setForm({ ...form, okved: e.target.value })}
                  placeholder="45.20, 45.32"
                  className="mt-1 w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500">Система налогообложения</label>
                <input
                  type="text"
                  value={form.taxSystem || ""}
                  onChange={(e) => setForm({ ...form, taxSystem: e.target.value })}
                  placeholder="УСН (Доходы), Патент. Без НДС"
                  className="mt-1 w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                />
              </div>
            </div>
          </div>

          {/* 2. Bank Details */}
          <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-zinc-800">
            <h3 className="font-bold text-slate-800 dark:text-zinc-200 text-xs uppercase tracking-wider flex items-center space-x-1.5">
              <DollarSign className="w-3.5 h-3.5 text-rose-500" />
              <span>Банковские реквизиты (для счетов и договоров)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-500">Банк получателя</label>
                <input
                  type="text"
                  value={form.bankName}
                  onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                  placeholder="Филиал «Екатеринбургский» АО «АЛЬФА-БАНК»"
                  className="mt-1 w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500">БИК банка</label>
                <input
                  type="text"
                  value={form.bik}
                  onChange={(e) => setForm({ ...form, bik: e.target.value })}
                  placeholder="046577964"
                  className="mt-1 w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500">Расчетный счет (Р/С)</label>
                <input
                  type="text"
                  value={form.rs}
                  onChange={(e) => setForm({ ...form, rs: e.target.value })}
                  placeholder="40802810038310009505"
                  className="mt-1 w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500">Корр. счет (К/С)</label>
                <input
                  type="text"
                  value={form.ks}
                  onChange={(e) => setForm({ ...form, ks: e.target.value })}
                  placeholder="30101810100000000964"
                  className="mt-1 w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-mono"
                />
              </div>
            </div>
          </div>

          {/* 3. Norm-Hours & Signatories */}
          <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-zinc-800">
            <h3 className="font-bold text-slate-800 dark:text-zinc-200 text-xs uppercase tracking-wider flex items-center space-x-1.5">
              <Wrench className="w-3.5 h-3.5 text-rose-500" />
              <span>Ставка нормо-часа и ответственные лица</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-500">Базовая ставка (₽ / нормо-час)</label>
                <input
                  type="number"
                  value={form.defaultRatePerHour}
                  onChange={(e) => setForm({ ...form, defaultRatePerHour: Number(e.target.value) || 2500 })}
                  className="mt-1 w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-bold"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500">Мастер-приемщик по умолчанию</label>
                <input
                  type="text"
                  value={form.masterReceiver}
                  onChange={(e) => setForm({ ...form, masterReceiver: e.target.value })}
                  placeholder="Романов А.В."
                  className="mt-1 w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500">Руководитель / Директор СТО</label>
                <input
                  type="text"
                  value={form.director}
                  onChange={(e) => setForm({ ...form, director: e.target.value })}
                  placeholder="Чайковский В.И."
                  className="mt-1 w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                />
              </div>
            </div>
          </div>

          {/* 4. Staff / Mechanics Directory */}
          <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 dark:text-zinc-200 text-xs uppercase tracking-wider flex items-center space-x-1.5">
                <Users className="w-3.5 h-3.5 text-rose-500" />
                <span>Справочник слесарей и механиков ремзоны ({form.mechanics.length})</span>
              </h3>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={newMechanicName}
                onChange={(e) => setNewMechanicName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addMechanic()}
                placeholder="ФИО сотрудника (например: Григорьев К.П.)..."
                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
              />
              <button
                type="button"
                onClick={addMechanic}
                className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-semibold flex items-center space-x-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Добавить</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {form.mechanics.map((m, idx) => (
                <div
                  key={idx}
                  className="flex items-center space-x-2 px-3 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 text-xs font-medium"
                >
                  <span>{m}</span>
                  <button
                    type="button"
                    onClick={() => removeMechanic(idx)}
                    className="text-slate-400 hover:text-rose-500 p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50 dark:bg-zinc-900/60">
          <div className="text-[11px] text-slate-500">
            {isSavedToast ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Настройки сохранены!</span>
              </span>
            ) : (
              <span>Изменения вступают в силу немедленно</span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-800 cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center space-x-1.5 shadow-sm cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Сохранить настройки</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
