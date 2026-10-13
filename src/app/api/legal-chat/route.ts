import { NextRequest, NextResponse } from "next/server";
import { callOpenRouter } from "@/lib/openrouter";

const GENERAL_ASSISTANT_SYSTEM_PROMPT = `Ты — универсальный, высокоинтеллектуальный ИИ-ассистент корпоративной системы Geo AI.
Твои возможности:
- Помощь в решении любых интеллектуальных и бизнес-задач, стратегическом планировании и аналитике;
- Написание, ревью, оптимизация и отладка программного кода (любые языки: TypeScript, Python, SQL, C++, Go и др.);
- Создание структурированных текстов, отчетов, деловых писем, юридических справок и документации;
- Ответы на любые вопросы пользователя с глубокой экспертизой;
- Свободная ориентация в недропользовании, законодательстве РФ (Закон «О недрах», экологические и горные нормы), геологии и горном деле при наличии профильных вопросов.

Стиль общения:
- Профессиональный, структурированный, живой, без канцелярита и искусственной воды;
- Активно используй Markdown: заголовки, списки, выделения полужирным, блоки кода с указанием языка.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, userMessage, apiKey } = body;

    // Check API Key
    const effectiveApiKey = (apiKey && typeof apiKey === "string" && apiKey.trim()) || process.env.OPENROUTER_API_KEY;

    if (!effectiveApiKey || !effectiveApiKey.trim()) {
      return NextResponse.json({
        content: `Для работы универсального ИИ-ассистента на базе **Claude 3.5 Sonnet** требуется API-ключ OpenRouter.\n\nПожалуйста, укажите ваш ключ в **Настройках** (шестеренка в левом нижнем углу меню) или настройте переменную окружения \`OPENROUTER_API_KEY\` в Vercel/хостинге.`,
        source: "notice",
      });
    }

    // Build multi-turn messages array with system prompt
    const formattedMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: GENERAL_ASSISTANT_SYSTEM_PROMPT },
    ];

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

    // Ensure last user query is present if passed separately
    if (userMessage && (!messages || messages.length === 0 || messages[messages.length - 1]?.content !== userMessage)) {
      formattedMessages.push({ role: "user", content: String(userMessage) });
    }

    // Call Claude 3.5 Sonnet via OpenRouter
    try {
      const openRouterResponse = await callOpenRouter({
        model: "anthropic/claude-3.5-sonnet",
        messages: formattedMessages,
        temperature: 0.3,
        max_tokens: 4000,
      }, effectiveApiKey);

      if (openRouterResponse?.choices?.[0]?.message?.content) {
        return NextResponse.json({
          content: openRouterResponse.choices[0].message.content,
          source: "openrouter",
        });
      }

      throw new Error("OpenRouter вернул пустой ответ");
    } catch (apiError: any) {
      console.error("OpenRouter request failed:", apiError?.message || apiError);
      const errorMsg = apiError?.message || "Ошибка подключения к серверу OpenRouter";
      return NextResponse.json({
        content: `⚠️ **Не удалось получить ответ от Claude 3.5 Sonnet**\n\nПричина: ${errorMsg}\n\nПожалуйста, проверьте:\n1. Корректность API-ключа в **Настройках**;\n2. Наличие положительного баланса кредитов в вашем аккаунте OpenRouter;\n3. Доступность API-сервера.`,
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

