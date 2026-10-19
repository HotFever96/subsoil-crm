"use client";

import React, { useState, useEffect } from "react";
import {
  Wrench,
  Search,
  Plus,
  Printer,
  Eye,
  Trash2,
  Calendar,
  Car,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Filter,
  DollarSign,
  ChevronRight,
  X,
  LayoutGrid,
  List,
  Sparkles,
} from "lucide-react";
import {
  RepairOrder,
  OrderStatus,
  OrderWorkItem,
  OrderPartItem,
  ServiceDocumentType,
} from "@/lib/auto-service-types";
import {
  getInitialOrders,
  calculateOrderTotals,
  formatCurrency,
  getStatusMeta,
  SERVICE_COMPANY_REQUISITES,
} from "@/lib/auto-service-data";
import { useAuth } from "@/lib/auth-context";
import { ServiceDocumentModal } from "./ServiceDocumentModal";

export const RepairOrdersModule: React.FC = () => {
  const { user } = useAuth();
  const currentUsername = user?.username ? user.username.trim().toLowerCase() : "";
  const storageKey = `geo_ai_repair_orders_${currentUsername || "guest"}_v1`;

  const [orders, setOrders] = useState<RepairOrder[]>([]);
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Document modal state
  const [activeDocOrder, setActiveDocOrder] = useState<RepairOrder | null>(null);
  const [activeDocType, setActiveDocType] = useState<ServiceDocumentType>("work_order");

  // New / Edit Order Modal
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<RepairOrder | null>(null);

  // Form states for new/edit
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientInn, setClientInn] = useState("");
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [vin, setVin] = useState("");
  const [mileage, setMileage] = useState<number>(0);
  const [complaints, setComplaints] = useState("");
  const [orderStatus, setOrderStatus] = useState<OrderStatus>("in_progress");
  const [works, setWorks] = useState<OrderWorkItem[]>([]);
  const [parts, setParts] = useState<OrderPartItem[]>([]);

  // Load orders for current user
  useEffect(() => {
    if (!currentUsername) {
      setOrders([]);
      return;
    }

    let loaded = getInitialOrders(currentUsername);
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          loaded = parsed;
        }
      } else {
        localStorage.setItem(storageKey, JSON.stringify(loaded));
      }
    } catch (e) {
      console.warn("Error loading repair orders from localStorage:", e);
    }
    setOrders(loaded);

    // Sync from Supabase
    fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_repair_orders", username: currentUsername }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.orders) && data.orders.length > 0) {
          setOrders((prev) => {
            const map = new Map<string, RepairOrder>();
            prev.forEach((o) => map.set(o.id, o));
            data.orders.forEach((remote: RepairOrder) => map.set(remote.id, remote));
            const merged = Array.from(map.values());
            try {
              localStorage.setItem(storageKey, JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      })
      .catch(() => {});

    const handleExternalOrderUpdate = () => {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) setOrders(parsed);
        }
      } catch {}
    };

    window.addEventListener("geo_ai_order_updated", handleExternalOrderUpdate);
    return () => window.removeEventListener("geo_ai_order_updated", handleExternalOrderUpdate);
  }, [currentUsername, storageKey]);

  const saveOrders = (updated: RepairOrder[]) => {
    setOrders(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {}
  };

  const openNewOrderModal = () => {
    setEditingOrder(null);
    setClientName("");
    setClientPhone("+7 ");
    setClientInn("");
    setVehicleMake("ГАЗ");
    setVehicleModel("Газель Next");
    setLicensePlate("");
    setVin("");
    setMileage(50000);
    setComplaints("");
    setOrderStatus("in_progress");
    setWorks([
      {
        id: `w-${Date.now()}-1`,
        name: "Диагностика и замена расходных материалов",
        mechanic: SERVICE_COMPANY_REQUISITES.masterReceiver,
        laborHours: 1.5,
        ratePerHour: SERVICE_COMPANY_REQUISITES.defaultRatePerHour,
        discountPercent: 0,
        total: 1.5 * SERVICE_COMPANY_REQUISITES.defaultRatePerHour,
      },
    ]);
    setParts([]);
    setIsEditorOpen(true);
  };

  const openEditOrderModal = (order: RepairOrder) => {
    setEditingOrder(order);
    setClientName(order.client.name);
    setClientPhone(order.client.phone);
    setClientInn(order.client.inn || "");
    setVehicleMake(order.vehicle.make);
    setVehicleModel(order.vehicle.model);
    setLicensePlate(order.vehicle.licensePlate);
    setVin(order.vehicle.vin);
    setMileage(order.vehicle.mileage);
    setComplaints(order.vehicle.complaints || "");
    setOrderStatus(order.status);
    setWorks(order.works || []);
    setParts(order.parts || []);
    setIsEditorOpen(true);
  };

  const handleSaveOrder = () => {
    if (!licensePlate.trim() || !clientName.trim()) {
      alert("Пожалуйста, укажите госномер автомобиля и имя клиента.");
      return;
    }

    const totals = calculateOrderTotals(works, parts);
    const orderNumber = editingOrder
      ? editingOrder.orderNumber
      : `ЗН-${new Date().getFullYear()}-${String(orders.length + 1).padStart(4, "0")}`;

    const newOrder: RepairOrder = {
      id: editingOrder ? editingOrder.id : `ord-${Date.now()}`,
      orderNumber,
      status: orderStatus,
      createdAt: editingOrder ? editingOrder.createdAt : new Date().toISOString().slice(0, 10),
      client: {
        type: clientInn.trim() ? "legal" : "individual",
        name: clientName.trim(),
        phone: clientPhone.trim(),
        inn: clientInn.trim() || undefined,
      },
      vehicle: {
        make: vehicleMake.trim() || "ГАЗ",
        model: vehicleModel.trim() || "Next",
        licensePlate: licensePlate.trim().toUpperCase(),
        vin: vin.trim().toUpperCase() || "X96A21R22P0000000",
        year: 2023,
        mileage: Number(mileage) || 0,
        complaints: complaints.trim(),
      },
      works,
      parts,
      ...totals,
      warrantyDaysWorks: 30,
      warrantyDaysParts: 14,
      masterName: SERVICE_COMPANY_REQUISITES.masterReceiver,
      username: currentUsername,
    };

    let updatedList: RepairOrder[];
    if (editingOrder) {
      updatedList = orders.map((o) => (o.id === editingOrder.id ? newOrder : o));
    } else {
      updatedList = [newOrder, ...orders];
    }

    saveOrders(updatedList);
    setIsEditorOpen(false);

    // Sync to Supabase
    if (currentUsername) {
      fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_repair_order",
          username: currentUsername,
          payload: newOrder,
        }),
      }).catch(() => {});
    }
  };

  const handleDeleteOrder = (id: string) => {
    if (!confirm("Удалить этот заказ-наряд?")) return;
    const updated = orders.filter((o) => o.id !== id);
    saveOrders(updated);

    if (currentUsername) {
      fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_repair_order",
          username: currentUsername,
          payload: { orderId: id },
        }),
      }).catch(() => {});
    }
  };

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    const updated = orders.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o));
    saveOrders(updated);

    const changed = updated.find((o) => o.id === orderId);
    if (changed && currentUsername) {
      fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_repair_order",
          username: currentUsername,
          payload: changed,
        }),
      }).catch(() => {});
    }
  };

  // Add work item
  const addWorkRow = () => {
    setWorks((prev) => [
      ...prev,
      {
        id: `w-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        name: "Слесарные работы",
        mechanic: SERVICE_COMPANY_REQUISITES.masterReceiver,
        laborHours: 1.0,
        ratePerHour: SERVICE_COMPANY_REQUISITES.defaultRatePerHour,
        discountPercent: 0,
        total: 1.0 * SERVICE_COMPANY_REQUISITES.defaultRatePerHour,
      },
    ]);
  };

  const updateWorkRow = (idx: number, field: keyof OrderWorkItem, val: any) => {
    setWorks((prev) => {
      const copy = [...prev];
      const item = { ...copy[idx], [field]: val };
      if (field === "laborHours" || field === "ratePerHour" || field === "discountPercent") {
        const discountFactor = Math.max(0, 1 - (Number(item.discountPercent) || 0) / 100);
        item.total = Math.round((Number(item.laborHours) || 0) * (Number(item.ratePerHour) || 0) * discountFactor);
      }
      copy[idx] = item;
      return copy;
    });
  };

  const removeWorkRow = (idx: number) => {
    setWorks((prev) => prev.filter((_, i) => i !== idx));
  };

  // Add part item
  const addPartRow = () => {
    setParts((prev) => [
      ...prev,
      {
        id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        oem: "",
        name: "Запасная часть",
        qty: 1,
        unit: "шт",
        purchasePrice: 1000,
        salePrice: 1500,
        total: 1500,
      },
    ]);
  };

  const updatePartRow = (idx: number, field: keyof OrderPartItem, val: any) => {
    setParts((prev) => {
      const copy = [...prev];
      const item = { ...copy[idx], [field]: val };
      if (field === "qty" || field === "salePrice") {
        item.total = Math.round((Number(item.qty) || 0) * (Number(item.salePrice) || 0));
      }
      copy[idx] = item;
      return copy;
    });
  };

  const removePartRow = (idx: number) => {
    setParts((prev) => prev.filter((_, i) => i !== idx));
  };

  // Filter orders
  const filteredOrders = orders.filter((o) => {
    if (selectedStatus !== "all" && o.status !== selectedStatus) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchNum = o.orderNumber.toLowerCase().includes(q);
    const matchPlate = o.vehicle.licensePlate.toLowerCase().includes(q);
    const matchVin = o.vehicle.vin.toLowerCase().includes(q);
    const matchClient = o.client.name.toLowerCase().includes(q);
    const matchVehicle = `${o.vehicle.make} ${o.vehicle.model}`.toLowerCase().includes(q);
    return matchNum || matchPlate || matchVin || matchClient || matchVehicle;
  });

  const statuses: OrderStatus[] = ["estimate", "in_progress", "parts_waiting", "ready", "closed"];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] dark:bg-[#090d12] overflow-hidden">
      {/* Top Header Bar */}
      <div className="px-6 py-4.5 border-b border-slate-200 dark:border-white/[0.08] bg-white/70 dark:bg-[#0c121a]/80 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/25 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 shadow-2xs">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
              <span>Заказ-наряды СТО</span>
              <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
                {orders.length} актов
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Ядро Автодилера: нормо-часы, калькуляция, печать А4 и учет ремонтов ({currentUsername})
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-white/[0.05] p-0.5 rounded-xl border border-slate-200/80 dark:border-white/[0.06]">
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === "table"
                  ? "bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 shadow-2xs font-semibold"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
              title="Табличный вид"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === "kanban"
                  ? "bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 shadow-2xs font-semibold"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
              title="Канбан-доска"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={openNewOrderModal}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Новый заказ-наряд</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="px-6 py-3 border-b border-slate-200 dark:border-white/[0.06] bg-slate-50/50 dark:bg-[#0c121a]/40 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        {/* Status Filters */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setSelectedStatus("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
              selectedStatus === "all"
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-bold shadow-2xs"
                : "bg-white dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/[0.06]"
            }`}
          >
            Все ({orders.length})
          </button>
          {statuses.map((st) => {
            const meta = getStatusMeta(st);
            const count = orders.filter((o) => o.status === st).length;
            const isActive = selectedStatus === st;
            return (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer flex items-center space-x-1.5 ${
                  isActive
                    ? "bg-red-600 text-white font-bold shadow-2xs"
                    : "bg-white dark:bg-white/[0.04] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/[0.06]"
                }`}
              >
                <span>{meta.label}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/10">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[280px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Поиск по номеру, госномеру, VIN, клиенту..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-white dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-red-500"
          />
        </div>
      </div>

      {/* Main Content: Table or Kanban */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredOrders.length === 0 ? (
          <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-8">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-3.5">
              <Wrench className="w-7 h-7" />
            </div>
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
              {searchQuery ? "Заказ-наряды не найдены" : "Список заказ-нарядов пуст"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
              Создайте заказ-наряд вручную или поручите открытие ИИ-мастеру прямо в чате.
            </p>
            <button
              onClick={openNewOrderModal}
              className="mt-4 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Создать первый заказ-наряд</span>
            </button>
          </div>
        ) : viewMode === "table" ? (
          /* TABLE VIEW */
          <div className="bg-white dark:bg-[#0e141e] rounded-2xl border border-slate-200 dark:border-white/[0.08] shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.08] text-slate-500 dark:text-slate-400 font-semibold">
                    <th className="py-3 px-4">Номер и дата</th>
                    <th className="py-3 px-4">Автомобиль и госномер</th>
                    <th className="py-3 px-4">Клиент</th>
                    <th className="py-3 px-4">Статус</th>
                    <th className="py-3 px-4 text-right">Работы</th>
                    <th className="py-3 px-4 text-right">Запчасти</th>
                    <th className="py-3 px-4 text-right">ИТОГО</th>
                    <th className="py-3 px-4 text-center">Документы А4</th>
                    <th className="py-3 px-4 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04] text-slate-800 dark:text-slate-200">
                  {filteredOrders.map((ord) => {
                    const statusMeta = getStatusMeta(ord.status);
                    return (
                      <tr key={ord.id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors group">
                        <td className="py-3 px-4 font-medium">
                          <div className="font-bold text-slate-900 dark:text-slate-100">{ord.orderNumber}</div>
                          <div className="text-[11px] text-slate-400">{ord.createdAt}</div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {ord.vehicle.make} {ord.vehicle.model}
                          </div>
                          <div className="flex items-center space-x-1.5 mt-0.5">
                            <span className="px-1.5 py-0.2 rounded font-mono font-bold text-[11px] bg-slate-100 dark:bg-white/[0.06] text-slate-900 dark:text-white border border-slate-200 dark:border-white/[0.08]">
                              {ord.vehicle.licensePlate}
                            </span>
                            <span className="text-[11px] text-slate-400 truncate max-w-[120px]" title={ord.vehicle.vin}>
                              {ord.vehicle.vin.slice(-6)}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-900 dark:text-slate-100">{ord.client.name}</div>
                          <div className="text-[11px] text-slate-400">{ord.client.phone}</div>
                        </td>

                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] border ${statusMeta.bg} ${statusMeta.text} ${statusMeta.border}`}>
                            {statusMeta.label}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right font-medium">
                          {formatCurrency(ord.totalWorks)}
                          <div className="text-[10px] text-slate-400">{ord.works?.length || 0} позиций</div>
                        </td>

                        <td className="py-3 px-4 text-right font-medium">
                          {formatCurrency(ord.totalParts)}
                          <div className="text-[10px] text-slate-400">{ord.parts?.length || 0} деталей</div>
                        </td>

                        <td className="py-3 px-4 text-right font-bold text-red-600 dark:text-red-400 text-sm">
                          {formatCurrency(ord.grandTotal)}
                        </td>

                        {/* Quick Document Modal Trigger */}
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveDocOrder(ord);
                              setActiveDocType("work_order");
                            }}
                            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold transition-colors cursor-pointer"
                            title="Открыть печатную форму А4 (Заказ-наряд, Акт, Счет)"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Печать А4</span>
                          </button>
                        </td>

                        {/* Action buttons */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1 opacity-80 group-hover:opacity-100">
                            <button
                              onClick={() => openEditOrderModal(ord)}
                              className="p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/[0.08] text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                              title="Редактировать / Добавить работы"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteOrder(ord.id)}
                              className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                              title="Удалить"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* KANBAN BOARD VIEW */
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {statuses.map((st) => {
              const meta = getStatusMeta(st);
              const columnOrders = filteredOrders.filter((o) => o.status === st);
              return (
                <div key={st} className="flex flex-col rounded-2xl bg-slate-100/70 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] p-3 max-h-[75vh] overflow-hidden">
                  <div className="flex items-center justify-between px-2 py-1.5 mb-2.5">
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200">{meta.label}</span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-white/[0.08] text-slate-600 dark:text-slate-300">
                      {columnOrders.length}
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                    {columnOrders.map((ord) => (
                      <div
                        key={ord.id}
                        className="p-3.5 rounded-xl bg-white dark:bg-[#111722] border border-slate-200 dark:border-white/[0.08] shadow-2xs hover:border-red-500/40 hover:shadow-md transition-all cursor-pointer"
                        onClick={() => openEditOrderModal(ord)}
                      >
                        <div className="flex justify-between items-start mb-1.5">
                          <span className="font-bold text-xs text-slate-900 dark:text-slate-100">{ord.orderNumber}</span>
                          <span className="text-[10px] text-slate-400">{ord.createdAt}</span>
                        </div>

                        <div className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate">
                          {ord.vehicle.make} {ord.vehicle.model}
                        </div>

                        <div className="inline-block mt-1 px-1.5 py-0.2 rounded font-mono font-bold text-[10px] bg-slate-100 dark:bg-white/[0.06] text-slate-900 dark:text-white border border-slate-200 dark:border-white/[0.08]">
                          {ord.vehicle.licensePlate}
                        </div>

                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-1">
                          {ord.client.name}
                        </div>

                        <div className="pt-2 mt-2 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
                          <span className="font-bold text-red-600 dark:text-red-400 text-xs">
                            {formatCurrency(ord.grandTotal)}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDocOrder(ord);
                              setActiveDocType("work_order");
                            }}
                            className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 cursor-pointer"
                            title="Печать"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Editor Modal: Create / Update Order with live Norm-Hour Calculator */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-4xl bg-white dark:bg-[#0e141e] border border-slate-200 dark:border-white/[0.1] rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between bg-slate-50 dark:bg-[#0a0f18] shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-500/15 text-red-600 dark:text-red-400 flex items-center justify-center font-bold">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {editingOrder ? `Редактирование: ${editingOrder.orderNumber}` : "Новый заказ-наряд (Автодилер)"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Калькулятор нормо-часов, подбор запчастей и пересчет сумм
                  </p>
                </div>
              </div>
              <button onClick={() => setIsEditorOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Canvas */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              {/* Client & Car Section */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] space-y-4">
                <div className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center space-x-2">
                  <Car className="w-4 h-4 text-red-500" />
                  <span>Клиент и Транспортное средство</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500">Заказчик (ФИО / Компания) *</label>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="ИП Смирнов А.В."
                      className="mt-1 w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-500">Телефон *</label>
                    <input
                      type="text"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="+7 (999) 123-45-67"
                      className="mt-1 w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-500">ИНН (для юрлиц)</label>
                    <input
                      type="text"
                      value={clientInn}
                      onChange={(e) => setClientInn(e.target.value)}
                      placeholder="8601092847"
                      className="mt-1 w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500">Марка *</label>
                    <input
                      type="text"
                      value={vehicleMake}
                      onChange={(e) => setVehicleMake(e.target.value)}
                      placeholder="ГАЗ"
                      className="mt-1 w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-500">Модель *</label>
                    <input
                      type="text"
                      value={vehicleModel}
                      onChange={(e) => setVehicleModel(e.target.value)}
                      placeholder="Газель Next"
                      className="mt-1 w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-500">Госномер *</label>
                    <input
                      type="text"
                      value={licensePlate}
                      onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                      placeholder="В456ОР89"
                      className="mt-1 w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-500">VIN-номер</label>
                    <input
                      type="text"
                      value={vin}
                      onChange={(e) => setVin(e.target.value.toUpperCase())}
                      placeholder="X96A21R22..."
                      className="mt-1 w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-500">Пробег (км)</label>
                    <input
                      type="number"
                      value={mileage}
                      onChange={(e) => setMileage(Number(e.target.value))}
                      className="mt-1 w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-500">Причина обращения / Жалобы клиента</label>
                  <input
                    type="text"
                    value={complaints}
                    onChange={(e) => setComplaints(e.target.value)}
                    placeholder="Скрежет при торможении, плановое ТО"
                    className="mt-1 w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-500">Статус заказ-наряда</label>
                  <select
                    value={orderStatus}
                    onChange={(e) => setOrderStatus(e.target.value as OrderStatus)}
                    className="mt-1 w-full sm:w-64 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium"
                  >
                    <option value="estimate">Заявка / Оценка</option>
                    <option value="in_progress">В работе</option>
                    <option value="parts_waiting">Ожидание запчастей</option>
                    <option value="ready">Готов к выдаче</option>
                    <option value="closed">Закрыт / Оплачен</option>
                  </select>
                </div>
              </div>

              {/* Works Table (Norm-Hours) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    1. Выполняемые работы (Нормо-часы)
                  </div>
                  <button
                    type="button"
                    onClick={addWorkRow}
                    className="flex items-center space-x-1 text-xs text-red-600 dark:text-red-400 font-semibold hover:underline cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Добавить работу</span>
                  </button>
                </div>

                <div className="border border-slate-200 dark:border-white/[0.08] rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-400">
                        <th className="p-2.5">Наименование работы</th>
                        <th className="p-2.5 w-32">Мастер</th>
                        <th className="p-2.5 w-20 text-center">Н/Ч</th>
                        <th className="p-2.5 w-24 text-right">Ставка (₽)</th>
                        <th className="p-2.5 w-20 text-center">Скидка %</th>
                        <th className="p-2.5 w-24 text-right">Итого (₽)</th>
                        <th className="p-2.5 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                      {works.map((w, idx) => (
                        <tr key={w.id || idx}>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={w.name}
                              onChange={(e) => updateWorkRow(idx, "name", e.target.value)}
                              className="w-full px-2 py-1 rounded bg-transparent border border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-100"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={w.mechanic}
                              onChange={(e) => updateWorkRow(idx, "mechanic", e.target.value)}
                              className="w-full px-2 py-1 rounded bg-transparent border border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-100"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="number"
                              step="0.1"
                              value={w.laborHours}
                              onChange={(e) => updateWorkRow(idx, "laborHours", Number(e.target.value))}
                              className="w-full px-2 py-1 text-center rounded bg-transparent border border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-100 font-bold"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="number"
                              value={w.ratePerHour}
                              onChange={(e) => updateWorkRow(idx, "ratePerHour", Number(e.target.value))}
                              className="w-full px-2 py-1 text-right rounded bg-transparent border border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-100"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="number"
                              value={w.discountPercent}
                              onChange={(e) => updateWorkRow(idx, "discountPercent", Number(e.target.value))}
                              className="w-full px-2 py-1 text-center rounded bg-transparent border border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-100"
                            />
                          </td>
                          <td className="p-1.5 text-right font-bold text-slate-900 dark:text-slate-100">
                            {w.total.toLocaleString()}
                          </td>
                          <td className="p-1.5 text-center">
                            <button
                              type="button"
                              onClick={() => removeWorkRow(idx)}
                              className="text-slate-400 hover:text-rose-500 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Parts Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    2. Запчасти и материалы
                  </div>
                  <button
                    type="button"
                    onClick={addPartRow}
                    className="flex items-center space-x-1 text-xs text-red-600 dark:text-red-400 font-semibold hover:underline cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Добавить запчасть</span>
                  </button>
                </div>

                <div className="border border-slate-200 dark:border-white/[0.08] rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-400">
                        <th className="p-2.5 w-32">Артикул OEM</th>
                        <th className="p-2.5">Наименование детали</th>
                        <th className="p-2.5 w-16 text-center">Кол-во</th>
                        <th className="p-2.5 w-24 text-right">Цена (₽)</th>
                        <th className="p-2.5 w-24 text-right">Сумма (₽)</th>
                        <th className="p-2.5 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                      {parts.map((p, idx) => (
                        <tr key={p.id || idx}>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={p.oem}
                              onChange={(e) => updatePartRow(idx, "oem", e.target.value)}
                              placeholder="504091562"
                              className="w-full px-2 py-1 font-mono text-[11px] rounded bg-transparent border border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-100"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={p.name}
                              onChange={(e) => updatePartRow(idx, "name", e.target.value)}
                              placeholder="Фильтр масляный"
                              className="w-full px-2 py-1 rounded bg-transparent border border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-100"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="number"
                              value={p.qty}
                              onChange={(e) => updatePartRow(idx, "qty", Number(e.target.value))}
                              className="w-full px-2 py-1 text-center rounded bg-transparent border border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-100 font-bold"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="number"
                              value={p.salePrice}
                              onChange={(e) => updatePartRow(idx, "salePrice", Number(e.target.value))}
                              className="w-full px-2 py-1 text-right rounded bg-transparent border border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-100"
                            />
                          </td>
                          <td className="p-1.5 text-right font-bold text-slate-900 dark:text-slate-100">
                            {p.total.toLocaleString()}
                          </td>
                          <td className="p-1.5 text-center">
                            <button
                              type="button"
                              onClick={() => removePartRow(idx)}
                              className="text-slate-400 hover:text-rose-500 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total Calculation Card */}
              {(() => {
                const calculated = calculateOrderTotals(works, parts);
                return (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/25 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-slate-600 dark:text-slate-300">
                        Работы: <strong className="font-semibold">{formatCurrency(calculated.totalWorks)}</strong> • Запчасти: <strong className="font-semibold">{formatCurrency(calculated.totalParts)}</strong>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Всего нормо-часов: {works.reduce((s, w) => s + (Number(w.laborHours) || 0), 0)} Н/Ч
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-red-500">Итого к оплате:</span>
                      <div className="text-xl font-extrabold text-red-600 dark:text-red-400">
                        {formatCurrency(calculated.grandTotal)}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 border-t border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#0a0f18] flex items-center justify-end space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleSaveOrder}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold transition-all shadow-sm cursor-pointer"
              >
                Сохранить заказ-наряд
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document A4 Print / Export Modal */}
      {activeDocOrder && (
        <ServiceDocumentModal
          order={activeDocOrder}
          initialType={activeDocType}
          isOpen={!!activeDocOrder}
          onClose={() => setActiveDocOrder(null)}
        />
      )}
    </div>
  );
};
