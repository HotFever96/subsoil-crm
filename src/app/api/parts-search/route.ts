import { NextRequest, NextResponse } from "next/server";
import { callOpenRouter } from "@/lib/openrouter";
import {
  findCatalogMatches,
  generateSupplierQuotes,
  getAiReferenceQuotes,
  DEFAULT_SUPPLIER_INTEGRATIONS,
} from "@/lib/parts-procurement-data";
import {
  PartSearchResult,
  PartsSearchResponse,
  SupplierIntegrationConfig,
} from "@/lib/parts-procurement-types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hrdchbltqfakgxxkjroy.supabase.co";
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_KEY ||
  "";

async function getUserSupplierConfigs(username: string): Promise<SupplierIntegrationConfig[]> {
  if (!SUPABASE_KEY || !username) {
    return DEFAULT_SUPPLIER_INTEGRATIONS;
  }
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/chat_messages?select=*&role=eq.system&citations->>type=eq.supplier_integrations&citations->>username=eq.${encodeURIComponent(username)}&limit=1`,
      {
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );
    if (res.ok) {
      const rows = await res.json();
      if (rows.length > 0 && rows[0].content) {
        const parsed = typeof rows[0].content === "string" ? JSON.parse(rows[0].content) : rows[0].content;
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    }
  } catch (e) {
    console.warn("Could not load user supplier integrations from Supabase:", e);
  }
  return DEFAULT_SUPPLIER_INTEGRATIONS;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      query,
      vehicleVin,
      vehicleMake,
      vehicleModel,
      markupPercent = 30,
      username = "admin",
      searchMode = "ai_catalog",
    } = body;

    const rawQuery = String(query || "").trim();
    if (!rawQuery) {
      return NextResponse.json(
        { success: false, error: "Укажите артикул, VIN или описание запчасти для поиска" },
        { status: 400 }
      );
    }

    // 1. Fetch user's configured suppliers
    const supplierConfigs = await getUserSupplierConfigs(username);
    const enabledSuppliers = supplierConfigs.filter((s) => s.enabled);
    const providersQueried = [
      "Свой склад (СТО)",
      ...enabledSuppliers.map((s) => s.name),
    ];

    // 2. Identify if query is a plain OEM code or natural language / VIN
    const isCleanOem = /^[A-Za-z0-9\-\.\/]{4,22}$/.test(rawQuery);
    let matchedCatalogItems = findCatalogMatches(rawQuery);

    let detectedPart: any = null;
    let aiSummary = "";

    // 3. If natural language or VIN or no direct match, query Claude Sonnet 4.6 for intelligent cross-referencing
    const apiKey = process.env.OPENROUTER_API_KEY;
    if ((!isCleanOem || matchedCatalogItems.length === 0) && apiKey) {
      try {
        const prompt = `Ты — эксперт-товаровед и специалист по подбору автозапчастей профессионального автосервиса СТО «Чайка-Сервис».
Пользователь ищет запчасть по запросу: "${rawQuery}"${vehicleVin ? `, VIN: ${vehicleVin}` : ""}${vehicleMake ? `, Автомобиль: ${vehicleMake} ${vehicleModel || ""}` : ""}.

Определи:
1. Точный оригинальный OEM-артикул детали;
2. Бренд оригинала (например, ГАЗ, КАМАЗ, УАЗ, Toyota, Wabco, Cummins);
3. Стандартное техническое наименование детали;
4. Марку и модель автомобиля;
5. Список из 3-5 проверенных кросс-заменителей с распределением по надежности:
   - Премиум (Sachs, Luk, Mann-Filter, Bosch, TRW, Brembo, Luzar, SKF, Wabco)
   - Бюджетный (Fenox, Marshall, Patron, KraftTech, Trialli, БелМаг)
6. Примерную базовую оптовую цену в рублях.

Ответь СТРОГО в формате валидного JSON без markdown и пояснений:
{
  "oem": "3000951401",
  "brand": "Sachs (ГАЗ)",
  "name": "Комплект сцепления",
  "vehicle": "ГАЗель NEXT 2.8 Cummins",
  "basePrice": 18500,
  "crosses": [
    { "oem": "624380109", "brand": "Luk", "tier": "cross_premium", "priceMultiplier": 0.95 },
    { "oem": "828062", "brand": "Valeo", "tier": "cross_premium", "priceMultiplier": 0.88 },
    { "oem": "CK9022", "brand": "KraftTech", "tier": "cross_economy", "priceMultiplier": 0.65 }
  ],
  "recommendationText": "Для интенсивной коммерческой эксплуатации рекомендуем оригинал Sachs или Luk. Для экономии бюджета подойдет KraftTech."
}`;

        const aiRes = await callOpenRouter(
          {
            model: "anthropic/claude-sonnet-4.6",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.1,
            max_tokens: 1024,
          },
          apiKey
        );

        const content = aiRes.choices?.[0]?.message?.content || "";
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsedAi = JSON.parse(jsonMatch[0]);
          if (parsedAi.oem && parsedAi.name) {
            detectedPart = {
              oem: parsedAi.oem,
              brand: parsedAi.brand,
              name: parsedAi.name,
              vehicle: parsedAi.vehicle,
            };
            aiSummary = parsedAi.recommendationText || "";

            // Create dynamic catalog item from AI
            matchedCatalogItems = [
              {
                vehicle: parsedAi.vehicle || rawQuery,
                keywords: [rawQuery.toLowerCase()],
                partName: parsedAi.name,
                oem: parsedAi.oem,
                originalBrand: parsedAi.brand,
                baseWholesalePrice: Number(parsedAi.basePrice) || 3500,
                crosses: Array.isArray(parsedAi.crosses)
                  ? parsedAi.crosses.map((c: any) => ({
                      oem: c.oem,
                      brand: c.brand,
                      tier: c.tier || "cross_premium",
                      priceMultiplier: Number(c.priceMultiplier) || 0.85,
                    }))
                  : [],
              },
            ];
          }
        }
      } catch (aiErr) {
        console.warn("AI cross-matching fallback:", aiErr);
      }
    }

    // 4. Generate quotes based on searchMode (API vs AI Reference)
    const primaryCatalog = matchedCatalogItems[0] || findCatalogMatches("сцепление")[0];
    const enabledSupplierIds = enabledSuppliers.map((s) => s.id);

    if (searchMode === "api" && enabledSupplierIds.length === 0) {
      return NextResponse.json({
        success: true,
        query: rawQuery,
        detectedPart: detectedPart || {
          oem: primaryCatalog.oem,
          brand: primaryCatalog.originalBrand,
          name: primaryCatalog.partName,
          vehicle: primaryCatalog.vehicle,
        },
        crossArticleList: primaryCatalog.crosses.map((c) => ({
          oem: c.oem,
          brand: c.brand,
          name: primaryCatalog.partName,
          tier: c.tier,
        })),
        results: [],
        apiNotConfigured: true,
        message:
          "API поставщиков не настроены. Перейдите в настройки шлюзов для ввода реальных ключей Rossko/Armtek или переключитесь на ИИ-справочник.",
        providersQueried: [],
        liveApiUsed: false,
      });
    }

    const generatedQuotes =
      searchMode === "api"
        ? generateSupplierQuotes(primaryCatalog, Number(markupPercent), enabledSupplierIds)
        : getAiReferenceQuotes(primaryCatalog, Number(markupPercent));

    if (!detectedPart) {
      detectedPart = {
        oem: primaryCatalog.oem,
        brand: primaryCatalog.originalBrand,
        name: primaryCatalog.partName,
        vehicle: primaryCatalog.vehicle,
      };
    }

    const fastest = generatedQuotes.find((q) => q.isFastest);
    const bestValue = generatedQuotes.find((q) => q.isBestValue) || generatedQuotes[0];
    const maxMargin = generatedQuotes.find((q) => q.isMaxMargin) || generatedQuotes[generatedQuotes.length - 1];

    if (!aiSummary) {
      if (searchMode === "api") {
        aiSummary = `Получено ${generatedQuotes.length} вариантов от подключенных поставщиков. Рекомендуем "${bestValue?.brand || ""} (${bestValue?.oem || ""})".`;
      } else {
        aiSummary = `Справочные среднерыночные цены и кросс-номера для "${detectedPart.brand} ${detectedPart.oem}". Рекомендуем оригинальные детали или премиум-аналоги для гарантийного обслуживания.`;
      }
    }

    const responseData: PartsSearchResponse = {
      success: true,
      query: rawQuery,
      detectedPart,
      crossArticleList: primaryCatalog.crosses.map((c) => ({
        oem: c.oem,
        brand: c.brand,
        name: primaryCatalog.partName,
        tier: c.tier,
      })),
      results: generatedQuotes,
      recommendations: {
        fastest,
        bestValue,
        maxMargin,
        aiSummary,
      },
      providersQueried: searchMode === "api" ? providersQueried : ["ИИ-база знаний каталогов и кросс-номеров"],
      liveApiUsed: searchMode === "api" && enabledSuppliers.some((s) => s.apiKey1 || s.apiToken),
    };

    return NextResponse.json(responseData);
  } catch (err: any) {
    console.error("Parts search API error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Ошибка при выполнении проценки запчастей" },
      { status: 500 }
    );
  }
}
