
import React, { useState, useEffect } from "react";
import { PostCard } from "./PostCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";
import { supabase } from "@/integrations/supabase/client";

export function NewsFeed() {
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { language } = useLanguage();
  const t = translations[language];

  // Завантаження постів з Supabase або localStorage
  useEffect(() => {
    const fetchPosts = async () => {
      setIsLoading(true);
      try {
        // Спробуємо отримати пости з Supabase
        const { data: supabasePosts, error } = await supabase
          .from('posts')
          .select('*, user:user_id(*)')
          .order('created_at', { ascending: false });

        if (error) {
          console.error("Помилка отримання постів з Supabase:", error);
          throw error;
        }

        if (supabasePosts && supabasePosts.length > 0) {
          // Фільтруємо тестові пости 
          const filteredPosts = supabasePosts.filter((post: any) => 
            post.user?.full_name !== "Олександр Петренко" && 
            post.user?.full_name !== "Марія Коваленко" &&
            !post.content?.includes("Опис нової фотосесії для молодят") &&
            !post.content?.includes("Деталі про новий музичний кліп")
          );
          
          setPosts(filteredPosts);
          localStorage.setItem('posts', JSON.stringify(filteredPosts));
        } else {
          // Якщо у Supabase немає постів, перевіряємо localStorage
          const storedPosts = JSON.parse(localStorage.getItem('posts') || '[]');
          
          // Видаляємо зразки постів з localStorage
          const filteredPosts = storedPosts.filter((post: any) => 
            post.author !== "Олександр Петренко" && 
            post.author !== "Марія Коваленко" && 
            !post.title?.includes("Нова фотосесія") &&
            !post.title?.includes("Відеомонтаж кліпу") &&
            !post.content?.includes("Опис нової фотосесії для молодят") &&
            !post.content?.includes("Деталі про новий музичний кліп")
          );
          
          // Зберігаємо очищені пости
          localStorage.setItem('posts', JSON.stringify(filteredPosts));
          setPosts(filteredPosts);
          
          // Спроба перенесення постів з localStorage у Supabase
          if (filteredPosts.length > 0) {
            for (const post of filteredPosts) {
              try {
                const { error: insertError } = await supabase
                  .from('posts')
                  .insert({
                    id: post.id || crypto.randomUUID(),
                    content: post.content,
                    media_url: post.media_url || post.mediaUrl,
                    user_id: post.user_id || post.userId,
                    category: post.category,
                    likes_count: post.likes_count || 0,
                    comments_count: post.comments_count || 0
                  });
                
                if (insertError) {
                  console.warn("Помилка при додаванні поста в Supabase:", insertError);
                }
              } catch (insertErr) {
                console.error("Помилка при додаванні поста в Supabase:", insertErr);
              }
            }
          }
        }
      } catch (error) {
        console.error("Помилка при завантаженні постів:", error);
        
        // Використовуємо дані з localStorage як запасний варіант
        const storedPosts = JSON.parse(localStorage.getItem('posts') || '[]');
        
        // Видаляємо зразки постів з localStorage
        const filteredPosts = storedPosts.filter((post: any) => 
          post.author !== "Олександр Петренко" && 
          post.author !== "Марія Коваленко" && 
          !post.title?.includes("Нова фотосесія") &&
          !post.title?.includes("Відеомонтаж кліпу") &&
          !post.content?.includes("Опис нової фотосесії для молодят") &&
          !post.content?.includes("Деталі про новий музичний кліп")
        );
        
        // Зберігаємо очищені пости
        localStorage.setItem('posts', JSON.stringify(filteredPosts));
        setPosts(filteredPosts);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPosts();
  }, []);

  // Helper function to transform post data to match PostCard props
  const transformPostToProps = (post: any) => {
    return {
      id: post.id,
      author: {
        id: post.user_id || post.userId || post.user?.id || '',
        name: post.user?.full_name || post.author || 'Користувач',
        username: post.user?.phone_number || 'user',
        avatarUrl: post.user?.avatar_url || '',
        profession: post.category 
          ? post.category === 'photo' 
            ? 'Photographer' 
            : post.category === 'video' 
              ? 'Videographer' 
              : post.category === 'music' 
                ? 'Musician' 
                : undefined
          : undefined
      },
      imageUrl: post.media_url || post.mediaUrl || '',
      caption: post.content || '',
      likes: post.likes_count || 0,
      comments: post.comments_count || 0,
      timeAgo: post.created_at 
        ? new Date(post.created_at).toLocaleDateString() 
        : 'нещодавно'
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{t.feed}</h2>
      </div>

      <Tabs defaultValue="all">
        <TabsList className="w-full max-w-md mx-auto mb-4">
          <TabsTrigger value="all" className="flex-1">{t.allPosts}</TabsTrigger>
          <TabsTrigger value="photo" className="flex-1">{t.photoPosts}</TabsTrigger>
          <TabsTrigger value="video" className="flex-1">{t.videoPosts}</TabsTrigger>
          <TabsTrigger value="music" className="flex-1">{t.musicPosts}</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {isLoading ? (
            <div className="text-center py-10">Завантаження постів...</div>
          ) : posts.length > 0 ? (
            <div className="space-y-6">
              {posts.map((post) => (
                <PostCard key={post.id} {...transformPostToProps(post)} />
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-muted-foreground mb-4">
                {t.noPostsYet}
              </p>
              <Button>{t.createPost}</Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="photo">
          {isLoading ? (
            <div className="text-center py-10">Завантаження...</div>
          ) : posts.filter(post => post.category === 'photo').length > 0 ? (
            <div className="space-y-6">
              {posts
                .filter(post => post.category === 'photo')
                .map((post) => (
                  <PostCard key={post.id} {...transformPostToProps(post)} />
                ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-muted-foreground">Немає постів у категорії "Фото"</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="video">
          {isLoading ? (
            <div className="text-center py-10">Завантаження...</div>
          ) : posts.filter(post => post.category === 'video').length > 0 ? (
            <div className="space-y-6">
              {posts
                .filter(post => post.category === 'video')
                .map((post) => (
                  <PostCard key={post.id} {...transformPostToProps(post)} />
                ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-muted-foreground">Немає постів у категорії "Відео"</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="music">
          {isLoading ? (
            <div className="text-center py-10">Завантаження...</div>
          ) : posts.filter(post => post.category === 'music').length > 0 ? (
            <div className="space-y-6">
              {posts
                .filter(post => post.category === 'music')
                .map((post) => (
                  <PostCard key={post.id} {...transformPostToProps(post)} />
                ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-muted-foreground">Немає постів у категорії "Музика"</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
