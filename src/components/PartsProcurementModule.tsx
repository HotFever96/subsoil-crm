"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Sparkles,
  Zap,
  Award,
  DollarSign,
  Clock,
  CheckCircle2,
  Copy,
  Check,
  Eye,
  EyeOff,
  Settings,
  Plus,
  Package,
  Layers,
  Percent,
  Sliders,
  Filter,
  ArrowUpDown,
  Car,
  AlertCircle,
  Truck,
  Building2,
  Mic,
  MicOff,
  X,
  RefreshCw,
} from "lucide-react";
import {
  PartSearchResult,
  PartsSearchResponse,
  SupplierIntegrationConfig,
  PartQualityTier,
} from "@/lib/parts-procurement-types";
import { DEFAULT_SUPPLIER_INTEGRATIONS } from "@/lib/parts-procurement-data";
import { SupplierSettingsModal } from "./SupplierSettingsModal";
import { RepairOrder, WarehousePart } from "@/lib/auto-service-types";
import { getInitialOrders, formatCurrency, calculateOrderTotals } from "@/lib/auto-service-data";
import { useAuth } from "@/lib/auth-context";

interface PartsProcurementModuleProps {
  initialQuery?: string;
  initialVehicle?: { make?: string; model?: string; vin?: string };
  onAddPartToOrder?: (part: PartSearchResult, targetOrderNumber?: string) => void;
  isEmbedded?: boolean;
}

export const PartsProcurementModule: React.FC<PartsProcurementModuleProps> = ({
  initialQuery = "",
  initialVehicle,
  onAddPartToOrder,
  isEmbedded = false,
}) => {
  const { user } = useAuth();
  const currentUsername = user?.username ? user.username.trim().toLowerCase() : "admin";
  const ordersStorageKey = `geo_ai_repair_orders_${currentUsername || "guest"}_v2`;
  const warehouseStorageKey = `geo_ai_warehouse_${currentUsername || "guest"}_v2`;

  // Search input state
  const [query, setQuery] = useState(initialQuery || (initialVehicle?.make ? `${initialVehicle.make} ${initialVehicle.model || ""}` : ""));
  const [isLoading, setIsLoading] = useState(false);
  const [searchResponse, setSearchResponse] = useState<PartsSearchResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Voice Speech-to-Text
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Pricing & Client presentation mode
  const [markupPercent, setMarkupPercent] = useState<number>(30);
  const [isClientScreenMode, setIsClientScreenMode] = useState<boolean>(false);

  // Filters & Sorting
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [onlyInStock, setOnlyInStock] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<"delivery" | "price_asc" | "price_desc" | "rating">("delivery");

  // Supplier Settings Modal
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [supplierConfigs, setSupplierConfigs] = useState<SupplierIntegrationConfig[]>(DEFAULT_SUPPLIER_INTEGRATIONS);

  // Order selection modal
  const [selectedPartForOrder, setSelectedPartForOrder] = useState<PartSearchResult | null>(null);
  const [isOrderSelectModalOpen, setIsOrderSelectModalOpen] = useState(false);
  const [repairOrders, setRepairOrders] = useState<RepairOrder[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedOem, setCopiedOem] = useState<string | null>(null);

  // Load supplier configs and orders on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const savedConfigs = localStorage.getItem(`geo_ai_suppliers_${currentUsername}`);
        if (savedConfigs) {
          const parsed = JSON.parse(savedConfigs);
          if (Array.isArray(parsed) && parsed.length > 0) setSupplierConfigs(parsed);
        }
      } catch {}

      try {
        const savedOrders = localStorage.getItem(ordersStorageKey);
        if (savedOrders) {
          const parsed = JSON.parse(savedOrders);
          if (Array.isArray(parsed)) setRepairOrders(parsed);
        } else {
          setRepairOrders(getInitialOrders(currentUsername));
        }
      } catch {}
    }

    if (currentUsername) {
      fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_supplier_integrations", username: currentUsername }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.success && Array.isArray(data.integrations) && data.integrations.length > 0) {
            setSupplierConfigs(data.integrations);
          }
        })
        .catch(() => {});
    }

    // Auto-search initial query if provided
    if (initialQuery || initialVehicle?.make) {
      performSearch(initialQuery || `${initialVehicle?.make || ""} ${initialVehicle?.model || ""}`);
    }
  }, [currentUsername]);

  const handleOrderToWarehouse = (part: PartSearchResult) => {
    try {
      const savedWarehouse = localStorage.getItem(warehouseStorageKey);
      let items: WarehousePart[] = [];
      if (savedWarehouse) {
        items = JSON.parse(savedWarehouse);
      }
      const existingIndex = items.findIndex((i) => i.oem.trim().toLowerCase() === part.oem.trim().toLowerCase());
      if (existingIndex >= 0) {
        items[existingIndex].quantity += 1;
        items[existingIndex].purchasePrice = part.purchasePrice;
        items[existingIndex].salePrice = part.salePrice;
      } else {
        const newItem: WarehousePart = {
          id: `wh-${Date.now()}`,
          oem: part.oem.trim().toUpperCase(),
          name: `${part.brand} ${part.name}`.trim(),
          category: "Запчасти",
          quantity: 1,
          minQuantity: 1,
          unit: "шт",
          purchasePrice: part.purchasePrice,
          salePrice: part.salePrice,
          location: "Зона приемки (A-0)",
          username: currentUsername,
        };
        items.push(newItem);
      }
      localStorage.setItem(warehouseStorageKey, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent("geo_ai_warehouse_updated"));
      showToast(`«${part.brand} ${part.oem}» заказана и добавлена на Склад (+1 шт.)!`);
    } catch (err) {
      console.error(err);
    }
  };

  const performSearch = async (searchStr?: string) => {
    const q = (searchStr !== undefined ? searchStr : query).trim();
    if (!q) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/parts-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: q,
          vehicleVin: initialVehicle?.vin,
          vehicleMake: initialVehicle?.make,
          vehicleModel: initialVehicle?.model,
          markupPercent,
          username: currentUsername,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Не удалось выполнить проценку");
      }
      setSearchResponse(data);
    } catch (err: any) {
      setErrorMsg(err.message || "Ошибка подключения к шлюзу поставщиков");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyOem = (oem: string) => {
    navigator.clipboard?.writeText(oem);
    setCopiedOem(oem);
    setTimeout(() => setCopiedOem(null), 2000);
  };

  // Voice search toggle
  const toggleVoiceInput = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Голосовой ввод не поддерживается вашим браузером");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const rec = new SpeechRecognition();
    rec.lang = "ru-RU";
    rec.continuous = false;
    rec.interimResults = false;

    rec.onresult = (e: any) => {
      const spokenText = e.results[0][0].transcript;
      setQuery(spokenText);
      setIsListening(false);
      performSearch(spokenText);
    };

    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);

    recognitionRef.current = rec;
    rec.start();
    setIsListening(true);
  };

  // Add part to repair order handler
  const handleOpenAddPartModal = (part: PartSearchResult) => {
    if (onAddPartToOrder) {
      onAddPartToOrder(part);
      showToast(`«${part.brand} ${part.oem}» добавлена в Заказ-наряд!`);
      return;
    }
    setSelectedPartForOrder(part);
    setIsOrderSelectModalOpen(true);
  };

  const handleConfirmAddToOrder = (targetOrder: RepairOrder) => {
    if (!selectedPartForOrder) return;

    const newPartItem = {
      id: `p-${Date.now()}`,
      oem: selectedPartForOrder.oem,
      name: `${selectedPartForOrder.brand} - ${selectedPartForOrder.name}`,
      qty: 1,
      unit: "шт",
      purchasePrice: selectedPartForOrder.purchasePrice,
      salePrice: selectedPartForOrder.salePrice,
      total: selectedPartForOrder.salePrice,
    };

    const currentParts = targetOrder.parts || [];
    const updatedParts = [...currentParts, newPartItem];
    const totals = calculateOrderTotals(targetOrder.works || [], updatedParts);

    const updatedOrder: RepairOrder = {
      ...targetOrder,
      parts: updatedParts,
      totalParts: totals.totalParts,
      grandTotal: totals.grandTotal,
    };

    const updatedOrdersList = repairOrders.map((o) => (o.id === targetOrder.id ? updatedOrder : o));
    setRepairOrders(updatedOrdersList);

    try {
      localStorage.setItem(ordersStorageKey, JSON.stringify(updatedOrdersList));
      window.dispatchEvent(new CustomEvent("geo_ai_repair_orders_updated"));
    } catch {}

    // Cloud sync
    fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add_part_to_repair_order",
        username: currentUsername,
        payload: {
          orderId: targetOrder.id,
          orderNumber: targetOrder.orderNumber,
          part: {
            oem: selectedPartForOrder.oem,
            name: selectedPartForOrder.name,
            qty: 1,
            unit: "шт",
            purchasePrice: selectedPartForOrder.purchasePrice,
            salePrice: selectedPartForOrder.salePrice,
            supplierName: selectedPartForOrder.supplierName,
          },
        },
      }),
    }).catch(() => {});

    setIsOrderSelectModalOpen(false);
    setSelectedPartForOrder(null);
    showToast(`Деталь добавлена в ${targetOrder.orderNumber} (${targetOrder.vehicle.licensePlate})!`);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filtered and sorted results
  const rawResults = searchResponse?.results || [];

  const filteredResults = rawResults.filter((item) => {
    if (supplierFilter !== "all" && item.supplierId !== supplierFilter) return false;
    if (typeFilter !== "all" && item.type !== typeFilter) return false;
    if (onlyInStock && item.stockQty <= 0) return false;
    return true;
  });

  const sortedResults = [...filteredResults].sort((a, b) => {
    if (sortBy === "delivery") return a.deliveryHours - b.deliveryHours;
    if (sortBy === "price_asc") return a.salePrice - b.salePrice;
    if (sortBy === "price_desc") return b.salePrice - a.salePrice;
    if (sortBy === "rating") return (b.rating || 0) - (a.rating || 0);
    return 0;
  });

  const recommendations = searchResponse?.recommendations;

  return (
    <div className={`flex flex-col h-full overflow-hidden ${isEmbedded ? "p-4" : "p-6"} space-y-5 bg-white dark:bg-[#0c1015]`}>
      {/* Toast alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center space-x-2.5 px-4 py-3 rounded-2xl bg-emerald-600 text-white shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header bar (when full page) */}
      {!isEmbedded && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Проценка автозапчастей
                </h1>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Мульти-поиск по артикулу (OEM), VIN и кросс-кодам с расчетом себестоимости и наценки
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/[0.08] hover:bg-slate-100 dark:hover:bg-white/[0.04] text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              <span>Шлюзы API поставщиков</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Search Controls */}
      <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-[#131821] border border-slate-200/90 dark:border-white/[0.08] space-y-3.5 shadow-2xs">
        {/* Search input with Speech-to-Text and Submit */}
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && performSearch()}
              placeholder="Введите артикул OEM (например, 2108-1006040 или OC90), VIN или название детали..."
              className="w-full pl-10 pr-24 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-12 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={toggleVoiceInput}
              className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors cursor-pointer ${
                isListening ? "bg-red-500 text-white animate-pulse" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              }`}
              title="Голосовой ввод запроса (ru-RU)"
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>

          <button
            type="button"
            disabled={isLoading || !query.trim()}
            onClick={() => performSearch()}
            className="px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-bold flex items-center space-x-2 transition-all shadow-xs shrink-0 cursor-pointer"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Идет проценка...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Найти запчасти</span>
              </>
            )}
          </button>
        </div>

        {/* Margin Controls and Client Screen Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-200/60 dark:border-white/[0.06]">
          {/* Markup selector */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center space-x-1">
              <Percent className="w-3.5 h-3.5 text-red-500" />
              <span>Наценка СТО:</span>
            </span>
            <div className="flex items-center space-x-1">
              {[20, 30, 40, 50].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => {
                    setMarkupPercent(pct);
                    if (searchResponse) performSearch();
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    markupPercent === pct
                      ? "bg-red-500 text-white shadow-xs"
                      : "bg-white dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 border border-slate-200 dark:border-white/[0.06]"
                  }`}
                >
                  +{pct}%
                </button>
              ))}
            </div>
          </div>

          {/* Client Screen Mode Toggle (Hides wholesale price!) */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setIsClientScreenMode((prev) => !prev)}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                isClientScreenMode
                  ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-700 dark:text-emerald-300"
                  : "bg-white dark:bg-white/[0.04] border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 hover:border-slate-300"
              }`}
              title="Режим экрана клиента: скрывает оптовую себестоимость и маржу, оставляя только розничные цены"
            >
              {isClientScreenMode ? (
                <>
                  <EyeOff className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Экран для клиента (Закупка скрыта)</span>
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 text-slate-400" />
                  <span>Показать клиенту (Скрыть закупку)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Error state */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto space-y-5 pr-1">
        {/* 3 AI Recommendation Cards */}
        {recommendations && (recommendations.fastest || recommendations.bestValue || recommendations.maxMargin) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                ⭐ Умные ИИ-рекомендации Чайка-Сервис
              </span>
              {searchResponse?.detectedPart && (
                <span className="text-xs text-slate-500 font-medium">
                  {searchResponse.detectedPart.vehicle} • OEM: <strong className="font-mono text-slate-700 dark:text-slate-200">{searchResponse.detectedPart.oem}</strong>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {/* 1. Fastest */}
              {recommendations.fastest && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 flex flex-col justify-between shadow-2xs relative">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold text-[10px]">
                        <Zap className="w-3 h-3 text-amber-500" />
                        <span>БЫСТРЕЕ ВСЕГО</span>
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">
                        {recommendations.fastest.supplierName}
                      </span>
                    </div>

                    <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                      {recommendations.fastest.brand} {recommendations.fastest.oem}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {recommendations.fastest.name}
                    </div>

                    <div className="mt-3 flex items-center space-x-2 text-xs">
                      <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="font-semibold text-amber-600 dark:text-amber-400">
                        {recommendations.fastest.deliveryLabel} ({recommendations.fastest.stockQty} шт.)
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-amber-500/20 flex items-center justify-between">
                    <div>
                      {!isClientScreenMode && (
                        <div className="text-[10px] text-slate-400">
                          Опт: {formatCurrency(recommendations.fastest.purchasePrice)}
                        </div>
                      )}
                      <div className="text-base font-extrabold text-slate-900 dark:text-white">
                        {formatCurrency(recommendations.fastest.salePrice)}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => handleOrderToWarehouse(recommendations.fastest!)}
                        className="p-1.5 rounded-xl border border-amber-500/30 hover:bg-amber-500/10 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                        title="Заказать на склад"
                      >
                        <Package className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenAddPartModal(recommendations.fastest!)}
                        className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center space-x-1 transition-colors cursor-pointer shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>В заказ</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Top Price / Quality */}
              {recommendations.bestValue && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent border border-red-500/30 flex flex-col justify-between shadow-2xs relative ring-2 ring-red-500/10">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-700 dark:text-red-300 font-bold text-[10px]">
                        <Award className="w-3 h-3 text-red-500" />
                        <span>ТОП ЦЕНА / КАЧЕСТВО</span>
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">
                        {recommendations.bestValue.supplierName}
                      </span>
                    </div>

                    <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                      {recommendations.bestValue.brand} {recommendations.bestValue.oem}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {recommendations.bestValue.name}
                    </div>

                    <div className="mt-3 flex items-center space-x-2 text-xs">
                      <Clock className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {recommendations.bestValue.deliveryLabel} ({recommendations.bestValue.stockQty} шт.)
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-red-500/20 flex items-center justify-between">
                    <div>
                      {!isClientScreenMode && (
                        <div className="text-[10px] text-slate-400">
                          Опт: {formatCurrency(recommendations.bestValue.purchasePrice)}
                        </div>
                      )}
                      <div className="text-base font-extrabold text-red-600 dark:text-red-400">
                        {formatCurrency(recommendations.bestValue.salePrice)}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => handleOrderToWarehouse(recommendations.bestValue!)}
                        className="p-1.5 rounded-xl border border-red-500/30 hover:bg-red-500/10 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                        title="Заказать на склад"
                      >
                        <Package className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenAddPartModal(recommendations.bestValue!)}
                        className="px-3 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-xs flex items-center space-x-1 transition-colors cursor-pointer shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>В заказ</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Max Margin / Economy */}
              {recommendations.maxMargin && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/30 flex flex-col justify-between shadow-2xs relative">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">
                        <DollarSign className="w-3 h-3 text-emerald-500" />
                        <span>МАКСИМУМ МАРЖИ</span>
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">
                        {recommendations.maxMargin.supplierName}
                      </span>
                    </div>

                    <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                      {recommendations.maxMargin.brand} {recommendations.maxMargin.oem}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {recommendations.maxMargin.name}
                    </div>

                    <div className="mt-3 flex items-center space-x-2 text-xs">
                      <Clock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {recommendations.maxMargin.deliveryLabel} ({recommendations.maxMargin.stockQty} шт.)
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-emerald-500/20 flex items-center justify-between">
                    <div>
                      {!isClientScreenMode && (
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                          Маржа: +{formatCurrency(recommendations.maxMargin.marginAmount)}
                        </div>
                      )}
                      <div className="text-base font-extrabold text-slate-900 dark:text-white">
                        {formatCurrency(recommendations.maxMargin.salePrice)}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => handleOrderToWarehouse(recommendations.maxMargin!)}
                        className="p-1.5 rounded-xl border border-emerald-500/30 hover:bg-emerald-500/10 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                        title="Заказать на склад"
                      >
                        <Package className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenAddPartModal(recommendations.maxMargin!)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center space-x-1 transition-colors cursor-pointer shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>В заказ</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Results Table Section */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Все предложения поставщиков ({sortedResults.length})
              </span>

              {/* Stock only filter */}
              <label className="flex items-center space-x-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={onlyInStock}
                  onChange={(e) => setOnlyInStock(e.target.checked)}
                  className="rounded border-slate-300 text-red-500 focus:ring-red-400"
                />
                <span>Только в наличии</span>
              </label>
            </div>

            {/* Filter pills: Supplier & Type */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                <option value="all">Все поставщики</option>
                <option value="warehouse">Свой склад (СТО)</option>
                <option value="rossko">Росско (Rossko)</option>
                <option value="armtek">Армтек (Armtek)</option>
                <option value="autodoc">Автодок (Autodoc)</option>
                <option value="berg">Берг Холдинг</option>
                <option value="forum_auto">Форум-Авто</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                <option value="all">Любой тип</option>
                <option value="original">Оригинал (OEM)</option>
                <option value="cross_premium">Премиум-аналоги</option>
                <option value="cross_economy">Бюджетные аналоги</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                <option value="delivery">Сортировка: Быстрая доставка</option>
                <option value="price_asc">Сортировка: Сначала дешевле</option>
                <option value="price_desc">Сортировка: Сначала дороже</option>
                <option value="rating">Сортировка: По рейтингу бренда</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="border border-slate-200 dark:border-white/[0.08] rounded-2xl overflow-hidden bg-white dark:bg-[#131821] shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06] text-slate-500 font-semibold">
                    <th className="py-3 px-4">Поставщик</th>
                    <th className="py-3 px-4">Бренд & Артикул</th>
                    <th className="py-3 px-4">Наименование детали</th>
                    <th className="py-3 px-4">Тип детали</th>
                    <th className="py-3 px-4 text-center">Вероятность</th>
                    <th className="py-3 px-4 text-center">Остаток</th>
                    <th className="py-3 px-4">Срок доставки</th>
                    {!isClientScreenMode && <th className="py-3 px-4 text-right">Закупка (Опт)</th>}
                    <th className="py-3 px-4 text-right">Клиенту (Розница)</th>
                    {!isClientScreenMode && <th className="py-3 px-4 text-right">Маржа</th>}
                    <th className="py-3 px-4 text-center">Действие</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                  {sortedResults.length === 0 ? (
                    <tr>
                      <td colSpan={isClientScreenMode ? 9 : 11} className="py-12 text-center text-slate-400">
                        Позиций по заданным фильтрам не найдено
                      </td>
                    </tr>
                  ) : (
                    sortedResults.map((item) => {
                      const isWarehouse = item.supplierId === "warehouse";
                      const isCopied = copiedOem === item.oem;

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors ${
                            isWarehouse ? "bg-emerald-500/[0.02]" : ""
                          }`}
                        >
                          {/* Supplier badge */}
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                                isWarehouse
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                  : item.supplierBadgeColor === "red"
                                  ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                                  : item.supplierBadgeColor === "purple"
                                  ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                                  : item.supplierBadgeColor === "blue"
                                  ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20"
                                  : "bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300"
                              }`}
                            >
                              {isWarehouse ? <Package className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                              <span>{item.supplierName}</span>
                            </span>
                          </td>

                          {/* Brand & OEM */}
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                              <span>{item.brand}</span>
                            </div>
                            <div className="flex items-center space-x-1 mt-0.5">
                              <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 select-all">
                                {item.oem}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyOem(item.oem)}
                                className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                                title="Скопировать артикул"
                              >
                                {isCopied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                          </td>

                          {/* Part Name */}
                          <td className="py-3 px-4 max-w-xs truncate text-slate-700 dark:text-slate-300 font-medium">
                            {item.name}
                            {item.warehouseLocation && (
                              <div className="text-[10px] text-emerald-600 font-normal">
                                📍 {item.warehouseLocation}
                              </div>
                            )}
                          </td>

                          {/* Quality Tier */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                                item.type === "original"
                                  ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                                  : item.type === "cross_premium"
                                  ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                                  : "bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400"
                              }`}
                            >
                              {item.typeLabel}
                            </span>
                          </td>

                          {/* Delivery probability */}
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center space-x-1.5">
                              <div className="w-10 h-1.5 rounded-full bg-slate-200 dark:bg-white/[0.1] overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500 rounded-full"
                                  style={{ width: `${item.deliveryProbability}%` }}
                                />
                              </div>
                              <span className="font-semibold text-[11px] text-slate-600 dark:text-slate-400">
                                {item.deliveryProbability}%
                              </span>
                            </div>
                          </td>

                          {/* Stock Qty */}
                          <td className="py-3 px-4 text-center font-bold text-slate-900 dark:text-slate-100">
                            {item.stockQty > 0 ? (
                              <span>{item.stockQty} шт.</span>
                            ) : (
                              <span className="text-slate-400 font-normal">Под заказ</span>
                            )}
                          </td>

                          {/* Delivery timeline */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div
                              className={`flex items-center space-x-1 font-semibold ${
                                item.deliveryHours === 0
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : item.deliveryHours <= 4
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-slate-600 dark:text-slate-300"
                              }`}
                            >
                              <Truck className="w-3.5 h-3.5 shrink-0" />
                              <span>{item.deliveryLabel}</span>
                            </div>
                          </td>

                          {/* Wholesale Purchase Price (Hidden in Client mode) */}
                          {!isClientScreenMode && (
                            <td className="py-3 px-4 text-right font-medium text-slate-600 dark:text-slate-400">
                              {formatCurrency(item.purchasePrice)}
                            </td>
                          )}

                          {/* Retail Price for Client */}
                          <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white text-sm">
                            {formatCurrency(item.salePrice)}
                          </td>

                          {/* Margin */}
                          {!isClientScreenMode && (
                            <td className="py-3 px-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                              +{formatCurrency(item.marginAmount)}
                            </td>
                          )}

                          {/* Action Button: Add to Order / Stock */}
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center space-x-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenAddPartModal(item)}
                                className="px-2.5 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold text-xs flex items-center space-x-1 transition-colors cursor-pointer shadow-2xs"
                                title="Добавить запчасть в Заказ-наряд"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>В Заказ</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOrderToWarehouse(item)}
                                className="px-2 py-1.5 rounded-lg border border-slate-300 dark:border-white/[0.1] hover:bg-slate-100 dark:hover:bg-white/[0.05] text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center space-x-1 transition-colors cursor-pointer"
                                title="Заказать на склад СТО"
                              >
                                <Package className="w-3.5 h-3.5 text-slate-400" />
                                <span>Склад</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Select Repair Order */}
      {isOrderSelectModalOpen && selectedPartForOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-[#131821] border border-slate-200 dark:border-white/[0.1] shadow-2xl p-6 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/[0.08]">
              <div className="flex items-center space-x-2">
                <Package className="w-5 h-5 text-red-500" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Добавление детали в Заказ-наряд
                </h3>
              </div>
              <button
                onClick={() => setIsOrderSelectModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selected item overview */}
            <div className="my-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] text-xs space-y-1">
              <div className="font-bold text-slate-900 dark:text-white">
                {selectedPartForOrder.brand} {selectedPartForOrder.oem} — {selectedPartForOrder.name}
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span>Поставщик: {selectedPartForOrder.supplierName}</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  {formatCurrency(selectedPartForOrder.salePrice)}
                </span>
              </div>
            </div>

            <div className="text-xs font-semibold text-slate-500 mb-2">
              Выберите активный заказ-наряд клиента:
            </div>

            {/* List of open repair orders */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {repairOrders.filter((o) => o.status !== "closed").length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Нет открытых заказ-нарядов. Создайте заказ-наряд в разделе «Заказ-наряды».
                </div>
              ) : (
                repairOrders
                  .filter((o) => o.status !== "closed")
                  .map((ord) => (
                    <button
                      key={ord.id}
                      type="button"
                      onClick={() => handleConfirmAddToOrder(ord)}
                      className="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-white/[0.08] hover:border-red-500/50 hover:bg-red-500/[0.03] transition-all cursor-pointer flex items-center justify-between group"
                    >
                      <div>
                        <div className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-red-500 transition-colors">
                          {ord.orderNumber} • {ord.vehicle.make} {ord.vehicle.model} ({ord.vehicle.licensePlate})
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Клиент: {ord.client.name} • Текущая сумма: {formatCurrency(ord.grandTotal)}
                        </div>
                      </div>

                      <div className="p-1 rounded-lg bg-slate-100 dark:bg-white/[0.06] group-hover:bg-red-500 group-hover:text-white text-slate-500 transition-all">
                        <Plus className="w-4 h-4" />
                      </div>
                    </button>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Supplier Settings */}
      <SupplierSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        integrations={supplierConfigs}
        onSave={(updated) => {
          setSupplierConfigs(updated);
          try {
            localStorage.setItem(`geo_ai_suppliers_${currentUsername}`, JSON.stringify(updated));
          } catch {}
          showToast("Настройки шлюзов поставщиков обновлены!");
        }}
      />
    </div>
  );
};
