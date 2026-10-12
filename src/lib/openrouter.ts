export interface OpenRouterRequestPayload {
  model?: string;
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
}

export async function callOpenRouter(payload: OpenRouterRequestPayload) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    // If not configured, provide realistic fallback/mock responses tailored for subsoil law & tech project specs
    return null;
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "https://subsoil-crm.local",
      "X-Title": "Subsoil Law & Mining CRM",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: payload.model || "anthropic/claude-3.5-sonnet",
      messages: payload.messages,
      temperature: payload.temperature ?? 0.2,
      max_tokens: payload.max_tokens ?? 2500,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
  }

  return response.json();
}
