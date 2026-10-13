export interface OpenRouterRequestPayload {
  model?: string;
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
}

export async function callOpenRouter(payload: OpenRouterRequestPayload, userApiKey?: string) {
  // Support both server environment variable and runtime key
  const apiKey = (userApiKey && userApiKey.trim()) || process.env.OPENROUTER_API_KEY;

  if (!apiKey || !apiKey.trim()) {
    console.warn("OpenRouter API key is not configured.");
    return null;
  }

  const model = payload.model || "anthropic/claude-3.5-sonnet";

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey.trim()}`,
      "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "https://geonedra.crm",
      "X-Title": "GEONEDRA CRM",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model,
      messages: payload.messages,
      temperature: payload.temperature ?? 0.3,
      max_tokens: payload.max_tokens ?? 3500,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`OpenRouter API error (${response.status}):`, errorText);
    throw new Error(`OpenRouter (${response.status}): ${errorText}`);
  }

  return response.json();
}
