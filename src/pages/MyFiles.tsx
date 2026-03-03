
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useAuthState } from "@/hooks/auth/useAuthState";
import { useAuth } from "@/context/AuthContext";
import {
  Image, Video, Music, FolderOpen, FolderPlus, Upload, Plus, ArrowLeft,
  Trash2, Edit2, Check, X, Link as LinkIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AudioPlayer } from "@/components/feed/AudioPlayer";
import { Skeleton } from "@/components/ui/skeleton";
import { extractVideoEmbed, VideoEmbed } from "@/lib/videoEmbed";
import { VideoPreview } from "@/components/feed/VideoPreview";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";

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
  source: 'post' | 'uploaded';
  folder_id?: string | null;
  file_type?: string;
}

interface UserFolder {
  id: string;
  name: string;
  created_at: string;
}

function getFileType(item: FileItem): FileType | null {
  if (item.source === 'uploaded') {
    if (item.file_type === 'photo') return 'photos';
    if (item.file_type === 'video') return 'videos';
    if (item.file_type === 'music') return 'music';
  }
  if (item.videoEmbed && item.videoEmbed.platform !== 'link') return "videos";
  if (!item.media_url) return null;
  const lower = item.media_url.toLowerCase();
  if (AUDIO_EXTENSIONS.some(ext => lower.includes(ext))) return "music";
  if (VIDEO_EXTENSIONS.some(ext => lower.includes(ext))) return "videos";
  if (IMAGE_EXTENSIONS.some(ext => lower.includes(ext))) return "photos";
  if (lower.includes("/posts/") && !AUDIO_EXTENSIONS.some(ext => lower.includes(ext)) && !VIDEO_EXTENSIONS.some(ext => lower.includes(ext))) return "photos";
  return null;
}

function detectFileType(file: File): FileType {
  if (file.type.startsWith('image/')) return 'photos';
  if (file.type.startsWith('video/')) return 'videos';
  if (file.type.startsWith('audio/')) return 'music';
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  if (IMAGE_EXTENSIONS.includes(ext)) return 'photos';
  if (VIDEO_EXTENSIONS.includes(ext)) return 'videos';
  if (AUDIO_EXTENSIONS.includes(ext)) return 'music';
  return 'photos';
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
  const { user: authUser } = useAuth();
  const currentUser = getCurrentUser();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [ownerName, setOwnerName] = useState<string | null>(null);

  // Folders
  const [folders, setFolders] = useState<UserFolder[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");

  // Upload
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [videoLink, setVideoLink] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadFolderId, setUploadFolderId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const targetUserId = routeUserId || currentUser?.id;
  const isOwnFiles = !routeUserId || routeUserId === currentUser?.id;
  const activeTab: FileType = (type as FileType) || "photos";

  // Fetch owner name
  useEffect(() => {
    if (!routeUserId || isOwnFiles) { setOwnerName(null); return; }
    supabase.rpc('get_safe_public_profiles_by_ids', { _ids: [routeUserId] })
      .then(({ data }) => { if (data?.[0]?.full_name) setOwnerName(data[0].full_name); });
  }, [routeUserId, isOwnFiles]);

  // Fetch folders
  const fetchFolders = useCallback(async () => {
    if (!isOwnFiles || !authUser?.id) return;
    const { data } = await supabase
      .from("user_folders")
      .select("*")
      .eq("user_id", authUser.id)
      .order("created_at", { ascending: true });
    if (data) setFolders(data);
  }, [authUser?.id, isOwnFiles]);

  // Fetch files (posts + uploaded)
  const fetchFiles = useCallback(async () => {
    if (!targetUserId) return;
    setLoading(true);

    // Fetch from posts
    const { data: postsData } = await supabase
      .from("posts")
      .select("id, media_url, content, created_at")
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: false });

    const postFiles: FileItem[] = (postsData || [])
      .map(p => {
        const videoEmbed = p.content ? extractVideoEmbed(p.content) : null;
        const hasVideoEmbed = videoEmbed && videoEmbed.platform !== 'link';
        return { ...p, videoEmbed: hasVideoEmbed ? videoEmbed : null, source: 'post' as const };
      })
      .filter(p => p.media_url || p.videoEmbed);

    // Fetch uploaded files (only own)
    let uploadedFiles: FileItem[] = [];
    if (isOwnFiles && authUser?.id) {
      const { data: ufData } = await supabase
        .from("user_files")
        .select("*")
        .eq("user_id", authUser.id)
        .order("created_at", { ascending: false });

      if (ufData) {
        uploadedFiles = ufData.map(f => {
          const videoEmbed = f.file_type === 'video' && f.file_url ? extractVideoEmbed(f.file_url) : null;
          return {
            id: f.id,
            media_url: f.file_type !== 'video' ? f.file_url : (videoEmbed ? null : f.file_url),
            content: f.title,
            created_at: f.created_at,
            videoEmbed: videoEmbed && videoEmbed.platform !== 'link' ? videoEmbed : null,
            source: 'uploaded' as const,
            folder_id: f.folder_id,
            file_type: f.file_type,
          };
        });
      }
    }

    setFiles([...uploadedFiles, ...postFiles]);
    setLoading(false);
  }, [targetUserId, isOwnFiles, authUser?.id]);

  useEffect(() => { fetchFolders(); }, [fetchFolders]);
  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  // Filter by tab + folder
  const filtered = files.filter(f => {
    if (getFileType(f) !== activeTab) return false;
    if (activeFolderId) return f.source === 'uploaded' && f.folder_id === activeFolderId;
    return true;
  });

  const buildTabUrl = (tabId: string) => {
    if (isOwnFiles) return `/my-files/${tabId}`;
    return `/files/${routeUserId}/${tabId}`;
  };

  // Folder CRUD
  const createFolder = async () => {
    if (!newFolderName.trim() || !authUser?.id) return;
    const { error } = await supabase.from("user_folders").insert({
      user_id: authUser.id, name: newFolderName.trim()
    });
    if (error) { toast.error("Помилка створення папки"); return; }
    toast.success("Папку створено");
    setNewFolderName("");
    setShowNewFolderInput(false);
    fetchFolders();
  };

  const renameFolder = async (folderId: string) => {
    if (!editingFolderName.trim()) return;
    const { error } = await supabase.from("user_folders")
      .update({ name: editingFolderName.trim() })
      .eq("id", folderId);
    if (error) { toast.error("Помилка перейменування"); return; }
    setEditingFolderId(null);
    fetchFolders();
  };

  const deleteFolder = async (folderId: string) => {
    const { error } = await supabase.from("user_folders").delete().eq("id", folderId);
    if (error) { toast.error("Помилка видалення папки"); return; }
    toast.success("Папку видалено");
    if (activeFolderId === folderId) setActiveFolderId(null);
    fetchFolders();
    fetchFiles();
  };

  // Helper: get file name without extension
  const getFileNameWithoutExt = (name: string) => {
    const parts = name.split('.');
    if (parts.length > 1) parts.pop();
    return parts.join('.');
  };

  // Upload file(s)
  const handleUpload = async () => {
    if (!authUser?.id) return;
    setUploading(true);

    try {
      if (videoLink.trim()) {
        // Video link
        const { error } = await supabase.from("user_files").insert({
          user_id: authUser.id,
          file_url: videoLink.trim(),
          file_type: "video",
          title: uploadTitle.trim() || null,
          folder_id: uploadFolderId || null,
        });
        if (error) throw error;
      } else if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          const detected = detectFileType(file);
          const fileType = detected === 'photos' ? 'photo' : detected === 'videos' ? 'video' : 'music';
          const ext = file.name.split('.').pop() || 'bin';
          const filePath = `${authUser.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

          const { error: uploadError } = await supabase.storage
            .from("posts")
            .upload(filePath, file, { upsert: true, contentType: file.type });
          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage.from("posts").getPublicUrl(filePath);

          // Auto-use original filename as title if no custom title and multiple files
          const autoTitle = selectedFiles.length === 1 && uploadTitle.trim()
            ? uploadTitle.trim()
            : getFileNameWithoutExt(file.name);

          const { error } = await supabase.from("user_files").insert({
            user_id: authUser.id,
            file_url: urlData.publicUrl,
            file_type: fileType,
            title: autoTitle,
            folder_id: uploadFolderId || null,
          });
          if (error) throw error;
        }
      } else {
        toast.error("Оберіть файл або вставте посилання");
        setUploading(false);
        return;
      }

      toast.success(selectedFiles.length > 1 ? `Завантажено ${selectedFiles.length} файлів!` : "Файл завантажено!");
      setShowUploadDialog(false);
      setSelectedFiles([]);
      setUploadTitle("");
      setVideoLink("");
      setUploadFolderId(null);
      fetchFiles();
    } catch (err: any) {
      toast.error(err.message || "Помилка завантаження");
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (fileId: string) => {
    const { error } = await supabase.from("user_files").delete().eq("id", fileId);
    if (error) { toast.error("Помилка видалення"); return; }
    toast.success("Файл видалено");
    fetchFiles();
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
    ? "Медіафайли з публікацій та завантажені файли"
    : `Медіафайли користувача ${ownerName || ''}`;

  const activeFolder = folders.find(f => f.id === activeFolderId);

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
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <FolderOpen className="h-6 w-6 text-primary" />
                {activeFolder ? activeFolder.name : title}
              </h1>
              {isOwnFiles && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setUploadFolderId(activeFolderId); setShowUploadDialog(true); }} className="gap-1.5">
                    <Upload className="h-4 w-4" />
                    <span className="hidden sm:inline">Завантажити</span>
                  </Button>
                </div>
              )}
            </div>
            {activeFolder ? (
              <button
                onClick={() => setActiveFolderId(null)}
                className="flex items-center gap-1 text-sm text-primary hover:underline mt-1"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Назад до всіх файлів
              </button>
            ) : (
              <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>
            )}
          </div>

          {/* Folders section (own files only) */}
          {isOwnFiles && !activeFolderId && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm font-semibold text-muted-foreground">Папки</h3>
                <button
                  onClick={() => setShowNewFolderInput(!showNewFolderInput)}
                  className="text-primary hover:text-primary/80"
                >
                  <FolderPlus className="h-4 w-4" />
                </button>
              </div>

              {showNewFolderInput && (
                <div className="flex gap-2 mb-2">
                  <Input
                    value={newFolderName}
                    onChange={e => setNewFolderName(e.target.value)}
                    placeholder="Назва папки"
                    className="h-8 text-sm"
                    onKeyDown={e => e.key === 'Enter' && createFolder()}
                    autoFocus
                  />
                  <Button size="sm" onClick={createFolder} className="h-8 px-2">
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowNewFolderInput(false); setNewFolderName(""); }} className="h-8 px-2">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {folders.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {folders.map(folder => (
                    <div
                      key={folder.id}
                      className="flex items-center gap-2 p-2.5 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors group"
                      onClick={() => {
                        if (editingFolderId !== folder.id) setActiveFolderId(folder.id);
                      }}
                    >
                      <FolderOpen className="h-5 w-5 text-primary shrink-0" />
                      {editingFolderId === folder.id ? (
                        <div className="flex gap-1 flex-1" onClick={e => e.stopPropagation()}>
                          <Input
                            value={editingFolderName}
                            onChange={e => setEditingFolderName(e.target.value)}
                            className="h-6 text-xs"
                            onKeyDown={e => e.key === 'Enter' && renameFolder(folder.id)}
                            autoFocus
                          />
                          <button onClick={() => renameFolder(folder.id)} className="text-primary"><Check className="h-3.5 w-3.5" /></button>
                          <button onClick={() => setEditingFolderId(null)} className="text-muted-foreground"><X className="h-3.5 w-3.5" /></button>
                        </div>
                      ) : (
                        <>
                          <span className="text-sm truncate flex-1">{folder.name}</span>
                          <div className="hidden group-hover:flex gap-1" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => { setEditingFolderId(folder.id); setEditingFolderName(folder.name); }}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => deleteFolder(folder.id)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-2 mb-4">
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
                  ({files.filter(f => {
                    if (getFileType(f) !== tab.id) return false;
                    if (activeFolderId) return f.source === 'uploaded' && f.folder_id === activeFolderId;
                    return true;
                  }).length})
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
              {isOwnFiles && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 gap-2"
                  onClick={() => { setUploadFolderId(activeFolderId); setShowUploadDialog(true); }}
                >
                  <Upload className="h-4 w-4" />
                  Завантажити файл
                </Button>
              )}
            </div>
          ) : activeTab === "photos" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filtered.map(file => (
                <div
                  key={file.id}
                  className="group relative aspect-square rounded-lg overflow-hidden border bg-muted cursor-pointer"
                  onClick={() => file.source === 'post' ? navigate(`/post/${file.id}`) : window.open(file.media_url!, '_blank')}
                >
                  <img
                    src={file.media_url!}
                    alt={file.content || "Фото"}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  {file.source === 'uploaded' && isOwnFiles && (
                    <button
                      onClick={e => { e.stopPropagation(); deleteFile(file.id); }}
                      className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {file.content && (
                    <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/60 to-transparent">
                      <p className="text-[10px] text-white truncate">{file.content}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : activeTab === "videos" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filtered.map(file => (
                <div
                  key={file.id}
                  className="rounded-lg overflow-hidden border bg-muted cursor-pointer relative group"
                  onClick={() => file.source === 'post' ? navigate(`/post/${file.id}`) : (file.videoEmbed ? window.open(file.videoEmbed.originalUrl, '_blank') : null)}
                >
                  {file.videoEmbed && file.videoEmbed.platform !== 'link' ? (
                    <div className="pointer-events-none">
                      <VideoPreview embed={file.videoEmbed} />
                    </div>
                  ) : file.media_url ? (
                    <video src={file.media_url} className="w-full aspect-video object-cover" preload="metadata" muted />
                  ) : null}
                  {file.content && <p className="p-2 text-sm truncate">{file.content}</p>}
                  {file.source === 'uploaded' && isOwnFiles && (
                    <button
                      onClick={e => { e.stopPropagation(); deleteFile(file.id); }}
                      className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(file => (
                <div key={file.id} className="relative group">
                  <AudioPlayer src={file.media_url!} title={file.content || undefined} />
                  {file.source === 'uploaded' && isOwnFiles && (
                    <button
                      onClick={() => deleteFile(file.id)}
                      className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Завантажити файл
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* File input */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Файл (фото або музика)</label>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/gif,image/*,audio/mpeg,audio/wav,audio/ogg,audio/flac,audio/aac,audio/mp4,audio/x-m4a,audio/webm,video/mp4,video/webm"
                onChange={e => { setSelectedFiles(e.target.files ? Array.from(e.target.files) : []); setVideoLink(""); }}
                className="hidden"
              />
              <Button
                variant="outline"
                className="w-full gap-2 justify-start"
                onClick={() => fileInputRef.current?.click()}
              >
                <Plus className="h-4 w-4" />
                {selectedFiles.length > 1
                  ? `Обрано ${selectedFiles.length} файлів`
                  : selectedFiles.length === 1
                    ? selectedFiles[0].name
                    : "Обрати файл(и)"}
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">або</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* Video link */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Посилання на відео</label>
              <div className="flex gap-2">
                <LinkIcon className="h-4 w-4 mt-2.5 text-muted-foreground shrink-0" />
                <Input
                  value={videoLink}
                  onChange={e => { setVideoLink(e.target.value); setSelectedFiles([]); }}
                  placeholder="https://youtube.com/watch?v=..."
                  className="flex-1"
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">YouTube, Instagram, TikTok, Facebook</p>
            </div>

            {/* Title - only for single file or video link */}
            {(selectedFiles.length <= 1 || videoLink.trim()) && (
            <div>
              <label className="text-sm font-medium mb-1.5 block">Назва (необов'язково)</label>
              <Input
                value={uploadTitle}
                onChange={e => setUploadTitle(e.target.value)}
                placeholder={selectedFiles.length === 1 ? selectedFiles[0].name : "Назва файлу"}
              />
            </div>
            )}
            {selectedFiles.length > 1 && (
              <p className="text-xs text-muted-foreground">При завантаженні кількох файлів назви зберігаються автоматично</p>
            )}

            {/* Folder select */}
            {folders.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-1.5 block">Папка</label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={uploadFolderId === null ? "default" : "outline"}
                    onClick={() => setUploadFolderId(null)}
                    className="h-7 text-xs"
                  >
                    Без папки
                  </Button>
                  {folders.map(f => (
                    <Button
                      key={f.id}
                      size="sm"
                      variant={uploadFolderId === f.id ? "default" : "outline"}
                      onClick={() => setUploadFolderId(f.id)}
                      className="h-7 text-xs gap-1"
                    >
                      <FolderOpen className="h-3 w-3" />
                      {f.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowUploadDialog(false)}>Скасувати</Button>
            <Button onClick={handleUpload} disabled={uploading || (selectedFiles.length === 0 && !videoLink.trim())} className="gap-2">
              {uploading ? "Завантаження..." : "Завантажити"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
