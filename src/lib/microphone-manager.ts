"use client";

/**
 * Microphone & Speech Recognition Manager
 * Ensures reliable direct getUserMedia permission invocation with universal
 * audio capture constraints and seamless fallback to ElevenLabs Scribe STT (/api/stt).
 */

export interface MicPermissionResult {
  ok: boolean;
  stream?: MediaStream;
  errorType?: "not_allowed" | "not_found" | "unsupported" | "unknown";
  errorMessage?: string;
}

/**
 * Universal direct getUserMedia call with clean { audio: true }.
 * Supported across all Chromium, Safari, and Firefox versions without constraint rejection.
 */
export async function requestMicrophoneStream(): Promise<MicPermissionResult> {
  if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return {
      ok: false,
      errorType: "unsupported",
      errorMessage: "Ваш браузер не поддерживает доступ к микрофону.",
    };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    return { ok: true, stream };
  } catch (err: any) {
    console.warn("navigator.mediaDevices.getUserMedia({ audio: true }) failed:", err.name, err.message);

    if (
      err.name === "NotAllowedError" ||
      err.name === "PermissionDeniedError" ||
      err.message?.toLowerCase().includes("permission denied")
    ) {
      return {
        ok: false,
        errorType: "not_allowed",
        errorMessage: "Доступ к микрофону отклонен браузером или ограничен в параметрах конфиденциальности Windows.",
      };
    }

    if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
      return {
        ok: false,
        errorType: "not_found",
        errorMessage: "Микрофон не обнаружен в системе. Подключите гарнитуру или микрофон.",
      };
    }

    return {
      ok: false,
      errorType: "unknown",
      errorMessage: err.message || "Не удалось захватить звук с микрофона.",
    };
  }
}

/**
 * Sends recorded audio blob to server /api/stt (ElevenLabs Scribe STT).
 * Provides high-accuracy Russian speech-to-text with minimal latency.
 */
export async function transcribeAudioWithServer(audioBlob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append("file", audioBlob, "speech.webm");

  const res = await fetch("/api/stt", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`STT server error: ${res.status}`);
  }

  const data = await res.json();
  return (data.text || "").trim();
}
