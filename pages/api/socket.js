import { Server } from "socket.io";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req, res) {
  if (!res.socket.server.io) {
    const io = new Server(res.socket.server, {
      path: "/socket.io",
      addTrailingSlash: false,
      cors: { origin: true, credentials: true },
    });
    res.socket.server.io = io;
    io.on("connection", (socket) => {
      // Ready ping
      socket.emit("ready", { ok: true });
    });
  }
  res.status(200).json({ ok: true });
}


