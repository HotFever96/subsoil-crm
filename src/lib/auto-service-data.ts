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
} from "./auto-service-types";

export const SERVICE_COMPANY_REQUISITES = {
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
};

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

export function getInitialOrders(username: string): RepairOrder[] {
  const norm = (username || "").trim().toLowerCase();
  const today = new Date().toISOString().slice(0, 10);

  if (norm === "antonv") {
    const works1: OrderWorkItem[] = [
      {
        id: "w-1",
        name: "Диагностика тормозной системы пневматической",
        mechanic: "Кузнецов П.А.",
        laborHours: 1.2,
        ratePerHour: 2600,
        discountPercent: 0,
        total: 3120,
      },
      {
        id: "w-2",
        name: "Замена тормозного крана рабочего",
        mechanic: "Кузнецов П.А.",
        laborHours: 2.5,
        ratePerHour: 2600,
        discountPercent: 5,
        total: 6175,
      },
    ];
    const parts1: OrderPartItem[] = [
      {
        id: "p-1",
        oem: "WMC-89410",
        name: "Кран тормозной двухсекционный",
        qty: 1,
        unit: "шт",
        purchasePrice: 6800,
        salePrice: 9400,
        total: 9400,
      },
    ];
    const totals1 = calculateOrderTotals(works1, parts1);

    return [
      {
        id: "ord-anton-1",
        orderNumber: "ЗН-СЕВ-0012",
        status: "in_progress",
        createdAt: today,
        scheduledDate: today,
        scheduledTime: "10:00",
        bayId: "bay-2",
        client: {
          type: "legal",
          name: "ИП Николаев В.С.",
          phone: "+7 (922) 456-78-90",
          inn: "890401824750",
          address: "г. Новый Уренгой, ул. Промысловая, 12",
        },
        vehicle: {
          make: "ГАЗ",
          model: "Газон Next C41R13",
          licensePlate: "Т321УУ89",
          vin: "X96C41R13P0987654",
          year: 2022,
          mileage: 84300,
          color: "Белый",
          complaints: "Шипение воздуха при торможении, падение давления во 2-м контуре",
        },
        works: works1,
        parts: parts1,
        recommendations: "Рекомендуется проверить состояние энергоаккумуляторов задней оси",
        ...totals1,
        warrantyDaysWorks: 30,
        warrantyDaysParts: 14,
        masterName: "Королев С.В.",
        username: "antonv",
      },
    ];
  }

  // Default ADMIN dataset (Realistic full shop load)
  const worksAdmin1: OrderWorkItem[] = [
    {
      id: "w-101",
      name: "Замена передних тормозных колодок (дисковые)",
      mechanic: "Иванов М.С.",
      laborHours: 1.5,
      ratePerHour: 2500,
      discountPercent: 0,
      total: 3750,
    },
    {
      id: "w-102",
      name: "Техническое обслуживание ТО-3 с диагностикой ходовой части",
      mechanic: "Иванов М.С.",
      laborHours: 2.0,
      ratePerHour: 2500,
      discountPercent: 0,
      total: 5000,
    },
  ];

  const partsAdmin1: OrderPartItem[] = [
    {
      id: "p-101",
      oem: "C30130",
      name: "Колодки тормозные передние Газель Next (комплект)",
      qty: 1,
      unit: "компл",
      purchasePrice: 2100,
      salePrice: 3200,
      total: 3200,
    },
    {
      id: "p-102",
      oem: "504091562",
      name: "Фильтр масляный Cummins ISF 2.8",
      qty: 1,
      unit: "шт",
      purchasePrice: 580,
      salePrice: 950,
      total: 950,
    },
    {
      id: "p-103",
      oem: "OIL-LUK-10W40",
      name: "Масло моторное Лукойл Авангард Профессионал 10W-40",
      qty: 6,
      unit: "л",
      purchasePrice: 420,
      salePrice: 650,
      total: 3900,
    },
  ];

  const totalsAdmin1 = calculateOrderTotals(worksAdmin1, partsAdmin1);

  const worksAdmin2: OrderWorkItem[] = [
    {
      id: "w-201",
      name: "Снятие и установка коробки передач ZF 9S1310",
      mechanic: "Сидоров Д.А.",
      laborHours: 7.2,
      ratePerHour: 2800,
      discountPercent: 0,
      total: 20160,
    },
    {
      id: "w-202",
      name: "Замена комплекта сцепления и выжимного подшипника",
      mechanic: "Сидоров Д.А.",
      laborHours: 2.5,
      ratePerHour: 2800,
      discountPercent: 0,
      total: 7000,
    },
  ];

  const partsAdmin2: OrderPartItem[] = [
    {
      id: "p-201",
      oem: "3400700645",
      name: "Комплект сцепления Sachs MFZ 430 КАМАЗ",
      qty: 1,
      unit: "компл",
      purchasePrice: 31000,
      salePrice: 42000,
      total: 42000,
    },
    {
      id: "p-202",
      oem: "3151000157",
      name: "Подшипник выжимной гидравлический ZF",
      qty: 1,
      unit: "шт",
      purchasePrice: 4800,
      salePrice: 6500,
      total: 6500,
    },
  ];

  const totalsAdmin2 = calculateOrderTotals(worksAdmin2, partsAdmin2);

  return [
    {
      id: "ord-admin-1",
      orderNumber: "ЗН-2026-0042",
      status: "in_progress",
      createdAt: today,
      scheduledDate: today,
      scheduledTime: "09:00",
      bayId: "bay-1",
      client: {
        type: "legal",
        name: "ИП Смирнов А.В.",
        phone: "+7 (912) 345-67-89",
        inn: "860109284712",
        email: "smirnov.trans@mail.ru",
        address: "г. Сургут, ул. Инженерная, 15",
      },
      vehicle: {
        make: "ГАЗ",
        model: "Газель Next",
        licensePlate: "В456ОР89",
        vin: "X96A21R22P0123456",
        year: 2023,
        mileage: 68400,
        color: "Серый металлик",
        complaints: "Скрежет при торможении на спуске, плановое ТО-3, замена фильтров",
      },
      works: worksAdmin1,
      parts: partsAdmin1,
      recommendations: "Рекомендуется проточка тормозных дисков при следующей замене колодок.",
      ...totalsAdmin1,
      paidAmount: 0,
      warrantyDaysWorks: 30,
      warrantyDaysParts: 14,
      masterName: SERVICE_COMPANY_REQUISITES.masterReceiver,
      username: "admin",
    },
    {
      id: "ord-admin-2",
      orderNumber: "ЗН-2026-0041",
      status: "ready",
      createdAt: "2026-10-18",
      scheduledDate: "2026-10-18",
      scheduledTime: "11:30",
      bayId: "bay-2",
      client: {
        type: "legal",
        name: "ООО «Ханты-ТрансСервис»",
        phone: "+7 (3462) 55-44-33",
        inn: "8601045231",
        email: "hts-ugra@bk.ru",
        address: "г. Ханты-Мансийск, ул. Заводская, 4",
      },
      vehicle: {
        make: "КАМАЗ",
        model: "65115 (Самосвал)",
        licensePlate: "К789ММ86",
        vin: "XTC651150K1234987",
        year: 2021,
        mileage: 142000,
        color: "Оранжевый",
        complaints: "Затрудненное включение передач, пробуксовка сцепления под нагрузкой в карьере",
      },
      works: worksAdmin2,
      parts: partsAdmin2,
      recommendations: "Проверить уровень масла в раздаточной коробке через 1000 км.",
      ...totalsAdmin2,
      paidAmount: totalsAdmin2.grandTotal,
      warrantyDaysWorks: 30,
      warrantyDaysParts: 30,
      masterName: SERVICE_COMPANY_REQUISITES.masterReceiver,
      username: "admin",
    },
    {
      id: "ord-admin-3",
      orderNumber: "ЗН-2026-0043",
      status: "estimate",
      createdAt: today,
      scheduledDate: today,
      scheduledTime: "14:00",
      bayId: "bay-3",
      client: {
        type: "individual",
        name: "Ковалев Сергей Дмитриевич",
        phone: "+7 (908) 880-12-34",
      },
      vehicle: {
        make: "Toyota",
        model: "Hilux 2.8 D-4D",
        licensePlate: "Е123КХ89",
        vin: "AHTBA3CD201298451",
        year: 2020,
        mileage: 92000,
        color: "Черный",
        complaints: "Вибрация на скорости 90 км/ч, стук в передней подвеске слева при проезде неровностей",
      },
      works: [
        {
          id: "w-301",
          name: "Комплексная диагностика ходовой части и рулевого управления",
          mechanic: "Иванов М.С.",
          laborHours: 0.8,
          ratePerHour: 2500,
          discountPercent: 0,
          total: 2000,
        },
      ],
      parts: [],
      totalWorks: 2000,
      totalParts: 0,
      grandTotal: 2000,
      warrantyDaysWorks: 30,
      warrantyDaysParts: 14,
      masterName: SERVICE_COMPANY_REQUISITES.masterReceiver,
      username: "admin",
    },
  ];
}

export function getInitialWarehouse(username: string): WarehousePart[] {
  const norm = (username || "").trim().toLowerCase();

  return [
    {
      id: "wh-1",
      oem: "504091562",
      name: "Фильтр масляный Cummins ISF 2.8 Газель Next",
      category: "Фильтры",
      quantity: 14,
      minQuantity: 5,
      unit: "шт",
      purchasePrice: 580,
      salePrice: 950,
      location: "Стеллаж А-1",
      username: norm,
    },
    {
      id: "wh-2",
      oem: "C30130",
      name: "Колодки тормозные передние Газель Next",
      category: "Тормозная система",
      quantity: 8,
      minQuantity: 4,
      unit: "компл",
      purchasePrice: 2100,
      salePrice: 3200,
      location: "Стеллаж Б-3",
      username: norm,
    },
    {
      id: "wh-3",
      oem: "OIL-LUK-10W40",
      name: "Масло моторное Лукойл Авангард Профессионал 10W-40 (бочка)",
      category: "Масла и техжидкости",
      quantity: 120,
      minQuantity: 40,
      unit: "л",
      purchasePrice: 420,
      salePrice: 650,
      location: "Зона ГСМ",
      username: norm,
    },
    {
      id: "wh-4",
      oem: "3400700645",
      name: "Комплект сцепления Sachs MFZ 430 КАМАЗ",
      category: "Трансмиссия",
      quantity: 2,
      minQuantity: 2,
      unit: "компл",
      purchasePrice: 31000,
      salePrice: 42000,
      location: "Стеллаж Д-1",
      username: norm,
    },
    {
      id: "wh-5",
      oem: "FILT-AIR-65115",
      name: "Фильтр воздушный КАМАЗ 65115 (элемент)",
      category: "Фильтры",
      quantity: 3,
      minQuantity: 5, // ДЕФИЦИТ
      unit: "шт",
      purchasePrice: 1400,
      salePrice: 2100,
      location: "Стеллаж А-4",
      username: norm,
    },
    {
      id: "wh-6",
      oem: "ANTIFR-RED-G12",
      name: "Антифриз Sintec LUX G12+ Красный",
      category: "Масла и техжидкости",
      quantity: 45,
      minQuantity: 20,
      unit: "л",
      purchasePrice: 190,
      salePrice: 310,
      location: "Зона ГСМ",
      username: norm,
    },
  ];
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
