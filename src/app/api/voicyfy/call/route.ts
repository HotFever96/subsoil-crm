import { NextRequest, NextResponse } from "next/server";

const DEFAULT_VOICYFY_URL =
  "https://voicyfy.ru/api/agent/public/4d6db3ad-00de-4bdf-aa82-89c0267b296b/message";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hrdchbltqfakgxxkjroy.supabase.co";
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_KEY ||
  "";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name = "",
      phone = "",
      car = "",
      order_id = "",
      action_type = "ready",
      custom_instruction = "",
      username = "antonv",
    } = body;

    if (!phone) {
      return NextResponse.json(
        { success: false, error: "Номер телефона клиента обязателен для звонка ИИ" },
        { status: 400 }
      );
    }

    // Compose task comment according to Voicyfy orchestrator protocol
    let comment = "";
    if (action_type === "ready") {
      const carName = car || "автомобиля";
      comment = `СРОЧНЫЙ ЗВОНОК: Позвони клиенту прямо сейчас и сообщи, что ремонт его автомобиля (${carName}) завершен, машина готова к выдаче.`;
    } else if (action_type === "csi") {
      const carName = car || "автомобиля";
      comment = `КОНТРОЛЬ КАЧЕСТВА (CSI): Запланируй звонок клиенту для оценки качества выполненного ремонта автомобиля ${carName} по 5-балльной шкале.`;
    } else if (action_type === "custom") {
      comment = custom_instruction || `Позвони клиенту по вопросу обслуживания автомобиля ${car || ""}.`;
    } else {
      comment = custom_instruction || "Звонок клиенту автосервиса";
    }

    const voicyfyPayload = {
      name: name || "Клиент",
      phone,
      car: car || "",
      order_id: order_id || "",
      comment,
    };

    const targetUrl = process.env.VOICYFY_PUBLIC_URL || DEFAULT_VOICYFY_URL;
    const secretKey = process.env.VOICYFY_SECRET_KEY || "";
    const apiKey = process.env.VOICYFY_API_KEY || "";

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (secretKey) {
      headers["X-Api-Key"] = secretKey;
    }
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    let voicyfyResponseData: any = null;
    let voicyfyStatus = 200;

    if (secretKey || apiKey) {
      try {
        const response = await fetch(targetUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(voicyfyPayload),
          signal: AbortSignal.timeout(10000),
        });

        voicyfyStatus = response.status;
        const textRes = await response.text();
        try {
          voicyfyResponseData = JSON.parse(textRes);
        } catch {
          voicyfyResponseData = { raw: textRes };
        }

        if (!response.ok) {
          console.warn(
            `Voicyfy API returned non-200 (${response.status}):`,
            textRes
          );
        }
      } catch (err: any) {
        console.error("Voicyfy outbound fetch error:", err);
        voicyfyResponseData = { error: err.message };
        voicyfyStatus = 502;
      }
    } else {
      // Local fallback simulation when keys are not in local .env
      console.info("VOICYFY_SECRET_KEY not found in local environment. Simulated call registered.");
      voicyfyResponseData = {
        simulated: true,
        message: "Звонок поставлен в очередь Voicyfy (режим локальной эмуляции)",
      };
    }

    const callRecord = {
      id: `call-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actionType: action_type,
      status: voicyfyStatus >= 200 && voicyfyStatus < 300 ? "scheduled" : "error",
      comment,
      name,
      phone,
      car,
      order_id,
      voicyfyResponse: voicyfyResponseData,
    };

    // Save call record in Supabase
    if (SUPABASE_KEY) {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/chat_messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            Prefer: "resolution=merge-duplicates,return=representation",
          },
          body: JSON.stringify({
            id: callRecord.id,
            role: "system",
            content: JSON.stringify(callRecord),
            citations: {
              type: "telephony_call",
              subtype: "voicyfy_outbound",
              username,
              order_id,
              phone,
              name,
              action_type,
            },
          }),
        });

        // If order_id is present, append to order's voicyfyCalls
        if (order_id) {
          const searchOrderRes = await fetch(
            `${SUPABASE_URL}/rest/v1/chat_messages?select=*&role=eq.system&citations->>type=eq.repair_order&citations->>username=eq.${encodeURIComponent(
              username
            )}&or=(id.eq.order-${encodeURIComponent(order_id)},citations->>order_number.eq.${encodeURIComponent(order_id)})&limit=1`,
            {
              headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`,
              },
            }
          );

          if (searchOrderRes.ok) {
            const rows = await searchOrderRes.json();
            if (rows.length > 0) {
              const row = rows[0];
              const ord = typeof row.content === "string" ? JSON.parse(row.content) : row.content;
              const callsList = Array.isArray(ord.voicyfyCalls) ? ord.voicyfyCalls : [];
              ord.voicyfyCalls = [...callsList, callRecord];

              await fetch(`${SUPABASE_URL}/rest/v1/chat_messages`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  apikey: SUPABASE_KEY,
                  Authorization: `Bearer ${SUPABASE_KEY}`,
                  Prefer: "resolution=merge-duplicates,return=representation",
                },
                body: JSON.stringify({
                  id: row.id,
                  role: "system",
                  content: JSON.stringify(ord),
                  citations: {
                    ...row.citations,
                    updatedAt: new Date().toISOString(),
                  },
                }),
              });
            }
          }
        }
      } catch (dbErr) {
        console.warn("Error logging Voicyfy call to Supabase:", dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      message:
        action_type === "ready"
          ? "Голосовой агент Анна получила команду оповестить о готовности автомобиля"
          : action_type === "csi"
          ? "Запущен опрос контроля качества (CSI) через голосового агента Анну"
          : "Инструкция передана голосовому агенту Анне",
      callRecord,
    });
  } catch (error: any) {
    console.error("Voicyfy call API route error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Ошибка отправки команды Voicyfy" },
      { status: 500 }
    );
  }
}
