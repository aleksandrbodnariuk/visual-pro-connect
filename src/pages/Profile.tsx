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
import { PortfolioManager } from "@/components/profile/PortfolioManager";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CreatePublicationModal } from "@/components/publications/CreatePublicationModal";
import { EditPublicationModal } from "@/components/publications/EditPublicationModal";
import { FriendsList } from "@/components/profile/FriendsList";

const LoadingSpinner = () => (
  <div className="min-h-screen">
    <Navbar />
    <div className="container py-16 text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
      <p className="mt-4">Завантаження профілю...</p>
    </div>
  </div>
);

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


export default function Profile() {
  const { userId } = useParams<{ userId: string }>();
  const [user, setUser] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [isCurrentUser, setIsCurrentUser] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);
  const [portfolioManagerOpen, setPortfolioManagerOpen] = useState(false);
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [servicesDialogOpen, setServicesDialogOpen] = useState(false);
  const [editPostOpen, setEditPostOpen] = useState(false);
  const [postToEdit, setPostToEdit] = useState<any>(null);
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = translations[language];
  
  useEffect(() => {
    const fetchUser = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // ВАЖЛИВО: Використовуємо Supabase Auth як єдине джерело правди
        const { data: authData } = await supabase.auth.getUser();
        const authUserId = authData?.user?.id || null;
        
        // Fallback на localStorage тільки якщо Supabase Auth недоступний
        const localUser = localStorage.getItem('currentUser') 
          ? JSON.parse(localStorage.getItem('currentUser') || '{}') 
          : null;
        
        const currentUserId = authUserId || localUser?.id || null;
        const targetUserId = userId || currentUserId;
        
        if (!targetUserId) {
          throw new Error('Не вдалося визначити ID користувача');
        }
        
        // Перевірка власного профілю
        const isOwnProfile = currentUserId !== null && currentUserId === targetUserId;
        setIsCurrentUser(isOwnProfile);
        
        console.log('Profile: isCurrentUser check', {
          authUserId,
          localUserId: localUser?.id,
          currentUserId,
          targetUserId,
          isOwnProfile
        });
        
        // Спочатку отримуємо кількість постів
        let postsData: any[] = [];
        let postsCount = 0;
        
        try {
          const { data: postsResult } = await supabase
            .from('posts')
            .select('*')
            .eq('user_id', targetUserId);
          
          if (postsResult) {
            postsData = postsResult;
            postsCount = postsResult.length;
          }
        } catch (postsError) {
          console.warn("Помилка отримання постів:", postsError);
        }
        
        let userData = null;
        
        try {
          // Use secure RPC function to get profile data with proper access control
          if (isOwnProfile) {
            // Get own profile with all data
            const { data, error } = await supabase.rpc('get_my_profile');
            if (data && data.length > 0) {
              userData = data[0];
            } else if (error) {
              console.warn("Помилка запиту до Supabase:", error);
            }
          } else {
            // Get detailed profile based on friendship status
            const { data, error } = await supabase.rpc('get_detailed_profile', { 
              target_user_id: targetUserId 
            });
            if (data && data.length > 0) {
              userData = data[0];
            } else if (error) {
              console.warn("Помилка запиту до Supabase:", error);
            }
          }
        } catch (supabaseError) {
          console.warn("Помилка з'єднання з Supabase:", supabaseError);
        }
        
        if (!userData) {
          // Використовуємо localStorage як fallback
          const localUserData = localStorage.getItem('currentUser') 
            ? JSON.parse(localStorage.getItem('currentUser') || '{}') 
            : null;
            
          if (localUserData && (!userId || localUserData.id === userId)) {
            userData = localUserData;
          } else {
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            userData = users.find((u: any) => u.id === targetUserId);
            
            if (!userData) {
              throw new Error('Користувача не знайдено');
            }
          }
        }
        
        setUser({
          id: userData.id,
          name: userData.full_name || userData.firstName + ' ' + userData.lastName || "Користувач",
          username: null, // Прибираємо технічний username
          avatarUrl: userData.avatar_url || userData.avatarUrl,
          coverUrl: userData.banner_url || userData.bannerUrl || "https://images.unsplash.com/photo-1605810230434-7631ac76ec81",
          bannerUrl: userData.banner_url || userData.bannerUrl,
          bio: userData.bio || "", // Використовуємо справжній bio з БД
          viber: userData.phone_number || userData.phoneNumber || "",
          tiktok: "",
          instagram: "",
          facebook: "",
          location: userData.city ? `${userData.city}, ${userData.country || 'Україна'}` : userData.country || "Україна",
          website: userData.website || "",
          joinDate: userData.created_at ? new Date(userData.created_at).toLocaleDateString() : "Нещодавно",
          followersCount: 0,
          followingCount: 0,
          postsCount: postsCount,
          profession: userData.categories && userData.categories.length > 0 ? userData.categories[0] : "",
          status: userData.is_shareholder ? "Акціонер" : (userData.is_admin ? "Адміністратор" : "Учасник"),
          role: userData.is_admin ? "admin" : (userData.is_shareholder ? "shareholder" : "user"),
          isCurrentUser: isOwnProfile,
          shares: userData.shares || 0,
          percentage: userData.percentage || 0,
          profit: userData.profit || 0,
          title: userData.title || "",
          categories: userData.categories || [],
          country: userData.country,
          city: userData.city
        });
        
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

  const handleAddToPortfolio = () => {
    setPortfolioManagerOpen(true);
  };

  const handleCreatePost = async () => {
    setCreatePostOpen(true);
  };

  const handleEditServices = () => {
    setServicesDialogOpen(true);
  };

  const handleEditPost = async (postId: string) => {
    try {
      // Отримуємо повні дані поста з Supabase
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .single();

      if (error || !data) {
        toast.error('Не вдалося завантажити публікацію');
        return;
      }

      setPostToEdit({
        id: data.id,
        content: data.content,
        media_url: data.media_url,
        category: data.category
      });
      setEditPostOpen(true);
    } catch (error) {
      console.error('Помилка завантаження публікації:', error);
      toast.error('Помилка при завантаженні публікації');
    }
  };

  const handleEditSuccess = () => {
    window.location.reload();
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Ви впевнені, що хочете видалити цю публікацію?")) {
      return;
    }

    try {
      // Видаляємо з Supabase
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) {
        console.error('Помилка видалення публікації:', error);
        toast.error('Помилка при видаленні публікації');
        return;
      }

      // Оновлюємо локальний стан
      setPosts(posts.filter(post => post.id !== postId));
      toast.success("Публікацію видалено");
    } catch (error) {
      console.error('Помилка видалення:', error);
      toast.error('Помилка при видаленні публікації');
    }
  };

  const handlePortfolioUpdate = () => {
    toast.success("Портфоліо оновлено");
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
      case 'photographer': return 'Ф��тограф';
      case 'videographer': return 'Відеограф';
      case 'musician': return 'Музикант';
      case 'host': return 'Ведучий';
      case 'pyrotechnician': return 'Піротехнік';
      default: return categoryId;
    }
  };

  const handleProfileUpdate = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen pb-safe-nav pt-14 sm:pt-16 3xl:pt-20">
      <Navbar />
      <ProfileHeader user={user} onEditProfile={handleEditProfile} />
      
      {/* Fixed Sidebar - рендериться окремо від grid */}
      <Sidebar />
      
      <div className="container mt-8 grid grid-cols-12 gap-6 px-4 md:px-6">
        {/* Spacer для fixed sidebar */}
        <div className="hidden md:block md:col-span-4 lg:col-span-3" aria-hidden="true" />
        
        <main className="col-span-12 md:col-span-8 lg:col-span-9">
          <Tabs defaultValue="posts" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="posts">Публікації</TabsTrigger>
              <TabsTrigger value="portfolio">Портфоліо</TabsTrigger>
              {(user?.role === "representative" || user?.status === "Представник" || (user?.categories && user?.categories.length > 0)) && (
                <TabsTrigger value="services">Послуги</TabsTrigger>
              )}
              {(user?.role === "shareholder" || user?.status === "Акціонер") && (
                <TabsTrigger value="shareholder">Акціонер</TabsTrigger>
              )}
              <TabsTrigger value="friends">Друзі</TabsTrigger>
              <TabsTrigger value="reviews">Відгуки</TabsTrigger>
            </TabsList>
            
            <TabsContent value="posts" className="mt-6">
              <div className="space-y-6">
                {isCurrentUser && (
                  <div className="mb-4">
                    <Button onClick={handleCreatePost}>
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
                  <Button onClick={handleAddToPortfolio}>
                    <Edit className="mr-2 h-4 w-4" />
                    Додати в портфоліо
                  </Button>
                </div>
              )}
              <Suspense fallback={<div>Завантаження портфоліо...</div>}>
                <PortfolioGrid 
                  items={[]} 
                  userId={user?.id} 
                  isOwner={isCurrentUser}
                  onAddItem={handleAddToPortfolio}
                />
              </Suspense>
            </TabsContent>
            
            {(user?.role === "representative" || user?.status === "Представник" || (user?.categories && user?.categories.length > 0)) && (
              <TabsContent value="services" className="mt-6">
                <Suspense fallback={<div>Завантаже��ня послуг...</div>}>
                  <ServicesSection 
                    isCurrentUser={isCurrentUser} 
                    categories={user?.categories}
                    onEditServices={handleEditServices}
                  />
                </Suspense>
              </TabsContent>
            )}
            
            {(user?.role === "shareholder" || user?.status === "Акціонер") && (
              <TabsContent value="shareholder" className="mt-6">
                <Suspense fallback={<div>Завантаження інформації акціонера...</div>}>
                  <ShareholderSection user={user} />
                </Suspense>
              </TabsContent>
            )}
            
            <TabsContent value="friends" className="mt-6">
              <FriendsList userId={user?.id} />
            </TabsContent>
            
            <TabsContent value="reviews" className="mt-6">
              <div className="rounded-xl border p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-bold">Відгуки клієнтів</h2>
                  <div className="flex items-center gap-1">
                    <span className="text-lg font-bold">0</span>
                    <span className="text-sm text-muted-foreground">(0)</span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Відгуків ще немає</p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
      
      {isCurrentUser && (
        <>
          <ProfileEditorDialog 
            user={user} 
            open={profileEditorOpen}
            onOpenChange={setProfileEditorOpen}
            onSave={(userData) => {
              // Handle save
              toast.success(t.profileUpdated);
              handleProfileUpdate();
            }}
            onUpdate={handleProfileUpdate}
          />
          
          <Dialog open={portfolioManagerOpen} onOpenChange={setPortfolioManagerOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Управління портфоліо</DialogTitle>
              </DialogHeader>
              <PortfolioManager userId={user?.id} onUpdate={handlePortfolioUpdate} />
            </DialogContent>
          </Dialog>
          
          <CreatePublicationModal 
            open={createPostOpen} 
            onOpenChange={setCreatePostOpen}
            userId={user?.id}
            onSuccess={() => {
              window.location.reload();
              toast.success("Публікацію створено");
            }}
          />

          <EditPublicationModal
            open={editPostOpen}
            onOpenChange={setEditPostOpen}
            post={postToEdit}
            onSuccess={handleEditSuccess}
          />
          
          <Dialog open={servicesDialogOpen} onOpenChange={setServicesDialogOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Управління послугами</DialogTitle>
              </DialogHeader>
              <ServicesSection 
                isCurrentUser={true}
                categories={user?.categories}
                onEditServices={() => {}}
                editMode={true}
              />
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
