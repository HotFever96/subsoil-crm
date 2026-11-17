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
  Camera,
  PhoneCall,
  Phone,
  ChevronDown,
  Star,
  CreditCard,
  ExternalLink,
  Copy,
  Building2,
  Check,
  Database,
  FileSpreadsheet,
  Download,
  RefreshCw,
  ArrowUpDown,
} from "lucide-react";
import QRCode from "qrcode";
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
import { ServiceDocumentModal, ServiceDocumentPrintSheet } from "./ServiceDocumentModal";
import { PartsProcurementModule } from "./PartsProcurementModule";
import { PartSearchResult } from "@/lib/parts-procurement-types";
import { VehicleInspectionSchematic } from "./VehicleInspectionSchematic";
import { exportAutoServiceDocx } from "@/lib/auto-service-docx";
import { OcrScannerModal, ScannedVehicleData } from "./OcrScannerModal";
import { extractRepairOrderFromText, isOrderCreationRequest } from "@/lib/order-markdown-parser";

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
  const [sortBy, setSortBy] = useState<
    "date_desc" | "date_asc" | "number_desc" | "number_asc" | "amount_desc" | "amount_asc" | "client_asc" | "client_desc"
  >("date_desc");

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
  const [payerName, setPayerName] = useState("");
  const [payerInn, setPayerInn] = useState("");
  const [payerKpp, setPayerKpp] = useState("");
  const [payerOgrn, setPayerOgrn] = useState("");
  const [payerAddress, setPayerAddress] = useState("");
  const [isSearchingInn, setIsSearchingInn] = useState(false);
  const [innFoundInfo, setInnFoundInfo] = useState<string | null>(null);

  // UDMPAY / SBP Payment Modal
  const [isUdmpayModalOpen, setIsUdmpayModalOpen] = useState(false);
  const [udmpayOrder, setUdmpayOrder] = useState<RepairOrder | null>(null);
  const [udmpayQrUrl, setUdmpayQrUrl] = useState<string>("");
  const [copySuccess, setCopySuccess] = useState(false);
  const [markPaidSuccess, setMarkPaidSuccess] = useState(false);
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
  const [isOcrScannerOpen, setIsOcrScannerOpen] = useState(false);
  const [ocrSuccessToast, setOcrSuccessToast] = useState<string | null>(null);
  const [isVoicyfyCalling, setIsVoicyfyCalling] = useState(false);
  const [voicyfyMenuOpen, setVoicyfyMenuOpen] = useState(false);
  const [voicyfyCustomPromptOpen, setVoicyfyCustomPromptOpen] = useState(false);
  const [voicyfyCustomText, setVoicyfyCustomText] = useState("");
  const [availableWarehouseParts, setAvailableWarehouseParts] = useState<WarehousePart[]>([]);
  const [warehouseSearch, setWarehouseSearch] = useState("");

  // AutoDealer Sync State
  const [isAutoDealerModalOpen, setIsAutoDealerModalOpen] = useState(false);
  const [isLoadingAutoDealer, setIsLoadingAutoDealer] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSyncAutoDealer = async () => {
    setIsLoadingAutoDealer(true);
    try {
      const res = await fetch("/api/autodealer-clients");
      const json = await res.json();
      if (json.success && Array.isArray(json.orders)) {
        const normalized = json.orders
          .filter((o: any) => !isMockOrder(o))
          .map((o: any) => normalizeRepairOrder(o, currentUsername));
        setOrders(normalized);
        const userKeys = [
          storageKey,
          "geo_ai_repair_orders_antonv_v2",
          "geo_ai_repair_orders_admin_v2",
          "geo_ai_repair_orders_guest_v2",
        ];
        for (const k of userKeys) {
          try {
            localStorage.setItem(k, JSON.stringify(normalized));
          } catch {}
        }
        window.dispatchEvent(new CustomEvent("geo_ai_repair_orders_updated"));
        showToast(`Успешно синхронизировано ${normalized.length} заказ-нарядов из АвтоДилер`);
      }
    } catch (e) {
      console.warn("Failed to sync AutoDealer orders:", e);
      showToast("Ошибка при синхронизации базы заказ-нарядов");
    } finally {
      setIsLoadingAutoDealer(false);
      setIsAutoDealerModalOpen(false);
    }
  };

  const stoReq = getStoRequisites(currentUsername);

  // Helper to scan all chat history for any repair orders created or discussed with AI
  const scanChatSessionsForOrders = (uname: string): RepairOrder[] => {
    if (typeof window === "undefined") return [];
    const results: RepairOrder[] = [];
    const usersToScan = Array.from(
      new Set([(uname || "admin").trim().toLowerCase(), "antonv", "admin", "guest"])
    ).filter(Boolean);

    const seenKeys = new Set<string>();

    for (const u of usersToScan) {
      try {
        const chatKey = `geo_ai_chat_sessions_${u}_v5`;
        const raw = localStorage.getItem(chatKey);
        if (!raw) continue;
        const sessions = JSON.parse(raw);
        if (!Array.isArray(sessions)) continue;

        for (const sess of sessions) {
          if (!Array.isArray(sess?.messages)) continue;
          for (let i = 0; i < sess.messages.length; i++) {
            const msg = sess.messages[i];
            if (msg.role === "assistant" && msg.content) {
              const prevUser =
                i > 0 && sess.messages[i - 1].role === "user" ? sess.messages[i - 1].content : "";
              if (isOrderCreationRequest(`${prevUser}\n${msg.content}`)) {
                const order = extractRepairOrderFromText(msg.content, prevUser, uname || "antonv");
                if (order) {
                  const uniqueKey = order.orderNumber || `${order.vehicle.make}-${order.vehicle.licensePlate}`;
                  if (!seenKeys.has(uniqueKey)) {
                    seenKeys.add(uniqueKey);
                    results.push(order);
                  }
                }
              }
            }
          }
        }
      } catch (e) {
        console.warn("Failed scanning chat sessions for repair orders:", e);
      }
    }
    return results;
  };

  const isMockOrder = (o: any): boolean => {
    if (!o) return true;
    const num = String(o.orderNumber || "").toUpperCase();
    const cName = String(o.client?.name || "").toLowerCase();
    return (
      num === "ЗН-СЕВ-0012" ||
      num === "ЗН-2026-0042" ||
      num === "ЗН-2026-0041" ||
      num === "ЗН-2026-0043" ||
      num.includes("ЗН-26/1047") ||
      cName.includes("петров") ||
      cName.includes("николаев") ||
      cName.includes("ывыфвфы")
    );
  };

  // Load orders for current user and purge any test mock orders
  useEffect(() => {
    if (!currentUsername) {
      setOrders([]);
      return;
    }

    // Purge legacy mock data cache if exists
    try {
      localStorage.removeItem(`geo_ai_repair_orders_${currentUsername}_v1`);
    } catch {}

    const orderMap = new Map<string, RepairOrder>();

    // 1. Initial base orders
    getInitialOrders(currentUsername)
      .map((o) => normalizeRepairOrder(o, currentUsername))
      .filter((o) => !isMockOrder(o))
      .forEach((o) => {
        const k = o.orderNumber || o.id;
        if (k) orderMap.set(k, o);
      });

    // 2. Saved orders from localStorage
    const userKeys = [
      storageKey,
      "geo_ai_repair_orders_antonv_v2",
      "geo_ai_repair_orders_admin_v2",
      "geo_ai_repair_orders_guest_v2",
    ];
    for (const key of userKeys) {
      try {
        const saved = localStorage.getItem(key);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            parsed
              .filter((o: any) => !isMockOrder(o))
              .map((o: any) => normalizeRepairOrder(o, currentUsername))
              .forEach((o: RepairOrder) => {
                const k = o.orderNumber || o.id;
                if (k) orderMap.set(k, o);
              });
          }
        }
      } catch (e) {
        console.warn("Error loading repair orders from localStorage:", e);
      }
    }

    const combinedLoaded = Array.from(orderMap.values());
    setOrders(combinedLoaded);
    try {
      localStorage.setItem(storageKey, JSON.stringify(combinedLoaded));
    } catch {}

    // Auto-seed from AutoDealer backup if local storage is empty
    if (combinedLoaded.length === 0) {
      setIsLoadingAutoDealer(true);
      fetch("/api/autodealer-clients")
        .then((r) => r.json())
        .then((data) => {
          if (data.success && Array.isArray(data.orders) && data.orders.length > 0) {
            const normalized = data.orders
              .filter((o: any) => !isMockOrder(o))
              .map((o: any) => normalizeRepairOrder(o, currentUsername));
            setOrders(normalized);
            const userKeys = [
              storageKey,
              "geo_ai_repair_orders_antonv_v2",
              "geo_ai_repair_orders_admin_v2",
              "geo_ai_repair_orders_guest_v2",
            ];
            for (const k of userKeys) {
              try {
                localStorage.setItem(k, JSON.stringify(normalized));
              } catch {}
            }
            window.dispatchEvent(new CustomEvent("geo_ai_repair_orders_updated"));
          }
        })
        .catch((e) => console.warn("Failed to auto-load AutoDealer repair orders:", e))
        .finally(() => setIsLoadingAutoDealer(false));
    }

    // 3. Sync from Supabase
    fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_repair_orders", username: currentUsername }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.orders)) {
          const cleanedRemote = data.orders
            .filter((o: any) => !isMockOrder(o))
            .map((o: any) => normalizeRepairOrder(o, currentUsername));

          setOrders((prev) => {
            const map = new Map<string, RepairOrder>();
            cleanedRemote.forEach((o: RepairOrder) => {
              const k = o.orderNumber || o.id;
              if (k) map.set(k, o);
            });
            prev.filter((o) => !isMockOrder(o)).forEach((o: RepairOrder) => {
              const k = o.orderNumber || o.id;
              if (k && !map.has(k)) {
                map.set(k, o);
              }
            });
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
        let currentList: RepairOrder[] = [];
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            currentList = parsed.filter((o: any) => !isMockOrder(o)).map((o: any) => normalizeRepairOrder(o, currentUsername));
          }
        }
        setOrders(currentList);
        localStorage.setItem(storageKey, JSON.stringify(currentList));
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

  const saveSingleOrder = (ord: RepairOrder) => {
    const safe = normalizeRepairOrder(ord, currentUsername);
    const updated = orders.some((o) => o.id === safe.id)
      ? orders.map((o) => (o.id === safe.id ? safe : o))
      : [safe, ...orders];
    saveOrders(updated);
    if (currentUsername) {
      fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_repair_order",
          username: currentUsername,
          payload: { order: safe },
        }),
      }).catch(() => {});
    }
  };

  const handleLookupInn = async (innToSearch: string) => {
    const clean = innToSearch.replace(/\D/g, "");
    if (clean.length !== 10 && clean.length !== 12) return;
    setIsSearchingInn(true);
    try {
      const storedKey = typeof window !== "undefined"
        ? localStorage.getItem("geonedra_openrouter_key") || localStorage.getItem("geo_ai_openrouter_api_key") || ""
        : "";

      const res = await fetch("/api/company-by-inn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inn: clean, apiKey: storedKey }),
      });
      const json = await res.json();
      if (json.success && json.company) {
        const c = json.company;
        const orgName = c.name || c.shortName || `Организация ИНН ${c.inn}`;
        setPayerName(orgName);
        setPayerInn(c.inn);
        setPayerKpp(c.kpp || "");
        setPayerOgrn(c.ogrn || "");
        setPayerAddress(c.address || "");
        setClientInn(c.inn);

        // Auto-fill client name if empty or generic
        if (!clientName.trim() || clientName === "Частный клиент" || clientName === "Клиент") {
          setClientName(orgName);
        }

        setInnFoundInfo(`Найдено: ${orgName} ${c.ogrn ? `(ОГРН ${c.ogrn})` : ""}`);
        setTimeout(() => setInnFoundInfo(null), 5000);
      }
    } catch (err) {
      console.warn("INN search error:", err);
    } finally {
      setIsSearchingInn(false);
    }
  };

  const openUdmpayModal = async (order: RepairOrder) => {
    setUdmpayOrder(order);
    setIsUdmpayModalOpen(true);
    setMarkPaidSuccess(false);
    try {
      const qr = await QRCode.toDataURL("https://modul.udmpay.ru/13115", {
        margin: 1,
        width: 260,
        color: { dark: "#000000", light: "#ffffff" },
      });
      setUdmpayQrUrl(qr);
    } catch (e) {
      console.warn("QR gen error:", e);
    }
  };

  const handleMarkAsPaidSbp = (ord: RepairOrder) => {
    const updated: RepairOrder = {
      ...ord,
      paymentStatus: "paid",
      paidAmount: ord.grandTotal,
      paidAt: new Date().toISOString(),
      paymentMethod: "sbp",
    };
    saveSingleOrder(updated);
    setUdmpayOrder(updated);
    setMarkPaidSuccess(true);
    setTimeout(() => {
      setIsUdmpayModalOpen(false);
      setMarkPaidSuccess(false);
    }, 1200);
  };

  const handleCopyAmount = () => {
    if (!udmpayOrder) return;
    navigator.clipboard.writeText(String(udmpayOrder.grandTotal));
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleSendClientPaymentLink = () => {
    if (!udmpayOrder) return;
    const text = `Здравствуйте, ${udmpayOrder.client?.name || "клиент"}! Заказ-наряд № ${udmpayOrder.orderNumber} на ${udmpayOrder.vehicle?.make} ${udmpayOrder.vehicle?.model} (${udmpayOrder.vehicle?.licensePlate}) готов. Сумма к оплате: ${udmpayOrder.grandTotal.toLocaleString("ru-RU")} ₽. Оплата через СБП без комиссии: https://modul.udmpay.ru/13115 СТО «Чайка-Сервис»`;
    if (udmpayOrder.client?.phone) {
      const cleanPhone = udmpayOrder.client.phone.replace(/\D/g, "");
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, "_blank");
    } else {
      navigator.clipboard.writeText(text);
      alert("Ссылка на оплату и сообщение скопированы в буфер обмена!");
    }
  };

  const openNewOrderModal = () => {
    setEditingOrder(null);
    setClientName("");
    setClientPhone("");
    setClientInn("");
    setPayerName("");
    setPayerInn("");
    setPayerKpp("");
    setPayerOgrn("");
    setPayerAddress("");
    setInnFoundInfo(null);
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
    setPayerName(safe.client?.payerName || "");
    setPayerInn(safe.client?.payerInn || safe.client?.inn || "");
    setPayerKpp(safe.client?.payerKpp || "");
    setPayerOgrn(safe.client?.payerOgrn || "");
    setPayerAddress(safe.client?.payerAddress || "");
    setInnFoundInfo(null);
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

  const handleApplyOcrData = (data: ScannedVehicleData) => {
    let matchedClientName = "";
    let matchedClientPhone = "";
    let matchedClientInn = "";
    let matchedVehicleMake = "";
    let matchedVehicleModel = "";

    const rawPlate = (data.licensePlate || data.plate_number || "").trim().toUpperCase();
    const cleanPlate = rawPlate.replace(/[^A-ZА-Я0-9]/gi, "");
    const rawVin = (data.vin || "").trim().toUpperCase();
    const cleanVin = rawVin.replace(/[^A-Z0-9]/gi, "");
    const scannedMake = data.make || data.brand || "";
    const scannedModel = data.model || "";
    const scannedClientName = data.clientName || data.client_name || "";
    const scannedPhone = data.clientPhone || data.phone || "";

    // 1. Check Clients & Garage database in localStorage
    try {
      const savedClients = localStorage.getItem(`geo_ai_clients_${currentUsername || "guest"}_v2`);
      if (savedClients) {
        const clientList = JSON.parse(savedClients);
        if (Array.isArray(clientList)) {
          for (const client of clientList) {
            const hasMatchingVehicle = client.vehicles?.some((v: any) => {
              const vp = (v.licensePlate || "").toUpperCase().replace(/[^A-ZА-Я0-9]/gi, "");
              const vv = (v.vin || "").toUpperCase().replace(/[^A-Z0-9]/gi, "");
              return (cleanPlate && vp && vp === cleanPlate) || (cleanVin && vv && vv === cleanVin);
            });
            if (hasMatchingVehicle) {
              matchedClientName = client.name || "";
              matchedClientPhone = client.phone || "";
              matchedClientInn = client.inn || "";
              const veh = client.vehicles?.find((v: any) => {
                const vp = (v.licensePlate || "").toUpperCase().replace(/[^A-ZА-Я0-9]/gi, "");
                const vv = (v.vin || "").toUpperCase().replace(/[^A-Z0-9]/gi, "");
                return (cleanPlate && vp && vp === cleanPlate) || (cleanVin && vv && vv === cleanVin);
              });
              if (veh) {
                matchedVehicleMake = veh.make || "";
                matchedVehicleModel = veh.model || "";
              }
              break;
            }
          }
        }
      }
    } catch {}

    // 2. Fallback: check historical orders in state
    if (!matchedClientName) {
      for (const ord of orders) {
        const ordPlate = (ord.vehicle?.licensePlate || "").toUpperCase().replace(/[^A-ZА-Я0-9]/gi, "");
        const ordVin = (ord.vehicle?.vin || "").toUpperCase().replace(/[^A-Z0-9]/gi, "");
        if ((cleanPlate && ordPlate && ordPlate === cleanPlate) || (cleanVin && ordVin && ordVin === cleanVin)) {
          matchedClientName = ord.client?.name || "";
          matchedClientPhone = ord.client?.phone || "";
          matchedClientInn = ord.client?.inn || "";
          if (!matchedVehicleMake && ord.vehicle?.make) matchedVehicleMake = ord.vehicle.make;
          if (!matchedVehicleModel && ord.vehicle?.model) matchedVehicleModel = ord.vehicle.model;
          break;
        }
      }
    }

    // Apply scanned values, filling gaps with CRM match
    if (rawPlate) setLicensePlate(rawPlate);
    if (rawVin) setVin(rawVin);

    const finalMake = scannedMake || matchedVehicleMake;
    if (finalMake) setVehicleMake(finalMake);

    const finalModel = scannedModel || matchedVehicleModel;
    if (finalModel) setVehicleModel(finalModel);

    const finalClientName = scannedClientName || matchedClientName;
    if (finalClientName) setClientName(finalClientName);

    const finalPhone = scannedPhone || matchedClientPhone;
    if (finalPhone) setClientPhone(finalPhone);

    if (matchedClientInn) setClientInn(matchedClientInn);

    if (data.mileage) {
      setMileage(String(data.mileage));
    }

    setIsOcrScannerOpen(false);

    const toastMsg = matchedClientName
      ? `Данные СТС распознаны! Найден в базе клиентов: ${matchedClientName}`
      : "Данные СТС / Авто успешно распознаны и заполнены в заказ-наряд!";
    setOcrSuccessToast(toastMsg);
    setTimeout(() => setOcrSuccessToast(null), 5000);
  };

  const handleTriggerVoicyfyCall = async (
    actionType: "ready" | "csi" | "custom",
    customInstruction?: string
  ) => {
    const targetPhone = clientPhone.trim();
    if (!targetPhone) {
      alert("Пожалуйста, укажите номер телефона клиента для звонка голосового агента.");
      return;
    }

    setIsVoicyfyCalling(true);
    try {
      const payload = {
        name: clientName.trim() || "Клиент",
        phone: targetPhone,
        car: `${vehicleMake} ${vehicleModel}`.trim() || "автомобиль",
        order_id: editingOrder?.orderNumber || "ЗН",
        action_type: actionType,
        custom_instruction: customInstruction || voicyfyCustomText,
        username: currentUsername,
      };

      const res = await fetch("/api/voicyfy/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setOcrSuccessToast(
          actionType === "ready"
            ? "✓ Голосовой агент Анна: звонок о готовности авто запущен!"
            : actionType === "csi"
            ? "✓ Голосовой агент Анна: звонок контроля качества (CSI) запланирован!"
            : "✓ Голосовой агент Анна: персональная задача на звонок передана!"
        );
        setTimeout(() => setOcrSuccessToast(null), 5000);
        setVoicyfyCustomPromptOpen(false);
        setVoicyfyCustomText("");
        setVoicyfyMenuOpen(false);
      } else {
        alert(data.error || "Не удалось отправить задачу Voicyfy");
      }
    } catch (err: any) {
      alert(`Ошибка связи с сервисом Voicyfy: ${err.message}`);
    } finally {
      setIsVoicyfyCalling(false);
    }
  };

  const handleSaveOrder = () => {
    // If saving order without works/parts: auto-save as 'draft'
    const hasNoWorksOrParts = (!works || works.length === 0) && (!parts || parts.length === 0);
    let finalStatus = orderStatus;
    if (hasNoWorksOrParts && (orderStatus === "in_progress" || !orderStatus)) {
      finalStatus = "draft";
    }

    if (!licensePlate.trim() && !clientName.trim()) {
      alert("Пожалуйста, укажите хотя бы госномер автомобиля или заказчика (или отсканируйте СТС).");
      return;
    }

    const totals = calculateOrderTotals(works, parts);
    const orderNumber = editingOrder
      ? editingOrder.orderNumber
      : `ЗН-${new Date().getFullYear()}-${String(orders.length + 1).padStart(4, "0")}`;

    const newOrder: RepairOrder = {
      id: editingOrder ? editingOrder.id : `ord-${Date.now()}`,
      orderNumber,
      status: finalStatus,
      createdAt: editingOrder ? editingOrder.createdAt : new Date().toISOString().slice(0, 10),
      client: {
        type: (clientInn.trim() || payerInn.trim()) ? "legal" : "individual",
        name: clientName.trim() || "Клиент",
        phone: clientPhone.trim(),
        inn: (payerInn.trim() || clientInn.trim()) || undefined,
        payerName: payerName.trim() || undefined,
        payerInn: payerInn.trim() || undefined,
        payerKpp: payerKpp.trim() || undefined,
        payerOgrn: payerOgrn.trim() || undefined,
        payerAddress: payerAddress.trim() || undefined,
      },
      vehicle: {
        make: vehicleMake.trim() || "ТС",
        model: vehicleModel.trim() || "",
        licensePlate: licensePlate.trim().toUpperCase() || "Б/Н",
        vin: vin.trim().toUpperCase(),
        year: editingOrder?.vehicle?.year || 2023,
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
      csiRating: editingOrder?.csiRating,
      csiFeedback: editingOrder?.csiFeedback,
      csiSummary: editingOrder?.csiSummary,
      voicyfyCalls: editingOrder?.voicyfyCalls,
    };

    // Automation: if status changed to 'issued' (Выдан), automatically schedule CSI call with Voicyfy
    const wasAlreadyIssued = editingOrder?.status === "issued";
    if (finalStatus === "issued" && !wasAlreadyIssued && clientPhone.trim()) {
      handleTriggerVoicyfyCall("csi");
    }

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
      type: (clientInn || payerInn) ? "legal" : "individual",
      name: clientName || "Клиент",
      phone: clientPhone,
      inn: payerInn || clientInn,
      payerName: payerName || undefined,
      payerInn: payerInn || undefined,
      payerKpp: payerKpp || undefined,
      payerOgrn: payerOgrn || undefined,
      payerAddress: payerAddress || undefined,
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

  const parseOrderDate = (d?: string): number => {
    if (!d) return 0;
    if (d.includes("-")) {
      const t = new Date(d).getTime();
      if (!isNaN(t)) return t;
    }
    if (d.includes(".")) {
      const p = d.split(".");
      if (p.length === 3) {
        const t = new Date(`${p[2]}-${p[1].padStart(2, "0")}-${p[0].padStart(2, "0")}`).getTime();
        if (!isNaN(t)) return t;
      }
    }
    return 0;
  };

  const parseOrderNum = (num?: string): number => {
    if (!num) return 0;
    const digits = num.match(/\d+/g);
    if (!digits || digits.length === 0) return 0;
    return parseInt(digits[digits.length - 1], 10) || 0;
  };

  const sortComparator = (a: RepairOrder, b: RepairOrder) => {
    switch (sortBy) {
      case "date_desc": {
        const da = parseOrderDate(a.createdAt);
        const db = parseOrderDate(b.createdAt);
        if (db !== da) return db - da;
        return parseOrderNum(b.orderNumber) - parseOrderNum(a.orderNumber);
      }
      case "date_asc": {
        const da = parseOrderDate(a.createdAt);
        const db = parseOrderDate(b.createdAt);
        if (da !== db) return da - db;
        return parseOrderNum(a.orderNumber) - parseOrderNum(b.orderNumber);
      }
      case "number_desc":
        return parseOrderNum(b.orderNumber) - parseOrderNum(a.orderNumber);
      case "number_asc":
        return parseOrderNum(a.orderNumber) - parseOrderNum(b.orderNumber);
      case "amount_desc":
        return (Number(b.grandTotal) || 0) - (Number(a.grandTotal) || 0);
      case "amount_asc":
        return (Number(a.grandTotal) || 0) - (Number(b.grandTotal) || 0);
      case "client_asc":
        return (a.client?.name || "").localeCompare(b.client?.name || "", "ru");
      case "client_desc":
        return (b.client?.name || "").localeCompare(a.client?.name || "", "ru");
      default:
        return 0;
    }
  };

  const filteredOrders = orders
    .map((o) => normalizeRepairOrder(o, currentUsername))
    .filter((o) => {
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
    })
    .sort(sortComparator);

  const statuses: OrderStatus[] = [
    "lead_ai",
    "draft",
    "estimate",
    "in_progress",
    "parts_waiting",
    "ready",
    "issued",
    "closed",
  ];

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
              className={`p-1.5 px-3 rounded-full text-xs flex items-center space-x-1.5 transition-colors cursor-pointer border ${
                viewMode === "table"
                  ? "bg-zinc-900 text-white dark:bg-white/15 dark:text-white border-zinc-900/10 dark:border-white/20 shadow-xs font-semibold"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white border-transparent font-medium"
              }`}
              title="Табличный вид"
            >
              <List className="w-3.5 h-3.5" />
              <span>Таблица</span>
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              className={`p-1.5 px-3 rounded-full text-xs flex items-center space-x-1.5 transition-colors cursor-pointer border ${
                viewMode === "kanban"
                  ? "bg-zinc-900 text-white dark:bg-white/15 dark:text-white border-zinc-900/10 dark:border-white/20 shadow-xs font-semibold"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white border-transparent font-medium"
              }`}
              title="Канбан-доска"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Канбан</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsAutoDealerModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold shadow-xs transition-all cursor-pointer"
            title="Просмотр и выгрузка базы АвтоДилер Онлайн"
          >
            <Database className="w-3.5 h-3.5 text-emerald-500" />
            <span>База АвтоДилер: {orders.length} ЗН</span>
          </button>

          <button
            type="button"
            onClick={openNewOrderModal}
            className="flex items-center space-x-2 px-4 py-2 rounded-full bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-950 text-xs font-semibold transition-all shadow-xs cursor-pointer active:scale-95"
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
            className={`px-3.5 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors cursor-pointer border ${
              selectedStatus === "all"
                ? "bg-zinc-900 text-white dark:bg-white/15 dark:text-white border-zinc-900/10 dark:border-white/20 shadow-xs font-semibold"
                : "bg-black/[0.03] dark:bg-white/[0.04] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/[0.06] dark:hover:bg-white/[0.08] border-transparent font-medium"
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
                className={`px-3.5 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors cursor-pointer flex items-center space-x-1.5 border ${
                  isActive
                    ? "bg-zinc-900 text-white dark:bg-white/15 dark:text-white border-zinc-900/10 dark:border-white/20 shadow-xs font-semibold"
                    : "bg-black/[0.03] dark:bg-white/[0.04] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/[0.06] dark:hover:bg-white/[0.08] border-transparent font-medium"
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

        {/* Search & Sort Controls */}
        <div className="flex items-center space-x-2.5 shrink-0">
          {/* Sort Dropdown */}
          <div className="relative flex items-center bg-white/60 dark:bg-white/[0.05] border border-white/[0.09] rounded-full px-3 py-1.5 backdrop-blur-2xl">
            <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400 mr-2 shrink-0 pointer-events-none" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-hidden cursor-pointer pr-1"
              title="Сортировка заказ-нарядов"
            >
              <option value="date_desc" className="bg-zinc-900 text-white">Новые сверху (по дате)</option>
              <option value="date_asc" className="bg-zinc-900 text-white">Старые сверху (по дате)</option>
              <option value="number_desc" className="bg-zinc-900 text-white">По номеру ЗН (убывание)</option>
              <option value="number_asc" className="bg-zinc-900 text-white">По номеру ЗН (возрастание)</option>
              <option value="amount_desc" className="bg-zinc-900 text-white">По сумме: дорогие</option>
              <option value="amount_asc" className="bg-zinc-900 text-white">По сумме: бюджетные</option>
              <option value="client_asc" className="bg-zinc-900 text-white">Клиент (А → Я)</option>
              <option value="client_desc" className="bg-zinc-900 text-white">Клиент (Я → А)</option>
            </select>
          </div>

          {/* Search Input */}
          <div className="relative min-w-[240px]">
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
      </div>

      {/* Main Content: Table or Kanban */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredOrders.length === 0 ? (
          <div className="h-full min-h-[340px] flex items-center justify-center p-4">
            <div className="p-8 rounded-3xl bg-white/70 dark:bg-zinc-950/70 border border-zinc-200/80 dark:border-white/[0.1] backdrop-blur-2xl shadow-xl max-w-md w-full flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-4">
                <Wrench className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                {searchQuery ? "Заказ-наряды не найдены" : "Список заказ-нарядов пуст"}
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-2 leading-relaxed">
                Создайте заказ-наряд вручную или поручите открытие ИИ-шеф-мастеру прямо в чате.
              </p>
              <button
                onClick={openNewOrderModal}
                className="mt-5 px-5 py-2.5 rounded-full bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-950 text-xs font-semibold transition-all shadow-xs cursor-pointer active:scale-95"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5 inline" />
                <span>Создать первый заказ-наряд</span>
              </button>
            </div>
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
                    <th className="py-3 px-4 text-center">Документы и Оплата</th>
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
                          <div className="text-[11px] text-zinc-400 flex items-center space-x-1.5 mt-0.5">
                            <span>{ord.client?.phone || ""}</span>
                            {ord.csiRating && (
                              <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                                <Star className="w-2.5 h-2.5 fill-amber-500" />
                                <span>{ord.csiRating}/5 CSI</span>
                              </span>
                            )}
                          </div>
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

                        {/* Quick Document & SBP Payment Triggers */}
                        <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveDocOrder(ord);
                                setActiveDocType("work_order");
                              }}
                              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold transition-colors cursor-pointer border border-red-500/20"
                              title="Открыть печатные формы А4"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Печать А4</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => openUdmpayModal(ord)}
                              className={`inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
                                ord.paymentStatus === "paid"
                                  ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                                  : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/25 shadow-2xs"
                              }`}
                              title="Оплата через СБП / UDMPAY"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>{ord.paymentStatus === "paid" ? "Оплачено" : "СБП / UDMPAY"}</span>
                            </button>
                          </div>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
            {statuses.map((st) => {
              const meta = getStatusMeta(st);
              const columnOrders = filteredOrders.filter((o) => o.status === st);
              return (
                <div key={st} className="flex flex-col bg-white/40 dark:bg-white/[0.03] rounded-3xl border border-zinc-200/50 dark:border-white/[0.06] backdrop-blur-2xl p-3 min-h-[450px]">
                  <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-zinc-200/60 dark:border-white/[0.06]">
                    <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200 truncate pr-1" title={meta.label}>{meta.label}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-bold shrink-0">
                      {columnOrders.length}
                    </span>
                  </div>

                  <div className="space-y-2 flex-1 overflow-y-auto">
                    {columnOrders.map((ord) => (
                      <div
                        key={ord.id}
                        onClick={() => openEditOrderModal(ord)}
                        className="p-3 rounded-2xl bg-white dark:bg-white/[0.06] border border-zinc-200/70 dark:border-white/[0.08] hover:border-rose-500/50 hover:shadow-lg dark:hover:shadow-rose-950/20 cursor-pointer transition-all space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">{ord.orderNumber}</span>
                          <span className="font-mono text-[10px] text-zinc-400">{ord.createdAt}</span>
                        </div>
                        <div>
                          <div className="font-semibold text-xs text-zinc-800 dark:text-zinc-200">{ord.vehicle?.make || "Автомобиль"} {ord.vehicle?.model || ""}</div>
                          <div className="font-mono font-bold text-[11px] text-red-600 dark:text-red-400">{ord.vehicle?.licensePlate || "Б/Н"}</div>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                          <span className="truncate">{ord.client?.name || "Клиент"}</span>
                          {ord.csiRating && (
                            <span className="inline-flex items-center space-x-0.5 px-1 py-0.2 rounded-full text-[9px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30 shrink-0">
                              <Star className="w-2.5 h-2.5 fill-amber-500" />
                              <span>{ord.csiRating}</span>
                            </span>
                          )}
                        </div>
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

              {/* Action Buttons & Tabs */}
              <div className="flex flex-wrap items-center gap-2">
                {/* OCR Scanner Quick Button in Modal Header */}
                <button
                  type="button"
                  onClick={() => setIsOcrScannerOpen(true)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-sm hover:shadow-red-600/20 active:scale-95 transition-all cursor-pointer shrink-0"
                  title="Быстрое распознавание СТС или госномера по фото"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Сканировать СТС</span>
                  <span className="sm:hidden">Сканировать</span>
                </button>

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
              {/* Toast when OCR data is applied */}
              {ocrSuccessToast && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between animate-in fade-in slide-in-from-top-2 shadow-lg shadow-emerald-950/20">
                  <div className="flex items-center space-x-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-semibold">{ocrSuccessToast}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOcrSuccessToast(null)}
                    className="p-1 rounded-lg text-emerald-400 hover:text-white hover:bg-emerald-500/20 cursor-pointer transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
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
                          <div className="flex items-center space-x-2">
                            {/* Voicyfy Call Dropdown */}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setVoicyfyMenuOpen(!voicyfyMenuOpen)}
                                disabled={isVoicyfyCalling}
                                className="inline-flex items-center space-x-1 text-[11px] font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 px-2.5 py-0.5 rounded-lg transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
                                title="Голосовой ИИ-агент Анна (Voicyfy)"
                              >
                                <Sparkles className="w-3 h-3 text-rose-400" />
                                <span>Звонок Анны (ИИ)</span>
                                <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                              </button>

                              {voicyfyMenuOpen && (
                                <div className="absolute right-0 top-full mt-1.5 w-64 rounded-2xl bg-zinc-900/95 backdrop-blur-2xl border border-white/10 shadow-2xl p-1.5 z-50 space-y-1 animate-in fade-in zoom-in-95">
                                  <div className="px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider text-zinc-500 border-b border-white/[0.06]">
                                    Голосовой агент Voicyfy
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleTriggerVoicyfyCall("ready")}
                                    className="w-full text-left px-2.5 py-2 rounded-xl text-xs text-white hover:bg-white/10 flex items-center space-x-2 transition-colors cursor-pointer"
                                  >
                                    <Car className="w-4 h-4 text-rose-400 shrink-0" />
                                    <div>
                                      <div className="font-semibold">Сообщить о готовности авто</div>
                                      <div className="text-[10px] text-zinc-400">Срочный звонок о выдаче ТС</div>
                                    </div>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleTriggerVoicyfyCall("csi")}
                                    className="w-full text-left px-2.5 py-2 rounded-xl text-xs text-white hover:bg-white/10 flex items-center space-x-2 transition-colors cursor-pointer"
                                  >
                                    <Star className="w-4 h-4 text-amber-400 shrink-0" />
                                    <div>
                                      <div className="font-semibold">Запустить контроль качества (CSI)</div>
                                      <div className="text-[10px] text-zinc-400">Опрос качества ремонта 1–5</div>
                                    </div>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setVoicyfyMenuOpen(false);
                                      setVoicyfyCustomPromptOpen(true);
                                    }}
                                    className="w-full text-left px-2.5 py-2 rounded-xl text-xs text-rose-300 hover:bg-rose-500/10 flex items-center space-x-2 transition-colors cursor-pointer"
                                  >
                                    <span className="text-sm">✏️</span>
                                    <div>
                                      <div className="font-semibold">Свое поручение для звонка...</div>
                                      <div className="text-[10px] text-zinc-400">Ввести текст задачи для Анны</div>
                                    </div>
                                  </button>
                                </div>
                              )}
                            </div>
                            <span className="text-[10px] text-zinc-500 font-medium">
                              {clientInn.trim() ? "Юрлицо" : "Физлицо"}
                            </span>
                          </div>
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
                          <div className="relative flex items-center">
                            <input
                              type="text"
                              value={clientPhone}
                              onChange={(e) => setClientPhone(e.target.value)}
                              placeholder="Телефон *"
                              className="w-full px-3 py-1.5 pr-8 rounded-xl border border-white/[0.08] bg-zinc-950 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-red-500"
                            />
                            {clientPhone && (
                              <button
                                type="button"
                                onClick={() => setVoicyfyMenuOpen(!voicyfyMenuOpen)}
                                className="absolute right-2 p-1 rounded-md text-rose-400 hover:text-rose-300 hover:bg-white/10 transition-colors cursor-pointer"
                                title="Поручить звонок ИИ-агенту Анне"
                              >
                                <PhoneCall className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <div className="relative flex items-center">
                            <input
                              type="text"
                              value={payerInn || clientInn}
                              onChange={(e) => {
                                const val = e.target.value;
                                setPayerInn(val);
                                setClientInn(val);
                                const clean = val.replace(/\D/g, "");
                                if (clean.length === 10 || clean.length === 12) {
                                  handleLookupInn(clean);
                                }
                              }}
                              placeholder="ИНН (10 или 12 цифр)"
                              className="w-full pl-3 pr-16 py-1.5 rounded-xl border border-white/[0.08] bg-zinc-950 text-xs text-white font-mono placeholder:text-zinc-500 focus:outline-none focus:border-red-500"
                            />
                            <button
                              type="button"
                              disabled={isSearchingInn}
                              onClick={() => handleLookupInn(payerInn || clientInn)}
                              className="absolute right-1 px-2 py-0.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 text-[10px] font-semibold border border-red-500/30 flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                              title="Найти юрлицо по ИНН в ЕГРЮЛ"
                            >
                              <Building2 className="w-3 h-3" />
                              <span>{isSearchingInn ? "..." : "ИНН"}</span>
                            </button>
                          </div>
                        </div>

                        {innFoundInfo && (
                          <div className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg flex items-center space-x-1.5 animate-in fade-in">
                            <CheckCircle2 className="w-3 h-3 shrink-0" />
                            <span className="truncate">{innFoundInfo}</span>
                          </div>
                        )}

                        {/* Payer organization field (always visible, auto-filled by INN or editable) */}
                        <div className="space-y-1 bg-zinc-950/70 p-2.5 rounded-xl border border-white/5 text-[11px]">
                          <div className="flex items-center justify-between text-zinc-400 text-[10px]">
                            <span className="font-semibold text-zinc-300">Плательщик (Юрлицо):</span>
                            <div className="flex items-center space-x-2 font-mono">
                              {payerOgrn && <span>ОГРН: {payerOgrn}</span>}
                              {payerKpp && <span>КПП: {payerKpp}</span>}
                            </div>
                          </div>
                          <input
                            type="text"
                            value={payerName}
                            onChange={(e) => setPayerName(e.target.value)}
                            placeholder="Наименование юрлица (заполняется по ИНН или вручную)"
                            className="w-full px-2.5 py-1 rounded-lg border border-white/[0.06] bg-zinc-900 text-xs text-white font-medium focus:outline-none focus:border-red-500 placeholder:text-zinc-500"
                          />
                          {payerAddress && (
                            <div className="text-[10px] text-zinc-400 truncate" title={payerAddress}>
                              {payerAddress}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Card: Транспортное средство */}
                      <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-white/[0.07] space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center space-x-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            <span>Транспортное средство</span>
                          </span>
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => setIsOcrScannerOpen(true)}
                              className="inline-flex items-center space-x-1 text-[11px] font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 px-2 py-0.5 rounded-lg transition-all cursor-pointer"
                              title="Распознать СТС или авто"
                            >
                              <Camera className="w-3 h-3" />
                              <span>Сканировать</span>
                            </button>
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
                          onChange={(e) => {
                            const newStatus = e.target.value as OrderStatus;
                            if (newStatus === "issued" && orderStatus !== "issued" && clientPhone.trim()) {
                              handleTriggerVoicyfyCall("csi");
                            }
                            setOrderStatus(newStatus);
                          }}
                          className="w-full px-3 py-1.5 rounded-xl border border-white/[0.08] bg-zinc-950 text-xs text-white font-semibold focus:outline-none cursor-pointer"
                        >
                          <option value="draft">Черновик</option>
                          <option value="lead_ai">Заявка (ИИ Анна)</option>
                          <option value="estimate">Заявка / Оценка</option>
                          <option value="in_progress">В работе</option>
                          <option value="parts_waiting">Ожидание запчастей</option>
                          <option value="ready">Готов к выдаче</option>
                          <option value="issued">Выдан (запуск CSI)</option>
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

                  {/* Benchmark A4 Document Canvas Preview (Exact Photo 1 Replica) */}
                  <div className="p-3 sm:p-6 bg-zinc-200/60 dark:bg-zinc-900/50 rounded-xl overflow-x-auto">
                    <ServiceDocumentPrintSheet
                      order={draftOrderForDoc}
                      docType={selectedDocTypeInEditor}
                      isFacsimile={isEditorFacsimile}
                      isScanMode={isEditorScanMode}
                      sbpQrUrl={udmpayQrUrl}
                    />
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

      {/* OCR SCANNER MODAL (СТС / АВТО / ГОСНОМЕР) */}
      <OcrScannerModal
        isOpen={isOcrScannerOpen}
        onClose={() => setIsOcrScannerOpen(false)}
        onApply={handleApplyOcrData}
      />

      {/* VOICYFY CUSTOM INSTRUCTION MODAL */}
      {voicyfyCustomPromptOpen && (
        <div className="fixed inset-0 z-70 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-rose-400" />
                <h3 className="text-sm font-bold text-white">Поручение для звонка Анне (ИИ)</h3>
              </div>
              <button
                type="button"
                onClick={() => setVoicyfyCustomPromptOpen(false)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-zinc-400">
              Клиент: <span className="text-white font-semibold">{clientName || "Клиент"}</span> ({clientPhone || "без номера"}) • Авто: {vehicleMake} {vehicleModel}
            </p>
            <textarea
              value={voicyfyCustomText}
              onChange={(e) => setVoicyfyCustomText(e.target.value)}
              placeholder="Например: Позвони клиенту и уточни, согласовывает ли он дополнительную замену сайлентблоков переднего рычага за 4200 ₽..."
              rows={4}
              className="w-full p-3 rounded-xl border border-white/10 bg-zinc-950 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-rose-500 resize-none"
            />
            <div className="flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setVoicyfyCustomPromptOpen(false)}
                className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-zinc-300 cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => handleTriggerVoicyfyCall("custom", voicyfyCustomText)}
                disabled={!voicyfyCustomText.trim() || isVoicyfyCalling}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-lg shadow-rose-900/30 cursor-pointer disabled:opacity-50"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Отправить задачу</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UDMPAY / SBP PAYMENT MODAL */}
      {isUdmpayModalOpen && udmpayOrder && (
        <div className="fixed inset-0 z-70 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-zinc-950 border border-white/10 rounded-3xl w-full max-w-md p-6 shadow-2xl flex flex-col items-center text-center space-y-4">
            {/* Header */}
            <div className="w-full flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-600 to-rose-600 text-white flex items-center justify-center shadow-lg shadow-pink-600/30">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <h3 className="text-sm font-bold text-white">Касса СБП / UDMPAY</h3>
                  <p className="text-[10px] text-zinc-400">Быстрая оплата по QR-коду и терминалу</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUdmpayModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Order Brief */}
            <div className="w-full bg-zinc-900/70 p-3 rounded-2xl border border-white/5 text-left text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">{udmpayOrder.orderNumber}</span>
                <span className="font-mono text-zinc-400 text-[11px]">{udmpayOrder.vehicle?.licensePlate}</span>
              </div>
              <div className="text-zinc-300 truncate">
                {udmpayOrder.vehicle?.make} {udmpayOrder.vehicle?.model} • {udmpayOrder.client?.name}
              </div>
            </div>

            {/* Amount Box */}
            <div className="w-full bg-gradient-to-br from-pink-500/10 via-rose-500/5 to-transparent p-4 rounded-2xl border border-pink-500/20 flex flex-col items-center">
              <span className="text-[11px] text-zinc-400 font-medium">Сумма к оплате:</span>
              <div className="text-2xl font-black text-white tracking-tight mt-0.5">
                {formatCurrency(udmpayOrder.grandTotal)}
              </div>
              <button
                type="button"
                onClick={handleCopyAmount}
                className="mt-2 inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-white/10 hover:bg-white/15 text-zinc-200 text-[11px] font-semibold transition-colors cursor-pointer"
              >
                {copySuccess ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copySuccess ? "Скопировано!" : "Скопировать сумму"}</span>
              </button>
            </div>

            {/* QR Code */}
            <div className="p-3 bg-white rounded-2xl shadow-xl flex flex-col items-center">
              {udmpayQrUrl ? (
                <img src={udmpayQrUrl} alt="QR UDMPAY" className="w-44 h-44 object-contain" />
              ) : (
                <div className="w-44 h-44 flex items-center justify-center text-xs text-zinc-500">
                  Генерация QR...
                </div>
              )}
              <div className="text-[11px] font-bold text-zinc-900 mt-1">Оплата через СБП</div>
              <div className="text-[9.5px] text-zinc-500">Наведите камеру смартфона</div>
            </div>

            {/* Actions */}
            <div className="w-full space-y-2 pt-1">
              <button
                type="button"
                onClick={() => window.open("https://modul.udmpay.ru/13115", "_blank")}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-pink-600 via-rose-600 to-red-600 hover:from-pink-500 hover:to-red-500 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-pink-600/30 cursor-pointer transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Открыть терминал UDMPAY</span>
              </button>

              <button
                type="button"
                onClick={handleSendClientPaymentLink}
                className="w-full py-2 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs flex items-center justify-center space-x-2 cursor-pointer transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Отправить ссылку клиенту (WhatsApp)</span>
              </button>

              <button
                type="button"
                onClick={() => handleMarkAsPaidSbp(udmpayOrder)}
                disabled={udmpayOrder.paymentStatus === "paid" || markPaidSuccess}
                className={`w-full py-2 px-4 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                  udmpayOrder.paymentStatus === "paid" || markPaidSuccess
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-700/20"
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{udmpayOrder.paymentStatus === "paid" || markPaidSuccess ? "Заказ оплачен ✓" : "Отметить как Оплачено (СБП)"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* AutoDealer Backup & Sync Modal */}
      {isAutoDealerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-zinc-900 border border-white/10 shadow-2xl p-6 text-white space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Реестр заказ-нарядов АвтоДилер</h3>
                  <p className="text-xs text-zinc-400">Вся история ремонтов, калькуляций и работ автосервиса</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAutoDealerModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Статус заказ-нарядов:</span>
                <span className="font-semibold text-emerald-400 flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>412 реальных заказ-нарядов</span>
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Тестовые данные:</span>
                <span className="font-bold text-zinc-300">Полностью удалены (0 мусорных записей)</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Файл отчета:</span>
                <span className="font-mono text-zinc-300">autodealer_repair_orders_2026-11-17.xlsx</span>
              </div>
            </div>

            <div className="space-y-2.5">
              <a
                href="/backups/autodealer_repair_orders_2026-11-17.xlsx"
                download="autodealer_repair_orders_2026-11-17.xlsx"
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md active:scale-98 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Скачать реестр заказ-нарядов (Excel .xlsx, 65 КБ)</span>
              </a>

              <button
                type="button"
                disabled={isLoadingAutoDealer}
                onClick={handleSyncAutoDealer}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/10 text-white text-xs font-semibold transition-all active:scale-98 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingAutoDealer ? "animate-spin" : ""}`} />
                <span>Синхронизировать / Перезагрузить 412 ЗН</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center space-x-2.5 px-4 py-3 rounded-full bg-emerald-600 text-white shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
