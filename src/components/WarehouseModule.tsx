"use client";

import React, { useState, useEffect } from "react";
import {
  Boxes,
  Search,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Package,
  Layers,
  ArrowUpDown,
  X,
  SlidersHorizontal,
  Edit,
  Trash2,
  FileText,
  FileCheck,
  Building2,
} from "lucide-react";
import { WarehousePart, WarehouseInvoiceItem, WarehouseInvoice } from "@/lib/auto-service-types";
import { getInitialWarehouse, formatCurrency } from "@/lib/auto-service-data";
import { useAuth } from "@/lib/auth-context";

export const WarehouseModule: React.FC = () => {
  const { user } = useAuth();
  const currentUsername = user?.username ? user.username.trim().toLowerCase() : "";
  const storageKey = `geo_ai_warehouse_${currentUsername || "guest"}_v2`;
  const invoicesStorageKey = `geo_ai_warehouse_invoices_${currentUsername || "guest"}_v2`;

  const [parts, setParts] = useState<WarehousePart[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [onlyDeficit, setOnlyDeficit] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Single Item Modal (Create or Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPartId, setEditingPartId] = useState<string | null>(null);
  const [oem, setOem] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Фильтры");
  const [quantity, setQuantity] = useState(1);
  const [minQuantity, setMinQuantity] = useState(1);
  const [unit, setUnit] = useState("шт");
  const [purchasePrice, setPurchasePrice] = useState(0);
  const [salePrice, setSalePrice] = useState(0);
  const [location, setLocation] = useState("Стеллаж А-1");

  // Stock Reception (Invoice) Modal
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceSupplier, setInvoiceSupplier] = useState("Росско (Rossko)");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [invoiceItems, setInvoiceItems] = useState<WarehouseInvoiceItem[]>([
    {
      id: "inv-item-1",
      oem: "",
      name: "",
      category: "Фильтры",
      quantity: 1,
      unit: "шт",
      purchasePrice: 0,
      salePrice: 0,
      location: "Зона приемки",
    },
  ]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadPartsFromStorage = () => {
    if (!currentUsername) {
      setParts([]);
      return;
    }
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setParts(parsed);
          return;
        }
      }
      setParts([]);
      localStorage.setItem(storageKey, JSON.stringify([]));
    } catch {
      setParts([]);
    }
  };

  useEffect(() => {
    loadPartsFromStorage();

    const handleExternalUpdate = () => {
      loadPartsFromStorage();
    };

    window.addEventListener("geo_ai_warehouse_updated", handleExternalUpdate);
    return () => {
      window.removeEventListener("geo_ai_warehouse_updated", handleExternalUpdate);
    };
  }, [currentUsername, storageKey]);

  const saveParts = (list: WarehousePart[]) => {
    setParts(list);
    try {
      localStorage.setItem(storageKey, JSON.stringify(list));
      window.dispatchEvent(new CustomEvent("geo_ai_warehouse_updated"));
    } catch {}
  };

  const handleAdjustQty = (id: string, delta: number) => {
    const updated = parts.map((p) => {
      if (p.id === id) {
        return { ...p, quantity: Math.max(0, p.quantity + delta) };
      }
      return p;
    });
    saveParts(updated);
  };

  const handleOpenCreateModal = () => {
    setEditingPartId(null);
    setOem("");
    setName("");
    setCategory("Фильтры");
    setQuantity(1);
    setMinQuantity(1);
    setUnit("шт");
    setPurchasePrice(0);
    setSalePrice(0);
    setLocation("Стеллаж А-1");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (part: WarehousePart) => {
    setEditingPartId(part.id);
    setOem(part.oem);
    setName(part.name);
    setCategory(part.category);
    setQuantity(part.quantity);
    setMinQuantity(part.minQuantity);
    setUnit(part.unit);
    setPurchasePrice(part.purchasePrice);
    setSalePrice(part.salePrice);
    setLocation(part.location || "Стеллаж А-1");
    setIsModalOpen(true);
  };

  const handleDeletePart = (id: string) => {
    if (!confirm("Удалить позицию со склада?")) return;
    const updated = parts.filter((p) => p.id !== id);
    saveParts(updated);
    showToast("Позиция удалена со склада");
  };

  const handleSavePart = () => {
    if (!name.trim() || !oem.trim()) {
      alert("Укажите артикул OEM и наименование детали");
      return;
    }

    if (editingPartId) {
      // Edit existing
      const updated = parts.map((p) =>
        p.id === editingPartId
          ? {
              ...p,
              oem: oem.trim().toUpperCase(),
              name: name.trim(),
              category,
              quantity: Number(quantity) || 0,
              minQuantity: Number(minQuantity) || 0,
              unit,
              purchasePrice: Number(purchasePrice) || 0,
              salePrice: Number(salePrice) || 0,
              location: location.trim(),
            }
          : p
      );
      saveParts(updated);
      showToast(`Позиция «${oem.trim().toUpperCase()}» сохранена`);
    } else {
      // Create new
      const newPart: WarehousePart = {
        id: `wh-${Date.now()}`,
        oem: oem.trim().toUpperCase(),
        name: name.trim(),
        category,
        quantity: Number(quantity) || 0,
        minQuantity: Number(minQuantity) || 0,
        unit,
        purchasePrice: Number(purchasePrice) || 0,
        salePrice: Number(salePrice) || 0,
        location: location.trim(),
        username: currentUsername,
      };
      saveParts([newPart, ...parts]);
      showToast(`Деталь «${newPart.name}» добавлена на склад`);
    }

    setIsModalOpen(false);
  };

  // Stock Reception (Invoice) logic
  const handleOpenInvoiceModal = () => {
    const randomInvoiceNum = `Н-${Math.floor(10000 + Math.random() * 90000)}`;
    setInvoiceNumber(randomInvoiceNum);
    setInvoiceSupplier("Росско (Rossko)");
    setInvoiceDate(new Date().toISOString().slice(0, 10));
    setInvoiceItems([
      {
        id: `inv-item-${Date.now()}-1`,
        oem: "",
        name: "",
        category: "Фильтры",
        quantity: 1,
        unit: "шт",
        purchasePrice: 0,
        salePrice: 0,
        location: "Зона приемки",
      },
    ]);
    setIsInvoiceModalOpen(true);
  };

  const handleAddInvoiceRow = () => {
    setInvoiceItems([
      ...invoiceItems,
      {
        id: `inv-item-${Date.now()}-${invoiceItems.length + 1}`,
        oem: "",
        name: "",
        category: "Запчасти",
        quantity: 1,
        unit: "шт",
        purchasePrice: 0,
        salePrice: 0,
        location: "Зона приемки",
      },
    ]);
  };

  const handleRemoveInvoiceRow = (index: number) => {
    if (invoiceItems.length === 1) return;
    setInvoiceItems(invoiceItems.filter((_, idx) => idx !== index));
  };

  const handleUpdateInvoiceItem = (index: number, field: keyof WarehouseInvoiceItem, val: any) => {
    const updated = [...invoiceItems];
    updated[index] = { ...updated[index], [field]: val };
    setInvoiceItems(updated);
  };

  const handlePostInvoice = () => {
    if (!invoiceNumber.trim()) {
      alert("Укажите номер накладной");
      return;
    }
    const validItems = invoiceItems.filter((i) => i.oem.trim() && i.name.trim() && i.quantity > 0);
    if (validItems.length === 0) {
      alert("Заполните хотя бы одну позицию (Артикул, Наименование, Количество)");
      return;
    }

    const currentWarehouse = [...parts];
    let totalSum = 0;

    validItems.forEach((invItem) => {
      const cleanOem = invItem.oem.trim().toUpperCase();
      const existingIdx = currentWarehouse.findIndex((p) => p.oem.trim().toUpperCase() === cleanOem);
      totalSum += (invItem.quantity || 1) * (invItem.purchasePrice || 0);

      if (existingIdx >= 0) {
        currentWarehouse[existingIdx].quantity += invItem.quantity;
        currentWarehouse[existingIdx].purchasePrice = invItem.purchasePrice;
        currentWarehouse[existingIdx].salePrice = invItem.salePrice;
        if (invItem.location) currentWarehouse[existingIdx].location = invItem.location;
      } else {
        const newPart: WarehousePart = {
          id: `wh-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          oem: cleanOem,
          name: invItem.name.trim(),
          category: invItem.category || "Запчасти",
          quantity: invItem.quantity,
          minQuantity: 1,
          unit: invItem.unit || "шт",
          purchasePrice: invItem.purchasePrice || 0,
          salePrice: invItem.salePrice || 0,
          location: invItem.location || "Зона приемки",
          username: currentUsername,
        };
        currentWarehouse.unshift(newPart);
      }
    });

    saveParts(currentWarehouse);

    // Save invoice record
    const invoiceRecord: WarehouseInvoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber: invoiceNumber.trim(),
      supplierName: invoiceSupplier,
      date: invoiceDate,
      items: validItems,
      totalAmount: totalSum,
      createdAt: new Date().toISOString(),
      username: currentUsername,
    };

    try {
      const savedInvoices = localStorage.getItem(invoicesStorageKey);
      const prevInvoices = savedInvoices ? JSON.parse(savedInvoices) : [];
      localStorage.setItem(invoicesStorageKey, JSON.stringify([invoiceRecord, ...prevInvoices]));
    } catch {}

    setIsInvoiceModalOpen(false);
    showToast(`Накладная ${invoiceNumber} проведена! Оприходовано ${validItems.length} поз. на ${formatCurrency(totalSum)}`);
  };

  const categories = ["all", "Фильтры", "Тормозная система", "Масла и техжидкости", "Трансмиссия", "Ходовая часть", "Двигатель", "Запчасти"];

  const filtered = parts.filter((p) => {
    if (selectedCategory !== "all" && p.category !== selectedCategory) return false;
    if (onlyDeficit && p.quantity > p.minQuantity) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.oem.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
  });

  const deficitCount = parts.filter((p) => p.quantity <= p.minQuantity).length;
  const totalStockWorth = parts.reduce((sum, p) => sum + p.quantity * p.purchasePrice, 0);

  return (
    <div className="flex-1 flex flex-col h-full bg-transparent overflow-hidden">
      {/* Toast alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center space-x-2.5 px-4 py-3 rounded-full bg-emerald-600 text-white shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="px-6 py-4.5 bg-white/40 dark:bg-black/30 border-b border-black/[0.04] dark:border-white/[0.08] backdrop-blur-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-rose-500/20 to-amber-500/20 border border-white/10 text-rose-500 flex items-center justify-center shrink-0 shadow-lg shadow-rose-500/10">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center space-x-2.5">
              <span>Складской учет</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-200/60 dark:bg-white/[0.06] text-slate-600 dark:text-zinc-400">
                {parts.length} позиций
              </span>
              {deficitCount > 0 && (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center space-x-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Дефицит: {deficitCount}</span>
                </span>
              )}
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={() => setOnlyDeficit(!onlyDeficit)}
            className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer border ${
              onlyDeficit
                ? "bg-rose-500 text-white border-rose-500 shadow-lg shadow-rose-500/20"
                : "bg-white/60 dark:bg-white/[0.06] text-slate-700 dark:text-zinc-300 border-black/[0.05] dark:border-white/[0.08]"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span>Только дефицит ({deficitCount})</span>
          </button>

          <button
            type="button"
            onClick={handleOpenInvoiceModal}
            className="flex items-center space-x-2 px-4 py-2 rounded-full border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>Приходная накладная</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="flex items-center space-x-2 px-5 py-2 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/25 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Оприходовать деталь</span>
          </button>
        </div>
      </div>

      {/* Filter and Categories Bar */}
      <div className="px-6 py-3 border-b border-black/[0.04] dark:border-white/[0.06] bg-white/30 dark:bg-black/20 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCategory(c)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === c
                  ? "bg-rose-600 text-white font-bold shadow-md shadow-rose-600/20"
                  : "bg-white/50 dark:bg-white/[0.04] text-slate-600 dark:text-zinc-400 hover:text-white border border-black/[0.04] dark:border-white/[0.06]"
              }`}
            >
              {c === "all" ? "Все категории" : c}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-3">
          <div className="text-xs font-semibold text-slate-500 dark:text-zinc-400 hidden lg:block">
            Склад: <span className="text-slate-900 dark:text-white font-extrabold">{formatCurrency(totalStockWorth)}</span>
          </div>
          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Поиск по артикулу OEM, названию..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 rounded-full bg-white/60 dark:bg-white/[0.06] border border-black/[0.05] dark:border-white/[0.08] text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden backdrop-blur-md"
            />
          </div>
        </div>
      </div>

      {/* Warehouse Items Table */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="bg-white/70 dark:bg-white/[0.03] rounded-3xl border border-black/[0.05] dark:border-white/[0.08] shadow-2xl backdrop-blur-2xl overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.08] text-slate-500 dark:text-slate-400 font-semibold">
                <th className="py-3 px-4">Артикул OEM</th>
                <th className="py-3 px-4">Наименование детали</th>
                <th className="py-3 px-4">Категория</th>
                <th className="py-3 px-4 text-center">Остаток</th>
                <th className="py-3 px-4 text-center">Мин. ост.</th>
                <th className="py-3 px-4 text-right">Закупка</th>
                <th className="py-3 px-4 text-right">Продажа</th>
                <th className="py-3 px-4">Локация</th>
                <th className="py-3 px-4 text-center">Списание / Приход</th>
                <th className="py-3 px-4 text-center">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <Boxes className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="font-semibold text-slate-600 dark:text-slate-300">Склад пуст</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Оприходуйте первую позицию вручную или проведите приходную накладную от поставщика
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const isDeficit = item.quantity <= item.minQuantity;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                        {item.oem}
                      </td>

                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                        {item.name}
                      </td>

                      <td className="py-3 px-4 text-slate-500">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.05] text-[11px]">
                          {item.category}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            isDeficit
                              ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {item.quantity} {item.unit}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center text-slate-400">
                        {item.minQuantity} {item.unit}
                      </td>

                      <td className="py-3 px-4 text-right font-medium text-slate-500">
                        {formatCurrency(item.purchasePrice)}
                      </td>

                      <td className="py-3 px-4 text-right font-bold text-red-600 dark:text-red-400">
                        {formatCurrency(item.salePrice)}
                      </td>

                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {item.location || "Основной склад"}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => handleAdjustQty(item.id, -1)}
                            className="w-6 h-6 rounded bg-slate-100 dark:bg-white/[0.08] hover:bg-slate-200 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold cursor-pointer"
                            title="Списать 1"
                          >
                            -
                          </button>
                          <button
                            onClick={() => handleAdjustQty(item.id, 1)}
                            className="w-6 h-6 rounded bg-slate-100 dark:bg-white/[0.08] hover:bg-slate-200 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold cursor-pointer"
                            title="Оприходовать 1"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                            title="Редактировать позицию"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePart(item.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Удалить со склада"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* Single Item Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#0e141e] border border-slate-200 dark:border-white/[0.1] rounded-2xl shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/[0.08] pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                <Boxes className="w-4 h-4 text-red-500" />
                <span>{editingPartId ? "Редактирование позиции склада" : "Оприходование детали на склад"}</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-500 font-semibold">Артикул OEM *</label>
                <input
                  type="text"
                  value={oem}
                  onChange={(e) => setOem(e.target.value.toUpperCase())}
                  placeholder="Например: 2108-1006040"
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-slate-500 font-semibold">Категория</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                >
                  <option value="Фильтры">Фильтры</option>
                  <option value="Тормозная система">Тормозная система</option>
                  <option value="Масла и техжидкости">Масла и техжидкости</option>
                  <option value="Трансмиссия">Трансмиссия</option>
                  <option value="Ходовая часть">Ходовая часть</option>
                  <option value="Двигатель">Двигатель</option>
                  <option value="Запчасти">Запчасти общего назначения</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-slate-500 font-semibold">Наименование детали *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Полное название детали"
                className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-slate-500 font-semibold">Количество</label>
                <input
                  type="number"
                  min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-bold"
                />
              </div>

              <div>
                <label className="text-slate-500 font-semibold">Мин. остаток</label>
                <input
                  type="number"
                  min="0"
                  value={minQuantity}
                  onChange={(e) => setMinQuantity(Number(e.target.value))}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="text-slate-500 font-semibold">Ед. изм.</label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-500 font-semibold">Закупка (Опт, ₽)</label>
                <input
                  type="number"
                  min="0"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(Number(e.target.value))}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="text-slate-500 font-semibold">Продажа клиенту (₽)</label>
                <input
                  type="number"
                  min="0"
                  value={salePrice}
                  onChange={(e) => setSalePrice(Number(e.target.value))}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-bold text-red-600 dark:text-red-400"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-500 font-semibold">Складская ячейка / Локация</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Стеллаж Б-3, полка 2"
                className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleSavePart}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold cursor-pointer shadow-sm"
              >
                {editingPartId ? "Сохранить изменения" : "Оприходовать"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Reception (Приходная накладная) Modal */}
      {isInvoiceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-white dark:bg-[#0e141e] border border-slate-200 dark:border-white/[0.1] rounded-2xl shadow-2xl p-6 space-y-4 text-xs max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/[0.08] pb-3 shrink-0">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                <FileCheck className="w-4 h-4 text-red-500" />
                <span>Приходная накладная от поставщика (Поступление на склад)</span>
              </h3>
              <button onClick={() => setIsInvoiceModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Invoice Top Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
              <div>
                <label className="text-slate-500 font-semibold">Поставщик / Контрагент *</label>
                <select
                  value={invoiceSupplier}
                  onChange={(e) => setInvoiceSupplier(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold"
                >
                  <option value="Росско (Rossko)">Росско (Rossko)</option>
                  <option value="Армтек (Armtek)">Армтек (Armtek)</option>
                  <option value="Автодок (Autodoc)">Автодок (Autodoc)</option>
                  <option value="Берг Холдинг">Берг Холдинг</option>
                  <option value="Форум-Авто">Форум-Авто</option>
                  <option value="Собственная закупка">Собственная закупка / Иной поставщик</option>
                </select>
              </div>

              <div>
                <label className="text-slate-500 font-semibold">Номер накладной (УПД) *</label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="Н-10492"
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-slate-500 font-semibold">Дата накладной *</label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>
            </div>

            {/* Table of items */}
            <div className="flex-1 overflow-y-auto border border-slate-200 dark:border-white/[0.08] rounded-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.08] text-slate-500 font-semibold sticky top-0">
                    <th className="py-2.5 px-3">Артикул OEM *</th>
                    <th className="py-2.5 px-3">Наименование *</th>
                    <th className="py-2.5 px-3 w-20 text-center">Кол-во</th>
                    <th className="py-2.5 px-3 w-24 text-right">Закупка (₽)</th>
                    <th className="py-2.5 px-3 w-24 text-right">Продажа (₽)</th>
                    <th className="py-2.5 px-3 w-24 text-right">Сумма (₽)</th>
                    <th className="py-2.5 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                  {invoiceItems.map((item, idx) => {
                    const rowSum = (Number(item.quantity) || 0) * (Number(item.purchasePrice) || 0);

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01]">
                        <td className="p-2">
                          <input
                            type="text"
                            value={item.oem}
                            onChange={(e) => handleUpdateInvoiceItem(idx, "oem", e.target.value.toUpperCase())}
                            placeholder="OEM"
                            className="w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 font-mono font-bold text-xs"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleUpdateInvoiceItem(idx, "name", e.target.value)}
                            placeholder="Наименование запчасти"
                            className="w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-xs"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleUpdateInvoiceItem(idx, "quantity", Number(e.target.value))}
                            className="w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-center font-bold text-xs"
                          />
                        </td>
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            min="0"
                            value={item.purchasePrice}
                            onChange={(e) => handleUpdateInvoiceItem(idx, "purchasePrice", Number(e.target.value))}
                            className="w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-right text-xs"
                          />
                        </td>
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            min="0"
                            value={item.salePrice}
                            onChange={(e) => handleUpdateInvoiceItem(idx, "salePrice", Number(e.target.value))}
                            className="w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-right font-bold text-red-600 dark:text-red-400 text-xs"
                          />
                        </td>
                        <td className="p-2 text-right font-mono font-semibold text-slate-900 dark:text-slate-100">
                          {formatCurrency(rowSum)}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveInvoiceRow(idx)}
                            className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                            title="Удалить строку"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer row: Add item button & total sum */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-200 dark:border-white/[0.08] shrink-0">
              <button
                type="button"
                onClick={handleAddInvoiceRow}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/[0.1] hover:bg-slate-100 dark:hover:bg-white/[0.05] text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Добавить строку в накладную</span>
              </button>

              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <span className="text-slate-400 text-[11px]">ИТОГО ПО НАКЛАДНОЙ:</span>
                  <div className="text-base font-extrabold text-slate-900 dark:text-white">
                    {formatCurrency(
                      invoiceItems.reduce(
                        (sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.purchasePrice) || 0),
                        0
                      )
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsInvoiceModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    onClick={handlePostInvoice}
                    className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold cursor-pointer shadow-md flex items-center space-x-1.5"
                  >
                    <FileCheck className="w-4 h-4" />
                    <span>Провести накладную</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
