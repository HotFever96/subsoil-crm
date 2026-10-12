-- ==============================================================================
-- GEONEDRA: ИНИЦИАЛИЗАЦИЯ ИНФРАСТРУКТУРЫ БАЗЫ ДАННЫХ В SUPABASE (POSTGRESQL)
-- Запустите этот скрипт в Supabase Dashboard -> SQL Editor -> New query -> Run
-- ==============================================================================

-- Включаем расширение для генерации UUID, если оно не активно
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ТАБЛИЦА: РЕЕСТР ЛИЦЕНЗИЙ НА НЕДРОПОЛЬЗОВАНИЕ
CREATE TABLE IF NOT EXISTS public.licenses (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    subsoil_plot TEXT NOT NULL,
    mineral_type TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'EXPIRED', 'UNDER_REVIEW', 'SUSPENDED')),
    holder TEXT NOT NULL,
    region TEXT NOT NULL,
    issue_date TEXT NOT NULL,
    expiry_date TEXT NOT NULL,
    curator TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. ТАБЛИЦА: ДЕЛОВАЯ ПЕРЕПИСКА (SMART MAIL / ПРЕДПИСАНИЯ ГОСОРГАНОВ)
CREATE TABLE IF NOT EXISTS public.incoming_mails (
    id TEXT PRIMARY KEY,
    incoming_number TEXT NOT NULL,
    date TEXT NOT NULL,
    agency TEXT NOT NULL,
    department TEXT NOT NULL,
    subject TEXT NOT NULL,
    urgency TEXT NOT NULL CHECK (urgency IN ('HIGH', 'CRITICAL', 'STANDARD')),
    deadline TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('PENDING_APPROVAL', 'APPROVED', 'EDITED', 'SENT')),
    incoming_content TEXT NOT NULL,
    license_id TEXT REFERENCES public.licenses(id) ON DELETE SET NULL,
    license_code TEXT NOT NULL,
    ai_draft JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. ТАБЛИЦА: ДИАЛОГИ И КОНСУЛЬТАЦИИ (AI LEGAL EXPERT)
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id TEXT PRIMARY KEY,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    citations JSONB DEFAULT '[]'::jsonb
);

-- 4. ТАБЛИЦА: МУЛЬТИАГЕНТНЫЕ ПРОЕКТЫ И ПОДРАЗДЕЛЫ (PROJECT STUDIO)
CREATE TABLE IF NOT EXISTS public.projects (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    license_code TEXT NOT NULL,
    deposit_name TEXT NOT NULL,
    mineral_type TEXT NOT NULL,
    holder_company TEXT NOT NULL,
    region TEXT NOT NULL,
    subsoil_plot_area_ha NUMERIC(10, 2) DEFAULT 24.8,
    annual_capacity_thousand_m3 NUMERIC(10, 2) DEFAULT 250.0,
    stripping_ratio NUMERIC(10, 2) DEFAULT 0.38,
    quarry_depth_m NUMERIC(10, 2) DEFAULT 18.5,
    groundwater_level_m NUMERIC(10, 2) DEFAULT 22.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.project_subsections (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES public.projects(id) ON DELETE CASCADE,
    category_code TEXT NOT NULL, -- e.g. "Раздел 1", "Раздел 2"
    category_title TEXT NOT NULL,
    code TEXT NOT NULL, -- e.g. "1.1", "2.1"
    title TEXT NOT NULL,
    responsible_agent TEXT NOT NULL CHECK (responsible_agent IN ('ENGINEER', 'LEGAL', 'ECOLOGIST')),
    status TEXT NOT NULL CHECK (status IN ('NEEDS_DATA', 'AI_DRAFT', 'APPROVED')),
    summary TEXT,
    content TEXT NOT NULL,
    agent_explanation TEXT,
    normative_base JSONB DEFAULT '[]'::jsonb,
    revisions_count INT DEFAULT 1,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- НАСТРОЙКА БЕЗОПАСНОСТИ: ROW LEVEL SECURITY (RLS)
-- Включаем RLS и разрешаем чтение и изменение для авторизованных клиентов / anon-key
-- ==============================================================================

ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incoming_mails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_subsections ENABLE ROW LEVEL SECURITY;

-- Создаем базовые политики публичного доступа (для демонстрации и работы anon ключа)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public access to licenses" ON public.licenses;
    CREATE POLICY "Public access to licenses" ON public.licenses FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access to incoming_mails" ON public.incoming_mails;
    CREATE POLICY "Public access to incoming_mails" ON public.incoming_mails FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access to chat_messages" ON public.chat_messages;
    CREATE POLICY "Public access to chat_messages" ON public.chat_messages FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access to projects" ON public.projects;
    CREATE POLICY "Public access to projects" ON public.projects FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access to project_subsections" ON public.project_subsections;
    CREATE POLICY "Public access to project_subsections" ON public.project_subsections FOR ALL USING (true) WITH CHECK (true);
END $$;

-- ==============================================================================
-- СИДИРОВАНИЕ: ПЕРВИЧНЫЕ ДАННЫЕ ДЛЯ РАБОТЫ CRM-СИСТЕМЫ
-- ==============================================================================

INSERT INTO public.licenses (id, code, subsoil_plot, mineral_type, status, holder, region, issue_date, expiry_date, curator)
VALUES 
('lic-001', 'КРР 01842 ТЭ', 'Усть-Балыкское месторождение (Северный купол)', 'Углеводородное сырье / Нефть, попутный газ', 'ACTIVE', 'ООО «Евразия Недра Девелопмент»', 'ХМАО-Югра, Нефтеюганский район', '14.05.2018', '31.12.2038', 'Иванов В.С. (Горный инженер)'),
('lic-002', 'ЯМА 83910 БР', 'Харасавэйский лицензионный сектор №4', 'Природный газ, газовый конденсат', 'UNDER_REVIEW', 'АО «ПолярНефтеГеология»', 'ЯНАО, Ямальский район', '20.10.2021', '20.10.2046', 'Соколова Е.А. (Главный геолог)'),
('lic-003', 'КЕМ 04112 ТП', 'Участок «Глубокий-2», Ерунаковский угленосный район', 'Каменный уголь (марка Ж, К)', 'ACTIVE', 'ООО «КузбассУгольРесурс»', 'Кемеровская область - Кузбасс', '11.02.2016', '15.07.2031', 'Матвеев Д.Н. (Маркшейдер)'),
('lic-004', 'МСК 02841 ТЭ', 'Месторождение «Березовское-3» (Западный участок)', 'Песчано-гравийные породы (ОПИ)', 'ACTIVE', 'ООО «МособлНерудСтройХолдинг»', 'Московская область, Волоколамский округ', '10.04.2020', '31.12.2045', 'Воропаев И.Б. (ГИП)')
ON CONFLICT (id) DO NOTHING;

-- Заполнение первичных писем
INSERT INTO public.incoming_mails (id, incoming_number, date, agency, department, subject, urgency, deadline, status, license_id, license_code, incoming_content, ai_draft)
VALUES
(
    'mail-101',
    '№ 04-22/10492',
    '10.10.2026',
    'Роснедра (Центрсибнедра)',
    'Отдел геологического контроля и охраны недр',
    'О предоставлении ежеквартальной формы 70-тп и отчетности по доразведке залежи пласта АВ1-2',
    'HIGH',
    '17.10.2026',
    'PENDING_APPROVAL',
    'lic-001',
    'КРР 01842 ТЭ',
    'Настоящим Департамент по недропользованию уведомляет о необходимости предоставления в срок до 17.10.2026 года уточненных сведений по выполнению условий лицензионного соглашения КРР 01842 ТЭ.',
    '{
        "title": "Проект ответа: Исх. № ЮР-26/894 в Департамент по недропользованию (Центрсибнедра)",
        "legal_basis": ["Закон РФ «О недрах» № 2395-1, ст. 20, 21, 22", "Приказ Минприроды России № 756"],
        "reply_body": "В ответ на запрос № 04-22/10492 сообщаем, что полевой этап сейсморазведочных работ МОГТ-3D завершен подрядчиком. Комплект документов направляется в пределах нормативного срока.",
        "confidence_score": 98,
        "recommended_action": "Утвердить и подписать ЭЦП генерального директора до 14.10.2026"
    }'::jsonb
),
(
    'mail-102',
    '№ РПН-18/5501-ЭКО',
    '08.10.2026',
    'Росприроднадзор',
    'Северо-Уральское межрегиональное управление',
    'Требование об устранении нарушений порядка рекультивации нарушенных земель кустовой площадки №14',
    'CRITICAL',
    '14.10.2026',
    'PENDING_APPROVAL',
    'lic-001',
    'КРР 01842 ТЭ',
    'В ходе выездного осмотра зафиксировано размещение бурового шлама. Требуется предоставить проект рекультивации земель.',
    '{
        "title": "Проект возражения: Исх. № ЭКО-26/112",
        "legal_basis": ["ФЗ «Об охране окружающей среды» № 7-ФЗ", "Постановление Правительства РФ № 800"],
        "reply_body": "Участок временного складирования оборудован замкнутой системой безамбарного бурения с геомембранным барьером 1.5 мм. Причинение вреда исключено.",
        "confidence_score": 94,
        "recommended_action": "Рекомендовано согласование с Главным экологом перед утверждением"
    }'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Проект разработки ОПИ
INSERT INTO public.projects (id, title, license_code, deposit_name, mineral_type, holder_company, region, subsoil_plot_area_ha, annual_capacity_thousand_m3, stripping_ratio, quarry_depth_m, groundwater_level_m)
VALUES
(
    'proj-opi-2026-01',
    'Технический проект разработки месторождения песчано-гравийной смеси «Березовское-3» открытым способом с проектом рекультивации',
    'МСК 02841 ТЭ',
    'Месторождение «Березовское-3» (Западный участок)',
    'Песчано-гравийные породы (ОПИ для дорожного строительства)',
    'ООО «МособлНерудСтройХолдинг»',
    'Московская область, Волоколамский муниципальный округ',
    24.8,
    250.0,
    0.38,
    18.5,
    22.0
)
ON CONFLICT (id) DO NOTHING;
