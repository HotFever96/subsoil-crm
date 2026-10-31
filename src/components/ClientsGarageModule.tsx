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
  Edit,
  Trash2,
  CheckCircle2,
  X,
} from "lucide-react";
import { ClientVehicleRecord, RepairOrder } from "@/lib/auto-service-types";
import { formatCurrency } from "@/lib/auto-service-data";
import { useAuth } from "@/lib/auth-context";

interface VehicleItem {
  id?: string;
  make: string;
  model: string;
  licensePlate: string;
  vin: string;
  year: number;
  mileage: number;
}

export const ClientsGarageModule: React.FC = () => {
  const { user } = useAuth();
  const currentUsername = user?.username ? user.username.trim().toLowerCase() : "";
  const clientsStorageKey = `geo_ai_clients_${currentUsername || "guest"}_v2`;
  const ordersStorageKey = `geo_ai_repair_orders_${currentUsername || "guest"}_v2`;

  const [manualClients, setManualClients] = useState<ClientVehicleRecord[]>([]);
  const [orders, setOrders] = useState<RepairOrder[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Client Modal (Create or Edit)
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [clientType, setClientType] = useState<"individual" | "legal">("individual");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientInn, setClientInn] = useState("");

  // Optional first car when creating client
  const [carMake, setCarMake] = useState("");
  const [carModel, setCarModel] = useState("");
  const [carPlate, setCarPlate] = useState("");
  const [carVin, setCarVin] = useState("");
  const [carYear, setCarYear] = useState(new Date().getFullYear() - 3);
  const [carMileage, setCarMileage] = useState(0);

  // Add Car Modal for existing client
  const [isAddCarModalOpen, setIsAddCarModalOpen] = useState(false);
  const [newCarMake, setNewCarMake] = useState("");
  const [newCarModel, setNewCarModel] = useState("");
  const [newCarPlate, setNewCarPlate] = useState("");
  const [newCarVin, setNewCarVin] = useState("");
  const [newCarYear, setNewCarYear] = useState(new Date().getFullYear() - 3);
  const [newCarMileage, setNewCarMileage] = useState(0);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = () => {
    if (!currentUsername) {
      setManualClients([]);
      setOrders([]);
      return;
    }

    try {
      const savedClients = localStorage.getItem(clientsStorageKey);
      if (savedClients) {
        const parsed = JSON.parse(savedClients);
        if (Array.isArray(parsed)) setManualClients(parsed);
      } else {
        setManualClients([]);
      }
    } catch {
      setManualClients([]);
    }

    try {
      const savedOrders = localStorage.getItem(ordersStorageKey);
      if (savedOrders) {
        const parsed = JSON.parse(savedOrders);
        if (Array.isArray(parsed)) setOrders(parsed);
      } else {
        setOrders([]);
      }
    } catch {
      setOrders([]);
    }
  };

  useEffect(() => {
    loadData();

    const handleOrdersUpdate = () => loadData();
    window.addEventListener("geo_ai_repair_orders_updated", handleOrdersUpdate);
    return () => {
      window.removeEventListener("geo_ai_repair_orders_updated", handleOrdersUpdate);
    };
  }, [currentUsername]);

  const saveManualClients = (list: ClientVehicleRecord[]) => {
    setManualClients(list);
    try {
      localStorage.setItem(clientsStorageKey, JSON.stringify(list));
    } catch {}
  };

  // Merge manual clients and clients derived from repair orders
  const mergedClientsMap = new Map<string, {
    id: string;
    name: string;
    phone: string;
    inn?: string;
    type: "individual" | "legal";
    vehicles: VehicleItem[];
    orders: RepairOrder[];
    totalSpent: number;
    isManual: boolean;
  }>();

  // First, populate manual clients
  manualClients.forEach((mc) => {
    const key = mc.name.trim().toLowerCase();
    mergedClientsMap.set(key, {
      id: mc.id,
      name: mc.name,
      phone: mc.phone,
      inn: mc.inn,
      type: mc.type,
      vehicles: [...mc.vehicles],
      orders: [],
      totalSpent: 0,
      isManual: true,
    });
  });

  // Then merge with orders data
  orders.forEach((ord) => {
    if (!ord.client?.name) return;
    const key = ord.client.name.trim().toLowerCase();
    if (!mergedClientsMap.has(key)) {
      mergedClientsMap.set(key, {
        id: `c-ord-${ord.id}`,
        name: ord.client.name,
        phone: ord.client.phone || "",
        inn: ord.client.inn,
        type: ord.client.type || "individual",
        vehicles: [],
        orders: [],
        totalSpent: 0,
        isManual: false,
      });
    }

    const c = mergedClientsMap.get(key)!;
    c.orders.push(ord);
    c.totalSpent += ord.grandTotal || 0;

    if (ord.vehicle?.licensePlate) {
      const vExists = c.vehicles.some((v) => v.licensePlate === ord.vehicle.licensePlate);
      if (!vExists) {
        c.vehicles.push({
          id: `veh-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          make: ord.vehicle.make || "",
          model: ord.vehicle.model || "",
          licensePlate: ord.vehicle.licensePlate,
          vin: ord.vehicle.vin || "",
          year: ord.vehicle.year || 2020,
          mileage: ord.vehicle.mileage || 0,
        });
      }
    }
  });

  const allClientsList = Array.from(mergedClientsMap.values());

  const filteredClients = allClientsList.filter((c) => {
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

  const activeClient = selectedClientId
    ? allClientsList.find((c) => c.id === selectedClientId) || filteredClients[0]
    : filteredClients[0];

  const handleOpenCreateClientModal = () => {
    setEditingClientId(null);
    setClientType("individual");
    setClientName("");
    setClientPhone("");
    setClientInn("");
    setCarMake("");
    setCarModel("");
    setCarPlate("");
    setCarVin("");
    setCarYear(new Date().getFullYear() - 3);
    setCarMileage(0);
    setIsClientModalOpen(true);
  };

  const handleOpenEditClientModal = (client: any) => {
    setEditingClientId(client.id);
    setClientType(client.type);
    setClientName(client.name);
    setClientPhone(client.phone);
    setClientInn(client.inn || "");
    setIsClientModalOpen(true);
  };

  const handleSaveClient = () => {
    if (!clientName.trim() || !clientPhone.trim()) {
      alert("Укажите имя клиента и номер телефона");
      return;
    }

    if (editingClientId) {
      // Edit existing
      const updated = manualClients.map((c) =>
        c.id === editingClientId
          ? {
              ...c,
              name: clientName.trim(),
              phone: clientPhone.trim(),
              type: clientType,
              inn: clientInn.trim() || undefined,
            }
          : c
      );
      saveManualClients(updated);
      showToast(`Данные клиента «${clientName.trim()}» обновлены`);
    } else {
      // Create new
      const vehicles: VehicleItem[] = [];
      if (carMake.trim() && carPlate.trim()) {
        vehicles.push({
          id: `veh-${Date.now()}`,
          make: carMake.trim(),
          model: carModel.trim(),
          licensePlate: carPlate.trim().toUpperCase(),
          vin: carVin.trim().toUpperCase() || "X7L00000000000000",
          year: Number(carYear) || 2021,
          mileage: Number(carMileage) || 0,
        });
      }

      const newRecord: ClientVehicleRecord = {
        id: `client-${Date.now()}`,
        name: clientName.trim(),
        type: clientType,
        phone: clientPhone.trim(),
        inn: clientInn.trim() || undefined,
        vehicles,
        totalOrdersCount: 0,
        totalSpent: 0,
        username: currentUsername,
      };

      const updated = [newRecord, ...manualClients];
      saveManualClients(updated);
      setSelectedClientId(newRecord.id);
      showToast(`Контрагент «${newRecord.name}» добавлен в базу`);
    }

    setIsClientModalOpen(false);
  };

  const handleDeleteClient = (client: any) => {
    if (!confirm(`Удалить клиента «${client.name}» из картотеки?`)) return;
    const updated = manualClients.filter((c) => c.name.trim().toLowerCase() !== client.name.trim().toLowerCase());
    saveManualClients(updated);
    if (selectedClientId === client.id) setSelectedClientId(null);
    showToast(`Клиент «${client.name}» удален`);
  };

  const handleAddCarToActiveClient = () => {
    if (!newCarMake.trim() || !newCarPlate.trim()) {
      alert("Укажите марку автомобиля и госномер");
      return;
    }
    if (!activeClient) return;

    const newVehicle: VehicleItem = {
      id: `veh-${Date.now()}`,
      make: newCarMake.trim(),
      model: newCarModel.trim(),
      licensePlate: newCarPlate.trim().toUpperCase(),
      vin: newCarVin.trim().toUpperCase() || "X7L00000000000000",
      year: Number(newCarYear) || 2021,
      mileage: Number(newCarMileage) || 0,
    };

    // If activeClient is already in manualClients, update it. If from orders, convert to manualClient record!
    const existingIndex = manualClients.findIndex(
      (c) => c.name.trim().toLowerCase() === activeClient.name.trim().toLowerCase()
    );

    if (existingIndex >= 0) {
      const updated = [...manualClients];
      updated[existingIndex].vehicles.push(newVehicle);
      saveManualClients(updated);
    } else {
      const newRecord: ClientVehicleRecord = {
        id: `client-${Date.now()}`,
        name: activeClient.name,
        type: activeClient.type,
        phone: activeClient.phone,
        inn: activeClient.inn,
        vehicles: [...activeClient.vehicles, newVehicle],
        totalOrdersCount: activeClient.orders.length,
        totalSpent: activeClient.totalSpent,
        username: currentUsername,
      };
      saveManualClients([newRecord, ...manualClients]);
    }

    setIsAddCarModalOpen(false);
    setNewCarMake("");
    setNewCarModel("");
    setNewCarPlate("");
    setNewCarVin("");
    showToast(`Автомобиль ${newVehicle.make} (${newVehicle.licensePlate}) добавлен в автопарк`);
  };

  const handleDeleteVehicleFromClient = (licensePlate: string) => {
    if (!confirm(`Удалить автомобиль ${licensePlate} из автопарка клиента?`)) return;
    if (!activeClient) return;

    const existingIndex = manualClients.findIndex(
      (c) => c.name.trim().toLowerCase() === activeClient.name.trim().toLowerCase()
    );

    if (existingIndex >= 0) {
      const updated = [...manualClients];
      updated[existingIndex].vehicles = updated[existingIndex].vehicles.filter(
        (v) => v.licensePlate !== licensePlate
      );
      saveManualClients(updated);
      showToast(`Автомобиль ${licensePlate} удален`);
    } else {
      // Persist as manual client with remaining vehicles
      const filteredVehicles = activeClient.vehicles.filter((v) => v.licensePlate !== licensePlate);
      const newRecord: ClientVehicleRecord = {
        id: `client-${Date.now()}`,
        name: activeClient.name,
        type: activeClient.type,
        phone: activeClient.phone,
        inn: activeClient.inn,
        vehicles: filteredVehicles,
        totalOrdersCount: activeClient.orders.length,
        totalSpent: activeClient.totalSpent,
        username: currentUsername,
      };
      saveManualClients([newRecord, ...manualClients]);
      showToast(`Автомобиль ${licensePlate} удален`);
    }
  };

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
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center space-x-2.5">
              <span>Контрагенты и Автопарк</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-zinc-200/60 dark:bg-white/[0.06] text-zinc-600 dark:text-zinc-400">
                {allClientsList.length} контрагентов
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Поиск по клиенту, госномеру, марке..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-full bg-white/60 dark:bg-white/[0.06] border border-black/[0.05] dark:border-white/[0.08] text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-hidden backdrop-blur-md"
            />
          </div>

          <button
            type="button"
            onClick={handleOpenCreateClientModal}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/25 transition-all cursor-pointer whitespace-nowrap shrink-0 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Добавить клиента</span>
          </button>
        </div>
      </div>

      {/* 2-Column Layout: Clients List & Selected Client Garage */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Column: Clients List */}
        <div className="w-full md:w-80 lg:w-96 border-r border-black/[0.04] dark:border-white/[0.06] bg-white/50 dark:bg-black/20 backdrop-blur-xl overflow-y-auto divide-y divide-black/[0.03] dark:divide-white/[0.04]">
          {filteredClients.length === 0 ? (
            <div className="p-8 text-center text-zinc-400 text-xs">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="font-semibold text-zinc-600 dark:text-zinc-300">База контрагентов пуста</p>
              <p className="text-[11px] text-zinc-400 mt-1">
                Нажмите «+ Добавить клиента» в шапке для внесения первого контрагента
              </p>
            </div>
          ) : (
            filteredClients.map((client) => {
              const isSelected = activeClient?.name === client.name;
              return (
                <div
                  key={client.id || client.name}
                  onClick={() => setSelectedClientId(client.id)}
                  className={`p-4 transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-red-500/10 border-l-4 border-red-500"
                      : "hover:bg-zinc-50 dark:hover:bg-white/[0.02]"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                      {client.name}
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-white/[0.06] text-zinc-500">
                      {client.vehicles.length} ТС
                    </span>
                  </div>

                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 flex items-center space-x-1">
                    <Phone className="w-3 h-3" />
                    <span>{client.phone || "Телефон не указан"}</span>
                  </div>

                  <div className="flex flex-wrap gap-1 mt-2">
                    {client.vehicles.map((v) => (
                      <span
                        key={v.licensePlate}
                        className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-zinc-100 dark:bg-white/[0.06] text-zinc-800 dark:text-zinc-200"
                      >
                        {v.licensePlate}
                      </span>
                    ))}
                  </div>

                  <div className="text-[11px] text-red-600 dark:text-red-400 font-bold mt-2 flex items-center justify-between">
                    <span>Выручка: {formatCurrency(client.totalSpent)}</span>
                    <span className="text-[10px] text-zinc-400 font-normal">
                      {client.orders.length} заказов
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Detailed Garage & Past Orders */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeClient ? (
            <>
              {/* Client Profile Header */}
              <div className="p-5 rounded-3xl bg-white/80 dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.08] backdrop-blur-xl shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center space-x-2.5">
                      <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                        {activeClient.name}
                      </h2>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-white/[0.06] text-zinc-600 dark:text-zinc-300 font-medium">
                        {activeClient.type === "legal" ? "Юридическое лицо / ИП" : "Физическое лицо"}
                      </span>
                    </div>

                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 flex flex-wrap items-center gap-3">
                      <span className="flex items-center space-x-1">
                        <Phone className="w-3.5 h-3.5 text-zinc-400" />
                        <span>{activeClient.phone || "—"}</span>
                      </span>
                      {activeClient.inn && (
                        <span>• ИНН: <strong className="font-mono">{activeClient.inn}</strong></span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-zinc-400">Общая сумма ремонтов:</span>
                      <div className="text-lg font-extrabold text-red-600 dark:text-red-400">
                        {formatCurrency(activeClient.totalSpent)}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 pl-2 border-l border-zinc-200 dark:border-white/[0.08]">
                      <button
                        type="button"
                        onClick={() => handleOpenEditClientModal(activeClient)}
                        className="p-2 rounded-xl border border-zinc-200 dark:border-white/[0.08] hover:bg-zinc-100 dark:hover:bg-white/[0.04] text-zinc-600 dark:text-zinc-300 cursor-pointer"
                        title="Редактировать клиента"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteClient(activeClient)}
                        className="p-2 rounded-xl border border-zinc-200 dark:border-white/[0.08] hover:bg-rose-50 dark:hover:bg-rose-500/10 text-zinc-400 hover:text-rose-500 cursor-pointer"
                        title="Удалить клиента"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Garage Cards */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center space-x-1.5">
                    <Car className="w-4 h-4 text-red-500" />
                    <span>Автомобили в автопарке ({activeClient.vehicles.length})</span>
                  </h3>

                  <button
                    type="button"
                    onClick={() => setIsAddCarModalOpen(true)}
                    className="flex items-center space-x-1 px-3 py-1.5 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Добавить автомобиль</span>
                  </button>
                </div>

                {activeClient.vehicles.length === 0 ? (
                  <div className="p-6 rounded-3xl bg-white/80 dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.08] backdrop-blur-xl text-center text-zinc-400 text-xs">
                    Автомобилей пока не добавлено. Нажмите «Добавить автомобиль», чтобы привязать ТС к контрагенту.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {activeClient.vehicles.map((v) => (
                      <div
                        key={v.licensePlate}
                        className="p-4 rounded-2xl bg-white/80 dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.08] backdrop-blur-xl shadow-2xs space-y-2 group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                            {v.make} {v.model}
                          </span>
                          <div className="flex items-center space-x-1.5">
                            <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-zinc-100 dark:bg-white/[0.08] text-zinc-950 dark:text-white border border-zinc-200 dark:border-white/[0.1]">
                              {v.licensePlate}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteVehicleFromClient(v.licensePlate)}
                              className="text-zinc-400 hover:text-rose-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                              title="Удалить ТС"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-600 dark:text-zinc-400">
                          <div>Год: <strong>{v.year}</strong></div>
                          <div>Пробег: <strong>{v.mileage ? v.mileage.toLocaleString() : "0"} км</strong></div>
                          <div className="col-span-2 font-mono text-[10px] text-zinc-500 truncate">
                            VIN: {v.vin}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Repair Orders History */}
              <div className="space-y-3">
                <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center space-x-1.5">
                  <History className="w-4 h-4 text-red-500" />
                  <span>История заказ-нарядов ({activeClient.orders.length})</span>
                </h3>

                {activeClient.orders.length === 0 ? (
                  <div className="p-6 rounded-3xl bg-white/80 dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.08] backdrop-blur-xl text-center text-zinc-400 text-xs">
                    Заказ-нарядов по данному клиенту пока нет.
                  </div>
                ) : (
                  <div className="bg-white/80 dark:bg-white/[0.03] rounded-2xl border border-black/[0.06] dark:border-white/[0.08] backdrop-blur-xl shadow-2xs divide-y divide-zinc-100 dark:divide-white/[0.04]">
                    {activeClient.orders.map((ord) => (
                      <div key={ord.id} className="p-4 flex items-center justify-between text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-zinc-900 dark:text-zinc-100">{ord.orderNumber}</span>
                            <span className="text-[11px] text-zinc-400">• {ord.createdAt}</span>
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-white/[0.06]">
                              {ord.vehicle.licensePlate}
                            </span>
                          </div>
                          <p className="text-zinc-600 dark:text-zinc-300 italic">{ord.vehicle.complaints || "Ремонт"}</p>
                          <p className="text-[11px] text-zinc-400">
                            {ord.works.length} работ • {ord.parts.length} запчастей
                          </p>
                        </div>

                        <div className="text-right">
                          <div className="font-bold text-sm text-red-600 dark:text-red-400">
                            {formatCurrency(ord.grandTotal)}
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-white/[0.05] text-zinc-500">
                            {ord.status === "closed" ? "Закрыт / Оплачен" : ord.status === "ready" ? "Готов к выдаче" : ord.status === "parts_waiting" ? "Ожидание запчастей" : "В работе"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-zinc-400 text-xs">
              Выберите контрагента из списка слева
            </div>
          )}
        </div>
      </div>

      {/* Client Modal (Create or Edit) */}
      {isClientModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white/95 dark:bg-zinc-950/90 backdrop-blur-2xl border border-black/[0.08] dark:border-white/10 rounded-3xl shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/[0.08] pb-3">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
                <Users className="w-4 h-4 text-red-500" />
                <span>{editingClientId ? "Редактирование контрагента" : "Новый контрагент"}</span>
              </h3>
              <button onClick={() => setIsClientModalOpen(false)} className="text-zinc-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-zinc-500 font-semibold">Тип клиента</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setClientType("individual")}
                  className={`py-2 rounded-2xl font-bold border transition-colors cursor-pointer ${
                    clientType === "individual"
                      ? "border-red-500 bg-red-500/10 text-red-600 dark:text-red-400"
                      : "border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  Физическое лицо
                </button>
                <button
                  type="button"
                  onClick={() => setClientType("legal")}
                  className={`py-2 rounded-2xl font-bold border transition-colors cursor-pointer ${
                    clientType === "legal"
                      ? "border-red-500 bg-red-500/10 text-red-600 dark:text-red-400"
                      : "border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  Юрлицо / ИП
                </button>
              </div>
            </div>

            <div>
              <label className="text-zinc-500 font-semibold">
                {clientType === "legal" ? "Название организации / ИП *" : "ФИО владельца *"}
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder={clientType === "legal" ? "ООО «ТрансАвто» или ИП Иванов И.И." : "Иванов Иван Иванович"}
                className="mt-1 w-full px-3 py-2 rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-900/80 text-zinc-900 dark:text-white placeholder:text-zinc-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-zinc-500 font-semibold">Телефон *</label>
                <input
                  type="text"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="+7 (999) 000-00-00"
                  className="mt-1 w-full px-3 py-2 rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-900/80 text-zinc-900 dark:text-white placeholder:text-zinc-500"
                />
              </div>

              <div>
                <label className="text-zinc-500 font-semibold">ИНН (для юрлиц)</label>
                <input
                  type="text"
                  value={clientInn}
                  onChange={(e) => setClientInn(e.target.value)}
                  placeholder="7700000000"
                  className="mt-1 w-full px-3 py-2 rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-900/80 text-zinc-900 dark:text-white placeholder:text-zinc-500 font-mono"
                />
              </div>
            </div>

            {!editingClientId && (
              <div className="pt-2 border-t border-zinc-200/80 dark:border-white/[0.08] space-y-2.5">
                <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 flex items-center space-x-1">
                  <Car className="w-3.5 h-3.5 text-red-500" />
                  <span>Первый автомобиль контрагента (опционально)</span>
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <input
                      type="text"
                      value={carMake}
                      onChange={(e) => setCarMake(e.target.value)}
                      placeholder="Марка (ГАЗ)"
                      className="w-full px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-900/80 text-zinc-900 dark:text-white placeholder:text-zinc-500"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={carModel}
                      onChange={(e) => setCarModel(e.target.value)}
                      placeholder="Модель (3302)"
                      className="w-full px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-900/80 text-zinc-900 dark:text-white placeholder:text-zinc-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <input
                      type="text"
                      value={carPlate}
                      onChange={(e) => setCarPlate(e.target.value.toUpperCase())}
                      placeholder="Госномер (А000АА77)"
                      className="w-full px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-900/80 text-zinc-900 dark:text-white placeholder:text-zinc-500 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={carVin}
                      onChange={(e) => setCarVin(e.target.value.toUpperCase())}
                      placeholder="VIN номер"
                      className="w-full px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-900/80 text-zinc-900 dark:text-white placeholder:text-zinc-500 font-mono text-[11px]"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsClientModalOpen(false)}
                className="px-4 py-2 rounded-full text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.06] cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleSaveClient}
                className="px-5 py-2 rounded-full bg-red-600 hover:bg-red-500 text-white font-semibold cursor-pointer shadow-md shadow-red-600/20"
              >
                {editingClientId ? "Сохранить" : "Добавить клиента"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Car Modal for existing client */}
      {isAddCarModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white/95 dark:bg-zinc-950/90 backdrop-blur-2xl border border-black/[0.08] dark:border-white/10 rounded-3xl shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/[0.08] pb-3">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
                <Car className="w-4 h-4 text-red-500" />
                <span>Добавление автомобиля в автопарк</span>
              </h3>
              <button onClick={() => setIsAddCarModalOpen(false)} className="text-zinc-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-zinc-500 font-semibold">Марка авто *</label>
                <input
                  type="text"
                  value={newCarMake}
                  onChange={(e) => setNewCarMake(e.target.value)}
                  placeholder="ГАЗ / КАМАЗ / Toyota"
                  className="mt-1 w-full px-3 py-2 rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-900/80 text-zinc-900 dark:text-white placeholder:text-zinc-500"
                />
              </div>

              <div>
                <label className="text-zinc-500 font-semibold">Модель авто</label>
                <input
                  type="text"
                  value={newCarModel}
                  onChange={(e) => setNewCarModel(e.target.value)}
                  placeholder="Газель Next"
                  className="mt-1 w-full px-3 py-2 rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-900/80 text-zinc-900 dark:text-white placeholder:text-zinc-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-zinc-500 font-semibold">Госномер *</label>
                <input
                  type="text"
                  value={newCarPlate}
                  onChange={(e) => setNewCarPlate(e.target.value.toUpperCase())}
                  placeholder="А000АА77"
                  className="mt-1 w-full px-3 py-2 rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-900/80 text-zinc-900 dark:text-white placeholder:text-zinc-500 font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-zinc-500 font-semibold">Год выпуска</label>
                <input
                  type="number"
                  value={newCarYear}
                  onChange={(e) => setNewCarYear(Number(e.target.value))}
                  className="mt-1 w-full px-3 py-2 rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-900/80 text-zinc-900 dark:text-white placeholder:text-zinc-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-zinc-500 font-semibold">VIN номер</label>
                <input
                  type="text"
                  value={newCarVin}
                  onChange={(e) => setNewCarVin(e.target.value.toUpperCase())}
                  placeholder="17 знаков"
                  className="mt-1 w-full px-3 py-2 rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-900/80 text-zinc-900 dark:text-white placeholder:text-zinc-500 font-mono"
                />
              </div>

              <div>
                <label className="text-zinc-500 font-semibold">Пробег (км)</label>
                <input
                  type="number"
                  value={newCarMileage}
                  onChange={(e) => setNewCarMileage(Number(e.target.value))}
                  className="mt-1 w-full px-3 py-2 rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-900/80 text-zinc-900 dark:text-white placeholder:text-zinc-500 font-mono"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsAddCarModalOpen(false)}
                className="px-4 py-2 rounded-full text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.06] cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleAddCarToActiveClient}
                className="px-5 py-2 rounded-full bg-red-600 hover:bg-red-500 text-white font-semibold cursor-pointer shadow-md shadow-red-600/20"
              >
                Добавить в автопарк
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
