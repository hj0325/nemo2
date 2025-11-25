import OpenAI from "openai";
import { Server } from "socket.io";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "1mb",
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  try {
    // Ensure socket.io exists
    let io = res.socket.server.io;
    if (!io) {
      io = new Server(res.socket.server, { path: "/socket.io" });
      res.socket.server.io = io;
    }

    const { prompt } = req.body || {};
    const apiKey =
      process.env.OPENAI_API_KEY ||
      process.env.NEXT_PUBLIC_OPENAI_API_KEY ||
      process.env.OPENAI_API_KEY_BETA;
    if (!apiKey) {
      res.status(500).json({ error: "Missing OPENAI_API_KEY" });
      return;
    }
    const openai = new OpenAI({ apiKey });
    const p =
      prompt ||
      "Minimal black-and-white circular abstract emblem, elegant, clean background";

    const result = await openai.images.generate({
      model: "gpt-image-1",
      prompt: p,
      size: "1024x1024",
      quality: "standard",
    });

    const b64 = result?.data?.[0]?.b64_json;
    if (!b64) {
      res.status(500).json({ error: "Failed to generate image" });
      return;
    }
    const dataUri = `data:image/png;base64,${b64}`;

    // Broadcast to all connected clients
    io.emit("image", { dataUri, prompt: p, ts: Date.now() });

    res.status(200).json({ ok: true, dataUri });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Image generation failed" });
  }
}


