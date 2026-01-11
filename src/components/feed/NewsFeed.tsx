
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Image, Video, Users, Send } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PostCard } from "./PostCard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { EditPublicationModal } from "@/components/publications/EditPublicationModal";

export function NewsFeed() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [editPostOpen, setEditPostOpen] = useState(false);
  const [postToEdit, setPostToEdit] = useState<any>(null);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      setLoading(true);
      
      // Спробуємо завантажити з Supabase
      const { data: supabasePosts, error } = await supabase
        .from('posts')
        .select(`
          *,
          author:users!posts_user_id_fkey(*)
        `)
        .order('created_at', { ascending: false });

      if (error && error.code !== 'PGRST116') {
        console.error("Помилка завантаження постів з Supabase:", error);
      }

      if (supabasePosts && supabasePosts.length > 0) {
        setPosts(supabasePosts);
      } else {
        // Якщо немає постів в Supabase, показуємо порожню стрічку
        setPosts([]);
      }
    } catch (error) {
      console.error("Помилка завантаження постів:", error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) return;

    try {
      const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
      
      const newPost = {
        content: newPostContent,
        user_id: currentUser.id,
        created_at: new Date().toISOString(),
        likes_count: 0,
        comments_count: 0,
        category: activeCategory === 'all' ? null : activeCategory
      };

      // Спробуємо додати до Supabase
      try {
        const { data, error } = await supabase
          .from('posts')
          .insert([newPost])
          .select()
          .single();

        if (error) {
          console.error("Помилка створення поста в Supabase:", error);
        } else if (data) {
          setPosts([data, ...posts]);
          setNewPostContent("");
          return;
        }
      } catch (supabaseError) {
        console.warn("Не вдалося створити пост в Supabase:", supabaseError);
      }

      // Якщо Supabase не працює, додаємо локально
      const localPost = {
        ...newPost,
        id: `local-${Date.now()}`,
      };
      
      setPosts([localPost, ...posts]);
      setNewPostContent("");
    } catch (error) {
      console.error("Помилка створення поста:", error);
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
      {/* Створення нового поста */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <Textarea
            placeholder="Що у вас нового?"
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            className="min-h-[80px] md:min-h-[100px] resize-none border-0 focus-visible:ring-0 text-base md:text-lg"
          />
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mt-4 pt-4 border-t">
            <div className="flex flex-wrap gap-2 sm:space-x-4 sm:gap-0">
              <Button variant="ghost" size="sm" className="text-xs sm:text-sm">
                <Image className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Фото</span>
              </Button>
              <Button variant="ghost" size="sm" className="text-xs sm:text-sm">
                <Video className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Відео</span>
              </Button>
              <Button variant="ghost" size="sm" className="text-xs sm:text-sm">
                <Users className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Подія</span>
              </Button>
            </div>
            <Button 
              onClick={handleCreatePost} 
              disabled={!newPostContent.trim()}
              className="bg-primary hover:bg-primary/90 w-full sm:w-auto"
              size="sm"
            >
              <Send className="h-4 w-4 mr-2" />
              Опублікувати
            </Button>
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
              const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
              
              // Використовуємо автора з бази даних або з localStorage
              let postAuthor = post.author;
              if (!postAuthor) {
                if (post.user_id === currentUser.id) {
                  postAuthor = currentUser;
                } else {
                  // Шукаємо автора в списку користувачів
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
                    username: postAuthor?.phone_number || postAuthor?.phoneNumber || 'user',
                    avatarUrl: postAuthor?.avatar_url || postAuthor?.avatarUrl || '',
                    profession: postAuthor?.title || postAuthor?.bio || ''
                  }}
                  imageUrl={post.media_url || undefined}
                  caption={post.content || ''}
                  likes={post.likes_count || 0}
                  comments={post.comments_count || 0}
                  timeAgo="щойно"
                  onEdit={handleEditPost}
                  onDelete={handleDeletePost}
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
    </div>
  );
}
