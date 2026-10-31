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
  Stamp,
  HelpCircle,
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
  normalizeRepairOrder,
  numberToWordsRu,
} from "@/lib/auto-service-data";
import { useAuth } from "@/lib/auth-context";
import { generateDefaultStampDataUrl, generateDefaultSignatureDataUrl } from "@/lib/canvas-image-processor";
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
  const [isEditorFacsimile, setIsEditorFacsimile] = useState(true);
  const [isEditorScanMode, setIsEditorScanMode] = useState(false);

  // Form states for new/edit
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientInn, setClientInn] = useState("");
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [vin, setVin] = useState("");
  const [mileage, setMileage] = useState<number | string>("");
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

    let loaded = getInitialOrders(currentUsername).map((o) => normalizeRepairOrder(o, currentUsername));
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Filter out any legacy mock entries and normalize
          const cleaned = parsed
            .filter(
              (o: any) =>
                o?.orderNumber !== "ЗН-СЕВ-0012" &&
                o?.orderNumber !== "ЗН-2026-0042" &&
                o?.orderNumber !== "ЗН-2026-0041" &&
                o?.orderNumber !== "ЗН-2026-0043" &&
                !o?.client?.name?.includes("Николаев") &&
                !o?.client?.name?.includes("ывыфвфы")
            )
            .map((o: any) => normalizeRepairOrder(o, currentUsername));
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
          const cleanedRemote = data.orders
            .filter(
              (o: any) =>
                o?.orderNumber !== "ЗН-СЕВ-0012" &&
                o?.orderNumber !== "ЗН-2026-0042" &&
                o?.orderNumber !== "ЗН-2026-0041" &&
                o?.orderNumber !== "ЗН-2026-0043" &&
                !o?.client?.name?.includes("Николаев") &&
                !o?.client?.name?.includes("ывыфвфы")
            )
            .map((o: any) => normalizeRepairOrder(o, currentUsername));
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
          if (Array.isArray(parsed)) {
            setOrders(parsed.map((o: any) => normalizeRepairOrder(o, currentUsername)));
          }
        }
      } catch {}
    };

    window.addEventListener("geo_ai_order_updated", handleExternalOrderUpdate);
    window.addEventListener("geo_ai_repair_orders_updated", handleExternalOrderUpdate);
    return () => {
      window.removeEventListener("geo_ai_order_updated", handleExternalOrderUpdate);
      window.removeEventListener("geo_ai_repair_orders_updated", handleExternalOrderUpdate);
    };
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
    setMileage("");
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
    const safe = normalizeRepairOrder(order, currentUsername);
    setEditingOrder(safe);
    setClientName(safe.client?.name || "");
    setClientPhone(safe.client?.phone || "");
    setClientInn(safe.client?.inn || "");
    setVehicleMake(safe.vehicle?.make || "");
    setVehicleModel(safe.vehicle?.model || "");
    setLicensePlate(safe.vehicle?.licensePlate || "");
    setVin(safe.vehicle?.vin || "");
    setMileage(safe.vehicle?.mileage ? String(safe.vehicle.mileage) : "");
    setComplaints(safe.vehicle?.complaints || "");
    setRecommendations(safe.recommendations || "");
    setOrderStatus(safe.status || "in_progress");
    setWorks(safe.works || []);
    setParts(safe.parts || []);
    setInspection(safe.inspection || DEFAULT_INSPECTION_DATA);
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

  const filteredOrders = orders.map((o) => normalizeRepairOrder(o, currentUsername)).filter((o) => {
    if (selectedStatus !== "all" && o.status !== selectedStatus) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (o.orderNumber || "").toLowerCase().includes(q) ||
      (o.client?.name || "").toLowerCase().includes(q) ||
      (o.vehicle?.licensePlate || "").toLowerCase().includes(q) ||
      (o.vehicle?.vin || "").toLowerCase().includes(q) ||
      `${o.vehicle?.make || ""} ${o.vehicle?.model || ""}`.toLowerCase().includes(q)
    );
  });

  const statuses: OrderStatus[] = ["estimate", "in_progress", "parts_waiting", "ready", "closed"];

  return (
    <div className="flex-1 flex flex-col h-full bg-transparent overflow-hidden text-zinc-900 dark:text-zinc-100">
      {/* Top Header - Apple Spring Cascade & Glass Style */}
      <div className="apple-header px-6 py-4.5 border-b border-white/[0.08] bg-white/40 dark:bg-black/30 backdrop-blur-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-rose-500/20 to-amber-500/20 border border-white/10 text-rose-500 flex items-center justify-center shrink-0 shadow-lg shadow-rose-500/10">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center space-x-2.5">
              <span>Заказ-наряды</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/10 dark:bg-white/[0.06] border border-white/10 text-zinc-700 dark:text-zinc-300">
                {orders.length} записей
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
                  Учет ремонтов, калькуляция нормо-часов, интерактивный акт осмотра кузова и пакет документов А4 (Заказ-наряд, Акт, Счет-фактура).
                </div>
              </div>
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-white/40 dark:bg-white/[0.06] p-1 rounded-full border border-white/[0.08] backdrop-blur-md">
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 px-3 rounded-full text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                viewMode === "table"
                  ? "bg-rose-600 text-white shadow-md shadow-rose-600/25"
                  : "text-zinc-500 hover:text-white"
              }`}
              title="Табличный вид"
            >
              <List className="w-3.5 h-3.5" />
              <span>Таблица</span>
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              className={`p-1.5 px-3 rounded-full text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                viewMode === "kanban"
                  ? "bg-rose-600 text-white shadow-md shadow-rose-600/25"
                  : "text-zinc-500 hover:text-white"
              }`}
              title="Канбан-доска"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Канбан</span>
            </button>
          </div>

          <button
            type="button"
            onClick={openNewOrderModal}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white text-xs font-bold transition-all shadow-lg shadow-rose-600/20 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Новый заказ-наряд</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar (Pill Glass UI) */}
      <div className="px-6 py-2.5 border-b border-white/[0.06] bg-white/30 dark:bg-black/15 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        {/* Status Filters */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedStatus("all")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedStatus === "all"
                ? "bg-rose-600 text-white shadow-md shadow-rose-600/20 scale-102"
                : "bg-white/40 dark:bg-white/[0.05] text-zinc-600 dark:text-zinc-300 hover:bg-white/70 dark:hover:bg-white/[0.1] border border-white/[0.07]"
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
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center space-x-1.5 ${
                  isActive
                    ? "bg-rose-600 text-white shadow-md shadow-rose-600/20 scale-102"
                    : "bg-white/40 dark:bg-white/[0.05] text-zinc-600 dark:text-zinc-300 hover:bg-white/70 dark:hover:bg-white/[0.1] border border-white/[0.07]"
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
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Поиск по номеру, госномеру, VIN, клиенту..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-8 py-2 rounded-full bg-white/60 dark:bg-white/[0.05] border border-white/[0.09] backdrop-blur-2xl text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-hidden focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all"
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
            <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
              {searchQuery ? "Заказ-наряды не найдены" : "Список заказ-нарядов пуст"}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mt-1">
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
          /* TABLE VIEW WITH ROW CLICK EDITING (Yandex Music Tracklist Aesthetic) */
          <div className="bg-white/60 dark:bg-white/[0.04] rounded-3xl border border-zinc-200/60 dark:border-white/[0.08] backdrop-blur-2xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-white/40 dark:bg-white/[0.03] border-b border-zinc-200/50 dark:border-white/[0.06] text-zinc-500 dark:text-zinc-400 font-semibold">
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
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80 text-zinc-800 dark:text-zinc-200">
                  {filteredOrders.map((ord) => {
                    const statusMeta = getStatusMeta(ord.status);
                    return (
                      <tr
                        key={ord.id}
                        onClick={() => openEditOrderModal(ord)}
                        className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/50 transition-colors group cursor-pointer"
                      >
                        <td className="py-3 px-4 font-medium">
                          <div className="font-bold text-zinc-900 dark:text-zinc-100">{ord.orderNumber}</div>
                          <div className="text-[11px] text-zinc-400">{ord.createdAt}</div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {ord.vehicle?.make || "Автомобиль"} {ord.vehicle?.model || ""}
                          </div>
                          <div className="flex items-center space-x-1.5 mt-0.5">
                            <span className="px-1.5 py-0.2 rounded font-mono font-bold text-[11px] bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-700">
                              {ord.vehicle?.licensePlate || "Б/Н"}
                            </span>
                            {ord.vehicle?.vin && (
                              <span className="text-[11px] text-zinc-400 truncate max-w-[120px]" title={ord.vehicle.vin}>
                                {ord.vehicle.vin.slice(-6)}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-medium text-zinc-900 dark:text-zinc-100">{ord.client?.name || "Клиент"}</div>
                          <div className="text-[11px] text-zinc-400">{ord.client?.phone || ""}</div>
                        </td>

                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] border ${statusMeta.bg} ${statusMeta.text} ${statusMeta.border}`}>
                            {statusMeta.label}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right font-medium">
                          {formatCurrency(ord.totalWorks)}
                          <div className="text-[10px] text-zinc-400">{ord.works?.length || 0} поз.</div>
                        </td>

                        <td className="py-3 px-4 text-right font-medium">
                          {formatCurrency(ord.totalParts)}
                          <div className="text-[10px] text-zinc-400">{ord.parts?.length || 0} дет.</div>
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
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                              title="Редактировать заказ-наряд"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteOrder(ord.id, e)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {statuses.map((st) => {
              const meta = getStatusMeta(st);
              const columnOrders = filteredOrders.filter((o) => o.status === st);
              return (
                <div key={st} className="flex flex-col bg-white/40 dark:bg-white/[0.03] rounded-3xl border border-zinc-200/50 dark:border-white/[0.06] backdrop-blur-2xl p-3.5 min-h-[450px]">
                  <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-zinc-200/60 dark:border-white/[0.06]">
                    <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200">{meta.label}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-bold">
                      {columnOrders.length}
                    </span>
                  </div>

                  <div className="space-y-2 flex-1 overflow-y-auto">
                    {columnOrders.map((ord) => (
                      <div
                        key={ord.id}
                        onClick={() => openEditOrderModal(ord)}
                        className="p-3.5 rounded-2xl bg-white dark:bg-white/[0.06] border border-zinc-200/70 dark:border-white/[0.08] hover:border-rose-500/50 hover:shadow-lg dark:hover:shadow-rose-950/20 cursor-pointer transition-all space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">{ord.orderNumber}</span>
                          <span className="font-mono text-[10px] text-zinc-400">{ord.createdAt}</span>
                        </div>
                        <div>
                          <div className="font-semibold text-xs text-zinc-800 dark:text-zinc-200">{ord.vehicle?.make || "Автомобиль"} {ord.vehicle?.model || ""}</div>
                          <div className="font-mono font-bold text-[11px] text-red-600 dark:text-red-400">{ord.vehicle?.licensePlate || "Б/Н"}</div>
                        </div>
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">{ord.client?.name || "Клиент"}</div>
                        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                          <span className="text-[10px] text-zinc-400">{ord.works?.length || 0} раб. • {ord.parts?.length || 0} запч.</span>
                          <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">{formatCurrency(ord.grandTotal)}</span>
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
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="apple-sheet bg-white dark:bg-zinc-900/90 dark:backdrop-blur-2xl w-full max-w-5xl h-full sm:h-[92vh] sm:rounded-2xl rounded-none shadow-2xl border-0 sm:border border-zinc-200 dark:border-white/[0.08] flex flex-col overflow-hidden">
            {/* Modal Header & Tabs */}
            <div className="px-4 sm:px-6 py-3 border-b border-zinc-200 dark:border-white/[0.08] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-zinc-50/80 dark:bg-white/[0.02] shrink-0">
              <div className="flex items-center justify-between sm:justify-start space-x-3">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-xl bg-red-600/10 text-red-600 font-bold shrink-0">
                    <Wrench className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                      {editingOrder ? `Редактирование: ${editingOrder.orderNumber}` : "Новый заказ-наряд"}
                    </h2>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                      {licensePlate ? `${vehicleMake} ${vehicleModel} (${licensePlate})` : "Заполните данные заказчика и ТС"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="sm:hidden p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 3 WORK TABS with mobile horizontal scroll */}
              <div className="flex items-center space-x-1 overflow-x-auto whitespace-nowrap bg-zinc-100 dark:bg-white/[0.04] p-1 rounded-xl border border-zinc-200/80 dark:border-white/[0.06] scrollbar-none">
                <button
                  type="button"
                  onClick={() => setEditorTab("works_parts")}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                    editorTab === "works_parts"
                      ? "bg-white dark:bg-zinc-800 text-rose-600 dark:text-rose-400 shadow-xs"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                  }`}
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>1. Работы и Запчасти</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditorTab("inspection")}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                    editorTab === "inspection"
                      ? "bg-white dark:bg-zinc-800 text-rose-600 dark:text-rose-400 shadow-xs"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                  }`}
                >
                  <Car className="w-3.5 h-3.5" />
                  <span>2. Акт осмотра</span>
                  {(inspection.damages?.length || 0) > 0 && (
                    <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">
                      {inspection.damages.length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setEditorTab("documents")}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                    editorTab === "documents"
                      ? "bg-white dark:bg-zinc-800 text-rose-600 dark:text-rose-400 shadow-xs"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                  }`}
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>3. Документы А4</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="hidden sm:block p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Container */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* TAB 1: WORKS AND PARTS */}
              {editorTab === "works_parts" && (
                <div className="space-y-6">
                  {/* Ergonomic Compact 2-Column Split: Client & Vehicle */}
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Left Card: Заказчик */}
                      <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-white/[0.07] space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center space-x-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            <span>Заказчик</span>
                          </span>
                          <span className="text-[10px] text-zinc-500 font-medium">
                            {clientInn.trim() ? "Юридическое лицо" : "Физическое лицо"}
                          </span>
                        </div>

                        <div>
                          <input
                            type="text"
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                            placeholder="ФИО владельца или Название организации *"
                            className="w-full px-3 py-1.5 rounded-xl border border-white/[0.08] bg-zinc-950 text-xs text-white font-semibold placeholder:text-zinc-500 focus:outline-none focus:border-red-500"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={clientPhone}
                            onChange={(e) => setClientPhone(e.target.value)}
                            placeholder="Телефон *"
                            className="w-full px-3 py-1.5 rounded-xl border border-white/[0.08] bg-zinc-950 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-red-500"
                          />
                          <input
                            type="text"
                            value={clientInn}
                            onChange={(e) => setClientInn(e.target.value)}
                            placeholder="ИНН (для юрлиц)"
                            className="w-full px-3 py-1.5 rounded-xl border border-white/[0.08] bg-zinc-950 text-xs text-white font-mono placeholder:text-zinc-500 focus:outline-none focus:border-red-500"
                          />
                        </div>
                      </div>

                      {/* Right Card: Транспортное средство */}
                      <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-white/[0.07] space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center space-x-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            <span>Транспортное средство</span>
                          </span>
                          {/* Russian License Plate Styling */}
                          <div className="inline-flex items-center border border-zinc-400/80 rounded px-1.5 py-0.5 bg-white text-zinc-950 shadow-2xs font-mono font-black text-xs tracking-wider">
                            <input
                              type="text"
                              value={licensePlate}
                              onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                              placeholder="А000АА77"
                              className="w-20 text-center font-bold uppercase bg-transparent focus:outline-none"
                            />
                            <span className="text-[9px] font-bold border-l border-zinc-400 pl-1 ml-1 text-zinc-700">RUS</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={vehicleMake}
                            onChange={(e) => setVehicleMake(e.target.value)}
                            placeholder="Марка (ГАЗ / Toyota) *"
                            className="w-full px-3 py-1.5 rounded-xl border border-white/[0.08] bg-zinc-950 text-xs text-white font-medium placeholder:text-zinc-500 focus:outline-none focus:border-red-500"
                          />
                          <input
                            type="text"
                            value={vehicleModel}
                            onChange={(e) => setVehicleModel(e.target.value)}
                            placeholder="Модель (Next / Camry) *"
                            className="w-full px-3 py-1.5 rounded-xl border border-white/[0.08] bg-zinc-950 text-xs text-white font-medium placeholder:text-zinc-500 focus:outline-none focus:border-red-500"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={vin}
                            onChange={(e) => setVin(e.target.value.toUpperCase())}
                            placeholder="VIN (17 знаков)"
                            className="w-full px-3 py-1.5 rounded-xl border border-white/[0.08] bg-zinc-950 text-[11px] font-mono text-white placeholder:text-zinc-500 focus:outline-none focus:border-red-500"
                          />
                          <input
                            type="text"
                            value={mileage ? String(mileage) : ""}
                            onChange={(e) => setMileage(e.target.value.replace(/\D/g, ""))}
                            placeholder="Например, 85 000"
                            className="w-full px-3 py-1.5 rounded-xl border border-white/[0.08] bg-zinc-950 text-xs text-white font-mono placeholder:text-zinc-500 focus:outline-none focus:border-red-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Compact Single Row: Причина обращения + Статус */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 items-center p-2.5 rounded-2xl bg-zinc-900/40 border border-white/[0.05]">
                      <div className="md:col-span-3">
                        <input
                          type="text"
                          value={complaints}
                          onChange={(e) => setComplaints(e.target.value)}
                          placeholder="Причина обращения / Жалобы клиента: стук в подвеске, плановое ТО, замена колодок..."
                          className="w-full px-3 py-1.5 rounded-xl border border-white/[0.08] bg-zinc-950 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-red-500"
                        />
                      </div>
                      <div>
                        <select
                          value={orderStatus}
                          onChange={(e) => setOrderStatus(e.target.value as OrderStatus)}
                          className="w-full px-3 py-1.5 rounded-xl border border-white/[0.08] bg-zinc-950 text-xs text-white font-semibold focus:outline-none cursor-pointer"
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
                      <div className="font-bold text-zinc-900 dark:text-zinc-100 text-xs uppercase tracking-wider">
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

                    <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 font-semibold">
                            <th className="p-2.5">Наименование работы</th>
                            <th className="p-2.5 w-44">Мастер / Исполнитель</th>
                            <th className="p-2.5 w-20 text-center">Н/Ч</th>
                            <th className="p-2.5 w-24 text-right">Ставка (₽)</th>
                            <th className="p-2.5 w-20 text-center">Скидка %</th>
                            <th className="p-2.5 w-24 text-right">Итого (₽)</th>
                            <th className="p-2.5 w-8"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                          {works.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="p-4 text-center text-zinc-400">
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
                                    className="w-full px-2 py-1 rounded bg-transparent border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
                                  />
                                </td>
                                <td className="p-1.5">
                                  <select
                                    value={w.mechanic}
                                    onChange={(e) => updateWorkRow(idx, "mechanic", e.target.value)}
                                    className="w-full px-2 py-1 rounded bg-transparent border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 cursor-pointer"
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
                                    className="w-full px-2 py-1 text-center rounded bg-transparent border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold"
                                  />
                                </td>
                                <td className="p-1.5">
                                  <input
                                    type="number"
                                    value={w.ratePerHour}
                                    onChange={(e) => updateWorkRow(idx, "ratePerHour", Number(e.target.value))}
                                    className="w-full px-2 py-1 text-right rounded bg-transparent border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
                                  />
                                </td>
                                <td className="p-1.5">
                                  <input
                                    type="number"
                                    value={w.discountPercent}
                                    onChange={(e) => updateWorkRow(idx, "discountPercent", Number(e.target.value))}
                                    className="w-full px-2 py-1 text-center rounded bg-transparent border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
                                  />
                                </td>
                                <td className="p-1.5 text-right font-bold text-zinc-900 dark:text-zinc-100">
                                  {w.total.toLocaleString()}
                                </td>
                                <td className="p-1.5 text-center">
                                  <button
                                    type="button"
                                    onClick={() => removeWorkRow(idx)}
                                    className="text-zinc-400 hover:text-rose-500 cursor-pointer p-1"
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
                      <div className="font-bold text-zinc-900 dark:text-zinc-100 text-xs uppercase tracking-wider">
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
                          className="flex items-center space-x-1 px-2.5 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 font-semibold cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Вручную</span>
                        </button>
                      </div>
                    </div>

                    <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 font-semibold">
                            <th className="p-2.5 w-36">Артикул OEM</th>
                            <th className="p-2.5">Наименование детали / материала</th>
                            <th className="p-2.5 w-20 text-center">Кол-во</th>
                            <th className="p-2.5 w-28 text-right">Цена продажи (₽)</th>
                            <th className="p-2.5 w-28 text-right">Сумма (₽)</th>
                            <th className="p-2.5 w-8"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                          {parts.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="p-4 text-center text-zinc-400">
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
                                    className="w-full px-2 py-1 font-mono text-[11px] rounded bg-transparent border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
                                  />
                                </td>
                                <td className="p-1.5">
                                  <input
                                    type="text"
                                    value={p.name}
                                    onChange={(e) => updatePartRow(idx, "name", e.target.value)}
                                    placeholder="Фильтр масляный..."
                                    className="w-full px-2 py-1 rounded bg-transparent border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
                                  />
                                </td>
                                <td className="p-1.5">
                                  <input
                                    type="number"
                                    value={p.qty}
                                    onChange={(e) => updatePartRow(idx, "qty", Number(e.target.value))}
                                    className="w-full px-2 py-1 text-center rounded bg-transparent border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold"
                                  />
                                </td>
                                <td className="p-1.5">
                                  <input
                                    type="number"
                                    value={p.salePrice}
                                    onChange={(e) => updatePartRow(idx, "salePrice", Number(e.target.value))}
                                    className="w-full px-2 py-1 text-right rounded bg-transparent border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
                                  />
                                </td>
                                <td className="p-1.5 text-right font-bold text-zinc-900 dark:text-zinc-100">
                                  {p.total.toLocaleString()}
                                </td>
                                <td className="p-1.5 text-center">
                                  <button
                                    type="button"
                                    onClick={() => removePartRow(idx)}
                                    className="text-zinc-400 hover:text-rose-500 cursor-pointer p-1"
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
                  <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
                    <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center space-x-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                      <span>Рекомендации мастерской / Выявленные дефекты *</span>
                    </label>
                    <textarea
                      rows={2}
                      value={recommendations}
                      onChange={(e) => setRecommendations(e.target.value)}
                      placeholder="Рекомендуется замена тормозных дисков при следующем ТО, проверка уровня масла в КПП через 1000 км..."
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: VEHICLE INSPECTION SCHEMATIC */}
              {editorTab === "inspection" && (
                <div className="space-y-4 pb-28">
                  <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 px-1">
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                      Интерактивная карта повреждений и акт приема ТС
                    </span>
                    <div className="relative group inline-block">
                      <button
                        type="button"
                        className="p-1 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                        title="Справка по акту осмотра"
                      >
                        <HelpCircle className="w-4 h-4" />
                      </button>
                      <div className="absolute right-0 top-full mt-1 hidden group-hover:block z-30 w-64 p-2.5 rounded-xl bg-zinc-900/95 dark:bg-zinc-900/95 text-zinc-100 text-xs shadow-xl border border-white/10 backdrop-blur-md pointer-events-none">
                        Кликайте по схеме кузова для фиксации царапин, сколов, вмятин и коррозии. Данные автоматически попадают в Акт приема-передачи ТС.
                      </div>
                    </div>
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
                  <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {[
                        { id: "work_order", label: "1. Заказ-наряд" },
                        { id: "acceptance_act", label: "2. Акт приема ТС" },
                        { id: "completion_act", label: "3. Акт выполненных работ" },
                        { id: "payment_receipt", label: "4. Квитанция / Чек" },
                        { id: "invoice", label: "5. Счет на оплату" },
                        { id: "defect_sheet", label: "6. Дефектовка" },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setSelectedDocTypeInEditor(t.id as ServiceDocumentType)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            selectedDocTypeInEditor === t.id
                              ? "bg-red-600 text-white font-bold shadow-2xs"
                              : "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300"
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      {/* Facsimile & Scan Mode toggles */}
                      <button
                        type="button"
                        onClick={() => setIsEditorFacsimile(!isEditorFacsimile)}
                        className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                          isEditorFacsimile
                            ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                            : "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500"
                        }`}
                        title="Наложить печать и подпись (Факсимиле)"
                      >
                        <Stamp className="w-3.5 h-3.5" />
                        <span>Факсимиле</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsEditorScanMode(!isEditorScanMode)}
                        className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                          isEditorScanMode
                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30"
                            : "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500"
                        }`}
                        title="Эффект сканированного листа"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Скан</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSaveToArchive}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-xs font-semibold cursor-pointer"
                      >
                        <FolderArchive className="w-3.5 h-3.5 text-amber-500" />
                        <span>{archiveSavedToast ? "В архиве!" : "В Архив"}</span>
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
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-xs font-semibold cursor-pointer"
                      >
                        <FileDown className="w-3.5 h-3.5 text-blue-500" />
                        <span>{isExportingDocx ? "Экспорт..." : "Word (.docx)"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 text-xs font-bold shadow-sm cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Печать А4</span>
                      </button>
                    </div>
                  </div>

                  {/* Document Canvas Preview */}
                  <div
                    className={`p-8 rounded-xl text-zinc-900 border border-zinc-300 shadow-md font-sans text-xs space-y-4 leading-relaxed transition-all ${
                      isEditorScanMode
                        ? "bg-[#faf9f5] filter contrast-[1.03] brightness-[0.99] sepia-[0.03]"
                        : "bg-white"
                    }`}
                  >
                    {/* Header with Brand Logo & Requisites */}
                    {selectedDocTypeInEditor === "invoice" ? (
                      <div className="mb-4 space-y-2.5">
                        <div className="flex items-center justify-between border-b pb-2">
                          <div className="flex items-center space-x-3">
                            <img
                              src="/logo-chaika-white.png"
                              alt="Чайка-Сервис"
                              className="h-9 w-auto object-contain filter invert shrink-0"
                            />
                            <div>
                              <span className="font-extrabold text-sm uppercase text-red-600">{stoReq.brandName}</span>
                              <p className="text-[11px] text-zinc-500">{stoReq.name}</p>
                            </div>
                          </div>
                          <div className="text-right text-[11px] text-zinc-500">
                            Образец заполнения платежного поручения
                          </div>
                        </div>

                        <table className="w-full border-collapse border border-black text-xs">
                          <tbody>
                            <tr>
                              <td colSpan={2} rowSpan={2} className="border border-black p-2 align-top">
                                <div className="text-[10px] text-zinc-500">Банк получателя:</div>
                                <div className="font-semibold">{stoReq.bankName}</div>
                              </td>
                              <td className="border border-black p-1.5 w-20 text-[10px] text-zinc-500">БИК</td>
                              <td className="border border-black p-1.5 font-mono font-semibold">{stoReq.bik}</td>
                            </tr>
                            <tr>
                              <td className="border border-black p-1.5 text-[10px] text-zinc-500">Сч. №</td>
                              <td className="border border-black p-1.5 font-mono font-semibold">{stoReq.ks}</td>
                            </tr>
                            <tr>
                              <td className="border border-black p-1.5 text-[10px] text-zinc-500 w-32">
                                ИНН {stoReq.inn}
                              </td>
                              <td className="border border-black p-1.5 text-[10px] text-zinc-500">
                                {stoReq.kpp ? `КПП ${stoReq.kpp}` : "КПП —"}
                              </td>
                              <td rowSpan={2} className="border border-black p-1.5 text-[10px] text-zinc-500 align-top">
                                Сч. №
                              </td>
                              <td rowSpan={2} className="border border-black p-1.5 font-mono font-semibold align-top">
                                {stoReq.rs}
                              </td>
                            </tr>
                            <tr>
                              <td colSpan={2} className="border border-black p-2 align-top">
                                <div className="text-[10px] text-zinc-500">Получатель:</div>
                                <div className="font-bold">{stoReq.name}</div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="border-b-2 border-red-600 pb-3 flex justify-between items-start gap-4">
                        <div className="flex items-start space-x-3.5">
                          <img
                            src="/logo-chaika-white.png"
                            alt="Чайка-Сервис"
                            className="h-10 w-auto max-w-[150px] object-contain filter invert shrink-0"
                          />
                          <div>
                            <h2 className="text-base font-extrabold text-red-600 uppercase tracking-wide">
                              {stoReq.brandName}
                            </h2>
                            <p className="font-semibold">{stoReq.name}</p>
                            <p className="text-[11px] text-zinc-600">{stoReq.address} • Тел: {stoReq.phone}</p>
                          </div>
                        </div>
                        <div className="text-right text-[11px] text-zinc-600 shrink-0">
                          <p>ИНН: <span className="font-bold">{stoReq.inn}</span> {stoReq.kpp ? `/ КПП: ${stoReq.kpp}` : ""} • ОГРНИП: {stoReq.ogrn}</p>
                          <p>Р/с: {stoReq.rs} в {stoReq.bankName} (БИК: {stoReq.bik})</p>
                        </div>
                      </div>
                    )}

                    <div className="text-center my-3 pb-2 border-b border-zinc-200">
                      <h3 className="text-sm font-bold uppercase tracking-wider">
                        {selectedDocTypeInEditor === "work_order" && `ДОГОВОР-ЗАКАЗ-НАРЯД № ${draftOrderForDoc.orderNumber}`}
                        {selectedDocTypeInEditor === "acceptance_act" && `АКТ ПРИЕМА-ПЕРЕДАЧИ ТС К ЗАКАЗ-НАРЯДУ № ${draftOrderForDoc.orderNumber}`}
                        {selectedDocTypeInEditor === "completion_act" && `АКТ ВЫПОЛНЕННЫХ РАБОТ № ${draftOrderForDoc.orderNumber}`}
                        {selectedDocTypeInEditor === "payment_receipt" && `КВИТАНЦИЯ К ЗАКАЗ-НАРЯДУ № ${draftOrderForDoc.orderNumber} (ЧЕК ОБ ОПЛАТЕ)`}
                        {selectedDocTypeInEditor === "invoice" && `СЧЕТ НА ОПЛАТУ № ${draftOrderForDoc.orderNumber}`}
                        {selectedDocTypeInEditor === "defect_sheet" && `ДЕФЕКТОВОЧНАЯ ВЕДОМОСТЬ № ${draftOrderForDoc.orderNumber}`}
                      </h3>
                      <p className="text-[11px] text-zinc-500">от {draftOrderForDoc.createdAt} г.</p>
                    </div>

                    {/* Parties info */}
                    {selectedDocTypeInEditor === "invoice" ? (
                      <div className="space-y-1.5 text-xs mb-4">
                        <div>
                          <span className="font-bold">Поставщик (Исполнитель): </span>
                          <span>{stoReq.name}, ИНН {stoReq.inn}, {stoReq.address}, тел.: {stoReq.phone}</span>
                        </div>
                        <div>
                          <span className="font-bold">Покупатель (Заказчик): </span>
                          <span>{draftOrderForDoc.client?.name || "Заказчик"}, {draftOrderForDoc.client?.inn ? `ИНН ${draftOrderForDoc.client.inn}, ` : ""}тел.: {draftOrderForDoc.client?.phone || "—"}</span>
                        </div>
                        <div>
                          <span className="font-bold">Основание: </span>
                          <span>Заказ-наряд № {draftOrderForDoc.orderNumber} на ремонт ТС {draftOrderForDoc.vehicle?.make} {draftOrderForDoc.vehicle?.model} ({draftOrderForDoc.vehicle?.licensePlate})</span>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-zinc-50 border border-zinc-200">
                        <div>
                          <span className="font-bold text-[10px] uppercase text-zinc-400">Заказчик (Плательщик):</span>
                          <p className="font-bold text-zinc-900">{draftOrderForDoc.client?.name || "Частный клиент"}</p>
                          <p className="text-zinc-600">Тел: {draftOrderForDoc.client?.phone || "—"}</p>
                          {draftOrderForDoc.client?.inn && <p className="text-zinc-600">ИНН: {draftOrderForDoc.client.inn}</p>}
                        </div>
                        <div>
                          <span className="font-bold text-[10px] uppercase text-zinc-400">Транспортное средство:</span>
                          <p className="font-bold text-zinc-900">{draftOrderForDoc.vehicle?.make} {draftOrderForDoc.vehicle?.model}</p>
                          <p>Госномер: <strong className="font-mono">{draftOrderForDoc.vehicle?.licensePlate}</strong></p>
                          {draftOrderForDoc.vehicle?.vin && <p className="text-[11px] font-mono text-zinc-600">VIN: {draftOrderForDoc.vehicle.vin}</p>}
                          <p className="text-zinc-600">Пробег: {draftOrderForDoc.vehicle?.mileage ? draftOrderForDoc.vehicle.mileage.toLocaleString() : "—"} км</p>
                        </div>
                      </div>
                    )}

                    {/* PAYMENT RECEIPT SPECIFIC BODY */}
                    {selectedDocTypeInEditor === "payment_receipt" && (
                      <div className="space-y-4 mb-4">
                        <div className="p-4 rounded-xl border-2 border-emerald-600 bg-emerald-50/40 space-y-3">
                          <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                            <span className="font-bold text-xs text-emerald-900 uppercase">Платежная информация</span>
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white font-mono font-bold text-xs tracking-wider">
                              ОПЛАЧЕНО ПОЛНОСТЬЮ
                            </span>
                          </div>

                          <table className="w-full text-xs">
                            <tbody>
                              <tr className="border-b border-emerald-100">
                                <td className="py-1 text-zinc-600 w-44">Основание платежа:</td>
                                <td className="py-1 font-semibold text-zinc-900">Оплата по заказ-наряду № {draftOrderForDoc.orderNumber} от {draftOrderForDoc.createdAt} г.</td>
                              </tr>
                              <tr className="border-b border-emerald-100">
                                <td className="py-1 text-zinc-600">Плательщик:</td>
                                <td className="py-1 font-semibold text-zinc-900">{draftOrderForDoc.client?.name}</td>
                              </tr>
                              <tr className="border-b border-emerald-100">
                                <td className="py-1 text-zinc-600">Способ оплаты:</td>
                                <td className="py-1 font-semibold text-zinc-900">Безналичный расчет / Банковская карта / СБП</td>
                              </tr>
                              <tr className="border-b border-emerald-100">
                                <td className="py-1 text-zinc-600">Налоговый режим:</td>
                                <td className="py-1 font-medium text-zinc-700">УСН (Доходы), Патент. НДС не облагается (пп. 37 п. 3 ст. 149 НК РФ)</td>
                              </tr>
                              <tr>
                                <td className="py-1.5 font-bold text-zinc-900 text-sm">Сумма к оплате:</td>
                                <td className="py-1.5 font-extrabold text-emerald-700 text-base">{formatCurrency(draftOrderForDoc.grandTotal)}</td>
                              </tr>
                            </tbody>
                          </table>

                          <div className="pt-2 border-t border-emerald-200 text-xs">
                            <span className="font-bold text-zinc-900">Сумма прописью: </span>
                            <span className="italic font-medium text-zinc-800">{numberToWordsRu(draftOrderForDoc.grandTotal)}</span>
                          </div>
                        </div>

                        <div className="text-[11px] text-zinc-500">
                          Настоящая квитанция подтверждает факт поступления денежных средств в кассу / на расчетный счет предприятия в полном объеме.
                        </div>
                      </div>
                    )}

                    {/* Acceptance Act Schematic & Damages embed */}
                    {selectedDocTypeInEditor === "acceptance_act" && (
                      <div className="border border-zinc-300 p-2.5 rounded-lg bg-white">
                        <VehicleInspectionSchematic inspection={draftOrderForDoc.inspection} readOnly={true} isPrint={true} />
                      </div>
                    )}

                    {/* Works table */}
                    {(selectedDocTypeInEditor === "work_order" || selectedDocTypeInEditor === "completion_act" || selectedDocTypeInEditor === "invoice") && (
                      <div className="space-y-1">
                        <div className="font-bold text-zinc-900 text-xs">Выполненные работы:</div>
                        <table className="w-full text-left border-collapse border border-zinc-300">
                          <thead>
                            <tr className="bg-zinc-100 text-zinc-700 text-[11px]">
                              <th className="p-2 border border-zinc-300">№</th>
                              <th className="p-2 border border-zinc-300">Работа</th>
                              <th className="p-2 border border-zinc-300 w-16 text-center">Н/Ч</th>
                              <th className="p-2 border border-zinc-300 w-24 text-right">Ставка</th>
                              <th className="p-2 border border-zinc-300 w-24 text-right">Сумма</th>
                            </tr>
                          </thead>
                          <tbody>
                            {works.map((w, i) => (
                              <tr key={i}>
                                <td className="p-1.5 border border-zinc-300 text-center">{i + 1}</td>
                                <td className="p-1.5 border border-zinc-300 font-medium">{w.name}</td>
                                <td className="p-1.5 border border-zinc-300 text-center font-bold">{w.laborHours}</td>
                                <td className="p-1.5 border border-zinc-300 text-right">{w.ratePerHour} ₽</td>
                                <td className="p-1.5 border border-zinc-300 text-right font-bold">{w.total.toLocaleString()} ₽</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Parts table */}
                    {(selectedDocTypeInEditor === "work_order" || selectedDocTypeInEditor === "completion_act" || selectedDocTypeInEditor === "invoice") && parts.length > 0 && (
                      <div className="space-y-1 pt-2">
                        <div className="font-bold text-zinc-900 text-xs">Запасные части и расходные материалы:</div>
                        <table className="w-full text-left border-collapse border border-zinc-300">
                          <thead>
                            <tr className="bg-zinc-100 text-zinc-700 text-[11px]">
                              <th className="p-2 border border-zinc-300">№</th>
                              <th className="p-2 border border-zinc-300">Артикул</th>
                              <th className="p-2 border border-zinc-300">Наименование</th>
                              <th className="p-2 border border-zinc-300 w-16 text-center">Кол-во</th>
                              <th className="p-2 border border-zinc-300 w-24 text-right">Цена</th>
                              <th className="p-2 border border-zinc-300 w-24 text-right">Сумма</th>
                            </tr>
                          </thead>
                          <tbody>
                            {parts.map((p, i) => (
                              <tr key={i}>
                                <td className="p-1.5 border border-zinc-300 text-center">{i + 1}</td>
                                <td className="p-1.5 border border-zinc-300 font-mono text-[11px]">{p.oem || "—"}</td>
                                <td className="p-1.5 border border-zinc-300 font-medium">{p.name}</td>
                                <td className="p-1.5 border border-zinc-300 text-center font-bold">{p.qty} {p.unit}</td>
                                <td className="p-1.5 border border-zinc-300 text-right">{p.salePrice} ₽</td>
                                <td className="p-1.5 border border-zinc-300 text-right font-bold">{p.total.toLocaleString()} ₽</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Defect sheet items */}
                    {selectedDocTypeInEditor === "defect_sheet" && (
                      <div className="p-3 rounded-lg border border-zinc-300 bg-zinc-50 space-y-2">
                        <div className="font-bold text-xs">Выявленные дефекты узлов и агрегатов:</div>
                        <p className="italic text-zinc-800">{recommendations || complaints || "Дефектов не зафиксировано."}</p>
                      </div>
                    )}

                    {/* Totals & Sum in words */}
                    <div className="p-3 bg-zinc-50 border border-zinc-300 rounded-lg space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold text-sm text-zinc-900">
                          {selectedDocTypeInEditor === "invoice" ? "ВСЕГО К ОПЛАТЕ:" : "ИТОГО К ОПЛАТЕ:"}
                        </span>
                        <span className="font-black text-base text-red-600">
                          {formatCurrency(draftOrderForDoc.grandTotal)}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-600 border-t border-zinc-200 pt-1.5">
                        <span className="font-bold text-zinc-900">Сумма прописью: </span>
                        <span className="italic font-medium text-zinc-800">{numberToWordsRu(draftOrderForDoc.grandTotal)}</span>
                      </div>
                      <div className="text-[10px] text-zinc-500">
                        НДС не облагается (в соответствии с пп. 37 п. 3 ст. 149 НК РФ, УСН / Патент).
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8 pt-4 border-t-2 border-zinc-300 text-[11px]">
                      <div>
                        <p className="font-bold">
                          {selectedDocTypeInEditor === "invoice" ? "Предприниматель / Руководитель:" : "Исполнитель / Мастер-приемщик:"}
                        </p>
                        <p className="text-zinc-600 mb-4">{stoReq.director} / {stoReq.masterReceiver}</p>

                        <div className="relative inline-block">
                          {isEditorFacsimile && (
                            <>
                              <img
                                src={stoReq.signatureUrl || generateDefaultSignatureDataUrl()}
                                alt="Подпись"
                                className="absolute -top-7 left-2 w-32 h-12 object-contain pointer-events-none select-none z-10"
                                style={{ mixBlendMode: "multiply" }}
                              />
                              <img
                                src={stoReq.stampUrl || generateDefaultStampDataUrl()}
                                alt="Оттиск печати"
                                className="absolute -top-10 left-20 w-28 h-28 object-contain pointer-events-none select-none z-20"
                                style={{
                                  transform: "rotate(-2.5deg)",
                                  mixBlendMode: "multiply",
                                  opacity: 0.94,
                                }}
                              />
                            </>
                          )}
                          <div className="border-b border-black w-48 mb-1" />
                        </div>
                        <p className="text-[10px] text-zinc-500">Подпись / М.П.</p>
                      </div>
                      <div>
                        <p className="font-bold">
                          {selectedDocTypeInEditor === "payment_receipt" ? "Плательщик:" : "Заказчик (представитель):"}
                        </p>
                        <p className="text-zinc-600 mb-4">{draftOrderForDoc.client?.name || "Заказчик"}</p>
                        <div className="border-b border-black w-48 mb-1" />
                        <p className="text-[10px] text-zinc-500">
                          {selectedDocTypeInEditor === "payment_receipt" ? "Оплату произвел" : "С объемом и стоимостью работ согласен"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Bottom Action Bar */}
            <div className="px-6 py-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 flex items-center justify-between shrink-0">
              {(() => {
                const calculated = calculateOrderTotals(works, parts);
                return (
                  <div className="flex items-center space-x-4">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-zinc-400">Итого:</span>
                      <div className="text-base font-extrabold text-red-600 dark:text-red-400">
                        {formatCurrency(calculated.grandTotal)}
                      </div>
                    </div>
                    <div className="hidden sm:block text-[11px] text-zinc-500 border-l border-zinc-200 dark:border-zinc-800 pl-4">
                      Работы: <strong>{formatCurrency(calculated.totalWorks)}</strong> • Запчасти: <strong>{formatCurrency(calculated.totalParts)}</strong>
                    </div>
                  </div>
                );
              })()}

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer"
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
          <div className="bg-white dark:bg-[#0c1015] w-full max-w-xl max-h-[80vh] rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden text-xs">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/60">
              <div className="flex items-center space-x-2 font-bold text-zinc-900 dark:text-zinc-100">
                <Boxes className="w-4 h-4 text-emerald-500" />
                <span>Выбор детали со склада автосервиса</span>
              </div>
              <button onClick={() => setIsWarehousePickerOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
              <input
                type="text"
                placeholder="Поиск по артикулу OEM или названию..."
                value={warehouseSearch}
                onChange={(e) => setWarehouseSearch(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {availableWarehouseParts.length === 0 ? (
                <div className="text-center py-8 text-zinc-400">
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
                      className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500 hover:bg-emerald-50/20 flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <div>
                        <div className="font-bold text-zinc-900 dark:text-zinc-100">{p.name}</div>
                        <div className="text-[11px] font-mono text-zinc-500">OEM: {p.oem} • Стеллаж: {p.location || "Основной"}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(p.salePrice)}</div>
                        <div className="text-[10px] text-zinc-400">В наличии: {p.quantity} {p.unit}</div>
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
          <div className="bg-white dark:bg-[#0c1015] w-full max-w-5xl h-[88vh] rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/60">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-red-600/10 text-red-600">
                  <Search className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    ИИ-Проценка и быстрый подбор запчастей по оптовым складам
                  </h3>
                  <p className="text-[11px] text-zinc-500">
                    {vehicleMake ? `${vehicleMake} ${vehicleModel}` : "Поиск по складам поставщиков"} {licensePlate ? `(${licensePlate})` : ""} {vin ? `• VIN: ${vin}` : ""}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsProcurementModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
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
