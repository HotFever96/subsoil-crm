import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, voiceId } = body;
    const apiKey = body.apiKey || process.env.ELEVENLABS_API_KEY;

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

    // 1. ELEVENLABS TTS API (Ultra-fast eleven_flash_v2_5 engine)
    if (apiKey) {
      const selectedVoice = voiceId || "21m00Tcm4TlvDq8ikWAM"; // Expressive Russian/Multilingual female voice
      try {
        const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${selectedVoice}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "xi-api-key": apiKey.trim(),
          },
          body: JSON.stringify({
            text: cleanText,
            model_id: "eleven_flash_v2_5",
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
          // If flash_v2_5 fails or model not found, try fallback to eleven_multilingual_v2
          const retryRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${selectedVoice}`, {
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
              },
            }),
          });
          if (retryRes.ok) {
            const audioBuffer = await retryRes.arrayBuffer();
            const base64Audio = Buffer.from(audioBuffer).toString("base64");
            return NextResponse.json({
              audioUrl: `data:audio/mp3;base64,${base64Audio}`,
              provider: "elevenlabs",
            });
          }
        }
      } catch (e) {
        console.warn("ElevenLabs request failed, falling back to client synthesis:", e);
      }
    }

    // 2. Silent seamless fallback to client Web Speech API synthesis
    return NextResponse.json({
      fallback: true,
      text: cleanText,
    });
  } catch (err: any) {
    console.error("TTS Route error:", err);
    return NextResponse.json({ fallback: true, error: err.message });
  }
}
