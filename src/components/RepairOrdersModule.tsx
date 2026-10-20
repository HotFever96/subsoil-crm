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
  Boxes,
  FileDown,
  FolderArchive,
  ShieldAlert,
  Fuel,
  Edit,
  ClipboardCheck,
} from "lucide-react";
import {
  RepairOrder,
  OrderStatus,
  OrderWorkItem,
  OrderPartItem,
  ServiceDocumentType,
  VehicleInspectionData,
  WarehousePart,
} from "@/lib/auto-service-types";
import {
  getInitialOrders,
  calculateOrderTotals,
  formatCurrency,
  getStatusMeta,
  getStoRequisites,
} from "@/lib/auto-service-data";
import { useAuth } from "@/lib/auth-context";
import { ServiceDocumentModal } from "./ServiceDocumentModal";
import { PartsProcurementModule } from "./PartsProcurementModule";
import { PartSearchResult } from "@/lib/parts-procurement-types";
import { VehicleInspectionSchematic } from "./VehicleInspectionSchematic";
import { exportAutoServiceDocx } from "@/lib/auto-service-docx";

const DEFAULT_INSPECTION_DATA: VehicleInspectionData = {
  vehicleBodyType: "car",
  fuelLevel: "1/2",
  equipment: {
    sts: true,
    keysCount: 1,
    spareWheel: true,
    jack: true,
    firstAidKit: false,
    warningTriangle: true,
    dashcam: false,
  },
  isDirty: false,
  damages: [],
};

export const RepairOrdersModule: React.FC = () => {
  const { user } = useAuth();
  const currentUsername = user?.username ? user.username.trim().toLowerCase() : "";
  const storageKey = `geo_ai_repair_orders_${currentUsername || "guest"}_v2`;
  const warehouseStorageKey = `geo_ai_warehouse_${currentUsername || "guest"}_v2`;

  const [orders, setOrders] = useState<RepairOrder[]>([]);
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Document modal state for standalone printing from table
  const [activeDocOrder, setActiveDocOrder] = useState<RepairOrder | null>(null);
  const [activeDocType, setActiveDocType] = useState<ServiceDocumentType>("work_order");

  // New / Edit Order Modal
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<RepairOrder | null>(null);
  const [editorTab, setEditorTab] = useState<"works_parts" | "inspection" | "documents">("works_parts");
  const [selectedDocTypeInEditor, setSelectedDocTypeInEditor] = useState<ServiceDocumentType>("work_order");
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [archiveSavedToast, setArchiveSavedToast] = useState(false);

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
  const [recommendations, setRecommendations] = useState("");
  const [orderStatus, setOrderStatus] = useState<OrderStatus>("in_progress");
  const [works, setWorks] = useState<OrderWorkItem[]>([]);
  const [parts, setParts] = useState<OrderPartItem[]>([]);
  const [inspection, setInspection] = useState<VehicleInspectionData>(DEFAULT_INSPECTION_DATA);

  // Sub-modals inside Editor
  const [isProcurementModalOpen, setIsProcurementModalOpen] = useState(false);
  const [isWarehousePickerOpen, setIsWarehousePickerOpen] = useState(false);
  const [availableWarehouseParts, setAvailableWarehouseParts] = useState<WarehousePart[]>([]);
  const [warehouseSearch, setWarehouseSearch] = useState("");

  const stoReq = getStoRequisites(currentUsername);

  // Load orders for current user and purge legacy test mock data
  useEffect(() => {
    if (!currentUsername) {
      setOrders([]);
      return;
    }

    // Purge legacy mock data cache if exists
    try {
      localStorage.removeItem(`geo_ai_repair_orders_${currentUsername}_v1`);
    } catch {}

    let loaded = getInitialOrders(currentUsername);
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Filter out any legacy mock entries
          const cleaned = parsed.filter(
            (o: any) =>
              o.orderNumber !== "ЗН-СЕВ-0012" &&
              o.orderNumber !== "ЗН-2026-0042" &&
              o.orderNumber !== "ЗН-2026-0041" &&
              o.orderNumber !== "ЗН-2026-0043" &&
              !o.client?.name?.includes("Николаев") &&
              !o.client?.name?.includes("ывыфвфы")
          );
          loaded = cleaned;
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
        if (data.success && Array.isArray(data.orders)) {
          const cleanedRemote = data.orders.filter(
            (o: any) =>
              o.orderNumber !== "ЗН-СЕВ-0012" &&
              o.orderNumber !== "ЗН-2026-0042" &&
              o.orderNumber !== "ЗН-2026-0041" &&
              o.orderNumber !== "ЗН-2026-0043" &&
              !o.client?.name?.includes("Николаев") &&
              !o.client?.name?.includes("ывыфвфы")
          );
          setOrders(cleanedRemote);
          try {
            localStorage.setItem(storageKey, JSON.stringify(cleanedRemote));
          } catch {}
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
    setClientPhone("");
    setClientInn("");
    setVehicleMake("");
    setVehicleModel("");
    setLicensePlate("");
    setVin("");
    setMileage(0);
    setComplaints("");
    setRecommendations("");
    setOrderStatus("in_progress");
    setWorks([]);
    setParts([]);
    setInspection({
      vehicleBodyType: "car",
      fuelLevel: "1/2",
      equipment: { sts: true, keysCount: 1, spareWheel: true, jack: true, firstAidKit: false, warningTriangle: true, dashcam: false },
      isDirty: false,
      damages: [],
    });
    setEditorTab("works_parts");
    setIsEditorOpen(true);
  };

  const openEditOrderModal = (order: RepairOrder) => {
    setEditingOrder(order);
    setClientName(order.client.name || "");
    setClientPhone(order.client.phone || "");
    setClientInn(order.client.inn || "");
    setVehicleMake(order.vehicle.make || "");
    setVehicleModel(order.vehicle.model || "");
    setLicensePlate(order.vehicle.licensePlate || "");
    setVin(order.vehicle.vin || "");
    setMileage(order.vehicle.mileage || 0);
    setComplaints(order.vehicle.complaints || "");
    setRecommendations(order.recommendations || "");
    setOrderStatus(order.status || "in_progress");
    setWorks(order.works || []);
    setParts(order.parts || []);
    setInspection(order.inspection || DEFAULT_INSPECTION_DATA);
    setEditorTab("works_parts");
    setIsEditorOpen(true);
  };

  const handleSaveOrder = () => {
    if (!licensePlate.trim() || !clientName.trim()) {
      alert("Пожалуйста, укажите госномер автомобиля и заказчика.");
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
        make: vehicleMake.trim() || "ТС",
        model: vehicleModel.trim() || "",
        licensePlate: licensePlate.trim().toUpperCase(),
        vin: vin.trim().toUpperCase(),
        year: 2023,
        mileage: Number(mileage) || 0,
        complaints: complaints.trim(),
      },
      works,
      parts,
      recommendations: recommendations.trim(),
      inspection,
      ...totals,
      warrantyDaysWorks: 30,
      warrantyDaysParts: 14,
      masterName: stoReq.masterReceiver,
      username: currentUsername,
    };

    let updatedList: RepairOrder[];
    if (editingOrder) {
      updatedList = orders.map((o) => (o.id === editingOrder.id ? newOrder : o));
    } else {
      updatedList = [newOrder, ...orders];
    }

    saveOrders(updatedList);

    // Sync to Supabase
    if (currentUsername) {
      fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_repair_order",
          username: currentUsername,
          payload: { order: newOrder },
        }),
      }).catch(() => {});
    }

    setIsEditorOpen(false);
  };

  const handleDeleteOrder = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!confirm("Вы уверены, что хотите удалить этот заказ-наряд?")) return;
    const updated = orders.filter((o) => o.id !== id);
    saveOrders(updated);
    if (currentUsername) {
      fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_repair_order",
          username: currentUsername,
          payload: { id },
        }),
      }).catch(() => {});
    }
  };

  // Add Work Item Row
  const addWorkRow = () => {
    const newWork: OrderWorkItem = {
      id: `w-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: "",
      mechanic: stoReq.mechanics[0] || stoReq.masterReceiver || "Мастер",
      laborHours: 1.0,
      ratePerHour: stoReq.defaultRatePerHour || 2500,
      discountPercent: 0,
      total: stoReq.defaultRatePerHour || 2500,
    };
    setWorks([...works, newWork]);
  };

  const updateWorkRow = (idx: number, field: keyof OrderWorkItem, val: any) => {
    const updated = [...works];
    const row = { ...updated[idx], [field]: val };
    const disc = Math.max(0, 1 - (row.discountPercent || 0) / 100);
    row.total = Math.round((Number(row.laborHours) || 0) * (Number(row.ratePerHour) || 0) * disc);
    updated[idx] = row;
    setWorks(updated);
  };

  const removeWorkRow = (idx: number) => {
    setWorks(works.filter((_, i) => i !== idx));
  };

  // Add Part Item Row
  const addPartRow = () => {
    const newPart: OrderPartItem = {
      id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      oem: "",
      name: "",
      qty: 1,
      unit: "шт",
      purchasePrice: 0,
      salePrice: 0,
      total: 0,
    };
    setParts([...parts, newPart]);
  };

  const updatePartRow = (idx: number, field: keyof OrderPartItem, val: any) => {
    const updated = [...parts];
    const row = { ...updated[idx], [field]: val };
    row.total = Math.round((Number(row.qty) || 0) * (Number(row.salePrice) || 0));
    updated[idx] = row;
    setParts(updated);
  };

  const removePartRow = (idx: number) => {
    setParts(parts.filter((_, i) => i !== idx));
  };

  // Handlers for External Parts selection
  const handleAddProcuredPart = (part: PartSearchResult) => {
    const newPart: OrderPartItem = {
      id: `p-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: `${part.brand} - ${part.name}`,
      oem: part.oem,
      qty: 1,
      unit: "шт",
      purchasePrice: part.purchasePrice,
      salePrice: part.salePrice || part.purchasePrice,
      total: part.salePrice || part.purchasePrice,
    };
    setParts((prev) => [...prev, newPart]);
    setIsProcurementModalOpen(false);
  };

  const openWarehousePicker = () => {
    let partsList: WarehousePart[] = [];
    try {
      const raw = localStorage.getItem(warehouseStorageKey);
      if (raw) partsList = JSON.parse(raw);
    } catch {}
    setAvailableWarehouseParts(partsList);
    setWarehouseSearch("");
    setIsWarehousePickerOpen(true);
  };

  const handleSelectWarehousePart = (p: WarehousePart) => {
    const newPartItem: OrderPartItem = {
      id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      oem: p.oem,
      name: p.name,
      qty: 1,
      unit: p.unit || "шт",
      purchasePrice: p.purchasePrice,
      salePrice: p.salePrice,
      total: p.salePrice,
    };
    setParts((prev) => [...prev, newPartItem]);
    setIsWarehousePickerOpen(false);
  };

  // Helper draft for Tab 3 (A4 Documents preview)
  const draftOrderForDoc: RepairOrder = {
    id: editingOrder?.id || `ord-${Date.now()}`,
    orderNumber: editingOrder?.orderNumber || `ЗН-${new Date().getFullYear()}-${String(orders.length + 1).padStart(4, "0")}`,
    status: orderStatus,
    createdAt: editingOrder?.createdAt || new Date().toISOString().slice(0, 10),
    client: {
      type: clientInn ? "legal" : "individual",
      name: clientName || "Клиент",
      phone: clientPhone,
      inn: clientInn,
    },
    vehicle: {
      make: vehicleMake || "ТС",
      model: vehicleModel || "",
      licensePlate: licensePlate || "Б/Н",
      vin: vin || "",
      year: 2023,
      mileage: Number(mileage) || 0,
      complaints,
    },
    works,
    parts,
    recommendations,
    inspection,
    ...calculateOrderTotals(works, parts),
    username: currentUsername,
  };

  const handleSaveToArchive = () => {
    const docName = `${draftOrderForDoc.orderNumber}_${selectedDocTypeInEditor}_${draftOrderForDoc.vehicle.licensePlate}.docx`;
    if (typeof window !== "undefined") {
      const archKey = `geo_ai_archive_${currentUsername}_v1`;
      try {
        const raw = localStorage.getItem(archKey);
        const existing = raw ? JSON.parse(raw) : [];
        const archiveItem = {
          id: `arch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: docName,
          category: "project_doc",
          fileType: "word",
          size: "1.8 МБ",
          source: "chat_generated",
          createdAt: new Date().toISOString().slice(0, 10),
          username: currentUsername,
          metadata: {
            licenseNumber: draftOrderForDoc.vehicle.licensePlate,
            description: `Документ автосервиса: ${selectedDocTypeInEditor} для ${draftOrderForDoc.client.name}`,
            tags: ["Чайка-Сервис", "Заказ-наряд", draftOrderForDoc.vehicle.licensePlate],
          },
        };
        localStorage.setItem(archKey, JSON.stringify([archiveItem, ...(Array.isArray(existing) ? existing : [])]));
        window.dispatchEvent(new Event("geo_ai_archive_updated"));
      } catch {}
    }
    setArchiveSavedToast(true);
    setTimeout(() => setArchiveSavedToast(false), 2000);
  };

  const filteredOrders = orders.filter((o) => {
    if (selectedStatus !== "all" && o.status !== selectedStatus) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      o.orderNumber.toLowerCase().includes(q) ||
      o.client.name.toLowerCase().includes(q) ||
      o.vehicle.licensePlate.toLowerCase().includes(q) ||
      o.vehicle.vin.toLowerCase().includes(q) ||
      `${o.vehicle.make} ${o.vehicle.model}`.toLowerCase().includes(q)
    );
  });

  const statuses: OrderStatus[] = ["estimate", "in_progress", "parts_waiting", "ready", "closed"];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] dark:bg-[#090d12] overflow-hidden text-slate-900 dark:text-zinc-100">
      {/* Top Header - Strict Industrial ERP Style */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-zinc-800 bg-white/70 dark:bg-[#0c121a]/80 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
              <span>Заказ-наряды</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300">
                {orders.length} записей
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Учет ремонтов, калькуляция нормо-часов, акты осмотра и пакет документов А4
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-zinc-900 p-0.5 rounded-lg border border-slate-200 dark:border-zinc-800">
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === "table"
                  ? "bg-white dark:bg-zinc-800 text-red-600 dark:text-red-400 shadow-2xs font-semibold"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
              title="Табличный вид"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === "kanban"
                  ? "bg-white dark:bg-zinc-800 text-red-600 dark:text-red-400 shadow-2xs font-semibold"
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
      <div className="px-6 py-3 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-[#0c121a]/40 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        {/* Status Filters */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setSelectedStatus("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
              selectedStatus === "all"
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-bold shadow-2xs"
                : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-800"
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
                    : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-800"
                }`}
              >
                <span>{meta.label}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/10 font-mono">
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
            className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-red-500"
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
            <h3 className="text-base font-semibold text-slate-800 dark:text-zinc-200">
              {searchQuery ? "Заказ-наряды не найдены" : "Список заказ-нарядов пуст"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mt-1">
              Создайте заказ-наряд вручную или поручите открытие ИИ-шеф-мастеру прямо в чате.
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
          /* TABLE VIEW WITH ROW CLICK EDITING */
          <div className="bg-white dark:bg-[#0c121a] rounded-xl border border-slate-200 dark:border-zinc-800 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-zinc-900/60 border-b border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 font-semibold">
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
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80 text-slate-800 dark:text-zinc-200">
                  {filteredOrders.map((ord) => {
                    const statusMeta = getStatusMeta(ord.status);
                    return (
                      <tr
                        key={ord.id}
                        onClick={() => openEditOrderModal(ord)}
                        className="hover:bg-slate-50/80 dark:hover:bg-zinc-900/50 transition-colors group cursor-pointer"
                      >
                        <td className="py-3 px-4 font-medium">
                          <div className="font-bold text-slate-900 dark:text-slate-100">{ord.orderNumber}</div>
                          <div className="text-[11px] text-slate-400">{ord.createdAt}</div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {ord.vehicle.make} {ord.vehicle.model}
                          </div>
                          <div className="flex items-center space-x-1.5 mt-0.5">
                            <span className="px-1.5 py-0.2 rounded font-mono font-bold text-[11px] bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white border border-slate-200 dark:border-zinc-700">
                              {ord.vehicle.licensePlate}
                            </span>
                            {ord.vehicle.vin && (
                              <span className="text-[11px] text-slate-400 truncate max-w-[120px]" title={ord.vehicle.vin}>
                                {ord.vehicle.vin.slice(-6)}
                              </span>
                            )}
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
                          <div className="text-[10px] text-slate-400">{ord.works?.length || 0} поз.</div>
                        </td>

                        <td className="py-3 px-4 text-right font-medium">
                          {formatCurrency(ord.totalParts)}
                          <div className="text-[10px] text-slate-400">{ord.parts?.length || 0} дет.</div>
                        </td>

                        <td className="py-3 px-4 text-right font-bold text-red-600 dark:text-red-400 text-sm">
                          {formatCurrency(ord.grandTotal)}
                        </td>

                        {/* Quick Document Modal Trigger */}
                        <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveDocOrder(ord);
                              setActiveDocType("work_order");
                            }}
                            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold transition-colors cursor-pointer border border-red-500/20"
                            title="Открыть печатные формы А4"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Печать А4</span>
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              type="button"
                              onClick={() => openEditOrderModal(ord)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                              title="Редактировать заказ-наряд"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteOrder(ord.id, e)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
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
          /* KANBAN BOARD */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {statuses.map((st) => {
              const meta = getStatusMeta(st);
              const columnOrders = filteredOrders.filter((o) => o.status === st);
              return (
                <div key={st} className="flex flex-col bg-slate-50 dark:bg-zinc-900/60 rounded-xl border border-slate-200 dark:border-zinc-800 p-3 min-h-[450px]">
                  <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-200 dark:border-zinc-800">
                    <span className="font-bold text-xs text-slate-800 dark:text-zinc-200">{meta.label}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 font-bold">
                      {columnOrders.length}
                    </span>
                  </div>

                  <div className="space-y-2 flex-1 overflow-y-auto">
                    {columnOrders.map((ord) => (
                      <div
                        key={ord.id}
                        onClick={() => openEditOrderModal(ord)}
                        className="p-3 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-red-500/50 shadow-2xs cursor-pointer transition-all space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-900 dark:text-slate-100">{ord.orderNumber}</span>
                          <span className="font-mono text-[10px] text-slate-400">{ord.createdAt}</span>
                        </div>
                        <div>
                          <div className="font-semibold text-xs text-slate-800 dark:text-zinc-200">{ord.vehicle.make} {ord.vehicle.model}</div>
                          <div className="font-mono font-bold text-[11px] text-red-600 dark:text-red-400">{ord.vehicle.licensePlate}</div>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">{ord.client.name}</div>
                        <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400">{ord.works?.length || 0} раб. • {ord.parts?.length || 0} запч.</span>
                          <span className="font-bold text-xs text-slate-900 dark:text-zinc-100">{formatCurrency(ord.grandTotal)}</span>
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

      {/* FULL REPAIR ORDER MODAL: 3 WORK TABS */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0c1015] w-full max-w-5xl h-[92vh] rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 flex flex-col overflow-hidden">
            {/* Modal Header & Tabs */}
            <div className="px-6 py-3.5 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50 dark:bg-zinc-900/60 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-red-600/10 text-red-600 font-bold">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                    {editingOrder ? `Редактирование: ${editingOrder.orderNumber}` : "Новый заказ-наряд"}
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                    {licensePlate ? `${vehicleMake} ${vehicleModel} (${licensePlate})` : "Заполните данные заказчика и транспортного средства"}
                  </p>
                </div>
              </div>

              {/* 3 WORK TABS */}
              <div className="flex items-center bg-white dark:bg-zinc-900 p-1 rounded-xl border border-slate-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditorTab("works_parts")}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    editorTab === "works_parts"
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-950 shadow-2xs"
                      : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
                  }`}
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>1. Работы и Запчасти</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditorTab("inspection")}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    editorTab === "inspection"
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-950 shadow-2xs"
                      : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
                  }`}
                >
                  <Car className="w-3.5 h-3.5" />
                  <span>2. Акт осмотра (Схема ТС)</span>
                  {(inspection.damages?.length || 0) > 0 && (
                    <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">
                      {inspection.damages.length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setEditorTab("documents")}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    editorTab === "documents"
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-950 shadow-2xs"
                      : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
                  }`}
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>3. Пакет документов и Печать А4</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Container */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* TAB 1: WORKS AND PARTS */}
              {editorTab === "works_parts" && (
                <div className="space-y-6">
                  {/* Client & Vehicle Section */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 space-y-3">
                    <div className="font-bold text-slate-900 dark:text-zinc-100 text-xs uppercase tracking-wider flex items-center space-x-1.5">
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
                          placeholder="ООО Логистик / Иванов И.И."
                          className="mt-1 w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-medium"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-500">Телефон *</label>
                        <input
                          type="text"
                          value={clientPhone}
                          onChange={(e) => setClientPhone(e.target.value)}
                          placeholder="+7 (999) 000-00-00"
                          className="mt-1 w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-500">ИНН (для юрлиц)</label>
                        <input
                          type="text"
                          value={clientInn}
                          onChange={(e) => setClientInn(e.target.value)}
                          placeholder="8602194820"
                          className="mt-1 w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-mono"
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
                          placeholder="ГАЗ / КАМАЗ"
                          className="mt-1 w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-500">Модель *</label>
                        <input
                          type="text"
                          value={vehicleModel}
                          onChange={(e) => setVehicleModel(e.target.value)}
                          placeholder="Газель Next"
                          className="mt-1 w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-500">Госномер *</label>
                        <input
                          type="text"
                          value={licensePlate}
                          onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                          placeholder="А123ВС86"
                          className="mt-1 w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-500">VIN-номер</label>
                        <input
                          type="text"
                          value={vin}
                          onChange={(e) => setVin(e.target.value.toUpperCase())}
                          placeholder="X96A21R22..."
                          className="mt-1 w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-mono text-[11px]"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-500">Пробег (км)</label>
                        <input
                          type="number"
                          value={mileage}
                          onChange={(e) => setMileage(Number(e.target.value))}
                          className="mt-1 w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-semibold text-slate-500">Причина обращения / Жалобы клиента</label>
                        <input
                          type="text"
                          value={complaints}
                          onChange={(e) => setComplaints(e.target.value)}
                          placeholder="Скрежет при торможении, плановое ТО..."
                          className="mt-1 w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-500">Статус заказ-наряда</label>
                        <select
                          value={orderStatus}
                          onChange={(e) => setOrderStatus(e.target.value as OrderStatus)}
                          className="mt-1 w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-medium cursor-pointer"
                        >
                          <option value="estimate">Заявка / Оценка</option>
                          <option value="in_progress">В работе</option>
                          <option value="parts_waiting">Ожидание запчастей</option>
                          <option value="ready">Готов к выдаче</option>
                          <option value="closed">Закрыт / Оплачен</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* 1. Works Table (Norm-Hours) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-900 dark:text-zinc-100 text-xs uppercase tracking-wider">
                        1. Выполняемые работы (Нормо-часы)
                      </div>
                      <button
                        type="button"
                        onClick={addWorkRow}
                        className="flex items-center space-x-1.5 text-xs text-red-600 dark:text-red-400 font-semibold hover:underline cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Добавить работу</span>
                      </button>
                    </div>

                    <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-400 font-semibold">
                            <th className="p-2.5">Наименование работы</th>
                            <th className="p-2.5 w-44">Мастер / Исполнитель</th>
                            <th className="p-2.5 w-20 text-center">Н/Ч</th>
                            <th className="p-2.5 w-24 text-right">Ставка (₽)</th>
                            <th className="p-2.5 w-20 text-center">Скидка %</th>
                            <th className="p-2.5 w-24 text-right">Итого (₽)</th>
                            <th className="p-2.5 w-8"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                          {works.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="p-4 text-center text-slate-400">
                                Работы не добавлены. Нажмите «Добавить работу».
                              </td>
                            </tr>
                          ) : (
                            works.map((w, idx) => (
                              <tr key={w.id || idx}>
                                <td className="p-1.5">
                                  <input
                                    type="text"
                                    value={w.name}
                                    onChange={(e) => updateWorkRow(idx, "name", e.target.value)}
                                    placeholder="Замена масла в ДВС..."
                                    className="w-full px-2 py-1 rounded bg-transparent border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100"
                                  />
                                </td>
                                <td className="p-1.5">
                                  <select
                                    value={w.mechanic}
                                    onChange={(e) => updateWorkRow(idx, "mechanic", e.target.value)}
                                    className="w-full px-2 py-1 rounded bg-transparent border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 cursor-pointer"
                                  >
                                    {(stoReq.mechanics || []).map((m) => (
                                      <option key={m} value={m} className="bg-white dark:bg-zinc-900">
                                        {m}
                                      </option>
                                    ))}
                                    <option value="Мастер смены" className="bg-white dark:bg-zinc-900">Мастер смены</option>
                                  </select>
                                </td>
                                <td className="p-1.5">
                                  <input
                                    type="number"
                                    step="0.1"
                                    value={w.laborHours}
                                    onChange={(e) => updateWorkRow(idx, "laborHours", Number(e.target.value))}
                                    className="w-full px-2 py-1 text-center rounded bg-transparent border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 font-bold"
                                  />
                                </td>
                                <td className="p-1.5">
                                  <input
                                    type="number"
                                    value={w.ratePerHour}
                                    onChange={(e) => updateWorkRow(idx, "ratePerHour", Number(e.target.value))}
                                    className="w-full px-2 py-1 text-right rounded bg-transparent border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100"
                                  />
                                </td>
                                <td className="p-1.5">
                                  <input
                                    type="number"
                                    value={w.discountPercent}
                                    onChange={(e) => updateWorkRow(idx, "discountPercent", Number(e.target.value))}
                                    className="w-full px-2 py-1 text-center rounded bg-transparent border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100"
                                  />
                                </td>
                                <td className="p-1.5 text-right font-bold text-slate-900 dark:text-zinc-100">
                                  {w.total.toLocaleString()}
                                </td>
                                <td className="p-1.5 text-center">
                                  <button
                                    type="button"
                                    onClick={() => removeWorkRow(idx)}
                                    className="text-slate-400 hover:text-rose-500 cursor-pointer p-1"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 2. Parts Table */}
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-bold text-slate-900 dark:text-zinc-100 text-xs uppercase tracking-wider">
                        2. Запчасти и материалы
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={openWarehousePicker}
                          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                        >
                          <Boxes className="w-3.5 h-3.5" />
                          <span>Выбрать со склада</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsProcurementModalOpen(true)}
                          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-red-600/10 hover:bg-red-600/20 text-red-600 dark:text-red-400 border border-red-500/20 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                        >
                          <Search className="w-3.5 h-3.5" />
                          <span>Проценка по API</span>
                        </button>
                        <button
                          type="button"
                          onClick={addPartRow}
                          className="flex items-center space-x-1 px-2.5 py-1.5 text-xs text-slate-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 font-semibold cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Вручную</span>
                        </button>
                      </div>
                    </div>

                    <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-400 font-semibold">
                            <th className="p-2.5 w-36">Артикул OEM</th>
                            <th className="p-2.5">Наименование детали / материала</th>
                            <th className="p-2.5 w-20 text-center">Кол-во</th>
                            <th className="p-2.5 w-28 text-right">Цена продажи (₽)</th>
                            <th className="p-2.5 w-28 text-right">Сумма (₽)</th>
                            <th className="p-2.5 w-8"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                          {parts.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="p-4 text-center text-slate-400">
                                Запчасти не выбраны. Выберите деталь со склада или выполните проценку по API.
                              </td>
                            </tr>
                          ) : (
                            parts.map((p, idx) => (
                              <tr key={p.id || idx}>
                                <td className="p-1.5">
                                  <input
                                    type="text"
                                    value={p.oem}
                                    onChange={(e) => updatePartRow(idx, "oem", e.target.value)}
                                    placeholder="504091562"
                                    className="w-full px-2 py-1 font-mono text-[11px] rounded bg-transparent border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100"
                                  />
                                </td>
                                <td className="p-1.5">
                                  <input
                                    type="text"
                                    value={p.name}
                                    onChange={(e) => updatePartRow(idx, "name", e.target.value)}
                                    placeholder="Фильтр масляный..."
                                    className="w-full px-2 py-1 rounded bg-transparent border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100"
                                  />
                                </td>
                                <td className="p-1.5">
                                  <input
                                    type="number"
                                    value={p.qty}
                                    onChange={(e) => updatePartRow(idx, "qty", Number(e.target.value))}
                                    className="w-full px-2 py-1 text-center rounded bg-transparent border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 font-bold"
                                  />
                                </td>
                                <td className="p-1.5">
                                  <input
                                    type="number"
                                    value={p.salePrice}
                                    onChange={(e) => updatePartRow(idx, "salePrice", Number(e.target.value))}
                                    className="w-full px-2 py-1 text-right rounded bg-transparent border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100"
                                  />
                                </td>
                                <td className="p-1.5 text-right font-bold text-slate-900 dark:text-zinc-100">
                                  {p.total.toLocaleString()}
                                </td>
                                <td className="p-1.5 text-center">
                                  <button
                                    type="button"
                                    onClick={() => removePartRow(idx)}
                                    className="text-slate-400 hover:text-rose-500 cursor-pointer p-1"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Mandatory Recommendations field */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 space-y-2">
                    <label className="text-xs font-bold text-slate-900 dark:text-zinc-100 uppercase tracking-wider flex items-center space-x-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                      <span>Рекомендации мастерской / Выявленные дефекты *</span>
                    </label>
                    <textarea
                      rows={2}
                      value={recommendations}
                      onChange={(e) => setRecommendations(e.target.value)}
                      placeholder="Рекомендуется замена тормозных дисков при следующем ТО, проверка уровня масла в КПП через 1000 км..."
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-slate-900 dark:text-zinc-100"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: VEHICLE INSPECTION SCHEMATIC */}
              {editorTab === "inspection" && (
                <div className="space-y-4">
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 flex items-center space-x-2 text-xs">
                    <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>
                      Кликайте по схеме кузова для фиксации царапин, сколов, вмятин и коррозии. Данные автоматически попадают в Акт приема-передачи ТС.
                    </span>
                  </div>

                  <VehicleInspectionSchematic
                    inspection={inspection}
                    onChange={setInspection}
                  />
                </div>
              )}

              {/* TAB 3: A4 DOCUMENTS AND PRINTING */}
              {editorTab === "documents" && (
                <div className="space-y-4">
                  {/* Document Type Selector Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {[
                        { id: "work_order", label: "Договор-заказ-наряд" },
                        { id: "acceptance_act", label: "Акт приема-передачи ТС" },
                        { id: "defect_sheet", label: "Дефектовочная ведомость" },
                        { id: "completion_act", label: "Акт выполненных работ" },
                        { id: "invoice", label: "Счет на оплату" },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setSelectedDocTypeInEditor(t.id as ServiceDocumentType)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            selectedDocTypeInEditor === t.id
                              ? "bg-red-600 text-white font-bold shadow-2xs"
                              : "bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300"
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={handleSaveToArchive}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-xs font-semibold cursor-pointer"
                      >
                        <FolderArchive className="w-3.5 h-3.5 text-amber-500" />
                        <span>{archiveSavedToast ? "Сохранено в архив!" : "В Архив"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          setIsExportingDocx(true);
                          try {
                            await exportAutoServiceDocx(draftOrderForDoc, selectedDocTypeInEditor);
                          } finally {
                            setIsExportingDocx(false);
                          }
                        }}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-xs font-semibold cursor-pointer"
                      >
                        <FileDown className="w-3.5 h-3.5 text-blue-500" />
                        <span>{isExportingDocx ? "Экспорт..." : "Word (.docx)"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-xs font-bold shadow-sm cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Печать А4</span>
                      </button>
                    </div>
                  </div>

                  {/* Document Canvas Preview */}
                  <div className="p-8 rounded-xl bg-white text-slate-900 border border-slate-300 shadow-md font-sans text-xs space-y-5 leading-relaxed">
                    {/* Header */}
                    <div className="border-b-2 border-red-600 pb-3 flex justify-between items-start">
                      <div>
                        <h2 className="text-base font-extrabold text-red-600 uppercase tracking-wide">
                          {stoReq.brandName}
                        </h2>
                        <p className="font-semibold">{stoReq.name}</p>
                        <p className="text-[11px] text-slate-600">{stoReq.address} • Тел: {stoReq.phone}</p>
                      </div>
                      <div className="text-right text-[11px] text-slate-600">
                        <p>ИНН: {stoReq.inn} / КПП: {stoReq.kpp} • ОГРН: {stoReq.ogrn}</p>
                        <p>Р/с: {stoReq.rs} в {stoReq.bankName} (БИК: {stoReq.bik})</p>
                      </div>
                    </div>

                    <div className="text-center my-3">
                      <h3 className="text-sm font-bold uppercase tracking-wider">
                        {selectedDocTypeInEditor === "work_order" && `ДОГОВОР-ЗАКАЗ-НАРЯД № ${draftOrderForDoc.orderNumber}`}
                        {selectedDocTypeInEditor === "acceptance_act" && `АКТ ПРИЕМА-ПЕРЕДАЧИ ТС К ЗАКАЗ-НАРЯДУ № ${draftOrderForDoc.orderNumber}`}
                        {selectedDocTypeInEditor === "defect_sheet" && `ДЕФЕКТОВОЧНАЯ ВЕДОМОСТЬ № ${draftOrderForDoc.orderNumber}`}
                        {selectedDocTypeInEditor === "completion_act" && `АКТ ВЫПОЛНЕННЫХ РАБОТ № ${draftOrderForDoc.orderNumber}`}
                        {selectedDocTypeInEditor === "invoice" && `СЧЕТ НА ОПЛАТУ № ${draftOrderForDoc.orderNumber}`}
                      </h3>
                      <p className="text-[11px] text-slate-500">от {draftOrderForDoc.createdAt} г.</p>
                    </div>

                    {/* Parties */}
                    <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <div>
                        <span className="font-bold text-[10px] uppercase text-slate-400">Заказчик:</span>
                        <p className="font-bold text-slate-900">{draftOrderForDoc.client.name}</p>
                        <p className="text-slate-600">Тел: {draftOrderForDoc.client.phone || "—"}</p>
                        {draftOrderForDoc.client.inn && <p className="text-slate-600">ИНН: {draftOrderForDoc.client.inn}</p>}
                      </div>
                      <div>
                        <span className="font-bold text-[10px] uppercase text-slate-400">Транспортное средство:</span>
                        <p className="font-bold text-slate-900">{draftOrderForDoc.vehicle.make} {draftOrderForDoc.vehicle.model}</p>
                        <p>Госномер: <strong className="font-mono">{draftOrderForDoc.vehicle.licensePlate}</strong></p>
                        {draftOrderForDoc.vehicle.vin && <p className="text-[11px] font-mono text-slate-600">VIN: {draftOrderForDoc.vehicle.vin}</p>}
                        <p className="text-slate-600">Пробег: {draftOrderForDoc.vehicle.mileage.toLocaleString()} км</p>
                      </div>
                    </div>

                    {/* Acceptance Act Schematic & Damages embed */}
                    {selectedDocTypeInEditor === "acceptance_act" && (
                      <div className="space-y-3 p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                        <div className="font-bold text-slate-900 text-xs">
                          Карта дефектов кузова и состояние при приеме:
                        </div>
                        <VehicleInspectionSchematic inspection={draftOrderForDoc.inspection} readOnly={true} />
                      </div>
                    )}

                    {/* Works table */}
                    {(selectedDocTypeInEditor === "work_order" || selectedDocTypeInEditor === "completion_act" || selectedDocTypeInEditor === "invoice") && (
                      <div className="space-y-1">
                        <div className="font-bold text-slate-900 text-xs">Выполненные работы:</div>
                        <table className="w-full text-left border-collapse border border-slate-300">
                          <thead>
                            <tr className="bg-slate-100 text-slate-700 text-[11px]">
                              <th className="p-2 border border-slate-300">№</th>
                              <th className="p-2 border border-slate-300">Работа</th>
                              <th className="p-2 border border-slate-300 w-16 text-center">Н/Ч</th>
                              <th className="p-2 border border-slate-300 w-24 text-right">Ставка</th>
                              <th className="p-2 border border-slate-300 w-24 text-right">Сумма</th>
                            </tr>
                          </thead>
                          <tbody>
                            {works.map((w, i) => (
                              <tr key={i}>
                                <td className="p-1.5 border border-slate-300 text-center">{i + 1}</td>
                                <td className="p-1.5 border border-slate-300 font-medium">{w.name}</td>
                                <td className="p-1.5 border border-slate-300 text-center font-bold">{w.laborHours}</td>
                                <td className="p-1.5 border border-slate-300 text-right">{w.ratePerHour} ₽</td>
                                <td className="p-1.5 border border-slate-300 text-right font-bold">{w.total.toLocaleString()} ₽</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Parts table */}
                    {(selectedDocTypeInEditor === "work_order" || selectedDocTypeInEditor === "completion_act" || selectedDocTypeInEditor === "invoice") && parts.length > 0 && (
                      <div className="space-y-1 pt-2">
                        <div className="font-bold text-slate-900 text-xs">Запасные части и расходные материалы:</div>
                        <table className="w-full text-left border-collapse border border-slate-300">
                          <thead>
                            <tr className="bg-slate-100 text-slate-700 text-[11px]">
                              <th className="p-2 border border-slate-300">№</th>
                              <th className="p-2 border border-slate-300">Артикул</th>
                              <th className="p-2 border border-slate-300">Наименование</th>
                              <th className="p-2 border border-slate-300 w-16 text-center">Кол-во</th>
                              <th className="p-2 border border-slate-300 w-24 text-right">Цена</th>
                              <th className="p-2 border border-slate-300 w-24 text-right">Сумма</th>
                            </tr>
                          </thead>
                          <tbody>
                            {parts.map((p, i) => (
                              <tr key={i}>
                                <td className="p-1.5 border border-slate-300 text-center">{i + 1}</td>
                                <td className="p-1.5 border border-slate-300 font-mono text-[11px]">{p.oem || "—"}</td>
                                <td className="p-1.5 border border-slate-300 font-medium">{p.name}</td>
                                <td className="p-1.5 border border-slate-300 text-center font-bold">{p.qty} {p.unit}</td>
                                <td className="p-1.5 border border-slate-300 text-right">{p.salePrice} ₽</td>
                                <td className="p-1.5 border border-slate-300 text-right font-bold">{p.total.toLocaleString()} ₽</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Defect sheet items */}
                    {selectedDocTypeInEditor === "defect_sheet" && (
                      <div className="p-3 rounded-lg border border-slate-300 bg-slate-50 space-y-2">
                        <div className="font-bold text-xs">Выявленные дефекты узлов и агрегатов:</div>
                        <p className="italic text-slate-800">{recommendations || complaints || "Дефектов не зафиксировано."}</p>
                      </div>
                    )}

                    {/* Totals & Signatures */}
                    <div className="pt-3 border-t-2 border-slate-300 flex justify-between items-end">
                      <div className="text-[11px] text-slate-500">
                        Гарантия: на работы — 30 дней, на оригинальные запчасти — 14 дней.
                      </div>
                      <div className="text-right">
                        <span className="text-xs uppercase text-slate-500">Итого к оплате:</span>
                        <div className="text-lg font-extrabold text-red-600">
                          {formatCurrency(draftOrderForDoc.grandTotal)}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8 pt-6 text-[11px]">
                      <div>
                        <p>Мастер-приемщик: ____________________ / {stoReq.masterReceiver} /</p>
                      </div>
                      <div className="text-right">
                        <p>Заказчик (представитель): ____________________ / {draftOrderForDoc.client.name} /</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Bottom Action Bar */}
            <div className="px-6 py-3.5 border-t border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/60 flex items-center justify-between shrink-0">
              {(() => {
                const calculated = calculateOrderTotals(works, parts);
                return (
                  <div className="flex items-center space-x-4">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Итого:</span>
                      <div className="text-base font-extrabold text-red-600 dark:text-red-400">
                        {formatCurrency(calculated.grandTotal)}
                      </div>
                    </div>
                    <div className="hidden sm:block text-[11px] text-slate-500 border-l border-slate-200 dark:border-zinc-800 pl-4">
                      Работы: <strong>{formatCurrency(calculated.totalWorks)}</strong> • Запчасти: <strong>{formatCurrency(calculated.totalParts)}</strong>
                    </div>
                  </div>
                );
              })()}

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleSaveOrder}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition-all shadow-sm cursor-pointer"
                >
                  Сохранить заказ-наряд
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: WAREHOUSE PART PICKER MODAL */}
      {isWarehousePickerOpen && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0c1015] w-full max-w-xl max-h-[80vh] rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 flex flex-col overflow-hidden text-xs">
            <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50 dark:bg-zinc-900/60">
              <div className="flex items-center space-x-2 font-bold text-slate-900 dark:text-zinc-100">
                <Boxes className="w-4 h-4 text-emerald-500" />
                <span>Выбор детали со склада автосервиса</span>
              </div>
              <button onClick={() => setIsWarehousePickerOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 border-b border-slate-200 dark:border-zinc-800">
              <input
                type="text"
                placeholder="Поиск по артикулу OEM или названию..."
                value={warehouseSearch}
                onChange={(e) => setWarehouseSearch(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {availableWarehouseParts.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  Склад пуст. Вы можете оприходовать детали через раздел «Складской учет».
                </div>
              ) : (
                availableWarehouseParts
                  .filter((p) => {
                    if (!warehouseSearch.trim()) return true;
                    const q = warehouseSearch.toLowerCase();
                    return p.name.toLowerCase().includes(q) || p.oem.toLowerCase().includes(q);
                  })
                  .map((p) => (
                    <div
                      key={p.id}
                      onClick={() => handleSelectWarehousePart(p)}
                      className="p-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 hover:border-emerald-500 hover:bg-emerald-50/20 flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <div>
                        <div className="font-bold text-slate-900 dark:text-zinc-100">{p.name}</div>
                        <div className="text-[11px] font-mono text-slate-500">OEM: {p.oem} • Стеллаж: {p.location || "Основной"}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(p.salePrice)}</div>
                        <div className="text-[10px] text-slate-400">В наличии: {p.quantity} {p.unit}</div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: EMBEDDED API PROCUREMENT DRAWER */}
      {isProcurementModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0c1015] w-full max-w-5xl h-[88vh] rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50 dark:bg-zinc-900/60">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-red-600/10 text-red-600">
                  <Search className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                    ИИ-Проценка и быстрый подбор запчастей по оптовым складам
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {vehicleMake ? `${vehicleMake} ${vehicleModel}` : "Поиск по складам поставщиков"} {licensePlate ? `(${licensePlate})` : ""} {vin ? `• VIN: ${vin}` : ""}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsProcurementModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <PartsProcurementModule
                isEmbedded={true}
                initialVehicle={{ make: vehicleMake, model: vehicleModel, vin }}
                onAddPartToOrder={handleAddProcuredPart}
              />
            </div>
          </div>
        </div>
      )}

      {/* Document A4 Print / Export Modal from Table */}
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
