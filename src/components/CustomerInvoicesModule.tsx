"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  FileText,
  Plus,
  Search,
  Filter,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Printer,
  QrCode,
  Stamp,
  Send,
  Download,
  Share2,
  HelpCircle,
  ChevronRight,
  FolderArchive,
  ArrowUpRight,
  Receipt,
  User,
  Building,
  Wrench,
  Trash2,
} from "lucide-react";
import {
  CustomerInvoice,
  InvoiceStatus,
  InvoiceItem,
  RepairOrder,
  StoCompanyRequisites,
} from "@/lib/auto-service-types";
import {
  getStoRequisites,
  getInitialOrders,
  normalizeRepairOrder,
  formatCurrency,
  numberToWordsRu,
} from "@/lib/auto-service-data";
import {
  loadCustomerInvoices,
  saveCustomerInvoices,
  createInvoiceFromRepairOrder,
} from "@/lib/customer-invoices-data";
import { generateBankingQrCodeDataUrl } from "@/lib/banking-qr-generator";
import { generateDefaultStampDataUrl, generateDefaultSignatureDataUrl } from "@/lib/canvas-image-processor";
import { useAuth } from "@/lib/auth-context";

export const CustomerInvoicesModule: React.FC = () => {
  const { user } = useAuth();
  const currentUsername = user?.username ? user.username.trim().toLowerCase() : "";

  const [invoices, setInvoices] = useState<CustomerInvoice[]>([]);
  const [orders, setOrders] = useState<RepairOrder[]>([]);
  const [stoReq, setStoReq] = useState<StoCompanyRequisites>(getStoRequisites(currentUsername));
  const [statusFilter, setStatusFilter] = useState<"all" | InvoiceStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createMode, setCreateMode] = useState<"manual" | "from_order">("manual");
  const [selectedInvoice, setSelectedInvoice] = useState<CustomerInvoice | null>(null);
  const [isFacsimile, setIsFacsimile] = useState(true);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [isArchiveSaved, setIsArchiveSaved] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Manual create form
  const [formClientName, setFormClientName] = useState("");
  const [formClientInn, setFormClientInn] = useState("");
  const [formClientPhone, setFormClientPhone] = useState("");
  const [formClientEmail, setFormClientEmail] = useState("");
  const [formNote, setFormNote] = useState("");
  const [formItems, setFormItems] = useState<Array<{ name: string; qty: number; unit: string; price: number }>>([
    { name: "Предоплата за запчасти и расходные материалы", qty: 1, unit: "усл", price: 15000 },
  ]);
  const [selectedOrderIdForInvoice, setSelectedOrderIdForInvoice] = useState<string>("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Load data
  useEffect(() => {
    const loadedReq = getStoRequisites(currentUsername);
    setStoReq(loadedReq);

    const loadedInvoices = loadCustomerInvoices(currentUsername);
    setInvoices(loadedInvoices);

    // Load repair orders
    const ordKey = `geo_ai_repair_orders_${currentUsername || "guest"}_v2`;
    try {
      const raw = localStorage.getItem(ordKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setOrders(parsed.map((o) => normalizeRepairOrder(o, currentUsername)));
        } else {
          setOrders(getInitialOrders(currentUsername).map((o) => normalizeRepairOrder(o, currentUsername)));
        }
      } else {
        setOrders(getInitialOrders(currentUsername).map((o) => normalizeRepairOrder(o, currentUsername)));
      }
    } catch {
      setOrders(getInitialOrders(currentUsername).map((o) => normalizeRepairOrder(o, currentUsername)));
    }

    const handleReqUpdated = () => setStoReq(getStoRequisites(currentUsername));
    const handleInvoicesUpdated = () => setInvoices(loadCustomerInvoices(currentUsername));

    window.addEventListener("geo_ai_sto_requisites_updated", handleReqUpdated);
    window.addEventListener("geo_ai_customer_invoices_updated", handleInvoicesUpdated);

    return () => {
      window.removeEventListener("geo_ai_sto_requisites_updated", handleReqUpdated);
      window.removeEventListener("geo_ai_customer_invoices_updated", handleInvoicesUpdated);
    };
  }, [currentUsername]);

  // Generate Banking QR Code whenever selected invoice changes
  useEffect(() => {
    if (!selectedInvoice) {
      setQrCodeDataUrl("");
      return;
    }
    generateBankingQrCodeDataUrl({
      requisites: stoReq,
      invoiceNumber: selectedInvoice.invoiceNumber,
      totalAmount: selectedInvoice.totalAmount,
      purpose: selectedInvoice.note || `Оплата по счету № ${selectedInvoice.invoiceNumber} без НДС`,
    }).then((url) => {
      setQrCodeDataUrl(url);
    });
  }, [selectedInvoice, stoReq]);

  // KPI Calculations
  const kpi = useMemo(() => {
    const totalIssued = invoices.reduce((acc, i) => acc + (i.status !== "cancelled" ? i.totalAmount : 0), 0);
    const totalPaid = invoices.reduce((acc, i) => acc + (i.paidAmount || 0), 0);
    const totalPending = Math.max(0, totalIssued - totalPaid);
    const paidCount = invoices.filter((i) => i.status === "paid").length;
    return {
      totalIssued,
      totalPaid,
      totalPending,
      paidCount,
      count: invoices.length,
    };
  }, [invoices]);

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (statusFilter !== "all" && inv.status !== statusFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        inv.invoiceNumber.toLowerCase().includes(q) ||
        (inv.orderNumber || "").toLowerCase().includes(q) ||
        inv.client.name.toLowerCase().includes(q) ||
        (inv.client.inn || "").toLowerCase().includes(q) ||
        (inv.client.phone || "").toLowerCase().includes(q)
      );
    });
  }, [invoices, statusFilter, searchQuery]);

  // Handlers
  const handleSaveInvoiceList = (updated: CustomerInvoice[]) => {
    setInvoices(updated);
    saveCustomerInvoices(updated, currentUsername);
  };

  const handleUpdateStatus = (invId: string, nextStatus: InvoiceStatus) => {
    const updated = invoices.map((i) => {
      if (i.id === invId) {
        const isPaid = nextStatus === "paid";
        return {
          ...i,
          status: nextStatus,
          paidAmount: isPaid ? i.totalAmount : nextStatus === "unpaid" ? 0 : i.paidAmount,
          paidAt: isPaid ? new Date().toISOString().slice(0, 10) : i.paidAt,
        };
      }
      return i;
    });
    handleSaveInvoiceList(updated);
    if (selectedInvoice && selectedInvoice.id === invId) {
      const isPaid = nextStatus === "paid";
      setSelectedInvoice({
        ...selectedInvoice,
        status: nextStatus,
        paidAmount: isPaid ? selectedInvoice.totalAmount : nextStatus === "unpaid" ? 0 : selectedInvoice.paidAmount,
      });
    }
    showToast(`Статус счета изменен на «${getStatusLabel(nextStatus)}»`);
  };

  const handleDeleteInvoice = (invId: string) => {
    const updated = invoices.filter((i) => i.id !== invId);
    handleSaveInvoiceList(updated);
    if (selectedInvoice?.id === invId) setSelectedInvoice(null);
    showToast("Счет удален");
  };

  const handleCreateManualInvoice = () => {
    if (!formClientName.trim()) {
      alert("Укажите наименование клиента или организацию");
      return;
    }
    const cleanItems: InvoiceItem[] = formItems
      .filter((it) => it.name.trim() && it.price > 0)
      .map((it, idx) => ({
        id: `it-${Date.now()}-${idx}`,
        name: it.name.trim(),
        qty: Number(it.qty) || 1,
        unit: it.unit || "шт",
        price: Number(it.price) || 0,
        total: (Number(it.qty) || 1) * (Number(it.price) || 0),
        type: "advance",
      }));

    if (cleanItems.length === 0) {
      alert("Добавьте хотя бы одну позицию с суммой");
      return;
    }

    const totalAmount = cleanItems.reduce((acc, i) => acc + i.total, 0);
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const dueDateStr = new Date(now.getTime() + 3 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const nextNum = `СЧ-${now.getFullYear()}-${String(Math.floor(Math.random() * 900) + 200)}`;

    const newInvoice: CustomerInvoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber: nextNum,
      status: "unpaid",
      date: dateStr,
      dueDate: dueDateStr,
      client: {
        type: formClientInn.trim() ? "legal" : "individual",
        name: formClientName.trim(),
        phone: formClientPhone.trim(),
        inn: formClientInn.trim(),
        email: formClientEmail.trim(),
      },
      items: cleanItems,
      subtotal: totalAmount,
      discountTotal: 0,
      totalAmount,
      paidAmount: 0,
      note: formNote.trim() || "Оплата за услуги автосервиса и запчасти. Без НДС.",
      createdAt: dateStr,
      username: currentUsername || "admin",
    };

    const updated = [newInvoice, ...invoices];
    handleSaveInvoiceList(updated);
    setIsCreateModalOpen(false);
    setSelectedInvoice(newInvoice);
    showToast(`Счет ${newInvoice.invoiceNumber} успешно выставлен!`);
  };

  const handleCreateFromOrder = () => {
    const order = orders.find((o) => o.id === selectedOrderIdForInvoice);
    if (!order) {
      alert("Выберите заказ-наряд из списка");
      return;
    }
    const newInvoice = createInvoiceFromRepairOrder(order, currentUsername);
    const updated = [newInvoice, ...invoices];
    handleSaveInvoiceList(updated);
    setIsCreateModalOpen(false);
    setSelectedInvoice(newInvoice);
    showToast(`Счет ${newInvoice.invoiceNumber} на основании ЗН сформирован!`);
  };

  const handleSaveToArchive = () => {
    if (!selectedInvoice || typeof window === "undefined") return;
    try {
      const archKey = `geo_ai_archive_${currentUsername || "guest"}_v1`;
      const existingRaw = localStorage.getItem(archKey);
      const existing = existingRaw ? JSON.parse(existingRaw) : [];

      const archiveItem = {
        id: `arch-inv-${selectedInvoice.id}-${Date.now()}`,
        name: `${selectedInvoice.invoiceNumber}_Счет_на_оплату_${selectedInvoice.client.name.replace(/[^а-яА-Яa-zA-Z0-9_-]/g, "_")}.pdf`,
        category: "table_calc",
        fileType: "pdf",
        size: "240 КБ",
        source: "chat_generated",
        createdAt: new Date().toISOString().slice(0, 10),
        username: currentUsername,
        metadata: {
          description: `Счет на оплату № ${selectedInvoice.invoiceNumber} от ${selectedInvoice.date}. Сумма: ${formatCurrency(selectedInvoice.totalAmount)}. Клиент: ${selectedInvoice.client.name}`,
          tags: ["Счет", "Оплата", selectedInvoice.invoiceNumber, selectedInvoice.client.name, "Чайка-Сервис"],
        },
      };

      localStorage.setItem(archKey, JSON.stringify([archiveItem, ...(Array.isArray(existing) ? existing : [])]));
      window.dispatchEvent(new Event("geo_ai_archive_updated"));
      setIsArchiveSaved(true);
      setTimeout(() => setIsArchiveSaved(false), 2500);
      showToast("Счет сохранен в Электронный архив!");
    } catch (e) {
      console.warn("Archive error:", e);
    }
  };

  const handleShareWhatsApp = () => {
    if (!selectedInvoice) return;
    const phone = selectedInvoice.client.phone.replace(/\D/g, "");
    const text = encodeURIComponent(
      `Здравствуйте! СТО «Чайка-Сервис» выставил счет на оплату № ${selectedInvoice.invoiceNumber} от ${selectedInvoice.date} на сумму ${formatCurrency(selectedInvoice.totalAmount)}. Реквизиты и QR-код для моментальной оплаты в приложении банка: Получатель ИП Водоватовский А.И., Р/с ${stoReq.rs}, БИК ${stoReq.bik}. Спасибо за выбор нашего автосервиса!`
    );
    window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
  };

  function getStatusLabel(st: InvoiceStatus): string {
    switch (st) {
      case "paid":
        return "Оплачен";
      case "partially_paid":
        return "Частично оплачен";
      case "unpaid":
        return "Не оплачен";
      case "cancelled":
        return "Отменен";
      default:
        return st;
    }
  }

  function getStatusBadge(st: InvoiceStatus) {
    switch (st) {
      case "paid":
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Оплачен</span>
          </span>
        );
      case "partially_paid":
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>Частично оплачен</span>
          </span>
        );
      case "unpaid":
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center space-x-1">
            <AlertCircle className="w-3 h-3" />
            <span>Не оплачен</span>
          </span>
        );
      case "cancelled":
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
            Отменен
          </span>
        );
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden text-zinc-900 dark:text-zinc-100">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-70 bg-zinc-900/90 text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-white/10 backdrop-blur-xl text-xs font-semibold flex items-center space-x-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header - Yandex Music Pill & Glass Style */}
      <div className="px-6 py-4.5 border-b border-white/[0.08] bg-white/40 dark:bg-black/30 backdrop-blur-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-rose-500/20 to-amber-500/20 border border-white/10 text-rose-500 flex items-center justify-center shrink-0 shadow-lg shadow-rose-500/10">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center space-x-2.5">
              <span>Счета на оплату</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/10 dark:bg-white/[0.06] border border-white/10 text-zinc-700 dark:text-zinc-300">
                {invoices.length} счетов
              </span>
              <div className="relative group inline-block">
                <button
                  type="button"
                  className="p-1 rounded-full text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  title="Справка"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
                <div className="absolute left-0 top-full mt-1.5 hidden group-hover:block z-30 w-72 p-3 rounded-2xl bg-zinc-900/95 text-zinc-100 text-xs shadow-2xl border border-white/10 backdrop-blur-2xl pointer-events-none">
                  Выставление счетов юрлицам и физлицам, автоматический банковский QR-код (ГОСТ Р 56042-2014) для моментальной оплаты и факсимиле с печатью.
                </div>
              </div>
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={() => {
              setCreateMode("manual");
              setIsCreateModalOpen(true);
            }}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-lg shadow-rose-600/20 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Выставить счет</span>
          </button>
        </div>
      </div>

      {/* Analytics Summary Row - Frosted Floating Cards */}
      <div className="px-6 pt-5 pb-3 shrink-0">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Card 1: Total Issued */}
          <div className="p-4 rounded-3xl bg-white/60 dark:bg-white/[0.05] hover:dark:bg-white/[0.08] border border-zinc-200/60 dark:border-white/[0.1] hover:border-white/20 backdrop-blur-2xl shadow-xl shadow-black/20 transition-all flex items-center justify-between group">
            <div>
              <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Выставлено за месяц
              </span>
              <div className="text-xl font-extrabold text-zinc-900 dark:text-white mt-0.5">
                {formatCurrency(kpi.totalIssued)}
              </div>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                Всего {kpi.count} счетов в реестре
              </span>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>

          {/* Card 2: Total Paid */}
          <div className="p-4 rounded-3xl bg-white/60 dark:bg-white/[0.05] hover:dark:bg-white/[0.08] border border-zinc-200/60 dark:border-white/[0.1] hover:border-white/20 backdrop-blur-2xl shadow-xl shadow-black/20 transition-all flex items-center justify-between group">
            <div>
              <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Оплачено
              </span>
              <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {formatCurrency(kpi.totalPaid)}
              </div>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                Закрыто {kpi.paidCount} счетов
              </span>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          {/* Card 3: Pending Debt */}
          <div className="p-4 rounded-3xl bg-white/60 dark:bg-white/[0.05] hover:dark:bg-white/[0.08] border border-zinc-200/60 dark:border-white/[0.1] hover:border-white/20 backdrop-blur-2xl shadow-xl shadow-black/20 transition-all flex items-center justify-between group">
            <div>
              <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Ожидает оплаты / Дебиторка
              </span>
              <div className="text-xl font-extrabold text-rose-600 dark:text-rose-400 mt-0.5">
                {formatCurrency(kpi.totalPending)}
              </div>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                К поступлению на р/с или кассу
              </span>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Pills & Search Bar (Yandex Capsules) */}
      <div className="px-6 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {[
            { id: "all", label: "Все счета" },
            { id: "unpaid", label: "Не оплачен" },
            { id: "partially_paid", label: "Частично оплачен" },
            { id: "paid", label: "Оплачен" },
            { id: "cancelled", label: "Отменен" },
          ].map((flt) => {
            const isActive = statusFilter === flt.id;
            return (
              <button
                key={flt.id}
                type="button"
                onClick={() => setStatusFilter(flt.id as any)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? "bg-rose-600 text-white shadow-md shadow-rose-600/20 scale-102"
                    : "bg-white/40 dark:bg-white/[0.05] text-zinc-600 dark:text-zinc-300 hover:bg-white/70 dark:hover:bg-white/[0.1] border border-white/[0.07]"
                }`}
              >
                {flt.label}
              </button>
            );
          })}
        </div>

        {/* Pill Search Input */}
        <div className="relative min-w-[280px]">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Номер счета, клиент, ИНН..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-8 py-2 rounded-full bg-white/60 dark:bg-white/[0.05] border border-white/[0.09] backdrop-blur-2xl text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-hidden focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Invoices List / Table (Floating Canvas, no hard box frames) */}
      <div className="flex-1 overflow-y-auto px-6 py-2">
        {filteredInvoices.length === 0 ? (
          <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-8">
            <div className="w-14 h-14 rounded-3xl bg-white/40 dark:bg-white/[0.04] border border-white/10 flex items-center justify-center text-zinc-400 mb-3.5">
              <Receipt className="w-7 h-7 text-rose-500" />
            </div>
            <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">
              {searchQuery ? "Ничего не найдено" : "Счета еще не выставлены"}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mt-1">
              Нажмите «Выставить счет», чтобы создать счет на предоплату запчастей или выгрузить его из заказ-наряда.
            </p>
            {!searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setCreateMode("manual");
                  setIsCreateModalOpen(true);
                }}
                className="mt-4 px-4 py-2 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                Выставить первый счет
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-1.5 pb-12">
            {filteredInvoices.map((inv) => {
              return (
                <div
                  key={inv.id}
                  onClick={() => setSelectedInvoice(inv)}
                  className="group p-4 rounded-2xl bg-white/50 dark:bg-white/[0.05] hover:bg-white dark:hover:bg-white/[0.09] border border-zinc-200/60 dark:border-white/[0.08] hover:border-white/20 backdrop-blur-2xl transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md hover:shadow-xl"
                >
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <QrCode className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-zinc-900 dark:text-white group-hover:text-rose-500 transition-colors">
                          {inv.invoiceNumber}
                        </span>
                        {inv.orderNumber && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800/80 text-zinc-300 border border-white/[0.06] font-mono">
                            {inv.orderNumber}
                          </span>
                        )}
                        <span className="text-[11px] text-zinc-400">• от {inv.date}</span>
                      </div>
                      <div className="text-xs text-zinc-600 dark:text-zinc-300 truncate mt-0.5 font-medium">
                        {inv.client.name}
                        {inv.client.inn ? ` (ИНН ${inv.client.inn})` : ""}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end space-x-4 shrink-0">
                    <div className="text-right">
                      <div className="text-base font-extrabold text-zinc-900 dark:text-white">
                        {formatCurrency(inv.totalAmount)}
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        {inv.paidAmount >= inv.totalAmount
                          ? "Оплачено полностью"
                          : inv.paidAmount > 0
                          ? `Оплачено ${formatCurrency(inv.paidAmount)}`
                          : "Ожидает оплаты"}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {getStatusBadge(inv.status)}
                      <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-rose-500 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL 1: CREATE INVOICE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-xl bg-zinc-950/95 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-xs text-zinc-100">
            {/* Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center space-x-2.5">
                <Receipt className="w-5 h-5 text-rose-500" />
                <h3 className="text-base font-bold text-white">Выставление нового счета на оплату</h3>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="p-3 bg-zinc-900/60 border-b border-white/[0.06] flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setCreateMode("manual")}
                className={`flex-1 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                  createMode === "manual" ? "bg-rose-600 text-white shadow-md" : "text-zinc-400 hover:text-white"
                }`}
              >
                1. Независимый счет (Аванс / Запчасти)
              </button>
              <button
                type="button"
                onClick={() => setCreateMode("from_order")}
                className={`flex-1 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                  createMode === "from_order" ? "bg-rose-600 text-white shadow-md" : "text-zinc-400 hover:text-white"
                }`}
              >
                2. На основании Заказ-наряда
              </button>
            </div>

            {/* Form Body */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {createMode === "manual" ? (
                <>
                  <div className="space-y-1">
                    <label className="text-zinc-400 font-semibold">Контрагент (ФИО / ИП / ООО) *</label>
                    <input
                      type="text"
                      value={formClientName}
                      onChange={(e) => setFormClientName(e.target.value)}
                      placeholder="Например: ООО «СеверТранс» или Смирнов А.В."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white font-medium focus:border-rose-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-zinc-400 font-semibold">ИНН (для юрлиц/ИП)</label>
                      <input
                        type="text"
                        value={formClientInn}
                        onChange={(e) => setFormClientInn(e.target.value)}
                        placeholder="10 или 12 знаков"
                        className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white font-mono focus:border-rose-500 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-zinc-400 font-semibold">Телефон</label>
                      <input
                        type="text"
                        value={formClientPhone}
                        onChange={(e) => setFormClientPhone(e.target.value)}
                        placeholder="+7 (900) 000-00-00"
                        className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white focus:border-rose-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-300">Позиции счета:</span>
                      <button
                        type="button"
                        onClick={() =>
                          setFormItems([...formItems, { name: "", qty: 1, unit: "шт", price: 0 }])
                        }
                        className="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center space-x-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Добавить строку</span>
                      </button>
                    </div>

                    {formItems.map((item, idx) => (
                      <div key={idx} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => {
                            const copy = [...formItems];
                            copy[idx].name = e.target.value;
                            setFormItems(copy);
                          }}
                          placeholder="Наименование услуги или запчасти..."
                          className="flex-1 px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs focus:border-rose-500 focus:outline-none"
                        />
                        <input
                          type="number"
                          value={item.qty}
                          onChange={(e) => {
                            const copy = [...formItems];
                            copy[idx].qty = Number(e.target.value) || 1;
                            setFormItems(copy);
                          }}
                          className="w-14 px-2 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-center text-xs focus:border-rose-500 focus:outline-none"
                        />
                        <input
                          type="number"
                          value={item.price}
                          onChange={(e) => {
                            const copy = [...formItems];
                            copy[idx].price = Number(e.target.value) || 0;
                            setFormItems(copy);
                          }}
                          placeholder="Цена ₽"
                          className="w-24 px-2 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-right text-xs font-bold focus:border-rose-500 focus:outline-none"
                        />
                        {formItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setFormItems(formItems.filter((_, i) => i !== idx))}
                            className="p-1.5 text-zinc-500 hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1 pt-2">
                    <label className="text-zinc-400 font-semibold">Назначение платежа / Примечание</label>
                    <input
                      type="text"
                      value={formNote}
                      onChange={(e) => setFormNote(e.target.value)}
                      placeholder="Оплата за запчасти и услуги ремонта. Без НДС."
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs focus:border-rose-500 focus:outline-none"
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <label className="text-zinc-300 font-semibold">
                    Выберите существующий заказ-наряд для выгрузки в счет:
                  </label>
                  <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                    {orders.map((ord) => (
                      <div
                        key={ord.id}
                        onClick={() => setSelectedOrderIdForInvoice(ord.id)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                          selectedOrderIdForInvoice === ord.id
                            ? "bg-rose-500/15 border-rose-500 text-white font-bold"
                            : "bg-zinc-900/60 border-white/[0.08] text-zinc-300 hover:bg-zinc-800"
                        }`}
                      >
                        <div>
                          <div className="font-bold flex items-center space-x-2">
                            <span>{ord.orderNumber}</span>
                            <span className="text-[11px] text-zinc-400 font-normal">
                              ({ord.vehicle?.make} {ord.vehicle?.model})
                            </span>
                          </div>
                          <div className="text-xs text-zinc-400">{ord.client?.name}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-extrabold text-rose-400">{formatCurrency(ord.grandTotal)}</div>
                          <div className="text-[10px] text-zinc-500">{ord.createdAt}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 flex items-center justify-end space-x-2 bg-zinc-900/40">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={createMode === "manual" ? handleCreateManualInvoice : handleCreateFromOrder}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all shadow-md cursor-pointer"
              >
                Сформировать счет
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: A4 INVOICE BLANK WITH GOST QR-CODE AND FACSIMILE */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:p-0 print:bg-white print:static">
          <div className="w-full max-w-4xl bg-white text-zinc-900 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:rounded-none overflow-hidden">
            {/* Top Modal Action Toolbar */}
            <div className="px-6 py-3.5 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between print:hidden shrink-0">
              <div className="flex items-center space-x-3">
                <span className="font-bold text-sm text-zinc-900">
                  Счет на оплату {selectedInvoice.invoiceNumber}
                </span>
                {getStatusBadge(selectedInvoice.status)}
              </div>

              <div className="flex items-center space-x-2">
                {/* Facsimile toggle */}
                <button
                  type="button"
                  onClick={() => setIsFacsimile(!isFacsimile)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 cursor-pointer transition-colors ${
                    isFacsimile
                      ? "bg-rose-100 text-rose-700 border border-rose-300"
                      : "bg-zinc-200 text-zinc-600"
                  }`}
                  title="Наложить печать и подпись"
                >
                  <Stamp className="w-3.5 h-3.5 text-rose-600" />
                  <span>Печать и подпись</span>
                </button>

                {/* Mark as paid button */}
                {selectedInvoice.status !== "paid" && (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedInvoice.id, "paid")}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Отметить оплаченным</span>
                  </button>
                )}

                {/* Save to Archive */}
                <button
                  type="button"
                  onClick={handleSaveToArchive}
                  className="px-3 py-1.5 rounded-xl bg-zinc-200 hover:bg-zinc-300 text-zinc-700 text-xs font-semibold flex items-center space-x-1.5 cursor-pointer"
                  title="Сохранить копию в Электронный архив"
                >
                  <FolderArchive className="w-3.5 h-3.5 text-rose-600" />
                  <span>{isArchiveSaved ? "Сохранено!" : "В архив"}</span>
                </button>

                {/* WhatsApp Share */}
                {selectedInvoice.client.phone && (
                  <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer"
                    title="Отправить счет клиенту в WhatsApp"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>
                )}

                {/* Print Button */}
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Печать А4</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* A4 INVOICE SHEET (STANDARDIZED RUSSIAN ACCOUNTING BLANK) */}
            <div className="flex-1 overflow-y-auto p-8 sm:p-12 print:p-0 text-[11px] leading-relaxed bg-white">
              {/* Header: Bank details and GOST QR-code */}
              <div className="flex justify-between items-start gap-4 mb-4">
                <div className="flex-1">
                  <div className="text-[10px] text-zinc-500 mb-1 font-semibold">
                    Внимание! Оплата данного счета означает согласие с условиями поставки товара и выполнения работ.
                  </div>

                  {/* Russian Banking Requisites Table */}
                  <table className="w-full border-collapse border border-black text-[11px]">
                    <tbody>
                      <tr>
                        <td colSpan={2} rowSpan={2} className="border border-black p-2 align-top">
                          <div className="text-[9px] text-zinc-500">Банк получателя:</div>
                          <div className="font-bold text-[11px]">{stoReq.bankName}</div>
                        </td>
                        <td className="border border-black p-1.5 w-16 text-[9px] text-zinc-500">БИК</td>
                        <td className="border border-black p-1.5 font-mono font-bold w-44">{stoReq.bik}</td>
                      </tr>
                      <tr>
                        <td className="border border-black p-1.5 text-[9px] text-zinc-500">Сч. №</td>
                        <td className="border border-black p-1.5 font-mono font-bold">{stoReq.ks}</td>
                      </tr>
                      <tr>
                        <td className="border border-black p-1.5 text-[9px] text-zinc-500 w-28">
                          ИНН {stoReq.inn}
                        </td>
                        <td className="border border-black p-1.5 text-[9px] text-zinc-500">
                          {stoReq.kpp ? `КПП ${stoReq.kpp}` : "КПП —"}
                        </td>
                        <td rowSpan={2} className="border border-black p-1.5 text-[9px] text-zinc-500 align-top">
                          Сч. №
                        </td>
                        <td rowSpan={2} className="border border-black p-1.5 font-mono font-bold align-top">
                          {stoReq.rs}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={2} className="border border-black p-2 align-top">
                          <div className="text-[9px] text-zinc-500">Получатель:</div>
                          <div className="font-bold text-[11px]">{stoReq.name}</div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* GOST R 56042-2014 QR CODE BADGE */}
                <div className="w-36 flex flex-col items-center text-center p-2 rounded-xl border border-zinc-300 bg-zinc-50/50 shrink-0">
                  {qrCodeDataUrl ? (
                    <img
                      src={qrCodeDataUrl}
                      alt="Платежный QR-код ГОСТ"
                      className="w-28 h-28 object-contain mix-blend-multiply"
                    />
                  ) : (
                    <div className="w-28 h-28 bg-zinc-200 animate-pulse rounded flex items-center justify-center text-[10px]">
                      Генерация QR...
                    </div>
                  )}
                  <span className="text-[9px] font-bold text-zinc-700 mt-1 uppercase tracking-wider">
                    Оплата по QR (ГОСТ)
                  </span>
                  <span className="text-[8px] text-zinc-500">Сбер, Альфа, Т-Банк</span>
                </div>
              </div>

              {/* Title */}
              <div className="border-b-2 border-black pb-2 mb-4 mt-6">
                <h2 className="text-lg font-black text-zinc-900 tracking-tight">
                  Счет на оплату № {selectedInvoice.invoiceNumber} от {selectedInvoice.date} г.
                </h2>
              </div>

              {/* Parties */}
              <div className="space-y-1.5 mb-6 text-[11px]">
                <div className="flex">
                  <span className="w-28 text-zinc-500 font-semibold shrink-0">Поставщик:</span>
                  <span className="font-bold">
                    {stoReq.name}, ИНН {stoReq.inn}, {stoReq.address}, тел: {stoReq.phone}
                  </span>
                </div>
                <div className="flex">
                  <span className="w-28 text-zinc-500 font-semibold shrink-0">Покупатель:</span>
                  <span className="font-bold">
                    {selectedInvoice.client.name}
                    {selectedInvoice.client.inn ? `, ИНН ${selectedInvoice.client.inn}` : ""}
                    {selectedInvoice.client.address ? `, адрес: ${selectedInvoice.client.address}` : ""}
                    {selectedInvoice.client.phone ? `, тел: ${selectedInvoice.client.phone}` : ""}
                  </span>
                </div>
                {selectedInvoice.orderNumber && (
                  <div className="flex">
                    <span className="w-28 text-zinc-500 font-semibold shrink-0">Основание:</span>
                    <span>Заказ-наряд № {selectedInvoice.orderNumber}</span>
                  </div>
                )}
              </div>

              {/* Items Table */}
              <table className="w-full border-collapse border border-black text-[11px] mb-4">
                <thead>
                  <tr className="bg-zinc-100 font-bold text-center">
                    <th className="border border-black p-1.5 w-8">№</th>
                    <th className="border border-black p-1.5 text-left">Товары (работы, услуги)</th>
                    <th className="border border-black p-1.5 w-16">Кол-во</th>
                    <th className="border border-black p-1.5 w-12">Ед.</th>
                    <th className="border border-black p-1.5 w-24 text-right">Цена (₽)</th>
                    <th className="border border-black p-1.5 w-28 text-right">Сумма (₽)</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInvoice.items.map((it, idx) => (
                    <tr key={it.id || idx}>
                      <td className="border border-black p-1.5 text-center">{idx + 1}</td>
                      <td className="border border-black p-1.5 font-medium">{it.name}</td>
                      <td className="border border-black p-1.5 text-center">{it.qty}</td>
                      <td className="border border-black p-1.5 text-center">{it.unit}</td>
                      <td className="border border-black p-1.5 text-right font-mono">{formatCurrency(it.price)}</td>
                      <td className="border border-black p-1.5 text-right font-mono font-bold">
                        {formatCurrency(it.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="flex justify-end mb-4 text-[11px]">
                <table className="w-72">
                  <tbody>
                    <tr>
                      <td className="font-bold text-right p-1">Итого:</td>
                      <td className="font-bold text-right p-1 font-mono text-sm">
                        {formatCurrency(selectedInvoice.totalAmount)}
                      </td>
                    </tr>
                    <tr>
                      <td className="font-bold text-right p-1">В том числе НДС:</td>
                      <td className="text-right p-1">Без НДС (УСН)</td>
                    </tr>
                    <tr className="border-t border-black">
                      <td className="font-black text-right p-1 text-sm">Всего к оплате:</td>
                      <td className="font-black text-right p-1 font-mono text-base text-rose-600">
                        {formatCurrency(selectedInvoice.totalAmount)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Amount in words */}
              <div className="mb-8 p-2 bg-zinc-50 rounded border border-zinc-200">
                <p>
                  Всего наименований {selectedInvoice.items.length}, на сумму{" "}
                  <strong>{formatCurrency(selectedInvoice.totalAmount)}</strong>
                </p>
                <p className="font-bold capitalize mt-0.5">
                  ({numberToWordsRu(selectedInvoice.totalAmount)})
                </p>
              </div>

              {/* Signatures & Stamp block */}
              <div className="relative pt-6 border-t-2 border-zinc-300 flex justify-between items-end mt-12">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold">Руководитель (Индивидуальный предприниматель):</span>
                    <span className="border-b border-black w-40 inline-block text-center font-serif italic font-bold">
                      {stoReq.director}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold">Бухгалтер:</span>
                    <span className="border-b border-black w-40 inline-block text-center font-serif italic">
                      {stoReq.director}
                    </span>
                  </div>
                </div>

                {/* Real Facsimile overlay */}
                {isFacsimile && (
                  <div className="absolute right-12 -top-10 pointer-events-none select-none flex items-center space-x-4">
                    <img
                      src={stoReq.signatureUrl || generateDefaultSignatureDataUrl()}
                      alt="Подпись"
                      className="w-32 h-auto object-contain mix-blend-multiply opacity-95 transform -rotate-3"
                    />
                    <img
                      src={stoReq.stampUrl || generateDefaultStampDataUrl()}
                      alt="Печать"
                      className="w-36 h-36 object-contain mix-blend-multiply opacity-90 transform rotate-6"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
