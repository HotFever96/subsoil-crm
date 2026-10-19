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
} from "lucide-react";
import { WarehousePart } from "@/lib/auto-service-types";
import { getInitialWarehouse, formatCurrency } from "@/lib/auto-service-data";
import { useAuth } from "@/lib/auth-context";

export const WarehouseModule: React.FC = () => {
  const { user } = useAuth();
  const currentUsername = user?.username ? user.username.trim().toLowerCase() : "";
  const storageKey = `geo_ai_warehouse_${currentUsername || "guest"}_v1`;

  const [parts, setParts] = useState<WarehousePart[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [onlyDeficit, setOnlyDeficit] = useState(false);

  // New Part Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [oem, setOem] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Фильтры");
  const [quantity, setQuantity] = useState(10);
  const [minQuantity, setMinQuantity] = useState(3);
  const [unit, setUnit] = useState("шт");
  const [purchasePrice, setPurchasePrice] = useState(500);
  const [salePrice, setSalePrice] = useState(850);
  const [location, setLocation] = useState("Стеллаж А-1");

  useEffect(() => {
    if (!currentUsername) {
      setParts([]);
      return;
    }

    let loaded = getInitialWarehouse(currentUsername);
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
    } catch {}
    setParts(loaded);
  }, [currentUsername, storageKey]);

  const saveParts = (list: WarehousePart[]) => {
    setParts(list);
    try {
      localStorage.setItem(storageKey, JSON.stringify(list));
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

  const handleCreatePart = () => {
    if (!name.trim() || !oem.trim()) {
      alert("Укажите артикул OEM и наименование детали");
      return;
    }

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
    setIsModalOpen(false);
    setOem("");
    setName("");
  };

  const categories = ["all", "Фильтры", "Тормозная система", "Масла и техжидкости", "Трансмиссия", "Ходовая часть", "Двигатель"];

  const filtered = parts.filter((p) => {
    if (selectedCategory !== "all" && p.category !== selectedCategory) return false;
    if (onlyDeficit && p.quantity > p.minQuantity) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.oem.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
  });

  const deficitCount = parts.filter((p) => p.quantity <= p.minQuantity).length;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] dark:bg-[#090d12] overflow-hidden">
      {/* Top Header */}
      <div className="px-6 py-4.5 border-b border-slate-200 dark:border-white/[0.08] bg-white/70 dark:bg-[#0c121a]/80 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/25 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
              <span>Склад и Запчасти</span>
              <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
                {parts.length} позиций
              </span>
              {deficitCount > 0 && (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center space-x-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Дефицит: {deficitCount}</span>
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Учет остатков, неснижаемый минимум и списание при закрытии заказ-нарядов ({currentUsername})
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => setOnlyDeficit(!onlyDeficit)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer border ${
              onlyDeficit
                ? "bg-rose-500 text-white border-rose-500 shadow-sm"
                : "bg-white dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/[0.08]"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span>Только дефицит ({deficitCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Оприходовать деталь</span>
          </button>
        </div>
      </div>

      {/* Filter and Categories Bar */}
      <div className="px-6 py-3 border-b border-slate-200 dark:border-white/[0.06] bg-slate-50/50 dark:bg-[#0c121a]/40 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCategory(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === c
                  ? "bg-red-600 text-white font-bold shadow-2xs"
                  : "bg-white dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/[0.06]"
              }`}
            >
              {c === "all" ? "Все категории" : c}
            </button>
          ))}
        </div>

        <div className="relative min-w-[280px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Поиск по артикулу OEM, названию..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-white dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-red-500"
          />
        </div>
      </div>

      {/* Warehouse Items Table */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-white dark:bg-[#0e141e] rounded-2xl border border-slate-200 dark:border-white/[0.08] shadow-2xs overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.08] text-slate-500 dark:text-slate-400 font-semibold">
                <th className="py-3 px-4">Артикул OEM</th>
                <th className="py-3 px-4">Наименование детали</th>
                <th className="py-3 px-4">Категория</th>
                <th className="py-3 px-4 text-center">Остаток</th>
                <th className="py-3 px-4 text-center">Мин. остаток</th>
                <th className="py-3 px-4 text-right">Закупка</th>
                <th className="py-3 px-4 text-right">Продажа</th>
                <th className="py-3 px-4">Локация</th>
                <th className="py-3 px-4 text-center">Коррекция</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
              {filtered.map((item) => {
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
                          title="Добавить 1"
                        >
                          +
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

      {/* Add Part Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#0e141e] border border-slate-200 dark:border-white/[0.1] rounded-2xl shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/[0.08] pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                <Boxes className="w-4 h-4 text-red-500" />
                <span>Оприходование детали на склад</span>
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
                  placeholder="504091562"
                  className="mt-1 w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-slate-500 font-semibold">Категория</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1 w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                >
                  <option value="Фильтры">Фильтры</option>
                  <option value="Тормозная система">Тормозная система</option>
                  <option value="Масла и техжидкости">Масла и техжидкости</option>
                  <option value="Трансмиссия">Трансмиссия</option>
                  <option value="Ходовая часть">Ходовая часть</option>
                  <option value="Двигатель">Двигатель</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-slate-500 font-semibold">Наименование детали *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Фильтр масляный Cummins ISF 2.8"
                className="mt-1 w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-slate-500 font-semibold">Количество</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="mt-1 w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="text-slate-500 font-semibold">Мин. остаток</label>
                <input
                  type="number"
                  value={minQuantity}
                  onChange={(e) => setMinQuantity(Number(e.target.value))}
                  className="mt-1 w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="text-slate-500 font-semibold">Ед. изм.</label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="mt-1 w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-500 font-semibold">Закупка (₽)</label>
                <input
                  type="number"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(Number(e.target.value))}
                  className="mt-1 w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="text-slate-500 font-semibold">Продажа (₽)</label>
                <input
                  type="number"
                  value={salePrice}
                  onChange={(e) => setSalePrice(Number(e.target.value))}
                  className="mt-1 w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-bold text-red-600 dark:text-red-400"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-500 font-semibold">Локация / Ячейка</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Стеллаж Б-2"
                className="mt-1 w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
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
                onClick={handleCreatePart}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold cursor-pointer shadow-sm"
              >
                Оприходовать
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
