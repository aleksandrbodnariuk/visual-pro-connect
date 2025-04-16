
import { useParams } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { Sidebar } from "@/components/layout/Sidebar";
import { PortfolioGrid } from "@/components/profile/PortfolioGrid";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { PostCard } from "@/components/feed/PostCard";

// Тестові дані для демонстрації
const USER = {
  id: "user1",
  name: "Олександр Петренко",
  username: "alex_photo",
  avatarUrl: "https://i.pravatar.cc/150?img=1",
  coverUrl: "https://images.unsplash.com/photo-1605810230434-7631ac76ec81",
  bio: "Професійний фотограф з 7-річним досвідом. Спеціалізуюся на портретній та комерційній зйомці. Учасник міжнародних виставок, співпрацюю з провідними брендами. Доступний для замовлень у Києві та області.",
  location: "Київ, Україна",
  website: "alexphoto.com.ua",
  joinDate: "Квітень 2021",
  followersCount: 1248,
  followingCount: 365,
  postsCount: 87,
  profession: "Photo",
  isCurrentUser: true
};

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

const POSTS = [
  {
    id: "1",
    author: {
      id: "user1",
      name: "Олександр Петренко",
      username: "alex_photo",
      avatarUrl: "https://i.pravatar.cc/150?img=1",
      profession: "Photo"
    },
    imageUrl: "https://images.unsplash.com/photo-1500673922987-e212871fec22",
    caption: "Вечірня фотосесія із використанням світлових ефектів. #creative #photoshoot #lights",
    likes: 124,
    comments: 18,
    timeAgo: "2 години тому"
  },
  {
    id: "2",
    author: {
      id: "user1",
      name: "Олександр Петренко",
      username: "alex_photo",
      avatarUrl: "https://i.pravatar.cc/150?img=1",
      profession: "Photo"
    },
    imageUrl: "https://images.unsplash.com/photo-1581090464777-f3220bbe1b8b",
    caption: "Новий проект для модного бренду. Особливий підхід до освітлення та композиції. #fashion #photography",
    likes: 98,
    comments: 7,
    timeAgo: "3 дні тому"
  }
];

export default function Profile() {
  const { userId } = useParams<{ userId: string }>();
  
  // В реальному додатку тут буде запит до API для отримання даних користувача
  // const user = fetchUser(userId);
  const user = USER; // для демонстрації використовуємо тестові дані

  return (
    <div className="min-h-screen pb-10">
      <Navbar />
      <ProfileHeader user={user} />
      
      <div className="container mt-8 flex gap-6">
        <main className="flex-1">
          <Tabs defaultValue="posts" className="w-full">
            <TabsContent value="posts" className="mt-6">
              <div className="space-y-6">
                {POSTS.map((post) => (
                  <PostCard key={post.id} {...post} />
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="portfolio" className="mt-6">
              <PortfolioGrid items={PORTFOLIO_ITEMS} />
            </TabsContent>
            
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
                            Олександр - надзвичайно талановитий фотограф! Фотосесія пройшла легко та невимушено, а результат перевершив усі очікування. Рекомендую для будь-яких зйомок.
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
                            Замовляв комерційну зйомку для свого бізнесу. Якість фотографій дуже висока, особливо сподобалась робота зі світлом. Єдине - хотілося б отримати фото трохи швидше.
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
