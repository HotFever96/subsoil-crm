import { NextRequest, NextResponse } from "next/server";

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

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    console.error("Supabase sync API error:", err);
    return NextResponse.json({ error: err.message || "Sync failed" }, { status: 500 });
  }
}
