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

const QUESTIONS = [
  "하루에 깨어 있는 시간이 얼마나 되나요?",
  "당신이 깨어있는 동안 작업 시간이 얼마나 되나요?",
];
const THINKING_TEXT = "AI가 생각중입니다...";

const GRID_CONFIG = {
  gridCount: 10,
  speed: 0.0025,
  phaseStrength: 0.05,
  lineWidth: 1,
};

const TRANSITION_DELAY_MS = 8000; // 첫 질문 화면에 들어온 뒤 8초 후
const TRANSITION_EFFECT_DURATION_MS = 7000; // 그리드 효과를 보여줄 시간
const DIAL_MIN = 0;
const DIAL_MAX = 24;
const INTERACTION_WINDOW_MS = 4000; // 다이얼 상호작용 시간
const ALLOW_GESTURE_INSTANT_CONFIRM = false; // 제스처로 즉시 확정 비활성화

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
  const [questionIndex, setQuestionIndex] = useState(0); // 0 = 첫 번째, 1 = 두 번째
  const [modalText, setModalText] = useState(QUESTIONS[0]);
  const [showTransitionEffect, setShowTransitionEffect] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [showDial, setShowDial] = useState(false);
  const [dialValue, setDialValue] = useState(16);
  const dialCanvasRef = useRef(null);
  const isDialDraggingRef = useRef(false);
  const dialAnimRef = useRef(null);
  const prevMotionAngleRef = useRef(null);
  const answersRef = useRef({ awakeHours: null, workHours: null });
  const lastHighMotionAtRef = useRef(null);
  const confirmCooldownUntilRef = useRef(0);
  const lastCentroidRef = useRef({ x: null, y: null });
  const dwellStartRef = useRef(null);
  const preDialTimerRef = useRef(null);
  const dialWindowTimerRef = useRef(null);
  const dialLockedRef = useRef(false);
  const presenceTimerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastAnalysisRef = useRef(0);
  const modalTimerRef = useRef(null);
  const transitionTimerRef = useRef(null);
  const transitionCanvasRef = useRef(null);
  const transitionAnimationRef = useRef(null);
  const transitionActiveRef = useRef(false);
  const thinkingCanvasRef = useRef(null);
  const thinkingAnimRef = useRef(null);
  const prevThinkingFrameRef = useRef(null);
  const [isThinkingPhase, setIsThinkingPhase] = useState(false);

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
    if (!hasStarted) return;
    if (!isCameraOn) {
      toggleCamera();
    }
  }, [hasStarted, isCameraOn]);

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

  // 질문 표시 → 3초 뒤 다이얼 시작 → 4초 뒤 자동 확정
  useEffect(() => {
    if (!hasTransitioned) {
      if (preDialTimerRef.current) {
        clearTimeout(preDialTimerRef.current);
        preDialTimerRef.current = null;
      }
      if (dialWindowTimerRef.current) {
        clearTimeout(dialWindowTimerRef.current);
        dialWindowTimerRef.current = null;
      }
      setShowDial(false);
      return;
    }
    // 질문 진입 시: 다이얼 숨김 후 3초 대기
    setShowDial(false);
    dialLockedRef.current = false;
    if (preDialTimerRef.current) {
      clearTimeout(preDialTimerRef.current);
      preDialTimerRef.current = null;
    }
    if (dialWindowTimerRef.current) {
      clearTimeout(dialWindowTimerRef.current);
      dialWindowTimerRef.current = null;
    }
    preDialTimerRef.current = setTimeout(() => {
      // 다이얼 표시 및 기본값 설정
      if (questionIndex === 0 && answersRef.current.awakeHours == null) {
        setDialValue(16);
      }
      if (questionIndex === 1 && answersRef.current.workHours == null) {
        setDialValue(8);
      }
      setShowDial(true);
      // 상호작용 창
      dialWindowTimerRef.current = setTimeout(() => {
        if (!dialLockedRef.current) {
          confirmDialSelection();
        }
      }, INTERACTION_WINDOW_MS);
    }, 3000);

    return () => {
      if (preDialTimerRef.current) {
        clearTimeout(preDialTimerRef.current);
        preDialTimerRef.current = null;
      }
      if (dialWindowTimerRef.current) {
        clearTimeout(dialWindowTimerRef.current);
        dialWindowTimerRef.current = null;
      }
    };
  }, [hasTransitioned, questionIndex]);

  // 다이얼 드로잉
  useEffect(() => {
    if (!showDial) return;
    const canvas = dialCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const size = Math.min(window.innerWidth, window.innerHeight) * 0.45;
    const pixel = Math.floor(size * dpr);
    canvas.width = pixel;
    canvas.height = pixel;
    canvas.style.width = `${Math.floor(size)}px`;
    canvas.style.height = `${Math.floor(size)}px`;

    const cx = pixel / 2;
    const cy = pixel / 2;
    const radius = pixel * 0.36;
    ctx.clearRect(0, 0, pixel, pixel);

    // 배경 트랙
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = Math.max(8 * dpr, 8);
    ctx.stroke();

    // 진행도
    const ratio = (dialValue - DIAL_MIN) / (DIAL_MAX - DIAL_MIN);
    const start = -Math.PI / 2;
    const end = start + ratio * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, start, end, false);
    ctx.strokeStyle = "rgba(255,255,255,0.95)";
    ctx.lineCap = "round";
    ctx.lineWidth = Math.max(10 * dpr, 10);
    ctx.stroke();

    // 눈금
    ctx.save();
    ctx.translate(cx, cy);
    const ticks = 24;
    for (let i = 0; i < ticks; i++) {
      const a = (i / ticks) * Math.PI * 2 + start;
      const inner = radius - 14 * dpr;
      const outer = radius + 6 * dpr;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
      ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
      ctx.strokeStyle = i % 6 === 0 ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.25)";
      ctx.lineWidth = i % 6 === 0 ? 2 * dpr : 1 * dpr;
      ctx.stroke();
    }
    ctx.restore();
  }, [showDial, dialValue]);

  // 카메라 제스처(원 주변 움직임 각도 변화)로 다이얼 조절
  useEffect(() => {
    if (!showDial || !isCameraOn) return;
    const video = videoRef.current;
    if (!video) return;
    const off = document.createElement("canvas");
    const ow = 160;
    const oh = 120;
    off.width = ow;
    off.height = oh;
    const octx = off.getContext("2d");
    let prev = null;

    function step() {
      if (video.readyState >= 2) {
        octx.drawImage(video, 0, 0, ow, oh);
        const cur = octx.getImageData(0, 0, ow, oh);
        if (prev) {
          const d = cur.data;
          const p = prev.data;
          const cx = ow / 2;
          const cy = oh / 2;
          const minR = Math.min(cx, cy) * 0.45;
          const maxR = Math.min(cx, cy) * 0.95;
          let sum = 0;
          let sx = 0;
          let sy = 0;
          for (let y = 0; y < oh; y++) {
            for (let x = 0; x < ow; x++) {
              const i = (y * ow + x) * 4;
              const dr = d[i] - p[i];
              const dg = d[i + 1] - p[i + 1];
              const db = d[i + 2] - p[i + 2];
              const diff = Math.abs(dr) + Math.abs(dg) + Math.abs(db);
              if (diff > 55) {
                const dx = x - cx;
                const dy = y - cy;
                const r = Math.hypot(dx, dy);
                if (r > minR && r < maxR) {
                  sum += diff;
                  sx += x * diff;
                  sy += y * diff;
                }
              }
            }
          }
          // 중심(활동 중심) 갱신
          if (sum > 18000) {
            const mx = sx / sum;
            const my = sy / sum;
            const angle = Math.atan2(my - cy, mx - cx); // -pi..pi
            lastCentroidRef.current = { x: mx, y: my };
            if (prevMotionAngleRef.current != null) {
              let delta = angle - prevMotionAngleRef.current;
              if (delta > Math.PI) delta -= Math.PI * 2;
              if (delta < -Math.PI) delta += Math.PI * 2;
              const hoursDelta = (delta / (Math.PI * 2)) * (DIAL_MAX - DIAL_MIN);
              if (Math.abs(hoursDelta) > 0.01) {
                setDialValue((v) =>
                  Math.max(DIAL_MIN, Math.min(DIAL_MAX, v + hoursDelta * 1.4))
                );
              }
            }
            prevMotionAngleRef.current = angle;
            // 주먹(빠른 움직임 뒤 정지) 제스처의 "고점" 기록
            lastHighMotionAtRef.current = performance.now();
          } else {
            prevMotionAngleRef.current = null;
          }

          // 주먹 제스처 확인: 최근 고점 이후 짧은 시간 안에 저활동으로 떨어짐
          const now = performance.now();
          const HIGH_MS = 900;
          const LOW_SUM = 4500;
          const cooldownMs = 1200;
          if (
            lastHighMotionAtRef.current &&
            now - lastHighMotionAtRef.current < HIGH_MS &&
            sum < LOW_SUM &&
            now > confirmCooldownUntilRef.current
          ) {
            // 활동 중심이 링 영역 안인지 확인
            const c = lastCentroidRef.current;
            if (c.x != null && c.y != null) {
              const r = Math.hypot(c.x - cx, c.y - cy);
              if (r > minR && r < maxR) {
                confirmCooldownUntilRef.current = now + cooldownMs;
                lastHighMotionAtRef.current = null;
                // 선택 확정
                if (ALLOW_GESTURE_INSTANT_CONFIRM) {
                  confirmDialSelection();
                }
              }
            }
          }

          // 대체 방법: 중앙 정지(손바닥) 900ms 유지 시 확정
          const CENTER_R = Math.min(cx, cy) * 0.28;
          const CENTER_LOW_SUM = 3500;
          const c = lastCentroidRef.current;
          if (c.x != null && c.y != null) {
            const rc = Math.hypot(c.x - cx, c.y - cy);
            if (rc <= CENTER_R && sum < CENTER_LOW_SUM) {
              if (dwellStartRef.current == null) {
                dwellStartRef.current = now;
              }
              if (
                now - dwellStartRef.current > 900 &&
                now > confirmCooldownUntilRef.current
              ) {
                confirmCooldownUntilRef.current = now + 1000;
                dwellStartRef.current = null;
                if (ALLOW_GESTURE_INSTANT_CONFIRM) {
                  confirmDialSelection();
                }
              }
            } else {
              dwellStartRef.current = null;
            }
          } else {
            dwellStartRef.current = null;
          }
        }
        prev = cur;
      }
      dialAnimRef.current = requestAnimationFrame(step);
    }
    step();
    return () => {
      if (dialAnimRef.current) cancelAnimationFrame(dialAnimRef.current);
      prev = null;
      prevMotionAngleRef.current = null;
    };
  }, [showDial, isCameraOn]);

  function angleToValue(angle) {
    // angle: -PI..PI, 0 at +X. We want 0 at top (-PI/2)
    const a = angle - (-Math.PI / 2);
    let norm = a % (Math.PI * 2);
    if (norm < 0) norm += Math.PI * 2;
    return DIAL_MIN + (norm / (Math.PI * 2)) * (DIAL_MAX - DIAL_MIN);
  }

  function onDialPointerDown(e) {
    isDialDraggingRef.current = true;
    onDialPointerMove(e);
  }
  function onDialPointerMove(e) {
    if (!isDialDraggingRef.current) return;
    const canvas = dialCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x =
      (e.clientX ?? (e.touches && e.touches[0] && e.touches[0].clientX)) -
      rect.left;
    const y =
      (e.clientY ?? (e.touches && e.touches[0] && e.touches[0].clientY)) -
      rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const angle = Math.atan2(y - cy, x - cx);
    setDialValue(Math.max(DIAL_MIN, Math.min(DIAL_MAX, angleToValue(angle))));
  }
  function onDialPointerUp() {
    isDialDraggingRef.current = false;
  }

  function confirmDialSelection() {
    dialLockedRef.current = true;
    const rounded = Math.round(dialValue);
    if (questionIndex === 0) {
      answersRef.current.awakeHours = rounded;
      setShowDial(false);
      setQuestionIndex(1);
      setModalText(QUESTIONS[1]);
      setDialValue(8);
    } else {
      answersRef.current.workHours = rounded;
      setShowDial(false);
      // 필요 시 후속 연출(전환 효과/결과 표시) 추가 지점
    }
  }

  // 질문 모달 텍스트 애니메이션
  // 1) 질문이 4초간 유지
  // 2) 질문이 타이핑 사라지듯이 삭제
  // 3) "AI가 생각중입니다..." 가 타이핑되듯이 나타남
  // 4) 이 텍스트가 3초 유지된 뒤 다시 타이핑되듯이 사라지고, 3)~4) 루프
  useEffect(() => {
    if (!hasTransitioned) {
      setQuestionIndex(0);
      setModalText(QUESTIONS[0]);
      if (modalTimerRef.current) {
        clearTimeout(modalTimerRef.current);
        modalTimerRef.current = null;
      }
      return;
    }

    const baseQuestion =
      QUESTIONS[Math.min(questionIndex, QUESTIONS.length - 1)];
    setModalText(baseQuestion);

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
      let index = baseQuestion.length;

      const deleteStep = () => {
        index -= 1;
        setModalText(baseQuestion.slice(0, Math.max(index, 0)));

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
  }, [hasTransitioned, questionIndex]);

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

  // THINKING 텍스트 표시 여부로 생각중 페이즈 판단
  useEffect(() => {
    const active =
      hasTransitioned &&
      typeof modalText === "string" &&
      modalText.startsWith(THINKING_TEXT.slice(0, 2)); // 시작 글자 매칭으로 애니메이션 중에도 true
    setIsThinkingPhase(active);
  }, [modalText, hasTransitioned]);

  // 생각중 글로우 오버레이
  useEffect(() => {
    if (!isThinkingPhase || !isCameraOn) {
      if (thinkingAnimRef.current) cancelAnimationFrame(thinkingAnimRef.current);
      prevThinkingFrameRef.current = null;
      const c = thinkingCanvasRef.current;
      if (c) {
        const ctx = c.getContext("2d");
        ctx && ctx.clearRect(0, 0, c.width, c.height);
      }
      return;
    }
    const video = videoRef.current;
    const canvas = thinkingCanvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext("2d");
    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    const off = document.createElement("canvas");
    const ow = 180;
    const oh = 120;
    off.width = ow;
    off.height = oh;
    const octx = off.getContext("2d");

    function step() {
      if (video.readyState >= 2) {
        octx.drawImage(video, 0, 0, ow, oh);
        const cur = octx.getImageData(0, 0, ow, oh);
        const id = ctx.createImageData(ow, oh);
        const dest = id.data;
        if (prevThinkingFrameRef.current) {
          const prev = prevThinkingFrameRef.current;
          const d = cur.data;
          const p = prev.data;
          for (let i = 0; i < d.length; i += 4) {
            const dr = d[i] - p[i];
            const dg = d[i + 1] - p[i + 1];
            const db = d[i + 2] - p[i + 2];
            const diff = Math.abs(dr) + Math.abs(dg) + Math.abs(db);
            const bright = (d[i] + d[i + 1] + d[i + 2]) / 3;
            const a = diff > 50 || bright > 170 ? 255 : 0; // 움직임 또는 밝음
            dest[i] = 255;
            dest[i + 1] = 255;
            dest[i + 2] = 255;
            dest[i + 3] = a;
          }
        }
        prevThinkingFrameRef.current = cur;

        // 화면에 스케일 업 + 블러
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.globalAlpha = 0.75;
        ctx.imageSmoothingEnabled = false;
        const scale = Math.min(
          canvas.width / ow,
          canvas.height / oh
        );
        const w = ow * scale;
        const h = oh * scale;
        const x = (canvas.width - w) / 2;
        const y = (canvas.height - h) / 2;
        // PutImageData then drawImage for blur pass
        const tmp = document.createElement("canvas");
        tmp.width = ow;
        tmp.height = oh;
        tmp.getContext("2d").putImageData(id, 0, 0);
        ctx.filter = "blur(24px) brightness(1.6)";
        ctx.drawImage(tmp, x, y, w, h);
        ctx.restore();
      }
      thinkingAnimRef.current = requestAnimationFrame(step);
    }
    step();
    return () => {
      if (thinkingAnimRef.current) cancelAnimationFrame(thinkingAnimRef.current);
      window.removeEventListener("resize", resize);
      prevThinkingFrameRef.current = null;
    };
  }, [isThinkingPhase, isCameraOn]);

  // 그리드 전환 효과 캔버스 애니메이션
  useEffect(() => {
    if (!showTransitionEffect) {
      transitionActiveRef.current = false;
      if (transitionAnimationRef.current) {
        cancelAnimationFrame(transitionAnimationRef.current);
        transitionAnimationRef.current = null;
      }
      return;
    }

    const canvas = transitionCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width;
    let height;
    let gridSize;

    function ease(t) {
      return t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function init() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      gridSize = (width / GRID_CONFIG.gridCount) / 2;
    }

    function drawCell(x, y, size, progress) {
      const half = size / 2;

      ctx.beginPath();
      ctx.rect(x - half, y - half, size, size);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = GRID_CONFIG.lineWidth;
      ctx.stroke();

      if (progress > 0.01) {
        ctx.beginPath();
        ctx.moveTo(x, y - half);
        ctx.lineTo(x, y + half);
        ctx.moveTo(x - half, y);
        ctx.lineTo(x + half, y);
        ctx.strokeStyle = `rgba(255, 255, 255, ${progress})`;
        ctx.stroke();
      }
    }

    let time = 0;
    const startTime = performance.now();
    transitionActiveRef.current = true;

    function animate() {
      if (!transitionActiveRef.current) {
        return;
      }

      const elapsed = performance.now() - startTime;
      if (elapsed > TRANSITION_EFFECT_DURATION_MS) {
        transitionActiveRef.current = false;
        setShowTransitionEffect(false); // 한 번 보여준 뒤 다시 웹캠 화면으로 복귀
        setQuestionIndex(1); // 두 번째 질문으로 전환
        return;
      }

      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;

      const cols = GRID_CONFIG.gridCount + 4;
      const rows = Math.ceil(height / gridSize) + 4;

      for (let i = -cols / 2; i <= cols / 2; i++) {
        for (let j = -rows / 2; j <= rows / 2; j++) {
          const x0 = i * gridSize;
          const y0 = j * gridSize;
          const dist = Math.sqrt(i * i + j * j);

          let t = (time - dist * GRID_CONFIG.phaseStrength) % 1;
          if (t < 0) t += 1;

          const easedT = ease(t);
          const scale = 1 / Math.pow(2, easedT);

          const x = cx + x0 * scale;
          const y = cy + y0 * scale;
          const size = gridSize * scale;

          if (
            x > -size &&
            x < width + size &&
            y > -size &&
            y < height + size
          ) {
            drawCell(x, y, size, easedT);
          }
        }
      }

      time += GRID_CONFIG.speed;
      transitionAnimationRef.current = requestAnimationFrame(animate);
    }

    init();
    window.addEventListener("resize", init);
    animate();

    return () => {
      transitionActiveRef.current = false;
      if (transitionAnimationRef.current) {
        cancelAnimationFrame(transitionAnimationRef.current);
        transitionAnimationRef.current = null;
      }
      window.removeEventListener("resize", init);
    };
  }, [showTransitionEffect]);

  async function toggleCamera() {
    if (!isCameraOn) {
      try {
        setCameraError("");
        if (
          !navigator ||
          !navigator.mediaDevices ||
          !navigator.mediaDevices.getUserMedia
        ) {
          setCameraError(
            "이 브라우저에서 카메라 API를 사용할 수 없습니다. Chrome/Edge 사용 또는 localhost/HTTPS에서 열어주세요."
          );
          return;
        }
        if (typeof window !== "undefined" && !window.isSecureContext) {
          setCameraError(
            "보안 컨텍스트(HTTPS 또는 localhost)에서만 카메라를 사용할 수 있습니다."
          );
          return;
        }

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
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
        let reason = "카메라에 접근할 수 없습니다.";
        const name = err && err.name ? String(err.name) : "";
        if (name === "NotAllowedError" || name === "SecurityError") {
          reason =
            "카메라 권한이 거부되었습니다. 주소창 자물쇠 → 사이트 설정에서 카메라를 허용하세요.";
        } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
          reason = "사용 가능한 카메라 장치를 찾지 못했습니다.";
        } else if (name === "NotReadableError") {
          reason = "다른 앱이 카메라를 사용 중이거나 하드웨어 오류가 발생했습니다.";
        } else if (name === "OverconstrainedError") {
          reason = "요청한 카메라 조건을 만족하는 장치를 찾지 못했습니다.";
        }
        setCameraError(reason);
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

  async function handleStartClick() {
    setHasStarted(true);
    await toggleCamera();
  }

  async function handleTriggerClick() {
    try {
      setCameraError("");
      if (
        !navigator ||
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        setCameraError(
          "이 브라우저에서 카메라 API를 사용할 수 없습니다. Chrome/Edge 사용 또는 localhost/HTTPS에서 열어주세요."
        );
        return;
      }
      if (typeof window !== "undefined" && !window.isSecureContext) {
        setCameraError(
          "보안 컨텍스트(HTTPS 또는 localhost)에서만 카메라를 사용할 수 있습니다."
        );
        return;
      }
      const tempStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      // 권한만 확인하고 즉시 해제
      tempStream.getTracks().forEach((t) => t.stop());
    } catch (err) {
      let reason = "카메라에 접근할 수 없습니다.";
      const name = err && err.name ? String(err.name) : "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        reason =
          "카메라 권한이 거부되었습니다. 주소창 자물쇠 → 사이트 설정에서 카메라를 허용하세요.";
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        reason = "사용 가능한 카메라 장치를 찾지 못했습니다.";
      } else if (name === "NotReadableError") {
        reason = "다른 앱이 카메라를 사용 중이거나 하드웨어 오류가 발생했습니다.";
      } else if (name === "OverconstrainedError") {
        reason = "요청한 카메라 조건을 만족하는 장치를 찾지 못했습니다.";
      }
      setCameraError(reason);
    }
  }

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black">
      <video
        className="h-full w-full object-cover"
        src="/display.mp4"
        autoPlay
        loop
        muted
        playsInline
      />

      {!hasStarted && (
        <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={handleStartClick}
              className="rounded-full bg-black/35 px-9 py-3 text-white shadow-2xl shadow-black/40 backdrop-blur-md backdrop-saturate-150 transition-colors hover:bg-black/45 focus:outline-none focus:ring-2 focus:ring-white/30"
            >
              시작
            </button>
            <button
              onClick={handleTriggerClick}
              className="text-xs text-white/75 hover:text-white underline-offset-4 hover:underline focus:outline-none"
            >
              Start trigger
            </button>
          </div>
        </div>
      )}

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

      {/* 질문 다이얼 오버레이 */}
      {showDial && (
        <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-black/55 backdrop-blur-sm">
          <div className="relative flex flex-col items-center gap-4">
            <canvas
              ref={dialCanvasRef}
              className="touch-none select-none"
              onMouseDown={onDialPointerDown}
              onMouseMove={onDialPointerMove}
              onMouseUp={onDialPointerUp}
              onMouseLeave={onDialPointerUp}
              onTouchStart={onDialPointerDown}
              onTouchMove={onDialPointerMove}
              onTouchEnd={onDialPointerUp}
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="text-white text-3xl font-light tracking-wide">
                {Math.round(dialValue)}h
              </div>
            </div>
            <div className="text-[11px] text-white/80">4초 후 자동선택됩니다</div>
          </div>
        </div>
      )}

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

      {/* 그리드 전환 효과 레이어 */}
      <div
        className={`pointer-events-none absolute inset-0 z-30 bg-black transition-opacity duration-1000 ${
          showTransitionEffect ? "opacity-100" : "opacity-0"
        }`}
      >
        <canvas ref={transitionCanvasRef} className="h-full w-full" />
      </div>

      {/* 생각중 글로우 레이어 */}
      {isThinkingPhase && (
        <canvas
          ref={thinkingCanvasRef}
          className="pointer-events-none absolute inset-0 z-20"
        />
      )}

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


