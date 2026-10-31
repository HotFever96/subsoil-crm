import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, voiceId: customVoiceId } = body;
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = customVoiceId || process.env.ELEVENLABS_VOICE_ID || "FEv57Fb59mqBt2dXANPz";

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    // Clean text of markdown syntax (*, #, `, ```, URLs, etc.)
    const cleanText = text
      .replace(/```[\s\S]*?```/g, "")
      .replace(/https?:\/\/\S+/g, "")
      .replace(/[*#_~`>|]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanText) {
      return NextResponse.json({ error: "Text is empty after stripping markdown" }, { status: 400 });
    }

    if (apiKey) {
      try {
        const streamUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?optimize_streaming_latency=3&output_format=mp3_44100_128`;
        const res = await fetch(streamUrl, {
          method: "POST",
          headers: {
            "xi-api-key": apiKey.trim(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: cleanText,
            model_id: "eleven_flash_v2_5",
            language_code: "ru",
            voice_settings: {
              stability: 0.42,
              similarity_boost: 0.82,
              style: 0.22,
              use_speaker_boost: true,
            },
          }),
        });

        if (res.ok && res.body) {
          return new Response(res.body as any, {
            status: 200,
            headers: {
              "Content-Type": "audio/mpeg",
              "Cache-Control": "no-cache",
            },
          });
        }

        const errText = await res.text();
        console.warn("ElevenLabs stream returned error:", res.status, errText);
      } catch (err) {
        console.warn("ElevenLabs streaming request failed:", err);
      }
    }

    // Fallback indicator for client-side Web Speech API synthesis
    return NextResponse.json({ fallback: true, text: cleanText });
  } catch (err: any) {
    console.error("TTS Route error:", err);
    return NextResponse.json({ fallback: true, error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const text = searchParams.get("text") || "Проверка связи. Голосовой режим активен.";
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID || "FEv57Fb59mqBt2dXANPz";

  if (!apiKey) {
    return NextResponse.json({ error: "No API key configured" }, { status: 500 });
  }

  const streamUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?optimize_streaming_latency=3&output_format=mp3_44100_128`;
  const res = await fetch(streamUrl, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey.trim(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_flash_v2_5",
      language_code: "ru",
      voice_settings: {
        stability: 0.42,
        similarity_boost: 0.82,
        style: 0.22,
        use_speaker_boost: true,
      },
    }),
  });

  if (res.ok && res.body) {
    return new Response(res.body as any, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-cache",
      },
    });
  }

  return NextResponse.json({ error: "TTS generation failed" }, { status: res.status });
}
