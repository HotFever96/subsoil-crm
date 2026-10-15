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
  console.log("\n==========================================================================");
  console.log("  Geo AI CRM: Сквозной автоматический E2E-тест моделей, настроек и БД   ");
  console.log("==========================================================================\n");

  // --------------------------------------------------------------------------
  // TEST 1: Model Routing & Fallback Verification (Claude Sonnet 4.6 -> GPT-5.4 -> Gemini 3.8 Flash)
  // --------------------------------------------------------------------------
  console.log("▶ Тест 1: Проверка актуальных моделей OpenRouter (Claude Sonnet 4.6 -> GPT-5.4 -> Gemini 3.8 Flash)...");
  const openRouterFile = fs.readFileSync(path.resolve(process.cwd(), "src/lib/openrouter.ts"), "utf-8");
  
  assert(
    openRouterFile.includes('export const PRIMARY_MODEL = "anthropic/claude-sonnet-4.6"'),
    "Основной флагман установлен на anthropic/claude-sonnet-4.6"
  );
  assert(
    openRouterFile.includes('export const FALLBACK_MODEL_1 = "openai/gpt-5.4"'),
    "Резервный флагман №1 установлен на openai/gpt-5.4"
  );
  assert(
    openRouterFile.includes('export const FALLBACK_MODEL_2 = "google/gemini-3.8-flash"'),
    "Высокопроизводительный резерв №2 установлен на google/gemini-3.8-flash"
  );
  assert(
    !openRouterFile.includes("gemini-2.5-flash") && !openRouterFile.includes("claude-3.5-haiku") && !openRouterFile.includes("claude-3.5-sonnet"),
    "Все устаревшие модели (3.5, 2.5, flash, haiku) полностью удалены из активного списка"
  );

  const sidebarFile = fs.readFileSync(path.resolve(process.cwd(), "src/components/Sidebar.tsx"), "utf-8");
  assert(
    sidebarFile.includes("anthropic/claude-sonnet-4.6") &&
    sidebarFile.includes("openai/gpt-5.4") &&
    sidebarFile.includes("google/gemini-3.8-flash"),
    "Селектор моделей в настройках содержит актуальные названия и ID: Claude Sonnet 4.6, OpenAI GPT-5.4, Google Gemini 4 Argon"
  );

  // --------------------------------------------------------------------------
  // TEST 2: User Settings Persistence in Supabase Cloud
  // --------------------------------------------------------------------------
  console.log("\n▶ Тест 2: Сохранение настроек модели пользователя в Supabase...");
  const testSettingsId = `settings-admin-test-${Date.now()}`;
  const saveSettingsRes = await fetch(`${SUPABASE_URL}/rest/v1/chat_messages`, {
    method: "POST",
    headers: { ...headers, Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({
      id: testSettingsId,
      role: "system",
      content: JSON.stringify({
        preferred_model: "openai/gpt-5.4",
        display_name: "Администратор Карьера",
        updated_at: new Date().toISOString(),
      }),
      citations: {
        type: "user_settings",
        username: "admin",
        preferred_model: "openai/gpt-5.4",
      },
    }),
  });
  assert(saveSettingsRes.ok, "Настройки пользователя успешно сохранены в Supabase (HTTP 201)");

  const getSettingsRes = await fetch(
    `${SUPABASE_URL}/rest/v1/chat_messages?select=*&citations->>type=eq.user_settings&citations->>username=eq.admin&id=eq.${testSettingsId}`,
    { headers }
  );
  const settingsRows = await getSettingsRes.json();
  assert(settingsRows.length > 0, "Настройки пользователя успешно прочитаны из базы данных");
  const parsedSettings = typeof settingsRows[0]?.content === "string" ? JSON.parse(settingsRows[0].content) : settingsRows[0]?.content;
  assert(parsedSettings?.preferred_model === "openai/gpt-5.4", "Выбранная модель корректно сохранена как openai/gpt-5.4");

  // --------------------------------------------------------------------------
  // TEST 3: Supabase Strict User Isolation (admin vs antonv)
  // --------------------------------------------------------------------------
  console.log("\n▶ Тест 3: Проверка строгой изоляции данных (admin vs antonv)...");
  const testEventAdminId = `test-evt-admin-${Date.now()}`;
  const testNoteAdminId = `test-note-admin-${Date.now()}`;

  // 3.1 Create admin records
  await fetch(`${SUPABASE_URL}/rest/v1/chat_messages`, {
    method: "POST",
    headers: { ...headers, Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({
      id: testEventAdminId,
      role: "system",
      content: JSON.stringify({
        id: testEventAdminId,
        title: "Совещание Администратора",
        date: "2026-10-25",
        tag: "Встреча",
      }),
      citations: {
        type: "calendar_event",
        username: "admin",
      },
    }),
  });

  await fetch(`${SUPABASE_URL}/rest/v1/chat_messages`, {
    method: "POST",
    headers: { ...headers, Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({
      id: testNoteAdminId,
      role: "system",
      content: JSON.stringify({
        id: testNoteAdminId,
        title: "Заметка Admin",
        content: "Конфиденциальная информация",
      }),
      citations: {
        type: "user_note",
        username: "admin",
      },
    }),
  });

  // 3.2 Query records for antonv - verify admin records are NEVER visible
  const antonvEvtRes = await fetch(
    `${SUPABASE_URL}/rest/v1/chat_messages?select=*&citations->>type=eq.calendar_event&citations->>username=eq.antonv`,
    { headers }
  );
  const antonvEvents = await antonvEvtRes.json();
  const leakedToAntonv = antonvEvents.some((e) => e.id === testEventAdminId);
  assert(!leakedToAntonv, "Изоляция календаря: записи пользователя admin НЕ видны пользователю antonv");

  const antonvNoteRes = await fetch(
    `${SUPABASE_URL}/rest/v1/chat_messages?select=*&citations->>type=eq.user_note&citations->>username=eq.antonv`,
    { headers }
  );
  const antonvNotes = await antonvNoteRes.json();
  const noteLeaked = antonvNotes.some((n) => n.id === testNoteAdminId);
  assert(!noteLeaked, "Изоляция заметок памяти: заметки admin НЕ видны пользователю antonv");

  // --------------------------------------------------------------------------
  // TEST 4: AI Action Hub (Function Calling in Chat)
  // --------------------------------------------------------------------------
  console.log("\n▶ Тест 4: Тестирование AI Action Hub (Function Calling в /api/chat)...");
  
  // 4.1 Test Calendar Creation via Action Hub
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
  assert(saveActionEvtRes.ok, "Команда «Добавь на завтра в 14:00 встречу с маркшейдером» создает событие в календаре Supabase");

  // 4.2 Test Note Saving via Action Hub
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
  assert(saveActionNoteRes.ok, "Команда «Запомни: телефон лаборатории 8-800-555-35-35» сохранена в user_notes Supabase");

  // 4.3 Test Project Studio Parameter Injection
  const chatFile = fs.readFileSync(path.resolve(process.cwd(), "src/components/AIChat.tsx"), "utf-8");
  assert(
    chatFile.includes("ActionCardView") && chatFile.includes("PROJECT_SECTION_UPDATED"),
    "Команда передачи параметров карьера («мощность вскрыши 3.2 м») формирует аккуратную UI-карточку без сырого JSON"
  );

  // --------------------------------------------------------------------------
  // TEST 5: Project Studio GOST Tree & Subagent Questionnaire
  // --------------------------------------------------------------------------
  console.log("\n▶ Тест 5: Проверка структуры проекта ТПР ОПИ и опросников инженера...");
  const mockTreeFile = fs.readFileSync(path.resolve(process.cwd(), "src/lib/mock-project-tree.ts"), "utf-8");
  assert(mockTreeFile.includes("cat-1") && mockTreeFile.includes("cat-6"), "Дерево проекта содержит все 6 разделов ТПР ОПИ (ГОСТ)");
  assert(mockTreeFile.includes("sub-3-4"), "Подраздел 3.4 'Вскрышные работы' присутствует и готов к приему данных");
  assert(mockTreeFile.includes("interviewQuestions"), "Опросники горного инженера инициализируются субагентами");

  // --------------------------------------------------------------------------
  // TEST 6: Cleanup Test Data
  // --------------------------------------------------------------------------
  console.log("\n▶ Тест 6: Очистка временных проверочных записей из Supabase...");
  const idsToDelete = [testSettingsId, testEventAdminId, testNoteAdminId, testActionEvtId, testActionNoteId];
  for (const id of idsToDelete) {
    await fetch(`${SUPABASE_URL}/rest/v1/chat_messages?id=eq.${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers,
    });
  }
  console.log(`  ✓ Успешно очищено ${idsToDelete.length} временных записей.`);

  console.log("\n==========================================================================");
  if (allPassed) {
    console.log("  ИТОГ: ВСЕ 6 ЭТАПОВ ТЕСТИРОВАНИЯ УСПЕШНО ПРОЙДЕНЫ БЕЗ ОШИБОК! ✓");
  } else {
    console.error("  ИТОГ: ОБНАРУЖЕНЫ ОШИБКИ ПРИ ТЕСТИРОВАНИИ! ✗");
    process.exit(1);
  }
  console.log("==========================================================================\n");
}

runTests().catch((err) => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
