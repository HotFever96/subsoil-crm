import { NextRequest, NextResponse } from "next/server";
import { normalizeRepairOrder } from "@/lib/auto-service-data";
import { RepairOrder } from "@/lib/auto-service-types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hrdchbltqfakgxxkjroy.supabase.co";
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_KEY ||
  "";

function normalizePhone(raw: string): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"))) {
    return "7" + digits.slice(1);
  }
  return digits;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.info("Voicyfy incoming webhook received:", JSON.stringify(body));

    const {
      phone = "",
      name = "",
      car = "",
      reason = "",
      scheduled_time = "",
      rating = null,
      feedback = "",
      summary = "",
      order_id = "",
    } = body;

    const normalizedTargetPhone = normalizePhone(phone);
    const webhookTimestamp = new Date().toISOString();
    const webhookLogId = `voicyfy-hook-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    };

    let processedType: "csi_update" | "new_lead" | "log_only" = "log_only";
    let matchedOrderNumber = "";

    if (SUPABASE_KEY) {
      // 1. Fetch current repair orders to find matching client or order
      let allOrders: Array<{ id: string; rowId: string; order: RepairOrder; rawRow: any }> = [];
      try {
        const ordersRes = await fetch(
          `${SUPABASE_URL}/rest/v1/chat_messages?select=*&role=eq.system&citations->>type=eq.repair_order&order=created_at.desc&limit=100`,
          { headers }
        );
        if (ordersRes.ok) {
          const rows = await ordersRes.json();
          allOrders = rows
            .map((r: any) => {
              try {
                const parsed = typeof r.content === "string" ? JSON.parse(r.content) : r.content;
                return {
                  id: parsed.id,
                  rowId: r.id,
                  order: normalizeRepairOrder(parsed, r.citations?.username || "antonv"),
                  rawRow: r,
                };
              } catch {
                return null;
              }
            })
            .filter(Boolean);
        }
      } catch (err) {
        console.warn("Error querying repair orders from Supabase for Voicyfy webhook:", err);
      }

      // CASE A: CSI RATING OR FEEDBACK FROM CALL
      const hasCsiRating = rating !== null && rating !== undefined && String(rating).trim() !== "";
      const hasFeedback = Boolean(feedback && feedback.trim());

      if (hasCsiRating || hasFeedback) {
        // Find order by order_id or by phone
        let matched = allOrders.find((item) => {
          if (order_id) {
            return (
              item.order.id === order_id ||
              item.order.orderNumber === order_id ||
              item.order.id === `ord-${order_id}`
            );
          }
          if (normalizedTargetPhone) {
            const ordPhone = normalizePhone(item.order.client?.phone || "");
            return ordPhone && ordPhone === normalizedTargetPhone;
          }
          return false;
        });

        // If not found by exact phone, try finding by name
        if (!matched && name && name.trim()) {
          const lowerName = name.trim().toLowerCase();
          matched = allOrders.find(
            (item) => item.order.client?.name && item.order.client.name.toLowerCase().includes(lowerName)
          );
        }

        if (matched) {
          const updatedOrder: RepairOrder = {
            ...matched.order,
            csiRating: hasCsiRating ? Number(rating) : matched.order.csiRating,
            csiFeedback: hasFeedback ? feedback : matched.order.csiFeedback,
            csiSummary: summary ? summary : matched.order.csiSummary,
            voicyfyCalls: [
              ...(matched.order.voicyfyCalls || []),
              {
                id: `call-${Date.now()}`,
                timestamp: webhookTimestamp,
                actionType: "csi_result",
                status: "completed",
                rating: hasCsiRating ? Number(rating) : undefined,
                feedback: feedback || undefined,
                summary: summary || undefined,
                comment: "Результат опроса качества CSI от ИИ Анны",
              },
            ],
          };

          await fetch(`${SUPABASE_URL}/rest/v1/chat_messages`, {
            method: "POST",
            headers: {
              ...headers,
              Prefer: "resolution=merge-duplicates,return=representation",
            },
            body: JSON.stringify({
              id: matched.rawRow.id,
              role: "system",
              content: JSON.stringify(updatedOrder),
              citations: {
                ...matched.rawRow.citations,
                csi_rating: String(rating || ""),
                updatedAt: webhookTimestamp,
              },
            }),
          });

          processedType = "csi_update";
          matchedOrderNumber = updatedOrder.orderNumber;
        }
      }

      // CASE B: NEW BOOKING / LEAD FROM CALL (reason or scheduled_time without rating)
      if (processedType !== "csi_update" && (reason || scheduled_time)) {
        const orderNumber = `ЗН-АННА-${new Date().getFullYear().toString().slice(-2)}/${Math.floor(1000 + Math.random() * 9000)}`;
        const scheduledDate = scheduled_time ? scheduled_time.slice(0, 10) : undefined;
        const scheduledTime = scheduled_time ? scheduled_time.slice(11, 16) : undefined;

        const newLeadOrder: RepairOrder = {
          id: `ord-anna-${Date.now()}`,
          orderNumber,
          status: "lead_ai", // Статус: «Заявка (ИИ Анна)»
          createdAt: new Date().toISOString().slice(0, 10),
          scheduledDate,
          scheduledTime,
          client: {
            type: "individual",
            name: name || "Клиент (голосовой агент)",
            phone: phone || "",
          },
          vehicle: {
            make: car || "Автомобиль",
            model: "",
            licensePlate: "Б/Н",
            vin: "",
            year: new Date().getFullYear(),
            mileage: 0,
            complaints: reason || "Запись на ТО / ремонт через голосового ассистента Анну",
          },
          works: [],
          parts: [],
          totalWorks: 0,
          totalParts: 0,
          grandTotal: 0,
          recommendations: summary ? `Итог разговора с Анной: ${summary}` : "Обращение принято голосовым агентом Voicyfy",
          username: "antonv",
          voicyfyCalls: [
            {
              id: `call-${Date.now()}`,
              timestamp: webhookTimestamp,
              actionType: "inbound_lead",
              status: "completed",
              summary,
              comment: reason || "Запись через голосового агента Анну",
            },
          ],
        };

        await fetch(`${SUPABASE_URL}/rest/v1/chat_messages`, {
          method: "POST",
          headers: {
            ...headers,
            Prefer: "resolution=merge-duplicates,return=representation",
          },
          body: JSON.stringify({
            id: `order-${newLeadOrder.id}`,
            role: "system",
            content: JSON.stringify(newLeadOrder),
            citations: {
              type: "repair_order",
              username: "antonv",
              order_number: orderNumber,
              status: "lead_ai",
              vehicle: newLeadOrder.vehicle?.licensePlate || "",
              client: newLeadOrder.client?.name || "",
              source: "voicyfy_webhook",
              createdAt: webhookTimestamp,
            },
          }),
        });

        processedType = "new_lead";
        matchedOrderNumber = orderNumber;
      }

      // 3. Save raw webhook log and register in Telephony Journal
      try {
        // Save webhook log entry
        await fetch(`${SUPABASE_URL}/rest/v1/chat_messages`, {
          method: "POST",
          headers: {
            ...headers,
            Prefer: "resolution=merge-duplicates,return=representation",
          },
          body: JSON.stringify({
            id: webhookLogId,
            role: "system",
            content: JSON.stringify({
              ...body,
              processedType,
              matchedOrderNumber,
              receivedAt: webhookTimestamp,
            }),
            citations: {
              type: "voicyfy_webhook",
              phone: normalizedTargetPhone,
              order_number: matchedOrderNumber,
              processed: processedType,
            },
          }),
        });

        // Save call into Telephony Journal (`type: "telephony_call"`)
        const telephonyCallId = `call-hook-${Date.now()}`;
        const telephonyRecord = {
          id: telephonyCallId,
          type: rating ? "csi_quality" : "inbound_admin",
          clientName: name || "Клиент (Voicyfy)",
          clientPhone: phone,
          vehicleInfo: car || "Автомобиль",
          orderNumber: matchedOrderNumber || undefined,
          date: new Date().toISOString().slice(0, 10),
          time: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
          durationSeconds: 90,
          status: "completed",
          rating: rating ? Number(rating) : undefined,
          hasComplaints: rating ? Number(rating) < 4 : false,
          transcript: summary || feedback || reason || "Запись звонка Voicyfy",
          aiSummary: summary || (rating ? `Оценка CSI: ${rating}/5. Отзыв: ${feedback}` : reason),
          costRub: 0,
        };

        await fetch(`${SUPABASE_URL}/rest/v1/chat_messages`, {
          method: "POST",
          headers: {
            ...headers,
            Prefer: "resolution=merge-duplicates,return=representation",
          },
          body: JSON.stringify({
            id: telephonyCallId,
            role: "system",
            content: JSON.stringify(telephonyRecord),
            citations: {
              type: "telephony_call",
              username: "antonv",
              source: "voicyfy_webhook",
            },
          }),
        });
      } catch (logErr) {
        console.warn("Failed to write webhook audit log to Supabase:", logErr);
      }
    }

    return NextResponse.json({
      success: true,
      processed: processedType,
      matchedOrderNumber: matchedOrderNumber || null,
      message:
        processedType === "csi_update"
          ? `Оценка и отзыв CSI сохранены в заказ-наряд ${matchedOrderNumber}`
          : processedType === "new_lead"
          ? `Создан новый заказ-наряд ${matchedOrderNumber} в статусе «Заявка (ИИ Анна)»`
          : "Вебхук Voicyfy успешно принят и сохранен в журнал",
    });
  } catch (error: any) {
    console.error("Voicyfy webhook error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Ошибка обработки вебхука Voicyfy" },
      { status: 500 }
    );
  }
}
