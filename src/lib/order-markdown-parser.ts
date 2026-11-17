import { RepairOrder, OrderWorkItem, OrderPartItem } from "./auto-service-types";
import { normalizeRepairOrder } from "./auto-service-data";

export function isOrderCreationRequest(text: string): boolean {
  if (!text) return false;
  const t = text.toLowerCase();
  const hasOrderWord =
    t.includes("заказ-наряд") ||
    t.includes("заказ наряд") ||
    t.includes("зн") ||
    t.includes("наряд") ||
    t.includes("ордер") ||
    t.includes("дефектовк");
  const hasActionWord =
    t.includes("создай") ||
    t.includes("оформи") ||
    t.includes("открой") ||
    t.includes("сделай") ||
    t.includes("рассчитай") ||
    t.includes("посчитай") ||
    t.includes("выпиши") ||
    t.includes("принял") ||
    t.includes("оформляю") ||
    t.includes("создаю");
  const hasTablePattern =
    t.includes("| автомобиль") ||
    t.includes("| госномер") ||
    t.includes("работы") ||
    t.includes("запчасти") ||
    t.includes("таблица (") ||
    t.includes("заказ-наряд зн-") ||
    t.includes("заказ наряд зн-");

  return (hasOrderWord && (hasActionWord || hasTablePattern)) || hasTablePattern;
}

export function extractRepairOrderFromText(
  assistantText: string,
  userText: string = "",
  username: string = "admin"
): RepairOrder | null {
  const combined = `${userText}\n${assistantText}`;
  if (!isOrderCreationRequest(combined)) {
    return null;
  }

  // 1. Order Number: e.g. ЗН-26/1047, ЗН-26/1045, ЗН-2026-0042
  let orderNumber = `ЗН-${new Date().getFullYear().toString().slice(-2)}/${Math.floor(1000 + Math.random() * 9000)}`;
  const orderNumMatch =
    assistantText.match(/(?:ЗН|ZN)[-–—\s]?\d+[\/\-]\d+/i) ||
    assistantText.match(/Заказ[- ]наряд\s+№?\s*([A-Za-zА-Яа-я0-9\/\-]+)/i) ||
    combined.match(/(?:ЗН|ZN)[-–—\s]?\d+[\/\-]\d+/i);
  if (orderNumMatch && orderNumMatch[1]) {
    orderNumber = orderNumMatch[1].replace(/№/, "").trim();
  } else if (orderNumMatch && orderNumMatch[0]) {
    orderNumber = orderNumMatch[0].trim();
  }

  // 2. Vehicle Make, Model, Year
  let vehicleMake = "Lada";
  let vehicleModel = "Largus";
  let vehicleYear = 2021;

  // Check table row: | Автомобиль | Peugeot 308, 2010 г. |
  const autoTableMatch = assistantText.match(/\|\s*Автомобиль\s*\|\s*([^|\n]+)\|/i);
  const autoUserMatch = userText.match(/Автомобиль\s+([A-Za-zА-Яа-я0-9\s\-]+?)(?:год|номер|vin|пробег|клиент|\d{4}|$)/i);
  const rawAuto = autoTableMatch ? autoTableMatch[1].trim() : (autoUserMatch ? autoUserMatch[1].trim() : "");

  if (rawAuto) {
    const yearMatch = rawAuto.match(/(\d{4})/);
    if (yearMatch) vehicleYear = parseInt(yearMatch[1], 10);
    const cleanAutoName = rawAuto.replace(/\d{4}\s*(?:г|год)?\.?/i, "").replace(/,/g, "").trim();
    const parts = cleanAutoName.split(/\s+/);
    if (parts.length > 0) vehicleMake = parts[0];
    if (parts.length > 1) vehicleModel = parts.slice(1).join(" ");
  } else {
    // Check known car brands
    const knownMakes: Record<string, string> = {
      peugeot: "Peugeot",
      пежо: "Peugeot",
      газель: "ГАЗ",
      gazelle: "ГАЗ",
      лада: "Lada",
      lada: "Lada",
      ларгус: "Lada",
      largus: "Lada",
      volkswagen: "Volkswagen",
      фольксваген: "Volkswagen",
      тигуан: "Volkswagen",
      tiguan: "Volkswagen",
      toyota: "Toyota",
      тойота: "Toyota",
      renault: "Renault",
      рено: "Renault",
      ford: "Ford",
      форд: "Ford",
      hyundai: "Hyundai",
      хендай: "Hyundai",
      kia: "KIA",
      киа: "KIA",
      kamaz: "КамАЗ",
      камаз: "КамАЗ",
    };

    for (const [key, makeVal] of Object.entries(knownMakes)) {
      if (new RegExp(key, "i").test(combined)) {
        vehicleMake = makeVal;
        const modelMatch = combined.match(new RegExp(`${key}\\s*([A-Za-z0-9\\-]+)`, "i"));
        if (modelMatch) vehicleModel = modelMatch[1];
        break;
      }
    }
  }

  const yearMatch = combined.match(/(\d{4})\s*(?:-й|-го|г\.|год)/i);
  if (yearMatch) vehicleYear = parseInt(yearMatch[1], 10);

  // 3. License plate
  let licensePlate = "А123ВС89";
  const plateTableMatch = assistantText.match(/\|\s*Госномер\s*\|\s*([^|\n]+)\|/i);
  if (plateTableMatch) {
    licensePlate = plateTableMatch[1].trim().replace(/\s/g, "").toUpperCase();
  } else {
    // Match Russian format like Т 632 Т Р 154 or Т632ТР154
    const plateRegex = /([А-ЯA-Z]\s*\d{3}\s*[А-ЯA-Z]{2}\s*\d{2,3})/i;
    const pm = combined.match(plateRegex);
    if (pm) licensePlate = pm[1].replace(/\s/g, "").toUpperCase();
  }

  // 4. VIN
  let vin = "VF34H5FS9AC" + Math.floor(100000 + Math.random() * 900000);
  const vinTableMatch = assistantText.match(/\|\s*VIN\s*\|\s*([^|\n]+)\|/i);
  if (vinTableMatch) {
    vin = vinTableMatch[1].trim().replace(/\s/g, "").toUpperCase();
  } else {
    const vinMatch = combined.match(/VIN(?:\s*код)?[:\s]+([A-HJ-NPR-Z0-9\s]{10,25})/i);
    if (vinMatch) {
      vin = vinMatch[1].replace(/\s/g, "").toUpperCase();
    }
  }

  // 5. Mileage
  let mileage = 84000;
  const mileageTableMatch = assistantText.match(/\|\s*Пробег\s*\|\s*([^|\n]+)\|/i);
  if (mileageTableMatch) {
    const num = parseInt(mileageTableMatch[1].replace(/\D/g, ""), 10);
    if (!isNaN(num) && num > 0) mileage = num;
  } else {
    const mm = combined.match(/пробег[:\s]*(\d[\d\s]*)/i);
    if (mm) {
      const num = parseInt(mm[1].replace(/\D/g, ""), 10);
      if (!isNaN(num) && num > 0) mileage = num;
    }
  }

  // 6. Client
  let clientName = "Клиент автосервиса";
  const clientTableMatch = assistantText.match(/\|\s*Клиент\s*\|\s*([^|\n]+)\|/i);
  if (clientTableMatch) {
    clientName = clientTableMatch[1].trim();
  } else {
    const cm = combined.match(/клиент[:\s]+([А-Яа-яA-Za-z\s]+?)(?:диагностика|замена|тел|телефон|\+7|$)/i);
    if (cm) clientName = cm[1].trim();
  }

  // 7. Works
  const works: OrderWorkItem[] = [];
  const lines = assistantText.split("\n");
  let inWorks = false;
  let inParts = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (/(?:работы|выполненные работы)/i.test(trimmed) && !trimmed.includes("|")) {
      inWorks = true;
      inParts = false;
      continue;
    }
    if (/(?:запчасти|запасные части|материалы)/i.test(trimmed) && !trimmed.includes("|")) {
      inWorks = false;
      inParts = true;
      continue;
    }

    if (inWorks && trimmed.includes("|")) {
      const cols = trimmed.split("|").map((c) => c.trim()).filter(Boolean);
      if (cols.length >= 3 && !cols[0].includes("№") && !cols[0].includes("---") && !cols[0].includes("Итого") && !cols[1]?.includes("Итого")) {
        const name = cols[1];
        const hoursStr = (cols[2] || "1.0").replace(",", ".").replace(/[^\d.]/g, "");
        const sumStr = (cols[3] || cols[2] || "").replace(/\D/g, "");
        const laborHours = parseFloat(hoursStr) || 1.0;
        const total = parseInt(sumStr, 10) || Math.round(laborHours * 2000);
        if (name && total > 0) {
          works.push({
            id: `w-${Date.now()}-${works.length + 1}`,
            name,
            mechanic: "Мастер смены",
            laborHours,
            ratePerHour: Math.round(total / (laborHours || 1)),
            discountPercent: 0,
            total,
          });
        }
      }
    }
  }

  // Fallbacks if no markdown rows parsed
  if (works.length === 0) {
    if (/диагностика.*(?:акпп|коробк|кпп)/i.test(combined)) {
      works.push({ id: `w-1`, name: "Диагностика АКПП (компьютерная)", mechanic: "Мастер смены", laborHours: 1.0, ratePerHour: 2000, discountPercent: 0, total: 2000 });
    }
    if (/замена.*масла.*(?:акпп|кпп)/i.test(combined)) {
      works.push({ id: `w-2`, name: "Замена масла в АКПП со снятием поддона", mechanic: "Мастер смены", laborHours: 3.0, ratePerHour: 2000, discountPercent: 0, total: 6000 });
    }
    if (works.length === 0) {
      works.push({ id: `w-1`, name: "Комплексное техническое обслуживание", mechanic: "Мастер смены", laborHours: 2.0, ratePerHour: 2000, discountPercent: 0, total: 4000 });
    }
  }

  // 8. Parts
  const parts: OrderPartItem[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (inParts && trimmed.includes("|")) {
      const cols = trimmed.split("|").map((c) => c.trim()).filter(Boolean);
      if (cols.length >= 3 && !cols[0].includes("№") && !cols[0].includes("---") && !cols[0].includes("Итого") && !cols[1]?.includes("Итого")) {
        const name = cols[1];
        const qtyStr = (cols[2] || "1").replace(/\D/g, "");
        const sumStr = (cols[3] || cols[2] || "").replace(/\D/g, "");
        const qty = parseInt(qtyStr, 10) || 1;
        const total = parseInt(sumStr, 10) || 1200;
        const salePrice = Math.round(total / qty);
        if (name && total > 0) {
          parts.push({
            id: `p-${Date.now()}-${parts.length + 1}`,
            name,
            oem: "TRANS-OIL-ATF",
            qty,
            unit: "л",
            purchasePrice: Math.round(salePrice * 0.7),
            salePrice,
            total,
          });
        }
      }
    }
  }

  if (parts.length === 0 && /масло/i.test(combined)) {
    const qtyMatch = combined.match(/масло\s*([0-9бБ]+)\s*л/i);
    const qty = qtyMatch ? parseInt(qtyMatch[1].replace(/б/gi, "6"), 10) : 6;
    const priceMatch = combined.match(/(?:по|цена|х|×)\s*(\d+[\s\d]*)\s*руб/i);
    const salePrice = priceMatch ? parseInt(priceMatch[1].replace(/\D/g, ""), 10) : 1200;
    parts.push({
      id: `p-1`,
      name: "Трансмиссионное масло АКПП (синтетическое)",
      oem: "OIL-ATF-LT71141",
      qty,
      unit: "л",
      purchasePrice: Math.round(salePrice * 0.7),
      salePrice,
      total: qty * salePrice,
    });
  }

  const rawOrder = {
    id: `ro-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    orderNumber,
    createdAt: new Date().toISOString().slice(0, 10),
    status: "in_progress" as const,
    client: {
      id: `c-${Date.now()}`,
      name: clientName,
      phone: "+7 (912) 345-67-89",
      type: "individual" as const,
      address: "г. Ноябрьск",
    },
    vehicle: {
      make: vehicleMake,
      model: vehicleModel,
      licensePlate,
      vin,
      year: vehicleYear,
      mileage,
      complaints: "Диагностика АКПП и замена масла",
    },
    works,
    parts,
    recommendations: "Контроль уровня масла в АКПП через 1000 км пробега",
    username: username || "admin",
  };

  return normalizeRepairOrder(rawOrder, username || "admin");
}
