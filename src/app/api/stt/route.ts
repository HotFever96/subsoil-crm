import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ELEVENLABS_API_KEY is not configured on server" },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const audioFile = formData.get("file") as Blob | null;

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    const elevenForm = new FormData();
    elevenForm.append("file", audioFile, "audio.webm");
    elevenForm.append("model_id", "scribe_v1");
    elevenForm.append("language_code", "ru");

    const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: {
        "xi-api-key": apiKey.trim(),
      },
      body: elevenForm,
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn("ElevenLabs STT upstream error:", res.status, errText);
      return NextResponse.json(
        { error: `ElevenLabs STT upstream error: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({
      text: (data.text || "").trim(),
      success: true,
      language_code: data.language_code || "ru",
    });
  } catch (err: any) {
    console.error("STT route handler error:", err);
    return NextResponse.json({ error: err.message || "STT processing failed" }, { status: 500 });
  }
}
