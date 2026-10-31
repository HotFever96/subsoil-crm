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
  Stamp,
  Percent,
  Coins,
  ShieldCheck,
  Edit2,
  User,
} from "lucide-react";
import {
  StoCompanyRequisites,
  ServiceEmployee,
  EmployeeRole,
  PaymentScheme,
} from "@/lib/auto-service-types";
import {
  SERVICE_COMPANY_REQUISITES,
  DEFAULT_EMPLOYEES,
  getStoRequisites,
  saveStoRequisites,
} from "@/lib/auto-service-data";
import { useAuth } from "@/lib/auth-context";
import { FacsimileUploader } from "./FacsimileUploader";

interface StoSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StoSettingsModal: React.FC<StoSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user, updateName } = useAuth();
  const currentUsername = user?.username ? user.username.trim().toLowerCase() : "";

  const [form, setForm] = useState<StoCompanyRequisites>(SERVICE_COMPANY_REQUISITES);
  const [userName, setUserName] = useState(user?.name || "");
  const [selectedModel, setSelectedModel] = useState<string>("anthropic/claude-sonnet-4.6");
  const [newMechanicName, setNewMechanicName] = useState("");
  const [isSavedToast, setIsSavedToast] = useState(false);
  const [isAddingEmp, setIsAddingEmp] = useState(false);
  const [newEmpForm, setNewEmpForm] = useState<{
    name: string;
    role: EmployeeRole;
    roleTitle: string;
    phone: string;
    paymentScheme: PaymentScheme;
    laborPercent: number;
    normHourRate: number;
    baseSalary: number;
    partsPercent: number;
  }>({
    name: "",
    role: "mechanic",
    roleTitle: "Автослесарь",
    phone: "",
    paymentScheme: "percent_labor",
    laborPercent: 40,
    normHourRate: 900,
    baseSalary: 0,
    partsPercent: 0,
  });

  useEffect(() => {
    if (isOpen) {
      const loaded = getStoRequisites(currentUsername);
      setForm(loaded);
      setUserName(user?.name || "");
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("geonedra_openrouter_model");
        if (saved) setSelectedModel(saved);
      }
    }
  }, [isOpen, currentUsername, user?.name]);

  if (!isOpen) return null;

  const handleSave = () => {
    saveStoRequisites(form, currentUsername);

    if (userName.trim() && updateName) {
      updateName(userName.trim());
    }
    if (typeof window !== "undefined") {
      localStorage.setItem("geonedra_openrouter_model", selectedModel);
    }

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
            preferred_model: selectedModel,
            display_name: userName.trim() || user?.name,
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

  const handleAddEmployee = () => {
    const trimmed = newEmpForm.name.trim();
    if (!trimmed) return;

    const currentEmployees = form.employees || DEFAULT_EMPLOYEES;
    const newEmp: ServiceEmployee = {
      id: `emp-${Date.now()}`,
      name: trimmed,
      role: newEmpForm.role,
      roleTitle: newEmpForm.roleTitle || "Сотрудник",
      phone: newEmpForm.phone,
      paymentScheme: newEmpForm.paymentScheme,
      laborPercent: newEmpForm.laborPercent,
      normHourRate: newEmpForm.normHourRate,
      baseSalary: newEmpForm.baseSalary,
      partsPercent: newEmpForm.partsPercent,
      isActive: true,
    };

    const updatedEmployees = [...currentEmployees, newEmp];
    const updatedMechanics = Array.from(new Set([...form.mechanics, trimmed]));

    setForm({
      ...form,
      employees: updatedEmployees,
      mechanics: updatedMechanics,
    });

    setNewEmpForm({
      name: "",
      role: "mechanic",
      roleTitle: "Автослесарь",
      phone: "",
      paymentScheme: "percent_labor",
      laborPercent: 40,
      normHourRate: 900,
      baseSalary: 0,
      partsPercent: 0,
    });
    setIsAddingEmp(false);
  };

  const handleUpdateEmpField = (empId: string, field: keyof ServiceEmployee, value: any) => {
    const currentEmployees = form.employees || DEFAULT_EMPLOYEES;
    const updated = currentEmployees.map((e) => (e.id === empId ? { ...e, [field]: value } : e));
    setForm({
      ...form,
      employees: updated,
      mechanics: updated.map((e) => e.name),
    });
  };

  const handleRemoveEmployee = (empId: string) => {
    const currentEmployees = form.employees || DEFAULT_EMPLOYEES;
    const updated = currentEmployees.filter((e) => e.id !== empId);
    setForm({
      ...form,
      employees: updated,
      mechanics: updated.map((e) => e.name),
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white/95 dark:bg-[#0c0d12]/95 backdrop-blur-2xl w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl border border-black/[0.06] dark:border-white/[0.1] flex flex-col overflow-hidden text-slate-900 dark:text-zinc-100 text-xs">
        {/* Header */}
        <div className="p-5 border-b border-black/[0.05] dark:border-white/[0.08] flex items-center justify-between bg-slate-50/60 dark:bg-white/[0.02]">
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
          {/* 0. User Profile & AI Assistant Model */}
          <div className="space-y-3 p-4 rounded-2xl bg-slate-50/70 dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06]">
            <h3 className="font-bold text-slate-800 dark:text-zinc-200 text-xs uppercase tracking-wider flex items-center space-x-1.5">
              <User className="w-3.5 h-3.5 text-rose-500" />
              <span>Профиль пользователя и ИИ</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-500">Ваше имя (обращение ИИ)</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Как к вам обращаться?"
                  className="mt-1 w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-medium"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500">Основная модель ИИ</label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="mt-1 w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium cursor-pointer"
                >
                  <option value="anthropic/claude-sonnet-4.6">Claude Sonnet 4.6 (Основной флагман, рекомендуется)</option>
                  <option value="openai/gpt-5.4">OpenAI GPT-5.4 (Резервный флагман)</option>
                  <option value="google/gemini-3.8-flash">Google Gemini 4 Argon (Высокоскоростной)</option>
                </select>
              </div>
            </div>
          </div>

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

          {/* 4. Facsimile (Stamp and Signature Cutout) */}
          <div className="space-y-4 pt-3 border-t border-slate-200 dark:border-zinc-800">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-zinc-200 text-xs uppercase tracking-wider flex items-center space-x-1.5">
                <Stamp className="w-3.5 h-3.5 text-rose-500" />
                <span>Оттиск печати и образец подписи руководителя (Факсимиле)</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                Загрузите фото или скан печати и подписи на белом листе бумаги. Встроенный Canvas-процессор автоматически удалит бумажный фон, усилит пигмент чернил и обрежет пустые поля для реалистичного наложения на бланки А4.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FacsimileUploader
                label="Оттиск круглой печати (М.П.)"
                type="stamp"
                currentValue={form.stampUrl}
                onChange={(url) => setForm({ ...form, stampUrl: url })}
                description="Скан или четкое фото оттиска печати ИП / СТО на белом листе"
              />

              <FacsimileUploader
                label="Образец подписи руководителя"
                type="signature"
                currentValue={form.signatureUrl}
                onChange={(url) => setForm({ ...form, signatureUrl: url })}
                description="Скан или фото росписи синей/черной ручкой на чистом листе"
              />
            </div>
          </div>

          {/* 5. Employees Motivation & Salary Schemes */}
          <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-zinc-200 text-xs uppercase tracking-wider flex items-center space-x-1.5">
                  <Users className="w-3.5 h-3.5 text-rose-500" />
                  <span>Сотрудники и схема мотивации (Выработка и расчет ЗП)</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                  Индивидуальные ставки для каждого слесаря, мастера и электрика. Автоматически используются в модуле «Выработка и Зарплата».
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddingEmp(!isAddingEmp)}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold flex items-center space-x-1 text-xs cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isAddingEmp ? "Скрыть форму" : "Добавить мастера"}</span>
              </button>
            </div>

            {/* Add Employee Form Drawer */}
            {isAddingEmp && (
              <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 dark:bg-rose-950/20 space-y-3 animate-in fade-in">
                <div className="font-bold text-xs text-rose-700 dark:text-rose-300">
                  Новый сотрудник и параметры начисления ЗП:
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">ФИО сотрудника *</label>
                    <input
                      type="text"
                      value={newEmpForm.name}
                      onChange={(e) => setNewEmpForm({ ...newEmpForm, name: e.target.value })}
                      placeholder="Ковалев С.А."
                      className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">Специализация / Роль</label>
                    <select
                      value={newEmpForm.role}
                      onChange={(e) => {
                        const r = e.target.value as EmployeeRole;
                        const roleTitles: Record<EmployeeRole, string> = {
                          mechanic: "Автослесарь-универсал",
                          engine_specialist: "Моторист-агрегатчик",
                          electrician: "Автоэлектрик-диагност",
                          master_receiver: "Мастер-приемщик",
                          suspension_specialist: "Слесарь по ходовой части",
                          diagnostician: "Диагност",
                        };
                        setNewEmpForm({ ...newEmpForm, role: r, roleTitle: roleTitles[r] });
                      }}
                      className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                    >
                      <option value="mechanic">Автослесарь-универсал</option>
                      <option value="engine_specialist">Моторист-агрегатчик</option>
                      <option value="electrician">Автоэлектрик-диагност</option>
                      <option value="suspension_specialist">Слесарь по ходовой части</option>
                      <option value="master_receiver">Мастер-приемщик</option>
                      <option value="diagnostician">Диагност</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">Схема начисления ЗП</label>
                    <select
                      value={newEmpForm.paymentScheme}
                      onChange={(e) => setNewEmpForm({ ...newEmpForm, paymentScheme: e.target.value as PaymentScheme })}
                      className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-semibold"
                    >
                      <option value="percent_labor">% от стоимости работ</option>
                      <option value="fixed_norm_hour">Фиксированная за 1 нормо-час</option>
                      <option value="combined">Комбинированная (Оклад + %)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  {newEmpForm.paymentScheme === "percent_labor" && (
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">% от стоимости работ</label>
                      <input
                        type="number"
                        value={newEmpForm.laborPercent}
                        onChange={(e) => setNewEmpForm({ ...newEmpForm, laborPercent: Number(e.target.value) || 0 })}
                        className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-bold"
                      />
                    </div>
                  )}

                  {newEmpForm.paymentScheme === "fixed_norm_hour" && (
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">₽ за 1 нормо-час (Н/Ч)</label>
                      <input
                        type="number"
                        value={newEmpForm.normHourRate}
                        onChange={(e) => setNewEmpForm({ ...newEmpForm, normHourRate: Number(e.target.value) || 0 })}
                        className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-bold"
                      />
                    </div>
                  )}

                  {newEmpForm.paymentScheme === "combined" && (
                    <>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">Фиксированный оклад (₽)</label>
                        <input
                          type="number"
                          value={newEmpForm.baseSalary}
                          onChange={(e) => setNewEmpForm({ ...newEmpForm, baseSalary: Number(e.target.value) || 0 })}
                          className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">% от работ</label>
                        <input
                          type="number"
                          value={newEmpForm.laborPercent}
                          onChange={(e) => setNewEmpForm({ ...newEmpForm, laborPercent: Number(e.target.value) || 0 })}
                          className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">% от запчастей</label>
                        <input
                          type="number"
                          value={newEmpForm.partsPercent}
                          onChange={(e) => setNewEmpForm({ ...newEmpForm, partsPercent: Number(e.target.value) || 0 })}
                          className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleAddEmployee}
                    className="px-4 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-bold text-xs cursor-pointer shadow-sm"
                  >
                    Сохранить сотрудника
                  </button>
                </div>
              </div>
            )}

            {/* Existing Employees Table */}
            <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900/50">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-400 border-b border-slate-200 dark:border-zinc-800">
                    <th className="p-2.5 font-bold">ФИО мастера</th>
                    <th className="p-2.5 font-bold">Должность</th>
                    <th className="p-2.5 font-bold">Схема мотивации</th>
                    <th className="p-2.5 font-bold text-right">Параметры ставки</th>
                    <th className="p-2.5 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {(form.employees || []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">
                        Список сотрудников пуст. Нажмите «+ Добавить сотрудника» выше для добавления мастера.
                      </td>
                    </tr>
                  ) : (
                    (form.employees || []).map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/40">
                      <td className="p-2.5 font-bold text-slate-900 dark:text-zinc-100">
                        {emp.name}
                      </td>
                      <td className="p-2.5 text-slate-600 dark:text-zinc-300">
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">
                          {emp.roleTitle || emp.role}
                        </span>
                      </td>
                      <td className="p-2.5">
                        <select
                          value={emp.paymentScheme}
                          onChange={(e) => handleUpdateEmpField(emp.id, "paymentScheme", e.target.value as PaymentScheme)}
                          className="px-2 py-1 rounded bg-transparent border border-slate-200 dark:border-zinc-800 text-xs font-semibold text-rose-600 dark:text-rose-400"
                        >
                          <option value="percent_labor">% от стоимости работ</option>
                          <option value="fixed_norm_hour">Фиксированная за 1 Н/Ч</option>
                          <option value="combined">Комбинированная (Оклад + %)</option>
                        </select>
                      </td>
                      <td className="p-2.5 text-right font-medium">
                        {emp.paymentScheme === "percent_labor" && (
                          <div className="flex items-center justify-end space-x-1">
                            <input
                              type="number"
                              value={emp.laborPercent}
                              onChange={(e) => handleUpdateEmpField(emp.id, "laborPercent", Number(e.target.value))}
                              className="w-16 px-1.5 py-0.5 rounded border border-slate-200 dark:border-zinc-800 text-right font-bold"
                            />
                            <span className="text-slate-500 font-bold">%</span>
                          </div>
                        )}
                        {emp.paymentScheme === "fixed_norm_hour" && (
                          <div className="flex items-center justify-end space-x-1">
                            <input
                              type="number"
                              value={emp.normHourRate}
                              onChange={(e) => handleUpdateEmpField(emp.id, "normHourRate", Number(e.target.value))}
                              className="w-20 px-1.5 py-0.5 rounded border border-slate-200 dark:border-zinc-800 text-right font-bold"
                            />
                            <span className="text-slate-500">₽ / Н-Ч</span>
                          </div>
                        )}
                        {emp.paymentScheme === "combined" && (
                          <div className="text-[11px] text-slate-600 dark:text-zinc-400">
                            {emp.baseSalary?.toLocaleString()} ₽ оклад + {emp.laborPercent}%
                          </div>
                        )}
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveEmployee(emp.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                          title="Удалить сотрудника"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  )))}
                </tbody>
              </table>
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
