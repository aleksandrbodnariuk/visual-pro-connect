
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Image, Video, Users, Send } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PostCard } from "./PostCard";
import { supabase } from "@/integrations/supabase/client";

export function NewsFeed() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      setLoading(true);
      
      // Спробуємо завантажити з Supabase
      const { data: supabasePosts, error } = await supabase
        .from('posts')
        .select('*')
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
        user_id: currentUser.id || 'demo-user',
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
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Створення нового поста */}
      <Card>
        <CardContent className="p-6">
          <Textarea
            placeholder="Що у вас нового?"
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            className="min-h-[100px] resize-none border-0 focus-visible:ring-0 text-lg"
          />
          <div className="flex justify-between items-center mt-4 pt-4 border-t">
            <div className="flex space-x-4">
              <Button variant="ghost" size="sm">
                <Image className="h-4 w-4 mr-2" />
                Фото
              </Button>
              <Button variant="ghost" size="sm">
                <Video className="h-4 w-4 mr-2" />
                Відео
              </Button>
              <Button variant="ghost" size="sm">
                <Users className="h-4 w-4 mr-2" />
                Подія
              </Button>
            </div>
            <Button 
              onClick={handleCreatePost} 
              disabled={!newPostContent.trim()}
              className="bg-primary hover:bg-primary/90"
            >
              <Send className="h-4 w-4 mr-2" />
              Опублікувати
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Фільтри категорій */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">Усі</TabsTrigger>
          <TabsTrigger value="photo">Фото</TabsTrigger>
          <TabsTrigger value="video">Відео</TabsTrigger>
          <TabsTrigger value="music">Музика</TabsTrigger>
          <TabsTrigger value="event">Події</TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeCategory} className="space-y-6 mt-6">
          {filteredPosts.length > 0 ? (
            filteredPosts.map((post) => {
              // Отримуємо дані користувача з localStorage та Supabase
              const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
              
              return (
                <PostCard 
                  key={post.id}
                  id={post.id}
                  author={{
                    id: post.user_id || currentUser.id || 'demo-user',
                    name: currentUser.full_name || currentUser.firstName && currentUser.lastName ? 
                          `${currentUser.firstName} ${currentUser.lastName}` : 'Користувач',
                    username: currentUser.phone_number || 'user',
                    avatarUrl: currentUser.avatar_url || '',
                    profession: currentUser.title || currentUser.bio || ''
                  }}
                  imageUrl={post.media_url || undefined}
                  caption={post.content || ''}
                  likes={post.likes_count || 0}
                  comments={post.comments_count || 0}
                  timeAgo="щойно"
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
    </div>
  );
}
