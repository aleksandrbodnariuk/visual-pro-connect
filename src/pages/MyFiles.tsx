
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

const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a', '.wma', '.webm'];
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];

type FileType = "photos" | "videos" | "music";

function getFileType(url: string): FileType | null {
  const lower = url.toLowerCase();
  if (AUDIO_EXTENSIONS.some(ext => lower.includes(ext))) return "music";
  if (VIDEO_EXTENSIONS.some(ext => lower.includes(ext))) return "videos";
  if (IMAGE_EXTENSIONS.some(ext => lower.includes(ext))) return "photos";
  // Default images (supabase urls without clear extension)
  if (lower.includes("/posts/") && !AUDIO_EXTENSIONS.some(ext => lower.includes(ext)) && !VIDEO_EXTENSIONS.some(ext => lower.includes(ext))) return "photos";
  return null;
}

const tabs: { id: FileType; label: string; icon: React.ElementType }[] = [
  { id: "photos", label: "Фото", icon: Image },
  { id: "videos", label: "Відео", icon: Video },
  { id: "music", label: "Музика", icon: Music },
];

export default function MyFiles() {
  const { type } = useParams<{ type?: string }>();
  const navigate = useNavigate();
  const { getCurrentUser } = useAuthState();
  const currentUser = getCurrentUser();
  const [files, setFiles] = useState<{ id: string; media_url: string; content: string | null; created_at: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  const activeTab: FileType = (type as FileType) || "photos";

  useEffect(() => {
    if (!currentUser?.id) return;

    const fetchFiles = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("posts")
        .select("id, media_url, content, created_at")
        .eq("user_id", currentUser.id)
        .not("media_url", "is", null)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setFiles(data.filter(p => p.media_url));
      }
      setLoading(false);
    };

    fetchFiles();
  }, [currentUser?.id]);

  const filtered = files.filter(f => getFileType(f.media_url!) === activeTab);

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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-3 sm:px-4 md:px-6 pt-20 3xl:pt-24">
        <div className="flex gap-6">
          <Sidebar className="hidden md:block" />
          
          <main className="flex-1 md:ml-[calc(25%+0.5rem)] lg:ml-[calc(25%+0.5rem)] max-w-2xl">
            <div className="mb-6">
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <FolderOpen className="h-6 w-6 text-primary" />
                Мої файли
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Всі ваші завантажені медіафайли з публікацій
              </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
              {tabs.map(tab => (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => navigate(`/my-files/${tab.id}`)}
                  className="gap-2"
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                  <span className="text-xs opacity-70">
                    ({files.filter(f => getFileType(f.media_url!) === tab.id).length})
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
                    <video
                      src={file.media_url!}
                      className="w-full aspect-video object-cover"
                      preload="metadata"
                      muted
                    />
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
    </div>
  );
}
