
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Image, Video, Music, FolderOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { extractVideoEmbed, VideoEmbed } from "@/lib/videoEmbed";
import { AudioPlayer } from "@/components/feed/AudioPlayer";
import { VideoPreview } from "@/components/feed/VideoPreview";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a', '.wma', '.webm'];
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];

type FileType = "photos" | "videos" | "music";

interface MediaItem {
  id: string;
  media_url: string | null;
  content: string | null;
  created_at: string | null;
  videoEmbed?: VideoEmbed | null;
}

function getFileType(item: MediaItem): FileType | null {
  if (item.videoEmbed && item.videoEmbed.platform !== 'link') return "videos";
  if (!item.media_url) return null;
  const lower = item.media_url.toLowerCase();
  if (AUDIO_EXTENSIONS.some(ext => lower.includes(ext))) return "music";
  if (VIDEO_EXTENSIONS.some(ext => lower.includes(ext))) return "videos";
  if (IMAGE_EXTENSIONS.some(ext => lower.includes(ext))) return "photos";
  if (lower.includes("/posts/") && !AUDIO_EXTENSIONS.some(ext => lower.includes(ext)) && !VIDEO_EXTENSIONS.some(ext => lower.includes(ext))) return "photos";
  return null;
}

interface RightSidebarProps {
  userId: string;
  className?: string;
}

export function RightSidebar({ userId, className }: RightSidebarProps) {
  const navigate = useNavigate();
  const [files, setFiles] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchFiles = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("posts")
        .select("id, media_url, content, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (!error && data) {
        const processed: MediaItem[] = data
          .map(p => {
            const videoEmbed = p.content ? extractVideoEmbed(p.content) : null;
            const hasVideoEmbed = videoEmbed && videoEmbed.platform !== 'link';
            return { ...p, videoEmbed: hasVideoEmbed ? videoEmbed : null };
          })
          .filter(p => p.media_url || p.videoEmbed);
        setFiles(processed);
      }
      setLoading(false);
    };

    fetchFiles();
  }, [userId]);

  const photos = files.filter(f => getFileType(f) === "photos");
  const videos = files.filter(f => getFileType(f) === "videos");
  const music = files.filter(f => getFileType(f) === "music");

  if (loading) {
    return (
      <aside className={cn("space-y-4", className)}>
        <div className="rounded-lg border bg-card p-4">
          <Skeleton className="h-5 w-24 mb-3" />
          <div className="grid grid-cols-3 gap-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded" />
            ))}
          </div>
        </div>
      </aside>
    );
  }

  const hasAnyMedia = photos.length > 0 || videos.length > 0 || music.length > 0;

  if (!hasAnyMedia) return null;

  return (
    <aside className={cn("space-y-4", className)}>
      {/* Фото */}
      {photos.length > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Image className="h-4 w-4 text-primary" />
              Фото
            </h3>
            <button
              onClick={() => navigate(`/my-files/photos`)}
              className="text-xs text-primary hover:underline"
            >
              Переглянути всі ({photos.length})
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1 rounded-lg overflow-hidden">
            {photos.slice(0, 9).map(file => (
              <div
                key={file.id}
                className="aspect-square cursor-pointer overflow-hidden bg-muted group"
                onClick={() => navigate(`/post/${file.id}`)}
              >
                <img
                  src={file.media_url!}
                  alt=""
                  className="w-full h-full object-cover transition-transform group-hover:scale-110"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Відео */}
      {videos.length > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Video className="h-4 w-4 text-primary" />
              Відео
            </h3>
            <button
              onClick={() => navigate(`/my-files/videos`)}
              className="text-xs text-primary hover:underline"
            >
              Переглянути всі ({videos.length})
            </button>
          </div>
          <div className="space-y-2">
            {videos.slice(0, 3).map(file => (
              <div
                key={file.id}
                className="rounded-lg overflow-hidden border cursor-pointer"
                onClick={() => navigate(`/post/${file.id}`)}
              >
                {file.videoEmbed && file.videoEmbed.platform !== 'link' ? (
                  <div className="pointer-events-none">
                    <VideoPreview embed={file.videoEmbed} />
                  </div>
                ) : file.media_url ? (
                  <video
                    src={file.media_url}
                    className="w-full aspect-video object-cover"
                    preload="metadata"
                    muted
                  />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Музика */}
      {music.length > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Music className="h-4 w-4 text-primary" />
              Музика
            </h3>
            <button
              onClick={() => navigate(`/my-files/music`)}
              className="text-xs text-primary hover:underline"
            >
              Переглянути всі ({music.length})
            </button>
          </div>
          <div className="space-y-2">
            {music.slice(0, 3).map(file => (
              <div key={file.id}>
                <AudioPlayer src={file.media_url!} title={file.content || undefined} />
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
