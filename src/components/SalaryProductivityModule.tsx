"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  DollarSign,
  TrendingUp,
  Clock,
  Calendar,
  Filter,
  User,
  Users,
  Printer,
  FileText,
  CheckCircle2,
  AlertCircle,
  FolderArchive,
  Search,
  ChevronRight,
  Stamp,
  Sliders,
  Settings,
  X,
  FileCheck,
  Building,
  HelpCircle,
} from "lucide-react";
import {
  RepairOrder,
  ServiceEmployee,
  MasterPayrollSummary,
  MasterPayrollWorkDetail,
  StoCompanyRequisites,
} from "@/lib/auto-service-types";
import {
  getStoRequisites,
  calculateMasterPayroll,
  DEFAULT_EMPLOYEES,
  numberToWordsRu,
  formatCurrency,
  getInitialOrders,
  normalizeRepairOrder,
} from "@/lib/auto-service-data";
import {
  generateDefaultStampDataUrl,
  generateDefaultSignatureDataUrl,
} from "@/lib/canvas-image-processor";
import { useAuth } from "@/lib/auth-context";

interface SalaryProductivityModuleProps {
  orders?: RepairOrder[];
  onOpenSettings?: () => void;
}

export const SalaryProductivityModule: React.FC<SalaryProductivityModuleProps> = ({
  orders: propOrders,
  onOpenSettings,
}) => {
  const { user } = useAuth();
  const currentUsername = user?.username ? user.username.trim().toLowerCase() : "";

  const [localOrders, setLocalOrders] = useState<RepairOrder[]>([]);
  const orders = propOrders && propOrders.length > 0 ? propOrders : localOrders;

  const [stoReq, setStoReq] = useState<StoCompanyRequisites>(getStoRequisites(currentUsername));
  const [periodFilter, setPeriodFilter] = useState<"today" | "week" | "month" | "all">("month");
  const [statusFilter, setStatusFilter] = useState<"all_active" | "closed_only">("all_active");
  const [selectedMasterId, setSelectedMasterId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Manual adjustments: bonus, deduction, status per employee
  const [adjustments, setAdjustments] = useState<
    Record<string, { bonus: number; deduction: number; status: "pending" | "paid" }>
  >({});

  // Payslip modal state
  const [selectedPayslipMaster, setSelectedPayslipMaster] = useState<MasterPayrollSummary | null>(null);
  const [isPayslipFacsimile, setIsPayslipFacsimile] = useState(true);
  const [isPayslipSaved, setIsPayslipSaved] = useState(false);

  // Load orders, requisites and adjustments
  useEffect(() => {
    const loaded = getStoRequisites(currentUsername);
    setStoReq(loaded);

    try {
      const savedAdj = localStorage.getItem(`geo_ai_payroll_adj_${currentUsername || "guest"}_v1`);
      if (savedAdj) {
        setAdjustments(JSON.parse(savedAdj));
      }
    } catch {}

    // Load orders from localStorage
    const storageKey = `geo_ai_repair_orders_${currentUsername || "guest"}_v2`;
    let loadedOrders = getInitialOrders(currentUsername).map((o) => normalizeRepairOrder(o, currentUsername));
    try {
      const savedOrders = localStorage.getItem(storageKey);
      if (savedOrders) {
        const parsed = JSON.parse(savedOrders);
        if (Array.isArray(parsed) && parsed.length > 0) {
          loadedOrders = parsed.map((o) => normalizeRepairOrder(o, currentUsername));
        }
      }
    } catch {}
    setLocalOrders(loadedOrders);

    // Sync from Supabase
    if (currentUsername) {
      fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_repair_orders", username: currentUsername }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.success && Array.isArray(data.orders) && data.orders.length > 0) {
            const normalized = data.orders.map((o: any) => normalizeRepairOrder(o, currentUsername));
            setLocalOrders(normalized);
          }
        })
        .catch(() => {});
    }

    const handleReqUpdated = () => {
      setStoReq(getStoRequisites(currentUsername));
    };
    window.addEventListener("geo_ai_sto_requisites_updated", handleReqUpdated);
    window.addEventListener("geo_ai_repair_orders_updated", () => {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          setLocalOrders(JSON.parse(saved).map((o: any) => normalizeRepairOrder(o, currentUsername)));
        }
      } catch {}
    });

    return () => {
      window.removeEventListener("geo_ai_sto_requisites_updated", handleReqUpdated);
    };
  }, [currentUsername]);

  // Save adjustments when updated
  const updateAdjustment = (
    empId: string,
    field: "bonus" | "deduction" | "status",
    val: any
  ) => {
    setAdjustments((prev) => {
      const current = prev[empId] || { bonus: 0, deduction: 0, status: "pending" };
      const updated = {
        ...prev,
        [empId]: {
          ...current,
          [field]: val,
        },
      };
      try {
        localStorage.setItem(
          `geo_ai_payroll_adj_${currentUsername || "guest"}_v1`,
          JSON.stringify(updated)
        );
      } catch {}
      return updated;
    });
  };

  const employees = useMemo(() => {
    return stoReq.employees && stoReq.employees.length > 0
      ? stoReq.employees
      : [];
  }, [stoReq]);

  const { summaries, kpi } = useMemo(() => {
    return calculateMasterPayroll(orders, employees, {
      periodFilter,
      statusFilter,
      masterFilter: selectedMasterId,
      manualAdjustments: adjustments,
    });
  }, [orders, employees, periodFilter, statusFilter, selectedMasterId, adjustments]);

  // Search filter
  const filteredSummaries = useMemo(() => {
    if (!searchQuery.trim()) return summaries;
    const q = searchQuery.toLowerCase();
    return summaries.filter(
      (s) =>
        s.employeeName.toLowerCase().includes(q) ||
        s.roleTitle.toLowerCase().includes(q)
    );
  }, [summaries, searchQuery]);

  const stampImg = stoReq.stampUrl || generateDefaultStampDataUrl();
  const sigImg = stoReq.signatureUrl || generateDefaultSignatureDataUrl();

  const handleSavePayslipToArchive = (master: MasterPayrollSummary) => {
    if (typeof window !== "undefined") {
      try {
        const archKey = `geo_ai_archive_items_${currentUsername || "guest"}_v2`;
        const existing = JSON.parse(localStorage.getItem(archKey) || "[]");
        const archiveItem = {
          id: `arch-payslip-${master.employeeId}-${Date.now()}`,
          name: `Расчетный листок: ${master.employeeName} (${periodFilter === "month" ? "За месяц" : "За период"})`,
          type: "service_document",
          fileFormat: "pdf",
          size: "42 КБ",
          createdAt: new Date().toISOString().slice(0, 10),
          username: currentUsername,
          metadata: {
            description: `Платежная ведомость выработки мастера ${master.employeeName}. Итого к выплате: ${master.netPayoutRub.toLocaleString()} ₽ (Н/Ч: ${master.totalLaborHours}).`,
            tags: ["Выработка", "Зарплата", master.employeeName, "Чайка-Сервис"],
          },
        };
        localStorage.setItem(archKey, JSON.stringify([archiveItem, ...(Array.isArray(existing) ? existing : [])]));
        window.dispatchEvent(new Event("geo_ai_archive_updated"));
        setIsPayslipSaved(true);
        setTimeout(() => setIsPayslipSaved(false), 2500);
      } catch (err) {
        console.warn("Archive payslip error:", err);
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-100 dark:bg-[#070b10] overflow-y-auto">
      {/* Top Header */}
      <div className="px-6 py-4 bg-white dark:bg-[#0c1015] border-b border-slate-200 dark:border-zinc-800 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 dark:text-zinc-100 flex items-center space-x-2">
                <span>Выработка и Зарплата мастеров</span>
                <div className="relative group inline-block">
                  <button
                    type="button"
                    className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                    title="Справка"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                  <div className="absolute left-0 top-full mt-1.5 hidden group-hover:block z-30 w-72 p-2.5 rounded-xl bg-slate-900/95 dark:bg-zinc-900/95 text-slate-100 text-xs shadow-xl border border-white/10 backdrop-blur-md pointer-events-none">
                    Автоматический расчет сдельной выработки, учет закрытых нормо-часов, начисление премий и печать расчетных листков мастеров.
                  </div>
                </div>
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center space-x-1.5 cursor-pointer transition-colors"
                title="Настройка ставок мотивации сотрудников"
              >
                <Settings className="w-3.5 h-3.5 text-rose-500" />
                <span>Ставки сотрудников</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Period selector */}
          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-zinc-900 p-1 rounded-xl border border-slate-200 dark:border-zinc-800">
            {[
              { id: "today", label: "Сегодня" },
              { id: "week", label: "За неделю" },
              { id: "month", label: "За месяц" },
              { id: "all", label: "За все время" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriodFilter(p.id as any)}
                className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                  periodFilter === p.id
                    ? "bg-white dark:bg-zinc-800 text-rose-600 dark:text-rose-400 font-bold shadow-2xs"
                    : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Status & Master Dropdowns */}
          <div className="flex items-center space-x-2 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 font-medium"
            >
              <option value="all_active">По всем в работе и закрытым</option>
              <option value="closed_only">Только по закрытым / оплаченным</option>
            </select>

            <select
              value={selectedMasterId}
              onChange={(e) => setSelectedMasterId(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 font-medium"
            >
              <option value="all">Все сотрудники СТО ({employees.length})</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.roleTitle || emp.role})
                </option>
              ))}
            </select>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск мастера..."
                className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 placeholder-slate-400 w-40 sm:w-48"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="p-6 space-y-6">
        {employees.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center max-w-lg mx-auto my-12 bg-white dark:bg-[#0c1015] rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Users className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">
                Сотрудники еще не добавлены
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed max-w-sm">
                Добавьте мастеров и настройте схемы начисления ЗП в разделе "Ставки сотрудников"
              </p>
            </div>
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-sm flex items-center space-x-2 cursor-pointer"
              >
                <Settings className="w-4 h-4" />
                <span>Ставки сотрудников</span>
              </button>
            )}
          </div>
        ) : (
          <>
            {/* KPI Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Revenue from Labor */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#0c1015] border border-slate-200 dark:border-zinc-800 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Выручка по работам
              </span>
              <div className="text-xl font-black text-slate-900 dark:text-zinc-100 mt-1">
                {formatCurrency(kpi.totalLaborRevenue)}
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Заказ-наряды за выбранный период
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          {/* Card 2: Total Labor Hours */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#0c1015] border border-slate-200 dark:border-zinc-800 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Отработано нормо-часов
              </span>
              <div className="text-xl font-black text-slate-900 dark:text-zinc-100 mt-1">
                {kpi.totalLaborHours} <span className="text-xs font-semibold text-slate-400">Н/Ч</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Базовая ставка: {stoReq.defaultRatePerHour} ₽ / Н-Ч
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          {/* Card 3: Total Payroll Fund */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#0c1015] border border-slate-200 dark:border-zinc-800 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                ФОТ (Начислено мастерам)
              </span>
              <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">
                {formatCurrency(kpi.totalPayrollFund)}
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Итого к выплате сотрудникам
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>

          {/* Card 4: Net Margin from Labor */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#0c1015] border border-slate-200 dark:border-zinc-800 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Чистая маржа СТО по работам
              </span>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {formatCurrency(kpi.netMarginWorks)}
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Маржинальность:{" "}
                {kpi.totalLaborRevenue > 0
                  ? Math.round((kpi.netMarginWorks / kpi.totalLaborRevenue) * 100)
                  : 0}
                %
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Master Payroll Table */}
        <div className="bg-white dark:bg-[#0c1015] border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-rose-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                Ведомость начислений по сотрудникам ({filteredSummaries.length})
              </h2>
            </div>
            <div className="text-xs text-slate-400">
              Кликните на мастера для просмотра детализации работ и печати расчетного листка
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-zinc-900/60 text-slate-500 dark:text-zinc-400 border-b border-slate-200 dark:border-zinc-800">
                  <th className="p-3 font-semibold">ФИО мастера</th>
                  <th className="p-3 font-semibold">Должность</th>
                  <th className="p-3 font-semibold">Схема мотивации</th>
                  <th className="p-3 font-semibold text-center">Заказ-нарядов</th>
                  <th className="p-3 font-semibold text-center">Н/Ч</th>
                  <th className="p-3 font-semibold text-right">Выручка (₽)</th>
                  <th className="p-3 font-semibold text-right">По выработке</th>
                  <th className="p-3 font-semibold text-right w-24">Премия (+)</th>
                  <th className="p-3 font-semibold text-right w-24">Удержание (-)</th>
                  <th className="p-3 font-bold text-right text-rose-600 dark:text-rose-400">К ВЫПЛАТЕ</th>
                  <th className="p-3 font-semibold text-center">Статус</th>
                  <th className="p-3 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80">
                {filteredSummaries.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="p-8 text-center text-slate-400">
                      Нет данных о выработке за выбранный период
                    </td>
                  </tr>
                ) : (
                  filteredSummaries.map((m) => {
                    const isPaid = m.status === "paid";
                    return (
                      <tr
                        key={m.employeeId}
                        className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors group cursor-pointer"
                        onClick={() => setSelectedPayslipMaster(m)}
                      >
                        <td className="p-3 font-bold text-slate-900 dark:text-zinc-100 group-hover:text-rose-600 dark:group-hover:text-rose-400 flex items-center space-x-2">
                          <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-zinc-800 flex items-center justify-center text-[11px] font-bold text-slate-700 dark:text-zinc-300 shrink-0">
                            {m.employeeName.slice(0, 2)}
                          </div>
                          <span className="truncate">{m.employeeName}</span>
                        </td>

                        <td className="p-3 text-slate-600 dark:text-zinc-400">
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">
                            {m.roleTitle}
                          </span>
                        </td>

                        <td className="p-3 text-slate-600 dark:text-zinc-400 text-[11px]">
                          {m.paymentSchemeLabel}
                        </td>

                        <td className="p-3 text-center font-semibold text-slate-700 dark:text-zinc-300">
                          {m.ordersCount}
                        </td>

                        <td className="p-3 text-center font-bold text-slate-900 dark:text-zinc-100">
                          {m.totalLaborHours}
                        </td>

                        <td className="p-3 text-right font-medium text-slate-700 dark:text-zinc-300">
                          {formatCurrency(m.totalLaborRevenue)}
                        </td>

                        <td className="p-3 text-right font-bold text-slate-900 dark:text-zinc-100">
                          {formatCurrency(m.accruedLaborRub + m.baseSalary)}
                        </td>

                        {/* Interactive Bonus Input */}
                        <td className="p-2 text-right" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="number"
                            value={m.bonusRub || ""}
                            placeholder="0"
                            onChange={(e) =>
                              updateAdjustment(m.employeeId, "bonus", Number(e.target.value) || 0)
                            }
                            className="w-20 px-2 py-1 text-right text-xs rounded border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 font-bold"
                          />
                        </td>

                        {/* Interactive Deduction Input */}
                        <td className="p-2 text-right" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="number"
                            value={m.deductionRub || ""}
                            placeholder="0"
                            onChange={(e) =>
                              updateAdjustment(m.employeeId, "deduction", Number(e.target.value) || 0)
                            }
                            className="w-20 px-2 py-1 text-right text-xs rounded border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-rose-600 dark:text-rose-400 font-bold"
                          />
                        </td>

                        {/* Net Payout */}
                        <td className="p-3 text-right font-black text-rose-600 dark:text-rose-400 text-sm whitespace-nowrap">
                          {formatCurrency(m.netPayoutRub)}
                        </td>

                        {/* Payout Status Toggle */}
                        <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() =>
                              updateAdjustment(m.employeeId, "status", isPaid ? "pending" : "paid")
                            }
                            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                              isPaid
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                            }`}
                          >
                            {isPaid ? "Выплачено" : "Ожидает"}
                          </button>
                        </td>

                        {/* Action link */}
                        <td className="p-3 text-center">
                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-rose-500 transition-colors" />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
          </>
        )}
      </div>

      {/* MODAL: PAYSLIP / РАСЧЕТНЫЙ ЛИСТОК А4 */}
      {selectedPayslipMaster && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:p-0 print:bg-white print:static">
          <div className="w-full max-w-4xl bg-white dark:bg-[#0c1015] border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] print:max-h-none print:border-none print:shadow-none print:rounded-none overflow-hidden">
            {/* Modal Header Bar */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50 dark:bg-zinc-900/60 print:hidden shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center space-x-2">
                    <span>Расчетный листок: {selectedPayslipMaster.employeeName}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-zinc-800 font-semibold text-slate-700 dark:text-zinc-300">
                      {selectedPayslipMaster.roleTitle}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Детализация выполненных работ и расчет начислений
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {/* Facsimile toggle */}
                <button
                  type="button"
                  onClick={() => setIsPayslipFacsimile(!isPayslipFacsimile)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 cursor-pointer transition-colors ${
                    isPayslipFacsimile
                      ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                      : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400"
                  }`}
                  title="Наложить печать и подпись руководителя"
                >
                  <Stamp className="w-3.5 h-3.5 text-rose-500" />
                  <span>Печать и подпись</span>
                </button>

                {/* Save to Archive */}
                <button
                  type="button"
                  onClick={() => handleSavePayslipToArchive(selectedPayslipMaster)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-700 dark:text-zinc-300 text-xs font-semibold flex items-center space-x-1.5 cursor-pointer"
                >
                  {isPayslipSaved ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-600">Сохранено</span>
                    </>
                  ) : (
                    <>
                      <FolderArchive className="w-3.5 h-3.5 text-rose-500" />
                      <span>В архив</span>
                    </>
                  )}
                </button>

                {/* Print Button */}
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-xs font-bold flex items-center space-x-1.5 shadow-sm cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Печать А4</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPayslipMaster(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document A4 Canvas */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-200/50 dark:bg-black/50 print:p-0 print:bg-white">
              <div className="p-8 font-sans text-xs bg-white text-slate-950 max-w-[210mm] mx-auto min-h-[297mm] shadow-lg print:shadow-none print:p-4 print:m-0 print:max-w-none space-y-4 leading-relaxed">
                {/* Header */}
                <div className="border-b-2 border-red-600 pb-3 flex justify-between items-start gap-4">
                  <div className="flex items-start space-x-3.5">
                    <img
                      src="/logo-chaika-white.png"
                      alt="Чайка-Сервис"
                      className="h-9 w-auto object-contain filter invert shrink-0"
                    />
                    <div>
                      <h2 className="text-base font-extrabold text-red-600 uppercase tracking-wide">
                        {stoReq.brandName}
                      </h2>
                      <p className="font-semibold text-xs">{stoReq.name}</p>
                      <p className="text-[11px] text-slate-600">{stoReq.address} • Тел: {stoReq.phone}</p>
                    </div>
                  </div>
                  <div className="text-right text-[11px] text-slate-600 shrink-0">
                    <p>ИНН: <strong>{stoReq.inn}</strong> • ОГРНИП: {stoReq.ogrn}</p>
                    <p>Р/с: {stoReq.rs}</p>
                  </div>
                </div>

                {/* Title */}
                <div className="text-center my-3 pb-2 border-b border-slate-200">
                  <h3 className="text-sm font-bold uppercase tracking-wider">
                    РАСЧЕТНЫЙ ЛИСТОК / ПЛАТЕЖНАЯ ВЕДОМОСТЬ ВЫРАБОТКИ
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    за период:{" "}
                    <strong>
                      {periodFilter === "today"
                        ? "Сегодня"
                        : periodFilter === "week"
                        ? "Текущая неделя"
                        : periodFilter === "month"
                        ? "Текущий месяц"
                        : "Все время"}
                    </strong>
                  </p>
                </div>

                {/* Master Info */}
                <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div>
                    <span className="font-bold text-[10px] uppercase text-slate-400">Сотрудник:</span>
                    <p className="font-bold text-sm text-slate-900">{selectedPayslipMaster.employeeName}</p>
                    <p className="text-slate-600">Должность: <strong>{selectedPayslipMaster.roleTitle}</strong></p>
                  </div>
                  <div>
                    <span className="font-bold text-[10px] uppercase text-slate-400">Схема мотивации:</span>
                    <p className="font-bold text-slate-900">{selectedPayslipMaster.paymentSchemeLabel}</p>
                    <p className="text-slate-600">
                      Закрыто заказов: <strong>{selectedPayslipMaster.ordersCount}</strong> • Всего Н/Ч: <strong>{selectedPayslipMaster.totalLaborHours}</strong>
                    </p>
                  </div>
                </div>

                {/* Details of works */}
                <div className="space-y-1">
                  <div className="font-bold text-slate-900 text-xs">
                    Расшифровка выполненных работ по заказ-нарядам:
                  </div>

                  <table className="w-full text-left border-collapse border border-slate-300 text-[11px]">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-semibold">
                        <th className="p-1.5 border border-slate-300 w-8 text-center">№</th>
                        <th className="p-1.5 border border-slate-300 w-24">Дата / ЗН</th>
                        <th className="p-1.5 border border-slate-300">Автомобиль</th>
                        <th className="p-1.5 border border-slate-300">Наименование работы</th>
                        <th className="p-1.5 border border-slate-300 w-12 text-center">Н/Ч</th>
                        <th className="p-1.5 border border-slate-300 w-24 text-right">Клиент (₽)</th>
                        <th className="p-1.5 border border-slate-300 w-24 text-right">Начислено (₽)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPayslipMaster.details.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-4 text-center text-slate-400">
                            В данном периоде работы не зафиксированы
                          </td>
                        </tr>
                      ) : (
                        selectedPayslipMaster.details.map((d, idx) => (
                          <tr key={idx}>
                            <td className="p-1.5 border border-slate-300 text-center">{idx + 1}</td>
                            <td className="p-1.5 border border-slate-300 whitespace-nowrap">
                              <span className="font-bold">{d.orderNumber}</span>
                              <div className="text-[10px] text-slate-400">{d.date}</div>
                            </td>
                            <td className="p-1.5 border border-slate-300 font-medium">
                              <div>{d.vehicle}</div>
                              <span className="text-[10px] text-slate-500 font-mono">{d.licensePlate}</span>
                            </td>
                            <td className="p-1.5 border border-slate-300">{d.workName}</td>
                            <td className="p-1.5 border border-slate-300 text-center font-bold">
                              {d.laborHours}
                            </td>
                            <td className="p-1.5 border border-slate-300 text-right">
                              {d.clientWorkTotal.toLocaleString()}
                            </td>
                            <td className="p-1.5 border border-slate-300 text-right font-bold text-slate-900">
                              {d.earnedRub.toLocaleString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Calculation breakdown */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-300 space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 block">По выработке:</span>
                      <strong className="text-slate-900 font-bold">
                        {formatCurrency(selectedPayslipMaster.accruedLaborRub)}
                      </strong>
                    </div>

                    {selectedPayslipMaster.baseSalary > 0 && (
                      <div>
                        <span className="text-slate-500 block">Оклад:</span>
                        <strong className="text-slate-900 font-bold">
                          {formatCurrency(selectedPayslipMaster.baseSalary)}
                        </strong>
                      </div>
                    )}

                    {selectedPayslipMaster.bonusRub > 0 && (
                      <div>
                        <span className="text-slate-500 block">Премия / Бонус:</span>
                        <strong className="text-emerald-600 font-bold">
                          +{formatCurrency(selectedPayslipMaster.bonusRub)}
                        </strong>
                      </div>
                    )}

                    {selectedPayslipMaster.deductionRub > 0 && (
                      <div>
                        <span className="text-slate-500 block">Удержания / Аванс:</span>
                        <strong className="text-rose-600 font-bold">
                          -{formatCurrency(selectedPayslipMaster.deductionRub)}
                        </strong>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-300 pt-2 flex justify-between items-center">
                    <span className="font-extrabold text-sm text-slate-900">
                      ИТОГО К ВЫПЛАТЕ НА РУКИ:
                    </span>
                    <span className="font-black text-lg text-rose-600">
                      {formatCurrency(selectedPayslipMaster.netPayoutRub)}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-600 border-t border-slate-200 pt-1.5">
                    <span className="font-bold text-slate-900">Сумма прописью: </span>
                    <span className="italic font-medium text-slate-800">
                      {numberToWordsRu(selectedPayslipMaster.netPayoutRub)}
                    </span>
                  </div>
                </div>

                {/* Signatures with Facsimile overlay */}
                <div className="grid grid-cols-2 gap-8 pt-6 border-t-2 border-slate-300 text-xs">
                  <div>
                    <p className="font-bold text-slate-900">Руководитель / Мастер СТО:</p>
                    <p className="text-slate-600 mb-6">{stoReq.director}</p>

                    <div className="relative inline-block">
                      {isPayslipFacsimile && (
                        <>
                          {sigImg && (
                            <img
                              src={sigImg}
                              alt="Подпись"
                              className="absolute -top-7 left-2 w-32 h-12 object-contain pointer-events-none select-none z-10"
                              style={{ mixBlendMode: "multiply" }}
                            />
                          )}
                          {stampImg && (
                            <img
                              src={stampImg}
                              alt="Оттиск печати"
                              className="absolute -top-10 left-20 w-28 h-28 object-contain pointer-events-none select-none z-20"
                              style={{
                                transform: "rotate(-2.5deg)",
                                mixBlendMode: "multiply",
                                opacity: 0.94,
                              }}
                            />
                          )}
                        </>
                      )}
                      <div className="border-b border-black w-48 mb-1" />
                    </div>
                    <p className="text-[10px] text-slate-500">Подпись / М.П.</p>
                  </div>

                  <div>
                    <p className="font-bold text-slate-900">Сотрудник (Мастер):</p>
                    <p className="text-slate-600 mb-6">{selectedPayslipMaster.employeeName}</p>
                    <div className="border-b border-black w-48 mb-1" />
                    <p className="text-[10px] text-slate-500">Деньги получил, с расчетом согласен</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
