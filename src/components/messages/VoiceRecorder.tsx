import { useEffect, useRef, useState, useCallback } from "react";
import { Mic, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const MAX_DURATION_SEC = 180; // 3 хвилини
const CANCEL_SWIPE_PX = 80;

interface VoiceRecorderProps {
  /** Викликається при відпусканні якщо запис валідний (>= 1 сек і не скасовано) */
  onRecorded: (file: File, durationSec: number) => void;
  disabled?: boolean;
}

/**
 * Push-to-talk кнопка як у Viber.
 * - Затиснути (mouse/touch) — починається запис
 * - Відпустити — відправити
 * - Свайп вліво на CANCEL_SWIPE_PX — скасувати
 * - Авто-стоп через MAX_DURATION_SEC
 */
export function VoiceRecorder({ onRecorded, disabled }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [slideX, setSlideX] = useState(0); // зсув для індикатора cancel

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);
  const startXRef = useRef<number>(0);
  const cancelledRef = useRef<boolean>(false);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    setIsRecording(false);
    setElapsed(0);
    setSlideX(0);
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const pickMimeType = (): string => {
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/mp4",
    ];
    for (const t of candidates) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) return t;
    }
    return "";
  };

  const startRecording = useCallback(async (clientX: number) => {
    if (disabled || isRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      cancelledRef.current = false;
      startXRef.current = clientX;

      const mimeType = pickMimeType();
      const mr = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
        const blobType = mr.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: blobType });
        cleanup();

        if (cancelledRef.current) return;
        if (duration < 1 || blob.size < 500) {
          toast.info("Запис надто короткий — утримуйте кнопку, щоб записати");
          return;
        }
        const ext = blobType.includes("mp4") ? "m4a" : blobType.includes("ogg") ? "ogg" : "webm";
        const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: blobType });
        onRecorded(file, duration);
      };

      startTimeRef.current = Date.now();
      mr.start();
      setIsRecording(true);
      setElapsed(0);

      timerRef.current = window.setInterval(() => {
        const sec = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setElapsed(sec);
        if (sec >= MAX_DURATION_SEC) {
          // авто-стоп
          try { mediaRecorderRef.current?.stop(); } catch {}
        }
      }, 200);
    } catch (err) {
      console.error("[VoiceRecorder] Помилка доступу до мікрофона:", err);
      toast.error("Немає доступу до мікрофона. Дозвольте мікрофон у налаштуваннях браузера.");
      cleanup();
    }
  }, [disabled, isRecording, cleanup, onRecorded]);

  const stopRecording = useCallback((cancel: boolean) => {
    if (!isRecording || !mediaRecorderRef.current) return;
    cancelledRef.current = cancel;
    try {
      mediaRecorderRef.current.stop();
    } catch {
      cleanup();
    }
  }, [isRecording, cleanup]);

  // Pointer handlers (працюють і для миші, і для тач)
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    startRecording(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isRecording) return;
    const dx = Math.min(0, e.clientX - startXRef.current);
    setSlideX(dx);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isRecording) return;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    const dx = Math.min(0, e.clientX - startXRef.current);
    const cancel = Math.abs(dx) >= CANCEL_SWIPE_PX;
    stopRecording(cancel);
  };

  const handlePointerCancel = (e: React.PointerEvent) => {
    if (!isRecording) return;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    stopRecording(true);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(1, "0");
    const r = (s % 60).toString().padStart(2, "0");
    return `${m}:${r}`;
  };

  const willCancel = Math.abs(slideX) >= CANCEL_SWIPE_PX;

  return (
    <>
      {/* Overlay під час запису — показує таймер і підказку про скасування */}
      {isRecording && (
        <div className="absolute inset-x-0 -top-12 z-10 flex items-center justify-between px-4 py-2 mx-2 rounded-full bg-background/95 border shadow-lg">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
            </span>
            <span className="text-sm font-mono tabular-nums">{formatTime(elapsed)}</span>
          </div>
          <div
            className={cn(
              "flex items-center gap-1 text-xs transition-colors",
              willCancel ? "text-destructive font-semibold" : "text-muted-foreground"
            )}
            style={{ transform: `translateX(${slideX}px)` }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>{willCancel ? "Відпустіть для скасування" : "← Свайп для скасування"}</span>
          </div>
        </div>
      )}

      <button
        type="button"
        disabled={disabled}
        aria-label="Записати голосове повідомлення"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onContextMenu={(e) => e.preventDefault()}
        className={cn(
          "h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all select-none touch-none",
          isRecording
            ? willCancel
              ? "bg-destructive text-destructive-foreground scale-110"
              : "bg-gradient-purple text-white scale-125 shadow-lg"
            : "bg-muted hover:bg-muted/80 text-foreground",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <Mic className="h-5 w-5" />
      </button>
    </>
  );
}
