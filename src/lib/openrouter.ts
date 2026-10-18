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

// Tiered High-Performance Models Chain
// Strictly flagship models that maintain complete JSON structure & Function Calling
export const PRIMARY_MODEL = "anthropic/claude-sonnet-4.6";
export const FALLBACK_MODEL_1 = "openai/gpt-5.4";
export const FALLBACK_MODEL_2 = "google/gemini-3.8-flash";

export const DEFAULT_MODELS_CHAIN = [
  PRIMARY_MODEL,
  FALLBACK_MODEL_1,
  FALLBACK_MODEL_2,
];

export async function callOpenRouter(payload: OpenRouterRequestPayload, userApiKey?: string) {
  // Support both server environment variable and runtime key
  const apiKey = (userApiKey && userApiKey.trim()) || process.env.OPENROUTER_API_KEY;

  if (!apiKey || !apiKey.trim()) {
    console.warn("OpenRouter API key is not configured.");
    return null;
  }

  // Determine target model chain
  const requestedModel = payload.model || PRIMARY_MODEL;
  const modelsChain: string[] = payload.models && payload.models.length > 0
    ? payload.models
    : Array.from(new Set([requestedModel, ...DEFAULT_MODELS_CHAIN]));

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

  const baseParams: Record<string, unknown> = {
    messages: payload.messages,
    temperature: payload.temperature ?? 0.3,
    max_tokens: payload.max_tokens ?? 8192,
  };
  if (payload.plugins && payload.plugins.length > 0) {
    baseParams.plugins = payload.plugins;
  }

  // Tier 1: Use OpenRouter native 'models' fallback routing
  // OpenRouter automatically queries the first model, and seamlessly switches to the next
  // only if the provider encounters 5xx outages or unavailability.
  try {
    const response = await executeCall({
      ...baseParams,
      models: modelsChain,
    });

    if (response.ok) {
      const data = await response.json();
      if (data?.choices?.[0]?.message?.content) {
        return data;
      }
    } else {
      const statusText = await response.text();
      console.warn(`OpenRouter batch routing returned ${response.status}:`, statusText);
    }
  } catch (err) {
    console.warn("OpenRouter native models routing failed, attempting sequential fallback...", err);
  }

  // Tier 2: Explicit sequential fallback for server/network errors (5xx/429)
  let lastError = "";
  for (const candidate of modelsChain) {
    try {
      const response = await executeCall({
        ...baseParams,
        model: candidate,
      });

      if (response.ok) {
        const data = await response.json();
        if (data?.choices?.[0]?.message?.content) {
          return data;
        }
      } else {
        const errText = await response.text();
        lastError = `OpenRouter (${response.status}): ${errText}`;
        console.warn(`Model candidate ${candidate} failed (${response.status}):`, errText);
      }
    } catch (singleErr: unknown) {
      const msg = singleErr instanceof Error ? singleErr.message : String(singleErr);
      lastError = msg;
    }
  }

  throw new Error(lastError || "Не удалось связаться с моделями OpenRouter");
}
