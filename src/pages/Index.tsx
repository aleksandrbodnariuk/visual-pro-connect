
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { PostCard } from '@/components/feed/PostCard';
import { Hero } from '@/components/home/Hero';
import CreatePublicationModal from '@/components/publications/CreatePublicationModal';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

export default function Index() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const navigate = useNavigate();

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
      <div className="container grid grid-cols-12 gap-6 px-4 md:px-6 py-6">
        <Sidebar className="hidden lg:block col-span-3" />
        
        <main className="col-span-12 lg:col-span-9">
          {!isLoggedIn ? (
            <Hero onLogin={handleLogin} />
          ) : (
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
                  {currentUser && currentUser.isShareHolder && (
                    <Button variant="outline" onClick={() => navigate("/admin")}>
                      <ExternalLink className="h-4 w-4 mr-2" /> Ринок акцій
                    </Button>
                  )}
                </div>
              </div>
              
              <div className="grid gap-6">
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
                      className=""
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
          )}
        </main>
      </div>
    </div>
  );
}
