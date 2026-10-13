export type MessageContent =
  | string
  | Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    >;

export interface OpenRouterRequestPayload {
  model?: string;
  models?: string[];
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: MessageContent;
  }>;
  temperature?: number;
  max_tokens?: number;
  plugins?: Array<{ id: string; [key: string]: unknown }>;
}

export async function callOpenRouter(payload: OpenRouterRequestPayload, userApiKey?: string) {
  // Support both server environment variable and runtime key
  const apiKey = (userApiKey && userApiKey.trim()) || process.env.OPENROUTER_API_KEY;

  if (!apiKey || !apiKey.trim()) {
    console.warn("OpenRouter API key is not configured.");
    return null;
  }

  // Primary model preference
  const primaryModel = payload.model || "anthropic/claude-3.7-sonnet";

  // Construct priority fallback list
  const fallbackModels = [
    primaryModel,
    "anthropic/claude-3.7-sonnet",
    "anthropic/claude-3.5-sonnet:beta",
    "anthropic/claude-3.5-sonnet",
    "anthropic/claude-3-5-sonnet-20241022",
    "anthropic/claude-3.5-haiku",
    "google/gemini-2.5-flash",
    "openai/gpt-4o",
  ];
  const uniqueModels = Array.from(new Set(fallbackModels));

  const executeCall = async (bodyPayload: Record<string, unknown>) => {
    return fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey.trim()}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "https://geonedra.crm",
        "X-Title": "Geo AI CRM",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bodyPayload),
    });
  };

  // Base parameters
  const baseParams: Record<string, unknown> = {
    messages: payload.messages,
    temperature: payload.temperature ?? 0.3,
    max_tokens: payload.max_tokens ?? 3500,
  };
  if (payload.plugins && payload.plugins.length > 0) {
    baseParams.plugins = payload.plugins;
  }

  // Tier 1: Try OpenRouter native fallback array
  try {
    const response = await executeCall({
      ...baseParams,
      models: uniqueModels,
    });

    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.warn("OpenRouter models array call failed, trying sequential fallbacks...", err);
  }

  // Tier 2: Try candidates sequentially if batch fallback didn't resolve
  let lastError = "";
  for (const candidate of uniqueModels) {
    try {
      const response = await executeCall({
        ...baseParams,
        model: candidate,
      });

      if (response.ok) {
        return await response.json();
      } else {
        const errText = await response.text();
        lastError = `OpenRouter (${response.status}): ${errText}`;
        console.warn(`Model candidate ${candidate} returned ${response.status}:`, errText);
      }
    } catch (singleErr: unknown) {
      const msg = singleErr instanceof Error ? singleErr.message : String(singleErr);
      lastError = msg;
    }
  }

  throw new Error(lastError || "Не удалось связаться с моделями OpenRouter");
}
