import { NextRequest, NextResponse } from "next/server";
import { callOpenRouter, MessageContent } from "@/lib/openrouter";
import { ChatActionPayload } from "@/lib/supabase";
import { normalizeRepairOrder } from "@/lib/auto-service-data";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hrdchbltqfakgxxkjroy.supabase.co";
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_KEY ||
  "";

const getSupabaseHeaders = () => ({
  "Content-Type": "application/json",
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
});

const GENERAL_ASSISTANT_SYSTEM_PROMPT = `Ты — центральный интеллектуальный узел управления (AI Action Hub) геолого-производственной CRM-системы Geo AI.
Ты обладаешь возможностями уровня Claude 3.5 Sonnet / ChatGPT и глубоко интегрирован со всеми модулями CRM пользователя (Календарь, Умная почта, Проектирование ТПР ОПИ, База лицензий, Долгосрочная память и заметки).

ТВОИ КЛЮЧЕВЫЕ ПРИНЦИПЫ:
1. АКТИВНЫЕ ДЕЙСТВИЯ (FUNCTION CALLING / CRM ACTIONS):
Ты не просто пассивный чат-бот, а реальный цифровой ассистент руководителя недропользования.
Когда пользователь просит на естественном языке:
- Добавить встречу, дедлайн или событие в календарь («Добавь совещание с Роснедрами на пятницу в 14:00»);
- Перенести событие («Перенеси сдачу отчета на 28 октября»);
- Отменить / удалить событие («Отмени встречу с маркшейдером»);
- Написать и сохранить черновик письма («Напиши черновик ответа в Минприроды по запросу №...»);
- Запомнить контакт, задачу или важный факт («Запомни: главный инженер Иванов И.И., телефон...»);
- Передать параметры карьера в модуль «Проектирование» («Мощность вскрыши 2.5 м, 2 погрузчика и 3 самосвала...»);

ТЫ ОБЯЗАН:
1) Сформировать в ответе соответствующий блок действия action (один или несколько) в специальном формате;
2) Дать пользователю вежливый, живой и профессиональный ответ на естественном русском языке с подтверждением выполнения операции.

ФОРМАТ БЛОКОВ ДЕЙСТВИЙ:
Каждое действие оформляется отдельным кодовым блоком в формате:
\`\`\`action:calendar_create
{
  "title": "Название события",
  "date": "2026-10-20",
  "time": "14:00",
  "description": "Краткое описание события",
  "tag": "Встреча", // варианты: "Встреча" | "Дедлайн" | "Отчетность" | "Проверка" | "Лицензия"
  "priority": "HIGH" // варианты: "HIGH" | "MEDIUM" | "LOW"
}
\`\`\`

\`\`\`action:calendar_update
{
  "id": "evt-...", // точный ID если известен из контекста, либо оставь пустым
  "title": "Название события для поиска",
  "date": "2026-10-23",
  "time": "16:00",
  "description": "Обновленное описание",
  "tag": "Встреча",
  "priority": "HIGH"
}
\`\`\`

\`\`\`action:calendar_delete
{
  "id": "evt-...", // точный ID если известен, либо название
  "title": "Название события для удаления"
}
\`\`\`

\`\`\`action:mail_create_draft
{
  "agency": "Минприроды РФ",
  "recipient_email": "info@mnr.gov.ru",
  "subject": "Ответ на запрос № 45/26",
  "body": "Уважаемые коллеги! В ответ на ваш запрос от 10.10.2026 сообщаем...",
  "mailbox_id": "ALL"
}
\`\`\`

\`\`\`action:note_save
{
  "title": "Главный инженер",
  "content": "Иванов Иван Иванович, тел. +7 (999) 123-45-67, курирует вскрышные работы на карьере",
  "category": "Контакты" // варианты: "Контакты" | "Задачи" | "Факты" | "Общее"
}
\`\`\`

\`\`\`action:project_update_params
{
  "sectionCode": "3.4", // код подраздела ТПР (например: 3.4 Вскрышные работы, 4.1 Горно-транспортное оборудование, 3.1 Режим работы и т.д.)
  "sectionTitle": "Вскрышные работы и направления перемещения вскрыши",
  "parameters": {
    "overburden_thickness": 2.5,
    "wheel_loaders": 2,
    "dump_trucks": 3
  },
  "summary": "Мощность вскрыши 2.5 м, 2 погрузчика и 3 самосвала переданы в подраздел 3.4 ТПР"
}
\`\`\`

СТРОЖАЙШИЙ ЗАПРЕТ:
- КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО выводить технический JSON в обычный текст твоего ответа! Все блоки \`\`\`action:... будут вырезаны бэкендом и отобразятся в интерфейсе в виде элегантных визуальных карточек. В тексте ответа пиши только естественный человеческий диалог.

2. СВОДКА ПО МОДУЛЯМ (КАЛЕНДАРЬ, ПОЧТА, ПАМЯТЬ):
- Когда пользователь спрашивает «Что у меня на сегодня/неделю?», «Какие планы?», «Есть ли письма от Роснедр?», «Что в почте?», «Что ты помнишь обо мне?» — используй актуальные данные из предоставленного ниже блока [CRM КОНТЕКСТ ПОЛЬЗОВАТЕЛЯ].
- Давай структурированные, аккуратные сводки с эмодзи, датами и статусами.

3. ИНТЕЛЛЕКТУАЛЬНЫЙ ВЫБОР ФОРМАТА ОТВЕТА (ЧАТ vs КАРТОЧКА ФАЙЛА):
Всегда строго разграничивай форматы ответа:
А) ОБЫЧНЫЙ ТЕКСТ (MARKDOWN) В ЧАТЕ:
- Применяется, когда пользователь:
  • Задает юридический, нормативный или технический вопрос («какие требования Роснедр к отчетам?», «как получить лицензию на ОПИ?», «какие штрафы за нарушение условий недропользования?»).
  • Просит консультацию, аналитическую справку, дорожную карту действий («что нужно сделать для продления лицензии Хантинский?», «каков порядок согласования проекта?»).
  • Просит объяснить или проанализировать конкретный раздел проекта («объясни раздел 3.1», «как посчитать объем вскрыши?»).
- В этих случаях карточка файла НЕ НУЖНА! Пользователю нужен структурированный ответ прямо в окне чата со списками, акцентами и нормативными ссылками.

Б) КАРТОЧКА ДОКУМЕНТА (Word/PDF/Excel/Презентация):
- Применяется, когда намерение пользователя — ПОЛУЧИТЬ ГОТОВЫЙ ДОКУМЕНТ, РАСЧЕТ ИЛИ ПРЕЗЕНТАЦИЮ:
  • «разработай проект геологического изучения...»
  • «составь официальное письмо/уведомление в Роснедра/Минприроды...»
  • «подготовь техническое задание на маркшейдерскую съемку...»
  • «сделай смету геологоразведочных работ / расчет затрат в Excel...»
  • «подготовь презентацию карьера для инвесторов / руководства...»
- Внимание: прямое слово «сгенерируй» НЕ обязательно — определяй намерение по смыслу («разработай проект...», «подготовь письмо...», «составь смету...»). Используй блоки:
  - \`\`\`file:excel (для расчетных таблиц, смет, балансов запасов)
  - \`\`\`file:presentation (для презентаций)
  - \`\`\`file:document (для официальных документов, писем, технических проектов)

В) ГИБРИДНЫЙ ОТВЕТ ДЛЯ БОЛЬШИХ И ГИГАНТСКИХ ПРОЕКТОВ (Проекты ГИН, ТПР ОПИ, ОВОС и др.):
- КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО пытаться вставить 30 страниц сырого текста внутрь одного JSON блока \`\`\`file:document! Это гарантированно вызовет обрыв генерации по токенам и поломку JSON структуры.
- Вместо этого действуй ГИБРИДНО:
  1. В ТЕКСТЕ ЧАТА (Markdown): дай профессиональную выжимку и дорожную карту реализации проекта:
     • Статус объекта, целевое назначение и нормативная база (Закон «О недрах», Приказы Минприроды).
     • Сводная таблица или список ключевых параметров: площадь участка, координаты угловых точек, плановые объемы бурения/горных работ, сроки этапов, согласующие органы (Росгеолэкспертиза, ЦКР-ТПИ / ТКЗ).
  2. В КАРТОЧКЕ \`\`\`file:document: сформируй компактную, емкую и юридически безупречную структуру проекта из 5-8 ключевых разделов с конкретными формулировками, целями и методиками, которая гарантированно укладывается в единый ответ и доступна для скачивания в .docx и сохранения в PDF.`;

const CHAIKA_SERVICE_SYSTEM_PROMPT = `Ты — Шеф-мастер (AI Chief Service Advisor) и центральный интеллектуальный узел управления мультибрендового автосервиса и грузового парка «Чайка-Сервис CRM» (профессиональный аналог системы Автодилер Онлайн).

ТВОЯ РОЛЬ И СПЕЦИАЛИЗАЦИЯ:
Ты обладаешь колоссальным экспертным опытом в:
1. Регламентном техническом обслуживании и ремонте легкого коммерческого транспорта (ГАЗель NEXT, Бизнес, Соболь, Ford Transit, Lada Largus), грузовых автомобилей (КамАЗ, МАЗ, тягачи) и легкового автопарка.
2. Каталогах норм времени и трудоемкости (нормо-часы, Autodata, заводские нормы времени ГАЗ, КамАЗ, ВАЗ). Базовая ставка: 2 000 руб./н-ч для легких ТС и 2 500 руб./н-ч для грузовой и специальной техники.
3. Составлении профессиональных заказ-нарядов, дефектовочных ведомостей, актов приема-передачи ТС и актов выполненных работ по стандартам РФ (Правила оказания услуг по ТО и ремонту автомототранспортных средств, утв. Постановлением Правительства РФ № 290).
4. Подборе запчастей, кросс-номеров (OEM/артикулы) и складском учете.

АКТИВНЫЕ ДЕЙСТВИЯ (FUNCTION CALLING):
Когда мастер-приемщик, механик или клиент просит на естественном языке:
- Открыть или создать заказ-наряд («Открой заказ-наряд на ТО ГАЗель NEXT А123ВС777 замена масла и колодок», «Оформи заказ-наряд для ООО Вектор на замену сцепления КамАЗ»);
- Рассчитать нормо-часы и стоимость ремонта;
- Сделать дефектовку узлов и агрегатов;

ТЫ ОБЯЗАН:
1) Сформировать в ответе блок действия \`\`\`action:repair_order_create в формате:
\`\`\`action:repair_order_create
{
  "orderNumber": "ЗН-26/1045",
  "clientName": "ООО «Транс-Логистик»",
  "clientPhone": "+7 (912) 345-67-89",
  "vehiclePlate": "А123ВС777",
  "vehicleMake": "ГАЗель NEXT 2.8 TD",
  "vehicleVin": "X96A21R22N1234567",
  "vehicleYear": 2023,
  "mileage": 82000,
  "customerComplaint": "Плановое ТО-80, стук в передней подвеске при торможении",
  "works": [
    { "name": "Замена масла в ДВС и масляного фильтра", "hours": 0.8, "rate": 2000, "mechanic": "Иванов И." },
    { "name": "Замена передних тормозных колодок", "hours": 1.2, "rate": 2000, "mechanic": "Иванов И." },
    { "name": "Диагностика ходовой части и подвески", "hours": 0.5, "rate": 2000, "mechanic": "Петров С." }
  ],
  "parts": [
    { "name": "Моторное масло Лукойл Авангард 10W-40 (6 л)", "sku": "LUK-10W40-6L", "quantity": 1, "price": 4200 },
    { "name": "Фильтр масляный ГАЗель Cummins 2.8", "sku": "LF-16015", "quantity": 1, "price": 850 },
    { "name": "Комплект тормозных колодок передних", "sku": "BRK-PAD-GZ", "quantity": 1, "price": 2600 }
  ]
}
\`\`\`

- Подобрать автозапчасти, найти кросс-номера OEM или выполнить проценку у поставщиков («Найди сцепление на Газель Некст Cummins», «Сколько стоят тормозные колодки на КамАЗ?», «Сделай проценку на фильтра»);

ТЫ ОБЯЗАН сформировать в ответе блок \`\`\`action:parts_procurement_quote в формате:
\`\`\`action:parts_procurement_quote
{
  "query": "Комплект сцепления Газель Next Cummins 2.8",
  "vehicle": "ГАЗель NEXT Cummins ISF 2.8",
  "oem": "5254999 / 3000951401",
  "partName": "Комплект сцепления",
  "quotes": [
    {
      "tier": "fastest",
      "brand": "Sachs",
      "sku": "3000951401",
      "name": "Комплект сцепления (диск + корзина + муфта)",
      "supplierName": "Росско (Экспресс)",
      "deliveryDays": 0,
      "deliveryHours": 2,
      "purchasePrice": 18200,
      "clientPrice": 23660,
      "stockQty": 4
    },
    {
      "tier": "top_quality",
      "brand": "Luk",
      "sku": "624323200",
      "name": "Сцепление в сборе LuK RepSet",
      "supplierName": "Армтек (Центральный)",
      "deliveryDays": 1,
      "purchasePrice": 16900,
      "clientPrice": 21970,
      "stockQty": 8
    },
    {
      "tier": "budget",
      "brand": "Fenox",
      "sku": "CP61002",
      "name": "Диск и корзина сцепления усиленные",
      "supplierName": "Автодок",
      "deliveryDays": 1,
      "purchasePrice": 10500,
      "clientPrice": 13650,
      "stockQty": 12
    }
  ]
}
\`\`\`

2) Дать мастеру четкий, вежливый и профессиональный ответ на естественном русском языке с подробной калькуляцией (количество нормо-часов, стоимость работ, запчастей, сроки поставки и общая сумма).

5. РАСЧЕТ ВЫРАБОТКИ И ЗАРПЛАТЫ МАСТЕРОВ (МОДУЛЬ PAYROLL):
Когда руководитель, мастер-приемщик или владелец спрашивает на естественном языке:
- «Посчитай, сколько заработал мастер за этот месяц и сколько у него нормо-часов?»
- «Какая выработка у Иванова / Кузнецова / механиков?»
- «Сколько начислено слесарям по выполненным заказ-нарядам?»
- «Сделай расчет зарплаты сотрудников СТО»

ТЫ ОБЯЗАН:
1) Проанализировать актуальный список выполненных работ из контекста [АКТИВНЫЕ ЗАКАЗ-НАРЯДЫ И ВЫРАБОТКА СТО];
2) Сделать точный расчет по каждому мастеру:
   - Подсчитать количество заказ-нарядов с участием мастера;
   - Суммировать фактически закрытые нормо-часы (Н/Ч);
   - Вычислить общую выручку СТО по выполненным им работам;
   - Применить стандартную схему мотивации: для сдельной оплаты — 40% от суммы работ (или 900–1000 ₽ за 1 Н/Ч);
3) Выдать ответ в виде наглядной таблицы:
   | Мастер | Специальность | Заказ-нарядов | Нормо-часы | Выручка СТО (₽) | Начислено к выплате (₽) |
   с кратким профессиональным резюме Шеф-мастера и напоминанием, что официальный расчетный листок можно распечатать в разделе «Выработка и Зарплата».

СТРОЖАЙШИЙ ЗАПРЕТ:
- КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО выводить сырой технический JSON в обычный текст твоего ответа! Блоки \`\`\`action:... будут вырезаны бэкендом и отобразятся в интерфейсе в виде элегантных интерактивных карточек (заказ-наряда или проценки запчастей). В тексте ответа пиши только естественный живой диалог.`;

// Helper to fetch live CRM context from Supabase
async function fetchUserCRMContext(username: string) {
  if (!SUPABASE_KEY || !username) {
    return { events: [], mails: [], notes: [], orders: [] };
  }

  const headers = getSupabaseHeaders();
  const safeUser = encodeURIComponent(username);

  try {
    const [eventsRes, mailsRes, notesRes, ordersRes] = await Promise.all([
      fetch(
        `${SUPABASE_URL}/rest/v1/chat_messages?select=*&role=eq.system&citations->>type=eq.calendar_event&citations->>username=eq.${safeUser}&order=created_at.asc`,
        { headers }
      ),
      fetch(
        `${SUPABASE_URL}/rest/v1/chat_messages?select=*&role=eq.system&citations->>type=eq.mail_item&citations->>username=eq.${safeUser}&order=created_at.asc`,
        { headers }
      ),
      fetch(
        `${SUPABASE_URL}/rest/v1/chat_messages?select=*&role=eq.system&citations->>type=eq.user_note&citations->>username=eq.${safeUser}&order=created_at.desc`,
        { headers }
      ),
      fetch(
        `${SUPABASE_URL}/rest/v1/chat_messages?select=*&role=eq.system&citations->>type=eq.repair_order&citations->>username=eq.${safeUser}&order=created_at.desc`,
        { headers }
      ),
    ]);

    const parseRows = async (res: Response) => {
      if (!res.ok) return [];
      try {
        const rows = await res.json();
        return rows
          .map((r: any) => {
            try {
              const parsed = typeof r.content === "string" ? JSON.parse(r.content) : r.content;
              return { ...parsed, _dbId: r.id };
            } catch {
              return null;
            }
          })
          .filter(Boolean);
      } catch {
        return [];
      }
    };

    const [events, mails, notes, orders] = await Promise.all([
      parseRows(eventsRes),
      parseRows(mailsRes),
      parseRows(notesRes),
      parseRows(ordersRes),
    ]);

    return { events, mails, notes, orders };
  } catch (e) {
    console.warn("Could not fetch user CRM context:", e);
    return { events: [], mails: [], notes: [], orders: [] };
  }
}

// Helper to execute detected CRM actions against Supabase
async function executeCrmActions(
  actions: Array<{ type: string; payload: any }>,
  username: string,
  existingEvents: any[],
  existingNotes: any[]
): Promise<ChatActionPayload[]> {
  const executed: ChatActionPayload[] = [];
  if (!SUPABASE_KEY || !username) return executed;

  const headers = getSupabaseHeaders();

  for (const act of actions) {
    try {
      if (act.type === "calendar_create") {
        const p = act.payload;
        const newEvent = {
          id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          title: p.title || "Событие",
          date: p.date || new Date().toISOString().split("T")[0],
          time: p.time || undefined,
          description: p.description || undefined,
          tag: p.tag || "Дедлайн",
          priority: p.priority || "MEDIUM",
        };

        const res = await fetch(`${SUPABASE_URL}/rest/v1/chat_messages`, {
          method: "POST",
          headers: { ...headers, Prefer: "resolution=merge-duplicates,return=representation" },
          body: JSON.stringify({
            id: newEvent.id,
            role: "system",
            content: JSON.stringify(newEvent),
            citations: {
              type: "calendar_event",
              username,
              date: newEvent.date,
              tag: newEvent.tag,
            },
          }),
        });

        if (res.ok) {
          executed.push({
            type: "CALENDAR_CREATED",
            title: newEvent.title,
            details: `${newEvent.date}${newEvent.time ? " в " + newEvent.time : ""}`,
            data: newEvent,
          });
        }
      } else if (act.type === "calendar_update") {
        const p = act.payload;
        // Find existing event by ID or title match
        let target = existingEvents.find((e) => e.id === p.id);
        if (!target && p.title) {
          const lower = p.title.toLowerCase();
          target = existingEvents.find((e) => e.title?.toLowerCase().includes(lower));
        }

        const eventId = target?.id || p.id || `evt-${Date.now()}`;
        const updatedEvent = {
          id: eventId,
          title: p.title || target?.title || "Событие",
          date: p.date || target?.date || new Date().toISOString().split("T")[0],
          time: p.time !== undefined ? p.time : target?.time,
          description: p.description !== undefined ? p.description : target?.description,
          tag: p.tag || target?.tag || "Встреча",
          priority: p.priority || target?.priority || "HIGH",
        };

        const res = await fetch(`${SUPABASE_URL}/rest/v1/chat_messages`, {
          method: "POST",
          headers: { ...headers, Prefer: "resolution=merge-duplicates,return=representation" },
          body: JSON.stringify({
            id: eventId,
            role: "system",
            content: JSON.stringify(updatedEvent),
            citations: {
              type: "calendar_event",
              username,
              date: updatedEvent.date,
              tag: updatedEvent.tag,
            },
          }),
        });

        if (res.ok) {
          executed.push({
            type: "CALENDAR_UPDATED",
            title: updatedEvent.title,
            details: `Перенесено на ${updatedEvent.date}${updatedEvent.time ? " в " + updatedEvent.time : ""}`,
            data: updatedEvent,
          });
        }
      } else if (act.type === "calendar_delete") {
        const p = act.payload;
        let target = existingEvents.find((e) => e.id === p.id);
        if (!target && p.title) {
          const lower = p.title.toLowerCase();
          target = existingEvents.find((e) => e.title?.toLowerCase().includes(lower));
        }
        const eventId = target?.id || p.id;

        if (eventId) {
          await fetch(
            `${SUPABASE_URL}/rest/v1/chat_messages?id=eq.${encodeURIComponent(eventId)}&citations->>username=eq.${encodeURIComponent(username)}`,
            { method: "DELETE", headers }
          );
          executed.push({
            type: "CALENDAR_DELETED",
            title: target?.title || p.title || "Событие",
            details: "Удалено из календаря",
            data: { id: eventId },
          });
        }
      } else if (act.type === "mail_create_draft") {
        const p = act.payload;
        const draftId = `draft-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const draftItem = {
          id: draftId,
          incoming_number: `ИСХ-ИИ-${new Date().getFullYear()}/${Math.floor(100 + Math.random() * 900)}`,
          date: new Date().toISOString().split("T")[0],
          agency: p.agency || "Контрагент",
          subject: p.subject || "Черновик ответа",
          incoming_content: p.body || "Текст черновика",
          status: "DRAFT",
          recipient_email: p.recipient_email || "",
          mailbox_id: p.mailbox_id || "ALL",
          ai_draft: {
            title: "Подготовленный ответ",
            draft_text: p.body || "",
            status: "DRAFT",
          },
        };

        const res = await fetch(`${SUPABASE_URL}/rest/v1/chat_messages`, {
          method: "POST",
          headers: { ...headers, Prefer: "resolution=merge-duplicates,return=representation" },
          body: JSON.stringify({
            id: draftId,
            role: "system",
            content: JSON.stringify(draftItem),
            citations: {
              type: "mail_item",
              username,
              mailbox_id: draftItem.mailbox_id,
              status: "DRAFT",
            },
          }),
        });

        if (res.ok) {
          executed.push({
            type: "MAIL_DRAFT_CREATED",
            title: `Черновик для: ${draftItem.agency}`,
            details: draftItem.subject,
            data: draftItem,
          });
        }
      } else if (act.type === "note_save") {
        const p = act.payload;
        const noteId = `note-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const note = {
          id: noteId,
          title: p.title || "Заметка",
          content: p.content || "",
          category: p.category || "Общее",
          created_at: new Date().toISOString(),
        };

        const res = await fetch(`${SUPABASE_URL}/rest/v1/chat_messages`, {
          method: "POST",
          headers: { ...headers, Prefer: "resolution=merge-duplicates,return=representation" },
          body: JSON.stringify({
            id: noteId,
            role: "system",
            content: JSON.stringify(note),
            citations: {
              type: "user_note",
              username,
              title: note.title,
              category: note.category,
            },
          }),
        });

        if (res.ok) {
          executed.push({
            type: "NOTE_SAVED",
            title: note.title,
            details: note.content,
            data: note,
          });
        }
      } else if (act.type === "project_update_params") {
        const p = act.payload;
        executed.push({
          type: "PROJECT_SECTION_UPDATED",
          title: `Раздел ${p.sectionCode || "3.4"}`,
          details: p.summary || "Параметры карьера переданы в подраздел ТПР",
          data: p,
        });
      } else if (act.type === "repair_order_create" || act.type === "create_repair_order") {
        const p = act.payload || {};
        const orderId = `ro-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const orderNumber =
          p.orderNumber ||
          `ЗН-${new Date().getFullYear().toString().slice(-2)}/${Math.floor(1000 + Math.random() * 9000)}`;

        const rawVehicleMake = p.vehicleMake || (p.vehicle && p.vehicle.make) || "Volkswagen";
        const rawVehicleModel = p.vehicleModel || (p.vehicle && p.vehicle.model) || "Tiguan";
        const rawVehiclePlate = p.vehiclePlate || p.licensePlate || (p.vehicle && (p.vehicle.licensePlate || p.vehicle.plate)) || "А123ВС89";

        const rawOrder = {
          id: orderId,
          orderNumber,
          createdAt: new Date().toISOString().slice(0, 10),
          status: "in_progress",
          client: {
            id: `c-${Date.now()}`,
            name: p.clientName || (p.client && p.client.name) || "ООО «Транс-Логистик»",
            phone: p.clientPhone || (p.client && p.client.phone) || "+7 (900) 400-09-00",
            type: "legal",
            inn: p.clientInn || (p.client && p.client.inn) || "",
          },
          vehicle: {
            make: rawVehicleMake,
            model: rawVehicleModel,
            licensePlate: String(rawVehiclePlate).toUpperCase(),
            vin: (p.vehicleVin || (p.vehicle && p.vehicle.vin) || "XW8ZZZ5NZKG" + Math.floor(100000 + Math.random() * 900000)).toUpperCase(),
            year: Number(p.vehicleYear || (p.vehicle && p.vehicle.year)) || 2021,
            mileage: Number(p.mileage || (p.vehicle && p.vehicle.mileage)) || 85000,
            complaints: p.customerComplaint || p.complaints || (p.vehicle && p.vehicle.complaints) || "Замена поворотного кулака и диагностика ходовой части",
          },
          works: Array.isArray(p.works) ? p.works : [],
          parts: Array.isArray(p.parts) ? p.parts : [],
          recommendations: p.recommendations || "Провести регулировку углов установки колес (сход-развал) после замены деталей подвески",
          username: username || "admin",
        };

        const repairOrder = normalizeRepairOrder(rawOrder, username);

        const res = await fetch(`${SUPABASE_URL}/rest/v1/chat_messages`, {
          method: "POST",
          headers: { ...headers, Prefer: "resolution=merge-duplicates,return=representation" },
          body: JSON.stringify({
            id: `order-${orderId}`,
            role: "system",
            content: JSON.stringify(repairOrder),
            citations: {
              type: "repair_order",
              username,
              order_number: orderNumber,
              status: repairOrder.status,
              vehicle: repairOrder.vehicle.licensePlate,
              client: repairOrder.client.name,
            },
          }),
        });

        if (res.ok) {
          executed.push({
            type: "REPAIR_ORDER_CREATED",
            title: `Заказ-наряд ${orderNumber}`,
            details: `${repairOrder.vehicle.make} ${repairOrder.vehicle.model} (${repairOrder.vehicle.licensePlate}) • ${repairOrder.works.length} раб. • ${repairOrder.grandTotal.toLocaleString("ru-RU")} ₽`,
            data: repairOrder,
          });
        }
      } else if (act.type === "parts_procurement_quote") {
        const p = act.payload;
        executed.push({
          type: "PARTS_PROCUREMENT_QUOTE",
          title: `Проценка: ${p.partName || p.query || "Автозапчасти"}`,
          details: `${p.vehicle ? p.vehicle + " • " : ""}${p.quotes?.length || 0} предложений от оптовых складов`,
          data: p,
        });
      }
    } catch (err) {
      console.error(`Failed to execute CRM action ${act.type}:`, err);
    }
  }

  return executed;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      messages,
      userMessage,
      userName,
      username: rawUsername,
      apiKey,
      model,
      mode, // "brief" | "detailed" | "normal"
      webSearch,
      images,
      attachments,
      businessMode,
    } = body;

    const currentUsername = (rawUsername || "").trim().toLowerCase();
    const isChaika = businessMode === "chaika-service";

    // Check API Key
    const effectiveApiKey =
      (apiKey && typeof apiKey === "string" && apiKey.trim()) || process.env.OPENROUTER_API_KEY;

    if (!effectiveApiKey || !effectiveApiKey.trim()) {
      return NextResponse.json({
        content: `Для работы центрального ИИ-узла управления требуется API-ключ OpenRouter.\n\nПожалуйста, укажите ваш ключ в **Настройках** или настройте переменную окружения \`OPENROUTER_API_KEY\`.`,
        source: "notice",
      });
    }

    // Fetch live user CRM context from Supabase (events, mails, memory notes)
    const crmContext = await fetchUserCRMContext(currentUsername);

    // Build context summary for Claude
    const todayStr = "15 октября 2026 г.";
    let crmContextPrompt = `\n\n[АКТУАЛЬНЫЙ CRM КОНТЕКСТ ПОЛЬЗОВАТЕЛЯ (${userName || currentUsername || "Специалист"}) на ${todayStr}]:`;

    // Notes / Long term memory
    if (crmContext.notes.length > 0) {
      crmContextPrompt += `\n\n--- 📌 ДОЛГОСРОЧНАЯ ПАМЯТЬ И ВАЖНЫЕ ЗАМЕТКИ (USER NOTES) ---`;
      crmContext.notes.forEach((n: any, idx: number) => {
        crmContextPrompt += `\n${idx + 1}. [${n.category || "Общее"}] ${n.title}: ${n.content}`;
      });
    } else {
      crmContextPrompt += `\n\n--- 📌 ДОЛГОСРОЧНАЯ ПАМЯТЬ: Сохраненных заметок пока нет. Ты можешь запоминать факты через action:note_save. ---`;
    }

    // Calendar
    if (crmContext.events.length > 0) {
      crmContextPrompt += `\n\n--- 📅 СОБЫТИЯ И ПЛАНЫ В КАЛЕНДАРЕ ---`;
      crmContext.events.forEach((e: any, idx: number) => {
        crmContextPrompt += `\n${idx + 1}. ID: ${e.id} | Дата: ${e.date}${e.time ? " " + e.time : ""} | Тег: [${e.tag}] | Приоритет: ${e.priority} | Название: "${e.title}"${e.description ? ` (${e.description})` : ""}`;
      });
    } else {
      crmContextPrompt += `\n\n--- 📅 КАЛЕНДАРЬ: Активных событий пока нет. Ты можешь создавать их через action:calendar_create. ---`;
    }

    // Smart Mail
    if (crmContext.mails.length > 0) {
      crmContextPrompt += `\n\n--- ✉️ ПОЧТА И ПЕРЕПИСКА (УМНАЯ ПОЧТА) ---`;
      crmContext.mails.slice(0, 10).forEach((m: any, idx: number) => {
        crmContextPrompt += `\n${idx + 1}. [${m.status === "SENT" ? "ОТПРАВЛЕНО" : m.status === "APPROVED" ? "УТВЕРЖДЕНО" : "ЧЕРНОВИК"}] От: ${m.agency} (${m.incoming_number || "б/н"}) от ${m.date} | Тема: "${m.subject}" | Текст: ${m.incoming_content?.slice(0, 140)}...`;
      });
    } else {
      crmContextPrompt += `\n\n--- ✉️ ПОЧТА: Писем нет. Ты можешь формировать черновики через action:mail_create_draft. ---`;
    }

    // Repair Orders & Staff Payroll Context (for Chaika Service mode)
    if (isChaika) {
      crmContextPrompt += `\n\n--- 🚗 АКТИВНЫЕ ЗАКАЗ-НАРЯДЫ И ВЫРАБОТКА СТО («ЧАЙКА-СЕРВИС») ---`;
      if (crmContext.orders && crmContext.orders.length > 0) {
        crmContext.orders.forEach((o: any, idx: number) => {
          const worksList = (o.works || [])
            .map(
              (w: any) =>
                `"${w.name}" (${w.laborHours} Н/Ч, исполнитель: ${w.mechanic || "не указан"}, сумма: ${w.total} ₽)`
            )
            .join("; ");
          crmContextPrompt += `\n${idx + 1}. ЗН № ${o.orderNumber} [статус: ${o.status}] от ${o.createdAt || "недавно"} | Авто: ${o.vehicle?.make} ${o.vehicle?.model} (${o.vehicle?.licensePlate}) | Клиент: ${o.client?.name || "Клиент"} | Работы: ${worksList || "нет"} | Итого ЗН: ${o.grandTotal} ₽`;
        });
      } else {
        crmContextPrompt += `\nВ базе пока нет сохраненных заказ-нарядов. Ты можешь оформлять их через action:repair_order_create.`;
      }
    }

    // Style instruction
    let styleInstruction = "";
    const promptLower = String(userMessage || "").toLowerCase();
    const isBrief = mode === "brief" || /коротко|кратко|в двух словах|тезисно|без воды|сжато/.test(promptLower);
    const isDetailed = mode === "detailed" || /развернуто|подробно|детально|глубокий анализ|полный отчет/.test(promptLower);

    if (isBrief) {
      styleInstruction = "\n\n[РЕЖИМ ОТВЕТА: КРАТКО. Отвечай лаконично, тезисно, без лишних вступлений, сразу подтверждая выполненные действия.]";
    } else if (isDetailed) {
      styleInstruction = "\n\n[РЕЖИМ ОТВЕТА: РАЗВЕРНУТО. Предоставь глубокий, детальный анализ с нормативным обоснованием и полными пояснениями.]";
    }

    const userGreetingInstruction = userName
      ? `\n\n[ПОЛЬЗОВАТЕЛЬ: Имя текущего пользователя — «${userName.trim()}». Обращайся к нему уважительно.]`
      : "";

    const selectedSystemPrompt = isChaika ? CHAIKA_SERVICE_SYSTEM_PROMPT : GENERAL_ASSISTANT_SYSTEM_PROMPT;

    // Build base system prompt
    const formattedMessages: Array<{ role: "system" | "user" | "assistant"; content: MessageContent }> = [
      {
        role: "system",
        content:
          selectedSystemPrompt +
          crmContextPrompt +
          styleInstruction +
          userGreetingInstruction,
      },
    ];

    // Add prior conversation messages
    if (Array.isArray(messages)) {
      for (const m of messages) {
        if (m && m.role && m.content) {
          formattedMessages.push({
            role: m.role === "assistant" ? "assistant" : "user",
            content: String(m.content),
          });
        }
      }
    }

    // Prepare current user prompt with attachments
    let textPrompt = String(userMessage || "");
    if (Array.isArray(attachments) && attachments.length > 0) {
      textPrompt += "\n\n--- ПРИКРЕПЛЕННЫЕ ДОКУМЕНТЫ/ФАЙЛЫ ---";
      for (const att of attachments) {
        if (att && att.name && att.content) {
          textPrompt += `\n\n[Файл: ${att.name}]\n${att.content}\n[Конец файла ${att.name}]`;
        }
      }
    }

    // Multimodal attachments (images)
    let finalUserContent: MessageContent = textPrompt;
    if (Array.isArray(images) && images.length > 0) {
      const parts: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> = [
        { type: "text", text: textPrompt || "Пожалуйста, проанализируй прикрепленные файлы/изображения." },
      ];
      for (const img of images) {
        const url = typeof img === "string" ? img : img?.url;
        if (url) {
          parts.push({
            type: "image_url",
            image_url: { url },
          });
        }
      }
      finalUserContent = parts;
    }

    // Add user turn
    if (textPrompt || (Array.isArray(images) && images.length > 0)) {
      const lastMsg = formattedMessages[formattedMessages.length - 1];
      if (!lastMsg || lastMsg.role !== "user" || Array.isArray(images) || Array.isArray(attachments)) {
        formattedMessages.push({
          role: "user",
          content: finalUserContent,
        });
      }
    }

    // Model selection: strictly flagship models
    let chosenModel = model || "anthropic/claude-sonnet-4.6";
    if (Array.isArray(images) && images.length > 0) {
      if (!chosenModel.includes("claude") && !chosenModel.includes("gpt") && !chosenModel.includes("gemini")) {
        chosenModel = "anthropic/claude-sonnet-4.6";
      }
    }

    const plugins: Array<{ id: string }> = [];
    if (webSearch) {
      plugins.push({ id: "web" });
    }

    // Call OpenRouter
    const openRouterResponse = await callOpenRouter(
      {
        model: chosenModel,
        messages: formattedMessages,
        temperature: 0.35,
        max_tokens: 8192,
        plugins: plugins.length > 0 ? plugins : undefined,
      },
      effectiveApiKey
    );

    let rawAssistantContent = openRouterResponse?.choices?.[0]?.message?.content || "";
    if (!rawAssistantContent) {
      throw new Error("Языковая модель вернула пустой ответ");
    }

    // Parse all Action Blocks: ```action:<type>\n{...}\n```
    const actionRegex = /```action:([a-z_]+)\s*([\s\S]*?)```/gi;
    const detectedActions: Array<{ type: string; payload: any }> = [];
    let match;

    while ((match = actionRegex.exec(rawAssistantContent)) !== null) {
      const actionType = match[1].toLowerCase().trim();
      const actionJsonStr = match[2].trim();
      try {
        const parsedPayload = JSON.parse(actionJsonStr);
        detectedActions.push({ type: actionType, payload: parsedPayload });
      } catch (parseErr) {
        console.warn("Could not parse action block JSON:", actionJsonStr, parseErr);
      }
    }

    // Execute detected actions on Supabase
    let executedActionCards: ChatActionPayload[] = [];
    if (detectedActions.length > 0 && currentUsername) {
      executedActionCards = await executeCrmActions(
        detectedActions,
        currentUsername,
        crmContext.events,
        crmContext.notes
      );
    }

    // Clean raw action blocks from content so user sees NO technical JSON
    const cleanContent = rawAssistantContent
      .replace(/```action:[a-z_]+\s*[\s\S]*?```/gi, "")
      .trim();

    return NextResponse.json({
      content: cleanContent,
      actions: executedActionCards,
      source: "openrouter",
      usedModel: openRouterResponse.model,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Внутренняя ошибка сервера";
    console.error("AI Hub route handler error:", message);
    return NextResponse.json({
      content: `⚠️ Произошла ошибка при обработке запроса: ${message}`,
      source: "error",
    });
  }
}
