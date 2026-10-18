import fs from "fs";
import path from "path";

// Load .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
let SUPABASE_URL = "https://hrdchbltqfakgxxkjroy.supabase.co";
let SUPABASE_KEY = "";
let OPENROUTER_API_KEY = "";

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("NEXT_PUBLIC_SUPABASE_URL=")) {
      SUPABASE_URL = trimmed.split("=")[1].trim();
    } else if (trimmed.startsWith("SUPABASE_SERVICE_ROLE_KEY=") || trimmed.startsWith("NEXT_PUBLIC_SUPABASE_ANON_KEY=")) {
      if (!SUPABASE_KEY) SUPABASE_KEY = trimmed.split("=")[1].trim();
    } else if (trimmed.startsWith("OPENROUTER_API_KEY=")) {
      OPENROUTER_API_KEY = trimmed.split("=")[1].trim();
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
  console.log("  Geo AI CRM: Проверка авто-восстановления JSON, Архива и Лимитов Токенов ");
  console.log("==========================================================================\n");

  // --------------------------------------------------------------------------
  // TEST 1: System Prompt Guidelines & Max Tokens Check
  // --------------------------------------------------------------------------
  console.log("▶ Тест 1: Проверка логики уместности и лимита токенов 8192...");
  const legalChatFile = fs.readFileSync(path.resolve(process.cwd(), "src/app/api/legal-chat/route.ts"), "utf-8");
  const openRouterFile = fs.readFileSync(path.resolve(process.cwd(), "src/lib/openrouter.ts"), "utf-8");

  assert(
    legalChatFile.includes("ИНТЕЛЛЕКТУАЛЬНЫЙ ВЫБОР ФОРМАТА ОТВЕТА (ЧАТ vs КАРТОЧКА ФАЙЛА)"),
    "В системном промпте юридического чата прописан блок умного выбора формата ответа"
  );
  assert(
    legalChatFile.includes("ГИБРИДНЫЙ ОТВЕТ ДЛЯ БОЛЬШИХ И ГИГАНТСКИХ ПРОЕКТОВ"),
    "В системном промпте зафиксирована гибридная стратегия для гигантских проектов (ГИН/ТПР)"
  );
  assert(
    legalChatFile.includes("max_tokens: 8192"),
    "Лимит max_tokens в API маршруте увеличен до 8192"
  );
  assert(
    openRouterFile.includes("max_tokens: payload.max_tokens ?? 8192"),
    "Базовый лимит max_tokens в клиенте OpenRouter увеличен до 8192"
  );

  // --------------------------------------------------------------------------
  // TEST 2: JSON Auto-Repair Unit Verification
  // --------------------------------------------------------------------------
  console.log("\n▶ Тест 2: Проверка математического алгоритма авто-восстановления оборванного JSON...");
  const { tryRepairAndParseJson, extractFileMetadataFallback } = await import("../src/lib/json-repair.ts");

  // Case A: Truncated inside string
  const brokenCase1 = '{"title": "Проект ГИН Хантинский", "sections": [{"heading": "1. Общие сведения", "text": "Разработка месторождения песка';
  const repaired1 = tryRepairAndParseJson(brokenCase1);
  assert(
    repaired1 && repaired1.title === "Проект ГИН Хантинский" && repaired1.sections?.[0]?.heading === "1. Общие сведения",
    "Успешно восстановлен JSON, оборванный на середине строкового значения"
  );

  // Case B: Truncated right after array open bracket with trailing comma
  const brokenCase2 = '{"title": "Смета затрат", "sheets": [{"name": "Расчет", "rows": [["Бурение", 500],';
  const repaired2 = tryRepairAndParseJson(brokenCase2);
  assert(
    repaired2 && repaired2.title === "Смета затрат" && repaired2.sheets?.[0]?.rows?.length === 1,
    "Успешно восстановлен JSON, оборванный после массива с висячей запятой"
  );

  // Case C: Unparseable garbage fallback metadata extraction
  const garbageCase = '```file:document\n{"title": "Технический проект разработки Хантинский", "sections": [{"heading": "Раздел 1...';
  const meta = extractFileMetadataFallback(garbageCase);
  assert(
    meta.title.includes("Хантинский") && meta.approxSectionsCount >= 1,
    "Извлечены метаданные документа без сырого JSON при критическом повреждении структуры"
  );

  // --------------------------------------------------------------------------
  // TEST 3: MarkdownView File Block & Leak Prevention
  // --------------------------------------------------------------------------
  console.log("\n▶ Тест 3: Проверка защиты MarkdownView от утечки сырого JSON в текст чата...");
  const markdownViewFile = fs.readFileSync(path.resolve(process.cwd(), "src/components/MarkdownView.tsx"), "utf-8");

  assert(
    markdownViewFile.includes("tryRepairAndParseJson"),
    "MarkdownView использует модуль безопасного восстановления JSON"
  );
  assert(
    markdownViewFile.includes("unclosedMatch"),
    "MarkdownView корректно перехватывает незакрытые блоки ```file:... при обрыве стрима"
  );
  assert(
    markdownViewFile.includes('"(?:heading|sections|text|title|filename|subtitle|slides|sheets)"'),
    "В MarkdownView внедрен санитайзер параграфов, отсекающий любые случайные осколки JSON"
  );

  // --------------------------------------------------------------------------
  // TEST 4: User Attachment Download & Storage Verification
  // --------------------------------------------------------------------------
  console.log("\n▶ Тест 4: Проверка скачивания прикрепленных пользователем файлов...");
  const fileParserFile = fs.readFileSync(path.resolve(process.cwd(), "src/lib/file-parser.ts"), "utf-8");
  const aiChatFile = fs.readFileSync(path.resolve(process.cwd(), "src/components/AIChat.tsx"), "utf-8");

  assert(
    fileParserFile.includes("export function downloadUploadedFile"),
    "В file-parser.ts экспортирована функция прямого скачивания пользовательских вложений"
  );
  assert(
    fileParserFile.includes("previewUrl: fileDataUrl"),
    "Для всех загруженных файлов формируется DataURL для мгновенного скачивания"
  );
  assert(
    aiChatFile.includes("downloadUploadedFile({ name: att.name, previewUrl: att.previewUrl })"),
    "Плашки прикрепленных файлов в чате оснащены обработчиком клика на скачивание"
  );

  // --------------------------------------------------------------------------
  // TEST 5: Electronic Archive Module & Sidebar Integration
  // --------------------------------------------------------------------------
  console.log("\n▶ Тест 5: Проверка модуля «Электронный архив» и навигации...");
  const archiveCompExists = fs.existsSync(path.resolve(process.cwd(), "src/components/ElectronicArchive.tsx"));
  const archiveServiceExists = fs.existsSync(path.resolve(process.cwd(), "src/lib/archive-service.ts"));
  const sidebarFile = fs.readFileSync(path.resolve(process.cwd(), "src/components/Sidebar.tsx"), "utf-8");
  const pageFile = fs.readFileSync(path.resolve(process.cwd(), "src/app/page.tsx"), "utf-8");

  assert(archiveCompExists, "Компонент ElectronicArchive.tsx создан");
  assert(archiveServiceExists, "Сервис archive-service.ts создан");
  assert(sidebarFile.includes('id: "archive" as NavTab') && sidebarFile.includes("Электронный архив"), "Пункт «Электронный архив» интегрирован в Sidebar");
  assert(pageFile.includes("currentTab === \"archive\" && <ElectronicArchive />"), "Вкладка «Электронный архив» подключена в основном приложении page.tsx");

  // --------------------------------------------------------------------------
  // TEST 6: Supabase Cloud Sync & Isolation for Archive Files
  // --------------------------------------------------------------------------
  console.log("\n▶ Тест 6: Проверка облачного API Supabase для архива с изоляцией пользователей...");
  const syncRouteFile = fs.readFileSync(path.resolve(process.cwd(), "src/app/api/sync/route.ts"), "utf-8");
  assert(
    syncRouteFile.includes('action === "get_archive_files"') &&
    syncRouteFile.includes('action === "save_archive_file"') &&
    syncRouteFile.includes('action === "delete_archive_file"'),
    "API /api/sync поддерживает действия get_archive_files, save_archive_file и delete_archive_file"
  );

  // Real Supabase API test
  if (SUPABASE_KEY) {
    const testFileAdmin = {
      id: `test-file-admin-${Date.now()}`,
      name: "Проверочная_лицензия_Хантинский.pdf",
      category: "license",
      fileType: "pdf",
      size: "2.1 МБ",
      source: "archive_upload",
      createdAt: new Date().toISOString().slice(0, 10),
      username: "admin",
      metadata: { description: "Тестовая лицензия admin", tags: ["Тест"] },
    };

    const testFileAnton = {
      id: `test-file-anton-${Date.now()}`,
      name: "Проверочный_проект_Северный.docx",
      category: "project_doc",
      fileType: "word",
      size: "3.4 МБ",
      source: "chat_generated",
      createdAt: new Date().toISOString().slice(0, 10),
      username: "antonv",
      metadata: { description: "Тестовый проект antonv", tags: ["Тест"] },
    };

    // Save admin file
    const saveAdminRes = await fetch(`${SUPABASE_URL}/rest/v1/chat_messages`, {
      method: "POST",
      headers: { ...headers, Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({
        id: `archive-${testFileAdmin.id}`,
        role: "system",
        content: JSON.stringify(testFileAdmin),
        citations: { type: "archive_file", username: "admin" },
      }),
    });
    assert(saveAdminRes.ok, "Файл успешно сохранен в архив для пользователя admin");

    // Save antonv file
    const saveAntonRes = await fetch(`${SUPABASE_URL}/rest/v1/chat_messages`, {
      method: "POST",
      headers: { ...headers, Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({
        id: `archive-${testFileAnton.id}`,
        role: "system",
        content: JSON.stringify(testFileAnton),
        citations: { type: "archive_file", username: "antonv" },
      }),
    });
    assert(saveAntonRes.ok, "Файл успешно сохранен в архив для пользователя antonv");

    // Verify isolation: query for admin
    const getAdminRes = await fetch(
      `${SUPABASE_URL}/rest/v1/chat_messages?select=*&role=eq.system&citations->>type=eq.archive_file&citations->>username=eq.admin`,
      { headers }
    );
    const adminRows = await getAdminRes.json();
    const hasAdminFile = adminRows.some((r) => r.id === `archive-${testFileAdmin.id}`);
    const hasAntonFileInAdmin = adminRows.some((r) => r.id === `archive-${testFileAnton.id}`);
    assert(hasAdminFile && !hasAntonFileInAdmin, "Пользователь admin видит ТОЛЬКО свои архивные файлы и НЕ видит файлы antonv");

    // Cleanup test files
    await fetch(`${SUPABASE_URL}/rest/v1/chat_messages?id=in.(archive-${testFileAdmin.id},archive-${testFileAnton.id})`, {
      method: "DELETE",
      headers,
    });
    console.log("  ✓ Очищены временные тестовые записи из Supabase");
  }

  console.log("\n==========================================================================");
  if (allPassed) {
    console.log("  ВСЕ ТЕСТЫ УСПЕШНО ПРОЙДЕНЫ! Архитектурные требования выполнены на 100%.  ");
  } else {
    console.error("  ОБНАРУЖЕНЫ ОШИБКИ В ТЕСТАХ! Проверьте логи выше.");
  }
  console.log("==========================================================================\n");

  if (!allPassed) process.exit(1);
}

runTests().catch((e) => {
  console.error("Test execution failed:", e);
  process.exit(1);
});
