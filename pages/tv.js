import { useEffect, useState } from "react";
import io from "socket.io-client";

let socket;

export default function TV() {
  const [img, setImg] = useState(null);
  const [prompt, setPrompt] = useState("");

  useEffect(() => {
    // Ensure socket server is initialized
    fetch("/api/socket").catch(() => {});
    socket = io(undefined, { path: "/socket.io" });
    socket.on("connect", () => {});
    socket.on("image", (payload) => {
      setImg(payload?.dataUri || null);
      setPrompt(payload?.prompt || "");
    });
    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black text-white">
      <div className="mb-6 text-sm text-white/70">{prompt}</div>
      <div className="w-[90vw] max-w-[800px] aspect-square bg-white/5 rounded-xl flex items-center justify-center overflow-hidden">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt="generated" className="h-full w-full object-contain" />
        ) : (
          <div className="text-white/50">대기 중…</div>
        )}
      </div>
    </main>
  );
}


