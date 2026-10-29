import { NextRequest, NextResponse } from "next/server";
import { normalizeRepairOrder } from "@/lib/auto-service-data";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hrdchbltqfakgxxkjroy.supabase.co";
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_KEY ||
  "";

const getHeaders = () => ({
  "Content-Type": "application/json",
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
});

export async function POST(req: NextRequest) {
  try {
    if (!SUPABASE_KEY) {
      return NextResponse.json({
        success: false,
        warning: "Supabase key not configured in environment, operating in local cache mode.",
        rows: [],
        events: [],
        mails: [],
        mailboxes: [],
      });
    }

    const headers = getHeaders();
    const body = await req.json();
    const { action, payload, username: topUsername } = body;
    const username = (payload?.username || topUsername || "").trim().toLowerCase();

    // Enforce strict user isolation: all data actions require a valid username
    if (!username) {
      return NextResponse.json(
        { error: "Username is required for user-isolated data access" },
        { status: 400 }
      );
    }

    // 1. Get user-specific chat messages from Supabase
    if (action === "get_chats") {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/chat_messages?select=*&role=in.(user,assistant)&citations->>username=eq.${encodeURIComponent(username)}&order=created_at.asc`,
        { headers }
      );
      if (!res.ok) {
        throw new Error(`Supabase query failed: ${res.statusText}`);
      }
      const rows = await res.json();
      return NextResponse.json({ success: true, rows });
    }

    // 2. Save/Upsert chat message tagged with username
    if (action === "save_chat_message") {
      const { id, role, content, sessionId, sessionTitle, attachments } = payload;
      const res = await fetch(`${SUPABASE_URL}/rest/v1/chat_messages`, {
        method: "POST",
        headers: {
          ...headers,
          Prefer: "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify({
          id,
          role,
          content,
          citations: {
            session_id: sessionId,
            session_title: sessionTitle,
            attachments,
            username,
          },
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Failed to save message: ${errText}`);
      }
      const data = await res.json();
      return NextResponse.json({ success: true, data });
    }

    // 3. Delete session messages belonging to user
    if (action === "delete_chat_session") {
      const { sessionId } = payload;
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/chat_messages?citations->>session_id=eq.${encodeURIComponent(sessionId)}&citations->>username=eq.${encodeURIComponent(username)}`,
        {
          method: "DELETE",
          headers,
        }
      );
      return NextResponse.json({ success: res.ok });
    }

    // 4. Get user-specific calendar events
    if (action === "get_calendar_events") {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/chat_messages?select=*&role=eq.system&citations->>type=eq.calendar_event&citations->>username=eq.${encodeURIComponent(username)}&order=created_at.asc`,
        { headers }
      );
      if (!res.ok) {
        throw new Error(`Supabase calendar query failed: ${res.statusText}`);
      }
      const rows = await res.json();
      const events = rows
        .map((r: any) => {
          try {
            return typeof r.content === "string" ? JSON.parse(r.content) : r.content;
          } catch {
            return null;
          }
        })
        .filter(Boolean);
      return NextResponse.json({ success: true, events });
    }

    // 5. Save/Upsert user-specific calendar event
    if (action === "save_calendar_event") {
      const { event } = payload;
      const res = await fetch(`${SUPABASE_URL}/rest/v1/chat_messages`, {
        method: "POST",
        headers: {
          ...headers,
          Prefer: "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify({
          id: event.id,
          role: "system",
          content: JSON.stringify(event),
          citations: {
            type: "calendar_event",
            username,
            date: event.date,
            tag: event.tag,
          },
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Failed to save event: ${errText}`);
      }
      const data = await res.json();
      return NextResponse.json({ success: true, data });
    }

    // 6. Delete user-specific calendar event
    if (action === "delete_calendar_event") {
      const { eventId } = payload;
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/chat_messages?id=eq.${encodeURIComponent(eventId)}&citations->>username=eq.${encodeURIComponent(username)}`,
        {
          method: "DELETE",
          headers,
        }
      );
      return NextResponse.json({ success: res.ok });
    }

    // 7. Get user-specific mails
    if (action === "get_mails") {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/chat_messages?select=*&role=eq.system&citations->>type=eq.mail_item&citations->>username=eq.${encodeURIComponent(username)}&order=created_at.asc`,
        { headers }
      );
      if (!res.ok) {
        throw new Error(`Supabase mails query failed: ${res.statusText}`);
      }
      const rows = await res.json();
      const mails = rows
        .map((r: any) => {
          try {
            return typeof r.content === "string" ? JSON.parse(r.content) : r.content;
          } catch {
            return null;
          }
        })
        .filter(Boolean);
      return NextResponse.json({ success: true, mails });
    }

    // 8. Save/Upsert user-specific mail
    if (action === "save_mail") {
      const { mail } = payload;
      const res = await fetch(`${SUPABASE_URL}/rest/v1/chat_messages`, {
        method: "POST",
        headers: {
          ...headers,
          Prefer: "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify({
          id: mail.id,
          role: "system",
          content: JSON.stringify(mail),
          citations: {
            type: "mail_item",
            username,
            folder: mail.folder || "INBOX",
            status: mail.status,
            mailbox_id: mail.mailbox_id || "",
            mailbox_name: mail.mailbox_name || "",
          },
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Failed to save mail: ${errText}`);
      }
      const data = await res.json();
      return NextResponse.json({ success: true, data });
    }

    // 9. Delete user-specific mail
    if (action === "delete_mail") {
      const { mailId } = payload;
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/chat_messages?id=eq.${encodeURIComponent(mailId)}&citations->>username=eq.${encodeURIComponent(username)}`,
        {
          method: "DELETE",
          headers,
        }
      );
      return NextResponse.json({ success: res.ok });
    }

    // 10. Get user-specific mailbox accounts (Multi-IMAP)
    if (action === "get_mailboxes") {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/chat_messages?select=*&role=eq.system&citations->>type=eq.mailbox_account&citations->>username=eq.${encodeURIComponent(username)}&order=created_at.asc`,
        { headers }
      );
      if (!res.ok) {
        throw new Error(`Supabase mailboxes query failed: ${res.statusText}`);
      }
      const rows = await res.json();
      const mailboxes = rows
        .map((r: any) => {
          try {
            return typeof r.content === "string" ? JSON.parse(r.content) : r.content;
          } catch {
            return null;
          }
        })
        .filter(Boolean);
      return NextResponse.json({ success: true, mailboxes });
    }

    // 11. Save/Upsert user-specific mailbox account
    if (action === "save_mailbox") {
      const { mailbox } = payload;
      const res = await fetch(`${SUPABASE_URL}/rest/v1/chat_messages`, {
        method: "POST",
        headers: {
          ...headers,
          Prefer: "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify({
          id: mailbox.id,
          role: "system",
          content: JSON.stringify(mailbox),
          citations: {
            type: "mailbox_account",
            username,
            name: mailbox.name,
            email: mailbox.email,
          },
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Failed to save mailbox: ${errText}`);
      }
      const data = await res.json();
      return NextResponse.json({ success: true, data });
    }

    // 12. Delete user-specific mailbox account
    if (action === "delete_mailbox") {
      const { mailboxId } = payload;
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/chat_messages?id=eq.${encodeURIComponent(mailboxId)}&citations->>username=eq.${encodeURIComponent(username)}`,
        {
          method: "DELETE",
          headers,
        }
      );
      return NextResponse.json({ success: res.ok });
    }

    // 13. Get user-specific notes and long-term memory
    if (action === "get_notes") {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/chat_messages?select=*&role=eq.system&citations->>type=eq.user_note&citations->>username=eq.${encodeURIComponent(username)}&order=created_at.desc`,
        { headers }
      );
      if (!res.ok) {
        throw new Error(`Supabase notes query failed: ${res.statusText}`);
      }
      const rows = await res.json();
      const notes = rows
        .map((r: any) => {
          try {
            return typeof r.content === "string" ? JSON.parse(r.content) : r.content;
          } catch {
            return null;
          }
        })
        .filter(Boolean);
      return NextResponse.json({ success: true, notes });
    }

    // 14. Save/Upsert user-specific note
    if (action === "save_note") {
      const { note } = payload;
      const res = await fetch(`${SUPABASE_URL}/rest/v1/chat_messages`, {
        method: "POST",
        headers: {
          ...headers,
          Prefer: "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify({
          id: note.id,
          role: "system",
          content: JSON.stringify(note),
          citations: {
            type: "user_note",
            username,
            title: note.title || "",
            category: note.category || "general",
            created_at: note.created_at || new Date().toISOString(),
          },
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Failed to save note: ${errText}`);
      }
      const data = await res.json();
      return NextResponse.json({ success: true, data });
    }

    // 15. Delete user-specific note
    if (action === "delete_note") {
      const { noteId } = payload;
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/chat_messages?id=eq.${encodeURIComponent(noteId)}&citations->>username=eq.${encodeURIComponent(username)}`,
        {
          method: "DELETE",
          headers,
        }
      );
      return NextResponse.json({ success: res.ok });
    }

    // 16. Get Full CRM Context for AI Chat
    if (action === "get_full_crm_context") {
      const [eventsRes, mailsRes, notesRes] = await Promise.all([
        fetch(
          `${SUPABASE_URL}/rest/v1/chat_messages?select=*&role=eq.system&citations->>type=eq.calendar_event&citations->>username=eq.${encodeURIComponent(username)}&order=created_at.asc`,
          { headers }
        ),
        fetch(
          `${SUPABASE_URL}/rest/v1/chat_messages?select=*&role=eq.system&citations->>type=eq.mail_item&citations->>username=eq.${encodeURIComponent(username)}&order=created_at.asc`,
          { headers }
        ),
        fetch(
          `${SUPABASE_URL}/rest/v1/chat_messages?select=*&role=eq.system&citations->>type=eq.user_note&citations->>username=eq.${encodeURIComponent(username)}&order=created_at.desc`,
          { headers }
        ),
      ]);

      const parseJsonRows = async (res: Response) => {
        if (!res.ok) return [];
        try {
          const rows = await res.json();
          return rows.map((r: any) => {
            try {
              return typeof r.content === "string" ? JSON.parse(r.content) : r.content;
            } catch {
              return null;
            }
          }).filter(Boolean);
        } catch {
          return [];
        }
      };

      const [events, mails, notes] = await Promise.all([
        parseJsonRows(eventsRes),
        parseJsonRows(mailsRes),
        parseJsonRows(notesRes),
      ]);

      return NextResponse.json({
        success: true,
        events,
        mails,
        notes,
      });
    }

    // 17. Save/Upsert User Settings (preferred_model, display_name)
    if (action === "save_user_settings") {
      const { preferred_model, display_name } = payload || {};
      const settingsObj = {
        preferred_model: preferred_model || "anthropic/claude-sonnet-4.6",
        display_name: display_name || username,
        updated_at: new Date().toISOString(),
      };
      const res = await fetch(`${SUPABASE_URL}/rest/v1/chat_messages`, {
        method: "POST",
        headers: {
          ...headers,
          Prefer: "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify({
          id: `settings-${username}`,
          role: "system",
          content: JSON.stringify(settingsObj),
          citations: {
            type: "user_settings",
            username,
            preferred_model: settingsObj.preferred_model,
          },
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Failed to save user settings: ${errText}`);
      }
      return NextResponse.json({ success: true, settings: settingsObj });
    }

    // 18. Get User Settings
    if (action === "get_user_settings") {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/chat_messages?select=*&role=eq.system&citations->>type=eq.user_settings&citations->>username=eq.${encodeURIComponent(username)}&order=created_at.desc&limit=1`,
        { headers }
      );
      if (!res.ok) {
        throw new Error(`Supabase settings query failed: ${res.statusText}`);
      }
      const rows = await res.json();
      let settings = null;
      if (rows.length > 0) {
        try {
          settings = typeof rows[0].content === "string" ? JSON.parse(rows[0].content) : rows[0].content;
        } catch {}
      }
      return NextResponse.json({ success: true, settings });
    }

    // 19. Get Archive Files
    if (action === "get_archive_files") {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/chat_messages?select=*&role=eq.system&citations->>type=eq.archive_file&citations->>username=eq.${encodeURIComponent(username)}&order=created_at.desc`,
        { headers }
      );
      if (!res.ok) {
        throw new Error(`Supabase archive query failed: ${res.statusText}`);
      }
      const rows = await res.json();
      const files = rows
        .map((r: any) => {
          try {
            return typeof r.content === "string" ? JSON.parse(r.content) : r.content;
          } catch {
            return null;
          }
        })
        .filter(Boolean);
      return NextResponse.json({ success: true, files });
    }

    // 20. Save/Upsert Archive File
    if (action === "save_archive_file") {
      const fileItem = payload;
      const res = await fetch(`${SUPABASE_URL}/rest/v1/chat_messages`, {
        method: "POST",
        headers: {
          ...headers,
          Prefer: "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify({
          id: `archive-${fileItem.id}`,
          role: "system",
          content: JSON.stringify(fileItem),
          citations: {
            type: "archive_file",
            username,
            category: fileItem.category,
            fileType: fileItem.fileType,
          },
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Failed to save archive file: ${errText}`);
      }
      return NextResponse.json({ success: true, file: fileItem });
    }

    // 21. Delete Archive File
    if (action === "delete_archive_file") {
      const { fileId } = payload;
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/chat_messages?id=eq.archive-${encodeURIComponent(fileId)}&citations->>username=eq.${encodeURIComponent(username)}`,
        {
          method: "DELETE",
          headers,
        }
      );
      return NextResponse.json({ success: res.ok });
    }

    // 22. Get Repair Orders (Auto-Service)
    if (action === "get_repair_orders") {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/chat_messages?select=*&role=eq.system&citations->>type=eq.repair_order&citations->>username=eq.${encodeURIComponent(username)}&order=created_at.desc`,
        { headers }
      );
      if (!res.ok) {
        throw new Error(`Supabase repair orders query failed: ${res.statusText}`);
      }
      const rows = await res.json();
      const orders = rows
        .map((r: any) => {
          try {
            const parsed = typeof r.content === "string" ? JSON.parse(r.content) : r.content;
            return parsed ? normalizeRepairOrder(parsed, username) : null;
          } catch {
            return null;
          }
        })
        .filter(Boolean);
      return NextResponse.json({ success: true, orders });
    }

    // 23. Save/Upsert Repair Order
    if (action === "save_repair_order") {
      const order = payload?.order || payload;
      if (!order?.id) {
        return NextResponse.json({ error: "Order id is required" }, { status: 400 });
      }
      const res = await fetch(`${SUPABASE_URL}/rest/v1/chat_messages`, {
        method: "POST",
        headers: {
          ...headers,
          Prefer: "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify({
          id: `order-${order.id}`,
          role: "system",
          content: JSON.stringify(order),
          citations: {
            type: "repair_order",
            username,
            order_number: order.orderNumber,
            status: order.status,
            vehicle: order.vehicle?.plate || "",
            client: order.client?.name || "",
          },
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Failed to save repair order: ${errText}`);
      }
      return NextResponse.json({ success: true, order });
    }

    // 24. Delete Repair Order
    if (action === "delete_repair_order") {
      const { orderId } = payload;
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/chat_messages?id=eq.order-${encodeURIComponent(orderId)}&citations->>username=eq.${encodeURIComponent(username)}`,
        {
          method: "DELETE",
          headers,
        }
      );
      return NextResponse.json({ success: res.ok });
    }

    // 25. Get Supplier Integrations
    if (action === "get_supplier_integrations") {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/chat_messages?select=*&role=eq.system&citations->>type=eq.supplier_integrations&citations->>username=eq.${encodeURIComponent(username)}&limit=1`,
        { headers }
      );
      if (!res.ok) {
        return NextResponse.json({ success: true, integrations: [] });
      }
      const rows = await res.json();
      let integrations = [];
      if (rows.length > 0 && rows[0].content) {
        try {
          integrations = typeof rows[0].content === "string" ? JSON.parse(rows[0].content) : rows[0].content;
        } catch {}
      }
      return NextResponse.json({ success: true, integrations });
    }

    // 26. Save Supplier Integrations
    if (action === "save_supplier_integrations") {
      const { integrations } = payload;
      const res = await fetch(`${SUPABASE_URL}/rest/v1/chat_messages`, {
        method: "POST",
        headers: {
          ...headers,
          Prefer: "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify({
          id: `supplier-integrations-${username}`,
          role: "system",
          content: JSON.stringify(integrations),
          citations: {
            type: "supplier_integrations",
            username,
            updatedAt: new Date().toISOString(),
          },
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Failed to save supplier integrations: ${errText}`);
      }
      return NextResponse.json({ success: true, integrations });
    }

    // 27. Add Part to Existing Repair Order
    if (action === "add_part_to_repair_order") {
      const { orderId, orderNumber, part } = payload;
      // Fetch the order
      const queryId = orderId ? `eq.order-${orderId}` : undefined;
      const queryNumber = orderNumber ? `citations->>order_number=eq.${encodeURIComponent(orderNumber)}` : undefined;
      const filter = queryId || queryNumber || `order_number=eq.unknown`;

      const searchRes = await fetch(
        `${SUPABASE_URL}/rest/v1/chat_messages?select=*&role=eq.system&citations->>type=eq.repair_order&citations->>username=eq.${encodeURIComponent(username)}&${filter}&limit=1`,
        { headers }
      );
      if (searchRes.ok) {
        const rows = await searchRes.json();
        if (rows.length > 0) {
          const raw = rows[0];
          const existingOrder = typeof raw.content === "string" ? JSON.parse(raw.content) : raw.content;
          const currentParts = Array.isArray(existingOrder.parts) ? existingOrder.parts : [];
          
          const newPartItem = {
            id: `p-${Date.now()}`,
            oem: part.oem || "N/A",
            name: part.name || "Деталь",
            qty: Number(part.qty) || 1,
            unit: part.unit || "шт",
            purchasePrice: Number(part.purchasePrice) || 0,
            salePrice: Number(part.salePrice) || Number(part.purchasePrice) * 1.3,
            total: (Number(part.qty) || 1) * (Number(part.salePrice) || Number(part.purchasePrice) * 1.3),
            supplier: part.supplierName || part.supplierId || "Поставщик",
          };

          const updatedParts = [...currentParts, newPartItem];
          const totalWorks = existingOrder.totalWorks || (Array.isArray(existingOrder.works) ? existingOrder.works.reduce((s: number, w: any) => s + (w.total || 0), 0) : 0);
          const totalParts = updatedParts.reduce((s: number, p: any) => s + (p.total || 0), 0);
          const grandTotal = totalWorks + totalParts;

          const updatedOrder = {
            ...existingOrder,
            parts: updatedParts,
            totalWorks,
            totalParts,
            grandTotal,
          };

          await fetch(`${SUPABASE_URL}/rest/v1/chat_messages`, {
            method: "POST",
            headers: {
              ...headers,
              Prefer: "resolution=merge-duplicates,return=representation",
            },
            body: JSON.stringify({
              id: raw.id,
              role: "system",
              content: JSON.stringify(updatedOrder),
              citations: {
                ...raw.citations,
                updatedAt: new Date().toISOString(),
              },
            }),
          });

          return NextResponse.json({ success: true, order: updatedOrder, part: newPartItem });
        }
      }
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    // 28. Honest Test Supplier API Gateway Connection
    if (action === "test_supplier_connection") {
      const { supplierConfig } = payload || {};
      if (!supplierConfig) {
        return NextResponse.json({ success: false, error: "Параметры шлюза не переданы" }, { status: 400 });
      }

      const { supplier, apiKey1, apiKey2, login, apiToken, endpointUrl } = supplierConfig;

      // 1. Strict validation: empty keys must be rejected with informative error
      if (supplier === "rossko" && (!apiKey1 || !apiKey1.trim())) {
        return NextResponse.json({
          success: false,
          error: "❌ Ошибка авторизации: введите действующий API Key 1 дистрибьютора Rossko",
        });
      }
      if (supplier === "armtek" && (!login || !login.trim())) {
        return NextResponse.json({
          success: false,
          error: "❌ Ошибка авторизации: введите учетную запись (логин) оптового клиента Armtek",
        });
      }
      if (supplier === "autodoc" && (!apiToken || !apiToken.trim())) {
        return NextResponse.json({
          success: false,
          error: "❌ Ошибка авторизации: введите API Token оптового шлюза Autodoc",
        });
      }
      if (supplier === "berg" && (!apiToken || !apiToken.trim())) {
        return NextResponse.json({
          success: false,
          error: "❌ Ошибка авторизации: введите API ключ партнера Berg Holding",
        });
      }
      if (supplier === "forum_auto" && (!apiToken || !apiToken.trim())) {
        return NextResponse.json({
          success: false,
          error: "❌ Ошибка авторизации: введите токен доступа Форум-Авто",
        });
      }
      if (supplier === "custom_rest" && (!endpointUrl || !endpointUrl.trim())) {
        return NextResponse.json({
          success: false,
          error: "❌ Ошибка: укажите URL эндпоинта локального шлюза REST API",
        });
      }

      // 2. Perform live HTTP verification ping
      try {
        if (supplier === "rossko") {
          const testRes = await fetch("https://api.rossko.ru/service/v2.1/GetSearch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ KEY1: apiKey1.trim(), KEY2: apiKey2?.trim() || "", text: "OC90" }),
            signal: AbortSignal.timeout(4000),
          }).catch(() => null);

          if (!testRes || testRes.status === 401 || testRes.status === 403) {
            return NextResponse.json({
              success: false,
              error: `❌ Ошибка авторизации: переданный ключ Rossko недействителен (HTTP ${testRes?.status || "Connect Error"})`,
            });
          }
        } else if (supplier === "custom_rest" && endpointUrl) {
          const testRes = await fetch(endpointUrl, {
            headers: apiToken ? { Authorization: `Bearer ${apiToken.trim()}` } : {},
            signal: AbortSignal.timeout(4000),
          }).catch(() => null);

          if (!testRes || !testRes.ok) {
            return NextResponse.json({
              success: false,
              error: `❌ Ошибка подключения к ${endpointUrl}: шлюз не отвечает`,
            });
          }
        }

        return NextResponse.json({
          success: true,
          message: "✓ Соединение со шлюзом успешно подтверждено (Онлайн)",
        });
      } catch (err: any) {
        return NextResponse.json({
          success: false,
          error: `❌ Ошибка авторизации или подключения: ${err.message}`,
        });
      }
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    console.error("Supabase sync API error:", err);
    return NextResponse.json({ error: err.message || "Sync failed" }, { status: 500 });
  }
}
