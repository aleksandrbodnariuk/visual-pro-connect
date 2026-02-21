
import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Image, Video, Users, Send, X, Pencil, Music } from "lucide-react";
import { AudioPlayer } from "./AudioPlayer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PostCard } from "./PostCard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { EditPublicationModal } from "@/components/publications/EditPublicationModal";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { uploadToStorage } from "@/lib/storage";
import { extractVideoEmbed } from "@/lib/videoEmbed";
import { ImageCropEditor } from "@/components/ui/ImageCropEditor";
import { compressImageFromDataUrl, dataUrlToBlob } from "@/lib/imageCompression";

export function NewsFeed() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState("");
  const [isFormExpanded, setIsFormExpanded] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const [editPostOpen, setEditPostOpen] = useState(false);
  const [postToEdit, setPostToEdit] = useState<any>(null);
  
  // Нові стани для медіа
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [originalImageSrc, setOriginalImageSrc] = useState<string | null>(null);

  // Отримуємо поточного користувача через Supabase Auth
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    loadPosts();
    loadCurrentUser();
  }, []);

  // Realtime підписка на нові/видалені пости
  useEffect(() => {
    const channelName = `realtime_posts_feed_${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'posts'
      }, () => {
        loadPosts(false);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadCurrentUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();
        setCurrentUser(data);
      }
    } catch (error) {
      console.error("Error loading current user:", error);
    }
  };

  // Функція getUsername видалена - @username більше не показується в UI

  const loadPosts = async (isInitial = true) => {
    try {
      if (isInitial) setLoading(true);
      
      // Timeout 15 секунд для завантаження постів
      const timeout = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 15000)
      );
      
      const fetchPosts = async () => {
        // Завантажуємо пости без JOIN (RLS блокує доступ до users)
        const { data: supabasePosts, error } = await supabase
          .from('posts')
          .select('*')
          .order('created_at', { ascending: false });

        if (error && error.code !== 'PGRST116') {
          console.error("Помилка завантаження постів з Supabase:", error);
        }

        if (supabasePosts && supabasePosts.length > 0) {
          // Отримуємо унікальні ID авторів
          const authorIds = [...new Set(supabasePosts.map(p => p.user_id).filter(Boolean))] as string[];
          
          // Завантажуємо авторів через безпечну RPC функцію (SECURITY DEFINER)
          const { data: authors } = await supabase.rpc('get_safe_public_profiles_by_ids', { 
            _ids: authorIds 
          });
          
          // Додаємо авторів до постів
          const postsWithAuthors = supabasePosts.map(post => ({
            ...post,
            author: authors?.find((a: any) => a.id === post.user_id) || null
          }));
          
          return postsWithAuthors;
        }
        return [];
      };

      const result = await Promise.race([fetchPosts(), timeout]);
      setPosts(result);
    } catch (error) {
      console.error("Помилка завантаження постів:", error);
      setPosts([]); // Fallback до порожнього списку
    } finally {
      setLoading(false);
    }
  };

  // Обробник вибору файлу
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'audio' = 'image') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Валідація типу файлу
    if (type === 'audio') {
      if (!file.type.startsWith('audio/')) {
        toast({ title: 'Підтримуються лише аудіо файли', variant: 'destructive' });
        return;
      }
    } else if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      toast({ title: 'Підтримуються лише зображення та відео', variant: 'destructive' });
      return;
    }

    // Валідація розміру (макс 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({ title: 'Розмір файлу не повинен перевищувати 50MB', variant: 'destructive' });
      return;
    }

    // Розгортаємо форму при додаванні медіа
    setIsFormExpanded(true);

    if (type === 'audio') {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    } else if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setOriginalImageSrc(event.target?.result as string);
        setShowImageEditor(true);
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
    
    // Reset input
    if (e.target) e.target.value = '';
  };

  const handleCropComplete = async (croppedDataUrl: string) => {
    try {
      const compressed = await compressImageFromDataUrl(croppedDataUrl, 'post');
      setPreviewUrl(compressed);
      const blob = dataUrlToBlob(compressed);
      const file = new File([blob], `post-${Date.now()}.jpg`, { type: 'image/jpeg' });
      setSelectedFile(file);
    } catch (error) {
      console.error('Error processing cropped image:', error);
      // Fallback: use original cropped data
      setPreviewUrl(croppedDataUrl);
      const blob = dataUrlToBlob(croppedDataUrl);
      const file = new File([blob], `post-${Date.now()}.jpg`, { type: 'image/jpeg' });
      setSelectedFile(file);
    }
    setShowImageEditor(false);
    setOriginalImageSrc(null);
  };

  const handleEditorClose = () => {
    setShowImageEditor(false);
    setOriginalImageSrc(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  // Видалення вибраного файлу
  const removeFile = () => {
    if (previewUrl && selectedFile?.type.startsWith('audio/')) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
    if (audioInputRef.current) audioInputRef.current.value = '';
  };

  // Обробник кнопки "Подія"
  const handleEventClick = () => {
    toast({ title: "Функція 'Подія' в розробці" });
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim() && !selectedFile) return;
    
    // Перевірка авторизації - пост повинен мати автора
    if (!currentUser?.id) {
      toast({ title: "Будь ласка, увійдіть в систему", variant: "destructive" });
      return;
    }

    setIsUploading(true);

    try {
      const user = currentUser;
      
      let mediaUrl = null;

      // Завантаження медіа файлу
      if (selectedFile) {
        const fileExtension = selectedFile.name.split('.').pop() || 'jpg';
        const uniqueFileName = `post-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;
        const filePath = `${uniqueFileName}`;
        
        mediaUrl = await uploadToStorage('posts', filePath, selectedFile, selectedFile.type);
      }
      
      const newPost = {
        content: newPostContent,
        user_id: user.id,
        media_url: mediaUrl,
        category: activeCategory === 'all' ? null : activeCategory
      };

      const { data, error } = await supabase
        .from('posts')
        .insert([newPost])
        .select()
        .single();

      if (error) throw error;

      setPosts([data, ...posts]);
      setNewPostContent("");
      setIsFormExpanded(false);
      setSelectedFile(null);
      setPreviewUrl(null);
      toast({ title: "Публікацію створено!" });

    } catch (error) {
      console.error("Помилка:", error);
      toast({ title: "Помилка створення публікації", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      setPosts(posts.filter(p => p.id !== postId));
      toast({ title: "Публікацію видалено" });
    } catch (error) {
      console.error("Error deleting post:", error);
      toast({ title: "Помилка видалення публікації", variant: "destructive" });
    }
  };

  const handleEditPost = (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (post) {
      setPostToEdit({
        id: post.id,
        content: post.content,
        media_url: post.media_url,
        category: post.category
      });
      setEditPostOpen(true);
    }
  };

  const handleEditSuccess = () => {
    loadPosts();
  };

  const filteredPosts = posts.filter(post => {
    if (activeCategory === "all") return true;
    
    // Фільтр "Фото" - пости із зображеннями
    if (activeCategory === "photo") {
      if (!post.media_url) return false;
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
      return imageExtensions.some(ext => post.media_url?.toLowerCase().endsWith(ext));
    }
    
    // Фільтр "Відео" - пости з відео файлами або посиланнями на відео платформи
    if (activeCategory === "video") {
      // Перевіряємо media_url на відео файл
      if (post.media_url) {
        const videoExtensions = ['.mp4', '.webm', '.mov', '.avi'];
        if (videoExtensions.some(ext => post.media_url?.toLowerCase().endsWith(ext))) {
          return true;
        }
      }
      // Перевіряємо контент на посилання YouTube/Facebook/TikTok
      const videoEmbed = extractVideoEmbed(post.content);
      if (videoEmbed && ['youtube', 'facebook', 'tiktok', 'instagram'].includes(videoEmbed.platform)) {
        return true;
      }
      return false;
    }
    
    // Фільтр "Музика" - пости з аудіо файлами
    if (activeCategory === "music") {
      if (!post.media_url) return false;
      const audioExtensions = ['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a', '.wma'];
      return audioExtensions.some(ext => post.media_url?.toLowerCase().includes(ext));
    }
    
    // Інші категорії - за збереженою категорією
    return post.category === activeCategory;
  });

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 rounded-lg mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 md:space-y-6">
      {/* Компактна форма створення публікації (стиль Facebook) */}
      <Card>
        <CardContent className="p-3 md:p-4">
          {/* Приховані input для вибору файлів */}
          <input ref={imageInputRef} type="file" accept="image/*"
            onChange={(e) => handleFileSelect(e, 'image')} className="hidden" />
          <input ref={videoInputRef} type="file" accept="video/*"
            onChange={(e) => handleFileSelect(e, 'video')} className="hidden" />
          <input ref={audioInputRef} type="file" accept="audio/*,.mp3,.wav,.ogg,.flac,.aac,.m4a"
            onChange={(e) => handleFileSelect(e, 'audio')} className="hidden" />

          {/* Аватар + textarea або placeholder */}
          <div className="flex items-start gap-2 md:gap-3">
            <Avatar className="h-9 w-9 md:h-10 md:w-10 shrink-0 mt-0.5">
              <AvatarImage src={currentUser?.avatar_url} />
              <AvatarFallback>{currentUser?.full_name?.[0] || 'U'}</AvatarFallback>
            </Avatar>

            {isFormExpanded ? (
              <Textarea
                placeholder="Що у вас нового? Напишіть опис публікації..."
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value.slice(0, 10000))}
                rows={3}
                className="flex-1 resize-none bg-muted/30 border-0 focus-visible:ring-1 text-sm"
                autoFocus
              />
            ) : (
              <button
                type="button"
                onClick={() => setIsFormExpanded(true)}
                className="flex-1 text-left bg-muted/50 rounded-full px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
              >
                Що у вас нового?
              </button>
            )}
          </div>

          {/* Превʼю вибраного файлу */}
          {previewUrl && selectedFile && (
            <div className="mt-3 relative rounded-lg overflow-hidden border bg-muted/30">
              {selectedFile.type.startsWith('audio/') ? (
                <div className="p-2">
                  <AudioPlayer src={previewUrl} title={selectedFile.name.replace(/\.[^.]+$/, '')} />
                </div>
              ) : selectedFile.type.startsWith('image/') ? (
                <>
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full max-h-80 object-contain"
                  />
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={() => {
                      setOriginalImageSrc(previewUrl);
                      setShowImageEditor(true);
                    }}
                    className="absolute top-2 left-2 h-8 w-8"
                    title="Редагувати"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <video
                  src={previewUrl}
                  className="w-full max-h-80 object-contain"
                  controls
                />
              )}
              <Button
                variant="destructive"
                size="icon"
                onClick={removeFile}
                className="absolute top-2 right-2 h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Розділювач + кнопки медіа + публікація */}
          <div className="border-t mt-3 pt-3 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => videoInputRef.current?.click()}
                className="h-9 px-2 sm:px-3 text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
                title="Відео"
              >
                <Video className="h-5 w-5" />
                <span className="text-xs hidden sm:inline">Відео</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => imageInputRef.current?.click()}
                className="h-9 px-2 sm:px-3 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950 gap-1.5"
                title="Фото"
              >
                <Image className="h-5 w-5" />
                <span className="text-xs hidden sm:inline">Фото</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => audioInputRef.current?.click()}
                className="h-9 px-2 sm:px-3 text-orange-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950 gap-1.5"
                title="Музика"
              >
                <Music className="h-5 w-5" />
                <span className="text-xs hidden sm:inline">Музика</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEventClick}
                className="h-9 px-2 sm:px-3 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 gap-1.5"
                title="Подія"
              >
                <Users className="h-5 w-5" />
                <span className="text-xs hidden sm:inline">Подія</span>
              </Button>
            </div>

            {(newPostContent.trim() || selectedFile) && (
              <Button
                onClick={handleCreatePost}
                disabled={isUploading}
                size="sm"
              >
                <Send className="h-4 w-4 mr-2" />
                {isUploading ? "Завантаження..." : "Опублікувати"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Фільтри категорій */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="w-full flex overflow-x-auto scrollbar-hide">
          <TabsTrigger value="all" className="flex-1 min-w-[60px] text-xs sm:text-sm">Усі</TabsTrigger>
          <TabsTrigger value="photo" className="flex-1 min-w-[60px] text-xs sm:text-sm">Фото</TabsTrigger>
          <TabsTrigger value="video" className="flex-1 min-w-[60px] text-xs sm:text-sm">Відео</TabsTrigger>
          <TabsTrigger value="music" className="flex-1 min-w-[60px] text-xs sm:text-sm">Музика</TabsTrigger>
          <TabsTrigger value="event" className="flex-1 min-w-[60px] text-xs sm:text-sm">Події</TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeCategory} className="space-y-4 md:space-y-6 mt-4 md:mt-6">
          {filteredPosts.length > 0 ? (
            filteredPosts.map((post) => {
              // Отримуємо дані автора поста
              let postAuthor = post.author;
              if (!postAuthor) {
                if (post.user_id === currentUser?.id) {
                  postAuthor = currentUser;
                } else {
                  const users = JSON.parse(localStorage.getItem('users') || '[]');
                  postAuthor = users.find((user: any) => user.id === post.user_id);
                }
              }
              
              const authorName = postAuthor?.full_name || 'Користувач';
              
              return (
                <PostCard 
                  key={post.id}
                  id={post.id}
                  author={{
                    id: post.user_id,
                    name: authorName,
                    avatarUrl: postAuthor?.avatar_url || postAuthor?.avatarUrl || '',
                    profession: postAuthor?.title || '',
                    isShareHolder: postAuthor?.is_shareholder || false
                  }}
                  imageUrl={post.media_url || undefined}
                  caption={post.content || ''}
                  likes={post.likes_count || 0}
                  comments={post.comments_count || 0}
                  timeAgo="щойно"
                  onEdit={handleEditPost}
                  onDelete={handleDeletePost}
                  currentUser={currentUser}
                />
              );
            })
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-muted-foreground">
                  {activeCategory === "all" 
                    ? "Поки що немає публікацій. Створіть першу!" 
                    : `Немає публікацій у категорії "${activeCategory}"`
                  }
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <EditPublicationModal
        open={editPostOpen}
        onOpenChange={setEditPostOpen}
        post={postToEdit}
        onSuccess={handleEditSuccess}
      />

      {originalImageSrc && (
        <ImageCropEditor
          imageSrc={originalImageSrc}
          open={showImageEditor}
          onClose={handleEditorClose}
          onCropComplete={handleCropComplete}
          aspectRatio={undefined}
          title="Редагувати фото"
        />
      )}
    </div>
  );
}
