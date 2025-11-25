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

const ASCII_CHAR_SET = " .:-+*=%@#";
const CHAR_WIDTH = 6;
const CHAR_HEIGHT = 10;

const FULL_QUESTION = "하루에 깨어 있는 시간이 얼마나 되나요?";
const THINKING_TEXT = "AI가 생각중입니다...";

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
  const asciiRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [countdown, setCountdown] = useState(null);
  const [hasTransitioned, setHasTransitioned] = useState(false);
  const [timeOfDay, setTimeOfDay] = useState(null); // "day" | "night"
  const [modalText, setModalText] = useState(FULL_QUESTION);
  const presenceTimerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastAnalysisRef = useRef(0);
  const modalTimerRef = useRef(null);

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

  // 질문 모달 텍스트 애니메이션
  // 1) 질문이 4초간 유지
  // 2) 질문이 타이핑 사라지듯이 삭제
  // 3) "AI가 생각중입니다..." 가 타이핑되듯이 나타남
  // 4) 이 텍스트가 3초 유지된 뒤 다시 타이핑되듯이 사라지고, 3)~4) 루프
  useEffect(() => {
    if (!hasTransitioned) {
      setModalText(FULL_QUESTION);
      if (modalTimerRef.current) {
        clearTimeout(modalTimerRef.current);
        modalTimerRef.current = null;
      }
      return;
    }

    // "AI가 생각중입니다..." 한 글자씩 타이핑
    const typeThinking = (onComplete) => {
      let typeIndex = 0;
      const typeStep = () => {
        typeIndex += 1;
        setModalText(THINKING_TEXT.slice(0, typeIndex));
        if (typeIndex < THINKING_TEXT.length) {
          modalTimerRef.current = setTimeout(typeStep, 70);
        } else if (onComplete) {
          // 전체 문장이 다 써진 뒤 3초 유지
          modalTimerRef.current = setTimeout(onComplete, 3000);
        }
      };
      typeStep();
    };

    // "AI가 생각중입니다..." 를 한 글자씩 삭제
    const deleteThinking = (onComplete) => {
      let index = THINKING_TEXT.length;
      const deleteStep = () => {
        index -= 1;
        setModalText(THINKING_TEXT.slice(0, Math.max(index, 0)));
        if (index > 0) {
          modalTimerRef.current = setTimeout(deleteStep, 40);
        } else if (onComplete) {
          // 완전히 삭제된 뒤 잠깐 멈춤
          modalTimerRef.current = setTimeout(onComplete, 260);
        }
      };
      deleteStep();
    };

    // 3)~4) 를 계속 반복
    const startThinkingLoop = () => {
      typeThinking(() => {
        deleteThinking(() => {
          startThinkingLoop();
        });
      });
    };

    function startSequence() {
      // 1) 질문 텍스트를 한 글자씩 지우기
      let index = FULL_QUESTION.length;

      const deleteStep = () => {
        index -= 1;
        setModalText(FULL_QUESTION.slice(0, Math.max(index, 0)));

        if (index > 0) {
          modalTimerRef.current = setTimeout(deleteStep, 40);
        } else {
          // 질문이 완전히 지워진 뒤, 생각 루프 시작
          modalTimerRef.current = setTimeout(startThinkingLoop, 260);
        }
      };

      deleteStep();
    }

    // 질문이 뜬 뒤 4초 후에 전체 시퀀스 시작
    modalTimerRef.current = setTimeout(startSequence, 4000);

    return () => {
      if (modalTimerRef.current) {
        clearTimeout(modalTimerRef.current);
        modalTimerRef.current = null;
      }
    };
  }, [hasTransitioned]);

  // 웹캠 프레임을 ASCII 텍스트로 변환하는 루프
  useEffect(() => {
    if (!isCameraOn || !hasTransitioned) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (asciiRef.current) {
        asciiRef.current.textContent = "";
      }
      return;
    }

    const video = videoRef.current;
    const asciiElement = asciiRef.current;
    if (!video || !asciiElement) {
      return;
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    function resize() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const cols = Math.floor(width / CHAR_WIDTH);
      const rows = Math.floor(height / CHAR_HEIGHT);
      canvas.width = cols;
      canvas.height = rows;
    }

    resize();
    window.addEventListener("resize", resize);

    function renderAscii() {
      if (video.readyState >= 2) {
        try {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const { data, width, height } = imageData;
          let ascii = "";
          let brightCount = 0;
          let darkCount = 0;

          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              const i = (y * width + x) * 4;
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              const brightness = (r + g + b) / 3;
              const charIndex = Math.floor(
                (brightness / 255) * (ASCII_CHAR_SET.length - 1)
              );
              const char =
                ASCII_CHAR_SET[ASCII_CHAR_SET.length - 1 - charIndex];
              ascii += char;

              if (brightness >= 128) {
                brightCount += 1;
              } else {
                darkCount += 1;
              }
            }
            ascii += "\n";
          }

          asciiElement.textContent = ascii;

          // 밝은 영역과 어두운 영역 비율을 기반으로 "낮/밤" 추정
          const total = brightCount + darkCount;
          if (total > 0) {
            const now = performance.now();
            // 너무 자주 setState 하지 않도록 0.5초 단위로만 갱신
            if (now - lastAnalysisRef.current > 500) {
              lastAnalysisRef.current = now;
              const nextTimeOfDay = brightCount >= darkCount ? "day" : "night";
              setTimeOfDay((prev) =>
                prev === nextTimeOfDay ? prev : nextTimeOfDay
              );
            }
          }
        } catch (e) {
          // 캔버스 드로잉 실패 시 조용히 무시
        }
      }

      animationFrameRef.current = requestAnimationFrame(renderAscii);
    }

    renderAscii();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      window.removeEventListener("resize", resize);
      if (asciiRef.current) {
        asciiRef.current.textContent = "";
      }
    };
  }, [isCameraOn, hasTransitioned]);

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
        className="hidden"
        playsInline
        muted
      />

      {/* 웹캠을 ASCII 텍스트로 표현하는 레이어 */}
      <pre
        ref={asciiRef}
        className={`pointer-events-none absolute inset-0 m-0 bg-black text-[10px] font-mono leading-[10px] text-zinc-100 whitespace-pre ${
          hasTransitioned ? "opacity-100" : "opacity-0"
        }`}
        style={{
          letterSpacing: "0px",
        }}
      />

      {/* 상단 질문 모달 */}
      {hasTransitioned && (
        <div className="pointer-events-auto absolute left-1/2 top-16 z-20 w-[min(90%,28rem)] -translate-x-1/2 rounded-2xl bg-white/95 px-7 py-5 text-sm text-zinc-900 shadow-2xl sm:text-base">
          <p className="text-center leading-relaxed tracking-wide">
            {modalText}
          </p>
        </div>
      )}

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
              사용자의 모습을 본뜬 디스플레이가 실현됩니다
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


