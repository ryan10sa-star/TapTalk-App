import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

const ELEVEN_API_KEY = process.env.ELEVEN_API_KEY ?? "";
const ELEVEN_BASE = "https://api.elevenlabs.io/v1";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Live TTS preview — proxies a single ElevenLabs request for voice selection previews.
  // Uses the caller-supplied voiceId and text; never caches (preview-only).
  app.get("/api/tts-preview", async (req: Request, res: Response) => {
    const { voiceId, text } = req.query as { voiceId?: string; text?: string };

    if (!voiceId || !text) {
      res.status(400).json({ error: "voiceId and text are required" });
      return;
    }

    if (!ELEVEN_API_KEY) {
      res.status(503).json({ error: "TTS service not configured" });
      return;
    }

    const safeText = String(text).slice(0, 100);

    try {
      const upstream = await fetch(
        `${ELEVEN_BASE}/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
        {
          method: "POST",
          headers: {
            "xi-api-key": ELEVEN_API_KEY,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
          },
          body: JSON.stringify({
            text: safeText,
            model_id: "eleven_turbo_v2_5",
            voice_settings: {
              stability: 0.55,
              similarity_boost: 0.75,
              style: 0.30,
              use_speaker_boost: true,
            },
          }),
        }
      );

      if (!upstream.ok) {
        const body = await upstream.text();
        console.error(`[tts-preview] ElevenLabs ${upstream.status}: ${body.slice(0, 200)}`);
        res.status(upstream.status).json({ error: "Upstream TTS error" });
        return;
      }

      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Cache-Control", "no-store");

      const buffer = await upstream.arrayBuffer();
      res.end(Buffer.from(buffer));
    } catch (err) {
      console.error("[tts-preview] fetch error:", err);
      res.status(500).json({ error: "TTS request failed" });
    }
  });

  return httpServer;
}
