
import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, Music, Headphones } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface AudioPlayerProps {
  src: string;
  title?: string;
  /** When set, plays are counted for this post */
  postId?: string;
}

export function AudioPlayer({ src, title, postId }: AudioPlayerProps) {
  const { user } = useAuth();
  const [plays, setPlays] = useState<number | null>(null);
  const countedRef = useRef(false);

  useEffect(() => {
    if (!postId) return;
    supabase.from("posts").select("play_count").eq("id", postId).maybeSingle()
      .then(({ data }) => setPlays((data as any)?.play_count ?? 0));
  }, [postId]);

  const countPlay = () => {
    if (!postId || !user?.id || countedRef.current) return;
    countedRef.current = true;
    setPlays((p) => (p ?? 0) + 1);
    supabase.from("post_plays" as any).insert({ post_id: postId, user_id: user.id } as any).then(({ error }) => {
      if (error) { countedRef.current = false; setPlays((p) => Math.max(0, (p ?? 1) - 1)); }
    });
  };

  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => setDuration(audio.duration);
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => setIsPlaying(false));
    }
  };

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Extract filename from URL as fallback title
  const displayTitle = title || decodeURIComponent(src.split("/").pop()?.replace(/\.[^.]+$/, "") || "Аудіо");

  return (
    <div className="rounded-xl bg-gradient-to-r from-primary/10 via-accent/10 to-primary/5 border p-4">
      <audio ref={audioRef} src={src} preload="none" onPause={() => setIsPlaying(false)} onPlay={() => { setIsPlaying(true); countPlay(); }} />
      
      <div className="flex items-center gap-3">
        {/* Album art placeholder */}
        <div className="h-12 w-12 shrink-0 rounded-lg bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center">
          <Music className="h-6 w-6 text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          {/* Title */}
          <div className="flex items-center gap-2 mb-2">
            <p className="text-sm font-medium truncate flex-1">{displayTitle}</p>
            {postId && plays !== null && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0" title="Прослуховувань">
                <Headphones className="h-3.5 w-3.5" /> {plays}
              </span>
            )}
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-8 text-right tabular-nums">
              {formatTime(currentTime)}
            </span>
            <Slider
              value={[currentTime]}
              min={0}
              max={duration || 1}
              step={0.1}
              onValueChange={handleSeek}
              className="flex-1"
            />
            <span className="text-[10px] text-muted-foreground w-8 tabular-nums">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={toggleMute}
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="default"
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={togglePlay}
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
