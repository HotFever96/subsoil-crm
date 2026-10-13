import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hrdchbltqfakgxxkjroy.supabase.co";
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
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
        events: []
      });
    }

    const headers = getHeaders();
    const body = await req.json();
    const { action, payload } = body;

    // 1. Get all chat sessions & messages from Supabase
    if (action === "get_chats") {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/chat_messages?select=*&role=in.(user,assistant)&order=created_at.asc`,
        { headers }
      );
      if (!res.ok) {
        throw new Error(`Supabase query failed: ${res.statusText}`);
      }
      const rows = await res.json();
      return NextResponse.json({ success: true, rows });
    }

    // 2. Save/Upsert chat message
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

    // 3. Delete session messages
    if (action === "delete_chat_session") {
      const { sessionId } = payload;
      // In Supabase REST API, filter jsonb field using ->> operator
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/chat_messages?citations->>session_id=eq.${encodeURIComponent(sessionId)}`,
        {
          method: "DELETE",
          headers,
        }
      );
      return NextResponse.json({ success: res.ok });
    }

    // 4. Get calendar events
    if (action === "get_calendar_events") {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/chat_messages?select=*&role=eq.system&citations->>type=eq.calendar_event&order=created_at.asc`,
        { headers }
      );
      if (!res.ok) {
        throw new Error(`Supabase calendar query failed: ${res.statusText}`);
      }
      const rows = await res.json();
      const events = rows.map((r: any) => {
        try {
          return typeof r.content === "string" ? JSON.parse(r.content) : r.content;
        } catch {
          return null;
        }
      }).filter(Boolean);
      return NextResponse.json({ success: true, events });
    }

    // 5. Save/Upsert calendar event
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

    // 6. Delete calendar event
    if (action === "delete_calendar_event") {
      const { eventId } = payload;
      const res = await fetch(`${SUPABASE_URL}/rest/v1/chat_messages?id=eq.${encodeURIComponent(eventId)}`, {
        method: "DELETE",
        headers,
      });
      return NextResponse.json({ success: res.ok });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    console.error("Supabase sync API error:", err);
    return NextResponse.json({ error: err.message || "Sync failed" }, { status: 500 });
  }
}
