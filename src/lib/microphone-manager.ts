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
  isGrantedInBrowser?: boolean;
}

/**
 * Directly requests microphone stream inside user-gesture event (onClick).
 * Tests both high-fidelity constraints and clean fallback { audio: true }.
 */
export async function requestMicrophoneStream(): Promise<MicPermissionResult> {
  if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return {
      ok: false,
      errorType: "unsupported",
      errorMessage: "Ваш браузер не поддерживает захват звука с микрофона.",
    };
  }

  // Check if browser permission query reports granted
  let isGrantedInBrowser = false;
  try {
    if (navigator.permissions?.query) {
      const p = await navigator.permissions.query({ name: "microphone" as any });
      if (p.state === "granted") {
        isGrantedInBrowser = true;
      }
    }
  } catch {}

  // 1. Try with audio processing constraints
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    return { ok: true, stream, isGrantedInBrowser: true };
  } catch (firstErr: any) {
    console.warn("getUserMedia with constraints failed, trying minimal { audio: true }:", firstErr);

    // 2. Fallback to basic { audio: true } (resolves driver/headset constraint rejection)
    try {
      const basicStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      return { ok: true, stream: basicStream, isGrantedInBrowser: true };
    } catch (err: any) {
      console.warn("getUserMedia basic { audio: true } failed:", err);

      if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError" ||
        err.message?.toLowerCase().includes("permission denied")
      ) {
        return {
          ok: false,
          errorType: "not_allowed",
          isGrantedInBrowser,
          errorMessage: isGrantedInBrowser
            ? "Разрешение включено в Chrome! Нажмите «Обновить страницу» для применения к текущей вкладке."
            : "Доступ к микрофону заблокирован в браузере.",
        };
      }

      if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        return {
          ok: false,
          errorType: "not_found",
          errorMessage: "Микрофон не обнаружен. Проверьте подключение гарнитуры или микрофона.",
        };
      }

      return {
        ok: false,
        errorType: "unknown",
        errorMessage: err.message || "Не удалось получить доступ к микрофону.",
      };
    }
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
