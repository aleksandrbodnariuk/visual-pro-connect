
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { PostCard } from '@/components/feed/PostCard';
import { Hero } from '@/components/home/Hero';
import CreatePublicationModal from '@/components/publications/CreatePublicationModal';
import { Button } from '@/components/ui/button';
import { ExternalLink, BarChart3 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/lib/translations';

export default function Index() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = translations[language];

  useEffect(() => {
    const user = localStorage.getItem('currentUser');
    
    if (user) {
      setIsLoggedIn(true);
      setCurrentUser(JSON.parse(user));
    }
    
    const storedPosts = localStorage.getItem('posts');
    if (storedPosts) {
      setPosts(JSON.parse(storedPosts));
    }
  }, []);

  const handleLogin = () => {
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container px-4 py-6">
        {!isLoggedIn ? (
          <Hero onLogin={handleLogin} />
        ) : (
          <div className="grid grid-cols-12 gap-6">
            {/* Sidebar на лівій стороні */}
            <div className="hidden md:block md:col-span-3">
              <Sidebar className="sticky top-20" />
            </div>
            
            {/* Головний контент по центру */}
            <main className="col-span-12 md:col-span-6">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h1 className="text-3xl font-bold">Стрічка</h1>
                  <div className="flex gap-2">
                    {currentUser && (
                      <CreatePublicationModal 
                        userId={currentUser.id} 
                        userName={`${currentUser.firstName} ${currentUser.lastName}`} 
                      />
                    )}
                    {currentUser && (currentUser.isShareHolder || currentUser.role === "shareholder" || currentUser.status === "Акціонер") && (
                      <Button variant="outline" onClick={() => navigate("/stock-market")}>
                        <BarChart3 className="h-4 w-4 mr-2" /> Ринок акцій
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="grid gap-6">
                  {currentUser && (
                    <Card className="p-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16">
                          <AvatarImage src={currentUser.avatarUrl || ""} alt={`${currentUser.firstName} ${currentUser.lastName}`} />
                          <AvatarFallback>{currentUser.firstName?.[0]}{currentUser.lastName?.[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h2 className="text-xl font-semibold">{currentUser.firstName} {currentUser.lastName}</h2>
                          <p className="text-muted-foreground">
                            {currentUser.categories && currentUser.categories.length > 0 
                              ? currentUser.categories.map((cat: string) => {
                                  switch(cat) {
                                    case 'photographer': return 'Фотограф';
                                    case 'videographer': return 'Відеограф';
                                    case 'musician': return 'Музикант';
                                    case 'host': return 'Ведучий';
                                    case 'pyrotechnician': return 'Піротехнік';
                                    default: return cat;
                                  }
                                }).join(', ') 
                              : "Учасник спільноти"
                            }
                          </p>
                        </div>
                      </div>
                    </Card>
                  )}
                  {posts.length > 0 ? (
                    posts.map((post: any) => (
                      <PostCard
                        key={post.id}
                        id={post.id}
                        author={{
                          id: post.userId || "",
                          name: post.author || "",
                          username: post.author ? post.author.split(' ')[0].toLowerCase() : "",
                          avatarUrl: "",
                          profession: ""
                        }}
                        imageUrl={post.imageUrl || ""}
                        caption={post.description || ""}
                        likes={0}
                        comments={0}
                        timeAgo={new Date(post.date).toLocaleDateString()}
                      />
                    ))
                  ) : (
                    <div className="text-center py-12 border rounded-lg bg-muted/30">
                      <h3 className="text-xl font-medium mb-2">Поки що немає публікацій</h3>
                      <p className="text-muted-foreground mb-4">
                        Створіть першу публікацію або підписуйтесь на інших користувачів
                      </p>
                      {currentUser && (
                        <CreatePublicationModal 
                          userId={currentUser.id} 
                          userName={`${currentUser.firstName} ${currentUser.lastName}`} 
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </main>
            
            {/* Права сторона */}
            <div className="hidden lg:block lg:col-span-3">
              <div className="sticky top-20 space-y-6">
                <Card className="p-4">
                  <h3 className="font-semibold mb-3">Спільнота B&C</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Соціальна мережа для творчих професіоналів
                  </p>
                  <Button size="sm" className="w-full" asChild>
                    <a href="/connect" className="flex items-center justify-center gap-2">
                      <ExternalLink className="h-4 w-4" />
                      {t.findContacts}
                    </a>
                  </Button>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
