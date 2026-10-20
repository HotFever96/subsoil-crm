"use client";

import {
  RepairOrder,
  WarehousePart,
  ServiceBay,
  BayAppointment,
  ClientVehicleRecord,
  OrderStatus,
  OrderWorkItem,
  OrderPartItem,
  StoCompanyRequisites,
} from "./auto-service-types";

export const SERVICE_COMPANY_REQUISITES: StoCompanyRequisites = {
  name: 'ООО «Автотехцентр Чайка-Сервис»',
  brandName: 'ЧАЙКА-СЕРВИС CRM',
  address: 'г. Сургут, Нефтеюганское шоссе, д. 28/4',
  phone: '+7 (3462) 77-88-99',
  email: 'service@chaika-crm.ru',
  inn: '8602194820',
  kpp: '860201001',
  ogrn: '1128602008412',
  bankName: 'ПАО Сбербанк',
  bik: '047102651',
  rs: '40702810867170014523',
  ks: '30101810800000000651',
  defaultRatePerHour: 2500, // Рублей за 1 нормо-час
  masterReceiver: 'Романов А.В.',
  director: 'Чайковский В.И.',
  mechanics: ['Иванов М.С.', 'Кузнецов П.А.', 'Сидоров Д.А.', 'Смирнов В.К.', 'Петров А.Н.'],
};

export function getStoRequisites(username?: string): StoCompanyRequisites {
  if (typeof window === "undefined") return SERVICE_COMPANY_REQUISITES;
  try {
    const raw = localStorage.getItem(`geo_ai_sto_requisites_${username || "guest"}_v1`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return {
          ...SERVICE_COMPANY_REQUISITES,
          ...parsed,
          mechanics: Array.isArray(parsed.mechanics) && parsed.mechanics.length > 0 ? parsed.mechanics : SERVICE_COMPANY_REQUISITES.mechanics,
        };
      }
    }
  } catch {}
  return SERVICE_COMPANY_REQUISITES;
}

export function saveStoRequisites(req: StoCompanyRequisites, username?: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`geo_ai_sto_requisites_${username || "guest"}_v1`, JSON.stringify(req));
    window.dispatchEvent(new CustomEvent("geo_ai_sto_requisites_updated"));
  } catch {}
}

export const DEFAULT_SERVICE_BAYS: ServiceBay[] = [
  {
    id: "bay-1",
    name: "Пост 1: Двухстоечный подъемник (4 т)",
    type: "lift",
    color: "#ef4444",
  },
  {
    id: "bay-2",
    name: "Пост 2: Грузовая смотровая яма (18 м)",
    type: "pit",
    color: "#f97316",
  },
  {
    id: "bay-3",
    name: "Пост 3: Компьютерная диагностика и электрика",
    type: "electric",
    color: "#3b82f6",
  },
  {
    id: "bay-4",
    name: "Пост 4: Агрегатно-слесарный участок",
    type: "general",
    color: "#10b981",
  },
];

export function calculateOrderTotals(
  works: OrderWorkItem[],
  parts: OrderPartItem[]
): { totalWorks: number; totalParts: number; grandTotal: number } {
  const totalWorks = works.reduce((sum, w) => {
    const discountFactor = Math.max(0, 1 - (w.discountPercent || 0) / 100);
    const itemTotal = (w.laborHours || 0) * (w.ratePerHour || 0) * discountFactor;
    return sum + Math.round(itemTotal);
  }, 0);

  const totalParts = parts.reduce((sum, p) => {
    const itemTotal = (p.qty || 0) * (p.salePrice || 0);
    return sum + Math.round(itemTotal);
  }, 0);

  return {
    totalWorks,
    totalParts,
    grandTotal: totalWorks + totalParts,
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getStatusMeta(status: OrderStatus): { label: string; bg: string; text: string; border: string } {
  switch (status) {
    case "estimate":
      return {
        label: "Заявка / Оценка",
        bg: "bg-slate-100 dark:bg-slate-800/60",
        text: "text-slate-700 dark:text-slate-300",
        border: "border-slate-300 dark:border-slate-700",
      };
    case "in_progress":
      return {
        label: "В работе",
        bg: "bg-amber-500/10",
        text: "text-amber-600 dark:text-amber-400 font-semibold",
        border: "border-amber-500/30",
      };
    case "parts_waiting":
      return {
        label: "Ожидание запчастей",
        bg: "bg-purple-500/10",
        text: "text-purple-600 dark:text-purple-400 font-semibold",
        border: "border-purple-500/30",
      };
    case "ready":
      return {
        label: "Готов к выдаче",
        bg: "bg-blue-500/10",
        text: "text-blue-600 dark:text-blue-400 font-semibold",
        border: "border-blue-500/30",
      };
    case "closed":
      return {
        label: "Закрыт / Оплачен",
        bg: "bg-emerald-500/10",
        text: "text-emerald-600 dark:text-emerald-400 font-semibold",
        border: "border-emerald-500/30",
      };
  }
}

export function getInitialOrders(_username?: string): RepairOrder[] {
  return [];
}

export function getInitialWarehouse(_username?: string): WarehousePart[] {
  return [];
}

export function getInitialClients(_username?: string): ClientVehicleRecord[] {
  return [];
}

export function getInitialAppointments(_username?: string): BayAppointment[] {
  return [];
}

export const AUTO_DEALER_LABOR_STANDARDS = [
  {
    vehicle: "ГАЗ Газель Next (Cummins 2.8)",
    operations: [
      { name: "Замена масла в ДВС со снятием защиты", hours: 0.8, parts: ["Фильтр масляный", "Масло 6 л"] },
      { name: "Замена передних тормозных колодок", hours: 1.5, parts: ["Колодки передние"] },
      { name: "Замена задних тормозных колодок (барабанные)", hours: 2.2, parts: ["Колодки задние"] },
      { name: "Замена ремня генератора и натяжного ролика", hours: 1.2, parts: ["Ремень приводной", "Ролик"] },
      { name: "Снятие и установка КПП", hours: 3.5, parts: ["Масло трансмиссионное 2.5 л"] },
      { name: "Замена комплекта сцепления", hours: 4.5, parts: ["Корзина", "Диск сцепления", "Выжимной"] },
      { name: "Регулировка клапанов ДВС", hours: 2.5, parts: ["Прокладка клапанной крышки"] },
    ],
  },
  {
    vehicle: "КАМАЗ 65115 / 6520 (дв. 740 / Cummins ISL)",
    operations: [
      { name: "Снятие и установка КПП ZF 9S1310 / 16S1820", hours: 7.2, parts: ["Масло ZF Ecofluid", "Сальники"] },
      { name: "Замена сцепления Sachs 430", hours: 3.0, parts: ["Комплект сцепления MFZ430"] },
      { name: "Замена масла и фильтров ДВС (полное ТО)", hours: 2.5, parts: ["Масло 32 л", "Масляный фильтр 2 шт", "Топливные фильтры"] },
      { name: "Замена тормозных накладок (1 ось)", hours: 3.0, parts: ["Тормозные накладки", "Заклепки"] },
      { name: "Шприцевание точек смазки шасси", hours: 1.5, parts: ["Смазка Литол-24 / 158"] },
    ],
  },
  {
    vehicle: "Toyota Hilux / Land Cruiser Prado",
    operations: [
      { name: "Замена комплекта ГРМ и помпы", hours: 3.8, parts: ["Ремень ГРМ", "Ролики", "Помпа", "Антифриз"] },
      { name: "Замена передних дисков и колодок", hours: 1.6, parts: ["Диски передние", "Колодки"] },
      { name: "Шприцевание крестовин карданных валов", hours: 0.6, parts: ["Смазка Castrol LMX"] },
    ],
  },
];
