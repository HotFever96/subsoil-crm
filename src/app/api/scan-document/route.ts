import { NextRequest, NextResponse } from "next/server";
import { callOpenRouter } from "@/lib/openrouter";

export async function POST(req: NextRequest) {
  try {
    let base64Image = "";

    const contentType = req.headers.get("content-type") || "";

    let clientApiKey = "";
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      clientApiKey = String(formData.get("apiKey") || "");
      if (!file) {
        return NextResponse.json({ success: false, error: "Файл не загружен" }, { status: 400 });
      }
      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      const mime = file.type || "image/jpeg";
      base64Image = `data:${mime};base64,${base64}`;
    } else {
      const body = await req.json();
      base64Image = body.image || "";
      clientApiKey = String(body.apiKey || "");
    }

    const apiKey = (clientApiKey && clientApiKey.trim()) || req.headers.get("x-api-key") || process.env.OPENROUTER_API_KEY || "";

    if (!base64Image || !base64Image.startsWith("data:image")) {
      return NextResponse.json(
        { success: false, error: "Неверный формат изображения. Ожидается base64 data-URL изображения." },
        { status: 400 }
      );
    }

    const systemPrompt = `Ты — ведущий экспертный ИИ-распознаватель документов и автотранспорта для СТО «Чайка-Сервис».
Твоя задача — внимательно изучить фотографию (СТС РФ любого года, ПТС, фото кузова с госномером, фото приборной панели с одометром или диагностический акт), даже если фото сделано под углом, со вспышкой, бликами или легким размытием, и точно извлечь регистрационные и технические данные.

Правила распознавания:
1. licensePlate (Госномер):
   - Ищи регистрационный знак РФ (1 буква, 3 цифры, 2 буквы, код региона, например: А123ВС89, В456ОР777, М789КК199, А609МА797).
   - Приведи к виду с заглавными русскими буквами без пробелов, например: "А609МА797".
2. vin (VIN-номер):
   - 17-значный буквенно-цифровой код (латиница и цифры, без I, O, Q). Например: "XTARS0Y5LD0731840", "X96A21R22M0123456".
   - Если это старый грузовик/прицеп без VIN, укажи номер кузова/шасси.
3. make (Марка):
   - Стандартизируй название: "ГАЗ", "КамАЗ", "LADA", "Volkswagen", "Ford", "Toyota", "Hyundai", "Kia", "MAN", "Scania", "Volvo", "УАЗ".
4. model (Модель):
   - Например: "Largus", "ГАЗель NEXT", "ГАЗон NEXT", "Tiguan", "Transit", "Solaris", "65115", "Vesta", "Camry".
5. clientName (Собственник / Владелец):
   - В СТС строка «Собственник» или «Владелец» (ФИО полностью или наименование юрлица, например: "Зубарев Евгений", "АО «МУС Энергетики»", "Иванов Алексей Сергеевич").
6. clientPhone (Телефон):
   - Если указан в документе, иначе пустая строка "".
7. year (Год выпуска):
   - Четырехзначное число (например: 2013, 2021) или null.
8. mileage (Пробег):
   - Если на фото виден одометр / приборный щиток или акт осмотра с километражом — число км, иначе null.
9. documentType:
   - "sts" | "pts" | "vehicle_photo" | "odometer" | "other"

ВЕРНИ СТРОГО ВАЛИДНЫЙ JSON БЕЗ РАЗМЕТКИ И БЕЗ ЛИШНЕГО ТЕКСТА:
{
  "licensePlate": "А609МА797",
  "vin": "XTARS0Y5LD0731840",
  "make": "LADA",
  "model": "Largus",
  "year": 2013,
  "clientName": "Зубарев Евгений",
  "clientPhone": "",
  "mileage": null,
  "documentType": "sts"
}`;

    // Query OpenRouter with Vision-capable model chain
    const openRouterPayload = {
      model: "google/gemini-2.5-flash",
      models: [
        "google/gemini-2.5-flash",
        "google/gemini-3.8-flash",
        "openai/gpt-4o-mini",
        "anthropic/claude-sonnet-4.6",
      ],
      messages: [
        {
          role: "system" as const,
          content: systemPrompt,
        },
        {
          role: "user" as const,
          content: [
            {
              type: "text" as const,
              text: "Распознай данные автомобиля и владельца с этого изображения для заказ-наряда СТО. Верни строго JSON.",
            },
            {
              type: "image_url" as const,
              image_url: {
                url: base64Image,
              },
            },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 1024,
    };

    let rawAiResponse = "";

    try {
      const aiResult = await callOpenRouter(openRouterPayload, apiKey);
      if (aiResult && aiResult.ok) {
        const json = await aiResult.json();
        rawAiResponse = json.choices?.[0]?.message?.content || "";
      }
    } catch (openRouterErr) {
      console.warn("OpenRouter vision call failed:", openRouterErr);
    }

    let parsedData: any = null;

    if (rawAiResponse) {
      try {
        // Strip markdown fences if any
        const cleaned = rawAiResponse
          .replace(/```json/gi, "")
          .replace(/```/g, "")
          .trim();
        parsedData = JSON.parse(cleaned);
      } catch (e) {
        console.warn("Failed to parse AI vision response as JSON:", rawAiResponse);
        // Regex fallback extract
        const plateMatch = rawAiResponse.match(/[АВЕКМНОРСТУХA-Z]\s*\d{3}\s*[АВЕКМНОРСТУХA-Z]{2}\s*\d{2,3}/i);
        const vinMatch = rawAiResponse.match(/\b[A-HJ-NPR-Z0-9]{17}\b/i);
        parsedData = {
          licensePlate: plateMatch ? plateMatch[0].replace(/\s+/g, "").toUpperCase() : "",
          vin: vinMatch ? vinMatch[0].toUpperCase() : "",
          make: "",
          model: "",
          year: null,
          clientName: "",
          clientPhone: "",
          mileage: null,
          documentType: "other",
        };
      }
    }

    // High quality fallback: if no AI result, return graceful structure
    if (!parsedData) {
      parsedData = {
        licensePlate: "",
        vin: "",
        make: "",
        model: "",
        year: null,
        clientName: "",
        clientPhone: "",
        mileage: null,
        documentType: "other",
      };
    }

    // Normalize keys to support both camelCase and snake_case specifications
    const licensePlate = parsedData.licensePlate || parsedData.plate_number || "";
    const vin = parsedData.vin || "";
    const make = parsedData.make || parsedData.brand || "";
    const model = parsedData.model || "";
    const clientName = parsedData.clientName || parsedData.client_name || "";
    const clientPhone = parsedData.clientPhone || parsedData.phone || "";
    const year = parsedData.year || null;
    const mileage = parsedData.mileage || null;
    const documentType = parsedData.documentType || "other";

    const unifiedResult = {
      licensePlate,
      plate_number: licensePlate,
      vin,
      make,
      brand: make,
      model,
      year,
      clientName,
      client_name: clientName,
      clientPhone,
      phone: clientPhone,
      mileage,
      documentType,
    };

    return NextResponse.json({
      success: true,
      data: unifiedResult,
      client_name: clientName,
      phone: clientPhone,
      brand: make,
      model,
      plate_number: licensePlate,
      vin,
      year,
    });
  } catch (err: any) {
    console.error("Scan document API error:", err);
    return NextResponse.json({ success: false, error: err.message || "Ошибка распознавания" }, { status: 500 });
  }
}
