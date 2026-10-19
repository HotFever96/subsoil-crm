"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  Car,
  Search,
  Plus,
  Phone,
  Building,
  Wrench,
  ChevronRight,
  Shield,
  FileText,
  Clock,
  History,
} from "lucide-react";
import { ClientVehicleRecord, RepairOrder } from "@/lib/auto-service-types";
import { getInitialOrders, formatCurrency } from "@/lib/auto-service-data";
import { useAuth } from "@/lib/auth-context";

export const ClientsGarageModule: React.FC = () => {
  const { user } = useAuth();
  const currentUsername = user?.username ? user.username.trim().toLowerCase() : "";

  const [orders, setOrders] = useState<RepairOrder[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUsername) return;
    const storageKey = `geo_ai_repair_orders_${currentUsername || "guest"}_v1`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setOrders(parsed);
          return;
        }
      }
    } catch {}
    setOrders(getInitialOrders(currentUsername));
  }, [currentUsername]);

  // Group unique clients from orders
  const clientMap = new Map<string, {
    name: string;
    phone: string;
    inn?: string;
    type: "individual" | "legal";
    vehicles: Array<{
      make: string;
      model: string;
      licensePlate: string;
      vin: string;
      year: number;
      mileage: number;
    }>;
    orders: RepairOrder[];
    totalSpent: number;
  }>();

  orders.forEach((ord) => {
    const key = ord.client.name;
    if (!clientMap.has(key)) {
      clientMap.set(key, {
        name: ord.client.name,
        phone: ord.client.phone,
        inn: ord.client.inn,
        type: ord.client.type,
        vehicles: [],
        orders: [],
        totalSpent: 0,
      });
    }

    const c = clientMap.get(key)!;
    c.orders.push(ord);
    c.totalSpent += ord.grandTotal || 0;

    const vExists = c.vehicles.some((v) => v.licensePlate === ord.vehicle.licensePlate);
    if (!vExists) {
      c.vehicles.push({
        make: ord.vehicle.make,
        model: ord.vehicle.model,
        licensePlate: ord.vehicle.licensePlate,
        vin: ord.vehicle.vin,
        year: ord.vehicle.year,
        mileage: ord.vehicle.mileage,
      });
    }
  });

  const clientList = Array.from(clientMap.values());

  const filteredClients = clientList.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchName = c.name.toLowerCase().includes(q);
    const matchPhone = c.phone.toLowerCase().includes(q);
    const matchVehicle = c.vehicles.some(
      (v) =>
        v.licensePlate.toLowerCase().includes(q) ||
        v.vin.toLowerCase().includes(q) ||
        `${v.make} ${v.model}`.toLowerCase().includes(q)
    );
    return matchName || matchPhone || matchVehicle;
  });

  const activeClient = selectedClient ? clientMap.get(selectedClient) || clientList[0] : clientList[0];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] dark:bg-[#090d12] overflow-hidden">
      {/* Top Header */}
      <div className="px-6 py-4.5 border-b border-slate-200 dark:border-white/[0.08] bg-white/70 dark:bg-[#0c121a]/80 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/25 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
              <span>Клиенты и Автопарк</span>
              <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
                {clientList.length} контрагентов
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Картотека автомобилей, история ремонтов и наряд-заказов по VIN и госномеру ({currentUsername})
            </p>
          </div>
        </div>

        <div className="relative min-w-[300px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Поиск по клиенту, госномеру, марке..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-white dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-red-500"
          />
        </div>
      </div>

      {/* 2-Column Layout: Clients List & Selected Client Garage */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Column: Clients List */}
        <div className="w-full md:w-80 lg:w-96 border-r border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0c121a] overflow-y-auto divide-y divide-slate-100 dark:divide-white/[0.04]">
          {filteredClients.map((client) => {
            const isSelected = activeClient?.name === client.name;
            return (
              <div
                key={client.name}
                onClick={() => setSelectedClient(client.name)}
                className={`p-4 transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-red-500/10 border-l-4 border-red-500"
                    : "hover:bg-slate-50 dark:hover:bg-white/[0.02]"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="font-bold text-xs text-slate-900 dark:text-slate-100">
                    {client.name}
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.06] text-slate-500">
                    {client.vehicles.length} ТС
                  </span>
                </div>

                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center space-x-1">
                  <Phone className="w-3 h-3" />
                  <span>{client.phone}</span>
                </div>

                <div className="flex flex-wrap gap-1 mt-2">
                  {client.vehicles.map((v) => (
                    <span
                      key={v.licensePlate}
                      className="px-1.5 py-0.2 rounded font-mono font-bold text-[10px] bg-slate-100 dark:bg-white/[0.06] text-slate-800 dark:text-slate-200"
                    >
                      {v.licensePlate}
                    </span>
                  ))}
                </div>

                <div className="text-[11px] text-red-600 dark:text-red-400 font-bold mt-2">
                  Выручка: {formatCurrency(client.totalSpent)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Detailed Garage & Past Orders */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeClient ? (
            <>
              {/* Client Profile Header */}
              <div className="p-5 rounded-2xl bg-white dark:bg-[#0e141e] border border-slate-200 dark:border-white/[0.08] shadow-2xs">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {activeClient.name}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {activeClient.type === "legal" ? "Юридическое лицо / ИП" : "Физическое лицо"} • Тел: {activeClient.phone}
                      {activeClient.inn && ` • ИНН: ${activeClient.inn}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Общая сумма ремонтов:</span>
                    <div className="text-lg font-extrabold text-red-600 dark:text-red-400">
                      {formatCurrency(activeClient.totalSpent)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Garage Cards */}
              <div className="space-y-3">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
                  <Car className="w-4 h-4 text-red-500" />
                  <span>Автомобили в автопарке ({activeClient.vehicles.length})</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {activeClient.vehicles.map((v) => (
                    <div
                      key={v.licensePlate}
                      className="p-4 rounded-xl bg-white dark:bg-[#0e141e] border border-slate-200 dark:border-white/[0.08] shadow-2xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                          {v.make} {v.model}
                        </span>
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-slate-100 dark:bg-white/[0.08] text-slate-950 dark:text-white border border-slate-200 dark:border-white/[0.1]">
                          {v.licensePlate}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                        <div>Год: <strong>{v.year}</strong></div>
                        <div>Пробег: <strong>{v.mileage.toLocaleString()} км</strong></div>
                        <div className="col-span-2 font-mono text-[10px] text-slate-500">
                          VIN: {v.vin}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Repair Orders History */}
              <div className="space-y-3">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
                  <History className="w-4 h-4 text-red-500" />
                  <span>История заказ-нарядов ({activeClient.orders.length})</span>
                </h3>

                <div className="bg-white dark:bg-[#0e141e] rounded-xl border border-slate-200 dark:border-white/[0.08] shadow-2xs divide-y divide-slate-100 dark:divide-white/[0.04]">
                  {activeClient.orders.map((ord) => (
                    <div key={ord.id} className="p-4 flex items-center justify-between text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900 dark:text-slate-100">{ord.orderNumber}</span>
                          <span className="text-[11px] text-slate-400">• {ord.createdAt}</span>
                          <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-white/[0.06]">
                            {ord.vehicle.licensePlate}
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 italic">{ord.vehicle.complaints || "Ремонт"}</p>
                        <p className="text-[11px] text-slate-400">
                          {ord.works.length} работ • {ord.parts.length} запчастей
                        </p>
                      </div>

                      <div className="text-right">
                        <div className="font-bold text-sm text-red-600 dark:text-red-400">
                          {formatCurrency(ord.grandTotal)}
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.05] text-slate-500">
                          {ord.status === "closed" ? "Закрыт / Оплачен" : "В работе"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs">
              Выберите клиента из списка слева
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
