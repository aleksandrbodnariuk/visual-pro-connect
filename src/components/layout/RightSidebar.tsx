
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Image, Video, Music, FolderOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { extractVideoEmbed, VideoEmbed } from "@/lib/videoEmbed";
import { AudioPlayer } from "@/components/feed/AudioPlayer";
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

function getVideoThumbnail(item: MediaItem): string | null {
  if (item.videoEmbed?.thumbnailUrl) return item.videoEmbed.thumbnailUrl;
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
      <div className={cn("space-y-3", className)}>
        <h2 className="font-bold text-sm flex items-center gap-2 px-1">
          <FolderOpen className="h-4 w-4 text-primary" />
          Мої файли
        </h2>
        <div className="rounded-lg border bg-card p-3">
          <Skeleton className="h-4 w-16 mb-2" />
          <div className="grid grid-cols-3 gap-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const hasAnyMedia = photos.length > 0 || videos.length > 0 || music.length > 0;

  if (!hasAnyMedia) return null;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Заголовок */}
      <h2 className="font-bold text-sm flex items-center gap-2 px-1">
        <FolderOpen className="h-4 w-4 text-primary" />
        Мої файли
      </h2>

      {/* Фото */}
      {photos.length > 0 && (
        <div className="rounded-lg border bg-card p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold flex items-center gap-1.5">
              <Image className="h-3.5 w-3.5 text-primary" />
              Фото
            </h3>
            <button
              onClick={() => navigate(`/my-files/photos`)}
              className="text-[10px] text-primary hover:underline"
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

      {/* Відео — компактна сітка 2 колонки */}
      {videos.length > 0 && (
        <div className="rounded-lg border bg-card p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold flex items-center gap-1.5">
              <Video className="h-3.5 w-3.5 text-primary" />
              Відео
            </h3>
            <button
              onClick={() => navigate(`/my-files/videos`)}
              className="text-[10px] text-primary hover:underline"
            >
              Переглянути всі ({videos.length})
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1 rounded-lg overflow-hidden">
            {videos.slice(0, 4).map(file => (
              <div
                key={file.id}
                className="aspect-video cursor-pointer overflow-hidden bg-muted group relative"
                onClick={() => navigate(`/post/${file.id}`)}
              >
                {/* Thumbnail */}
                {file.videoEmbed?.thumbnailUrl ? (
                  <img
                    src={file.videoEmbed.thumbnailUrl}
                    alt=""
                    className="w-full h-full object-cover transition-transform group-hover:scale-110"
                    loading="lazy"
                  />
                ) : file.media_url && VIDEO_EXTENSIONS.some(ext => file.media_url!.toLowerCase().includes(ext)) ? (
                  <video
                    src={file.media_url}
                    className="w-full h-full object-cover"
                    preload="metadata"
                    muted
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <Video className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                {/* Play icon overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center">
                    <div className="w-0 h-0 border-t-[5px] border-t-transparent border-l-[8px] border-l-white border-b-[5px] border-b-transparent ml-0.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Музика */}
      {music.length > 0 && (
        <div className="rounded-lg border bg-card p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold flex items-center gap-1.5">
              <Music className="h-3.5 w-3.5 text-primary" />
              Музика
            </h3>
            <button
              onClick={() => navigate(`/my-files/music`)}
              className="text-[10px] text-primary hover:underline"
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
    </div>
  );
}
