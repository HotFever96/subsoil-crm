/**
 * Resilient JSON repair utility for interrupted or streaming LLM outputs.
 * Repairs unclosed strings, unmatched brackets/braces, and trailing commas.
 */

export function tryRepairAndParseJson<T = any>(raw: string): T | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // 1. First attempt: Direct parse
  try {
    return JSON.parse(trimmed);
  } catch {}

  // 2. Second attempt: Strip outer markdown wrappers if present
  let cleaned = trimmed
    .replace(/^```[a-zA-Z0-9_\-:#]*\n?/, "")
    .replace(/\n?```$/, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {}

  // 3. Third attempt: Track open strings and brackets stack
  try {
    let inString = false;
    let isEscaped = false;
    const stack: string[] = [];

    for (let i = 0; i < cleaned.length; i++) {
      const char = cleaned[i];
      if (char === "\\" && inString) {
        isEscaped = !isEscaped;
        continue;
      }
      if (char === '"' && !isEscaped) {
        inString = !inString;
      } else if (!inString) {
        if (char === "{" || char === "[") {
          stack.push(char);
        } else if (char === "}" && stack.length && stack[stack.length - 1] === "{") {
          stack.pop();
        } else if (char === "]" && stack.length && stack[stack.length - 1] === "[") {
          stack.pop();
        }
      }
      isEscaped = false;
    }

    let repaired = cleaned;
    // If cut off inside an open string literal, close it
    if (inString) {
      repaired += '"';
    }

    // Strip trailing commas, colons, or whitespace before closing structures
    repaired = repaired.replace(/[:,\s]+$/, "");

    // Close open structures in reverse order
    while (stack.length > 0) {
      const open = stack.pop();
      repaired = repaired.replace(/[:,\s]+$/, "");
      if (open === "{") repaired += "}";
      else if (open === "[") repaired += "]";
    }

    const parsed = JSON.parse(repaired);
    return parsed;
  } catch {}

  // 4. Fourth attempt: Aggressive truncation to last complete value/brace
  try {
    const lastBraceIdx = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
    if (lastBraceIdx > 0) {
      let candidate = cleaned.slice(0, lastBraceIdx + 1);
      // Strip trailing commas
      candidate = candidate.replace(/,\s*$/, "");

      const openBraces = (candidate.match(/{/g) || []).length;
      const closeBraces = (candidate.match(/}/g) || []).length;
      const openBrackets = (candidate.match(/\[/g) || []).length;
      const closeBrackets = (candidate.match(/]/g) || []).length;

      for (let i = 0; i < openBrackets - closeBrackets; i++) candidate += "]";
      for (let i = 0; i < openBraces - closeBraces; i++) candidate += "}";

      return JSON.parse(candidate);
    }
  } catch {}

  return null;
}

/**
 * Extracts metadata when JSON cannot be parsed at all,
 * preventing any raw syntax from leaking to the UI.
 */
export function extractFileMetadataFallback(raw: string): {
  title: string;
  filename: string;
  subtitle?: string;
  approxSectionsCount: number;
} {
  const titleMatch = /"(?:title|filename)"\s*:\s*"([^"\n]+)/i.exec(raw);
  const subtitleMatch = /"(?:subtitle|summary)"\s*:\s*"([^"\n]+)/i.exec(raw);
  const headings = raw.match(/"heading"\s*:\s*"([^"\n]*)/gi) || [];

  const rawTitle = titleMatch ? titleMatch[1].trim() : "Документ недропользования";
  const filename = rawTitle.endsWith(".docx") || rawTitle.endsWith(".xlsx") || rawTitle.endsWith(".pptx")
    ? rawTitle
    : `${rawTitle}.docx`;

  return {
    title: rawTitle,
    filename,
    subtitle: subtitleMatch ? subtitleMatch[1].trim() : undefined,
    approxSectionsCount: headings.length,
  };
}
