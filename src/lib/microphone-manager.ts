"use client";

/**
 * Microphone & Speech Recognition Manager
 * Ensures reliable direct getUserMedia permission invocation and provides
 * a seamless fallback to MediaRecorder + ElevenLabs Scribe STT (/api/stt).
 */

export interface MicPermissionResult {
  ok: boolean;
  stream?: MediaStream;
  errorType?: "not_allowed" | "not_found" | "unsupported" | "unknown";
  errorMessage?: string;
}

/**
 * Directly requests microphone stream inside user-gesture event (onClick).
 * Browsers only trigger the native permission prompt on direct synchronous calls.
 */
export async function requestMicrophoneStream(): Promise<MicPermissionResult> {
  if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return {
      ok: false,
      errorType: "unsupported",
      errorMessage: "Ваш браузер не поддерживает захват звука с микрофона.",
    };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    return { ok: true, stream };
  } catch (err: any) {
    console.warn("getUserMedia permission error:", err);
    if (
      err.name === "NotAllowedError" ||
      err.name === "PermissionDeniedError" ||
      err.message?.toLowerCase().includes("permission denied")
    ) {
      return {
        ok: false,
        errorType: "not_allowed",
        errorMessage: "Доступ к микрофону заблокирован в браузере.",
      };
    }
    if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
      return {
        ok: false,
        errorType: "not_found",
        errorMessage: "Микрофон не найден. Подключите гарнитуру или микрофон.",
      };
    }
    return {
      ok: false,
      errorType: "unknown",
      errorMessage: err.message || "Не удалось получить доступ к микрофону.",
    };
  }
}

/**
 * Sends recorded audio blob to server /api/stt (ElevenLabs Scribe STT).
 * Used as reliable fallback when browser SpeechRecognition fails or throws network error.
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
