import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, provider, apiKey, voiceId } = body;

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    const cleanText = text
      .replace(/```[\s\S]*?```/g, "") // remove code blocks
      .replace(/[#*_~`]/g, "") // remove markdown syntax
      .replace(/https?:\/\/\S+/g, "") // remove URLs
      .trim();

    if (!cleanText) {
      return NextResponse.json({ error: "Text is empty after stripping markdown" }, { status: 400 });
    }

    // 1. ELEVENLABS TTS API
    if (provider === "elevenlabs" && apiKey) {
      const selectedVoice = voiceId || "21m00Tcm4TlvDq8ikWAM"; // default expressive female voice
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${selectedVoice}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey.trim(),
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.35,
            use_speaker_boost: true,
          },
        }),
      });

      if (res.ok) {
        const audioBuffer = await res.arrayBuffer();
        const base64Audio = Buffer.from(audioBuffer).toString("base64");
        return NextResponse.json({
          audioUrl: `data:audio/mp3;base64,${base64Audio}`,
          provider: "elevenlabs",
        });
      } else {
        const errText = await res.text();
        console.warn("ElevenLabs TTS error, falling back:", errText);
      }
    }

    // 2. FISH AUDIO TTS API
    if (provider === "fish_audio" && apiKey) {
      const res = await fetch("https://api.fish.audio/v1/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          text: cleanText,
          reference_id: voiceId || undefined,
          format: "mp3",
        }),
      });

      if (res.ok) {
        const audioBuffer = await res.arrayBuffer();
        const base64Audio = Buffer.from(audioBuffer).toString("base64");
        return NextResponse.json({
          audioUrl: `data:audio/mp3;base64,${base64Audio}`,
          provider: "fish_audio",
        });
      } else {
        const errText = await res.text();
        console.warn("Fish Audio TTS error, falling back:", errText);
      }
    }

    // 3. Fallback: tell client to use Web Speech API browser synthesis
    return NextResponse.json({
      fallback: true,
      text: cleanText,
    });
  } catch (err: any) {
    console.error("TTS Route error:", err);
    return NextResponse.json({ fallback: true, error: err.message });
  }
}
