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
  ServiceEmployee,
  MasterPayrollSummary,
  MasterPayrollWorkDetail,
  PaymentScheme,
} from "./auto-service-types";

export const DEFAULT_EMPLOYEES: ServiceEmployee[] = [];

export const SERVICE_COMPANY_REQUISITES: StoCompanyRequisites = {
  name: "ИП Водоватовский Антон Игоревич",
  brandName: "ИП Водоватовский А.И. (СТО «Чайка-Сервис»)",
  address: "629804, ЯНАО, г. Ноябрьск, ул. Магистральная",
  phone: "+7 (900) 400-09-00",
  email: "vodovatovskiy@list.ru",
  inn: "263112957774",
  kpp: "",
  ogrn: "309264819700017",
  okpo: "0165990910",
  oktmo: "71958000001",
  okved: "45.20, 45.32",
  taxSystem: "УСН (Доходы), Патент. Без НДС (освобождение согласно пп. 37 п. 3 ст. 149 НК РФ)",
  bankName: "Филиал «Екатеринбургский» АО «АЛЬФА-БАНК»",
  bik: "046577964",
  rs: "40802810038310009505",
  ks: "30101810100000000964",
  defaultRatePerHour: 2500, // Рублей за 1 нормо-час
  masterReceiver: "Водоватовский А.И.",
  director: "Водоватовский Антон Игоревич",
  directorBasis: "Свидетельства серии 26 № 003664718",
  mechanics: [],
  employees: [],
  facsimileDefaultEnabled: true,
  scanModeDefaultEnabled: false,
};

export function getStoRequisites(username?: string): StoCompanyRequisites {
  if (typeof window === "undefined") return SERVICE_COMPANY_REQUISITES;
  try {
    const raw = localStorage.getItem(`geo_ai_sto_requisites_${username || "guest"}_v2`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return {
          ...SERVICE_COMPANY_REQUISITES,
          ...parsed,
          mechanics: Array.isArray(parsed.mechanics) ? parsed.mechanics : [],
          employees: Array.isArray(parsed.employees) ? parsed.employees : [],
        };
      }
    }
  } catch {}
  return SERVICE_COMPANY_REQUISITES;
}

export function saveStoRequisites(req: StoCompanyRequisites, username?: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`geo_ai_sto_requisites_${username || "guest"}_v2`, JSON.stringify(req));
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
  works?: OrderWorkItem[],
  parts?: OrderPartItem[]
): { totalWorks: number; totalParts: number; grandTotal: number } {
  const safeWorks = Array.isArray(works) ? works : [];
  const safeParts = Array.isArray(parts) ? parts : [];

  const totalWorks = safeWorks.reduce((sum, w) => {
    const discountFactor = Math.max(0, 1 - (Number(w?.discountPercent) || 0) / 100);
    const itemTotal = (Number(w?.laborHours) || 0) * (Number(w?.ratePerHour) || 0) * discountFactor;
    return sum + Math.round(itemTotal);
  }, 0);

  const totalParts = safeParts.reduce((sum, p) => {
    const itemTotal = (Number(p?.qty) || 0) * (Number(p?.salePrice) || 0);
    return sum + Math.round(itemTotal);
  }, 0);

  return {
    totalWorks,
    totalParts,
    grandTotal: totalWorks + totalParts,
  };
}

export function formatCurrency(amount: any): string {
  const num = typeof amount === "number" && !isNaN(amount) ? amount : Number(amount) || 0;
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(num);
}

export function getStatusMeta(status?: string | OrderStatus): { label: string; bg: string; text: string; border: string } {
  const norm = String(status || "").toLowerCase();
  if (norm === "estimate" || norm === "new" || norm === "draft") {
    return {
      label: "Заявка / Оценка",
      bg: "bg-zinc-100 dark:bg-zinc-800/60",
      text: "text-zinc-700 dark:text-zinc-300",
      border: "border-zinc-300 dark:border-zinc-700",
    };
  }
  if (norm === "in_progress" || norm === "progress") {
    return {
      label: "В работе",
      bg: "bg-amber-500/10",
      text: "text-amber-600 dark:text-amber-400 font-semibold",
      border: "border-amber-500/30",
    };
  }
  if (norm === "parts_waiting" || norm === "waiting") {
    return {
      label: "Ожидание запчастей",
      bg: "bg-purple-500/10",
      text: "text-purple-600 dark:text-purple-400 font-semibold",
      border: "border-purple-500/30",
    };
  }
  if (norm === "ready") {
    return {
      label: "Готов к выдаче",
      bg: "bg-blue-500/10",
      text: "text-blue-600 dark:text-blue-400 font-semibold",
      border: "border-blue-500/30",
    };
  }
  if (norm === "closed" || norm === "completed" || norm === "done") {
    return {
      label: "Закрыт / Оплачен",
      bg: "bg-emerald-500/10",
      text: "text-emerald-600 dark:text-emerald-400 font-semibold",
      border: "border-emerald-500/30",
    };
  }
  // Safe default fallback
  return {
    label: "В работе",
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400 font-semibold",
    border: "border-amber-500/30",
  };
}

/**
 * Deep normalizer for any RepairOrder object coming from AI chat, Supabase, or localStorage.
 * Guarantees zero null/undefined crashes.
 */
export function normalizeRepairOrder(raw: any, username?: string): RepairOrder {
  if (!raw || typeof raw !== "object") {
    raw = {};
  }

  const rawStatus = String(raw.status || "in_progress").toLowerCase();
  let status: OrderStatus = "in_progress";
  if (["estimate", "in_progress", "parts_waiting", "ready", "closed"].includes(rawStatus)) {
    status = rawStatus as OrderStatus;
  }

  const safeWorks: OrderWorkItem[] = Array.isArray(raw.works)
    ? raw.works.map((w: any, idx: number) => ({
        id: String(w?.id || `w-${idx + 1}`),
        name: String(w?.name || "Слесарные работы"),
        mechanic: String(w?.mechanic || w?.mechanicName || "Водоватовский А.И."),
        laborHours: Number(w?.laborHours ?? w?.hours) || 1,
        ratePerHour: Number(w?.ratePerHour ?? w?.hourlyRate ?? w?.rate) || 2500,
        discountPercent: Number(w?.discountPercent) || 0,
        total:
          Number(w?.total) ||
          Math.round(
            (Number(w?.laborHours ?? w?.hours) || 1) *
              (Number(w?.ratePerHour ?? w?.hourlyRate ?? w?.rate) || 2500) *
              Math.max(0, 1 - (Number(w?.discountPercent) || 0) / 100)
          ),
      }))
    : [];

  const safeParts: OrderPartItem[] = Array.isArray(raw.parts)
    ? raw.parts.map((p: any, idx: number) => ({
        id: String(p?.id || `p-${idx + 1}`),
        oem: String(p?.oem || p?.sku || "OEM").toUpperCase(),
        name: String(p?.name || "Автозапчасть"),
        qty: Number(p?.qty ?? p?.quantity) || 1,
        unit: String(p?.unit || "шт"),
        purchasePrice: Number(p?.purchasePrice ?? p?.price) || 0,
        salePrice: Number(p?.salePrice ?? p?.price) || 0,
        total: Number(p?.total) || (Number(p?.qty ?? p?.quantity) || 1) * (Number(p?.salePrice ?? p?.price) || 0),
      }))
    : [];

  const totals = calculateOrderTotals(safeWorks, safeParts);

  const rawVehicle = raw.vehicle || {};
  const vehicle = {
    make: String(rawVehicle.make || "Автомобиль"),
    model: String(rawVehicle.model || ""),
    licensePlate: String(rawVehicle.licensePlate || rawVehicle.plate || "Б/Н").toUpperCase(),
    vin: String(rawVehicle.vin || "").toUpperCase(),
    year: Number(rawVehicle.year) || 2022,
    mileage: Number(rawVehicle.mileage) || 0,
    color: rawVehicle.color ? String(rawVehicle.color) : undefined,
    complaints: String(rawVehicle.complaints || raw.customerComplaint || "Диагностика и регламентное ТО"),
  };

  const rawClient = raw.client || {};
  const client = {
    id: rawClient.id ? String(rawClient.id) : undefined,
    type: (rawClient.type === "legal" || rawClient.type === "LEGAL" ? "legal" : "individual") as "individual" | "legal",
    name: String(rawClient.name || "Частный клиент"),
    phone: String(rawClient.phone || "+7 (900) 000-00-00"),
    inn: rawClient.inn ? String(rawClient.inn) : undefined,
    email: rawClient.email ? String(rawClient.email) : undefined,
    address: rawClient.address ? String(rawClient.address) : undefined,
  };

  const inspection = raw.inspection && typeof raw.inspection === "object"
    ? {
        vehicleBodyType: raw.inspection.vehicleBodyType === "van_truck" ? ("van_truck" as const) : ("car" as const),
        fuelLevel: raw.inspection.fuelLevel || ("1/2" as const),
        equipment: {
          sts: raw.inspection.equipment?.sts ?? true,
          keysCount: Number(raw.inspection.equipment?.keysCount) || 1,
          spareWheel: raw.inspection.equipment?.spareWheel ?? true,
          jack: raw.inspection.equipment?.jack ?? true,
          firstAidKit: raw.inspection.equipment?.firstAidKit ?? false,
          warningTriangle: raw.inspection.equipment?.warningTriangle ?? true,
          dashcam: raw.inspection.equipment?.dashcam ?? false,
        },
        isDirty: Boolean(raw.inspection.isDirty),
        damages: Array.isArray(raw.inspection.damages) ? raw.inspection.damages : [],
      }
    : {
        vehicleBodyType: "car" as const,
        fuelLevel: "1/2" as const,
        equipment: { sts: true, keysCount: 1, spareWheel: true, jack: true, firstAidKit: false, warningTriangle: true, dashcam: false },
        isDirty: false,
        damages: [],
      };

  return {
    id: String(raw.id || `ord-${Date.now()}`),
    orderNumber: String(raw.orderNumber || `ЗН-${new Date().getFullYear().toString().slice(-2)}/${Math.floor(1000 + Math.random() * 9000)}`),
    status,
    createdAt: String(raw.createdAt || new Date().toISOString().slice(0, 10)),
    closedAt: raw.closedAt ? String(raw.closedAt) : undefined,
    scheduledDate: raw.scheduledDate ? String(raw.scheduledDate) : undefined,
    scheduledTime: raw.scheduledTime ? String(raw.scheduledTime) : undefined,
    bayId: raw.bayId ? String(raw.bayId) : undefined,
    client,
    vehicle,
    works: safeWorks,
    parts: safeParts,
    inspection,
    recommendations: raw.recommendations ? String(raw.recommendations) : undefined,
    totalWorks: Number(raw.totalWorks ?? raw.worksTotal) || totals.totalWorks,
    totalParts: Number(raw.totalParts ?? raw.partsTotal) || totals.totalParts,
    grandTotal: Number(raw.grandTotal ?? raw.totalAmount) || totals.grandTotal,
    paidAmount: Number(raw.paidAmount ?? raw.grandTotal ?? raw.totalAmount) || totals.grandTotal,
    warrantyDaysWorks: Number(raw.warrantyDaysWorks) || 30,
    warrantyDaysParts: Number(raw.warrantyDaysParts) || 14,
    masterName: String(raw.masterName || "Водоватовский А.И."),
    username: String(raw.username || username || "admin"),
  };
}

/**
 * Converts a numeric ruble amount to Russian words format for official accounting documents.
 * Example: 15400 -> "Пятнадцать тысяч четыреста рублей 00 копеек"
 */
export function numberToWordsRu(amount: number): string {
  const num = Math.floor(Math.abs(amount || 0));
  const kopecks = Math.round((Math.abs(amount || 0) - num) * 100);
  const kopStr = (kopecks < 10 ? "0" : "") + kopecks + " коп.";

  if (num === 0) return `Ноль рублей ${kopStr}`;

  const unitsM = ["", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
  const unitsF = ["", "одна", "две", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
  const teens = ["десять", "одиннадцать", "двенадцать", "тринадцать", "четырнадцать", "пятнадцать", "шестнадцать", "семнадцать", "восемнадцать", "девятнадцать"];
  const tens = ["", "", "двадцать", "тридцать", "сорок", "пятьдесят", "шестьдесят", "семьдесят", "восемьдесят", "девяносто"];
  const hundreds = ["", "сто", "двести", "триста", "четыреста", "пятьсот", "шестьсот", "семьсот", "восемьсот", "девятьсот"];

  function triToWords(tri: number, isFem: boolean): string {
    const h = Math.floor(tri / 100);
    const t = Math.floor((tri % 100) / 10);
    const u = tri % 10;
    const parts: string[] = [];
    if (h > 0) parts.push(hundreds[h]);
    if (t === 1) {
      parts.push(teens[u]);
    } else {
      if (t > 1) parts.push(tens[t]);
      if (u > 0) parts.push(isFem ? unitsF[u] : unitsM[u]);
    }
    return parts.join(" ");
  }

  function declension(n: number, one: string, two: string, five: string): string {
    const n100 = n % 100;
    const n10 = n % 10;
    if (n100 >= 11 && n100 <= 19) return five;
    if (n10 === 1) return one;
    if (n10 >= 2 && n10 <= 4) return two;
    return five;
  }

  const millions = Math.floor(num / 1000000);
  const thousands = Math.floor((num % 1000000) / 1000);
  const remainder = num % 1000;

  const resultParts: string[] = [];
  if (millions > 0) {
    resultParts.push(triToWords(millions, false));
    resultParts.push(declension(millions, "миллион", "миллиона", "миллионов"));
  }
  if (thousands > 0) {
    resultParts.push(triToWords(thousands, true));
    resultParts.push(declension(thousands, "тысяча", "тысячи", "тысяч"));
  }
  if (remainder > 0 || resultParts.length === 0) {
    resultParts.push(triToWords(remainder, false));
  }

  const rubWord = declension(num, "рубль", "рубля", "рублей");
  const fullText = resultParts.filter(Boolean).join(" ").trim() + " " + rubWord + " " + kopStr;
  return fullText.charAt(0).toUpperCase() + fullText.slice(1);
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

export function calculateMasterPayroll(
  orders: RepairOrder[],
  employees: ServiceEmployee[],
  options?: {
    periodFilter?: "today" | "week" | "month" | "all" | "custom";
    startDate?: string;
    endDate?: string;
    statusFilter?: "closed_only" | "all_active";
    masterFilter?: string;
    manualAdjustments?: Record<string, { bonus: number; deduction: number; status: "pending" | "paid" }>;
  }
): {
  summaries: MasterPayrollSummary[];
  kpi: {
    totalLaborRevenue: number;
    totalLaborHours: number;
    totalPayrollFund: number;
    netMarginWorks: number;
  };
} {
  const safeOrders = Array.isArray(orders) ? orders : [];
  const safeEmployees = Array.isArray(employees) ? employees : [];
  if (safeEmployees.length === 0) {
    return {
      summaries: [],
      kpi: {
        totalLaborRevenue: 0,
        totalLaborHours: 0,
        totalPayrollFund: 0,
        netMarginWorks: 0,
      },
    };
  }
  const opts = options || {};
  const statusFilter = opts.statusFilter || "all_active";
  const periodFilter = opts.periodFilter || "month";
  const manualAdjustments = opts.manualAdjustments || {};

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  // Filter orders by status
  const statusFiltered = safeOrders.filter((ord) => {
    if (statusFilter === "closed_only") {
      return ord.status === "closed";
    }
    return ord.status !== "estimate";
  });

  // Filter orders by date
  const dateFiltered = statusFiltered.filter((ord) => {
    if (periodFilter === "all") return true;
    const orderDate = ord.createdAt?.slice(0, 10) || "";
    if (periodFilter === "today") {
      return orderDate === todayStr;
    }
    if (periodFilter === "week") {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
      return orderDate >= oneWeekAgo && orderDate <= todayStr;
    }
    if (periodFilter === "month") {
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
      return orderDate >= oneMonthAgo && orderDate <= todayStr;
    }
    if (periodFilter === "custom" && (opts.startDate || opts.endDate)) {
      if (opts.startDate && orderDate < opts.startDate) return false;
      if (opts.endDate && orderDate > opts.endDate) return false;
      return true;
    }
    return true;
  });

  const summaries: MasterPayrollSummary[] = safeEmployees.map((emp) => {
    const details: MasterPayrollWorkDetail[] = [];
    const matchedOrderIds = new Set<string>();

    let totalLaborHours = 0;
    let totalLaborRevenue = 0;
    let accruedLaborRub = 0;

    dateFiltered.forEach((ord) => {
      let orderHasEmpWorks = false;
      (ord.works || []).forEach((w) => {
        const wMech = (w.mechanic || "").trim().toLowerCase();
        const eName = emp.name.trim().toLowerCase();
        const eLastName = eName.split(" ")[0] || "";

        const isMatch =
          wMech === eName ||
          (eLastName.length > 2 && wMech.includes(eLastName)) ||
          wMech.startsWith(eLastName);

        if (isMatch) {
          orderHasEmpWorks = true;
          matchedOrderIds.add(ord.id);
          const workHours = Number(w.laborHours) || 0;
          const workTotal = Number(w.total) || 0;
          totalLaborHours += workHours;
          totalLaborRevenue += workTotal;

          let earned = 0;
          if (emp.paymentScheme === "percent_labor") {
            earned = Math.round(workTotal * ((emp.laborPercent || 40) / 100));
          } else if (emp.paymentScheme === "fixed_norm_hour") {
            earned = Math.round(workHours * (emp.normHourRate || 900));
          } else if (emp.paymentScheme === "combined") {
            earned = Math.round(workTotal * ((emp.laborPercent || 30) / 100));
          }
          accruedLaborRub += earned;

          details.push({
            orderId: ord.id,
            orderNumber: ord.orderNumber || "ЗН-—",
            date: ord.createdAt || todayStr,
            vehicle: `${ord.vehicle?.make || ""} ${ord.vehicle?.model || ""}`.trim() || "Автомобиль",
            licensePlate: ord.vehicle?.licensePlate || "—",
            clientName: ord.client?.name || "Частный клиент",
            workName: w.name || "Слесарные работы",
            laborHours: workHours,
            ratePerHour: Number(w.ratePerHour) || 2500,
            clientWorkTotal: workTotal,
            earnedRub: earned,
          });
        }
      });
    });

    let totalPartsRevenue = 0;
    if (emp.paymentScheme === "combined" && (emp.partsPercent || 0) > 0) {
      dateFiltered.forEach((ord) => {
        if (
          matchedOrderIds.has(ord.id) ||
          (emp.role === "master_receiver" && (ord.masterName || "").includes(emp.name.split(" ")[0]))
        ) {
          totalPartsRevenue += Number(ord.totalParts) || 0;
        }
      });
      const partsBonus = Math.round(totalPartsRevenue * ((emp.partsPercent || 0) / 100));
      accruedLaborRub += partsBonus;
    }

    const schemeLabels: Record<PaymentScheme, string> = {
      percent_labor: `${emp.laborPercent}% от стоимости работ`,
      fixed_norm_hour: `${emp.normHourRate} ₽ за 1 Н/Ч`,
      combined: `Оклад ${emp.baseSalary.toLocaleString()} ₽ + ${emp.laborPercent}% работ`,
    };

    const adj = manualAdjustments[emp.id] || { bonus: 0, deduction: 0, status: "pending" };
    const baseSal = emp.paymentScheme === "combined" ? emp.baseSalary : 0;
    const netPayout = Math.max(0, accruedLaborRub + baseSal + (adj.bonus || 0) - (adj.deduction || 0));

    return {
      employeeId: emp.id,
      employeeName: emp.name,
      role: emp.role,
      roleTitle: emp.roleTitle || emp.name,
      paymentScheme: emp.paymentScheme,
      paymentSchemeLabel: schemeLabels[emp.paymentScheme] || "Сдельная",
      ordersCount: matchedOrderIds.size,
      totalLaborHours: Math.round(totalLaborHours * 10) / 10,
      totalLaborRevenue,
      totalPartsRevenue,
      accruedLaborRub,
      baseSalary: baseSal,
      bonusRub: adj.bonus || 0,
      deductionRub: adj.deduction || 0,
      netPayoutRub: netPayout,
      status: adj.status || "pending",
      details,
    };
  });

  const filteredSummaries =
    opts.masterFilter && opts.masterFilter !== "all"
      ? summaries.filter((s) => s.employeeId === opts.masterFilter || s.employeeName === opts.masterFilter)
      : summaries;

  const totalLaborRevenue = filteredSummaries.reduce((sum, s) => sum + s.totalLaborRevenue, 0);
  const totalLaborHours = filteredSummaries.reduce((sum, s) => sum + s.totalLaborHours, 0);
  const totalPayrollFund = filteredSummaries.reduce((sum, s) => sum + s.netPayoutRub, 0);
  const netMarginWorks = Math.max(0, totalLaborRevenue - totalPayrollFund);

  return {
    summaries: filteredSummaries,
    kpi: {
      totalLaborRevenue,
      totalLaborHours: Math.round(totalLaborHours * 10) / 10,
      totalPayrollFund,
      netMarginWorks,
    },
  };
}
