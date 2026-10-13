-- ==============================================================================
-- Geo AI CRM: Supabase PostgreSQL Schema
-- Tables: chat_messages, calendar_events, licenses, incoming_mails, projects
-- ==============================================================================

-- 1. Ensure chat_messages table with full support for sessions and citations
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id TEXT PRIMARY KEY,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    citations JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON public.chat_messages USING gin (citations);

-- 2. Optional dedicated calendar_events table
CREATE TABLE IF NOT EXISTS public.calendar_events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    date DATE NOT NULL,
    time TEXT,
    description TEXT,
    tag TEXT DEFAULT 'Дедлайн' CHECK (tag IN ('Проверка', 'Дедлайн', 'Встреча', 'Отчет')),
    priority TEXT DEFAULT 'HIGH' CHECK (priority IN ('CRITICAL', 'HIGH', 'NORMAL')),
    license_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON public.calendar_events(date);

-- Enable Row Level Security (RLS) with permissive access for application
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'chat_messages' AND policyname = 'Allow public access to chat_messages'
    ) THEN
        CREATE POLICY "Allow public access to chat_messages" ON public.chat_messages FOR ALL USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'calendar_events' AND policyname = 'Allow public access to calendar_events'
    ) THEN
        CREATE POLICY "Allow public access to calendar_events" ON public.calendar_events FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
