
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { PenLine, Trash2, Calendar, Users, FileText, Image, BarChart3 } from "lucide-react";

export default function Admin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const navigate = useNavigate();
  
  // Демо дані для панелі
  const stats = [
    { title: "Користувачі", value: "256", icon: Users, color: "bg-blue-100 text-blue-700" },
    { title: "Публікації", value: "843", icon: Image, color: "bg-purple-100 text-purple-700" },
    { title: "Коментарі", value: "1,207", icon: FileText, color: "bg-green-100 text-green-700" },
    { title: "Події", value: "42", icon: Calendar, color: "bg-amber-100 text-amber-700" },
  ];
  
  // Перевірка прав адміністратора
  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
    if (!currentUser || !currentUser.isAdmin) {
      toast.error("Доступ заборонено: Необхідні права адміністратора");
      navigate("/auth");
      return;
    }
    
    setIsAdmin(true);
    
    // Завантаження користувачів з localStorage
    const storedUsers = JSON.parse(localStorage.getItem("users") || "[]");
    setUsers(storedUsers);
    
    // Завантаження записів
    const storedPosts = JSON.parse(localStorage.getItem("posts") || "[]");
    setPosts(storedPosts || [
      { id: "1", author: "Олександр Петренко", title: "Нова фотосесія", status: "Активний" },
      { id: "2", author: "Марія Коваленко", title: "Відеомонтаж кліпу", status: "Активний" },
      { id: "3", author: "Ігор Мельник", title: "Музичний реліз", status: "На розгляді" }
    ]);
  }, [navigate]);
  
  // Функція для видалення користувача
  const deleteUser = (userId: string) => {
    const updatedUsers = users.filter(user => user.id !== userId);
    setUsers(updatedUsers);
    localStorage.setItem("users", JSON.stringify(updatedUsers));
    toast.success("Користувача видалено");
  };
  
  // Функція для видалення публікації
  const deletePost = (postId: string) => {
    const updatedPosts = posts.filter(post => post.id !== postId);
    setPosts(updatedPosts);
    localStorage.setItem("posts", JSON.stringify(updatedPosts));
    toast.success("Публікацію видалено");
  };
  
  if (!isAdmin) {
    return <div className="container py-16 text-center">Перевірка прав доступу...</div>;
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Панель адміністратора</h1>
          <p className="text-muted-foreground">Управління сайтом Visual Pro Connect</p>
        </div>
        
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {stats.map((stat, i) => (
            <Card key={i}>
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <h3 className="text-2xl font-bold mt-1">{stat.value}</h3>
                </div>
                <div className={`p-3 rounded-full ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" /> Статистика активності
            </CardTitle>
            <CardDescription>Огляд діяльності користувачів на платформі</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center border rounded-lg bg-muted/10">
              <p className="text-muted-foreground">Графік статистики буде доступний в наступній версії.</p>
            </div>
          </CardContent>
        </Card>
        
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="users">Користувачі</TabsTrigger>
            <TabsTrigger value="posts">Публікації</TabsTrigger>
            <TabsTrigger value="settings">Налаштування</TabsTrigger>
          </TabsList>
          
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Управління користувачами</CardTitle>
                <CardDescription>Перегляд та модерація користувачів платформи</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">ID</th>
                        <th className="text-left p-2">Ім'я</th>
                        <th className="text-left p-2">Email</th>
                        <th className="text-left p-2">Професія</th>
                        <th className="text-left p-2">Дії</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.length > 0 ? (
                        users.map((user) => (
                          <tr key={user.id} className="border-b hover:bg-muted/50">
                            <td className="p-2">{user.id}</td>
                            <td className="p-2">{user.name}</td>
                            <td className="p-2">{user.email}</td>
                            <td className="p-2">{user.profession}</td>
                            <td className="p-2">
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => navigate(`/profile/${user.id}`)}>
                                  <PenLine className="h-4 w-4 mr-1" /> Профіль
                                </Button>
                                <Button variant="destructive" size="sm" onClick={() => deleteUser(user.id)}>
                                  <Trash2 className="h-4 w-4 mr-1" /> Видалити
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-2 text-center text-muted-foreground">
                            Немає зареєстрованих користувачів
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="posts">
            <Card>
              <CardHeader>
                <CardTitle>Управління публікаціями</CardTitle>
                <CardDescription>Модерація контенту на платформі</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">ID</th>
                        <th className="text-left p-2">Автор</th>
                        <th className="text-left p-2">Назва</th>
                        <th className="text-left p-2">Статус</th>
                        <th className="text-left p-2">Дії</th>
                      </tr>
                    </thead>
                    <tbody>
                      {posts.map((post) => (
                        <tr key={post.id} className="border-b hover:bg-muted/50">
                          <td className="p-2">{post.id}</td>
                          <td className="p-2">{post.author}</td>
                          <td className="p-2">{post.title}</td>
                          <td className="p-2">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              post.status === "Активний" ? "bg-green-100 text-green-800" : 
                              "bg-yellow-100 text-yellow-800"
                            }`}>
                              {post.status}
                            </span>
                          </td>
                          <td className="p-2">
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm">
                                <PenLine className="h-4 w-4 mr-1" /> Редагувати
                              </Button>
                              <Button variant="destructive" size="sm" onClick={() => deletePost(post.id)}>
                                <Trash2 className="h-4 w-4 mr-1" /> Видалити
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Налаштування сайту</CardTitle>
                <CardDescription>Управління основними параметрами платформи</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div>
                    <label className="text-sm font-medium" htmlFor="site-name">Назва сайту</label>
                    <Input id="site-name" defaultValue="Visual Pro Connect" />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium" htmlFor="site-description">Опис сайту</label>
                    <Textarea 
                      id="site-description" 
                      defaultValue="Соціальна мережа для фотографів, відеографів, музикантів, ведучих та піротехніків."
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium" htmlFor="contact-email">Контактний email</label>
                    <Input id="contact-email" defaultValue="info@visualproconnect.com" />
                  </div>
                </div>
                
                <Button type="button" onClick={() => toast.success("Налаштування збережено")}>
                  Зберегти налаштування
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
