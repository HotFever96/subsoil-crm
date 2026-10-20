"use client";

export type SupplierType =
  | "rossko"
  | "armtek"
  | "autodoc"
  | "berg"
  | "forum_auto"
  | "mikado"
  | "shate_m"
  | "custom_rest"
  | "warehouse";

export interface SupplierIntegrationConfig {
  id: string;
  supplier: SupplierType;
  name: string;
  description: string;
  enabled: boolean;
  apiKey1?: string;        // Rossko API Key 1
  apiKey2?: string;        // Rossko API Key 2
  deliveryAddress?: string; // Rossko client address code
  login?: string;          // Armtek login
  password?: string;       // Armtek password
  vkorg?: string;          // Armtek sales organization code (VKORG)
  apiToken?: string;       // Autodoc / Berg / Forum-Auto token
  endpointUrl?: string;    // Custom REST URL
  markupPercent?: number;  // Индивидуальная наценка на поставщика (%)
  isCustom?: boolean;
  username: string;
  updatedAt?: string;
}

export type PartQualityTier = "original" | "cross_premium" | "cross_economy";

export interface PartSearchResult {
  id: string;
  supplierId: SupplierType | string;
  supplierName: string;
  supplierBadgeColor: "red" | "blue" | "emerald" | "amber" | "purple" | "indigo" | "sky" | string;
  oem: string;
  brand: string;
  name: string;
  type: PartQualityTier;
  typeLabel: "Оригинал (OEM)" | "Премиум-аналог" | "Бюджетный аналог";
  stockQty: number;
  deliveryHours: number;    // 0 = в наличии, 4 = сегодня (4 ч), 24 = 1 день, 48 = 2 дня
  deliveryLabel: string;    // "В наличии (Сургут)", "Сегодня (4 ч)", "Завтра (1 дн.)", "2-3 дн."
  deliveryProbability: number; // e.g. 98, 95, 88
  purchasePrice: number;    // Оптовая цена закупки (₽)
  salePrice: number;        // Розничная цена для клиента (₽)
  marginAmount: number;     // Маржа СТО = salePrice - purchasePrice (₽)
  marginPercent: number;    // Наценка в %
  rating?: number;          // Рейтинг надежности производителя (1-5)
  isFastest?: boolean;      // ⚡ Экспресс-доставка
  isBestValue?: boolean;    // 🏆 Топ Цена / Качество
  isMaxMargin?: boolean;    // 💰 Максимальная маржа
  warehouseLocation?: string; // Локация на собственном складе
}

export interface PartsSearchQuery {
  query: string;
  vehicleVin?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  markupPercent?: number;
}

export interface PartsSearchResponse {
  success: boolean;
  query: string;
  detectedPart?: {
    oem: string;
    brand: string;
    name: string;
    vehicle?: string;
  };
  crossArticleList?: Array<{
    oem: string;
    brand: string;
    name: string;
    tier: PartQualityTier;
  }>;
  results: PartSearchResult[];
  recommendations: {
    fastest?: PartSearchResult;
    bestValue?: PartSearchResult;
    maxMargin?: PartSearchResult;
    aiSummary?: string;
  };
  providersQueried: string[];
  liveApiUsed: boolean;
  apiNotConfigured?: boolean;
  message?: string;
}
