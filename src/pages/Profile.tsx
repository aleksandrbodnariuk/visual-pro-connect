
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/layout/Navbar";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { Sidebar } from "@/components/layout/Sidebar";
import { PortfolioGrid } from "@/components/profile/PortfolioGrid";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PostCard } from "@/components/feed/PostCard";
import { PostMenu } from "@/components/profile/PostMenu";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PiggyBank, DollarSign, Crown, Edit } from "lucide-react";
import { ProfileEditorDialog } from "@/components/profile/ProfileEditorDialog";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";

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
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = translations[language];
  
  useEffect(() => {
    const fetchUser = async () => {
      setIsLoading(true);
      
      try {
        const currentUser = localStorage.getItem('currentUser') ? JSON.parse(localStorage.getItem('currentUser') || '{}') : null;
        
        const targetUserId = userId || (currentUser ? currentUser.id : null);
        
        if (!targetUserId) {
          throw new Error('Не вдалося визначити ID користувача');
        }
        
        setIsCurrentUser(currentUser && currentUser.id === targetUserId);
        
        const { data: userData, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', targetUserId)
          .single();
        
        if (userData) {
          setUser({
            id: userData.id,
            name: userData.full_name || "Користувач",
            username: userData.phone_number || `user_${userData.id.substring(0, 5)}`,
            avatarUrl: userData.avatar_url,
            coverUrl: userData.avatar_url || "https://images.unsplash.com/photo-1605810230434-7631ac76ec81",
            bio: userData.full_name ? `${userData.full_name} на платформі Спільнота B&C` : "Користувач платформи Спільнота B&C",
            viber: userData.phone_number || "",
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
            shares: 0,
            percentage: 0,
            profit: 0,
            title: "",
            categories: userData.categories || [],
            country: userData.country,
            city: userData.city
          });
        } else if (currentUser && !userId) {
          setUser({
            id: currentUser.id,
            name: `${currentUser.firstName} ${currentUser.lastName}`,
            username: currentUser.email || currentUser.phoneNumber || `user_${currentUser.id.substring(0, 5)}`,
            avatarUrl: currentUser.avatarUrl,
            coverUrl: currentUser.coverUrl || "https://images.unsplash.com/photo-1605810230434-7631ac76ec81",
            bio: `${currentUser.firstName} ${currentUser.lastName} на платформі Спільнота B&C`,
            viber: currentUser.phoneNumber || "",
            tiktok: "",
            instagram: "",
            facebook: "",
            location: currentUser.city ? `${currentUser.city}, ${currentUser.country || 'Україна'}` : currentUser.country || "Україна",
            website: "",
            joinDate: "Нещодавно",
            followersCount: 0,
            followingCount: 0,
            postsCount: 0,
            status: currentUser.isShareHolder ? "Акціонер" : (currentUser.isAdmin ? "Адміністратор" : "Учасник"),
            role: currentUser.isAdmin ? "admin" : (currentUser.isShareHolder ? "shareholder" : "user"),
            isCurrentUser: true,
            shares: currentUser.shares || 0,
            percentage: currentUser.percentage || 0,
            profit: currentUser.profit || 0,
            title: currentUser.title || "",
            categories: currentUser.categories || [],
            country: currentUser.country,
            city: currentUser.city
          });
        } else {
          toast.error("Користувача не знайдено");
          navigate("/");
          return;
        }
        
        const { data: postsData } = await supabase
          .from('posts')
          .select('*')
          .eq('user_id', targetUserId);
        
        if (postsData && postsData.length > 0) {
          setPosts(postsData.map(post => ({
            id: post.id,
            author: {
              id: targetUserId,
              name: userData?.full_name || currentUser?.firstName + " " + currentUser?.lastName || "Користувач",
              username: userData?.phone_number || currentUser?.phoneNumber || `user_${post.user_id.substring(0, 5)}`,
              avatarUrl: userData?.avatar_url || currentUser?.avatarUrl || "https://i.pravatar.cc/150?img=1",
              profession: userData?.categories && userData.categories.length > 0 ? userData.categories[0] : currentUser?.categories?.[0] || "",
              categories: userData?.categories || currentUser?.categories || []
            },
            imageUrl: post.media_url,
            caption: post.content,
            likes: post.likes_count || 0, // Use default value of 0 if likes_count is undefined
            comments: post.comments_count || 0, // Use default value of 0 if comments_count is undefined
            timeAgo: new Date(post.created_at).toLocaleDateString()
          })));
        } else {
          setPosts([]);
        }
      } catch (error) {
        console.error("Помилка при завантаженні даних:", error);
        toast.error("Помилка при завантаженні профілю");
        navigate("/");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUser();
  }, [userId, navigate]);
  
  if (isLoading || !user) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container py-16 text-center">
          Завантаження профілю...
        </div>
      </div>
    );
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
                
                {posts.length > 0 ? (
                  posts.map((post) => renderPostWithOptions(post))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Немає публікацій для відображення
                  </div>
                )}
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
              <PortfolioGrid 
                items={PORTFOLIO_ITEMS} 
                userId={user.id} 
                isOwner={isCurrentUser}
              />
            </TabsContent>
            
            {(user.role === "representative" || user.status === "Представник" || (user.categories && user.categories.length > 0)) && (
              <TabsContent value="services" className="mt-6">
                <div className="rounded-xl border p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Мої послуги</h2>
                    {isCurrentUser && (
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-2" /> Редагувати послуги
                      </Button>
                    )}
                  </div>
                  
                  {user.categories && user.categories.length > 0 ? (
                    <div className="mb-4 flex flex-wrap gap-2">
                      {user.categories.map((category: string) => (
                        <Badge key={category} variant="secondary" className="text-sm">
                          {getCategoryName(category)}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                  
                  <div className="space-y-4">
                    <div className="rounded-lg bg-muted p-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium">Портретна фотосесія</h3>
                        <span className="rounded-full bg-secondary/20 px-3 py-1 text-sm font-medium text-secondary">від 1500 грн</span>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Індивідуальна фотосесія в студії або на локації. До 2 годин зйомки, 30 оброблених фотографій.
                      </p>
                    </div>
                    
                    <div className="rounded-lg bg-muted p-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium">Комерційна зйомка</h3>
                        <span className="rounded-full bg-secondary/20 px-3 py-1 text-sm font-medium text-secondary">від 3000 грн</span>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Фотографії для соціальних мереж, каталогів та реклами. До 4 годин зйомки, 50 оброблених фотографій.
                      </p>
                    </div>
                    
                    <div className="rounded-lg bg-muted p-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium">Весільна фотографія</h3>
                        <span className="rounded-full bg-secondary/20 px-3 py-1 text-sm font-medium text-secondary">від 8000 грн</span>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Повний день зйомки весілля, від зборів до першого танцю. 300+ оброблених фотографій, фотокнига.
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            )}
            
            {(user.role === "shareholder" || user.status === "Акціонер") && (
              <TabsContent value="shareholder" className="mt-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                      <Crown className="h-5 w-5 text-amber-500" />
                      Інформація акціонера
                    </CardTitle>
                    <Badge variant="secondary" className="text-lg px-3 py-1">
                      {user.title || "Магнат"}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Кількість акцій</p>
                              <h3 className="text-2xl font-bold mt-1">{user.shares || 0}</h3>
                            </div>
                            <div className="p-3 rounded-full bg-blue-100 text-blue-700">
                              <PiggyBank className="h-6 w-6" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Відсоток акцій</p>
                              <h3 className="text-2xl font-bold mt-1">{user.percentage || 0}%</h3>
                            </div>
                            <div className="p-3 rounded-full bg-amber-100 text-amber-700">
                              <Crown className="h-6 w-6" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Прибуток</p>
                              <h3 className="text-2xl font-bold mt-1">{user.profit?.toFixed(2) || 0} грн</h3>
                            </div>
                            <div className="p-3 rounded-full bg-green-100 text-green-700">
                              <DollarSign className="h-6 w-6" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    
                    <div className="border rounded-md p-4">
                      <h3 className="font-semibold mb-2">Інформація про ринок акцій</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        Як акціонер компанії, ви маєте доступ до ринку акцій, де можете купувати та продавати акції.
                        Поточна рекомендована ціна акції: {localStorage.getItem("stockPrice") || "1000"} грн.
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Прибуток з кожного замовлення розподіляється між акціонерами відповідно до відсотка акцій.
                        45% від суми кожного замовлення розподіляється між акціонерами.
                      </p>
                    </div>
                  </CardContent>
                </Card>
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
