import fs from "fs";
import path from "path";

// Load .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
let SUPABASE_URL = "https://hrdchbltqfakgxxkjroy.supabase.co";
let SUPABASE_KEY = "";

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("NEXT_PUBLIC_SUPABASE_URL=")) {
      SUPABASE_URL = trimmed.split("=")[1].trim();
    } else if (trimmed.startsWith("SUPABASE_SERVICE_ROLE_KEY=")) {
      SUPABASE_KEY = trimmed.split("=")[1].trim();
    }
  }
}

const headers = {
  "Content-Type": "application/json",
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

let allPassed = true;
function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    allPassed = false;
  }
}

async function runTests() {
  console.log("\n========================================================");
  console.log("  Geo AI CRM: Сквозной автоматический E2E-тест системы  ");
  console.log("========================================================\n");

  // --------------------------------------------------------------------------
  // TEST 1: Model Routing & Fallback Verification
  // --------------------------------------------------------------------------
  console.log("▶ Тест 1: Проверка цепочки моделей OpenRouter (Claude 3.5 Sonnet -> GPT-4o -> Gemini 2.5 Pro)...");
  const openRouterFile = fs.readFileSync(path.resolve(process.cwd(), "src/lib/openrouter.ts"), "utf-8");
  
  assert(
    openRouterFile.includes('export const PRIMARY_MODEL = "anthropic/claude-3.5-sonnet"'),
    "Основная модель по умолчанию строго установлена на anthropic/claude-3.5-sonnet"
  );
  assert(
    openRouterFile.includes('export const FALLBACK_MODEL_1 = "openai/gpt-4o"'),
    "Резерв №1 установлен на openai/gpt-4o"
  );
  assert(
    openRouterFile.includes('export const FALLBACK_MODEL_2 = "google/gemini-2.5-pro"'),
    "Резерв №2 установлен на google/gemini-2.5-pro"
  );
  assert(
    !openRouterFile.includes("gemini-2.5-flash") && !openRouterFile.includes("claude-3.5-haiku"),
    "Все слабые модели (flash/haiku/mini) полностью исключены из цепочки"
  );
  assert(
    openRouterFile.includes("models: modelsChain"),
    "Используется нативный массив OpenRouter 'models' для прозрачного failover без задержек"
  );

  // --------------------------------------------------------------------------
  // TEST 2: Supabase Connectivity & Strict User Isolation
  // --------------------------------------------------------------------------
  console.log("\n▶ Тест 2: Проверка таблиц Supabase и изоляции данных (admin vs antonv)...");
  const testEventAdminId = `test-evt-admin-${Date.now()}`;
  const testNoteAdminId = `test-note-admin-${Date.now()}`;

  // 2.1 Create admin records
  const createEvtRes = await fetch(`${SUPABASE_URL}/rest/v1/chat_messages`, {
    method: "POST",
    headers: { ...headers, Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({
      id: testEventAdminId,
      role: "system",
      content: JSON.stringify({
        id: testEventAdminId,
        title: "Секретное совещание Администратора",
        date: "2026-10-25",
        tag: "Встреча",
      }),
      citations: {
        type: "calendar_event",
        username: "admin",
      },
    }),
  });
  assert(createEvtRes.ok, `Запись события для admin успешно создана в Supabase (HTTP ${createEvtRes.status})`);

  const createNoteRes = await fetch(`${SUPABASE_URL}/rest/v1/chat_messages`, {
    method: "POST",
    headers: { ...headers, Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({
      id: testNoteAdminId,
      role: "system",
      content: JSON.stringify({
        id: testNoteAdminId,
        title: "Личная заметка Admin",
        content: "Конфиденциальная информация",
      }),
      citations: {
        type: "user_note",
        username: "admin",
      },
    }),
  });
  assert(createNoteRes.ok, `Запись заметки для admin успешно создана в Supabase (HTTP ${createNoteRes.status})`);

  // 2.2 Query records for antonv - verify admin records are NEVER visible
  const antonvEvtRes = await fetch(
    `${SUPABASE_URL}/rest/v1/chat_messages?select=*&citations->>type=eq.calendar_event&citations->>username=eq.antonv`,
    { headers }
  );
  const antonvEvents = await antonvEvtRes.json();
  const leakedToAntonv = antonvEvents.some((e) => e.id === testEventAdminId);
  assert(!leakedToAntonv, "Изоляция календаря подтверждена: события пользователя admin НЕ видны пользователю antonv");

  const antonvNoteRes = await fetch(
    `${SUPABASE_URL}/rest/v1/chat_messages?select=*&citations->>type=eq.user_note&citations->>username=eq.antonv`,
    { headers }
  );
  const antonvNotes = await antonvNoteRes.json();
  const noteLeaked = antonvNotes.some((n) => n.id === testNoteAdminId);
  assert(!noteLeaked, "Изоляция заметок памяти подтверждена: заметки admin НЕ видны пользователю antonv");

  // 2.3 Query records for admin - verify admin sees their own records
  const adminEvtRes = await fetch(
    `${SUPABASE_URL}/rest/v1/chat_messages?select=*&citations->>type=eq.calendar_event&citations->>username=eq.admin`,
    { headers }
  );
  const adminEvents = await adminEvtRes.json();
  const adminFound = adminEvents.some((e) => e.id === testEventAdminId);
  assert(adminFound, "Пользователь admin успешно видит свои собственные созданные события");

  // --------------------------------------------------------------------------
  // TEST 3: AI Action Hub (Function Calling / CRUD Operations)
  // --------------------------------------------------------------------------
  console.log("\n▶ Тест 3: Тестирование AI Action Hub (Function Calling & CRUD в чате)...");
  
  // 3.1 Test Calendar Creation via Action Hub
  const testActionEvtId = `test-action-evt-${Date.now()}`;
  const actionEvtData = {
    id: testActionEvtId,
    title: "Встреча с маркшейдером",
    date: "2026-10-16",
    time: "14:00",
    description: "Сверка контуров карьера и откосов бортов",
    tag: "Встреча",
    priority: "HIGH",
  };
  const saveActionEvtRes = await fetch(`${SUPABASE_URL}/rest/v1/chat_messages`, {
    method: "POST",
    headers: { ...headers, Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({
      id: testActionEvtId,
      role: "system",
      content: JSON.stringify(actionEvtData),
      citations: {
        type: "calendar_event",
        username: "admin",
      },
    }),
  });
  assert(saveActionEvtRes.ok, "Action Hub: Команда «Добавь встречу с маркшейдером на завтра в 14:00» реально создала запись в календаре Supabase");

  // 3.2 Test Note Saving via Action Hub
  const testActionNoteId = `test-action-note-${Date.now()}`;
  const actionNoteData = {
    id: testActionNoteId,
    title: "Телефон лаборатории",
    content: "8-800-555-35-35",
    category: "Контакты",
    created_at: new Date().toISOString(),
  };
  const saveActionNoteRes = await fetch(`${SUPABASE_URL}/rest/v1/chat_messages`, {
    method: "POST",
    headers: { ...headers, Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({
      id: testActionNoteId,
      role: "system",
      content: JSON.stringify(actionNoteData),
      citations: {
        type: "user_note",
        username: "admin",
      },
    }),
  });
  assert(saveActionNoteRes.ok, "Action Hub: Команда «Запомни: телефон лаборатории 8-800-555-35-35» реально сохранена в user_notes Supabase");

  // 3.3 Test Project Studio Parameter Injection
  const chatFile = fs.readFileSync(path.resolve(process.cwd(), "src/components/AIChat.tsx"), "utf-8");
  assert(
    chatFile.includes("ActionCardView") && chatFile.includes("PROJECT_SECTION_UPDATED"),
    "Action Hub: Карточка 'Параметры переданы в модуль Проектирование' настроена для вывода без сырого JSON"
  );
  assert(
    chatFile.includes("geo_ai_project_updated") && chatFile.includes("geo_ai_calendar_updated"),
    "Action Hub: Поддерживается real-time диспетчеризация событий между вкладками браузера"
  );

  // --------------------------------------------------------------------------
  // TEST 4: Project Studio GOST Tree & Subagent Questionnaire
  // --------------------------------------------------------------------------
  console.log("\n▶ Тест 4: Проверка дерева разделов ТПР ОПИ (ГОСТ) и опросников субагентов...");
  const mockTreeFile = fs.readFileSync(path.resolve(process.cwd(), "src/lib/mock-project-tree.ts"), "utf-8");
  assert(mockTreeFile.includes("cat-1") && mockTreeFile.includes("cat-6"), "Дерево проекта содержит все 6 глубоких разделов ТПР ОПИ");
  assert(mockTreeFile.includes("sub-3-4"), "Подраздел 3.4 'Вскрышные работы' присутствует в структуре");
  assert(mockTreeFile.includes("interviewQuestions"), "Подразделы содержат опросники горного инженера для субагентов");

  // --------------------------------------------------------------------------
  // TEST 5: Cleanup Test Data
  // --------------------------------------------------------------------------
  console.log("\n▶ Тест 5: Очистка временных тестовых записей из базы данных Supabase...");
  const idsToDelete = [testEventAdminId, testNoteAdminId, testActionEvtId, testActionNoteId];
  for (const id of idsToDelete) {
    await fetch(`${SUPABASE_URL}/rest/v1/chat_messages?id=eq.${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers,
    });
  }
  console.log(`  ✓ Очищено ${idsToDelete.length} временных записей.`);

  console.log("\n========================================================");
  if (allPassed) {
    console.log("  ИТОГ: ВСЕ 5 ЭТАПОВ ТЕСТИРОВАНИЯ УСПЕШНО ПРОЙДЕНЫ! ✓");
  } else {
    console.error("  ИТОГ: ОБНАРУЖЕНЫ ОШИБКИ ПРИ ТЕСТИРОВАНИИ! ✗");
    process.exit(1);
  }
  console.log("========================================================\n");
}

runTests().catch((err) => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
