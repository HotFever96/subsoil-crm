import { NextRequest, NextResponse } from "next/server";
import { callOpenRouter } from "@/lib/openrouter";

const GENERAL_ASSISTANT_SYSTEM_PROMPT = `Ты — высокоинтеллектуальный, универсальный ИИ-ассистент (как ChatGPT и Gemini) в корпоративной системе GEONEDRA.
Твои возможности:
- Помощь в решении бизнес-задач, управленческих вопросах и стратегическом планировании;
- Написание, ревью и отладка программного кода на любых языках (TypeScript, Python, SQL и др.);
- Создание качественных структурированных текстов, деловых писем, аналитических справок и отчетов;
- Глубокие экспертные ответы на любые технические, научные, экономические и юридические вопросы;
- При необходимости ты также свободно ориентируешься в законодательстве РФ, недропользовании, горном деле и инженерных расчетах.

Стиль общения:
- Вежливый, четкий, структурный, без воды;
- Используй Markdown для форматирования кода, таблиц и списков;
- Отвечай точно на языке пользователя.`;

export async function POST(req: NextRequest) {
  try {
    const { messages, userMessage } = await req.json();

    const formattedMessages = [
      { role: "system" as const, content: GENERAL_ASSISTANT_SYSTEM_PROMPT },
      ...(messages || []),
    ];

    if (userMessage) {
      formattedMessages.push({ role: "user" as const, content: userMessage });
    }

    // Call OpenRouter with Claude 3.5 Sonnet
    const openRouterResponse = await callOpenRouter({
      model: "anthropic/claude-3.5-sonnet",
      messages: formattedMessages,
      temperature: 0.3,
      max_tokens: 3500,
    });

    if (openRouterResponse?.choices?.[0]?.message?.content) {
      return NextResponse.json({
        content: openRouterResponse.choices[0].message.content,
        source: "openrouter",
      });
    }

    // Smart general fallback if API key is not configured
    const lastUserQuery = userMessage || (messages && messages[messages.length - 1]?.content) || "";
    let fallbackText = `Я готов помочь с любой вашей задачей: написать программный код, составить аналитический или деловой документ, оптимизировать бизнес-процессы или ответить на любые вопросы.

Задайте ваш вопрос или опишите задачу подробно.`;

    if (lastUserQuery.toLowerCase().includes("код") || lastUserQuery.toLowerCase().includes("code")) {
      fallbackText = `Вот пример чистого кода для решения задачи:\n\n\`\`\`typescript\n// Универсальный обработчик запросов\nexport async function handleTask<T>(payload: T): Promise<{ success: boolean; data: T }> {\n  console.log("Processing task:", payload);\n  return { success: true, data: payload };\n}\n\`\`\`\n\nЕсли требуется адаптация под конкретный стек или базу данных, уточните детали.`;
    }

    return NextResponse.json({
      content: fallbackText,
      source: "local-engine",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
