import { NextRequest, NextResponse } from "next/server";
import { callOpenRouter } from "@/lib/openrouter";

export async function POST(req: NextRequest) {
  try {
    let base64Image = "";

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
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
    }

    if (!base64Image || !base64Image.startsWith("data:image")) {
      return NextResponse.json(
        { success: false, error: "Неверный формат изображения. Ожидается base64 data-URL изображения." },
        { status: 400 }
      );
    }

    const systemPrompt = `Ты — экспертный ИИ-распознаватель документов и автомобилей для автосервиса СТО «Чайка-Сервис».
Твоя задача — внимательно изучить присланную фотографию (СТС РФ, ПТС, фото машины с госномером, приборная панель с пробегом или акт) и извлечь регистрационные и технические данные.

Правила извлечения:
1. licensePlate (Госномер):
   - Ищи стандартные российские регистрационные знаки (например: А 123 ВС 777, М 456 КК 199, В 789 ОР 78, Р 111 ТТ 750, Т 001 ТТ 77).
   - Приведи к виду с заглавными русскими буквами без лишних пробелов, например: "А123ВС777" или "М456КК199".
2. vin (VIN-номер):
   - 17-значный буквенно-цифровой идентификатор кузова (латиница и цифры).
   - Исключи буквы I, O, Q (стандарт VIN).
3. make (Марка автомобиля):
   - Например: "ГАЗ", "КамАЗ", "УАЗ", "Mercedes-Benz", "Ford", "Volkswagen", "LADA", "Toyota", "Hyundai", "Kia", "MAN", "Scania", "Volvo".
4. model (Модель автомобиля):
   - Например: "ГАЗель NEXT", "ГАЗель БИЗНЕС", "ГАЗон NEXT", "Sprinter 313", "Transit", "65115", "Solaris", "Vesta", "Largus", "Camry".
5. clientName (ФИО собственника / владельца):
   - Если это СТС или ПТС, найди строку «Собственник» или «Владелец» и извлеки ФИО полностью, например: "Иванов Алексей Сергеевич" или наименование юрлица "ООО СЕВЕРТРАНС".
6. clientPhone (Телефон):
   - Если указан в документе или на бланке (обычно отсутствует на СТС, оставь пустой строкой "").
7. year (Год выпуска):
   - Год выпуска ТС четырехзначным числом (например: 2021) или null.
8. mileage (Пробег):
   - Если это фото одометра / приборного щитка или диагностического листа, извлеки пробег в км числом. Если нет — null.
9. documentType:
   - Определи тип: "sts" | "pts" | "vehicle_photo" | "odometer" | "other"

ВЕРНИ СТРОГО ВАЛИДНЫЙ JSON БЕЗ ЛИШНЕГО ТЕКСТА И БЕЗ БЛОКОВ РАЗМЕТКИ:
{
  "licensePlate": "А123ВС777",
  "vin": "X96A21R22M0123456",
  "make": "ГАЗ",
  "model": "ГАЗель NEXT",
  "year": 2021,
  "clientName": "Иванов Алексей Сергеевич",
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
      const aiResult = await callOpenRouter(openRouterPayload);
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
