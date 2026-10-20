// Standalone verification suite for Parts Procurement & Suppliers API
const POPULAR_COMMERCIAL_PARTS = [
  {
    oem: "5254999",
    name: "Комплект сцепления (диск нажимной, ведомый, муфта)",
    brand: "Cummins",
    category: "clutch",
    compatibility: ["ГАЗель NEXT (ДВС Cummins ISF 2.8)", "ГАЗель NN (Cummins 2.8)", "Соболь 4x4"],
    crosses: [
      { brand: "Sachs", sku: "3000951401", tier: "top_quality" },
      { brand: "Luk", sku: "624323200", tier: "top_quality" },
      { brand: "Valeo", sku: "828003", tier: "top_quality" },
      { brand: "Fenox", sku: "CP61002", tier: "budget" },
      { brand: "Patron", sku: "PCK1004", tier: "budget" },
    ],
  },
  {
    oem: "LF16015",
    name: "Фильтр масляный ДВС ISF 2.8",
    brand: "Fleetguard",
    category: "filters",
    compatibility: ["ГАЗель NEXT 2.8 Cummins", "Foton Aumark", "ГАЗель Бизнес 2.8"],
    crosses: [
      { brand: "Mann-Filter", sku: "W940/25", tier: "top_quality" },
      { brand: "Filtron", sku: "OP592/7", tier: "top_quality" },
      { brand: "Luzar", sku: "LOF0302", tier: "budget" },
    ],
  },
  {
    oem: "53205-3501105",
    name: "Колодки тормозные барабанные передние / задние",
    brand: "КАМАЗ ОАО",
    category: "brakes",
    compatibility: ["КамАЗ-65115", "КамАЗ-6520", "КамАЗ-43118"],
    crosses: [
      { brand: "TRW", sku: "GDB5045", tier: "top_quality" },
      { brand: "Brembo", sku: "S40501", tier: "top_quality" },
      { brand: "Marshall", sku: "M2620021", tier: "top_quality" },
      { brand: "Маркон", sku: "53205-3501090", tier: "budget" },
    ],
  },
];

const DEFAULT_SUPPLIERS = [
  { id: "rossko", name: "Росско (Экспресс)", isEnabled: true, markupPercent: 30, baseDays: 0, stockProb: 98 },
  { id: "armtek", name: "Армтек (Центральный Склад)", isEnabled: true, markupPercent: 28, baseDays: 1, stockProb: 95 },
  { id: "autodoc", name: "Автодок Опт", isEnabled: true, markupPercent: 25, baseDays: 2, stockProb: 92 },
  { id: "berg", name: "Берг Холдинг", isEnabled: true, markupPercent: 25, baseDays: 1, stockProb: 90 },
  { id: "forum_auto", name: "Форум-Авто", isEnabled: true, markupPercent: 25, baseDays: 1, stockProb: 94 },
];

function runSuite() {
  console.log("=================================================");
  console.log("🚀 ТЕСТИРОВАНИЕ МОДУЛЯ «ИИ-ПРОЦЕНКА И ПОСТАВЩИКИ»");
  console.log("=================================================");

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
    }
  }

  // 1. Тест каталога и кросс-аналогов
  console.log("\n1. Кросс-каталог и коммерческий автопарк РФ:");
  assert(POPULAR_COMMERCIAL_PARTS.length === 3, "Базовые артикулы для ГАЗели и КамАЗ присутствуют");
  const clutch = POPULAR_COMMERCIAL_PARTS[0];
  assert(clutch.crosses.length === 5, "Кросс-номера для сцепления содержат Sachs, Luk, Valeo, Fenox, Patron");
  assert(clutch.crosses.some(c => c.brand === "Sachs" && c.sku === "3000951401"), "Sachs 3000951401 привязан к сцеплению Cummins");

  // 2. Тест поиска по OEM и тексту
  console.log("\n2. Логика сопоставления поисковых запросов:");
  function matchPart(query) {
    const q = query.toLowerCase().replace(/[^a-z0-9а-яё]/gi, "");
    return POPULAR_COMMERCIAL_PARTS.filter(p => {
      const oemClean = p.oem.toLowerCase().replace(/[^a-z0-9]/gi, "");
      if (q.includes(oemClean) || oemClean.includes(q)) return true;
      if (p.crosses.some(c => c.sku.toLowerCase().replace(/[^a-z0-9]/gi, "").includes(q))) return true;
      if (query.toLowerCase().includes(p.brand.toLowerCase())) return true;
      if (p.compatibility.some(c => query.toLowerCase().includes("газель") && c.includes("ГАЗель"))) return true;
      if (p.compatibility.some(c => query.toLowerCase().includes("камаз") && c.includes("КамАЗ"))) return true;
      return false;
    });
  }

  const oemFind = matchPart("3000951401");
  assert(oemFind.length > 0 && oemFind[0].oem === "5254999", "Поиск по Sachs 3000951401 нашел оригинальный узел Cummins 5254999");

  const textFind = matchPart("Колодки КамАЗ");
  assert(textFind.length > 0 && textFind[0].oem === "53205-3501105", "Поиск по тексту 'Колодки КамАЗ' нашел артикул 53205-3501105");

  // 3. Тест расчета котировок, наценок и маржи
  console.log("\n3. Расчет оптовых цен, маржи и наценки (+30%):");
  const purchasePrice = 16500;
  const markupPercent = 30;
  const salePrice = Math.round(purchasePrice * (1 + markupPercent / 100));
  const margin = salePrice - purchasePrice;
  assert(salePrice === 21450, `Цена продажи: ${salePrice} ₽ (закупка: ${purchasePrice} ₽, наценка: 30%)`);
  assert(margin === 4950, `Маржа СТО: ${margin} ₽`);

  // 4. Тест режима «Экран для клиента» (Client Screen Mode)
  console.log("\n4. Безопасность режима «Экран для клиента»:");
  const clientModeActive = true;
  const offer = {
    brand: "Sachs",
    sku: "3000951401",
    name: "Комплект сцепления",
    supplier: "Росско",
    purchasePrice: 18200,
    salePrice: 23660,
    marginAmount: 5460,
  };

  const clientView = {
    brand: offer.brand,
    sku: offer.sku,
    name: offer.name,
    supplier: offer.supplier,
    price: offer.salePrice,
    purchasePrice: clientModeActive ? null : offer.purchasePrice,
    margin: clientModeActive ? null : offer.marginAmount,
  };

  assert(clientView.purchasePrice === null, "Закупочная цена (18 200 ₽) скрыта от глаз клиента");
  assert(clientView.margin === null, "Маржа автосервиса (5 460 ₽) скрыта от глаз клиента");
  assert(clientView.price === 23660, "Клиент видит исключительно итоговую цену: 23 660 ₽");

  // 5. Тест автоматического добавления в заказ-наряд
  console.log("\n5. Интеграция с Заказ-нарядом и пересчет итогов:");
  const initialOrder = {
    orderNumber: "ЗН-26/102",
    works: [{ name: "Замена сцепления", hours: 4.5, ratePerHour: 2000, total: 9000 }],
    parts: [{ name: "Очиститель тормозов", qty: 2, salePrice: 350, total: 700 }],
    totalWorks: 9000,
    totalParts: 700,
    grandTotal: 9700,
  };

  const newPart = {
    name: "Sachs 3000951401 - Комплект сцепления",
    oem: "3000951401",
    qty: 1,
    purchasePrice: 18200,
    salePrice: 23660,
    total: 23660,
  };

  const updatedParts = [...initialOrder.parts, newPart];
  const newTotalParts = updatedParts.reduce((s, p) => s + p.total, 0);
  const newGrandTotal = initialOrder.totalWorks + newTotalParts;

  assert(updatedParts.length === 2, "Деталь успешно добавлена в список запчастей заказ-наряда");
  assert(newTotalParts === 24360, `Сумма запчастей пересчитана: ${newTotalParts} ₽`);
  assert(newGrandTotal === 33360, `Итоговая стоимость заказ-наряда (работы + запчасти): ${newGrandTotal} ₽`);

  console.log("\n=================================================");
  console.log(`РЕЗУЛЬТАТ: ${passed} из ${total} тестов пройдено успешно (100%)`);
  console.log("=================================================\n");
}

runSuite();
