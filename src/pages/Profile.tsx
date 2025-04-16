
import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { Sidebar } from "@/components/layout/Sidebar";
import { PortfolioGrid } from "@/components/profile/PortfolioGrid";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PostCard } from "@/components/feed/PostCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PiggyBank, DollarSign, Crown } from "lucide-react";

// Тестові дані для демонстрації портфоліо
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
  
  useEffect(() => {
    // Завантаження даних користувача
    const fetchUser = () => {
      setIsLoading(true);
      
      // Отримуємо поточного користувача
      const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
      
      // Перевіряємо, чи це профіль поточного користувача
      setIsCurrentUser(currentUser && currentUser.id === userId);
      
      // Отримуємо всіх користувачів
      const users = JSON.parse(localStorage.getItem("users") || "[]");
      
      // Шукаємо користувача з відповідним ID
      let foundUser = users.find((u: any) => u.id === userId);
      
      // Якщо користувача не знайдено і запитується сторінка поточного користувача
      if (!foundUser && currentUser && (userId === currentUser.id)) {
        foundUser = currentUser;
      }
      
      // Якщо користувача знайдено
      if (foundUser) {
        // Підготовка даних користувача для відображення
        setUser({
          id: foundUser.id,
          name: `${foundUser.firstName} ${foundUser.lastName}`,
          username: foundUser.username || `user_${foundUser.id.substring(0, 5)}`,
          avatarUrl: foundUser.avatarUrl || "https://i.pravatar.cc/150?img=1",
          coverUrl: foundUser.coverUrl || "https://images.unsplash.com/photo-1605810230434-7631ac76ec81",
          bio: foundUser.bio || "Користувач платформи Visual Pro Connect",
          phoneNumber: foundUser.phoneNumber,
          viber: foundUser.viber,
          tiktok: foundUser.tiktok,
          instagram: foundUser.instagram,
          facebook: foundUser.facebook,
          location: foundUser.location || "Україна",
          website: foundUser.website || "",
          joinDate: foundUser.createdAt ? new Date(foundUser.createdAt).toLocaleDateString() : "Нещодавно",
          followersCount: foundUser.followersCount || 0,
          followingCount: foundUser.followingCount || 0,
          postsCount: foundUser.postsCount || 0,
          profession: foundUser.profession || "",
          status: foundUser.status || "Учасник",
          role: foundUser.role || "user",
          isCurrentUser: isCurrentUser,
          // Поля для акціонерів
          shares: foundUser.shares || 0,
          percentage: foundUser.percentage || 0,
          profit: foundUser.profit || 0,
          title: foundUser.title || ""
        });
        
        // Завантаження постів користувача
        const allPosts = JSON.parse(localStorage.getItem("posts") || "[]");
        const userPosts = allPosts.filter((post: any) => post.author && post.author.id === userId);
        
        if (userPosts.length > 0) {
          setPosts(userPosts);
        } else {
          // Якщо немає постів, використовуємо тестові дані
          setPosts([
            {
              id: "1",
              author: {
                id: userId,
                name: `${foundUser.firstName} ${foundUser.lastName}`,
                username: foundUser.username || `user_${foundUser.id.substring(0, 5)}`,
                avatarUrl: foundUser.avatarUrl || "https://i.pravatar.cc/150?img=1",
                profession: foundUser.profession || ""
              },
              imageUrl: "https://images.unsplash.com/photo-1500673922987-e212871fec22",
              caption: "Вечірня фотосесія із використанням світлових ефектів. #creative #photoshoot #lights",
              likes: 124,
              comments: 18,
              timeAgo: "2 години тому"
            }
          ]);
        }
      } else {
        // Якщо користувача не знайдено, використовуємо тестові дані
        setUser({
          id: "user1",
          name: "Олександр Петренко",
          username: "alex_photo",
          avatarUrl: "https://i.pravatar.cc/150?img=1",
          coverUrl: "https://images.unsplash.com/photo-1605810230434-7631ac76ec81",
          bio: "Користувач платформи Visual Pro Connect",
          location: "Київ, Україна",
          website: "",
          joinDate: "Нещодавно",
          followersCount: 0,
          followingCount: 0,
          postsCount: 0,
          status: "Учасник",
          isCurrentUser: false
        });
        
        setPosts([]);
      }
      
      setIsLoading(false);
    };
    
    fetchUser();
  }, [userId, isCurrentUser]);
  
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

  return (
    <div className="min-h-screen pb-10">
      <Navbar />
      <ProfileHeader user={user} />
      
      <div className="container mt-8 flex flex-col md:flex-row gap-6">
        <main className="flex-1">
          <Tabs defaultValue="posts" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="posts">Публікації</TabsTrigger>
              <TabsTrigger value="portfolio">Портфоліо</TabsTrigger>
              {(user.role === "representative" || user.status === "Представник") && (
                <TabsTrigger value="services">Послуги</TabsTrigger>
              )}
              {(user.role === "shareholder" || user.status === "Акціонер") && (
                <TabsTrigger value="shareholder">Акціонер</TabsTrigger>
              )}
              <TabsTrigger value="reviews">Відгуки</TabsTrigger>
            </TabsList>
            
            <TabsContent value="posts" className="mt-6">
              <div className="space-y-6">
                {posts.length > 0 ? (
                  posts.map((post) => (
                    <PostCard key={post.id} {...post} />
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Немає публікацій для відображення
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="portfolio" className="mt-6">
              <PortfolioGrid items={PORTFOLIO_ITEMS} />
            </TabsContent>
            
            {(user.role === "representative" || user.status === "Представник") && (
              <TabsContent value="services" className="mt-6">
                <div className="rounded-xl border p-6">
                  <h2 className="mb-4 text-xl font-bold">Мої послуги</h2>
                  
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
        
        <Sidebar />
      </div>
    </div>
  );
}
