import {
  SupplierIntegrationConfig,
  PartSearchResult,
  PartQualityTier,
} from "./parts-procurement-types";

export const DEFAULT_SUPPLIER_INTEGRATIONS: SupplierIntegrationConfig[] = [
  {
    id: "supp-rossko",
    supplier: "rossko",
    name: "Росско (Rossko)",
    description: "Крупнейший дистрибьютор в РФ и СНГ. Прямой доступ к региональным складам, экспресс-доставка.",
    enabled: true,
    apiKey1: "rk_live_89410f823a01",
    apiKey2: "rk_secret_7721a99d45",
    deliveryAddress: "г. Сургут, Нефтеюганское ш., 28/4 (Склад СТО)",
    markupPercent: 30,
    username: "admin",
  },
  {
    id: "supp-armtek",
    supplier: "armtek",
    name: "Армтек (Armtek)",
    description: "Оптовый поставщик автозапчастей для легкового и грузового транспорта. SOAP/REST API.",
    enabled: true,
    login: "CHAIKA_SURGUT",
    vkorg: "4001",
    markupPercent: 30,
    username: "admin",
  },
  {
    id: "supp-autodoc",
    supplier: "autodoc",
    name: "Автодок Опт (Autodoc)",
    description: "Федеральная сеть оптовых поставок, глубокая база кросс-номеров и заменителей.",
    enabled: true,
    apiToken: "atd_token_991823746a",
    markupPercent: 35,
    username: "admin",
  },
  {
    id: "supp-berg",
    supplier: "berg",
    name: "Берг Холдинг (Berg)",
    description: "Официальный дистрибьютор мировых брендов деталей подвески, тормозных систем и сцеплений.",
    enabled: true,
    apiToken: "berg_key_384710294b",
    markupPercent: 30,
    username: "admin",
  },
  {
    id: "supp-forum",
    supplier: "forum_auto",
    name: "Форум-Авто (Forum-Auto)",
    description: "Оптовый дистрибьютор автозапчастей и расходных материалов для автосервисов.",
    enabled: false,
    apiToken: "",
    markupPercent: 30,
    username: "admin",
  },
  {
    id: "supp-custom",
    supplier: "custom_rest",
    name: "Локальный поставщик (Custom REST)",
    description: "Подключение регионального оптового склада через собственный REST API шлюз.",
    enabled: false,
    endpointUrl: "https://api.local-parts-surgut.ru/v1/search",
    apiToken: "",
    markupPercent: 25,
    isCustom: true,
    username: "admin",
  },
];

export interface VehiclePartsCatalogItem {
  vehicle: string;
  keywords: string[];
  partName: string;
  oem: string;
  originalBrand: string;
  baseWholesalePrice: number;
  crosses: Array<{
    oem: string;
    brand: string;
    tier: PartQualityTier;
    priceMultiplier: number;
  }>;
}

export const KNOWN_PARTS_DATABASE: VehiclePartsCatalogItem[] = [
  // ГАЗЕЛЬ NEXT 2.8 CUMMINS
  {
    vehicle: "ГАЗ Газель Next 2.8 TD Cummins",
    keywords: ["сцепление", "комплект сцепления", "диск сцепления", "корзина сцепления", "выжимной", "маховик"],
    partName: "Комплект сцепления (корзина + диск + муфта)",
    oem: "3000951401",
    originalBrand: "Sachs (ГАЗ Оригинал)",
    baseWholesalePrice: 18500,
    crosses: [
      { oem: "624380109", brand: "Luk", tier: "cross_premium", priceMultiplier: 0.96 },
      { oem: "828062", brand: "Valeo", tier: "cross_premium", priceMultiplier: 0.88 },
      { oem: "CK9022", brand: "KraftTech", tier: "cross_economy", priceMultiplier: 0.65 },
      { oem: "M-4010", brand: "Trialli", tier: "cross_economy", priceMultiplier: 0.58 },
    ],
  },
  {
    vehicle: "ГАЗ Газель Next 2.8 TD Cummins",
    keywords: ["колодки", "передние колодки", "тормозные колодки", "колодки передние"],
    partName: "Комплект передних тормозных колодок",
    oem: "A21R23-3501170",
    originalBrand: "ГАЗ Оригинал",
    baseWholesalePrice: 2200,
    crosses: [
      { oem: "GDB2084", brand: "TRW", tier: "cross_premium", priceMultiplier: 1.25 },
      { oem: "0986494720", brand: "Bosch", tier: "cross_premium", priceMultiplier: 1.15 },
      { oem: "M2620101", brand: "Marshall", tier: "cross_economy", priceMultiplier: 0.78 },
      { oem: "BP43015", brand: "Fenox", tier: "cross_economy", priceMultiplier: 0.62 },
    ],
  },
  {
    vehicle: "ГАЗ Газель Next 2.8 TD Cummins",
    keywords: ["фильтр масляный", "масляный фильтр", "фильтр масла", "маслофильтр"],
    partName: "Фильтр масляный ДВС Cummins ISF 2.8",
    oem: "LF16015",
    originalBrand: "Fleetguard (Оригинал Cummins)",
    baseWholesalePrice: 850,
    crosses: [
      { oem: "W940/66", brand: "Mann-Filter", tier: "cross_premium", priceMultiplier: 1.1 },
      { oem: "OC1050", brand: "Mahle", tier: "cross_premium", priceMultiplier: 0.98 },
      { oem: "OG218", brand: "Filtron", tier: "cross_economy", priceMultiplier: 0.65 },
      { oem: "GB1175", brand: "Big Filter", tier: "cross_economy", priceMultiplier: 0.48 },
    ],
  },
  {
    vehicle: "ГАЗ Газель Next 2.8 TD Cummins",
    keywords: ["водяной насос", "помпа", "насос охлаждающей жидкости", "помпа водяная"],
    partName: "Насос водяной (помпа) Cummins ISF 2.8",
    oem: "5269784",
    originalBrand: "Cummins Оригинал",
    baseWholesalePrice: 5900,
    crosses: [
      { oem: "VKPC98004", brand: "SKF", tier: "cross_premium", priceMultiplier: 1.12 },
      { oem: "LWP0328", brand: "Luzar", tier: "cross_premium", priceMultiplier: 0.72 },
      { oem: "HB0328", brand: "Fenox", tier: "cross_economy", priceMultiplier: 0.52 },
    ],
  },

  // КАМАЗ 65115 / 6520
  {
    vehicle: "КАМАЗ 65115 / 6520",
    keywords: ["сцепление камаз", "сцепление сакс", "комплект сцепления камаз", "sachs 430", "mfz430"],
    partName: "Комплект сцепления КАМАЗ MFZ-430 (дв. Cummins/740)",
    oem: "3400700645",
    originalBrand: "Sachs (Оригинал КАМАЗ)",
    baseWholesalePrice: 46000,
    crosses: [
      { oem: "643328500", brand: "Luk RepSet Pro", tier: "cross_premium", priceMultiplier: 0.94 },
      { oem: "827110", brand: "Valeo Truck", tier: "cross_premium", priceMultiplier: 0.89 },
      { oem: "M-90430", brand: "Hammer Kupplungen", tier: "cross_economy", priceMultiplier: 0.68 },
      { oem: "E.430.01", brand: "E.Technic", tier: "cross_economy", priceMultiplier: 0.58 },
    ],
  },
  {
    vehicle: "КАМАЗ 65115 / 6520",
    keywords: ["фильтр масляный камаз", "масляный фильтр камаз", "фильтр масла камаз евро-3", "евро 3"],
    partName: "Фильтр масляный КАМАЗ Евро-3 / Евро-4",
    oem: "7405-1017040",
    originalBrand: "КАМАЗ Оригинал",
    baseWholesalePrice: 620,
    crosses: [
      { oem: "WP11102", brand: "Mann-Filter", tier: "cross_premium", priceMultiplier: 1.6 },
      { oem: "LF16110", brand: "Fleetguard", tier: "cross_premium", priceMultiplier: 1.35 },
      { oem: "DIFA5101", brand: "ДИФА", tier: "cross_economy", priceMultiplier: 0.7 },
      { oem: "GB1184", brand: "Big Filter", tier: "cross_economy", priceMultiplier: 0.55 },
    ],
  },
  {
    vehicle: "КАМАЗ 65115 / 6520",
    keywords: ["тормозные накладки", "колодки камаз", "накладка тормозная 6520", "53205-3501105"],
    partName: "Комплект тормозных накладок (сверленые с заклепками) 1 ось",
    oem: "53205-3501105",
    originalBrand: "КАМАЗ Оригинал (ТИИР)",
    baseWholesalePrice: 3800,
    crosses: [
      { oem: "WVA19094", brand: "Beral (Federal Mogul)", tier: "cross_premium", priceMultiplier: 1.45 },
      { oem: "TR-19094", brand: "Tribo", tier: "cross_premium", priceMultiplier: 1.1 },
      { oem: "MK-3501", brand: "Маршал", tier: "cross_economy", priceMultiplier: 0.75 },
      { oem: "URAL-1105", brand: "УралАТИ", tier: "cross_economy", priceMultiplier: 0.65 },
    ],
  },
  {
    vehicle: "КАМАЗ 65115 / 6520",
    keywords: ["кран тормозной", "тормозной кран", "кран пневматический", "wmc-89410"],
    partName: "Кран тормозной двухсекционный пневматический",
    oem: "WMC-89410",
    originalBrand: "Wabco Оригинал",
    baseWholesalePrice: 7800,
    crosses: [
      { oem: "K000451", brand: "Knorr-Bremse", tier: "cross_premium", priceMultiplier: 1.2 },
      { oem: "PA-8941", brand: "Полтрак", tier: "cross_economy", priceMultiplier: 0.6 },
      { oem: "BEL-3514", brand: "БелОМО", tier: "cross_economy", priceMultiplier: 0.52 },
    ],
  },

  // УАЗ ПАТРИОТ / ПРОФИ (ZMZ PRO)
  {
    vehicle: "УАЗ Патриот / Профи (ЗМЗ Про 2.7)",
    keywords: ["радиатор", "радиатор охлаждения", "радиатор уаз", "радиатор уаз профи", "3163-1301012"],
    partName: "Радиатор охлаждения двигателя алюминиевый паяный",
    oem: "3163-1301012-00",
    originalBrand: "УАЗ Оригинал",
    baseWholesalePrice: 12800,
    crosses: [
      { oem: "LRc 0363", brand: "Luzar", tier: "cross_premium", priceMultiplier: 0.74 },
      { oem: "CR-03163", brand: "STRON", tier: "cross_premium", priceMultiplier: 0.82 },
      { oem: "BTL-0063R", brand: "Bautler", tier: "cross_economy", priceMultiplier: 0.54 },
      { oem: "PO-3163", brand: "ПОАР", tier: "cross_economy", priceMultiplier: 0.48 },
    ],
  },
  {
    vehicle: "УАЗ Патриот / Профи (ЗМЗ Про 2.7)",
    keywords: ["кардан", "карданный вал", "кардан задний уаз"],
    partName: "Вал карданный задний необслуживаемый (прямой)",
    oem: "3163-2201010-10",
    originalBrand: "УАЗ Оригинал (Автодеталь)",
    baseWholesalePrice: 14200,
    crosses: [
      { oem: "TIS-2201", brand: "Tirsan Kardan", tier: "cross_premium", priceMultiplier: 1.15 },
      { oem: "RED-3163", brand: "РЕД", tier: "cross_economy", priceMultiplier: 0.68 },
    ],
  },

  // TOYOTA LAND CRUISER 200 / PRADO / HILUX
  {
    vehicle: "Toyota Land Cruiser 200 / Hilux / Prado",
    keywords: ["тормозные диски", "диски передние", "диски тормозные toyota", "04465-60280"],
    partName: "Комплект передних тормозных колодок Toyota LC200 / Prado",
    oem: "04465-60280",
    originalBrand: "Toyota Оригинал (Advics)",
    baseWholesalePrice: 6500,
    crosses: [
      { oem: "SN119P", brand: "Advics", tier: "cross_premium", priceMultiplier: 0.78 },
      { oem: "P83102", brand: "Brembo", tier: "cross_premium", priceMultiplier: 0.72 },
      { oem: "GDB3425", brand: "TRW", tier: "cross_premium", priceMultiplier: 0.68 },
      { oem: "SP1482", brand: "Hi-Q (Sangsin)", tier: "cross_economy", priceMultiplier: 0.42 },
      { oem: "PN1522", brand: "NiBK", tier: "cross_economy", priceMultiplier: 0.52 },
    ],
  },
  {
    vehicle: "Toyota Land Cruiser 200 / Hilux / Prado",
    keywords: ["масляный фильтр тойота", "04152-38010", "фильтр масляный lc200", "фильтр hilux"],
    partName: "Картридж масляного фильтра ДВС Toyota 1VD-FTV / 1GR-FE",
    oem: "04152-38010",
    originalBrand: "Toyota Оригинал (Denso)",
    baseWholesalePrice: 950,
    crosses: [
      { oem: "HU7019Z", brand: "Mann-Filter", tier: "cross_premium", priceMultiplier: 0.95 },
      { oem: "OX554D", brand: "Mahle", tier: "cross_premium", priceMultiplier: 0.88 },
      { oem: "OE685/2", brand: "Filtron", tier: "cross_economy", priceMultiplier: 0.52 },
      { oem: "C-114", brand: "Vic", tier: "cross_economy", priceMultiplier: 0.58 },
    ],
  },
];

export function findCatalogMatches(query: string): VehiclePartsCatalogItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  // Match by exact or partial OEM
  const cleanQ = q.replace(/[^a-z0-9а-яё\-]/gi, "");

  const exactOemMatches = KNOWN_PARTS_DATABASE.filter((item) => {
    const itemOemClean = item.oem.replace(/[^a-z0-9а-яё\-]/gi, "").toLowerCase();
    if (itemOemClean.includes(cleanQ) || cleanQ.includes(itemOemClean)) return true;
    return item.crosses.some((c) => {
      const cOemClean = c.oem.replace(/[^a-z0-9а-яё\-]/gi, "").toLowerCase();
      return cOemClean.includes(cleanQ) || cleanQ.includes(cOemClean);
    });
  });

  if (exactOemMatches.length > 0) return exactOemMatches;

  // Match by keywords / part name / vehicle
  const keywordMatches = KNOWN_PARTS_DATABASE.filter((item) => {
    const vehicleLower = item.vehicle.toLowerCase();
    const nameLower = item.partName.toLowerCase();
    const words = q.split(/\s+/).filter((w) => w.length > 2);

    let score = 0;
    words.forEach((w) => {
      if (vehicleLower.includes(w)) score += 3;
      if (nameLower.includes(w)) score += 4;
      if (item.keywords.some((kw) => kw.includes(w))) score += 5;
    });

    return score >= 3;
  });

  return keywordMatches.length > 0 ? keywordMatches : [KNOWN_PARTS_DATABASE[0]];
}

export function generateSupplierQuotes(
  catalogItem: VehiclePartsCatalogItem,
  markupPercent: number = 30
): PartSearchResult[] {
  const results: PartSearchResult[] = [];

  const addQuote = (
    supplierId: string,
    supplierName: string,
    badgeColor: string,
    oem: string,
    brand: string,
    name: string,
    type: PartQualityTier,
    typeLabel: "Оригинал (OEM)" | "Премиум-аналог" | "Бюджетный аналог",
    purchasePrice: number,
    deliveryHours: number,
    deliveryLabel: string,
    stockQty: number,
    deliveryProbability: number,
    rating: number = 5,
    warehouseLocation?: string
  ) => {
    const roundedPurchase = Math.round(purchasePrice);
    const salePrice = Math.round(roundedPurchase * (1 + markupPercent / 100));
    const marginAmount = salePrice - roundedPurchase;

    results.push({
      id: `res-${supplierId}-${oem}-${Math.random().toString(36).slice(2, 6)}`,
      supplierId,
      supplierName,
      supplierBadgeColor: badgeColor,
      oem,
      brand,
      name,
      type,
      typeLabel,
      stockQty,
      deliveryHours,
      deliveryLabel,
      deliveryProbability,
      purchasePrice: roundedPurchase,
      salePrice,
      marginAmount,
      marginPercent: markupPercent,
      rating,
      warehouseLocation,
    });
  };

  // 1. Warehouse quote (In-stock in our local service shop)
  addQuote(
    "warehouse",
    "Свой склад (СТО)",
    "emerald",
    catalogItem.oem,
    catalogItem.originalBrand.split(" ")[0],
    catalogItem.partName,
    "original",
    "Оригинал (OEM)",
    catalogItem.baseWholesalePrice * 0.95,
    0,
    "В наличии (Стеллаж А-12)",
    3,
    100,
    5,
    "Стеллаж А-12"
  );

  // 2. Rossko quotes (Primary distributor)
  addQuote(
    "rossko",
    "Росско (Rossko)",
    "red",
    catalogItem.oem,
    catalogItem.originalBrand,
    catalogItem.partName,
    "original",
    "Оригинал (OEM)",
    catalogItem.baseWholesalePrice,
    4,
    "Сегодня (экспресс 4 ч)",
    18,
    98,
    5
  );

  if (catalogItem.crosses[0]) {
    const c = catalogItem.crosses[0];
    addQuote(
      "rossko",
      "Росско (Rossko)",
      "red",
      c.oem,
      c.brand,
      `${catalogItem.partName} (${c.brand})`,
      c.tier,
      c.tier === "cross_premium" ? "Премиум-аналог" : "Бюджетный аналог",
      catalogItem.baseWholesalePrice * c.priceMultiplier,
      24,
      "Завтра (1 день)",
      12,
      96,
      c.tier === "cross_premium" ? 5 : 4
    );
  }

  // 3. Armtek quotes
  if (catalogItem.crosses[1]) {
    const c = catalogItem.crosses[1];
    addQuote(
      "armtek",
      "Армтек (Armtek)",
      "purple",
      c.oem,
      c.brand,
      `${catalogItem.partName} (${c.brand})`,
      c.tier,
      c.tier === "cross_premium" ? "Премиум-аналог" : "Бюджетный аналог",
      catalogItem.baseWholesalePrice * c.priceMultiplier * 0.98,
      24,
      "Завтра к 10:00 (1 дн.)",
      25,
      95,
      4
    );
  }

  // 4. Autodoc quotes
  addQuote(
    "autodoc",
    "Автодок (Autodoc)",
    "blue",
    catalogItem.oem,
    catalogItem.originalBrand,
    catalogItem.partName,
    "original",
    "Оригинал (OEM)",
    catalogItem.baseWholesalePrice * 1.02,
    24,
    "Завтра (1 день)",
    34,
    97,
    5
  );

  if (catalogItem.crosses[2]) {
    const c = catalogItem.crosses[2];
    addQuote(
      "autodoc",
      "Автодок (Autodoc)",
      "blue",
      c.oem,
      c.brand,
      `${catalogItem.partName} (${c.brand})`,
      c.tier,
      c.tier === "cross_premium" ? "Премиум-аналог" : "Бюджетный аналог",
      catalogItem.baseWholesalePrice * c.priceMultiplier * 0.95,
      48,
      "2-3 дня",
      40,
      91,
      3
    );
  }

  // 5. Berg quotes
  if (catalogItem.crosses[0]) {
    const c = catalogItem.crosses[0];
    addQuote(
      "berg",
      "Берг Холдинг",
      "amber",
      c.oem,
      c.brand,
      `${catalogItem.partName} (${c.brand})`,
      c.tier,
      c.tier === "cross_premium" ? "Премиум-аналог" : "Бюджетный аналог",
      catalogItem.baseWholesalePrice * c.priceMultiplier * 1.01,
      24,
      "Завтра (1 день)",
      7,
      94,
      5
    );
  }

  // 6. Forum-Auto quotes (Budget options)
  const budgetCross = catalogItem.crosses.find((c) => c.tier === "cross_economy") || catalogItem.crosses[catalogItem.crosses.length - 1];
  if (budgetCross) {
    addQuote(
      "forum_auto",
      "Форум-Авто",
      "indigo",
      budgetCross.oem,
      budgetCross.brand,
      `${catalogItem.partName} (${budgetCross.brand})`,
      "cross_economy",
      "Бюджетный аналог",
      catalogItem.baseWholesalePrice * budgetCross.priceMultiplier * 0.92,
      24,
      "Завтра (1 день)",
      15,
      89,
      3
    );
  }

  // Compute recommendations
  // 1) Fastest: min delivery hours
  const sortedByHours = [...results].sort((a, b) => a.deliveryHours - b.deliveryHours || a.purchasePrice - b.purchasePrice);
  if (sortedByHours[0]) sortedByHours[0].isFastest = true;

  // 2) Best Value: premium or original with best balance
  const bestValueCandidates = results.filter((r) => r.type === "cross_premium" || r.type === "original");
  const sortedByValue = [...bestValueCandidates].sort((a, b) => a.purchasePrice - b.purchasePrice);
  if (sortedByValue[0]) sortedByValue[0].isBestValue = true;

  // 3) Max Margin: lowest purchase price with reasonable delivery
  const sortedByPrice = [...results].sort((a, b) => a.purchasePrice - b.purchasePrice);
  if (sortedByPrice[0]) sortedByPrice[0].isMaxMargin = true;

  return results;
}
