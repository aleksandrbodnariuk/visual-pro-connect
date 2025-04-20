
import React, { useState, useEffect, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/layout/Navbar";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { Sidebar } from "@/components/layout/Sidebar";
import { PortfolioGrid } from "@/components/profile/PortfolioGrid";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ProfileEditorDialog } from "@/components/profile/ProfileEditorDialog";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";
import { ProfilePostsList } from "@/components/profile/ProfilePostsList";
import { PostMenu } from "@/components/profile/PostMenu";
import { PostCard } from "@/components/feed/PostCard";
import { ServicesSection } from "@/components/profile/ServicesSection";
import { ShareholderSection } from "@/components/profile/ShareholderSection";

// Компонент для завантаження
const LoadingSpinner = () => (
  <div className="min-h-screen">
    <Navbar />
    <div className="container py-16 text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
      <p className="mt-4">Завантаження профілю...</p>
    </div>
  </div>
);

// Компонент для помилок
const ErrorComponent = ({ message }: { message: string }) => (
  <div className="min-h-screen">
    <Navbar />
    <div className="container py-16 text-center">
      <h2 className="text-xl font-semibold text-destructive mb-4">Помилка</h2>
      <p>{message}</p>
      <Button 
        onClick={() => window.location.reload()} 
        className="mt-4"
      >
        Спробувати знову
      </Button>
    </div>
  </div>
);

// Демо-дані для портфоліо
const PORTFOLIO_ITEMS = [
  {
    id: "port1",
    type: "photo" as "photo",
    thumbnailUrl: "https://images.unsplash.com/photo-1605810230434-7631ac76ec81",
    title: "Комерційна зйомка для бренду XYZ",
    likes: 89,
    comments: 12
  },
  {
    id: "port2",
    type: "photo" as "photo",
    thumbnailUrl: "https://images.unsplash.com/photo-1500673922987-e212871fec22",
    title: "Портрети в студії з природним світлом",
    likes: 124,
    comments: 18
  },
  {
    id: "port3",
    type: "video" as "video",
    thumbnailUrl: "https://images.unsplash.com/photo-1487887235947-a955ef187fcc",
    title: "Відеопрезентація нової колекції одягу",
    likes: 76,
    comments: 8
  },
  {
    id: "port4",
    type: "photo" as "photo",
    thumbnailUrl: "https://images.unsplash.com/photo-1581090464777-f3220bbe1b8b",
    title: "Художня фотографія для виставки",
    likes: 145,
    comments: 24
  },
  {
    id: "port5",
    type: "photo" as "photo",
    thumbnailUrl: "https://images.unsplash.com/photo-1500375592092-40eb2168fd21",
    title: "Пейзажна фотографія узбережжя",
    likes: 203,
    comments: 32
  },
  {
    id: "port6",
    type: "video" as "video",
    thumbnailUrl: "https://images.unsplash.com/photo-1605810230434-7631ac76ec81",
    title: "Промо-відео для ресторану",
    likes: 91,
    comments: 14
  }
];

export default function Profile() {
  const { userId } = useParams<{ userId: string }>();
  const [user, setUser] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [isCurrentUser, setIsCurrentUser] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = translations[language];
  
  useEffect(() => {
    const fetchUser = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const currentUser = localStorage.getItem('currentUser') ? JSON.parse(localStorage.getItem('currentUser') || '{}') : null;
        
        const targetUserId = userId || (currentUser ? currentUser.id : null);
        
        if (!targetUserId) {
          throw new Error('Не вдалося визначити ID користувача');
        }
        
        setIsCurrentUser(currentUser && currentUser.id === targetUserId);
        
        // Спробуємо отримати дані з Supabase
        let userData = null;
        
        try {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', targetUserId)
            .single();
          
          if (data) {
            userData = data;
          } else if (error) {
            console.warn("Помилка запиту до Supabase:", error);
          }
        } catch (supabaseError) {
          console.warn("Помилка з'єднання з Supabase:", supabaseError);
        }
        
        // Якщо даних з Supabase немає, використовуємо LocalStorage
        if (!userData) {
          if (currentUser && (!userId || currentUser.id === userId)) {
            userData = currentUser;
          } else {
            // Спробуємо знайти користувача в локальному сховищі
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            userData = users.find((u: any) => u.id === targetUserId);
            
            if (!userData) {
              throw new Error('Користувача не знайдено');
            }
          }
        }
        
        // Формуємо об'єкт користувача
        setUser({
          id: userData.id,
          name: userData.full_name || userData.firstName + ' ' + userData.lastName || "Користувач",
          username: userData.phone_number || userData.phoneNumber || `user_${userData.id.substring(0, 5)}`,
          avatarUrl: userData.avatar_url || userData.avatarUrl,
          coverUrl: userData.avatar_url || userData.coverUrl || "https://images.unsplash.com/photo-1605810230434-7631ac76ec81",
          bio: userData.full_name ? `${userData.full_name} на платформі Спільнота B&C` : "Користувач платформи Спільнота B&C",
          viber: userData.phone_number || userData.phoneNumber || "",
          tiktok: "",
          instagram: "",
          facebook: "",
          location: userData.city ? `${userData.city}, ${userData.country || 'Україна'}` : userData.country || "Україна",
          website: "",
          joinDate: userData.created_at ? new Date(userData.created_at).toLocaleDateString() : "Нещодавно",
          followersCount: 0,
          followingCount: 0,
          postsCount: 0,
          profession: userData.categories && userData.categories.length > 0 ? userData.categories[0] : "",
          status: userData.is_shareholder ? "Акціонер" : (userData.is_admin ? "Адміністратор" : "Учасник"),
          role: userData.is_admin ? "admin" : (userData.is_shareholder ? "shareholder" : "user"),
          isCurrentUser: isCurrentUser,
          shares: userData.shares || 0,
          percentage: userData.percentage || 0,
          profit: userData.profit || 0,
          title: userData.title || "",
          categories: userData.categories || [],
          country: userData.country,
          city: userData.city
        });
        
        // Отримання постів
        let postsData = [];
        
        // Спроба отримати пости з Supabase
        try {
          const { data } = await supabase
            .from('posts')
            .select('*')
            .eq('user_id', targetUserId);
          
          if (data && data.length > 0) {
            postsData = data;
          }
        } catch (postsError) {
          console.warn("Помилка отримання постів з Supabase:", postsError);
          // Можна додати запасний варіант з LocalStorage для постів
        }
        
        // Форматуємо пости
        if (postsData.length > 0) {
          setPosts(postsData.map((post: any) => ({
            id: post.id,
            author: {
              id: targetUserId,
              name: userData.full_name || userData.firstName + ' ' + userData.lastName || "Користувач",
              username: userData.phone_number || userData.phoneNumber || `user_${post.user_id.substring(0, 5)}`,
              avatarUrl: userData.avatar_url || userData.avatarUrl || "https://i.pravatar.cc/150?img=1",
              profession: userData.categories && userData.categories.length > 0 ? userData.categories[0] : "",
              categories: userData.categories || []
            },
            imageUrl: post.media_url,
            caption: post.content,
            likes: post.likes_count,
            comments: post.comments_count,
            timeAgo: new Date(post.created_at).toLocaleDateString()
          })));
        } else {
          setPosts([]);
        }
      } catch (error: any) {
        console.error("Помилка при завантаженні даних:", error);
        setError(error.message || "Помилка при завантаженні профілю");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUser();
  }, [userId, navigate]);
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  if (error) {
    return <ErrorComponent message={error} />;
  }

  if (!user) {
    return <ErrorComponent message="Користувача не знайдено" />;
  }

  const handleEditProfile = () => {
    setProfileEditorOpen(true);
  };

  const handleEditPost = (postId: string) => {
    toast.info(`Редагування публікації ${postId}`);
  };

  const handleDeletePost = (postId: string) => {
    setPosts(posts.filter(post => post.id !== postId));
    toast.success("Публікацію видалено");
  };

  const renderPostWithOptions = (post: any) => {
    return (
      <div key={post.id} className="relative">
        {isCurrentUser && (
          <div className="absolute right-4 top-4 z-10">
            <PostMenu 
              postId={post.id}
              isAuthor={isCurrentUser}
              onEdit={handleEditPost}
              onDelete={handleDeletePost}
            />
          </div>
        )}
        <PostCard {...post} />
      </div>
    );
  };

  const getCategoryName = (categoryId: string) => {
    switch(categoryId) {
      case 'photographer': return 'Фотограф';
      case 'videographer': return 'Відеограф';
      case 'musician': return 'Музикант';
      case 'host': return 'Ведучий';
      case 'pyrotechnician': return 'Піротехнік';
      default: return categoryId;
    }
  };

  return (
    <div className="min-h-screen pb-10">
      <Navbar />
      <ProfileHeader user={user} onEditProfile={handleEditProfile} />
      
      <div className="container mt-8 grid grid-cols-12 gap-6">
        <div className="hidden md:block md:col-span-3">
          <Sidebar className="sticky top-20" />
        </div>
        
        <main className="col-span-12 md:col-span-9">
          <Tabs defaultValue="posts" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="posts">Публікації</TabsTrigger>
              <TabsTrigger value="portfolio">Портфоліо</TabsTrigger>
              {(user.role === "representative" || user.status === "Представник" || (user.categories && user.categories.length > 0)) && (
                <TabsTrigger value="services">Послуги</TabsTrigger>
              )}
              {(user.role === "shareholder" || user.status === "Акціонер") && (
                <TabsTrigger value="shareholder">Акціонер</TabsTrigger>
              )}
              <TabsTrigger value="reviews">Відгуки</TabsTrigger>
            </TabsList>
            
            <TabsContent value="posts" className="mt-6">
              <div className="space-y-6">
                {isCurrentUser && (
                  <div className="mb-4">
                    <Button onClick={() => toast.info("Функцію створення публікацій буде додано")}>
                      <Edit className="mr-2 h-4 w-4" />
                      Створити публікацію
                    </Button>
                  </div>
                )}
                
                <Suspense fallback={<div>Завантаження публікацій...</div>}>
                  <ProfilePostsList 
                    posts={posts}
                    isCurrentUser={isCurrentUser}
                    onEditPost={handleEditPost}
                    onDeletePost={handleDeletePost}
                  />
                </Suspense>
              </div>
            </TabsContent>
            
            <TabsContent value="portfolio" className="mt-6">
              {isCurrentUser && (
                <div className="mb-4">
                  <Button onClick={() => toast.info("Функцію додавання в портфоліо буде додано")}>
                    <Edit className="mr-2 h-4 w-4" />
                    Додати в портфоліо
                  </Button>
                </div>
              )}
              <Suspense fallback={<div>Завантаження портфоліо...</div>}>
                <PortfolioGrid 
                  items={PORTFOLIO_ITEMS} 
                  userId={user.id} 
                  isOwner={isCurrentUser}
                />
              </Suspense>
            </TabsContent>
            
            {(user.role === "representative" || user.status === "Представник" || (user.categories && user.categories.length > 0)) && (
              <TabsContent value="services" className="mt-6">
                <Suspense fallback={<div>Завантаження послуг...</div>}>
                  <ServicesSection 
                    isCurrentUser={isCurrentUser} 
                    categories={user.categories}
                  />
                </Suspense>
              </TabsContent>
            )}
            
            {(user.role === "shareholder" || user.status === "Акціонер") && (
              <TabsContent value="shareholder" className="mt-6">
                <Suspense fallback={<div>Завантаження інформації акціонера...</div>}>
                  <ShareholderSection user={user} />
                </Suspense>
              </TabsContent>
            )}
            
            <TabsContent value="reviews" className="mt-6">
              <div className="rounded-xl border p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-bold">Відгуки клієнтів</h2>
                  <div className="flex items-center gap-1">
                    <span className="text-lg font-bold">4.8</span>
                    <div className="flex text-yellow-500">
                      ★★★★★
                    </div>
                    <span className="text-sm text-muted-foreground">(32)</span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="rounded-lg bg-muted p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <img 
                          src="https://i.pravatar.cc/150?img=28" 
                          alt="Марія К." 
                          className="h-10 w-10 rounded-full"
                        />
                        <div>
                          <h3 className="font-semibold">Марія К.</h3>
                          <div className="flex text-yellow-500">★★★★★</div>
                          <p className="mt-2 text-sm">
                            Дуже професійний підхід до роботи! Результат перевершив усі очікування. Рекомендую для будь-яких зйомок.
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">12 днів тому</span>
                    </div>
                  </div>
                  
                  <div className="rounded-lg bg-muted p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <img 
                          src="https://i.pravatar.cc/150?img=51" 
                          alt="Андрій В." 
                          className="h-10 w-10 rounded-full"
                        />
                        <div>
                          <h3 className="font-semibold">Андрій В.</h3>
                          <div className="flex text-yellow-500">★★★★☆</div>
                          <p className="mt-2 text-sm">
                            Замовляв комерційну зйомку для свого бізнесу. Якість дуже висока, особливо сподобалась робота зі світлом. Єдине - хотілося б отримати результат трохи швидше.
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">1 місяць тому</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
      
      {isCurrentUser && (
        <ProfileEditorDialog 
          user={user} 
          open={profileEditorOpen}
          onOpenChange={setProfileEditorOpen}
          onUpdate={() => window.location.reload()}
        />
      )}
    </div>
  );
}
