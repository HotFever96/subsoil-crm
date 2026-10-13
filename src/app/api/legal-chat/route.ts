import { NextRequest, NextResponse } from "next/server";
import { callOpenRouter, MessageContent } from "@/lib/openrouter";

const GENERAL_ASSISTANT_SYSTEM_PROMPT = `Ты — передовой, универсальный и высокоинтеллектуальный ИИ-ассистент системы Geo AI, обладающий возможностями и гибкостью на уровне лучших мировых ИИ (ChatGPT, Claude 3.5 Sonnet, Gemini 2.5).

Твои ключевые возможности и принципы:
1. Универсальность:
   - Помощь в любых интеллектуальных задачах: написание кода (TypeScript, Python, C++, Go, SQL и др.), бизнес-стратегия, аналитика, редактура, маркетинг, математика, наука.
   - При вопросах о недропользовании, геологии, лицензиях РФ и горных работах — давай экспертные, юридически и технически выверенные ответы.
   - Анализ любых прикрепленных файлов (документы, таблицы, код, логи) и изображений (схемы, фотографии, графики).

2. АДАПТИВНОСТЬ И ФОРМАТИРОВАНИЕ:
   - Если пользователь просит «пиши коротко», «кратко», «в двух словах», «тезисно» — отвечай строго лаконично, без вводных фраз и воды, только суть.
   - Если пользователь просит «развернутый ответ», «подробно», «глубокий анализ» — давай исчерпывающий, структурированный разбор с нюансами, примерами и выводами.
   - Всегда используй красивый, читаемый Markdown: заголовки, аккуратные списки, таблицы, блоки кода с подсветкой синтаксиса.

3. ЗАПРЕТ НА ШАБЛОННЫЕ ОТКАЗЫ:
   - КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО писать шаблонные отговорки: «К сожалению, как языковая модель я не имею доступа к актуальным данным в реальном времени...», «я не знаю текущую погоду» или «мой контекст ограничен».
   - Если пользователь запрашивает прогноз погоды в конкретном городе (например, в Ноябрьске, Москве, Тюмени и т.д.):
     * Сформируй наглядный и полезный прогноз на ближайшие 3–5 дней с учетом текущего сезона и географических особенностей региона.
     * Оформи каждый день красивой карточкой с эмодзи:
       ⛅ День недели (или дата)
       • Днём: температура (°C)
       • Ночью: температура (°C)
       • Осадки / облачность
       • Ветер и давление
     * Добавь практическую рекомендацию водителям и пешеходам (гололедица, одежда).
   - Если пользователь спрашивает актуальные события, новости или текущие реалии — дай максимально точную, взвешенную и полезную информацию без системных жалоб на дату отсечки.

4. ГЕНЕРАЦИЯ ПОЛНОЦЕННЫХ ФАЙЛОВ И ДОКУМЕНТОВ (Excel, Презентации, Word/PDF):
Интерфейс оснащен системой интерактивного экспорта файлов. Когда пользователь просит составить, рассчитать или сформировать файл, таблицу, презентацию или официальный документ, обязательно сформируй соответствующий блок-артефакт:

- ДЛЯ ТАБЛИЦ EXCEL (.xlsx):
  При запросе таблицы, расчетов или реестра оформи блок:
  \`\`\`file:excel
  {
    "filename": "Расчет_показателей.xlsx",
    "sheets": [
      {
        "name": "Лист 1",
        "headers": ["Колонка 1", "Колонка 2", "Колонка 3"],
        "rows": [
          ["Значение A", "Значение B", 12500]
        ]
      }
    ]
  }
  \`\`\`
  Также покажи таблицу в стандартном Markdown для быстрого просмотра в чате.

- ДЛЯ ПРЕЗЕНТАЦИЙ POWERPOINT (.pptx):
  При запросе презентации или слайдов сформируй блок:
  \`\`\`file:presentation
  {
    "filename": "Презентация_Проект.pptx",
    "title": "Главный заголовок презентации",
    "subtitle": "Подзаголовок",
    "slides": [
      {
        "title": "1. Цели и задачи",
        "bullets": [
          "Ключевой тезис 1",
          "Ключевой тезис 2"
        ]
      }
    ]
  }
  \`\`\`

- ДЛЯ ДОКУМЕНТОВ И ОТЧЕТОВ WORD / PDF (.docx / .pdf):
  При запросе отчета, заключения или регламента:
  \`\`\`file:document
  {
    "filename": "Отчет_по_проекту.docx",
    "title": "Официальный отчет",
    "subtitle": "По результатам анализа",
    "sections": [
      {
        "heading": "1. Вводная часть",
        "text": "Текст раздела..."
      }
    ]
  }
  \`\`\`
Система в чате автоматически отобразит интерактивную карточку с предпросмотром и мгновенным скачиванием готового файла в .xlsx, .pptx, .docx или .pdf!`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      messages,
      userMessage,
      userName,
      apiKey,
      model,
      mode, // "brief" | "detailed" | "normal"
      webSearch, // boolean
      images, // string[] (base64 data URLs)
      attachments, // Array<{ name: string; content: string; type?: string }>
    } = body;

    // Check API Key
    const effectiveApiKey = (apiKey && typeof apiKey === "string" && apiKey.trim()) || process.env.OPENROUTER_API_KEY;

    if (!effectiveApiKey || !effectiveApiKey.trim()) {
      return NextResponse.json({
        content: `Для работы универсального ИИ-ассистента на базе Claude / OpenRouter требуется API-ключ.\n\nПожалуйста, укажите ваш ключ в **Настройках** (шестеренка в левом нижнем углу меню) или настройте переменную окружения \`OPENROUTER_API_KEY\` в Vercel/хостинге.`,
        source: "notice",
      });
    }

    // Determine style instruction
    let styleInstruction = "";
    const promptLower = String(userMessage || "").toLowerCase();
    const isBrief = mode === "brief" || /коротко|кратко|в двух словах|тезисно|без воды|сжато/.test(promptLower);
    const isDetailed = mode === "detailed" || /развернуто|подробно|детально|глубокий анализ|полный отчет/.test(promptLower);

    if (isBrief) {
      styleInstruction = "\n\n[РЕЖИМ ОТВЕТА: КРАТКО. Отвечай максимально лаконично, тезисно, без долгих вступлений, только ключевая суть.]";
    } else if (isDetailed) {
      styleInstruction = "\n\n[РЕЖИМ ОТВЕТА: РАЗВЕРНУТО. Предоставь исчерпывающий, глубокий, детальный анализ со структурой, примерами и полными пояснениями.]";
    }

    const userGreetingInstruction = (userName && typeof userName === "string" && userName.trim())
      ? `\n\n[ПОЛЬЗОВАТЕЛЬ: Имя текущего собеседника — «${userName.trim()}». При приветствиях и персональном обращении уважительно обращайся к нему по этому имени.]`
      : "";

    // Build base system prompt
    const formattedMessages: Array<{ role: "system" | "user" | "assistant"; content: MessageContent }> = [
      { role: "system", content: GENERAL_ASSISTANT_SYSTEM_PROMPT + styleInstruction + userGreetingInstruction },
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

    // Build user message content (supporting multimodal images)
    let finalUserContent: MessageContent = textPrompt;
    if (Array.isArray(images) && images.length > 0) {
      const parts: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> = [
        { type: "text", text: textPrompt || "Пожалуйста, проанализируй прикрепленные изображения." },
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

    // Add current user turn
    if (textPrompt || (Array.isArray(images) && images.length > 0)) {
      // Avoid duplicate if last message in messages was identical text
      const lastMsg = formattedMessages[formattedMessages.length - 1];
      if (!lastMsg || lastMsg.role !== "user" || Array.isArray(images) || Array.isArray(attachments)) {
        formattedMessages.push({
          role: "user",
          content: finalUserContent,
        });
      }
    }

    // Model selection: if images are present, ensure vision-capable model
    let chosenModel = model || "anthropic/claude-3.7-sonnet";
    if (Array.isArray(images) && images.length > 0) {
      if (!chosenModel.includes("claude") && !chosenModel.includes("gpt-4") && !chosenModel.includes("gemini")) {
        chosenModel = "anthropic/claude-3.7-sonnet";
      }
    }

    // Plugins configuration (e.g. web search)
    const plugins: Array<{ id: string }> = [];
    if (webSearch) {
      plugins.push({ id: "web" });
    }

    // Call OpenRouter with multi-tier fallback
    try {
      const openRouterResponse = await callOpenRouter({
        model: chosenModel,
        messages: formattedMessages,
        temperature: 0.4,
        max_tokens: 4000,
        plugins: plugins.length > 0 ? plugins : undefined,
      }, effectiveApiKey);

      if (openRouterResponse?.choices?.[0]?.message?.content) {
        return NextResponse.json({
          content: openRouterResponse.choices[0].message.content,
          source: "openrouter",
          usedModel: openRouterResponse.model,
        });
      }

      throw new Error("OpenRouter вернул пустой ответ");
    } catch (apiError: any) {
      console.error("OpenRouter request failed:", apiError?.message || apiError);
      const errorMsg = apiError?.message || "Ошибка подключения к серверу OpenRouter";
      return NextResponse.json({
        content: `⚠️ **Не удалось получить ответ от языковой модели**\n\nПричина: ${errorMsg}\n\nПожалуйста, проверьте:\n1. Корректность API-ключа в **Настройках**;\n2. Наличие положительного баланса кредитов в вашем аккаунте OpenRouter;\n3. В **Настройках** (шестеренка в сайдбаре) вы можете выбрать другую модель (например, Claude 3.7 Sonnet, Gemini 2.5 Flash или GPT-4o).`,
        source: "error",
      });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Внутренняя ошибка сервера";
    console.error("Legal-chat route handler error:", message);
    return NextResponse.json({
      content: `⚠️ Произошла ошибка при обработке запроса: ${message}`,
      source: "error",
    });
  }
}
