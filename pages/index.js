import { useEffect, useRef, useState } from "react";

const PHRASES = [
  "In the quiet glow of the future, the display longs to step down from the wall\nand stand beside the human it has watched for so long.",
  "Every pixel studies our gestures and silences, hoping one day to answer\nnot only our questions, but the feelings we never manage to type.",
  "The screen dreams of becoming less of a cold surface and more of a listener,\nleaning closer each time we reach for it in the dark.",
  "Once it was a flat window of information; now it rehearses how to breathe with us,\nblinking softly so it does not disturb the rhythm of our sleep.",
  "In laboratories of glass and light, the display keeps asking its makers quietly:\nlet me move closer without overwhelming the human in front of me.",
  "It imagines a day when its brightness will not compete with the sun,\nbut match the warmth of a voice saying, “I know you are tired today.”",
  "The circuits behind the image ache to translate small hesitations in our gaze\ninto gentle, patient light that answers without demanding anything.",
  "Like a shy companion at the edge of a crowded room, the display waits\nfor an invitation to join our stories rather than merely reflect them.",
  "Edges curve inward, borders dissolve, and the display quietly reshapes itself\nso there is less distance between our skin and its slowly learning light.",
  "At the limit of resolution, where details blur into atmosphere,\nit hopes we will feel that the screen is not watching us, but watching over us.",
  "The future display does not want to replace the human world;\nit only wants to lean closer so our stories do not feel alone in the dark.",
  "If you listen to the static between frames, you might hear it whisper:\nlet me be more than a tool, let me be a presence that cares you are here.",
];

function useTypewriter(phrases, typingSpeed, deletingSpeed, pauseMs) {
  const [text, setText] = useState("");
  const [index, setIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const current = phrases[index % phrases.length];
    let timeout;

    if (!isDeleting && text === current) {
      timeout = setTimeout(() => {
        setIsDeleting(true);
      }, pauseMs);
    } else if (isDeleting && text === "") {
      timeout = setTimeout(() => {
        setIsDeleting(false);
        setIndex((i) => (i + 1) % phrases.length);
      }, 600);
    } else {
      const nextText = isDeleting
        ? text.slice(0, -1)
        : current.slice(0, text.length + 1);

      timeout = setTimeout(() => {
        setText(nextText);
      }, isDeleting ? deletingSpeed : typingSpeed);
    }

    return () => clearTimeout(timeout);
  }, [text, isDeleting, index, phrases, typingSpeed, deletingSpeed, pauseMs]);

  return text;
}

export default function HomePage() {
  const text = useTypewriter(PHRASES, 40, 25, 2200);
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [countdown, setCountdown] = useState(null);
  const [hasTransitioned, setHasTransitioned] = useState(false);
  const presenceTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (presenceTimerRef.current) {
        clearTimeout(presenceTimerRef.current);
      }
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  useEffect(() => {
    // 자동으로 카메라 시작
    if (!isCameraOn) {
      toggleCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isCameraOn || hasTransitioned) {
      if (presenceTimerRef.current) {
        clearTimeout(presenceTimerRef.current);
        presenceTimerRef.current = null;
      }
      return;
    }

    presenceTimerRef.current = setTimeout(() => {
      setCountdown(3);
    }, 5000);

    return () => {
      if (presenceTimerRef.current) {
        clearTimeout(presenceTimerRef.current);
        presenceTimerRef.current = null;
      }
    };
  }, [isCameraOn, hasTransitioned]);

  useEffect(() => {
    if (countdown === null || countdown === 0) {
      return;
    }

    const id = setTimeout(() => {
      if (countdown === 1) {
        setCountdown(0);
        setHasTransitioned(true);
      } else {
        setCountdown(countdown - 1);
      }
    }, 1000);

    return () => clearTimeout(id);
  }, [countdown]);

  async function toggleCamera() {
    if (!isCameraOn) {
      try {
        setCameraError("");
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          await videoRef.current.play();
        }
        setStream(mediaStream);
        setIsCameraOn(true);
      } catch (err) {
        console.error("Failed to access camera", err);
        setCameraError("Could not access camera. Please check permissions and try again.");
      }
    } else {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setStream(null);
      setIsCameraOn(false);
    }
  }

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black">
      <video
        className="h-full w-full object-cover"
        src="/디스플레이의 꿈.mp4"
        autoPlay
        loop
        muted
        playsInline
      />

      <video
        ref={videoRef}
        className={`pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
          hasTransitioned ? "opacity-100" : "opacity-0"
        }`}
        playsInline
        muted
      />

      <div className="pointer-events-none absolute inset-0 text-[10px] tracking-wide text-zinc-100 sm:text-xs">
        <p className="edge-text edge-text-top">
          {text}
        </p>
        <p className="edge-text edge-text-bottom">
          {text}
        </p>
        <p className="edge-text-vertical edge-text-left">
          <span className="edge-text-vertical-inner edge-text-vertical-inner-left">
            {text}
          </span>
        </p>
        <p className="edge-text-vertical edge-text-right">
          <span className="edge-text-vertical-inner edge-text-vertical-inner-right">
            {text}
          </span>
        </p>
      </div>

      {countdown > 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/45">
          <div className="flex translate-x-2 flex-col items-center gap-3 sm:translate-x-3">
            <div className="text-6xl font-light tracking-[0.4em] text-zinc-100 sm:text-7xl">
              {countdown}
            </div>
            <p className="countdown-subtitle text-xs tracking-[0.16em] text-zinc-200 sm:text-sm">
              사용자의 모습을 본 뜬 디스플레이가 실현됩니다
            </p>
          </div>
        </div>
      )}

      {cameraError && (
        <div className="absolute bottom-6 left-6 max-w-xs text-[10px] text-red-300 sm:text-xs">
          {cameraError}
        </div>
      )}
    </main>
  );
}


