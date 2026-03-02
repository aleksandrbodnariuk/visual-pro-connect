
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useAuthState } from "@/hooks/auth/useAuthState";
import { Image, Video, Music, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AudioPlayer } from "@/components/feed/AudioPlayer";
import { Skeleton } from "@/components/ui/skeleton";
import { extractVideoEmbed, VideoEmbed } from "@/lib/videoEmbed";
import { VideoPreview } from "@/components/feed/VideoPreview";

const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a', '.wma', '.webm'];
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];

type FileType = "photos" | "videos" | "music";

interface FileItem {
  id: string;
  media_url: string | null;
  content: string | null;
  created_at: string | null;
  videoEmbed?: VideoEmbed | null;
}

function getFileType(item: FileItem): FileType | null {
  if (item.videoEmbed && item.videoEmbed.platform !== 'link') return "videos";
  if (!item.media_url) return null;
  const lower = item.media_url.toLowerCase();
  if (AUDIO_EXTENSIONS.some(ext => lower.includes(ext))) return "music";
  if (VIDEO_EXTENSIONS.some(ext => lower.includes(ext))) return "videos";
  if (IMAGE_EXTENSIONS.some(ext => lower.includes(ext))) return "photos";
  if (lower.includes("/posts/") && !AUDIO_EXTENSIONS.some(ext => lower.includes(ext)) && !VIDEO_EXTENSIONS.some(ext => lower.includes(ext))) return "photos";
  return null;
}

const tabs: { id: FileType; label: string; icon: React.ElementType }[] = [
  { id: "photos", label: "Фото", icon: Image },
  { id: "videos", label: "Відео", icon: Video },
  { id: "music", label: "Музика", icon: Music },
];

export default function MyFiles() {
  const { type, userId: routeUserId } = useParams<{ type?: string; userId?: string }>();
  const navigate = useNavigate();
  const { getCurrentUser } = useAuthState();
  const currentUser = getCurrentUser();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [ownerName, setOwnerName] = useState<string | null>(null);

  // Determine whose files to show
  const targetUserId = routeUserId || currentUser?.id;
  const isOwnFiles = !routeUserId || routeUserId === currentUser?.id;

  const activeTab: FileType = (type as FileType) || "photos";

  // Fetch owner name if viewing someone else's files
  useEffect(() => {
    if (!routeUserId || isOwnFiles) {
      setOwnerName(null);
      return;
    }
    supabase.rpc('get_safe_public_profiles_by_ids', { _ids: [routeUserId] })
      .then(({ data }) => {
        if (data?.[0]?.full_name) setOwnerName(data[0].full_name);
      });
  }, [routeUserId, isOwnFiles]);

  useEffect(() => {
    if (!targetUserId) return;

    const fetchFiles = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("posts")
        .select("id, media_url, content, created_at")
        .eq("user_id", targetUserId)
        .order("created_at", { ascending: false });

      if (!error && data) {
        const processed: FileItem[] = data
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
  }, [targetUserId]);

  const filtered = files.filter(f => getFileType(f) === activeTab);

  const buildTabUrl = (tabId: string) => {
    if (isOwnFiles) return `/my-files/${tabId}`;
    return `/files/${routeUserId}/${tabId}`;
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto pt-24 text-center text-muted-foreground">
          Будь ласка, увійдіть в систему
        </div>
      </div>
    );
  }

  const title = isOwnFiles ? "Мої файли" : `Файли ${ownerName || ''}`;
  const subtitle = isOwnFiles
    ? "Всі ваші завантажені медіафайли з публікацій"
    : `Медіафайли користувача ${ownerName || ''}`;

  return (
    <div className="h-screen overflow-hidden bg-background">
      <Navbar />
      <div className="container mx-auto px-2 sm:px-3 md:px-4 grid grid-cols-12 gap-0 h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] 3xl:h-[calc(100vh-5rem)]">
        {/* Left Sidebar */}
        <div className="hidden md:block md:col-span-3 h-full overflow-y-auto overscroll-contain scrollbar-hide py-4">
          <Sidebar />
        </div>

        {/* Main Content */}
        <main className="col-span-12 md:col-span-9 lg:col-span-6 h-full overflow-y-auto overscroll-contain py-4 px-2">
          <div className="mb-6">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FolderOpen className="h-6 w-6 text-primary" />
              {title}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            {tabs.map(tab => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "outline"}
                size="sm"
                onClick={() => navigate(buildTabUrl(tab.id))}
                className="gap-2"
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
                <span className="text-xs opacity-70">
                  ({files.filter(f => getFileType(f) === tab.id).length})
                </span>
              </Button>
            ))}
          </div>

          {/* Content */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>Немає файлів у цьому розділі</p>
              <p className="text-xs mt-1">Завантажуйте медіа через публікації</p>
            </div>
          ) : activeTab === "photos" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filtered.map(file => (
                <div
                  key={file.id}
                  className="group relative aspect-square rounded-lg overflow-hidden border bg-muted cursor-pointer"
                  onClick={() => navigate(`/post/${file.id}`)}
                >
                  <img
                    src={file.media_url!}
                    alt={file.content || "Фото"}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                </div>
              ))}
            </div>
          ) : activeTab === "videos" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filtered.map(file => (
                <div
                  key={file.id}
                  className="rounded-lg overflow-hidden border bg-muted cursor-pointer"
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
                  {file.content && (
                    <p className="p-2 text-sm truncate">{file.content}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(file => (
                <div key={file.id}>
                  <AudioPlayer src={file.media_url!} title={file.content || undefined} />
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
